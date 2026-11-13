import { z } from 'zod';

export const caseIdParamSchema = z.object({
  id: z.string().uuid('Case ID must be a valid UUID'),
});

export const documentIdParamSchema = z.object({
  id: z.string().uuid('Document ID must be a valid UUID'),
});

export const consentIdParamSchema = z.object({
  id: z.string().uuid('Consent ID must be a valid UUID'),
});

export const grantConsentSchema = z.object({
  hospitalId: z.string().uuid('Hospital ID must be a valid UUID'),
  scope: z.string().trim().default('ALL_RECORDS'),
});
