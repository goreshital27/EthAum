import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import prisma from '../config/prisma.js';

/**
 * requireAuth Middleware
 *
 * Rules:
 * - Reads JWT from Authorization: Bearer header first, with httpOnly cookie "token" as fallback.
 * - Verifies JWT signature and expiry.
 * - Loads the full User entity from database with associated profiles.
 * - Returns 401 if missing, invalid, expired, or user not found/inactive.
 */
export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Read token from Authorization: Bearer header first
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    // 2. Fallback to httpOnly cookie
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired session token',
      });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid session token payload',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        patientProfile: true,
        hospital: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User account not found',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * requireRole Middleware
 *
 * Rules:
 * - Verifies the authenticated user has one of the required roles.
 * - Returns 403 Forbidden if role does not match.
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required for role verification',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access forbidden: insufficient role permissions',
      });
    }

    next();
  };
};

export const authenticate = requireAuth;
export default requireAuth;
