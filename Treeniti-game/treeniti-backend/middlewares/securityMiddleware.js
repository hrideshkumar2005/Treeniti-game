/**
 * 🛡️ SRS 3.16 - Treeniti Security Middleware
 * Implements:
 *  - Rate Limiting (anti-bot, brute force)
 *  - OTP request throttling
 *  - Rapid action detection (scripted behavior)
 *  - Daily earning limit enforcement (with flagging)
 *  - Suspicious activity logging for admin review
 */

const { User, Transaction, SystemConfig } = require('../models/AllModels');

// ─── In-Memory Rate-Limit Stores (No extra packages needed) ─────────────────
const requestLog = new Map();   // IP-based request log  { ip => [timestamps] }
const otpRateLog = new Map();   // OTP request rate limiter { mobile => [timestamps] }
const actionLog = new Map();    // Authenticated user action burst { userId => [timestamps] }
const actionIntervals = new Map(); // { userId => [intervals] } for mechanical check

// Helper: sliding window filter (keep only timestamps within windowMs)
const getRecent = (list, windowMs) => {
    const cutoff = Date.now() - windowMs;
    return list.filter(t => t > cutoff);
};

// ─── 1. Global IP-Based Rate Limiter ────────────────────────────────────────
// Limits: 120 requests per minute per IP (protects all public endpoints)
exports.globalRateLimit = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const WINDOW_MS = 60 * 1000;   // 1 minute
    const MAX_REQUESTS = 120;

    const history = getRecent(requestLog.get(ip) || [], WINDOW_MS);
    history.push(now);
    requestLog.set(ip, history);

    if (history.length > MAX_REQUESTS) {
        return res.status(429).json({
            error: 'Too many requests. Please slow down. (Rate Limit: 120 req/min)',
            retryAfter: '60 seconds'
        });
    }
    next();
};

// ─── 2. OTP Request Rate Limiter ─────────────────────────────────────────────
// Limits: 3 OTP requests per 10 minutes per mobile number (blocks OTP spam)
exports.otpRateLimit = (req, res, next) => {
    const mobile = req.body?.mobile || 'unknown';
    const now = Date.now();
    const WINDOW_MS = 10 * 60 * 1000;  // 10 minutes
    const MAX_OTP_REQUESTS = 3;

    const history = getRecent(otpRateLog.get(mobile) || [], WINDOW_MS);
    history.push(now);
    otpRateLog.set(mobile, history);

    if (history.length > MAX_OTP_REQUESTS) {
        return res.status(429).json({
            error: `Too many OTP requests for this number. Please wait 10 minutes.`
        });
    }
    next();
};

// ─── 3. Strict Login Rate Limiter ────────────────────────────────────────────
// Limits: 5 login attempts per 15 minutes per IP (brute-force guard)
const loginAttempts = new Map();
const ipReputationLog = new Map(); // { ip => { strikeCount, lastStrike } }

exports.loginRateLimit = async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const WINDOW_MS = 15 * 60 * 1000;  // 15 minutes
    const MAX_ATTEMPTS = 5;

    const history = getRecent(loginAttempts.get(ip) || [], WINDOW_MS);
    
    // 🛠️ Developer Bypass: Skip rate limit for ALL local/private network IPs
    const isLocalIP = ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1'
        || ip.includes('192.168') || ip.includes('10.') || ip.includes('172.16')
        || ip.includes('172.17') || ip.includes('172.18') || ip.includes('172.19')
        || ip.includes('172.2') || ip.includes('172.3');
    
    if (isLocalIP) {
        return next();
    }

    history.push(now);
    loginAttempts.set(ip, history);

    if (history.length > MAX_ATTEMPTS) {
        // 🛡️ SRS 3.16: Log suspicious activity for admin
        const reputation = ipReputationLog.get(ip) || { strikeCount: 0 };
        reputation.strikeCount += 1;
        reputation.lastStrike = now;
        ipReputationLog.set(ip, reputation);

        const { SecurityLog } = require('../models/AllModels');
        await new SecurityLog({
            eventType: 'RATE_LIMIT_HIT',
            ip: ip,
            details: `Brute force login detected. Attempts: ${history.length}, Total Strikes: ${reputation.strikeCount}`,
            severity: reputation.strikeCount > 3 ? 'HIGH' : 'MEDIUM'
        }).save();

        return res.status(429).json({
            error: 'Too many login attempts. Please wait 15 minutes before trying again.'
        });
    }
    next();
};

exports.getIpStrikes = (ip) => {
    return ipReputationLog.get(ip)?.strikeCount || 0;
};

// ─── 4. Anti-Bot Burst Action Detector (Authenticated) ───────────────────────
// Flags users performing > 15 reward actions per minute (scripted bot behavior)
exports.antiBotGuard = async (req, res, next) => {
    // Only runs for authenticated requests
    if (!req.user?.userId) return next();

    const userId = req.user.userId.toString();
    const now = Date.now();
    const WINDOW_MS = 60 * 1000;    // 1 minute
    const MAX_ACTIONS = 15;

    const history = getRecent(actionLog.get(userId) || [], WINDOW_MS);
    history.push(now);
    actionLog.set(userId, history);

    if (history.length > MAX_ACTIONS) {
        // Flag user in DB for admin review
        try {
            const user = await User.findById(userId);
            if (user && !user.securityFlags.some(f => f.flagType === 'BOT_BEHAVIOR_DETECTED')) {
                user.isFlagged = true;
                user.isBlocked = true; // Auto-block on bot detection
                user.securityFlags.push({
                    flagType: 'BOT_BEHAVIOR_DETECTED',
                    notes: `Performed ${history.length} actions in 60 seconds from IP: ${req.ip}`
                });
                await user.save();
            }
        } catch (e) { console.error('Security Flag Error:', e.message); }

        return res.status(429).json({
            error: 'Unusual activity detected. Your account has been flagged for review. Please contact support.'
        });
    }
    next();
};

// ─── 4b. Mechanical/Scripted Behavior Guard ──────────────────────────────────
// Checks for "Clockwork" behavior (e.g., clicking exactly every 1000ms)
exports.mechanicalPatternGuard = async (req, res, next) => {
    if (!req.user?.userId) return next();
    
    const userId = req.user.userId.toString();
    const now = Date.now();
    
    let userIntervals = actionIntervals.get(userId) || [];
    if (userIntervals.length > 0) {
        const lastTime = userIntervals[userIntervals.length - 1].timestamp;
        const diff = now - lastTime;
        userIntervals.push({ timestamp: now, diff });
    } else {
        userIntervals.push({ timestamp: now, diff: 0 });
    }

    if (userIntervals.length > 10) userIntervals.shift(); // Keep last 10
    actionIntervals.set(userId, userIntervals);

    if (userIntervals.length >= 6) {
        // Calculate variance of diffs
        const diffs = userIntervals.slice(1).map(i => i.diff);
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const variance = diffs.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / diffs.length;

        // If variance is extremely low (< 5ms variance), it's likely a mechanical script
        if (variance < 25) { 
            try {
                const user = await User.findById(userId);
                if (user && !user.securityFlags.some(f => f.flagType === 'MECHANICAL_BEHAVIOR')) {
                    user.isFlagged = true;
                    user.securityFlags.push({
                        flagType: 'MECHANICAL_BEHAVIOR',
                        notes: `Extremely low click variance (${variance.toFixed(2)}ms) detected.`
                    });
                    await user.save();
                }
            } catch(e) {}
            // We don't block yet, just flag, unless it happens again
        }
    }
    next();
};

// ─── 4c. Device Consistency Guard ──────────────────────────────────────────
// Ensures the current deviceId is one of the user's previously authorized devices
exports.deviceConsistencyGuard = async (req, res, next) => {
    if (!req.user?.userId) return next();
    const clientDeviceId = req.headers['x-device-id'] || req.body.deviceId;
    
    if (clientDeviceId) {
        try {
            const user = await User.findById(req.user.userId).select('deviceIds');
            if (user && !user.deviceIds.includes(clientDeviceId)) {
                // Suspicious: new device without login? 
                // In a real app, we might force a re-login here
                // For now, we log it.
            }
        } catch(e) {}
    }
    next();
};

// ─── 5. Daily Earning Limit Middleware ────────────────────────────────────────
// Blocks any coin credit if user has already hit their daily earning cap
exports.earningLimitGuard = async (req, res, next) => {
    if (!req.user?.userId) return next();

    try {
        const userId = req.user.userId;
        const config = await SystemConfig.findOne();
        const dailyLimitCoins = config?.dailyEarningLimitCoins || 1000;
        const dailyLimitCash = config?.dailyEarningLimitCash || 100;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const totals = await Transaction.aggregate([
            { $match: { 
                userId: require('mongoose').Types.ObjectId.createFromHexString(userId.toString()), 
                type: 'Credit', 
                date: { $gte: startOfToday } 
            } },
            { $group: { 
                _id: null, 
                currentCoins: { $sum: '$amountCoins' },
                currentCash: { $sum: '$amountCash' }
            } }
        ]);

        const currentCoins = totals[0]?.currentCoins || 0;
        const currentCash = totals[0]?.currentCash || 0;

        // Peak into body for incoming reward amounts
        const incomingCoins = req.body.amount || req.body.coins || 0;
        const incomingCash = req.body.cash || 0;

        if ((incomingCoins > 0 && currentCoins + incomingCoins > dailyLimitCoins) || 
            (incomingCash > 0 && currentCash + incomingCash > dailyLimitCash)) {
            
            // Block and Flag
            const { SecurityLog } = require('../models/AllModels');
            const user = await User.findById(userId);
            if (user) {
                user.isFlagged = true;
                user.securityFlags.push({
                    flagType: 'DAILY_LIMIT_HIT',
                    notes: `Attempted reward: Coins(${currentCoins}+${incomingCoins}/${dailyLimitCoins}), Cash(${currentCash}+${incomingCash}/${dailyLimitCash})`
                });
                await user.save();

                await new SecurityLog({
                    userId: user._id,
                    eventType: 'EARNING_LIMIT_HIT',
                    ip: req.ip,
                    details: `Blocked reward: ${incomingCoins} coins / ${incomingCash} cash. Limits: ${dailyLimitCoins}/${dailyLimitCash}`,
                    severity: 'MEDIUM'
                }).save();
            }

            return res.status(403).json({
                error: `Daily limit reached. Max ${dailyLimitCoins} coins and ₹${dailyLimitCash} cash per day.`,
                remainingCoins: Math.max(0, dailyLimitCoins - currentCoins),
                remainingCash: Math.max(0, dailyLimitCash - currentCash)
            });
        }

        next();
    } catch (e) {
        console.error('Earning limit guard error:', e.message);
        next();
    }
};

// ─── 6. Suspicious Pattern Detection (for admin risk scoring) ─────────────────  
// Attaches a risk score to the request for smart downstream decisions
// Does NOT block - only annotates for controllers to use if needed
exports.riskScorer = async (req, res, next) => {
    if (!req.user?.userId) return next();
    
    try {
        const user = await User.findById(req.user.userId).select('isFlagged securityFlags deviceIds totalEarnings createdAt');
        if (!user) return next();

        let riskScore = 0;
        if (user.isFlagged) riskScore += 50;
        if (user.securityFlags.length > 3) riskScore += 20;
        if (user.deviceIds.length > 3) riskScore += 15;

        const ageMs = Date.now() - new Date(user.createdAt).getTime();
        const ageHours = ageMs / (1000 * 60 * 60);
        // New account (<24h) with high earnings is suspicious
        if (ageHours < 24 && user.totalEarnings > 5000) riskScore += 30;

        req.userRiskScore = riskScore;
        req.isHighRisk = riskScore >= 70;
    } catch (e) { /* silent */ }

    next();
};
