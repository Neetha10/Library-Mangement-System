const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');


require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Ping test route (before static middleware!)
app.post('/ping', (req, res) => {
  console.log('📶 [SERVER] Ping route hit!');
  res.json({ message: 'pong from server.js' });
});

// ✅ Simple test route
app.get('/hello', (req, res) => {
  res.send('<h1>Hello World</h1><p>This is a test page served directly from a route.</p>');
});

// ✅ Use Firebase-auth + DB sync routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const booksRoutes = require('./routes/books');
app.use('/api/books', booksRoutes);

const rentalRoutes = require('./routes/rentals');
app.use('/api/rentals', rentalRoutes);

const invoiceRoutes = require('./routes/invoices');
app.use('/api/invoices', invoiceRoutes);

app.use('/api/returns', require('./routes/returns'));

app.use('/api/events', require('./routes/events'));

app.use('/api/register-event', require('./routes/registerEvent'));

const registrationRoute = require('./routes/registrations');
app.use('/api/registrations', registrationRoute);

const roomsRoutes = require('./routes/rooms');
app.use('/api/rooms', roomsRoutes);

const reservations = require('./routes/reservations');
app.use('/api/reservations', reservations);

// Top of server.js
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);





// ✅ API root test route
app.get('/api', (req, res) => {
  res.json({ message: 'Library Management System API is running' });
});

// ✅ Static files AFTER your routes
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Initialize MySQL pool
db.initialize()
  .then(() => {
    console.log('✅ MySQL connection initialized successfully');
  })
  .catch(err => {
    console.error('❌ DB init failed:', err);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  });

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});

// ✅ Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  try {
    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
});
