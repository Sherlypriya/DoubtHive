const express = require('express');
const router = express.Router();
const {
  createAnswer,
  getAnswersForQuestion,
  acceptAnswer,
  deleteAnswer,
  voteAnswer,
  updateAnswer,
} = require('../controllers/answerController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const answerMedia = require('../middleware/uploadMiddleware');

router.get('/question/:questionId', optionalAuth, getAnswersForQuestion);
// answerMedia parses multipart (pictures / lecture videos); plain JSON passes through
router.post('/', protect, answerMedia, createAnswer);
router.patch('/:id/accept', protect, acceptAnswer);
router.patch('/:id', protect, answerMedia, updateAnswer);
router.delete('/:id', protect, deleteAnswer);
router.post('/:id/vote', protect, voteAnswer);

module.exports = router;
