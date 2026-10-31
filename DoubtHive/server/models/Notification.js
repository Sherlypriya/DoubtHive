const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // recipient
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // who triggered it (null for system events such as badges)
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
      type: String,
      enum: ['answer', 'accepted', 'upvote', 'badge'],
      required: true,
    },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null },
    message: { type: String, required: true, maxlength: 300 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
