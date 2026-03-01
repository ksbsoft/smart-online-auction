const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const authMiddleware = require('../middleware/auth');

// Lazy getter - always calls getDb() which returns the initialized instance
const db = () => getDb();

const router = express.Router();

// Configure multer for image uploads
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all products (with filters)
router.get('/', (req, res) => {
  try {
    const { status, category_id, search, page = 1, limit = 20 } = req.query;
    let query = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id`;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    if (category_id) {
      conditions.push('p.category_id = ?');
      params.push(category_id);
    }
    if (search) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const countQuery = query.replace('SELECT p.*, c.name as category_name', 'SELECT COUNT(*) as total');
    const total = db().prepare(countQuery).get(...params).total;

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const products = db().prepare(query).all(...params);
    res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
router.get('/:id', (req, res) => {
  try {
    const product = db().prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product (admin)
router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  try {
    const { title, description, category_id, starting_price, status } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const result = db().prepare(`
      INSERT INTO products (title, description, category_id, image_url, starting_price, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description || '',
      category_id || null,
      image_url,
      parseFloat(starting_price) || 0,
      status || 'draft'
    );

    const product = db().prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product (admin)
router.put('/:id', authMiddleware, upload.single('image'), (req, res) => {
  try {
    const existing = db().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const { title, description, category_id, starting_price, status } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : existing.image_url;

    db().prepare(`
      UPDATE products SET title = ?, description = ?, category_id = ?, image_url = ?, starting_price = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || existing.title,
      description !== undefined ? description : existing.description,
      category_id !== undefined ? (category_id || null) : existing.category_id,
      image_url,
      starting_price !== undefined ? parseFloat(starting_price) : existing.starting_price,
      status || existing.status,
      req.params.id
    );

    // Delete old image if replaced
    if (req.file && existing.image_url) {
      const oldPath = path.join(uploadDir, path.basename(existing.image_url));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const product = db().prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Archive product (admin)
router.patch('/:id/archive', authMiddleware, (req, res) => {
  try {
    const existing = db().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    db().prepare("UPDATE products SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    const product = db().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore product from archive (admin)
router.patch('/:id/restore', authMiddleware, (req, res) => {
  try {
    const existing = db().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    db().prepare("UPDATE products SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    const product = db().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product (admin)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const existing = db().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    // Check if product has active auctions
    const activeAuction = db().prepare("SELECT id FROM auctions WHERE product_id = ? AND status IN ('upcoming', 'active')").get(req.params.id);
    if (activeAuction) {
      return res.status(400).json({ error: 'Cannot delete product with active auctions' });
    }

    // Delete related bids and auctions first
    const auctionIds = db().prepare('SELECT id FROM auctions WHERE product_id = ?').all(req.params.id);
    for (const a of auctionIds) {
      db().prepare('DELETE FROM bids WHERE auction_id = ?').run(a.id);
    }
    db().prepare('DELETE FROM auctions WHERE product_id = ?').run(req.params.id);
    db().prepare('DELETE FROM products WHERE id = ?').run(req.params.id);

    // Delete image file
    if (existing.image_url) {
      const imgPath = path.join(uploadDir, path.basename(existing.image_url));
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
