import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, getMe } from './auth.controller.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import { validate } from '../../middleware/validation.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// Strict login rate limiter: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

// POST /api/auth/register
router.post('/register', validate({ body: registerSchema }), register);

// POST /api/auth/login
router.post('/login', loginLimiter, validate({ body: loginSchema }), login);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me
router.get('/me', requireAuth, getMe);

export default router;
