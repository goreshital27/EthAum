import { z } from 'zod';

const CASE_STAGES = [
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
];

export const hospitalApprovalQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).default('PENDING').optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export const hospitalIdParamSchema = z.object({
  id: z.string().uuid('Invalid hospital ID format'),
});

export const rejectHospitalSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Rejection reason is required (at least 5 characters)'),
});

export const casesQuerySchema = z.object({
  stage: z.enum([...CASE_STAGES, 'ALL']).optional(),
  country: z.string().trim().optional(),
  treatment: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(15).optional(),
});

export const caseIdParamSchema = z.object({
  id: z.string().uuid('Invalid case ID format'),
});

export const caseDocumentParamsSchema = z.object({
  id: z.string().uuid('Invalid case ID format'),
  docId: z.string().uuid('Invalid document ID format'),
});

export const updateCaseStageSchema = z.object({
  stage: z.enum(CASE_STAGES),
  reason: z.string().trim().optional(),
});

export const referralsQuerySchema = z.object({
  status: z.enum(['PENDING', 'QUALIFIED', 'PAID', 'VOID', 'ALL']).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export const referralIdParamSchema = z.object({
  id: z.string().uuid('Invalid referral ID format'),
});

export const usersQuerySchema = z.object({
  role: z.enum(['PATIENT', 'HOSPITAL', 'ADMIN', 'ALL']).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});
