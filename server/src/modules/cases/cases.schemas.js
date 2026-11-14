import { z } from 'zod';

export const createCaseSchema = z.object({
  treatment: z.string().trim().min(1, 'Treatment procedure is required'),
  destination: z.string().trim().optional(),
  budgetCents: z.coerce.number().int().min(0, 'Budget must be a non-negative integer in cents'),
  preferredTimeline: z.string().trim().optional(),
  description: z
    .string()
    .trim()
    .min(10, 'Please provide a short description of your medical condition (at least 10 characters)'),
  travelPartySize: z.coerce.number().int().min(1).default(1).optional(),
  hasInsurance: z.boolean().default(false).optional(),
});

export const caseIdParamSchema = z.object({
  id: z.string().uuid('Case ID must be a valid UUID'),
});

export const updateStageSchema = z.object({
  stage: z.enum([
    'NEW',
    'QUALIFIED',
    'MEDICAL_REVIEW',
    'QUOTE_REQUESTED',
    'QUOTE_SENT',
    'CONSULTATION',
    'BOOKED',
    'TREATMENT',
    'AFTERCARE',
    'CLOSED',
  ]),
});

export const shortlistSchema = z.object({
  hospitalIds: z
    .array(z.string().uuid('Each hospital ID must be a valid UUID'))
    .min(2, 'Shortlist must contain at least 2 hospitals')
    .max(3, 'Shortlist can contain at most 3 hospitals'),
});

export const hospitalIdParamSchema = z.object({
  id: z.string().uuid('Case ID must be a valid UUID'),
  hospitalId: z.string().uuid('Hospital ID must be a valid UUID'),
});
