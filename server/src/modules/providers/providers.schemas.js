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
