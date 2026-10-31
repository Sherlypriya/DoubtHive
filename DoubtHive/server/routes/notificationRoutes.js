const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAllRead,
  markRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { getSentEmailsLog, clearSentEmailsLog } = require('../services/emailService');

// Development inspection endpoint for email verification
if (process.env.NODE_ENV !== 'production') {
  router.get('/dev/email-logs', (req, res) => {
    res.json({ logs: getSentEmailsLog() });
  });
  router.delete('/dev/email-logs', (req, res) => {
    clearSentEmailsLog();
    res.json({ message: 'Email logs cleared' });
  });
}

router.use(protect);

router.get('/', getNotifications);
// Must be registered before '/:id/read'
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

module.exports = router;
