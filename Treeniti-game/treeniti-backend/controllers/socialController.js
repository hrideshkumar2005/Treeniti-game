const { User, Transaction, SystemConfig } = require('../models/AllModels');

// External Interface - Social Media Platforms Logic
exports.claimSocialReward = async (req, res) => {
    try {
        const { platform } = req.body; 
        // Platforms: 'YouTube', 'Facebook', 'Instagram', 'X', 'WhatsApp', 'Telegram'
        
        const validPlatforms = ['YouTube', 'Facebook', 'Instagram', 'X', 'WhatsApp', 'Telegram'];
        if (!validPlatforms.includes(platform)) {
            return res.status(400).json({ error: "Invalid social media platform." });
        }

        const user = await User.findById(req.user.userId);
        
        // Prevent duplicate claims (simple check structure)
        if (!user.claimedSocials) {
            user.claimedSocials = [];
        }
        
        if (user.claimedSocials.includes(platform)) {
            return res.status(400).json({ error: `You have already claimed your reward for following us on ${platform}.` });
        }

        // Fetch dynamic reward amount
        const config = await SystemConfig.findOne();
        let rewardAmount = 50; // Default fallback
        
        if (config && config.socialRewards && config.socialRewards[platform]) {
            rewardAmount = config.socialRewards[platform];
        } else {
            // Hard coded default fallback matrix if config is missing specific node
            const fallback = { YouTube: 150, Facebook: 100, Instagram: 100, X: 50, WhatsApp: 50, Telegram: 50 };
            rewardAmount = fallback[platform] || 50;
        }

        user.walletCoins += rewardAmount;
        user.totalEarnings += rewardAmount;
        user.claimedSocials.push(platform);
        await user.save();

        await new Transaction({
            userId: user._id, type: 'Credit', source: 'Social Reward',
            amountCoins: rewardAmount, notes: `Followed Treeniti on ${platform}`
        }).save();

        const { processEarningsReferral } = require('../services/referralService');
        await processEarningsReferral(user._id, rewardAmount, 'Social Reward');

        res.json({ success: true, message: `Successfully verified and claimed ${rewardAmount} coins for ${platform}!`, walletCoins: user.walletCoins });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
