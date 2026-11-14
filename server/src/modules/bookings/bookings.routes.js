import { Router } from 'express';
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
  validate({ params: bookingIdParamSchema }),
  payBookingDeposit
);

export default router;
