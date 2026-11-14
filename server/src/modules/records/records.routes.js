import { Router } from 'express';
import {
  getDocumentAccess,
  streamRawDocument,
  revokeConsent,
} from './records.controller.js';
import {
  documentIdParamSchema,
  consentIdParamSchema,
  rawTokenParamSchema,
} from './records.schemas.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';

// 1. Records router mounted at /api/records
export const recordsRoutes = Router();
recordsRoutes.get(
  '/raw/:token',
  validate({ params: rawTokenParamSchema }),
  streamRawDocument
);

// 2. Documents router mounted at /api/documents
export const documentsRoutes = Router();
documentsRoutes.get(
  '/:id/access',
  requireAuth,
  validate({ params: documentIdParamSchema }),
  getDocumentAccess
);

// 3. Consents router mounted at /api/consents
export const consentsRoutes = Router();
consentsRoutes.delete(
  '/:id',
  requireAuth,
  requireRole('PATIENT'),
  validate({ params: consentIdParamSchema }),
  revokeConsent
);

export default recordsRoutes;
