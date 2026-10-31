const mongoose = require('mongoose');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const { notify } = require('../utils/notify');
const { evaluateBadges } = require('../utils/badges');
const { notifyStudentNewAnswer, notifyAnswererAccepted } = require('../services/notificationService');
const { isSameDepartment } = require('../utils/departments');
const {
  LIMITS,
  PUBLIC_PREFIX,
  parseVideoLink,
  removeUploadedFiles,
  removeAttachmentFiles,
} = require('../utils/media');

const AUTHOR_FIELDS = 'name email role department reputation avatar';

// Reputation awarded/deducted for various events. Kept small and simple —
// just enough signal for the leaderboard to be meaningful, not a full
// badges/gamification system.
const REP = {
  UPVOTE: 2,
  DOWNVOTE: -1,
  ACCEPTED_ANSWER: 10,
};

// Strips the raw `voters` array (never sent as-is) and replaces it with
// `myVote`: the current viewer's own vote (1, -1, or 0 if none/guest).
const shapeAnswer = (answerDoc, viewerId) => {
  const obj = answerDoc.toObject ? answerDoc.toObject() : answerDoc;
  const mine = viewerId
    ? obj.voters?.find((v) => v.user.toString() === viewerId.toString())
    : null;
  obj.myVote = mine ? mine.value : 0;
  delete obj.voters;
  return obj;
};

const toArray = (v) => (v === undefined || v === null || v === '' ? [] : Array.isArray(v) ? v : [v]);

// Turns the uploaded files + pasted video links of a request into attachment
// sub-documents. Returns { attachments } or { error: { status, message } }.
const buildNewAttachments = (user, files = [], rawLinks = []) => {
  const links = toArray(rawLinks).map((l) => String(l).trim()).filter(Boolean);

  if (links.length && !['faculty', 'admin'].includes(user.role)) {
    return { error: { status: 403, message: 'Only faculty can add lecture video links.' } };
  }

  const attachments = files.map((f) => ({
    kind: f.kind,
    url: `${PUBLIC_PREFIX}/${f.filename}`,
    filename: f.filename,
    originalName: String(f.originalname || '').slice(0, 150),
    mimeType: f.mimetype,
    size: f.size,
  }));

  for (const link of links) {
    const parsed = parseVideoLink(link);
    if (!parsed) {
      return { error: { status: 400, message: 'Video links must be YouTube or Vimeo URLs.' } };
    }
    attachments.push({ ...parsed, originalName: `${parsed.provider} video` });
  }
  return { attachments };
};

// Text may be empty only if there is at least one attachment.
const contentError = (content, attachmentCount) => {
  if (!content) return attachmentCount ? null : 'Write an answer or attach a picture or video.';
  return content.length < 2 ? 'Answer must be at least 2 characters.' : null;
};

// @route   POST /api/answers
// @access  Private
exports.createAnswer = async (req, res, next) => {
  const uploaded = req.files || [];
  let saved = false; // if we bail out before saving, uploaded files are removed

  try {
    const { questionId } = req.body;
    const content = String(req.body.content || '').trim();

    if (!questionId) {
      return res.status(400).json({ message: 'questionId is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'Invalid questionId' });
    }

    const built = buildNewAttachments(req.user, uploaded, req.body.videoLinks);
    if (built.error) return res.status(built.error.status).json({ message: built.error.message });
    if (built.attachments.length > LIMITS.MAX_ATTACHMENTS) {
      return res.status(400).json({ message: `You can attach at most ${LIMITS.MAX_ATTACHMENTS} items.` });
    }

    const problem = contentError(content, built.attachments.length);
    if (problem) return res.status(400).json({ message: problem });

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // STUDENT RESTRICTION: Students can only answer doubts within their department
    if (req.user.role === 'student') {
      const studentDept = req.user.department;
      if (studentDept && !isSameDepartment(question.department, studentDept)) {
        return res.status(403).json({
          message: `Access denied: You cannot answer doubts outside your department (${question.department}).`,
        });
      }
    }

    const answer = await Answer.create({
      questionId,
      userId: req.user.id,
      content,
      attachments: built.attachments,
      isFacultyAnswer: req.user.role === 'faculty',
    });
    saved = true;

    question.answersCount += 1;
    await question.save();

    const populated = await answer.populate('userId', AUTHOR_FIELDS);

    notify({
      userId: question.userId,
      actorId: req.user.id,
      type: 'answer',
      questionId: question._id,
      message: `${req.user.name} answered your question "${question.title}"`,
    });
    evaluateBadges(req.user.id);
    notifyStudentNewAnswer({ question, answer: populated, answerer: req.user }); // fire-and-forget email notification

    res.status(201).json({ answer: shapeAnswer(populated, req.user.id) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: Object.values(error.errors)[0]?.message || 'Validation failed',
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }
    next(error);
  } finally {
    if (!saved) await removeUploadedFiles(uploaded);
  }
};

// @route   GET /api/answers/question/:questionId
// @access  Public (optional auth — logged-in viewers get `myVote` on each answer)
exports.getAnswersForQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'Invalid questionId' });
    }

    const answers = await Answer.find({ questionId })
      .populate('userId', AUTHOR_FIELDS)
      .sort({ isAccepted: -1, createdAt: -1 });

    res.json({ answers: answers.map((a) => shapeAnswer(a, req.user?.id)) });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/answers/:id/accept
// @access  Private (question owner only)
exports.acceptAnswer = async (req, res, next) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    const question = await Question.findById(answer.questionId);
    if (!question) {
      return res.status(404).json({ message: 'Parent question not found' });
    }

    if (question.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Only the question owner can accept an answer' });
    }

    if (!answer.isAccepted) {
      const author = await User.findById(answer.userId);
      if (author) {
        author.reputation = Math.max(0, author.reputation + REP.ACCEPTED_ANSWER);
        await author.save();
      }
    }

    const wasAlreadyAccepted = answer.isAccepted;

    await Answer.updateMany(
      { questionId: question._id, _id: { $ne: answer._id } },
      { $set: { isAccepted: false } }
    );

    answer.isAccepted = true;
    await answer.save();

    question.status = 'resolved';
    await question.save();

    const populated = await answer.populate('userId', AUTHOR_FIELDS);

    notify({
      userId: answer.userId,
      actorId: req.user.id,
      type: 'accepted',
      questionId: question._id,
      message: `Your answer to "${question.title}" was accepted (+${REP.ACCEPTED_ANSWER} reputation)`,
    });
    evaluateBadges(answer.userId);

    // Send email only when the answer newly changes to accepted state
    if (!wasAlreadyAccepted) {
      notifyAnswererAccepted({ question, answer: populated, student: req.user });
    }

    res.json({ answer: shapeAnswer(populated, req.user.id) });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid answer id' });
    }
    next(error);
  }
};

// @route   DELETE /api/answers/:id
// @access  Private (owner only)
exports.deleteAnswer = async (req, res, next) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (answer.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own answers' });
    }

    const wasAccepted = answer.isAccepted;
    await answer.deleteOne();
    await removeAttachmentFiles(answer.attachments);

    if (wasAccepted) {
      const author = await User.findById(answer.userId);
      if (author) {
        author.reputation = Math.max(0, author.reputation - REP.ACCEPTED_ANSWER);
        await author.save();
      }
    }

    const question = await Question.findById(answer.questionId);
    if (question) {
      question.answersCount = Math.max(0, question.answersCount - 1);
      if (wasAccepted) question.status = 'open';
      await question.save();
    }

    res.json({ message: 'Answer deleted successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid answer id' });
    }
    next(error);
  }
};

// @route   PATCH /api/answers/:id
// @access  Private (owner only)
exports.updateAnswer = async (req, res, next) => {
  const uploaded = req.files || [];
  let saved = false;

  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }
    if (answer.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own answers' });
    }

    // Keep existing text unless a new value was sent
    const content = req.body.content === undefined ? answer.content : String(req.body.content).trim();

    // Attachments the author chose to remove
    const removeIds = new Set(toArray(req.body.removeAttachmentIds).map(String));
    const removed = answer.attachments.filter((a) => removeIds.has(a._id.toString()));
    const kept = answer.attachments.filter((a) => !removeIds.has(a._id.toString()));

    const built = buildNewAttachments(req.user, uploaded, req.body.videoLinks);
    if (built.error) return res.status(built.error.status).json({ message: built.error.message });

    const finalCount = kept.length + built.attachments.length;
    if (finalCount > LIMITS.MAX_ATTACHMENTS) {
      return res.status(400).json({ message: `An answer can have at most ${LIMITS.MAX_ATTACHMENTS} attachments.` });
    }
    const problem = contentError(content, finalCount);
    if (problem) return res.status(400).json({ message: problem });

    answer.content = content;
    answer.attachments = [...kept, ...built.attachments];
    await answer.save();
    saved = true;

    // Only delete the removed files once the new state is safely stored
    await removeAttachmentFiles(removed);

    const populated = await answer.populate('userId', AUTHOR_FIELDS);
    res.json({ answer: shapeAnswer(populated, req.user.id) });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid answer id' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors)[0]?.message || 'Validation failed' });
    }
    next(error);
  } finally {
    if (!saved) await removeUploadedFiles(uploaded);
  }
};

// @route   POST /api/answers/:id/vote
// @access  Private
// body: { value: 1 | -1 }. Voting the same way twice removes the vote
// (toggle off); voting the opposite way switches it.
exports.voteAnswer = async (req, res, next) => {
  try {
    const { value } = req.body;
    if (![1, -1].includes(value)) {
      return res.status(400).json({ message: 'value must be 1 (upvote) or -1 (downvote)' });
    }

    const answer = await Answer.findById(req.params.id);
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (answer.userId.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'You cannot vote on your own answer' });
    }

    const existing = answer.voters.find((v) => v.user.toString() === req.user.id.toString());
    let reputationDelta = 0;

    if (!existing) {
      answer.voters.push({ user: req.user.id, value });
      if (value === 1) { answer.upvotes += 1; reputationDelta = REP.UPVOTE; }
      else { answer.downvotes += 1; reputationDelta = REP.DOWNVOTE; }
    } else if (existing.value === value) {
      // same vote again -> remove it
      answer.voters = answer.voters.filter((v) => v.user.toString() !== req.user.id.toString());
      if (value === 1) { answer.upvotes -= 1; reputationDelta = -REP.UPVOTE; }
      else { answer.downvotes -= 1; reputationDelta = -REP.DOWNVOTE; }
    } else {
      // switching from the opposite vote
      existing.value = value;
      if (value === 1) { answer.upvotes += 1; answer.downvotes -= 1; }
      else { answer.downvotes += 1; answer.upvotes -= 1; }
      reputationDelta = value === 1 ? REP.UPVOTE - REP.DOWNVOTE : REP.DOWNVOTE - REP.UPVOTE;
    }

    await answer.save();

    if (reputationDelta !== 0) {
      const author = await User.findById(answer.userId);
      if (author) {
        author.reputation = Math.max(0, author.reputation + reputationDelta);
        await author.save();
      }
    }

    const populated = await answer.populate('userId', AUTHOR_FIELDS);

    // Tell the author about a *new* upvote (not removals or downvotes) and
    // re-check their badges, since votes move reputation.
    if (value === 1 && (!existing || existing.value !== 1) && answer.voters.some((v) => v.user.toString() === req.user.id.toString())) {
      const parent = await Question.findById(answer.questionId).select('title');
      notify({
        userId: answer.userId,
        actorId: req.user.id,
        type: 'upvote',
        questionId: answer.questionId,
        message: `${req.user.name} upvoted your answer${parent ? ` on "${parent.title}"` : ''}`,
      });
    }
    if (reputationDelta !== 0) evaluateBadges(answer.userId);

    res.json({ answer: shapeAnswer(populated, req.user.id) });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid answer id' });
    }
    next(error);
  }
};
