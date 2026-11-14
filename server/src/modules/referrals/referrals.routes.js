import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { getMyReferrals } from './referrals.controller.js';

const router = Router();

// All referral routes require authentication and PATIENT role
router.use(requireAuth);
router.use(requireRole('PATIENT'));

// GET /api/referrals/me
router.get('/me', getMyReferrals);

// GET /api/referrals (alias)
router.get('/', getMyReferrals);

export default router;
