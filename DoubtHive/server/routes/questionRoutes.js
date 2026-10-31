const express = require('express');
const router = express.Router();
const {
  createQuestion,
  getQuestions,
  getQuestionStats,
  getQuestionById,
  recordView,
  getSimilarQuestions,
  toggleBookmark,
  getSavedQuestions,
  deleteQuestion,
  updateQuestion,
} = require('../controllers/questionController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');


// Fixed paths must be registered before '/:id' — otherwise Express would try
// to match "stats", "similar" or "saved" as a question id.
router.get('/stats', optionalAuth, getQuestionStats);
router.get('/similar', getSimilarQuestions);
router.get('/saved', protect, getSavedQuestions);
router.get('/', optionalAuth, getQuestions);
router.get('/:id', optionalAuth, getQuestionById);
router.post('/', protect, createQuestion);
router.post('/:id/view', optionalAuth, recordView);
router.post('/:id/bookmark', protect, toggleBookmark);
router.patch('/:id', protect, updateQuestion);
router.delete('/:id', protect, deleteQuestion);

module.exports = router;
