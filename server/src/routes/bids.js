const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// Get bids for an auction
router.get('/auction/:auctionId', (req, res) => {
  try {
    const db = getDb();
    const bids = db.prepare(`
      SELECT * FROM bids WHERE auction_id = ? ORDER BY amount DESC
    `).all(req.params.auctionId);
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

