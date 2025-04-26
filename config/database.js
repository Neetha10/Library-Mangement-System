// config/database.js

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'PAL_PROJECT',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize the pool
async function initialize() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully');
    connection.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    throw err;
  }
}

// Execute query helper
async function execute(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return {
      rows: results,
      rowsAffected: results.affectedRows || 0
    };
  } catch (err) {
    console.error('❌ Error executing query:', err);
    throw err;
  }
}

// Graceful shutdown
async function close() {
  try {
    await pool.end();
    console.log('✅ Database connection pool closed');
  } catch (err) {
    console.error('❌ Error closing database pool:', err);
    throw err;
  }
}

module.exports = {
  initialize,
  execute,
  close
};
