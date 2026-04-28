const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get all active articles for reading
router.get('/', authMiddleware, articleController.getActiveArticles);

// Track metrics and claim coins for successfully reading an article
router.post('/read', authMiddleware, articleController.trackArticleReading);

module.exports = router;
