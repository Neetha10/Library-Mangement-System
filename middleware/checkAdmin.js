const db = require('../config/database');

async function checkAdminRole(req, res, next) {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ message: 'Missing user email from token' });

    const { rows } = await db.execute(
      `SELECT ROLE FROM NSH_CUSTOMER WHERE EMAIL_ADDRESS = ?`,
      [email]
    );

    const role = rows[0]?.ROLE?.toLowerCase();
    console.log(`🔍 Role for ${email}:`, role);

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admins only' });
    }

    next();
  } catch (err) {
    console.error('❌ checkAdminRole error:', err.message);
    res.status(500).json({ message: 'Server error while checking admin role' });
  }
}

module.exports = { checkAdminRole };
