const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDb } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function createTokenPayload(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email || null,
    fullName: user.full_name || null,
    role: user.role,
  };
}

function issueToken(user) {
  return jwt.sign(createTokenPayload(user), process.env.JWT_SECRET, { expiresIn: '24h' });
}

// Admin login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND role = ?').get(username, 'admin');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = issueToken(user);
    res.json({ token, user: createTokenPayload(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bidder register
router.post('/user/register', (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(fullName).trim();

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const username = normalizedEmail;

    const result = db.prepare('INSERT INTO users (username, email, full_name, password, role) VALUES (?, ?, ?, ?, ?)')
      .run(username, normalizedEmail, normalizedName, hashedPassword, 'bidder');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = issueToken(user);

    res.status(201).json({ token, user: createTokenPayload(user) });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Bidder login
router.post('/user/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(normalizedEmail, 'bidder');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = issueToken(user);
    res.json({ token, user: createTokenPayload(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bidder forgot password
router.post('/user/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(normalizedEmail, 'bidder');

    if (!user) {
      return res.json({ message: 'If your email exists, a reset link was generated.' });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?')
      .run(resetToken, expiresAt, user.id);

    res.json({
      message: 'Reset token generated. Integrate email delivery for production.',
      resetToken,
      expiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bidder reset password
router.post('/user/reset-password', (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE reset_token = ? AND role = ?').get(token, 'bidder');
    if (!user) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    if (!user.reset_token_expires_at || new Date(user.reset_token_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?')
      .run(hashedPassword, user.id);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

