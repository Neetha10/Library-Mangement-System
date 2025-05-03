const db = require('../config/database');

// Sync user data with database after Firebase authentication
exports.syncUserData = async (req, res) => {
  console.log('🔁 /sync-user endpoint called');

  try {
    const { email, uid } = req.user;
    console.log('👤 Firebase User:', req.user);

    const {
      firstName,
      lastName,
      phoneNumber,
      identificationType,
      identificationNumber,
      role
    } = req.body;

    console.log('📦 Request Body:', req.body);

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber || !identificationType || !identificationNumber || !role) {
      console.log('⛔ Missing required fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists in database
    console.log('🟡 Executing: SELECT * FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?');
    const userCheck = await db.execute(
      `SELECT * FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );

    if (userCheck.rows.length === 0) {
      // Get next customer ID
      console.log('🟡 Executing: SELECT IFNULL(MAX(CUSTOMER_ID), 0) + 1 AS NEXT_ID FROM NSH_CUSTOMER');
      const idResult = await db.execute(
        `SELECT IFNULL(MAX(CUSTOMER_ID), 0) + 1 AS NEXT_ID FROM NSH_CUSTOMER`
      );
      const customerId = idResult.rows[0].NEXT_ID;

      // Insert customer record
      console.log('🟡 Executing: INSERT INTO NSH_CUSTOMER');
      await db.execute(
        `INSERT INTO NSH_CUSTOMER (
          CUSTOMER_ID, FIRST_NAME, LAST_NAME, PHONE_NUMBER, 
          EMAIL_ADDRESS, IDENTIFICATION_TYPE, IDENTIFICATION_NUMBER, ROLE
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?
        )`,
        [customerId, firstName, lastName, phoneNumber, email, identificationType, identificationNumber, role]
      );
      

      if (role === 'Author') {
        const authorIdResult = await db.execute(
          `SELECT IFNULL(MAX(AUTHOR_ID), 0) + 1 AS NEXT_ID FROM NSH_AUTHOR`
        );
        const authorId = authorIdResult.rows[0].NEXT_ID;

        await db.execute(
          `INSERT INTO NSH_AUTHOR (
            AUTHOR_ID, FIRST_NAME, LAST_NAME,
            AUTHOR_STREET, AUTHOR_CITY, AUTHOR_STATE, AUTHOR_ZIPCODE,
            EMAIL_ADDRESS
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            authorId,
            firstName,
            lastName,
            'Unknown Street',   // placeholder
            'Unknown City',
            'NA',
            '00000',
            email
          ]
        );
        
        console.log('✅ Also inserted into NSH_AUTHOR');
      }

      console.log('✅ Insert complete for new user:', customerId);
      return res.status(201).json({
        message: 'User data synchronized successfully',
        userId: customerId,
        firebaseUid: uid
      });
    } else {
      // User already exists, update their data
      const userData = userCheck.rows[0];
      console.log('🟡 Executing: UPDATE NSH_CUSTOMER SET ... WHERE CUSTOMER_ID =', userData.CUSTOMER_ID);

      await db.execute(
        `UPDATE NSH_CUSTOMER SET 
          FIRST_NAME = ?, 
          LAST_NAME = ?, 
          PHONE_NUMBER = ?, 
          EMAIL_ADDRESS=?,
          IDENTIFICATION_TYPE = ?, 
          IDENTIFICATION_NUMBER = ?,
          ROLE=?

        WHERE CUSTOMER_ID = ?`,
        [
          firstName,
          lastName,
          phoneNumber,
          email,
          identificationType,
          identificationNumber,
          role,
          userData.CUSTOMER_ID
        ]
      );

      // Insert into NSH_AUTHOR if role is Author and not already in NSH_AUTHOR
      if (role === 'Author') {
        const authorExists = await db.execute(
          `SELECT 1 FROM NSH_AUTHOR WHERE EMAIL_ADDRESS = ?`,
          [email]
        );

        if (authorExists.rows.length === 0) {
          const authorIdResult = await db.execute(
            `SELECT IFNULL(MAX(AUTHOR_ID), 0) + 1 AS NEXT_ID FROM NSH_AUTHOR`
          );
          const authorId = authorIdResult.rows[0].NEXT_ID;

          await db.execute(
            `INSERT INTO NSH_AUTHOR (AUTHOR_ID, FIRST_NAME, LAST_NAME, EMAIL_ADDRESS)
             VALUES (?, ?, ?, ?)`,
            [authorId, firstName, lastName, email]
          );
          console.log('✅ Author inserted for existing customer');
        } else {
          console.log('🟢 Already an author, skipping insert');
        }
      }

      console.log('✅ Update complete for user:', userData.CUSTOMER_ID);
      return res.status(200).json({
        message: 'User data updated successfully',
        userId: userData.CUSTOMER_ID,
        firebaseUid: uid
      });
    }
  } catch (err) {
    console.error('❌ User sync error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const { email } = req.user;
    console.log('👤 Fetching profile for email:', email);

    const userResult = await db.execute(
      `SELECT CUSTOMER_ID, FIRST_NAME, LAST_NAME, EMAIL_ADDRESS, PHONE_NUMBER, IDENTIFICATION_TYPE, IDENTIFICATION_NUMBER, ROLE
       FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ No user found for email:', email);
      return res.status(404).json({ message: 'User not found in database' });
    }

    const userData = userResult.rows[0];

    res.json({
      message: 'Profile data retrieved successfully',
      user: {
        id: userData.CUSTOMER_ID,
        firstName: userData.FIRST_NAME,
        lastName: userData.LAST_NAME,
        email: userData.EMAIL_ADDRESS,
        phoneNumber: userData.PHONE_NUMBER,
        identificationType: userData.IDENTIFICATION_TYPE,
        identificationNumber: userData.IDENTIFICATION_NUMBER,
        role: userData.ROLE  // ✅ finally included!
      }
    });
  } catch (err) {
    console.error('❌ Profile fetch error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
