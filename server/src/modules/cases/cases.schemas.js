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
