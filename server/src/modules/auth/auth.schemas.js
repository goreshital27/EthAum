import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long'),
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(1, 'Name cannot be empty'),
    role: z.enum(['PATIENT', 'HOSPITAL'], {
      errorMap: () => ({ message: 'Role must be either PATIENT or HOSPITAL' }),
    }),
    hospitalName: z.string().trim().optional(),
    country: z.string().trim().optional(),
    city: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'HOSPITAL') {
      if (!data.hospitalName || data.hospitalName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['hospitalName'],
          message: 'Hospital name is required for hospital registration',
        });
      }
      if (!data.country || data.country.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['country'],
          message: 'Country is required for hospital registration',
        });
      }
      if (!data.city || data.city.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['city'],
          message: 'City is required for hospital registration',
        });
      }
    }
  });

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});
