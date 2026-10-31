const express = require('express');
const router = express.Router();
const { getUserProfile, getLeaderboard } = require('../controllers/userController');

// Must be registered before '/:id' — otherwise Express would try to match
// "leaderboard" as a user id.
router.get('/leaderboard', getLeaderboard);
router.get('/:id', getUserProfile);

module.exports = router;
