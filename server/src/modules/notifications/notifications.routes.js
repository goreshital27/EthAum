import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
} from './notifications.schemas.js';
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './notifications.controller.js';

const router = Router();

// All notification endpoints require authenticated user
router.use(requireAuth);

// GET /api/notifications
router.get('/', validate({ query: listNotificationsQuerySchema }), getMyNotifications);

// PATCH /api/notifications/read-all
router.patch('/read-all', markAllNotificationsRead);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', validate({ params: notificationIdParamSchema }), markNotificationRead);

export default router;
