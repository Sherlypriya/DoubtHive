const Notification = require('../models/Notification');

// Fire-and-forget helper: a failed notification must never break the
// action that triggered it (posting an answer, voting, ...).
exports.notify = async ({ userId, actorId = null, type, questionId = null, message }) => {
  try {
    if (!userId) return;
    if (actorId && userId.toString() === actorId.toString()) return; // never notify yourself

    // Collapse repeats: if the same person already has an unread notification
    // of this kind about this question, don't stack another one.
    if (type !== 'badge') {
      const duplicate = await Notification.findOne({
        userId, actorId, type, questionId, read: false,
      });
      if (duplicate) return;
    }

    await Notification.create({ userId, actorId, type, questionId, message });
  } catch (err) {
    console.error('notify failed:', err.message);
  }
};
