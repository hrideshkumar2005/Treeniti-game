const { User, Referral, Transaction } = require('../models/AllModels');

const COIN_TO_RUPEE_RATIO = 100; // 100 coins = 1 Rupee

exports.createReferralLink = async (newUserId, referralCodeUsed) => {
    if (!referralCodeUsed) return;
    try {
        const referrer = await User.findOne({ referralCode: referralCodeUsed });
        if (referrer) {
            const referral = new Referral({
                referrerId: referrer._id,
                referredUserId: newUserId
            });
            await referral.save();
        }
    } catch (err) {
        console.error("Error creating referral link:", err);
    }
};

exports.processLoginReferral = async (userId) => {
    try {
        const referral = await Referral.findOne({ referredUserId: userId });
        if (!referral) return; // User wasn't referred

        const now = new Date();
        const lastActive = referral.lastActiveDate;
        
        let shouldIncrementDay = false;
        if (!lastActive) {
            shouldIncrementDay = true;
        } else {
            // Check if it's a new calendar day
            const lastDateString = new Date(lastActive).toDateString();
            const nowDateString = now.toDateString();
            if (lastDateString !== nowDateString) {
                shouldIncrementDay = true;
            }
        }

        if (shouldIncrementDay) {
            referral.activeDaysCount += 1;
            referral.lastActiveDate = now;
        }

        // Logic check for unlock threshold (₹21 = 2100 coins)
        const { SystemConfig } = require('../models/AllModels');
        const config = await SystemConfig.findOne();
        const thresholdRupees = config?.referralUnlockThreshold || 21;
        const thresholdCoins = thresholdRupees * COIN_TO_RUPEE_RATIO;

        const user = await User.findById(userId);
        if (user && user.totalEarnings >= thresholdCoins) {
            referral.isUnlocked = true;
        }

        // Process rewards ONLY IF Unlocked
        if (referral.isUnlocked) {
            const referrer = await User.findById(referral.referrerId);
            if (referrer) {
                let rewardsPaid = false;

                // 1. Friend Login Reward (₹5) - Triggered once after unlock
                if (!referral.loginRewardPaid) {
                    referrer.walletCash += 5;
                    referrer.referralEarnings += 5;
                    referral.loginRewardPaid = true;
                    rewardsPaid = true;
                    await new Transaction({ 
                        userId: referrer._id, 
                        type: 'Credit', 
                        source: 'Referral', 
                        amountCash: 5, 
                        notes: 'Friend Login Reward (₹21 Threshold Met)' 
                    }).save();
                }

                // 2. Friend 3 Days Active Reward (₹6)
                if (referral.activeDaysCount >= 3 && !referral.day3RewardPaid) {
                    referrer.walletCash += 6;
                    referrer.referralEarnings += 6;
                    referral.day3RewardPaid = true;
                    rewardsPaid = true;
                    await new Transaction({ 
                        userId: referrer._id, 
                        type: 'Credit', 
                        source: 'Referral', 
                        amountCash: 6, 
                        notes: 'Friend Active for 3 Days' 
                    }).save();
                }

                // 3. Friend 7 Days Active Reward (₹10)
                if (referral.activeDaysCount >= 7 && !referral.day7RewardPaid) {
                    referrer.walletCash += 10;
                    referrer.referralEarnings += 10;
                    referral.day7RewardPaid = true;
                    rewardsPaid = true;
                    await new Transaction({ 
                        userId: referrer._id, 
                        type: 'Credit', 
                        source: 'Referral', 
                        amountCash: 10, 
                        notes: 'Friend Active for 7 Days' 
                    }).save();
                }

                if (rewardsPaid) {
                    await referrer.save();
                }
            }
        }
        await referral.save();
    } catch (err) {
        console.error("Error processing login referral:", err);
    }
};

exports.processEarningsReferral = async (userId, coinsEarned, source) => {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        // 1. Check Unlock progress (₹21 = 2100 coins)
        const referral = await Referral.findOne({ referredUserId: user._id });
        const { SystemConfig } = require('../models/AllModels');
        const config = await SystemConfig.findOne();
        const thresholdRupees = config?.referralUnlockThreshold || 21;
        const thresholdCoins = thresholdRupees * COIN_TO_RUPEE_RATIO;

        if (referral && !referral.isUnlocked) {
            if (user.totalEarnings >= thresholdCoins) {
                referral.isUnlocked = true;
                await referral.save();
                
                // Immediately check if rewards can be paid now that it's unlocked
                const referrer = await User.findById(referral.referrerId);
                if (referrer) {
                    let rewardsPaid = false;
                    
                    if (!referral.loginRewardPaid) {
                        referrer.walletCash += 5;
                        referrer.referralEarnings += 5;
                        referral.loginRewardPaid = true;
                        rewardsPaid = true;
                        await new Transaction({ userId: referrer._id, type: 'Credit', source: 'Referral', amountCash: 5, notes: 'Referral Unlocked (₹5 Reward)' }).save();
                    }
                    
                    if (referral.activeDaysCount >= 3 && !referral.day3RewardPaid) {
                        referrer.walletCash += 6;
                        referrer.referralEarnings += 6;
                        referral.day3RewardPaid = true;
                        rewardsPaid = true;
                        await new Transaction({ userId: referrer._id, type: 'Credit', source: 'Referral', amountCash: 6, notes: 'Day 3 Active Reward (Unlocked)' }).save();
                    }
                    
                    if (referral.activeDaysCount >= 7 && !referral.day7RewardPaid) {
                        referrer.walletCash += 10;
                        referrer.referralEarnings += 10;
                        referral.day7RewardPaid = true;
                        rewardsPaid = true;
                        await new Transaction({ userId: referrer._id, type: 'Credit', source: 'Referral', amountCash: 10, notes: 'Day 7 Active Reward (Unlocked)' }).save();
                    }

                    if (rewardsPaid) {
                        await referrer.save();
                        await referral.save();
                    }
                }
            }
        }

        // 2. Multi-level Commission (SRS 3.10.3)
        if (user.referredBy) {
            const { SystemConfig } = require('../models/AllModels');
            const config = await SystemConfig.findOne();
            
            // Check if source is eligible for lifetime commission
            const eligibleSources = config?.commissionEligibleSources || ['Water Game', 'Article', 'Tree Harvest', 'Shake Tree', 'Spin Wheel', '3-Hour Bonus', 'Daily Login'];
            if (!eligibleSources.includes(source)) return;

            const l1Rate = (config?.referralL1Commission || 5) / 100;
            const l2Rate = (config?.referralL2Commission || 2) / 100;

            const level1Parent = await User.findOne({ referralCode: user.referredBy });
            if (level1Parent) {
                // 5% Commission (Level 1)
                const l1Commission = Math.floor(coinsEarned * l1Rate);
                if (l1Commission > 0) {
                    level1Parent.walletCoins += l1Commission;
                    await level1Parent.save();
                    await new Transaction({ userId: level1Parent._id, type: 'Credit', source: 'Referral', amountCoins: l1Commission, notes: `L1 Commission (5%) from ${user.name} via ${source}` }).save();
                }

                // Check Level 2 Parent (Grandparent)
                if (level1Parent.referredBy) {
                    const level2Parent = await User.findOne({ referralCode: level1Parent.referredBy });
                    if (level2Parent) {
                        // 2% Commission (Level 2)
                        const l2Commission = Math.floor(coinsEarned * l2Rate);
                        if (l2Commission > 0) {
                            level2Parent.walletCoins += l2Commission;
                            await level2Parent.save();
                            await new Transaction({ userId: level2Parent._id, type: 'Credit', source: 'Referral', amountCoins: l2Commission, notes: `L2 Commission (2%) from ${user.name} via ${source}` }).save();
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error processing earnings referral:", err);
    }
};
