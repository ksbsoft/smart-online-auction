require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const auctionRoutes = require('./routes/auctions');
const bidRoutes = require('./routes/bids');
const categoryRoutes = require('./routes/categories');
const { setupSocket, startAuctionScheduler } = require('./socket');
const { initDatabase, getDb } = require('./database');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);

const clientOrigins = (process.env.CLIENT_URLS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: clientOrigins,
    methods: ['GET', 'POST']
  },
  // Optimize for 1000 concurrent connections
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: clientOrigins }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting - allow for 1000 concurrent users
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

app.use('/api/', apiLimiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', '..', 'client', 'dist')));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/categories', categoryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard stats (admin)
app.get('/api/stats', (req, res) => {
  try {
    const db = getDb();
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const activeAuctions = db.prepare("SELECT COUNT(*) as count FROM auctions WHERE status = 'active'").get().count;
    const totalBids = db.prepare('SELECT COUNT(*) as count FROM bids').get().count;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(final_price), 0) as total FROM auctions WHERE status = 'ended' AND final_price > 0").get().total;
    const recentBids = db.prepare(`
      SELECT b.*, a.id as auction_id, p.title as product_title 
      FROM bids b 
      JOIN auctions a ON b.auction_id = a.id 
      JOIN products p ON a.product_id = p.id 
      ORDER BY b.created_at DESC LIMIT 10
    `).all();

    res.json({ totalProducts, activeAuctions, totalBids, totalRevenue, recentBids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback for production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'dist', 'index.html'));
  });
}

async function startServer() {
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }

  // Initialize database first
  await initDatabase();
  console.log('Database initialized');

  // Setup WebSocket
  setupSocket(io);

  // Start auction scheduler
  startAuctionScheduler(io);

  // Initialize admin user
  const db = getDb();
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get(process.env.ADMIN_USERNAME || 'admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
      process.env.ADMIN_USERNAME || 'admin',
      hashedPassword,
      'admin'
    );
    console.log('Admin user created');
  }

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`🚀 Smart Auction Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket ready for real-time bidding`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = { app, server, io };
