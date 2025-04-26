const express = require('express');
const router = express.Router();
const db = require('../config/database');
const admin = require('../config/firebase-admin');

// 🔐 Middleware: Verify Firebase token
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// ✅ GET /api/rooms → List available study rooms
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT ROOM_ID, CAPACITY FROM NSH_ROOM ORDER BY ROOM_ID
    `);
    console.log("✅ Rooms fetched:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Failed to fetch rooms:", err.message);
    res.status(500).json({ message: "Error fetching rooms" });
  }
});

module.exports = router;
