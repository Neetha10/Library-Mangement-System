const admin = require('../config/firebase-admin');

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

    // ✅ Attach decoded user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };

    console.log('✅ Token verified for:', req.user.email);
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};
