const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('actorId', 'name'),
      Notification.countDocuments({ userId: req.user.id, read: false }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markRead = async (req, res, next) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, userId: req.user.id },
      { $set: { read: true } }
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid notification id' });
    }
    next(error);
  }
};
