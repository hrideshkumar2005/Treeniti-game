const { generateCaptcha, verifyCaptcha } = require('../services/captchaService');

exports.getNewCaptcha = async (req, res) => {
    try {
        const captcha = generateCaptcha();
        // In a real app, you might use a library to generate an IMAGE from the code.
        // For this implementation, we return the captchaId and the code (masked or raw for frontend rendering).
        res.json({ success: true, captchaId: captcha.captchaId, code: captcha.code });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.validateCaptcha = async (req, res) => {
    try {
        const { captchaId, userCode } = req.body;
        const isValid = verifyCaptcha(captchaId, userCode);
        
        if (isValid) {
            res.json({ success: true, message: "Captcha verified." });
        } else {
            res.status(400).json({ success: false, error: "Invalid or expired Captcha." });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
};
