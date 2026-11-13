import config from '../config/index.js';

/**
 * Global Error Handler Middleware
 *
 * Rules:
 * - Never log secrets, passwords, tokens, or protected health information (PHI).
 * - Return clean, structured error responses.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  // Safe logging without leaking PHI or secrets
  console.error(`[Error] ${req.method} ${req.path} - Status ${statusCode}: ${err.message || 'Internal Server Error'}`);

  res.status(statusCode).json({
    status: 'error',
    message: err.isPublic || config.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
