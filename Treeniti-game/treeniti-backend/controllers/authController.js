const mongoose = require('mongoose');
const { User, Tree, SecurityLog } = require('../models/AllModels');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createReferralLink, processLoginReferral, processEarningsReferral } = require('../services/referralService');

// Secret for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// --- 🛡️ 3.16 Security: OTP Logic & Rate Limiting ---
const otpStore = new Map(); // Temporary Store for Simulation (Now Securely Hashed)
const { getIpStrikes } = require('../middlewares/securityMiddleware');
const { verifyCaptcha } = require('../services/captchaService');

exports.sendOTP = async (req, res) => {
    try {
        const { mobile, captchaId, userCode } = req.body;
        if (!mobile) return res.status(400).json({ error: "Mobile number required." });

        if (getIpStrikes(req.ip) > 1) {
            if (!verifyCaptcha(captchaId, userCode)) {
                return res.status(403).json({ error: "Suspicious activity detected. Please solve the CAPTCHA." });
            }
        }

        const otp = Math.floor(100000 + Math.random() * 899999).toString();
        
        // 🏁 SRS 4.3: Hashing OTP before storage
        const salt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otp, salt);

        const otpEnv = process.env.OTP_ENVIRONMENT || 'SIMULATION';
        if (otpEnv === 'PRODUCTION') {
             console.log(`[PRODUCTION SMS] OTP Sent to ${mobile}`); // LOG NO SENSITIVE DATA
        } else {
             console.log(`[SIMULATION] OTP for ${mobile}: ${otp}`); // Only for Dev
        }

        otpStore.set(mobile, { otp: hashedOtp, expires: Date.now() + 300000 });

        await new SecurityLog({
            eventType: 'OTP_SENT',
            ip: req.ip,
            details: `OTP requested for ${mobile}`
        }).save();

        res.json({ success: true, message: "OTP sent successfully (Simulated)." });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.login = async (req, res) => {
    try {
        const { mobile, otp, name, refCode, deviceId, captchaId, userCode } = req.body;
        if (!mobile || !otp) return res.status(400).json({ error: "Mobile and OTP are required." });

        // 🛡️ FULL DEMO MODE BYPASS (SRS 5)
        // If developer master code is used, bypass all security checks (Strikes, Captcha, Hashing)
        if (otp === '123456') {
            console.log(`[SECURITY] Demo Master OTP bypass used for ${mobile}`);
            otpStore.delete(mobile);
        } else {
            // Standard Security Flow (Disabled Strikes for Demo ease)
            const stored = otpStore.get(mobile);
            if (!stored || stored.expires < Date.now()) {
                return res.status(400).json({ error: "OTP expired or not found. Please click 'Send OTP' again." });
            }

            const isMatch = await bcrypt.compare(otp, stored.otp);
            if (!isMatch) {
                await new SecurityLog({
                    eventType: 'OTP_FAILED',
                    ip: req.ip,
                    details: `Failed OTP attempt for ${mobile}`
                }).save();
                return res.status(400).json({ error: "Invalid OTP. Try 123456 for demo." });
            }
            otpStore.delete(mobile); 
        }

        // Fetch limits
        const { SystemConfig } = require('../models/AllModels');
        const config = await SystemConfig.findOne();
        const maxAccountsPerDevice = config?.maxAccountsPerDevice || 2; 

        if (deviceId) {
             const devicesCount = await User.countDocuments({ deviceIds: deviceId, mobile: { $ne: mobile } });
             if (devicesCount >= maxAccountsPerDevice) {
                  await new SecurityLog({
                      eventType: 'DEVICE_LIMIT_HIT',
                      ip: req.ip,
                      deviceId: deviceId,
                      details: `Device limit (${maxAccountsPerDevice}) hit for ${mobile}`
                  }).save();
                  return res.status(403).json({ error: "Security Guard: Max accounts per device reached." });
             }
        }

        let user = await User.findOne({ mobile });

        if (!user) {
            // New Registration
            const myRefCode = "TRN" + Math.floor(1000 + Math.random() * 9000);
            user = new User({ 
                mobile, 
                name: name || 'New User', 
                referralCode: myRefCode, 
                referredBy: refCode || null 
            });
            await user.save();
            
            // Give normal default tree
            const newTree = new Tree({ userId: user._id, treeName: "Default Tree" });
            await newTree.save();

            // Create Referral Connection if code exists
            await createReferralLink(user._id, refCode);
        } else {
            // Update name if provided and current name is 'New User' or generic
            if (name && (user.name === 'New User' || !user.name)) {
                user.name = name;
                await user.save();
            }
        }

        // LAUNCH SECURITY: Fraud and Blacklist Enforcer
        if (user.isBlocked) {
             return res.status(403).json({ error: "Your account has been suspended by an Administrator." });
        }

        if (deviceId && !user.deviceIds.includes(deviceId)) {
             user.deviceIds.push(deviceId);
             await user.save();
        }

        // Process Daily Active Tracking for Referrals
        await processLoginReferral(user._id);

        // 🔥 SRS 3.11 Level 3: Daily Streak System
        if (user.streakUnlocked) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastStreakDate = user.lastStreakDate ? new Date(user.lastStreakDate) : null;
            const lastStreakDay = lastStreakDate ? new Date(lastStreakDate.getFullYear(), lastStreakDate.getMonth(), lastStreakDate.getDate()) : null;

            if (!lastStreakDay) {
                user.currentStreak = 1;
                user.lastStreakDate = now;
            } else {
                const diffTime = today.getTime() - lastStreakDay.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    // Consecutive Day
                    user.currentStreak += 1;
                    user.lastStreakDate = now;

                    // Streak Bonus Logic (e.g., Every 3 days get 20 coins)
                    if (user.currentStreak % 3 === 0) {
                        const bonus = 20;
                        user.walletCoins += bonus;
                        user.totalEarnings += bonus;
                        const { Transaction } = require('../models/AllModels');
                        await new Transaction({
                            userId: user._id, type: 'Credit', source: 'Daily Login',
                            amountCoins: bonus, notes: `${user.currentStreak} Day Streak Bonus!`
                        }).save();
                        // Trigger Referral if needed (handled by processEarningsReferral)
                        await processEarningsReferral(user._id, bonus, 'Daily Login');
                    }
                } else if (diffDays > 1) {
                    // Streak Broken
                    user.currentStreak = 1;
                    user.lastStreakDate = now;
                }
                // If diffDays is 0, they already logged in today, streak stays the same.
            }
            await user.save();
        }

        // 🌳 SRS 3.3.1: Ensure at least one default tree exists for every user
        const Tree = mongoose.model('Tree');
        const existingTrees = await Tree.countDocuments({ userId: user._id });
        if (existingTrees === 0) {
            await new Tree({ 
                userId: user._id, 
                treeName: 'My First Seed',
                growth: 0,
                level: 'Seed'
            }).save();
        }

        // Generate Token
        const token = jwt.sign({ userId: user._id, role: user.role, kyc: user.isKycVerified }, JWT_SECRET, { expiresIn: '7d' });

        // 🛡️ Log Login Success
        await new SecurityLog({
            userId: user._id,
            eventType: 'LOGIN_SUCCESS',
            ip: req.ip,
            deviceId: deviceId,
            details: `User ${user.name} logged in successfully`
        }).save();

        res.json({ success: true, user, token });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

exports.register = async (req, res) => {
    try {
        const { mobile, otp, loginPassword, fundPassword, refCode, deviceId } = req.body;
        
        if (!mobile || !otp || !loginPassword) {
            return res.status(400).json({ error: "All fields are required for registration." });
        }

        // Default fund password to login password if not provided
        const effectiveFundPass = fundPassword || loginPassword;

        // 🛡️ MASTER OTP BYPASS (123456)
        if (otp !== '123456') {
             // Standard OTP check
             const stored = otpStore.get(mobile);
             if (!stored || stored.expires < Date.now()) {
                 return res.status(400).json({ error: "OTP expired or not found. Use 123456 for demo." });
             }
             const isMatch = await bcrypt.compare(otp, stored.otp);
             if (!isMatch) return res.status(400).json({ error: "Invalid OTP. Use 123456 for demo." });
        }
        
        otpStore.delete(mobile);

        // Security: Check if user already exists
        let existingUser = await User.findOne({ mobile });
        if (existingUser) return res.status(400).json({ error: "User already registered. Please Login." });

        // Password Hashing
        const salt = await bcrypt.genSalt(10);
        const hashedLoginPass = await bcrypt.hash(loginPassword, salt);
        const hashedFundPass = await bcrypt.hash(effectiveFundPass, salt);

        // Create User
        const myRefCode = "TRN" + Math.floor(1000 + Math.random() * 9000);
        const newUser = new User({
            mobile,
            loginPassword: hashedLoginPass,
            fundPassword: hashedFundPass,
            referralCode: myRefCode,
            referredBy: refCode || null,
            name: 'Grower ' + mobile.slice(-4)
        });

        if (deviceId) newUser.deviceIds.push(deviceId);
        await newUser.save();

        // 🌳 Default Tree for new user
        const newTree = new Tree({ userId: newUser._id, treeName: "My First Seed" });
        await newTree.save();

        // Referral logic
        await createReferralLink(newUser._id, refCode);

        // Success Audit
        await new SecurityLog({
            userId: newUser._id,
            eventType: 'LOGIN_SUCCESS',
            ip: req.ip,
            details: `User registered via mobile OTP`
        }).save();

        // Auto-login after registration
        const token = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, message: "Registration successful!", user: newUser, token });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-__v');
        if (!user) return res.status(404).json({ error: "User not found" });

        // 🔥 Daily Streak & Counter Auto-Reset Logic
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastStreakDate = user.lastStreakDate ? new Date(user.lastStreakDate) : null;
        const lastStreakDay = lastStreakDate ? new Date(lastStreakDate.getFullYear(), lastStreakDate.getMonth(), lastStreakDate.getDate()) : null;

        let isUpdated = false;

        // Reset Daily Mission Counters
        if (user.lastLoginDate && new Date(user.lastLoginDate).toDateString() !== now.toDateString()) {
             user.dailyWaterCount = 0;
             user.lastLoginDate = now;
             isUpdated = true;
        } else if (!user.lastLoginDate) {
             user.lastLoginDate = now;
             isUpdated = true;
        }

        // Continuous Streak Tracking
        if (!lastStreakDay) {
            user.currentStreak = 1;
            user.lastStreakDate = now;
            isUpdated = true;
        } else {
            const diffTime = today.getTime() - lastStreakDay.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                user.currentStreak += 1;
                user.lastStreakDate = now;
                isUpdated = true;
            } else if (diffDays > 1) {
                user.currentStreak = 1; // Broken streak, reset
                user.lastStreakDate = now;
                isUpdated = true;
            }
        }

        if (isUpdated) {
             await user.save();
        }

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, language, avatar } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        if (name) user.name = name;
        if (language) user.language = language;
        if (avatar) user.avatar = avatar;

        await user.save();
        res.json({ success: true, message: "Profile updated successfully", user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No image provided" });
        
        const user = await User.findById(req.user.userId);
        user.avatar = req.file.path; // Cloudinary URL
        await user.save();

        res.json({ success: true, avatarUrl: user.avatar });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 💰 SRS 3.6.2: Reward Sources
exports.getDailyMissions = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const today = new Date().toDateString();

        // 1. Daily Login Mission
        const isDailyClaimed = user.lastLoginRewardDate && user.lastLoginRewardDate.toDateString() === today;

        // 2. Water Tree 2 Times Mission
        const isWateringDone = user.dailyWaterCount >= 2;

        // 3. Spin Wheel Mission (Use 4 spins)
        const isSpinDone = user.dailySpinCount >= 4 && user.lastSpinAt && user.lastSpinAt.toDateString() === today;

        // 4. Social Mission Status
        const socialClaimedCount = user.claimedSocials ? user.claimedSocials.length : 0;

        res.json({
            success: true,
            missions: [
                { id: 'DAILY_LOGIN', title: 'Daily Attendance', completed: isDailyClaimed, reward: 10 },
                { id: 'WATER_TREE', title: 'Water Tree (2 Times)', completed: isWateringDone, reward: 20, current: user.dailyWaterCount, target: 2 },
                { id: 'SPIN_WHEEL', title: 'Lucky Spin (4 Times)', completed: isSpinDone, reward: 20, current: user.dailySpinCount, target: 4 },
                { id: 'READ_ARTICLE', title: 'Read Climate News', completed: user.readArticles.length >= 1, reward: 10 }
            ]
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.claimDailyBonus = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const today = new Date().toDateString();

        if (user.lastLoginRewardDate && user.lastLoginRewardDate.toDateString() === today) {
            return res.status(403).json({ error: "Daily reward already claimed today!" });
        }

        const { Transaction, SystemConfig } = require('../models/AllModels');
        let config = await SystemConfig.findOne();
        const reward = config ? config.loginReward : 10;

        user.walletCoins += reward;
        user.totalEarnings += reward;
        user.lastLoginRewardDate = new Date();
        await user.save();

        await new Transaction({
            userId: user._id, type: 'Credit', source: 'Daily Login',
            amountCoins: reward, notes: 'Daily engagement bonus'
        }).save();

        // Trigger Referral Progression
        await processLoginReferral(user._id); // Daily login is a login event
        await processEarningsReferral(user._id, reward, 'Daily Login');

        res.json({ success: true, message: `Congrats! You received ${reward} coins.`, walletCoins: user.walletCoins });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.claim3HourBonus = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const now = Date.now();
        const hourDiff = user.last3HourRewardAt ? (now - new Date(user.last3HourRewardAt).getTime()) / 3600000 : 999;

        if (hourDiff < 3) {
            return res.status(403).json({ error: `Not ready yet. Please wait ${Math.ceil(3 - hourDiff)} hours.` });
        }

        if (user.daily3HourCount >= 5) {
             return res.status(403).json({ error: "Daily limit for 3-hour bonus reached (max 5/day)." });
        }

        const { Transaction, SystemConfig } = require('../models/AllModels');
        let config = await SystemConfig.findOne();
        const reward = config?.threeHourReward || 15;

        user.walletCoins += reward;
        user.totalEarnings += reward;
        user.last3HourRewardAt = new Date();
        user.daily3HourCount += 1;
        await user.save();

        await new Transaction({
            userId: user._id, type: 'Credit', source: '3-Hour Bonus',
            amountCoins: reward, notes: `Periodic check-in #${user.daily3HourCount}`
        }).save();

        await processEarningsReferral(user._id, reward, '3-Hour Bonus');

        res.json({ success: true, message: `${reward} coins rewarded! Come back in 3 hours.`, walletCoins: user.walletCoins });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.spinWheel = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const today = new Date().toDateString();

        // Daily Limit Check
        if (user.lastSpinAt && user.lastSpinAt.toDateString() === today && user.dailySpinCount >= 4) {
             return res.status(403).json({ error: "Daily limit of 4 spins reached. Try again tomorrow!" });
        }

        const { Transaction, SystemConfig } = require('../models/AllModels');
        const config = await SystemConfig.findOne();
        const maxReward = config ? config.spinRewardMax : 50;

        // Randomized Outcome Logic
        const outcomes = [0, 5, 10, 15, 20, 25, 50, 100]; // 100 is Jackpot
        const winIndex = Math.floor(Math.random() * outcomes.length);
        const wonCoins = outcomes[winIndex];

        // Ensure we don't exceed max reward unless jackpot hit (50 is usually max)
        const finalReward = Math.min(wonCoins, maxReward === 50 ? 100 : maxReward);

        user.walletCoins += finalReward;
        user.totalEarnings += finalReward;
        user.dailySpinCount = (user.lastSpinAt && user.lastSpinAt.toDateString() === today) ? user.dailySpinCount + 1 : 1;
        user.lastSpinAt = new Date();
        await user.save();

        if (finalReward > 0) {
            await new Transaction({
                userId: user._id, type: 'Credit', source: 'Spin Wheel',
                amountCoins: finalReward, notes: `Spin #${user.dailySpinCount} Result`
            }).save();
            await processEarningsReferral(user._id, finalReward, 'Spin Wheel');
        }

        res.json({ success: true, wonCoins: finalReward, message: finalReward > 0 ? `Jackpot! You won ${finalReward} coins!` : "Better luck next time!", walletCoins: user.walletCoins });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.claimWeeklyLoot = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const now = Date.now();
        
        // 🏁 SRS 3.11: Weekly Cooldown (7 Days = 604,800,000ms)
        const ONE_WEEK = 604800000;
        const lastLoot = user.lastWeeklyLootAt ? new Date(user.lastWeeklyLootAt).getTime() : 0;
        const diff = now - lastLoot;

        if (diff < ONE_WEEK) {
            const remaining = ONE_WEEK - diff;
            const days = Math.floor(remaining / 86400000);
            const hours = Math.floor((remaining % 86400000) / 3600000);
            return res.status(403).json({ error: `Weekly Loot is charging! Please wait ${days} days and ${hours} hours.` });
        }

        const { Transaction, SystemConfig } = require('../models/AllModels');
        let config = await SystemConfig.findOne();
        
        // Premium Randomized Reward (e.g. 200 - 1000 Coins)
        const reward = Math.floor(Math.random() * 801) + 200;

        user.walletCoins += reward;
        user.totalEarnings += reward;
        user.lastWeeklyLootAt = new Date();
        await user.save();

        await new Transaction({
            userId: user._id, type: 'Credit', source: 'Weekly Loot',
            amountCoins: reward, notes: 'Big weekly chest opening!'
        }).save();

        await processEarningsReferral(user._id, reward, 'Weekly Loot');

        // Log to Activity Board
        const { Activity } = require('../models/AllModels');
        await new Activity({
            userId: user._id, userName: user.name, type: 'COIN_EARNED',
            text: `ने Weekly Loot से ${reward} Coins जीतें!`, icon: '🎁'
        }).save();

        res.json({ success: true, reward, message: `Hooray! You found ${reward} coins inside the chest!`, walletCoins: user.walletCoins });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
