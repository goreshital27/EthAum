import config from '../config/index.js';

/**
 * Global Error Handler Middleware
 *
 * Rules:
 * - Never log secrets, passwords, tokens, or protected health information (PHI).
 * - Return clean, structured error responses.
 */
export const errorHandler = (err, req, res, next) => {
  // Prisma Unique Constraint Violation
  if (err.code === 'P2002') {
    return res.status(409).json({
      status: 'error',
      message: 'A record with these details already exists.',
    });
  }

  // Prisma Record Not Found
  if (err.code === 'P2025') {
    return res.status(404).json({
      status: 'error',
      message: 'The requested record was not found.',
    });
  }

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
