import { z } from 'zod';

export const hospitalQuerySchema = z.object({
  search: z.string().trim().optional(),
  destination: z.string().trim().optional(),
  treatment: z.string().trim().optional(),
  accreditation: z.string().trim().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['rating', 'price_low', 'name']).default('name'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export const hospitalSlugParamSchema = z.object({
  slug: z.string().trim().min(1, 'Hospital slug is required'),
});

export const hospitalReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const doctorIdParamSchema = z.object({
  id: z.string().uuid('Doctor ID must be a valid UUID'),
});

export const compareQuerySchema = z.object({
  slugs: z
    .string()
    .trim()
    .min(1, 'Slugs parameter is required')
    .transform((str) => str.split(',').map((s) => s.trim()).filter(Boolean))
    .refine((arr) => arr.length >= 2 && arr.length <= 3, {
      message: 'Must provide between 2 and 3 hospital slugs to compare',
    }),
  treatment: z.string().trim().optional(),
});
