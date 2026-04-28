const mongoose = require('mongoose');
const { User, Transaction, Withdrawal, SystemConfig } = require('../models/AllModels');
const { processEarningsReferral } = require('../services/referralService');

exports.getWallet = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Retrieve specifically requested sections as per 3.13
        const withdrawals = await Withdrawal.find({ userId: user._id }).sort('-requestDate');
        const transactions = await Transaction.find({ userId: user._id }).sort('-date').limit(30);
        
        // --- Referral Analytics (SRS 3.10) ---
        const { Referral } = require('../models/AllModels');
        const referrals = await Referral.find({ referrerId: user._id })
            .populate('referredUserId', 'name mobile createdAt totalEarnings');
        
        // Summary stats for frontend dashboard
        const referralStats = {
            totalReferred: referrals.length,
            unlockedCount: referrals.filter(r => r.isUnlocked).length,
            loginRewardsPaid: referrals.filter(r => r.loginRewardPaid).length,
            day3RewardsPaid: referrals.filter(r => r.day3RewardPaid).length,
            day7RewardsPaid: referrals.filter(r => r.day7RewardPaid).length,
        };

        res.json({ 
            success: true, 
            wallet: {
                referralAmount: user.referralEarnings,
                earnings: user.walletCash,
                pendingRewards: user.pendingRewards,
                withdrawalHistory: withdrawals,
                referrals: referrals, // Detailed list
                referralStats: referralStats // Analytics summary
            },
            totalCoins: user.walletCoins,
            recentTransactions: transactions 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.earnCoins = async (req, res) => {
    try {
        const { amount, source, notes } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // 🛡️ SRS 3.16 Security: Daily Earning Limit Check
        const config = await SystemConfig.findOne();
        const dailyLimit = config ? config.dailyEarningLimitCoins : 1000;

        const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
        const todayTransactions = await Transaction.find({ 
            userId: user._id, 
            type: 'Credit', 
            date: { $gte: startOfToday } 
        });
        const currentTotal = todayTransactions.reduce((acc, tx) => acc + tx.amountCoins, 0);

        if (currentTotal + amount > dailyLimit) {
             // LOG SENSITIVE EVENT
             if (!user.isFlagged) {
                 user.isFlagged = true;
                 user.securityFlags.push({ flagType: 'EARNING_LIMIT_REACHED', notes: `Attempted to earn ${amount} via ${source} but limit is ${dailyLimit}` });
                 await user.save();
             }
             return res.status(403).json({ error: `Daily earning limit reached (Max ${dailyLimit} coins/day). Please try again tomorrow!` });
        }

        user.walletCoins += amount;
        user.totalEarnings += amount; // Track total earnings for referral unlock limits
        await user.save();

        // Log transaction
        const tx = new Transaction({
            userId: user._id,
            type: 'Credit',
            source: source || 'Daily Login',
            amountCoins: amount,
            notes: notes || 'Coins Earned'
        });
        await tx.save();

        // Handling Multi-level Referral Commission & Unlock Triggers
        await processEarningsReferral(user._id, amount, source || 'Direct Credit');

        res.json({ success: true, walletCoins: user.walletCoins });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🎁 High Level Feature: Daily Login Rewards Claim
exports.claimDailyLogin = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // LAUNCH SECURITY: 24 Hour Constraint Checker
        if (user.lastLoginRewardDate) {
            const today = new Date();
            const lastClaim = new Date(user.lastLoginRewardDate);
            // If they claimed today, reject
            if (today.toDateString() === lastClaim.toDateString()) {
                return res.status(429).json({ error: "You have already claimed your daily reward today. Come back tomorrow!" });
            }
        }

        // Fetch dynamic rate from Super Admin config
        const config = await SystemConfig.findOne();
        const dailyReward = config ? config.loginReward : 10; // Market standard 10 coins fallback

        user.walletCoins += dailyReward;
        user.totalEarnings += dailyReward;
        user.lastLoginRewardDate = Date.now();
        await user.save();

        await new Transaction({
            userId: user._id, type: 'Credit', source: 'Daily Login',
            amountCoins: dailyReward, notes: 'Daily retention reward'
        }).save();

        const { processLoginReferral } = require('../services/referralService');
        await processLoginReferral(user._id);
        await processEarningsReferral(user._id, dailyReward, 'Daily Login');

        res.json({ success: true, message: `Successfully claimed ${dailyReward} Daily Login coins!`, walletCoins: user.walletCoins });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount, paymentMethodDetails, captchaId, userCode } = req.body; 
        const upiId = req.body.upiId || paymentMethodDetails;
        
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // 🛡️ SRS 3.16 Security: Extra challenge for High Risk accounts
        if (req.isHighRisk) {
            const { verifyCaptcha } = require('../services/captchaService');
            if (!verifyCaptcha(captchaId, userCode)) {
                return res.status(403).json({ error: "High security risk detected. Please solve the CAPTCHA to continue." });
            }
        }

        const { SystemConfig } = require('../models/AllModels');
        const config = await SystemConfig.findOne();
        const minimumWithdrawal = config ? config.minWithdrawalRupees : 10;

        if (amount < minimumWithdrawal) return res.status(400).json({ error: `Minimum withdrawal amount is ₹${minimumWithdrawal}.` });
        if (user.walletCash < amount) return res.status(400).json({ error: "Insufficient wallet balance." });

        user.walletCash -= amount;
        await user.save();

        const { processPayout } = require('../services/paymentService');
        const payoutResult = await processPayout({ amount, upiId });

        const withdrawal = new Withdrawal({
            userId: user._id,
            amount,
            upiId,
            status: payoutResult.status === 'SUCCESS' ? 'Approved' : 'Pending',
            transactionId: payoutResult.transactionId || null,
            processDate: payoutResult.status === 'SUCCESS' ? new Date() : null
        });
        await withdrawal.save();

        const txStatus = withdrawal.status;
        const tx = new Transaction({
            userId: user._id,
            type: 'Debit',
            source: 'Withdrawal',
            amountCash: amount,
            notes: `Withdrawal request to ${upiId} (${txStatus})`
        });
        await tx.save();

        // SRS 3.17 Logging for Notice Board (Social Proof)
        const { Activity } = require('../models/AllModels');
        await new Activity({
            userId: user._id,
            userName: user.name,
            type: 'WITHDRAWAL',
            text: `withdrew ₹${amount} successfully!`,
            icon: ['💰', '💸', '💎'][Math.floor(Math.random() * 3)]
        }).save();

        res.json({ 
            success: true, 
            message: withdrawal.status === 'Approved' ? "Payout processed successfully via UPI!" : "Withdrawal successfully registered onto the Admin Queue for processing.", 
            withdrawal 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🏦 Currency Conversion Architecture: Coins -> Real Cash (Rupees)
exports.convertCoins = async (req, res) => {
    try {
        const { coinsToConvert } = req.body;
        const parsedCoins = parseInt(coinsToConvert);
        if (isNaN(parsedCoins) || parsedCoins <= 0) {
             return res.status(400).json({ error: "Invalid coin amount." });
        }

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        if (user.walletCoins < parsedCoins) {
             return res.status(400).json({ error: "Insufficient Coins in Wallet." });
        }

        // Fetch physical dynamic conversion rate built in SRS 3.18
        const config = await SystemConfig.findOne();
        const conversionRate = config ? config.conversionRate : 100; // 100 Coins = 1 Rupee Default

        // Math checking
        if (parsedCoins < conversionRate) {
             return res.status(400).json({ error: `You need at least ${conversionRate} Coins to execute a conversion (Current Rate: ${conversionRate} Coins = ₹1).` });
        }

        const cashGenerated = Math.floor(parsedCoins / conversionRate);
        const coinsDeducted = cashGenerated * conversionRate;

        // Perform swap
        user.walletCoins -= coinsDeducted;
        user.walletCash += cashGenerated;
        await user.save();

        // Dual Track Triggers
        await new Transaction({
            userId: user._id, type: 'Debit', source: 'Virtual Game Swap',
            amountCoins: coinsDeducted, amountCash: cashGenerated, notes: `Swapped Coins for ₹${cashGenerated}`
        }).save();

        res.json({ success: true, message: `Successfully forged ${coinsDeducted} coins into ₹${cashGenerated} Cash!`, walletCoins: user.walletCoins, walletCash: user.walletCash });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- New: Transaction History for Normal Users (SRS 3.13) ---
exports.getTransactionHistory = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.userId })
            .sort({ date: -1 })
            .limit(20);
        res.json({ success: true, transactions });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 📺 3.15 Ad Rewards Implementation
exports.claimAdReward = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const config = await SystemConfig.findOne();
        const adReward = config ? config.rewardedAdCoins : 15;
        const dailyLimit = config ? config.dailyAdLimit : 10;

        // Count today's ad watches
        const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
        const todayAds = await Transaction.countDocuments({ 
            userId: user._id, 
            source: 'Rewarded Ad', 
            date: { $gte: startOfToday } 
        });

        if (todayAds >= dailyLimit) {
            return res.status(403).json({ error: `Daily limit of ${dailyLimit} ads reached. See you tomorrow!` });
        }

        user.walletCoins += adReward;
        user.totalEarnings += adReward;
        await user.save();

        await new Transaction({
            userId: user._id, type: 'Credit', source: 'Rewarded Ad',
            amountCoins: adReward, notes: `Watched video ad #${todayAds + 1}`
        }).save();

        await processEarningsReferral(user._id, adReward, 'Rewarded Ad');

        res.json({ success: true, message: `Awesome ! ${adReward} coins added to your wallet!`, walletCoins: user.walletCoins });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
