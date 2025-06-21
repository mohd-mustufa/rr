const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, testConnection } = require('./database');
const authRoutes = require('./routes/auth');
const titleRoutes = require('./routes/titles');
const paintingRoutes = require('./routes/paintings');
const referenceRoutes = require('./routes/references');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

<<<<<<< Updated upstream
// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
=======
// Security middleware
app.use((req, res, next) => {
  // Remove powered-by header
  res.removeHeader('X-Powered-By');
  next();
});

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'http://localhost:3000'
    : true,
  credentials: true
}));

// Body parsing middleware with limits
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// Serve static files
>>>>>>> Stashed changes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/titles', titleRoutes);
app.use('/api/paintings', paintingRoutes);
app.use('/api/references', referenceRoutes);

// Config endpoint to provide server information to frontend
app.get('/api/config', (req, res) => {
  res.json({
    serverIP: process.env.SERVER_IP || 'localhost',
    apiPort: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
  });
});

<<<<<<< Updated upstream
// Root route
app.get('/', (req, res) => {
  res.json({ message: 'AI Image Generator API' });
=======
// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve the main HTML file for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
>>>>>>> Stashed changes
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend available at: http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer(); 