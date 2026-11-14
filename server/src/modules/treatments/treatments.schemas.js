import { z } from 'zod';

export const treatmentSlugParamSchema = z.object({
  slug: z
    .string({ required_error: 'Treatment slug is required' })
    .trim()
    .min(1, { message: 'Treatment slug is required' })
    .max(120, { message: 'Treatment slug cannot exceed 120 characters' })
    .regex(/^[a-z0-9-]+$/, {
      message: 'Treatment slug must contain only lowercase letters, digits, and hyphens',
    }),
});
