import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import prisma from './config/prisma.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();

// Security headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
  })
);

// Body parsers & Cookie parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
});
app.use('/api', limiter);

// GET /api/health - Health check endpoint verifying app and database connection
app.get('/api/health', async (req, res) => {
  try {
    // Run simple query against PostgreSQL database
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: 'ok',
      db: 'connected',
    });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      db: 'disconnected',
      message: error.message || 'Database query failed',
    });
  }
});

// Auth Routes: /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/me
app.use('/api/auth', authRoutes);

// Root API index
app.get('/api', (req, res) => {
  res.json({
    name: 'EthAum Healthcare Marketplace API',
    version: '1.0.0',
    disclaimer: 'AI-assisted coordination, not medical advice',
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
