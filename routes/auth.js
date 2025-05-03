const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const admin = require('firebase-admin'); // Firebase Admin SDK
const db = require('../config/database'); // Database

// ✅ TEMP TEST ROUTE
router.post('/ping', (req, res) => {
  console.log('📶 Ping received!');
  res.json({ message: 'pong' });
});

router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, phone, idType, idNumber, role } = req.body;

  try {
    console.log('📩 Registration request received.');
    console.log('Incoming Role:', role);

    // Create Firebase user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });
    console.log('✅ Firebase user created:', userRecord.uid);

    // Generate new Customer ID
    const result = await db.execute(`SELECT IFNULL(MAX(CUSTOMER_ID), 0) + 1 AS NEXT_ID FROM NSH_CUSTOMER`);
    const customerId = result.rows[0].NEXT_ID;
    console.log('🆔 New Customer ID:', customerId);

    // Insert into NSH_CUSTOMER
    await db.execute(`
      INSERT INTO NSH_CUSTOMER (
        CUSTOMER_ID, FIRST_NAME, LAST_NAME, PHONE_NUMBER,
        EMAIL_ADDRESS, IDENTIFICATION_TYPE, IDENTIFICATION_NUMBER,ROLE
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [customerId, firstName, lastName, phone, email, idType, idNumber,role]);

    console.log('✅ Inserted into NSH_CUSTOMER.');

    // If role is Author, insert into NSH_AUTHOR
    if (role === 'Author') {
      console.log('✍️ User selected Author. Attempting NSH_AUTHOR insert...');

      try {
        await db.execute(`
          INSERT INTO NSH_AUTHOR (
            AUTHOR_ID, FIRST_NAME, LAST_NAME, EMAIL_ADDRESS
          ) VALUES (?, ?, ?, ?)
        `, [customerId, firstName, lastName, email]);

        console.log('✅ Inserted into NSH_AUTHOR.');
      } catch (authorError) {
        console.error('❌ Failed inserting into NSH_AUTHOR:', authorError.message);
      }
    }

    res.status(200).json({ message: '✅ Registration successful!' });

  } catch (error) {
    console.error('❌ Registration failed at outer catch:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// ✅ PUT /api/auth/profile → Update user profile
router.put('/profile', authMiddleware.verifyToken, async (req, res) => {
  const { email } = req.user;
  const { firstName, lastName, phoneNumber, identificationType, identificationNumber } = req.body;
  
  if (!firstName || !lastName || !phoneNumber || !identificationType || !identificationNumber) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  try {
    await db.execute(
      `UPDATE NSH_CUSTOMER SET 
        FIRST_NAME = ?,
        LAST_NAME = ?,
        PHONE_NUMBER = ?,
        IDENTIFICATION_TYPE = ?,
        IDENTIFICATION_NUMBER = ?
      WHERE EMAIL_ADDRESS = ?`,
      [firstName, lastName, phoneNumber, identificationType, identificationNumber, email]
    );
    
    console.log("✅ Profile updated for:", email);
    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error("❌ Error updating profile:", err.message);
    res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
});

// ✅ Other Routes
router.post('/sync-user', authMiddleware.verifyToken, authController.syncUserData);
router.get('/profile', authMiddleware.verifyToken, authController.getUserProfile);

module.exports = router;