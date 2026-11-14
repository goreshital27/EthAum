import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import {
  bookingIdParamSchema,
  createBookingSchema,
  listBookingsQuerySchema,
} from './bookings.schemas.js';
import {
  createBooking,
  getBookingById,
  listBookings,
  payBookingDeposit,
} from './bookings.controller.js';

const router = Router();

// Payment rate limiter: 10 attempts per 15 minutes keyed by user ID (or IP)
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    status: 'error',
    message: 'Too many payment attempts. Please wait a moment before trying again.',
  },
});

// All booking routes require authentication
router.use(requireAuth);

// POST /api/bookings (Create booking from quotation — PATIENT only)
router.post(
  '/',
  requireRole('PATIENT'),
  validate({ body: createBookingSchema }),
  createBooking
);

// GET /api/bookings (List bookings for current user)
router.get(
  '/',
  validate({ query: listBookingsQuerySchema }),
  listBookings
);

// GET /api/bookings/:id (Get booking details — ownership checked in controller)
router.get(
  '/:id',
  validate({ params: bookingIdParamSchema }),
  getBookingById
);

// POST /api/bookings/:id/pay (Pay simulated 20% deposit — PATIENT only)
router.post(
  '/:id/pay',
  requireRole('PATIENT'),
  paymentLimiter,
  validate({ params: bookingIdParamSchema }),
  payBookingDeposit
);

export default router;
