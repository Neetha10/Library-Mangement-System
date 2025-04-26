// ✅ routes/registrations.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const admin = require('../config/firebase-admin');

// 🔐 Middleware to verify token
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

// ✅ Get all registrations for a specific event (admin/staff viewing)
router.get('/:eventId', verifyToken, async (req, res) => {
  const { eventId } = req.params;

  try {
    console.log("📨 Fetching registrations for event ID:", eventId);

    const result = await db.execute(
      `SELECT c.FIRST_NAME, c.LAST_NAME, c.EMAIL_ADDRESS
       FROM NSH_CUSTOMER c
       JOIN NSH_EVENT_REGISTRATION r ON c.CUSTOMER_ID = r.CUSTOMER_ID
       WHERE r.EVENT_ID = ?`,
      [eventId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ Fetch registrations error:', err.message);
    res.status(500).json({ message: 'Failed to fetch registrations' });
  }
});

// ✅ POST /api/registrations/register → Register user for Seminar or Exhibition
router.post('/register', verifyToken, async (req, res) => {
  const { eventId, eventType } = req.body;
  const email = req.user.email;

  try {
    console.log(`📨 Attempting registration for event ID: ${eventId} (${eventType})`);

    // ✅ First, find Customer_ID
    const customerResult = await db.execute(
      `SELECT CUSTOMER_ID FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );
    const customer = customerResult.rows[0];

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    const customerId = customer.CUSTOMER_ID;

    // 🧠 If Seminar → Only Authors can register
    if (eventType === "Seminar") {
      const authorResult = await db.execute(
        `SELECT AUTHOR_ID FROM NSH_AUTHOR WHERE EMAIL_ADDRESS = ?`,
        [email]
      );

      if (authorResult.rows.length === 0) {
        return res.status(403).json({ message: "Only authors can register for seminars." });
      }

      const authorId = authorResult.rows[0].AUTHOR_ID;

      // ✅ Insert into NSH_AUTHOR_SEMINAR
      await db.execute(
        `INSERT INTO NSH_AUTHOR_SEMINAR (SEMINAR_ID, NSH_AUTHOR_AUTHOR_ID)
         SELECT S.SEMINAR_ID, ? FROM NSH_SEMINAR S WHERE S.EVENT_ID = ?`,
        [authorId, eventId]
      );

      console.log("✅ Author registered for seminar successfully.");
      return res.status(200).json({ message: "Successfully registered for the seminar!" });
    }

    // 🧠 If Exhibition → Any Customer can register
    if (eventType === "Exhibition") {
      await db.execute(
        `INSERT INTO NSH_CUSTOMER_EXHIBITION (CUSTOMER_ID, EXHIBITION_EVENT_ID)
         VALUES (?, ?)`,
        [customerId, eventId]
      );

      console.log("✅ Customer registered for exhibition successfully.");
      return res.status(200).json({ message: "Successfully registered for the exhibition!" });
    }

    res.status(400).json({ message: "Invalid event type." });

  } catch (err) {
    console.error('❌ Registration error:', err.message);
    res.status(500).json({ message: "Failed to register for event.", error: err.message });
  }
});

module.exports = router;
