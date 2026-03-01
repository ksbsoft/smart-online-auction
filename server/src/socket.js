const { getDb } = require('./database');

// Simple in-memory rate limiter for bids
const bidRateLimit = new Map();
const BID_COOLDOWN_MS = 1000; // 1 second between bids per user

function cleanupRateLimiter() {
  const now = Date.now();
  for (const [key, timestamp] of bidRateLimit.entries()) {
    if (now - timestamp > BID_COOLDOWN_MS * 2) {
      bidRateLimit.delete(key);
    }
  }
}

// Cleanup every 30 seconds
setInterval(cleanupRateLimiter, 30000);

function setupSocket(io) {
  // Track connected users per auction
  const auctionRooms = new Map();

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join an auction room
    socket.on('join-auction', (auctionId) => {
      const room = `auction-${auctionId}`;
      socket.join(room);

      if (!auctionRooms.has(room)) {
        auctionRooms.set(room, new Set());
      }
      auctionRooms.get(room).add(socket.id);

      // Send current viewer count
      io.to(room).emit('viewer-count', {
        auctionId,
        count: auctionRooms.get(room).size
      });

      // Send current auction state
      const auction = getDb().prepare(`
        SELECT a.*, p.title as product_title 
        FROM auctions a JOIN products p ON a.product_id = p.id 
        WHERE a.id = ?
      `).get(auctionId);

      if (auction) {
        socket.emit('auction-state', auction);
      }
    });

    // Leave an auction room
    socket.on('leave-auction', (auctionId) => {
      const room = `auction-${auctionId}`;
      socket.leave(room);

      if (auctionRooms.has(room)) {
        auctionRooms.get(room).delete(socket.id);
        io.to(room).emit('viewer-count', {
          auctionId,
          count: auctionRooms.get(room).size
        });
      }
    });

    // Place a bid
    socket.on('place-bid', (data) => {
      const { auctionId, bidderName, bidderEmail, amount } = data;

      if (!auctionId || !bidderName || !amount) {
        socket.emit('bid-error', { message: 'Missing required fields' });
        return;
      }

      // Rate limiting
      const rateLimitKey = `${socket.id}-${auctionId}`;
      const lastBid = bidRateLimit.get(rateLimitKey);
      if (lastBid && Date.now() - lastBid < BID_COOLDOWN_MS) {
        socket.emit('bid-error', { message: 'Please wait before placing another bid' });
        return;
      }

      try {
        // Use a transaction for atomicity
        const placeBid = getDb().transaction(() => {
          const auction = getDb().prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);

          if (!auction) {
            throw new Error('Auction not found');
          }

          if (auction.status !== 'active') {
            throw new Error('Auction is not active');
          }

          const now = new Date().toISOString();
          if (now > auction.end_time) {
            throw new Error('Auction has ended');
          }

          if (now < auction.start_time) {
            throw new Error('Auction has not started yet');
          }

          const minBid = auction.current_bid > 0
            ? auction.current_bid + auction.bid_increment
            : auction.starting_bid;

          if (parseFloat(amount) < minBid) {
            throw new Error(`Minimum bid is $${minBid.toFixed(2)}`);
          }

          // Insert bid
          getDb().prepare(`
            INSERT INTO bids (auction_id, bidder_name, bidder_email, amount) VALUES (?, ?, ?, ?)
          `).run(auctionId, bidderName, bidderEmail || '', parseFloat(amount));

          // Update auction
          getDb().prepare(`
            UPDATE auctions SET current_bid = ?, current_bidder = ?, bid_count = bid_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
          `).run(parseFloat(amount), bidderName, auctionId);

          return getDb().prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);
        });

        const updatedAuction = placeBid();
        bidRateLimit.set(rateLimitKey, Date.now());

        const room = `auction-${auctionId}`;

        // Broadcast new bid to all in room
        io.to(room).emit('new-bid', {
          auctionId,
          bidderName,
          amount: parseFloat(amount),
          currentBid: updatedAuction.current_bid,
          currentBidder: updatedAuction.current_bidder,
          bidCount: updatedAuction.bid_count,
          timestamp: new Date().toISOString()
        });

        // Confirm to bidder
        socket.emit('bid-success', {
          message: 'Bid placed successfully',
          amount: parseFloat(amount)
        });

      } catch (err) {
        socket.emit('bid-error', { message: err.message });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      // Remove from all auction rooms
      for (const [room, clients] of auctionRooms.entries()) {
        if (clients.has(socket.id)) {
          clients.delete(socket.id);
          const auctionId = room.replace('auction-', '');
          io.to(room).emit('viewer-count', {
            auctionId: parseInt(auctionId),
            count: clients.size
          });
        }
      }
    });
  });
}

// Auction status checker - runs periodically
function startAuctionScheduler(io) {
  setInterval(() => {
    const now = new Date().toISOString();

    // Start upcoming auctions
    const toStart = getDb().prepare(`
      SELECT id FROM auctions WHERE status = 'upcoming' AND datetime(start_time) <= datetime(?)
    `).all(now);

    for (const auction of toStart) {
      getDb().prepare("UPDATE auctions SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(auction.id);
      const updated = getDb().prepare(`
        SELECT a.*, p.title as product_title 
        FROM auctions a JOIN products p ON a.product_id = p.id 
        WHERE a.id = ?
      `).get(auction.id);
      io.to(`auction-${auction.id}`).emit('auction-started', updated);
      io.emit('auction-status-change', { auctionId: auction.id, status: 'active' });
    }

    // End expired auctions
    const toEnd = getDb().prepare(`
      SELECT * FROM auctions WHERE status = 'active' AND datetime(end_time) <= datetime(?)
    `).all(now);

    for (const auction of toEnd) {
      getDb().prepare(`
        UPDATE auctions SET status = 'ended', winner_name = ?, final_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(auction.current_bidder, auction.current_bid, auction.id);

      if (auction.current_bidder) {
        getDb().prepare("UPDATE products SET status = 'sold' WHERE id = ?").run(auction.product_id);
      }

      const updated = getDb().prepare('SELECT * FROM auctions WHERE id = ?').get(auction.id);
      io.to(`auction-${auction.id}`).emit('auction-ended', updated);
      io.emit('auction-status-change', { auctionId: auction.id, status: 'ended' });
    }
  }, 2000); // Check every 2 seconds
}

module.exports = { setupSocket, startAuctionScheduler };

