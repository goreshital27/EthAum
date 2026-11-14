import prisma from '../../config/prisma.js';

/**
 * Creates a notification for a user.
 * Safe helper: catches and logs errors without failing the parent caller.
 */
export async function createNotification({ userId, type, title, body, link = null }) {
  try {
    if (!userId || !type || !title || !body) return null;
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        link,
      },
    });
  } catch (error) {
    // Never fail business transaction on notification error
    return null;
  }
}

/**
 * Lists notifications for a user and counts unread.
 */
export async function getUserNotifications(userId, { unreadOnly = false, limit = 50 } = {}) {
  const where = {
    userId,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    }),
  ]);

  return { notifications, unreadCount };
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(notificationId, userId) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllAsRead(userId) {
  return await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

export default {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
