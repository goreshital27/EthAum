import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Authentication Middleware
 *
 * Rules:
 * - JWT stored and read ONLY from httpOnly cookies, never localStorage.
 * - Extracts and verifies token; populates req.user.
 */
export const authenticate = (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token required',
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded; // { id, role, email, ... }
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired session token',
    });
  }
};

export default authenticate;
