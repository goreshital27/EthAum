import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import {
  getHospitalApprovals,
  approveHospital,
  rejectHospital,
  getCases,
  getCaseById,
  getAdminCaseDocumentAccess,
  updateAdminCaseStage,
  getReferrals,
  markReferralPaid,
  getAnalytics,
  getUsers,
} from './admin.controller.js';
import {
  hospitalApprovalQuerySchema,
  hospitalIdParamSchema,
  rejectHospitalSchema,
  casesQuerySchema,
  caseIdParamSchema,
  caseDocumentParamsSchema,
  updateCaseStageSchema,
  referralsQuerySchema,
  referralIdParamSchema,
  usersQuerySchema,
} from './admin.schemas.js';

const router = Router();

// Strict global guard: All admin routes require authenticated ADMIN role
router.use(requireAuth);
router.use(requireRole('ADMIN'));

// 1. Hospital Approvals
router.get(
  '/hospitals',
  requireRole('ADMIN'),
  validate({ query: hospitalApprovalQuerySchema }),
  getHospitalApprovals
);

router.post(
  '/hospitals/:id/approve',
  requireRole('ADMIN'),
  validate({ params: hospitalIdParamSchema }),
  approveHospital
);

router.post(
  '/hospitals/:id/reject',
  requireRole('ADMIN'),
  validate({ params: hospitalIdParamSchema, body: rejectHospitalSchema }),
  rejectHospital
);

// 2. Cases
router.get(
  '/cases',
  requireRole('ADMIN'),
  validate({ query: casesQuerySchema }),
  getCases
);

router.get(
  '/cases/:id',
  requireRole('ADMIN'),
  validate({ params: caseIdParamSchema }),
  getCaseById
);

router.get(
  '/cases/:id/documents/:docId/access',
  requireRole('ADMIN'),
  validate({ params: caseDocumentParamsSchema }),
  getAdminCaseDocumentAccess
);

router.patch(
  '/cases/:id/stage',
  requireRole('ADMIN'),
  validate({ params: caseIdParamSchema, body: updateCaseStageSchema }),
  updateAdminCaseStage
);

// 3. Referrals and Commissions
router.get(
  '/referrals',
  requireRole('ADMIN'),
  validate({ query: referralsQuerySchema }),
  getReferrals
);

router.post(
  '/referrals/:id/mark-paid',
  requireRole('ADMIN'),
  validate({ params: referralIdParamSchema }),
  markReferralPaid
);

// 4. Analytics
router.get(
  '/analytics',
  requireRole('ADMIN'),
  getAnalytics
);

// 5. Users
router.get(
  '/users',
  requireRole('ADMIN'),
  validate({ query: usersQuerySchema }),
  getUsers
);

export default router;
