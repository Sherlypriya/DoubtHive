const express = require('express');
const router = express.Router();
const {
  getPlatformStats,
  getUsers,
  updateUserRole,
  getQuestionsAdmin,
  adminDeleteQuestion,
  adminDeleteAnswer,
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// All admin routes require authentication + admin role
router.use(protect, requireRole('admin'));

router.get('/stats', getPlatformStats);
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.get('/questions', getQuestionsAdmin);
router.delete('/questions/:id', adminDeleteQuestion);
router.delete('/answers/:id', adminDeleteAnswer);

module.exports = router;
