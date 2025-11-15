require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const leadRoutes = require('./routes/leads');
const touchpointRoutes = require('./routes/touchpoints');
const journeyRoutes = require('./routes/journeys');
const assignmentRoutes = require('./routes/assignment');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import validation middleware
const { validationMiddleware, schemas } = require('./middleware/validation');

// API routes
app.post('/api/leads', validationMiddleware(schemas.leadCreate), leadRoutes);
app.use('/api/leads', leadRoutes);
app.post('/api/touchpoints/start', validationMiddleware(schemas.startJourney), touchpointRoutes);
app.post('/api/touchpoints', validationMiddleware(schemas.touchpointCreate), touchpointRoutes);
app.use('/api/touchpoints', touchpointRoutes);
app.use('/api/journeys', journeyRoutes);
app.use('/api/assignment', assignmentRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 EduCRM Backend Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    // Close database connections
    require('./config/database').pool.end();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    // Close database connections
    require('./config/database').pool.end();
  });
});