const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');

const PUBLIC_FIELDS = 'name role department semester reputation avatar badges createdAt';

// @route   GET /api/users/:id
// @access  Public
// Returns a profile bundle: the user's public info, their activity stats,
// and their most recent questions + answers.
exports.getUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [user, questions, answers, questionsCount, answersCount, acceptedAnswersCount] =
      await Promise.all([
        User.findById(id).select(PUBLIC_FIELDS),
        Question.find({ userId: id })
          .sort({ createdAt: -1 })
          .limit(20)
          .select('title status subject department createdAt answersCount'),
        Answer.find({ userId: id })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('questionId', 'title')
          .select('content attachments isAccepted isFacultyAnswer upvotes downvotes createdAt questionId'),
        Question.countDocuments({ userId: id }),
        Answer.countDocuments({ userId: id }),
        Answer.countDocuments({ userId: id, isAccepted: true }),
      ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Rank = 1 + number of people with strictly more reputation
    const rank = (await User.countDocuments({ reputation: { $gt: user.reputation } })) + 1;

    res.json({
      user,
      stats: { questionsCount, answersCount, acceptedAnswersCount, rank },
      questions,
      answers,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    next(error);
  }
};

// @route   GET /api/users/leaderboard
// @access  Public
// Query params: department (optional filter), limit (default 20, max 100)
exports.getLeaderboard = async (req, res, next) => {
  try {
    const { department, limit = 20 } = req.query;

    const filter = {};
    if (department) filter.department = department;

    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const users = await User.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ reputation: -1, name: 1 })
      .limit(limitNum);

    res.json({ users });
  } catch (error) {
    next(error);
  }
};
