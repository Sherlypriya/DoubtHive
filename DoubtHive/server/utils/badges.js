const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { notify } = require('./notify');

// id -> human label (shown in notifications) + rule. The client keeps its own
// icon/description map keyed by the same ids (client/src/constants/badges.js).
const BADGES = [
  { id: 'first-question', label: 'First Doubt',      test: (s) => s.questions >= 1 },
  { id: 'curious-mind',   label: 'Curious Mind',     test: (s) => s.questions >= 5 },
  { id: 'first-answer',   label: 'First Reply',      test: (s) => s.answers >= 1 },
  { id: 'helpful-hand',   label: 'Helpful Hand',     test: (s) => s.answers >= 5 },
  { id: 'problem-solver', label: 'Problem Solver',   test: (s) => s.accepted >= 1 },
  { id: 'hive-expert',    label: 'Hive Expert',      test: (s) => s.accepted >= 5 },
  { id: 'crowd-favorite', label: 'Crowd Favorite',   test: (s) => s.topVotes >= 5 },
  { id: 'rising-star',    label: 'Rising Star',      test: (s) => s.reputation >= 50 },
  { id: 'hive-legend',    label: 'Hive Legend',      test: (s) => s.reputation >= 150 },
];

// Recomputes which badges a user qualifies for and awards any new ones.
// Safe to call after any action; it only ever adds badges. Never throws.
exports.evaluateBadges = async (userId) => {
  try {
    const user = await User.findById(userId).select('badges reputation');
    if (!user) return [];

    const [questions, answers, accepted, top] = await Promise.all([
      Question.countDocuments({ userId }),
      Answer.countDocuments({ userId }),
      Answer.countDocuments({ userId, isAccepted: true }),
      Answer.findOne({ userId }).sort({ upvotes: -1 }).select('upvotes'),
    ]);

    const stats = {
      questions,
      answers,
      accepted,
      topVotes: top?.upvotes || 0,
      reputation: user.reputation || 0,
    };

    const have = new Set(user.badges || []);
    const earned = BADGES.filter((b) => !have.has(b.id) && b.test(stats));
    if (earned.length === 0) return [];

    await User.updateOne(
      { _id: userId },
      { $addToSet: { badges: { $each: earned.map((b) => b.id) } } }
    );

    await Promise.all(
      earned.map((b) =>
        notify({
          userId,
          type: 'badge',
          message: `You earned the "${b.label}" badge!`,
        })
      )
    );

    return earned.map((b) => b.id);
  } catch (err) {
    console.error('evaluateBadges failed:', err.message);
    return [];
  }
};

exports.BADGES = BADGES;
