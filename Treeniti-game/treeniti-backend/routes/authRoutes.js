const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const socialController = require('../controllers/socialController');
const authMiddleware = require('../middlewares/authMiddleware');

// 🛡️ SRS 3.16 Security Middlewares
const { otpRateLimit, loginRateLimit, antiBotGuard, earningLimitGuard } = require('../middlewares/securityMiddleware');

const { uploadCloud } = require('../config/cloudinary');

// --- Public Auth (Rate-Limited) ---
router.post('/send-otp', otpRateLimit, authController.sendOTP);
router.post('/login', loginRateLimit, authController.login);
router.post('/register', loginRateLimit, authController.register);

// --- Protected Profile ---
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/profile/avatar', authMiddleware, (req,res,next)=>{console.log("Avatar Upload Request Received from:", req.user.userId); next();}, uploadCloud.single('avatar'), authController.updateAvatar);

router.get('/config/public', authMiddleware, async (req, res) => {
    try {
        const { SystemConfig } = require('../models/AllModels');
        let config = await SystemConfig.findOne();
        if(!config) config = await new SystemConfig().save();
        
        // Return sanitized config (exclude sensitive/internal admin fields)
        res.json({ 
            success: true, 
            config: { 
                conversionRate: config.conversionRate, 
                loginReward: config.loginReward,
                spinRewardMax: config.spinRewardMax,
                dailyEarningLimitCoins: config.dailyEarningLimitCoins,
                dailyEarningLimitCash: config.dailyEarningLimitCash,
                referralUnlockThreshold: config.referralUnlockThreshold,
                minWithdrawalRupees: config.minWithdrawalRupees,
                referralL1Commission: config.referralL1Commission,
                referralL2Commission: config.referralL2Commission,
                socialRewards: config.socialRewards,
                appVersioning: config.appVersioning,
                adsConfig: config.adsConfig,
                rewardedVideoLink: config.rewardedVideoLink,
                rewardWaitTimeSec: config.rewardWaitTimeSec,
                socialLinks: config.socialLinks,
                socialRewards: config.socialRewards
            } 
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- Reward Routes (Anti-Bot + Earning Limit Guard) ---
router.get('/missions', authMiddleware, authController.getDailyMissions);
router.post('/rewards/daily', authMiddleware, antiBotGuard, earningLimitGuard, authController.claimDailyBonus);
router.post('/rewards/3hour', authMiddleware, antiBotGuard, earningLimitGuard, authController.claim3HourBonus);
router.post('/rewards/social', authMiddleware, antiBotGuard, earningLimitGuard, socialController.claimSocialReward);
router.post('/rewards/spin', authMiddleware, antiBotGuard, earningLimitGuard, authController.spinWheel);
router.post('/rewards/weekly', authMiddleware, antiBotGuard, earningLimitGuard, authController.claimWeeklyLoot);

// --- Account Deletion ---
router.post('/request-deletion', authMiddleware, authController.requestAccountDeletion);

// --- Admin Only Routes ---
const adminMiddleware = require('../middlewares/adminMiddleware');
router.get('/admin/deletion-requests', authMiddleware, adminMiddleware, authController.getDeletionRequests);
router.post('/admin/process-deletion', authMiddleware, adminMiddleware, authController.processDeletionRequest);

module.exports = router;
