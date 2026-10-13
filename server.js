require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, db } = require('./database/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const scholarshipRoutes = require('./routes/scholarshipRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);

// Health check and system diagnostic endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'ScholarHub – Scholarship Management System',
    timestamp: new Date().toISOString(),
    database_engine: db.getEngine()
  });
});

// Serve frontend single-page application for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized error handler
app.use(errorHandler);

// Start Server and initialize database
async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log('ScholarHub – Scholarship Management System');
    console.log('Initializing database engine...');
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(` ScholarHub server running on: http://localhost:${PORT}`);
      console.log(` Active Database Engine: [${db.getEngine().toUpperCase()}]`);
      console.log(` Ready to serve students, administrators, and scholarship providers.`);
      console.log('----------------------------------------------------');
    });
  } catch (error) {
    console.error('Failed to start ScholarHub server:', error.message);
    process.exit(1);
  }
}

startServer();
