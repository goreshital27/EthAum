import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import {
  caseIdParamSchema,
  sendMessageSchema,
  getMessagesQuerySchema,
} from './messages.schemas.js';
import { sendMessage, getMessages } from './messages.controller.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

// Rate limiter: 30 messages per 10 minutes per user
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    status: 'fail',
    message: 'Too many messages sent. Please wait a moment before sending more.',
  },
});

// GET /api/cases/:caseId/messages
router.get(
  '/',
  validate({ params: caseIdParamSchema, query: getMessagesQuerySchema }),
  getMessages
);

// POST /api/cases/:caseId/messages
router.post(
  '/',
  chatLimiter,
  validate({ params: caseIdParamSchema, body: sendMessageSchema }),
  sendMessage
);

export default router;
