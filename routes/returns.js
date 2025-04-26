const express = require('express');
const router = express.Router();
const db = require('../config/database');
const admin = require('../config/firebase-admin');

// Middleware to verify token
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

router.post('/', verifyToken, async (req, res) => {
  const { copyId, invoiceId } = req.body;
  const email = req.user.email;

  try {
    const customerResult = await db.execute(
      `SELECT CUSTOMER_ID FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );
    const customerId = customerResult.rows[0]?.CUSTOMER_ID;
    if (!customerId) return res.status(404).json({ message: 'Customer not found' });

    // Update rental with actual return date
    await db.execute(`
      UPDATE NSH_RENTAL_SERVICE
      SET ACTUAL_RETURN_DATE = CURDATE(), RENTAL_STATUS = 'returned'
      WHERE CUSTOMER_ID = ? AND COPY_ID = ? AND RENTAL_STATUS = 'Borrowed'
    `, [customerId, copyId]);

    // Update book copy status to available
    await db.execute(`
      UPDATE NSH_BOOK_COPY
      SET STATUS = 'available'
      WHERE COPY_ID = ?
    `, [copyId]);

    res.status(200).json({ message: 'Book returned successfully!' });

  } catch (err) {
    console.error('❌ Return failed:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
