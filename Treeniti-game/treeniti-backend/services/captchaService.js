/**
 * 🛡️ SRS 3.16 - Treeniti Internal CAPTCHA Service
 * Generates simple alphanumeric challenges to prevent automated scripted actions.
 */

const captchas = new Map(); // { captchaId => { code, expires } }

exports.generateCaptcha = () => {
    const captchaId = Math.random().toString(36).substring(2, 12);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 chars
    
    // Store for 5 minutes
    captchas.set(captchaId, { 
        code, 
        expires: Date.now() + 300000 
    });

    return { captchaId, code }; // In production, usually return as an image or masked text
};

exports.verifyCaptcha = (captchaId, userCode) => {
    if (!captchaId || !userCode) return false;
    
    const stored = captchas.get(captchaId);
    if (!stored || stored.expires < Date.now()) {
        captchas.delete(captchaId);
        return false;
    }

    const isValid = stored.code === userCode.toUpperCase();
    captchas.delete(captchaId); // One-time use
    return isValid;
};

// Cleanup task for memory management
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of captchas.entries()) {
        if (data.expires < now) captchas.delete(id);
    }
}, 600000); // Every 10 mins
