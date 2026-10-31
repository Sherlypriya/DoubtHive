const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { removeAttachmentFiles } = require('../utils/media');
const Notification = require('../models/Notification');
const { notifyAdminModerationEvent } = require('../services/notificationService');

// @route   GET /api/admin/stats
// @access  Admin
exports.getPlatformStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      studentCount,
      facultyCount,
      adminCount,
      totalQuestions,
      openQuestions,
      resolvedQuestions,
      totalAnswers,
      totalNotifications,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'faculty' }),
      User.countDocuments({ role: 'admin' }),
      Question.countDocuments(),
      Question.countDocuments({ status: 'open' }),
      Question.countDocuments({ status: 'resolved' }),
      Answer.countDocuments(),
      Notification.countDocuments(),
    ]);

    // Top 5 most active users (by reputation)
    const topUsers = await User.find()
      .select('name role reputation department badges')
      .sort({ reputation: -1 })
      .limit(5);

    // Most recent questions
    const recentQuestions = await Question.find()
      .populate('userId', 'name role')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status subject answersCount createdAt userId');

    res.json({
      users: { total: totalUsers, students: studentCount, faculty: facultyCount, admins: adminCount },
      questions: { total: totalQuestions, open: openQuestions, resolved: resolvedQuestions },
      answers: { total: totalAnswers },
      notifications: { total: totalNotifications },
      topUsers,
      recentQuestions,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/admin/users
// @access  Admin
exports.getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (['student', 'faculty', 'admin'].includes(role)) filter.role = role;
    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
      ];
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email role department reputation badges createdAt')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/admin/users/:id/role
// @access  Admin — change a user's role
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['student', 'faculty', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'role must be student, faculty, or admin' });
    }
    // An admin cannot demote themselves
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('name email role department reputation');
    if (!user) return res.status(404).json({ message: 'User not found' });

    notifyAdminModerationEvent({
      action: 'User Role Updated',
      itemType: 'User',
      title: user.name,
      details: `Role changed to "${role}" for ${user.email}`,
      actor: req.user,
    });

    res.json({ user, message: `Role updated to ${role}` });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid user id' });
    next(error);
  }
};

// @route   GET /api/admin/questions
// @access  Admin
exports.getQuestionsAdmin = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (['open', 'resolved'].includes(status)) filter.status = status;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [questions, total] = await Promise.all([
      Question.find(filter)
        .populate('userId', 'name role')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('title status subject department answersCount views createdAt userId'),
      Question.countDocuments(filter),
    ]);

    res.json({
      questions,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/admin/questions/:id
// @access  Admin — force-delete any question
exports.adminDeleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const answerMedia = await Answer.find({ questionId: question._id }).select('attachments');

    await Promise.all([
      question.deleteOne(),
      Answer.deleteMany({ questionId: question._id }),
      Notification.deleteMany({ questionId: question._id }),
      User.updateMany({ bookmarks: question._id }, { $pull: { bookmarks: question._id } }),
    ]);

    await removeAttachmentFiles(answerMedia.flatMap((a) => a.attachments));

    notifyAdminModerationEvent({
      action: 'Question Force-Deleted',
      itemType: 'Question',
      title: question.title,
      details: `Subject: ${question.subject} | Department: ${question.department}`,
      actor: req.user,
    });

    res.json({ message: 'Question removed by admin' });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid question id' });
    next(error);
  }
};

// @route   DELETE /api/admin/answers/:id
// @access  Admin — force-delete any answer
exports.adminDeleteAnswer = async (req, res, next) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).json({ message: 'Answer not found' });

    const question = await Question.findById(answer.questionId);
    if (question) {
      question.answersCount = Math.max(0, question.answersCount - 1);
      if (answer.isAccepted) question.status = 'open';
      await question.save();
    }

    await answer.deleteOne();
    await removeAttachmentFiles(answer.attachments);

    notifyAdminModerationEvent({
      action: 'Answer Force-Deleted',
      itemType: 'Answer',
      title: (answer.content || 'Media Answer').slice(0, 60),
      details: question ? `On Question: "${question.title}"` : '',
      actor: req.user,
    });

    res.json({ message: 'Answer removed by admin' });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid answer id' });
    next(error);
  }
};
