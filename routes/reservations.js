const express = require('express');
const router = express.Router();
const db = require('../config/database');
const admin = require('../config/firebase-admin');

// 🔐 Middleware: verify Firebase token
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("✅ Token verified:", decoded.email);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// ✅ POST /api/reservations/create
router.post('/create', verifyToken, async (req, res) => {
  const { roomId, topicDescription, date, startTime, endTime, groupSize } = req.body;
  const email = req.user.email;

  try {
    const { rows: custRows } = await db.execute(
      `SELECT CUSTOMER_ID FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );
    const customerId = custRows[0]?.CUSTOMER_ID;
    if (!customerId) return res.status(404).json({ message: 'Customer not found' });

    await db.execute(
      `INSERT INTO NSH_RESERVATION (
        RESERVATION_ID, TOPIC_DESCRIPTION, RESERVATION_DATE,
        START_TIME, END_TIME, GROUP_SIZE, ROOM_ID, CUSTOMER_ID
      ) VALUES (
        NULL, ?, ?, ?, ?, ?, ?, ?
      )`,
      [topicDescription, date, startTime, endTime, groupSize, roomId, customerId]
    );

    res.status(201).json({ message: 'Room reserved successfully!' });

  } catch (err) {
    console.error('❌ Reservation failed:', err.message);
    res.status(500).json({ message: 'Failed to reserve study room' });
  }
});

// ✅ GET /api/reservations/my
router.get('/my', verifyToken, async (req, res) => {
  const email = req.user.email;
  console.log("📥 /my request from:", email);

  try {
    const { rows: custRows } = await db.execute(
      `SELECT CUSTOMER_ID FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );
    console.log("🔍 Customer lookup result:", custRows);

    const customerId = custRows[0]?.CUSTOMER_ID;
    if (!customerId) {
      console.log("❌ Customer not found");
      return res.status(404).json({ message: 'Customer not found' });
    }

    const { rows } = await db.execute(
      `SELECT RESERVATION_ID, TOPIC_DESCRIPTION, RESERVATION_DATE, 
              START_TIME, END_TIME, GROUP_SIZE, ROOM_ID
       FROM NSH_RESERVATION
       WHERE CUSTOMER_ID = ?
       ORDER BY RESERVATION_DATE DESC`,
      [customerId]
    );

    console.log("✅ Returning reservations:", rows);
    res.status(200).json({ reservations: rows });

  } catch (err) {
    console.error("❌ Failed to fetch reservations:", err);
    res.status(500).json({ message: "Error fetching reservations", error: err.message });
  }
});

// ✅ DELETE /api/reservations/:reservationId
router.delete('/:reservationId', verifyToken, async (req, res) => {
  const reservationId = req.params.reservationId;
  const email = req.user.email;

  try {
    const { rows: custRows } = await db.execute(
      `SELECT CUSTOMER_ID FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );
    const customerId = custRows[0]?.CUSTOMER_ID;
    if (!customerId) return res.status(404).json({ message: 'Customer not found' });

    const { rows: checkRows } = await db.execute(
      `SELECT * FROM NSH_RESERVATION WHERE RESERVATION_ID = ? AND CUSTOMER_ID = ?`,
      [reservationId, customerId]
    );
    if (checkRows.length === 0) {
      return res.status(403).json({ message: 'Not allowed to cancel this reservation' });
    }

    await db.execute(
      `DELETE FROM NSH_RESERVATION WHERE RESERVATION_ID = ?`,
      [reservationId]
    );

    res.status(200).json({ message: 'Reservation cancelled successfully' });

  } catch (err) {
    console.error('❌ Cancel failed:', err);
    res.status(500).json({ message: 'Failed to cancel reservation', error: err.message });
  }
});

module.exports = router;
