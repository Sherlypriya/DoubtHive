const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { removeAttachmentFiles } = require('../utils/media');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { evaluateBadges } = require('../utils/badges');
const { notifyFacultyNewDoubt } = require('../services/notificationService');

const {
  normalizeDepartment,
  isSameDepartment,
  departmentRegex,
} = require('../utils/departments');

const AUTHOR_FIELDS = 'name email role department semester reputation avatar';

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  answers: { answersCount: -1, createdAt: -1 },
  views: { views: -1, createdAt: -1 },
};

// @route   POST /api/questions
// @access  Private
exports.createQuestion = async (req, res, next) => {
  try {
    let { title, description, tags, subject, department, semester } = req.body;

    // For students: strictly lock department and semester to the student's profile
    if (req.user.role === 'student') {
      department = req.user.department || department;
      semester = req.user.semester || semester || 1;
    } else {
      department = normalizeDepartment(department);
      semester = semester ? Number(semester) : 1;
    }

    if (!title || !description || !subject || !department) {
      return res.status(400).json({
        message: 'title, description, subject and department are all required',
      });
    }

    const question = await Question.create({
      userId: req.user.id,
      title,
      description,
      tags,
      subject,
      department: normalizeDepartment(department),
      semester: Number(semester) || 1,
    });

    const populated = await question.populate('userId', AUTHOR_FIELDS);
    evaluateBadges(req.user.id); // fire-and-forget
    notifyFacultyNewDoubt({ question: populated, student: req.user }); // fire-and-forget email notification

    res.status(201).json({ question: populated });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation failed',
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }
    next(error);
  }
};

// @route   GET /api/questions
// @access  Public (optional auth - filters by student's department & semester)
// Supported query params: subject, department, semester, tag, status, unanswered=true, search, sort, page, limit
// sort: newest (default) | oldest | answers | views
exports.getQuestions = async (req, res, next) => {
  try {
    const { subject, department, semester, tag, status, unanswered, search, sort = 'newest', page = 1, limit = 20 } = req.query;

    const filter = {};

    // ── STUDENT ACCESS RESTRICTION ──────────────────────────────────────────
    // Students can ONLY access questions of their own department!
    if (req.user && req.user.role === 'student') {
      const studentDept = normalizeDepartment(req.user.department);
      if (studentDept) {
        filter.department = departmentRegex(studentDept);
      }

      // If semester filter requested, apply it; otherwise default to student's semester or legacy questions
      if (semester) {
        filter.semester = Number(semester);
      } else if (req.user.semester) {
        filter.$or = [
          { semester: Number(req.user.semester) },
          { semester: { $exists: false } },
          { semester: null },
        ];
      }
    } else {
      // Non-students / unauthenticated users can filter by department and semester
      if (department) filter.department = departmentRegex(department);
      if (semester) filter.semester = Number(semester);
    }

    if (subject) filter.subject = subject;
    if (tag) filter.tags = tag.toLowerCase();
    if (['open', 'resolved'].includes(status)) filter.status = status;
    if (unanswered === 'true') filter.answersCount = 0;
    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchOr = [
        { title: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
      ];
      if (filter.$or) {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: filter.$or });
        delete filter.$or;
        filter.$and.push({ $or: searchOr });
      } else {
        filter.$or = searchOr;
      }
    }

    const sortBy = SORTS[sort] || SORTS.newest;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const [questions, total] = await Promise.all([
      Question.find(filter)
        .populate('userId', AUTHOR_FIELDS)
        .sort(sortBy)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Question.countDocuments(filter),
    ]);

    res.json({
      questions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/questions/stats
// @access  Public (optional auth - scopes to student's department)
// Powers the dashboard header + trending tags sidebar on the home feed.
exports.getQuestionStats = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user && req.user.role === 'student' && req.user.department) {
      filter.department = departmentRegex(req.user.department);
    }

    const [totalQuestions, openQuestions, resolvedQuestions, answerAgg, tagAgg] = await Promise.all([
      Question.countDocuments(filter),
      Question.countDocuments({ ...filter, status: 'open' }),
      Question.countDocuments({ ...filter, status: 'resolved' }),
      Question.aggregate([
        ...(filter.department ? [{ $match: filter }] : []),
        { $group: { _id: null, total: { $sum: '$answersCount' } } },
      ]),
      Question.aggregate([
        ...(filter.department ? [{ $match: filter }] : []),
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    res.json({
      totalQuestions,
      openQuestions,
      resolvedQuestions,
      totalAnswers: answerAgg[0]?.total || 0,
      trendingTags: tagAgg.map((t) => ({ tag: t._id, count: t.count })),
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/questions/:id
// @access  Public (optional auth — enforces student department access control)
exports.getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).populate('userId', AUTHOR_FIELDS);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // ── STUDENT ACCESS RESTRICTION ──────────────────────────────────────────
    // Students cannot access questions from another department
    if (req.user && req.user.role === 'student') {
      const studentDept = req.user.department;
      if (studentDept && !isSameDepartment(question.department, studentDept)) {
        return res.status(403).json({
          message: `Access restricted: You belong to ${normalizeDepartment(studentDept)} and cannot access doubts from ${question.department}.`,
          restricted: true,
          requiredDepartment: question.department,
          userDepartment: studentDept,
        });
      }
    }

    const isBookmarked = req.user
      ? (req.user.bookmarks || []).some((b) => b.toString() === question._id.toString())
      : false;

    res.json({ question: { ...question.toObject(), isBookmarked } });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid question id' });
    }
    next(error);
  }
};

// @route   POST /api/questions/:id/view
// @access  Public (optional auth)
// Called once per browser session per question by the client, so refreshes and
// React dev double-renders don't inflate the count. The asker's own visits
// are never counted.
exports.recordView = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).select('userId views');
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const isOwner = req.user && question.userId.toString() === req.user.id.toString();
    if (isOwner) return res.json({ views: question.views });

    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).select('views');

    res.json({ views: updated.views });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid question id' });
    }
    next(error);
  }
};

// @route   GET /api/questions/similar?title=...
// @access  Public
// Powers the "Already asked?" hint on the Ask page. Uses the existing text index.
exports.getSimilarQuestions = async (req, res) => {
  try {
    const title = String(req.query.title || '').trim();
    if (title.length < 5) return res.json({ questions: [] });

    const questions = await Question.find(
      { $text: { $search: title } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(4)
      .select('title status answersCount subject');

    res.json({ questions });
  } catch (error) {
    // A suggestion feature should never surface as an error to the user
    res.json({ questions: [] });
  }
};

// @route   POST /api/questions/:id/bookmark
// @access  Private — toggles the bookmark and returns the new state
exports.toggleBookmark = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).select('_id');
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const already = (req.user.bookmarks || []).some((b) => b.toString() === question._id.toString());

    await User.updateOne(
      { _id: req.user.id },
      already ? { $pull: { bookmarks: question._id } } : { $addToSet: { bookmarks: question._id } }
    );

    res.json({ bookmarked: !already });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid question id' });
    }
    next(error);
  }
};

// @route   GET /api/questions/saved
// @access  Private
exports.getSavedQuestions = async (req, res, next) => {
  try {
    const ids = req.user.bookmarks || [];
    const questions = await Question.find({ _id: { $in: ids } })
      .populate('userId', AUTHOR_FIELDS)
      .sort({ createdAt: -1 });
    res.json({ questions });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/questions/:id
// @access  Private (owner only)
exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    if (question.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own questions' });
    }

    const { title, description, tags, subject, department } = req.body;
    if (title !== undefined) question.title = title;
    if (description !== undefined) question.description = description;
    if (tags !== undefined) question.tags = tags;
    if (subject !== undefined) question.subject = subject;
    if (department !== undefined && req.user.role !== 'student') {
      question.department = normalizeDepartment(department);
    }
    if (req.body.semester !== undefined) {
      question.semester = Number(req.body.semester) || question.semester;
    }

    await question.save();
    const populated = await question.populate('userId', AUTHOR_FIELDS);
    res.json({ question: populated });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid question id' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation failed',
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }
    next(error);
  }
};

// @route   DELETE /api/questions/:id
// @access  Private (owner only)
exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own questions' });
    }

    const answerMedia = await Answer.find({ questionId: question._id }).select('attachments');

    await Promise.all([
      question.deleteOne(),
      Answer.deleteMany({ questionId: question._id }),
      Notification.deleteMany({ questionId: question._id }),
      User.updateMany({ bookmarks: question._id }, { $pull: { bookmarks: question._id } }),
    ]);

    await removeAttachmentFiles(answerMedia.flatMap((a) => a.attachments));

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid question id' });
    }
    next(error);
  }
};
