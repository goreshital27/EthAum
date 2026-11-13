import { z } from 'zod';

export const packageQuerySchema = z.object({
  treatment: z.string().trim().optional(),
  destination: z.string().trim().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['price_low', 'price_high']).default('price_low'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export const packageIdParamSchema = z.object({
  id: z.string().uuid('Package ID must be a valid UUID'),
});
