const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get a new CAPTCHA (Publicly available for login or sensitive actions)
router.get('/captcha/new', securityController.getNewCaptcha);

// Verify a CAPTCHA
router.post('/captcha/verify', securityController.validateCaptcha);

module.exports = router;
