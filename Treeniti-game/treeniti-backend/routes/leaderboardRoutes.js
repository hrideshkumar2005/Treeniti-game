const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, leaderboardController.getGlobalLeaderboard);
router.get('/global', authMiddleware, leaderboardController.getGlobalLeaderboard);

module.exports = router;
