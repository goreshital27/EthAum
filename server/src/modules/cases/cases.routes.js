import { Router } from 'express';
import multer from 'multer';
import {
  createCase,
  getCases,
  getCaseById,
  updateCaseStage,
} from './cases.controller.js';
import {
  createCaseSchema,
  caseIdParamSchema,
  updateStageSchema,
} from './cases.schemas.js';
import {
  uploadCaseDocument,
  grantCaseConsent,
} from '../records/records.controller.js';
import { grantConsentSchema } from '../records/records.schemas.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';

// Multer memory storage for 10MB medical file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

// All case routes require authentication
router.use(requireAuth);

// POST /api/cases (PATIENT only)
router.post(
  '/',
  requireRole('PATIENT'),
  validate({ body: createCaseSchema }),
  createCase
);

// GET /api/cases (PATIENT only)
router.get('/', requireRole('PATIENT'), getCases);

// GET /api/cases/:id (Ownership checked inside controller)
router.get('/:id', validate({ params: caseIdParamSchema }), getCaseById);

// PATCH /api/cases/:id/stage (Stage transition — ADMIN only)
// Patients must NOT advance their own case stage.
// Hospital and admin modules may import enforceStageTransition directly.
router.patch(
  '/:id/stage',
  requireRole('ADMIN'),
  validate({ params: caseIdParamSchema, body: updateStageSchema }),
  updateCaseStage
);

// POST /api/cases/:id/documents (File upload with consent)
router.post(
  '/:id/documents',
  requireRole('PATIENT'),
  validate({ params: caseIdParamSchema }),
  upload.single('file'),
  uploadCaseDocument
);

// POST /api/cases/:id/consents (Grant hospital consent)
router.post(
  '/:id/consents',
  requireRole('PATIENT'),
  validate({ params: caseIdParamSchema, body: grantConsentSchema }),
  grantCaseConsent
);

export default router;
