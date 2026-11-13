/**
 * Role Check Middleware
 *
 * Rules:
 * - Roles: PATIENT, HOSPITAL, ADMIN.
 * - Doctors are profiles managed by hospitals, not logins.
 */
export const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for role verification',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions for this resource',
      });
    }

    next();
  };
};

export default requireRoles;
