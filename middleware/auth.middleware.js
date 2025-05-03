const admin = require('../config/firebase-admin');
const db = require('../config/database'); // ✅ Make sure this line exists

// 🔐 Middleware to verify Firebase ID Token
exports.verifyToken = async (req, res, next) => {
  console.log('🔐 [Middleware] Token verification triggered');

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('⛔ No or invalid token in header');
      return res.status(401).json({ message: 'Missing or invalid token' });
    }

    const idToken = authHeader.split(' ')[1];

    // 🔍 Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    // 🔍 Fetch role from DB
    const { rows } = await db.execute(
      `SELECT ROLE FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );

    const role = rows[0]?.ROLE?.toLowerCase();
    if (!role) {
      console.log('⛔ Role not found in DB for email:', email);
      return res.status(403).json({ message: 'Role not found for user' });
    }

    // ✅ Attach user info + role to request
    req.user = {
      uid: decodedToken.uid,
      email,
      role
    };

    console.log('✅ Token verified for:', req.user.email, '| Role:', role);
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};
