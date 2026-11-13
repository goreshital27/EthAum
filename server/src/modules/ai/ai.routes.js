import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { AI_DISCLAIMER } from '../../services/ai.schemas.js';
import { caseIdParamSchema } from './ai.schemas.js';
import {
  triggerReadiness,
  triggerMatching,
  getCaseSummaries,
} from './ai.controller.js';

const router = Router();

// Per-user rate limiter: 10 requests per hour
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    error: 'Too many requests',
    message: 'AI rate limit exceeded: maximum 10 requests per hour',
    disclaimer: AI_DISCLAIMER,
  },
});

// All AI routes require authentication and PATIENT role
router.use(requireAuth);
router.use(requireRole('PATIENT'));

// POST /api/ai/cases/:caseId/readiness
router.post(
  '/cases/:caseId/readiness',
  aiRateLimiter,
  validate({ params: caseIdParamSchema }),
  triggerReadiness
);

// POST /api/ai/cases/:caseId/matching
router.post(
  '/cases/:caseId/matching',
  aiRateLimiter,
  validate({ params: caseIdParamSchema }),
  triggerMatching
);

// GET /api/ai/cases/:caseId/summaries
router.get(
  '/cases/:caseId/summaries',
  validate({ params: caseIdParamSchema }),
  getCaseSummaries
);

export default router;
