const express = require('express');
const router = express.Router();
const db = require('../config/database'); // Adjust path if needed

// 🔍 GET /api/books — List all book copies with topics
router.get('/', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT B.NSH_BOOK_ID, B.NAME, T.TOPIC_NAME, C.COPY_ID, C.STATUS
      FROM NSH_BOOK B
      JOIN NSH_TOPIC T ON B.TOPIC_ID = T.TOPIC_ID
      JOIN NSH_BOOK_COPY C ON B.NSH_BOOK_ID = C.BOOK_ID
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Failed to fetch books:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
