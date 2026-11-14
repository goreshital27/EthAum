import { z } from 'zod';

export const bookingIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Booking ID must be a valid UUID' }),
});

export const createBookingSchema = z.object({
  quotationId: z.string().uuid({ message: 'Quotation ID must be a valid UUID' }),
  referralCode: z
    .string()
    .trim()
    .max(50, 'Referral code cannot exceed 50 characters')
    .optional()
    .nullable(),
});

export const listBookingsQuerySchema = z.object({
  caseId: z.string().uuid().optional(),
  status: z
    .enum(['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});
