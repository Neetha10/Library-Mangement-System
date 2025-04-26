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

// GET /api/events
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        E.EVENT_ID,
        E.EVENT_NAME AS EVENT_NAME,
        E.START_DATETIME AS EVENT_DATE,
        CASE
          WHEN S.SEMINAR_ID IS NOT NULL THEN 'Seminar'
          WHEN X.EXHIBITION_ID IS NOT NULL THEN 'Exhibition'
          ELSE 'Unknown'
        END AS EVENT_TYPE
      FROM NSH_EVENT E
      LEFT JOIN NSH_SEMINAR S ON E.EVENT_ID = S.EVENT_ID
      LEFT JOIN NSH_EXHIBITION X ON E.EVENT_ID = X.EVENT_ID
    `);

    console.log("✅ Events fetched:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ /api/events failed:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});
// GET /api/events/:id/registrations
router.get('/:id/registrations', verifyToken, async (req, res) => {
  const eventId = req.params.id;

  try {
    const seminarResult = await db.execute(
      `SELECT A.NSH_AUTHOR_AUTHOR_ID AS AUTHOR_ID, AU.FIRST_NAME, AU.LAST_NAME, 'Seminar' AS EVENT_TYPE
       FROM NSH_AUTHOR_SEMINAR A
       JOIN NSH_AUTHOR AU ON A.NSH_AUTHOR_AUTHOR_ID = AU.AUTHOR_ID
       JOIN NSH_SEMINAR S ON A.SEMINAR_ID = S.SEMINAR_ID
       WHERE S.EVENT_ID = ?`,
      [eventId]
    );

    const exhibitionResult = await db.execute(
      `SELECT C.CUSTOMER_ID, C.FIRST_NAME, C.LAST_NAME, 'Exhibition' AS EVENT_TYPE
       FROM NSH_CUSTOMER_EXHIBITION CE
       JOIN NSH_CUSTOMER C ON CE.CUSTOMER_ID = C.CUSTOMER_ID
       JOIN NSH_EXHIBITION E ON CE.EXHIBITION_EVENT_ID = E.EVENT_ID
       WHERE E.EVENT_ID = ?`,
      [eventId]
    );

    const seminarRows = seminarResult.rows || [];
    const exhibitionRows = exhibitionResult.rows || [];
    const all = [...seminarRows, ...exhibitionRows];
    res.json(all);
  } catch (err) {
    console.error("❌ Failed to fetch registrations:", err.message);
    res.status(500).json({ message: "Error fetching registrations" });
  }
});


router.post('/create', verifyToken, async (req, res) => {
  const { eventName, startDate, endDate, eventType, topicId } = req.body;

  try {
    const result = await db.execute(
      `INSERT INTO NSH_EVENT (EVENT_NAME, START_DATETIME, STOP_DATETIME, EVENT_TYPE, TOPIC_ID)
       VALUES (?, ?, ?, ?, ?)`,
      [eventName, startDate, endDate, eventType, topicId]
    );

    const insertId = result.rows.insertId;  // ✅ Correct for your db.execute()

    if (!insertId) {
      return res.status(500).json({ message: 'Failed to retrieve new event ID' });
    }

    if (eventType === 'S') {
      await db.execute(
        `INSERT INTO NSH_SEMINAR (EVENT_ID, NSH_SEMINAR_TYPE) VALUES (?, 'S')`,
        [insertId]
      );
    } else if (eventType === 'E') {
      await db.execute(
        `INSERT INTO NSH_EXHIBITION (EVENT_ID, NSH_EXHIBITION_TYPE, EXPENSES) VALUES (?, 'E', 0)`,
        [insertId]
      );
    }

    res.status(201).json({ message: "✅ Event created successfully!" });
  } catch (err) {
    console.error("❌ Event creation failed:", err.message);
    res.status(500).json({ message: "Failed to create event", error: err.message });
  }
});

// ✅ Corrected: GET /api/events/my-events
router.get('/my-events', verifyToken, async (req, res) => {
  const email = req.user.email;
  
  try {
    // Get customer ID
    const customerResult = await db.execute(
      `SELECT CUSTOMER_ID FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );
    
    if (!customerResult.rows || customerResult.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const customerId = customerResult.rows[0].CUSTOMER_ID;
    
    // Get author ID
    const authorResult = await db.execute(
      `SELECT AUTHOR_ID FROM NSH_AUTHOR WHERE EMAIL_ADDRESS = ?`,
      [email]
    );
    
    const authorId = authorResult.rows && authorResult.rows.length > 0 
      ? authorResult.rows[0].AUTHOR_ID 
      : null;
    
    let seminarRows = [];
    
    // Only fetch seminar registrations if user is an author
    if (authorId) {
      // Fetch seminars user registered for
      const seminarResult = await db.execute(
        `SELECT E.EVENT_NAME, E.START_DATETIME AS EVENT_DATE, 'Seminar' AS EVENT_TYPE
         FROM NSH_EVENT E
         JOIN NSH_SEMINAR S ON E.EVENT_ID = S.EVENT_ID
         JOIN NSH_AUTHOR_SEMINAR ASG ON ASG.SEMINAR_ID = S.SEMINAR_ID
         WHERE ASG.NSH_AUTHOR_AUTHOR_ID = ?`,
        [authorId]
      );
      
      seminarRows = seminarResult.rows || [];
    }
    
    // Fetch exhibitions user registered for
    const exhibitionResult = await db.execute(
      `SELECT E.EVENT_NAME, E.START_DATETIME AS EVENT_DATE, 'Exhibition' AS EVENT_TYPE
       FROM NSH_EVENT E
       JOIN NSH_EXHIBITION X ON E.EVENT_ID = X.EVENT_ID
       JOIN NSH_CUSTOMER_EXHIBITION CE ON CE.EXHIBITION_EVENT_ID = E.EVENT_ID
       WHERE CE.CUSTOMER_ID = ?`,
      [customerId]
    );
    
    const exhibitionRows = exhibitionResult.rows || [];
    const allEvents = [...seminarRows, ...exhibitionRows];
    
    res.status(200).json(allEvents);
  } catch (err) {
    console.error('❌ Failed to fetch my registered events:', err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;