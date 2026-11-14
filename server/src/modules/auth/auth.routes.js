import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, getMe } from './auth.controller.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import { validate } from '../../middleware/validation.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// Strict registration rate limiter: 20 attempts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many registration attempts. Please try again after 1 hour.',
  },
});

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
router.post('/register', registerLimiter, validate({ body: registerSchema }), register);

// POST /api/auth/login
router.post('/login', loginLimiter, validate({ body: loginSchema }), login);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me
router.get('/me', requireAuth, getMe);

export default router;
