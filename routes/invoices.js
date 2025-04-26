const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware'); 
router.get('/', verifyToken, async (req, res) => {
  const email = req.user.email;

  const customerResult = await db.execute(
    `SELECT CUSTOMER_ID FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
    [email]
  );
  const customer = customerResult.rows[0];
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const invoiceResult = await db.execute(`
    SELECT I.INVOICE_ID, I.INVOICE_AMOUNT, I.INVOICE_DATE, R.COPY_ID, B.NAME AS BOOK_NAME
    FROM NSH_INVOICE I
    JOIN NSH_RENTAL_SERVICE R ON I.RENTAL_SERVICE_ID = R.RENTAL_SERVICE_ID
    JOIN NSH_BOOK_COPY BC ON R.COPY_ID = BC.COPY_ID
    JOIN NSH_BOOK B ON BC.BOOK_ID = B.NSH_BOOK_ID
    WHERE R.CUSTOMER_ID = ?
  `, [customer.CUSTOMER_ID]);

  res.json(invoiceResult.rows);
});

module.exports = router;
