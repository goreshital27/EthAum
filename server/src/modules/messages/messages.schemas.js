import { z } from 'zod';

export const caseIdParamSchema = z.object({
  caseId: z.string().uuid({ message: 'Invalid case ID: must be a valid UUID' }),
});

export const sendMessageSchema = z.object({
  body: z
    .string()
    .min(1, 'Message body cannot be empty')
    .max(2000, 'Message body cannot exceed 2000 characters'),
  hospitalId: z.string().uuid({ message: 'Valid hospital ID is required' }).optional(),
});

export const getMessagesQuerySchema = z.object({
  hospitalId: z.string().uuid({ message: 'Valid hospital ID is required' }).optional(),
});
