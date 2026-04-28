const mongoose = require('mongoose');
const { Article, User, Transaction } = require('../models/AllModels');

// --- User Facing ---
exports.getActiveArticles = async (req, res) => {
    try {
        const articles = await Article.find({ isActive: true }).select('-__v');
        res.json({ success: true, articles });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.trackArticleReading = async (req, res) => {
    try {
        const { articleId, timeSpentSec } = req.body;
        const article = await Article.findById(articleId);
        
        if (!article || !article.isActive) {
            return res.status(404).json({ error: "Article unavailable." });
        }

        // LAUNCH SECURITY: Prevent farming the same article infinitely
        const user = await User.findById(req.user.userId);
        if (user.readArticles && user.readArticles.includes(articleId)) {
             return res.status(403).json({ error: "Reward already claimed for this article." });
        }

        // LAUNCH SECURITY: Enforce Daily Reward Limit for Articles (SRS 3.9)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const dailyArticleEarnings = await Transaction.aggregate([
            { $match: { userId: user._id, source: 'Article', createdAt: { $gte: startOfDay } } },
            { $group: { _id: null, total: { $sum: '$amountCoins' } } }
        ]);

        const earningsToday = dailyArticleEarnings.length > 0 ? dailyArticleEarnings[0].total : 0;
        const dailyLimit = 100; // Configurable: Max 100 coins from articles per day

        if (earningsToday + article.readingRewardCoins > dailyLimit) {
            return res.status(403).json({ error: `Daily limit reached! You can earn a maximum of ${dailyLimit} coins from articles per day.` });
        }

        // LAUNCH SECURITY: Validating Timer Metric
        if (timeSpentSec >= article.requiredReadingTimeSec) {
            user.walletCoins += article.readingRewardCoins;
            user.totalEarnings += article.readingRewardCoins;
            user.readArticles.push(articleId); // Lock out future attempts
            await user.save();

            await new Transaction({
                userId: user._id, type: 'Credit', source: 'Article',
                amountCoins: article.readingRewardCoins, notes: `Finished Reading: ${article.title}`
            }).save();

            const { processEarningsReferral } = require('../services/referralService');
            await processEarningsReferral(user._id, article.readingRewardCoins, 'Article');

            return res.json({ success: true, message: `Knowledge is power! Earned ${article.readingRewardCoins} coins!`, walletCoins: user.walletCoins });
        } else {
            return res.status(400).json({ error: `You must read for at least ${article.requiredReadingTimeSec} seconds to earn rewards.` });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Admin Facing ---
exports.createArticle = async (req, res) => {
    try {
        const article = new Article(req.body);
        await article.save();
        res.json({ success: true, article });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const article = await Article.findByIdAndUpdate(id, req.body, { new: true });
        res.json({ success: true, article });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteArticle = async (req, res) => {
    try {
        const { id } = req.params;
        await Article.findByIdAndDelete(id);
        res.json({ success: true, message: "Article Deleted." });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
