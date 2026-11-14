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
  shortlistSchema,
  hospitalIdParamSchema,
} from './cases.schemas.js';
import {
  setShortlist,
  getShortlist,
  deleteShortlist,
  requestExploratoryCall,
} from './shortlist.controller.js';
import {
  uploadCaseDocument,
  grantCaseConsent,
} from '../records/records.controller.js';
import { grantConsentSchema } from '../records/records.schemas.js';
import {
  createCaseEnquiry,
  getCaseEnquiries,
} from '../quotes/enquiries.controller.js';
import { getPatientQuotes } from '../quotes/quotes.controller.js';
import { createEnquirySchema } from '../quotes/quotes.schemas.js';
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

// POST /api/cases/:id/enquiries (Patient submits case enquiry to hospital)
router.post(
  '/:id/enquiries',
  requireRole('PATIENT'),
  validate({ params: caseIdParamSchema, body: createEnquirySchema }),
  createCaseEnquiry
);

// GET /api/cases/:id/enquiries (Patient lists enquiries for this case)
router.get(
  '/:id/enquiries',
  requireRole('PATIENT'),
  validate({ params: caseIdParamSchema }),
  getCaseEnquiries
);

// GET /api/cases/:id/quotes (Patient lists received quotations for this case)
router.get(
  '/:id/quotes',
  requireRole('PATIENT'),
  validate({ params: caseIdParamSchema }),
  getPatientQuotes
);

// POST /api/cases/:id/shortlist (Set 2-3 shortlisted hospitals)
router.post(
  '/:id/shortlist',
  requireRole('PATIENT'),
  validate({ params: caseIdParamSchema, body: shortlistSchema }),
  setShortlist
);

// GET /api/cases/:id/shortlist (Get shortlisted hospitals)
router.get(
  '/:id/shortlist',
  requireRole('PATIENT'),
  validate({ params: caseIdParamSchema }),
  getShortlist
);

// DELETE /api/cases/:id/shortlist (Clear or remove from shortlist)
router.delete(
  '/:id/shortlist',
  requireRole('PATIENT'),
  validate({ params: caseIdParamSchema }),
  deleteShortlist
);

// POST /api/cases/:id/shortlist/:hospitalId/request-call (Request exploratory consultation call)
router.post(
  '/:id/shortlist/:hospitalId/request-call',
  requireRole('PATIENT'),
  validate({ params: hospitalIdParamSchema }),
  requestExploratoryCall
);

export default router;
