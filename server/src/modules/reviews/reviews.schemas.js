import { z } from 'zod';

export const createReviewSchema = z.object({
  bookingId: z.string().uuid({ message: 'Valid booking ID is required' }),
  rating: z
    .number()
    .int()
    .min(1, { message: 'Rating must be at least 1 star' })
    .max(5, { message: 'Rating cannot exceed 5 stars' }),
  comment: z
    .string()
    .max(1000, { message: 'Review comment cannot exceed 1000 characters' })
    .optional()
    .nullable(),
});

export const replyReviewSchema = z.object({
  hospitalReply: z
    .string()
    .min(1, { message: 'Hospital reply cannot be empty' })
    .max(1000, { message: 'Hospital reply cannot exceed 1000 characters' }),
});

export const reviewIdParamSchema = z.object({
  reviewId: z.string().uuid({ message: 'Valid review ID is required' }),
});

export const bookingIdParamSchema = z.object({
  bookingId: z.string().uuid({ message: 'Valid booking ID is required' }),
});

export const hospitalReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
