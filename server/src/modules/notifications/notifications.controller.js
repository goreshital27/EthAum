import notificationsService from './notifications.service.js';

export async function getMyNotifications(req, res, next) {
  try {
    const { unreadOnly, limit } = req.query;
    const result = await notificationsService.getUserNotifications(req.user.id, {
      unreadOnly,
      limit,
    });

    return res.status(200).json({
      status: 'ok',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await notificationsService.markAsRead(id, req.user.id);

    return res.status(200).json({
      status: 'ok',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    const updated = await notificationsService.markAllAsRead(req.user.id);

    return res.status(200).json({
      status: 'ok',
      message: 'All notifications marked as read',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
