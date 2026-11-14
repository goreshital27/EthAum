import { z } from 'zod';

export const notificationIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid notification ID' }),
});

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
