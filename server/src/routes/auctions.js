const express = require('express');
const { getDb } = require('../database');
const authMiddleware = require('../middleware/auth');

const db = () => getDb();
const router = express.Router();

// Get all auctions (public, with filters)
router.get('/', (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT a.*, p.title as product_title, p.description as product_description, 
             p.image_url as product_image, p.starting_price as product_starting_price,
             c.name as category_name
      FROM auctions a 
      JOIN products p ON a.product_id = p.id 
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    const conditions = [];
    const params = [];

    if (status) {
      if (status === 'live') {
        conditions.push("a.status = 'active' AND datetime(a.start_time) <= datetime('now') AND datetime(a.end_time) > datetime('now')");
      } else {
        conditions.push('a.status = ?');
        params.push(status);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.start_time DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const countBase = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const total = db().prepare(countBase).get(...params).total;

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const auctions = db().prepare(query).all(...params);
    res.json({ auctions, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single auction with bid history
router.get('/:id', (req, res) => {
  try {
    const auction = db().prepare(`
      SELECT a.*, p.title as product_title, p.description as product_description, 
             p.image_url as product_image, p.starting_price as product_starting_price,
             c.name as category_name
      FROM auctions a 
      JOIN products p ON a.product_id = p.id 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const bids = db().prepare(`
      SELECT * FROM bids WHERE auction_id = ? ORDER BY amount DESC LIMIT 50
    `).all(req.params.id);

    res.json({ ...auction, bids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create auction (admin)
router.post('/', authMiddleware, (req, res) => {
  try {
    const { product_id, start_time, end_time, starting_bid, reserve_price, bid_increment } = req.body;

    if (!product_id || !start_time || !end_time || starting_bid === undefined) {
      return res.status(400).json({ error: 'product_id, start_time, end_time, and starting_bid are required' });
    }

    const product = db().prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Check if product already has an active/upcoming auction
    const existingAuction = db().prepare("SELECT id FROM auctions WHERE product_id = ? AND status IN ('upcoming', 'active')").get(product_id);
    if (existingAuction) {
      return res.status(400).json({ error: 'Product already has an active or upcoming auction' });
    }

    const result = db().prepare(`
      INSERT INTO auctions (product_id, start_time, end_time, starting_bid, reserve_price, bid_increment, current_bid, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product_id,
      start_time,
      end_time,
      parseFloat(starting_bid),
      parseFloat(reserve_price) || 0,
      parseFloat(bid_increment) || 1.00,
      0,
      'upcoming'
    );

    // Update product status to active
    db().prepare("UPDATE products SET status = 'active' WHERE id = ?").run(product_id);

    const auction = db().prepare(`
      SELECT a.*, p.title as product_title, p.description as product_description, 
             p.image_url as product_image, c.name as category_name
      FROM auctions a 
      JOIN products p ON a.product_id = p.id 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(auction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update auction (admin)
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const existing = db().prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Auction not found' });

    if (existing.status === 'ended') {
      return res.status(400).json({ error: 'Cannot update ended auction' });
    }

    const { start_time, end_time, starting_bid, reserve_price, bid_increment, status } = req.body;

    db().prepare(`
      UPDATE auctions SET start_time = ?, end_time = ?, starting_bid = ?, reserve_price = ?, bid_increment = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      start_time || existing.start_time,
      end_time || existing.end_time,
      starting_bid !== undefined ? parseFloat(starting_bid) : existing.starting_bid,
      reserve_price !== undefined ? parseFloat(reserve_price) : existing.reserve_price,
      bid_increment !== undefined ? parseFloat(bid_increment) : existing.bid_increment,
      status || existing.status,
      req.params.id
    );

    const auction = db().prepare(`
      SELECT a.*, p.title as product_title, p.description as product_description, 
             p.image_url as product_image, c.name as category_name
      FROM auctions a 
      JOIN products p ON a.product_id = p.id 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE a.id = ?
    `).get(req.params.id);

    res.json(auction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// End auction manually (admin)
router.patch('/:id/end', authMiddleware, (req, res) => {
  try {
    const auction = db().prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    if (auction.status === 'ended') {
      return res.status(400).json({ error: 'Auction already ended' });
    }

    const winner = auction.current_bidder;
    const finalPrice = auction.current_bid;

    db().prepare(`
      UPDATE auctions SET status = 'ended', winner_name = ?, final_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(winner, finalPrice, req.params.id);

    db().prepare("UPDATE products SET status = 'sold' WHERE id = ?").run(auction.product_id);

    const updated = db().prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete auction (admin)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const existing = db().prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Auction not found' });

    if (existing.status === 'active') {
      return res.status(400).json({ error: 'Cannot delete an active auction. End it first.' });
    }

    db().prepare('DELETE FROM bids WHERE auction_id = ?').run(req.params.id);
    db().prepare('DELETE FROM auctions WHERE id = ?').run(req.params.id);

    res.json({ message: 'Auction deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
