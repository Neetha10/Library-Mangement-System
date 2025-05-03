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

// ✅ POST /api/reservations/create (Book a room)
router.post('/create', verifyToken, async (req, res) => {
  const { roomId, topicDescription, date, startTime, endTime, groupSize ,eventId} = req.body;
  const email = req.user.email;

  try {
    const { rows: custRows } = await db.execute(
      `SELECT CUSTOMER_ID FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );
    const customerId = custRows[0]?.CUSTOMER_ID;
    if (!customerId) return res.status(404).json({ message: 'Customer not found' });

    const { rowsAffected } = await db.execute(
      `INSERT INTO NSH_RESERVATION (
        RESERVATION_ID, TOPIC_DESCRIPTION, RESERVATION_DATE,
        START_TIME, END_TIME, GROUP_SIZE, ROOM_ID, CUSTOMER_ID,EVENT_ID
      ) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [topicDescription, date, startTime, endTime, groupSize, roomId, customerId,eventId || null]
    );

    if (rowsAffected === 0) {
      throw new Error('Failed to create reservation.');
    }

    // ✨ After inserting reservation, update room status to 'Occupied'
    await db.execute(
      `UPDATE NSH_ROOM
       SET ROOM_STATUS = 'Occupied'
       WHERE ROOM_ID = ?`,
      [roomId]
    );

    res.status(201).json({ message: 'Room reserved successfully!' });

  } catch (err) {
    console.error('❌ Reservation failed:', err.message);
    res.status(500).json({ message: 'Failed to reserve study room' });
  }
});

// ✅ GET /api/reservations/my (Fetch my reservations)
router.get('/my', verifyToken, async (req, res) => {
  const email = req.user.email;
  console.log("📥 /my request from:", email);

  try {
    const { rows: custRows } = await db.execute(
      `SELECT CUSTOMER_ID FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );

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

// ✅ DELETE /api/reservations/:reservationId (Cancel reservation)
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

    // 🧹 Find the ROOM_ID for this reservation
    const { rows: reservationRows } = await db.execute(
      `SELECT ROOM_ID FROM NSH_RESERVATION WHERE RESERVATION_ID = ? AND CUSTOMER_ID = ?`,
      [reservationId, customerId]
    );
    if (reservationRows.length === 0) {
      return res.status(403).json({ message: 'Not allowed to cancel this reservation' });
    }

    const roomId = reservationRows[0].ROOM_ID;

    // ❌ Delete the reservation
    const { rowsAffected } = await db.execute(
      `DELETE FROM NSH_RESERVATION WHERE RESERVATION_ID = ?`,
      [reservationId]
    );

    if (rowsAffected === 0) {
      throw new Error('Failed to delete reservation.');
    }

    // 🔍 Check if there are any other future reservations for this room
    const { rows: activeReservations } = await db.execute(
      `SELECT COUNT(*) AS count
       FROM NSH_RESERVATION
       WHERE ROOM_ID = ? AND RESERVATION_DATE >= CURDATE()`,
      [roomId]
    );

    const hasActiveReservations = activeReservations[0].count > 0;

    if (!hasActiveReservations) {
      // ✨ No more active reservations → Mark room as Available
      await db.execute(
        `UPDATE NSH_ROOM
         SET ROOM_STATUS = 'Available'
         WHERE ROOM_ID = ?`,
        [roomId]
      );
    }

    res.status(200).json({ message: 'Reservation cancelled successfully' });

  } catch (err) {
    console.error('❌ Cancel failed:', err);
    res.status(500).json({ message: 'Failed to cancel reservation', error: err.message });
  }
});

// DELETE /api/reservations/admin/:reservationId
const { checkAdminRole } = require('../middleware/checkAdmin');

router.delete('/admin/:reservationId', verifyToken, checkAdminRole, async (req, res) => {
  const reservationId = req.params.reservationId;

  try {
    const { rowsAffected } = await db.execute(
      `DELETE FROM NSH_RESERVATION WHERE RESERVATION_ID = ?`,
      [reservationId]
    );

    if (rowsAffected === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json({ message: 'Reservation deleted by admin' });
  } catch (err) {
    console.error("❌ Admin reservation delete failed:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



module.exports = router;
