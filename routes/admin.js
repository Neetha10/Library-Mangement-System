const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { checkAdminRole } = require('../middleware/checkAdmin');

// ✅ Get all study rooms along with latest reservation info
router.get('/rooms', verifyToken, checkAdminRole, async (req, res) => {
  try {
    const { rows } = await db.execute(`
      SELECT 
        r.ROOM_ID,
        r.CAPACITY,
        r.ROOM_STATUS,
        res.RESERVATION_ID,
        res.TOPIC_DESCRIPTION,
        res.RESERVATION_DATE,
        res.START_TIME,
        res.END_TIME,
        res.GROUP_SIZE,
        c.FIRST_NAME,
        c.LAST_NAME
      FROM NSH_ROOM r
      LEFT JOIN NSH_RESERVATION res ON r.ROOM_ID = res.ROOM_ID
      LEFT JOIN NSH_CUSTOMER c ON res.CUSTOMER_ID = c.CUSTOMER_ID
      ORDER BY r.ROOM_ID ASC, res.RESERVATION_DATE DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching room reservations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// GET /api/admin/rooms/:roomId/reservations
router.get('/rooms/:roomId/reservations', verifyToken, checkAdminRole, async (req, res) => {
  const roomId = req.params.roomId;

  try {
    const { rows } = await db.execute(
      `SELECT R.RESERVATION_ID, R.TOPIC_DESCRIPTION, R.RESERVATION_DATE, 
              R.START_TIME, R.END_TIME, C.FIRST_NAME, C.LAST_NAME
       FROM NSH_RESERVATION R
       JOIN NSH_CUSTOMER C ON R.CUSTOMER_ID = C.CUSTOMER_ID
       WHERE R.ROOM_ID = ?`,
      [roomId]
    );

    res.json(rows);
  } catch (err) {
    console.error('❌ Failed to fetch reservations:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// ✅ Add a new room
router.post('/rooms', verifyToken, checkAdminRole, async (req, res) => {
  const { roomId, capacity } = req.body;

  try {
    const { rowsAffected } = await db.execute(
      `INSERT INTO NSH_ROOM (ROOM_ID, CAPACITY, ROOM_STATUS)
       VALUES (?, ?, 'Available')`,
      [roomId, capacity]
    );

    if (rowsAffected === 0) {
      return res.status(400).json({ message: 'Failed to add room' });
    }

    res.status(201).json({ message: 'Room added successfully' });
  } catch (error) {
    console.error('Error adding room:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Edit room capacity
router.put('/rooms/:id', verifyToken, checkAdminRole, async (req, res) => {
  const roomId = req.params.id;
  const { capacity } = req.body;

  try {
    const { rowsAffected } = await db.execute(
      `UPDATE NSH_ROOM SET CAPACITY = ? WHERE ROOM_ID = ?`,
      [capacity, roomId]
    );

    if (rowsAffected === 0) {
      return res.status(404).json({ message: 'Room not found or not updated' });
    }

    res.json({ message: 'Room updated successfully' });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// DELETE /api/admin/rooms/:roomId
router.delete('/rooms/:roomId', verifyToken, checkAdminRole, async (req, res) => {
  const roomId = req.params.roomId;

  try {
    // ✅ 1. Check if any reservation exists for this room
    const {rows} = await db.execute(
      `SELECT 1 FROM NSH_RESERVATION WHERE ROOM_ID = ? LIMIT 1`,
      [roomId]
    );

    if (rows.length > 0) {
      return res.status(400).json({
        message: '❌ Cannot delete room — existing reservations found.'
      });
    }

    // ✅ 2. Safe to delete the room
    const { rowsAffected } = await db.execute(
      `DELETE FROM NSH_ROOM WHERE ROOM_ID = ?`,
      [roomId]
    );

    if (rowsAffected === 0) {
      return res.status(404).json({ message: 'Room not found or already deleted.' });
    }

    res.json({ message: '✅ Room deleted successfully.' });

  } catch (err) {
    console.error('❌ Error deleting room:', err);
    res.status(500).json({ message: 'Server error while deleting room.', error: err.message });
  }
});

// DELETE /api/admin/rooms/:roomId/reservations
router.delete('/rooms/:roomId/reservations', verifyToken, checkAdminRole, async (req, res) => {
  const roomId = req.params.roomId;

  try {
    await db.execute(`DELETE FROM NSH_RESERVATION WHERE ROOM_ID = ?`, [roomId]);
    res.json({ message: '✅ All reservations deleted for this room.' });
  } catch (err) {
    console.error('❌ Failed to delete reservations:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});




// ✅ Get all users
router.get('/users', verifyToken, checkAdminRole, async (req, res) => {
  try {
    const { rows } = await db.execute('SELECT * FROM NSH_CUSTOMER');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Update a user
router.put('/users/:id', verifyToken, checkAdminRole, async (req, res) => {
  try {
    const userId = req.params.id;
    const { firstName, lastName, phoneNumber, emailAddress, role } = req.body;

    const { rowsAffected } = await db.execute(
      'UPDATE NSH_CUSTOMER SET FIRST_NAME = ?, LAST_NAME = ?, PHONE_NUMBER = ?, EMAIL_ADDRESS = ?, ROLE = ? WHERE CUSTOMER_ID = ?',
      [firstName, lastName, phoneNumber, emailAddress, role, userId]
    );

    if (rowsAffected === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Add a new user
router.post('/users', verifyToken, checkAdminRole, async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, emailAddress, identificationType, identificationNumber, role } = req.body;

    const { rowsAffected } = await db.execute(`
      INSERT INTO NSH_CUSTOMER 
      (FIRST_NAME, LAST_NAME, PHONE_NUMBER, EMAIL_ADDRESS, IDENTIFICATION_TYPE, IDENTIFICATION_NUMBER, ROLE)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [firstName, lastName, phoneNumber, emailAddress, identificationType, identificationNumber, role]);

    if (rowsAffected === 0) {
      return res.status(400).json({ message: 'Failed to add user' });
    }

    const { rows: newUserRows } = await db.execute(
      'SELECT * FROM NSH_CUSTOMER ORDER BY CUSTOMER_ID DESC LIMIT 1'
    );

    res.status(201).json(newUserRows[0]);
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Delete a user
router.delete('/users/:id', verifyToken, checkAdminRole, async (req, res) => {
  try {
    const userId = req.params.id;

    const { rowsAffected } = await db.execute(
      'DELETE FROM NSH_CUSTOMER WHERE CUSTOMER_ID = ?', 
      [userId]
    );

    if (rowsAffected === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// GET /api/admin/invoices
router.get('/invoices', verifyToken, checkAdminRole, async (req, res) => {
  try {
    const { rows } = await db.execute(`
      SELECT 
        I.INVOICE_ID,
        I.INVOICE_AMOUNT,
        I.INVOICE_DATE,
        R.COPY_ID,
        B.NAME AS BOOK_NAME,
        C.FIRST_NAME,
        C.LAST_NAME
      FROM NSH_INVOICE I
      JOIN NSH_RENTAL_SERVICE R ON I.RENTAL_SERVICE_ID = R.RENTAL_SERVICE_ID
      JOIN NSH_BOOK_COPY BC ON R.COPY_ID = BC.COPY_ID
      JOIN NSH_BOOK B ON BC.BOOK_ID = B.NSH_BOOK_ID
      JOIN NSH_CUSTOMER C ON R.CUSTOMER_ID = C.CUSTOMER_ID
      ORDER BY I.INVOICE_DATE DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching admin invoices:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// 📁 routes/admin.js (append at the bottom)

// ✅ Admin Event Viewer Route (Updated to include ROOM_ID from reservation)
router.get('/events', verifyToken, checkAdminRole, async (req, res) => {
  try {
    const { rows } = await db.execute(`
     SELECT 
  E.EVENT_ID,
  E.EVENT_NAME,
  E.EVENT_TYPE,
  E.START_DATETIME,
  E.STOP_DATETIME,
  R.ROOM_ID,
  C.FIRST_NAME,
  C.LAST_NAME,
  X.EXPENSES AS EXHIBITION_EXPENSE
FROM NSH_EVENT E
LEFT JOIN NSH_RESERVATION R ON E.EVENT_ID = R.EVENT_ID
LEFT JOIN NSH_SEMINAR S ON E.EVENT_ID = S.EVENT_ID
LEFT JOIN NSH_AUTHOR_SEMINAR AS A ON S.SEMINAR_ID = A.SEMINAR_ID
LEFT JOIN NSH_AUTHOR AU ON A.NSH_AUTHOR_AUTHOR_ID = AU.AUTHOR_ID
LEFT JOIN NSH_CUSTOMER C ON AU.EMAIL_ADDRESS = C.EMAIL_ADDRESS
LEFT JOIN NSH_EXHIBITION X ON E.EVENT_ID = X.EVENT_ID
ORDER BY E.START_DATETIME DESC;

    `);

    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching all events:', err);
    res.status(500).json({ message: 'Server error fetching events', error: err.message });
  }
});

// ✅ Create reservation and link to event
router.post('/reservations', verifyToken, checkAdminRole, async (req, res) => {
  try {
    const {
      roomId,
      customerId,
      reservationDate,
      startTime,
      endTime,
      groupSize,
      topicDescription,
      eventId  // This is key!
    } = req.body;

    const { rowsAffected } = await db.execute(`
      INSERT INTO NSH_RESERVATION 
      (ROOM_ID, CUSTOMER_ID, RESERVATION_DATE, START_TIME, END_TIME, GROUP_SIZE, TOPIC_DESCRIPTION, EVENT_ID)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [roomId, customerId, reservationDate, startTime, endTime, groupSize, topicDescription, eventId]);

    if (rowsAffected === 0) {
      return res.status(400).json({ message: "Reservation failed" });
    }

    res.status(201).json({ message: "✅ Reservation created and linked to event!" });

  } catch (err) {
    console.error("❌ Error creating reservation:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});






module.exports = router;
