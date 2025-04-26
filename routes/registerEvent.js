const express = require('express');
const router = express.Router();
const db = require('../config/database');
const admin = require('../config/firebase-admin');

// ✅ Middleware: Verify Firebase token
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

// ✅ POST /api/register-event
router.post('/', verifyToken, async (req, res) => {
  const { eventId, eventType } = req.body;
  const email = req.user.email;

  try {
    // ✅ Get customer ID from email
    const custRes = await db.execute(
      `SELECT CUSTOMER_ID FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );
    const customerId = custRes.rows[0]?.CUSTOMER_ID;

    if (!customerId) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (eventType === 'Exhibition') {
      // ✅ Register for exhibition
      const regId = `REG${Math.floor(1000 + Math.random() * 9000)}`;
      await db.execute(
        `INSERT INTO NSH_CUSTOMER_EXHIBITION (REGISTRATION_ID, CUSTOMER_ID, EXHIBITION_EVENT_ID)
         VALUES (?, ?, ?)`,
        [regId, customerId, eventId]
      );

    } else if (eventType === 'Seminar') {
      // ✅ Get author ID using email (only authors can register)
      const authorRes = await db.execute(
        `SELECT AUTHOR_ID FROM NSH_AUTHOR WHERE EMAIL_ADDRESS = ?`,
        [email]
      );
      const authorId = authorRes.rows[0]?.AUTHOR_ID;

      if (!authorId) {
        return res.status(403).json({ message: 'Only authors can register for seminars' });
      }

      // ✅ Get seminar ID from event ID
      const seminarRes = await db.execute(
        `SELECT SEMINAR_ID FROM NSH_SEMINAR WHERE EVENT_ID = ?`,
        [eventId]
      );
      const seminarId = seminarRes.rows[0]?.SEMINAR_ID;

      if (!seminarId) {
        return res.status(400).json({ message: 'Seminar ID not found for this event' });
      }

      // ✅ Insert into NSH_AUTHOR_SEMINAR
      const inviteId = Math.floor(100000 + Math.random() * 900000);
      await db.execute(
        `INSERT INTO NSH_AUTHOR_SEMINAR (SEMINAR_ID, NSH_AUTHOR_AUTHOR_ID)
         VALUES (?, ?)`,
        [seminarId, authorId]
      );
      

    } else {
      return res.status(400).json({ message: 'Unknown event type' });
    }

    res.status(200).json({ message: '✅ Registered successfully!' });

  } catch (err) {
    console.error('❌ Registration failed:', err);
    res.status(500).json({ message: 'Error registering for event' });
  }
});

module.exports = router;
