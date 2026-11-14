import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import prisma from './config/prisma.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import destinationsRoutes from './modules/destinations/destinations.routes.js';
import treatmentsRoutes from './modules/treatments/treatments.routes.js';
import providersRoutes from './modules/providers/providers.routes.js';
import doctorsRoutes from './modules/providers/doctors.routes.js';
import compareRoutes from './modules/providers/compare.routes.js';
import packagesRoutes from './modules/packages/packages.routes.js';
import casesRoutes from './modules/cases/cases.routes.js';
import {
  recordsRoutes,
  documentsRoutes,
  consentsRoutes,
} from './modules/records/records.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import hospitalEnquiriesRoutes from './modules/quotes/enquiries.routes.js';
import {
  hospitalQuotesRoutes,
  patientQuotesRoutes,
} from './modules/quotes/quotes.routes.js';
import hospitalPortalRoutes from './modules/hospitalPortal/hospitalPortal.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import consultationsRoutes from './modules/consultations/consultations.routes.js';
import messagesRoutes from './modules/messages/messages.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import bookingsRoutes from './modules/bookings/bookings.routes.js';
import referralsRoutes from './modules/referrals/referrals.routes.js';
import aftercareRoutes from './modules/aftercare/aftercare.routes.js';
import reviewsRoutes from './modules/reviews/reviews.routes.js';

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

// Global Rate Limiting (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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

// Public Browse Routes (no login required)
app.use('/api/destinations', destinationsRoutes);
app.use('/api/treatments', treatmentsRoutes);
app.use('/api/hospitals', providersRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/packages', packagesRoutes);

// Patient & Clinical Protected Routes
app.use('/api/cases', casesRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/consents', consentsRoutes);
app.use('/api/ai', aiRoutes);

// Hospital Operations & Quotations Protected Routes
app.use('/api/hospital/enquiries', hospitalEnquiriesRoutes);
app.use('/api/hospital/quotes', hospitalQuotesRoutes);
app.use('/api/hospital-portal', hospitalPortalRoutes);
app.use('/api/hospital', hospitalPortalRoutes);

// Patient Quotation Actions
app.use('/api/quotes', patientQuotesRoutes);

// Consultations & Tele-Appointments
app.use('/api/appointments', consultationsRoutes);
app.use('/api/hospital/appointments', consultationsRoutes);

// Bookings & Deposits
app.use('/api/bookings', bookingsRoutes);

// Patient Referral Program
app.use('/api/referrals', referralsRoutes);

// Post-Procedure Aftercare Coordination
app.use('/api/aftercare', aftercareRoutes);

// Verified Patient Reviews & Hospital Replies
app.use('/api/reviews', reviewsRoutes);

// Direct Case Messages / Chat
app.use('/api/cases/:caseId/messages', messagesRoutes);

// User Notifications
app.use('/api/notifications', notificationsRoutes);

// Admin Portal Protected Routes
app.use('/api/admin', adminRoutes);

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
