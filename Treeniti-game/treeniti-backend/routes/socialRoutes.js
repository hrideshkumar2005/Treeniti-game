const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/claim', authMiddleware, socialController.claimSocialReward);

module.exports = router;
