const mongoose = require('mongoose');

// 1. User Schema
const UserSchema = new mongoose.Schema({
    mobile: { type: String, unique: true, required: true },
    name: { type: String, default: 'New User', trim: true, minlength: 2 },
    avatar: { type: String, default: null },
    language: { type: String, enum: ['English', 'Hindi'], default: 'English' },
    referralCode: { type: String, unique: true },
    referredBy: { type: String, default: null }, // Referral code of parent
    role: { type: String, enum: ['User', 'Admin', 'SuperAdmin'], default: 'User' },
    walletCoins: { type: Number, default: 0 },
    walletCash: { type: Number, default: 0 },
    loginPassword: { type: String, required: false }, // SRS Section 3.16 Registration
    fundPassword: { type: String, required: false }, // SRS Section 3.13 Security for Withdrawals
    referralEarnings: { type: Number, default: 0 }, // SRS Section 3.13 wallet section
    pendingRewards: { type: Number, default: 0 }, // SRS Section 3.13 wallet section
    fruitInventory: { type: Number, default: 0 },
    fertilizerStock: { type: Number, default: 5 }, // RPG Mechanics: Boosts Water Growth Multiplier
    pesticideStock: { type: Number, default: 2 }, // SRS 3.5 कीटनाशक दवा stock
    isBlocked: { type: Boolean, default: false },
    dailyWaterCount: { type: Number, default: 0 },
    lastLoginDate: { type: Date },
    lastLoginRewardDate: { type: Date }, // LAUNCH SECURITY: Prevent daily login spam
    totalEarnings: { type: Number, default: 0 },
    streakUnlocked: { type: Boolean, default: false }, // SRS 3.11 Level 3 requirement
    currentStreak: { type: Number, default: 0 },
    lastStreakDate: { type: Date },
    last3HourRewardAt: { type: Date }, // SRS 3.6.2
    daily3HourCount: { type: Number, default: 0 }, // SRS 3.6.2
    lastSpinAt: { type: Date }, // SRS 3.6.3
    dailySpinCount: { type: Number, default: 0 }, // SRS 3.6.3
    claimedSocials: [{ type: String }], 
    readArticles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }], 
    deviceIds: [{ type: String }], 
    isKycVerified: { type: Boolean, default: false }, 
    kycData: {
        fullName: String,
        panNumber: String,
        verifiedAt: Date
    },
    isFlagged: { type: Boolean, default: false }, 
    securityFlags: [{ 
        flagType: String, // e.g. 'HIGH_SPEED_CLICKS', 'DEVICE_LIMIT_NEAR', 'IP_ANOMALY'
        timestamp: { type: Date, default: Date.now },
        notes: String
    }],
    createdAt: { type: Date, default: Date.now }
});

// ⚡ PERFORMANCE INDEXES (SRS 4.1)
UserSchema.index({ referredBy: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isFlagged: 1 });
UserSchema.index({ deviceIds: 1 });

// 2. Tree Schema
const TreeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    treeName: { type: String, default: 'My Tree' },
    growth: { type: Number, default: 0 }, // 0 - 100%
    level: { 
        type: String, 
        enum: ['Seed', 'Sprout', 'Plant', 'Growing Plant', 'Young Tree', 'Mature Tree', 'Mature Tree (Harvest)'], 
        default: 'Seed' 
    },
    mood: { type: String, enum: ['Happy', 'Waiting', 'Sad', 'Excited'], default: 'Happy' },
    unlockedElements: [{ type: String }], // SRS 3.11 (e.g., 'birds', 'butterflies', 'flowers')
    fruitsAvailable: { type: Number, default: 0 }, 
    lastWatered: { type: Date, default: Date.now },
    lastFertilized: { type: Date },
    lastShaken: { type: Date }, 
    dailyGrowthGained: { type: Number, default: 0 }, // SRS 3.2.1 Compliance
    lastGrowthResetDate: { type: Date, default: Date.now },
    hasPests: { type: Boolean, default: false }, // SRS 3.5 Gamified protection
    plantedAt: { type: Date, default: Date.now }
});
TreeSchema.index({ userId: 1 });
TreeSchema.index({ level: 1 });

// 3. Plantation Proof Schema
const PlantationProofSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    treeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tree' },
    day: { type: Number, enum: [1, 7, 15, 30] }, // Timeline of proof
    images: [{ type: String }],
    notes: { type: String },
    status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
    submittedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
    adminComments: { type: String }
});

// 4. Transaction Schema
const TransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['Credit', 'Debit'] },
    source: { 
        type: String, 
        enum: ['Daily Login', 'Water Game', 'Article', 'Referral', 'Social Task', 'Social Reward', 'Withdrawal', 'Tree Harvest', 'Shake Tree', 'Level Up', 'Spin Wheel', 'Rewarded Ad', 'Virtual Game Swap', '3-Hour Bonus', 'Manual Edit'] 
    },
    amountCoins: { type: Number, default: 0 },
    amountCash: { type: Number, default: 0 },
    notes: { type: String },
    date: { type: Date, default: Date.now }
});
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ type: 1 });

// 5. Withdrawal Schema
const WithdrawalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true }, // Requested ₹
    upiId: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    requestDate: { type: Date, default: Date.now },
    processDate: { type: Date },
    transactionId: { type: String },
    adminNotes: { type: String }
});
WithdrawalSchema.index({ userId: 1 });
WithdrawalSchema.index({ status: 1 });
WithdrawalSchema.index({ requestDate: -1 });

// 6. Article Schema
const ArticleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    readingRewardCoins: { type: Number, default: 10 },
    requiredReadingTimeSec: { type: Number, default: 60 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// 7. Referral Schema
const ReferralSchema = new mongoose.Schema({
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isUnlocked: { type: Boolean, default: false }, // Unlocks when referred user earns ₹21
    loginRewardPaid: { type: Boolean, default: false },
    day3RewardPaid: { type: Boolean, default: false },
    day7RewardPaid: { type: Boolean, default: false },
    activeDaysCount: { type: Number, default: 0 },
    lastActiveDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

// 8. System Config Schema (Dynamic Admin Parameters)
const SystemConfigSchema = new mongoose.Schema({
    // Rewards & Rates
    conversionRate: { type: Number, default: 100 }, // 100 coins = 1 INR
    loginReward: { type: Number, default: 10 },
    spinRewardMax: { type: Number, default: 50 },
    socialRewards: {
        YouTube: { type: Number, default: 150 },
        Facebook: { type: Number, default: 100 },
        Instagram: { type: Number, default: 100 },
        X: { type: Number, default: 50 },
        WhatsApp: { type: Number, default: 50 },
        Telegram: { type: Number, default: 50 }
    },
    socialLinks: {
        YouTube: { type: String, default: "" },
        Facebook: { type: String, default: "" },
        Instagram: { type: String, default: "" },
        X: { type: String, default: "" },
        WhatsApp: { type: String, default: "" },
        Telegram: { type: String, default: "" }
    },
    
    // System Limits
    dailyEarningLimitCoins: { type: Number, default: 1000 },
    dailyGrowthLimitPercent: { type: Number, default: 4 },
    minWithdrawalRupees: { type: Number, default: 10 },
    rewardedAdCoins: { type: Number, default: 15 },
    rewardedVideoLink: { type: String, default: "" },
    rewardWaitTimeSec: { type: Number, default: 30 },
    dailyAdLimit: { type: Number, default: 10 },
    maxAccountsPerDevice: { type: Number, default: 2 },
    dailyEarningLimitCoins: { type: Number, default: 1000 },
    dailyEarningLimitCash: { type: Number, default: 100 },
    
    // Referral Specifications
    referralUnlockThreshold: { type: Number, default: 21 }, // Amount in cash
    referralL1Commission: { type: Number, default: 5 }, // 5%
    referralL2Commission: { type: Number, default: 2 }, // 2%
    commissionEligibleSources: { 
        type: [String], 
        default: ['Water Game', 'Article', 'Tree Harvest', 'Shake Tree', 'Spin Wheel', '3-Hour Bonus', 'Daily Login'] 
    },
    
    // Rewards Logic (SRS 4.5 Maintainability)
    levelUpRewards: {
        Sprout: { type: Number, default: 50 },
        Plant: { type: Number, default: 75 },
        GrowingPlant: { type: Number, default: 100 },
        YoungTree: { type: Number, default: 150 },
        MatureTree: { type: Number, default: 300 }
    },
    threeHourReward: { type: Number, default: 15 },

    // Fruit Economy (SRS 3.12)
    fruitValueNormal: { type: Number, default: 50 },
    fruitValueGolden: { type: Number, default: 250 },
    dailyFruitHarvestLimit: { type: Number, default: 5000 }, // Max coins from fruits per day
    
    // Weekly Loot (SRS 3.7)
    weeklyLootOffer: {
        title: { type: String, default: "Double Harvest Week!" },
        description: { type: String, default: "Earn double coins on all harvests this week." },
        rewardMultiplier: { type: Number, default: 2 },
        isActive: { type: Boolean, default: false }
    },
    
    // Ads Management (SRS 3.18)
    adsConfig: {
        placements: {
            homeBanner: { type: Boolean, default: true },
            rewardedVideoInterval: { type: Number, default: 3 }, // Every 3 actions
            interstitialFrequency: { type: Number, default: 0.2 }, // 20% chance
        },
        providers: {
            admobEnabled: { type: Boolean, default: true },
            facebookAdsEnabled: { type: Boolean, default: false }
        }
    },

    // Super Admin Control (Global Switches)
    globalMaintenanceMode: { type: Boolean, default: false },
    restrictNewLogins: { type: Boolean, default: false },
    appVersioning: {
        currentVersion: { type: String, default: "2.5.0" },
        forceUpdate: { type: Boolean, default: false },
        updateUrl: { type: String, default: "" }
    },

    updatedAt: { type: Date, default: Date.now }
});

// 9. Tree Message Schema
const TreeMessageSchema = new mongoose.Schema({
    mood: { type: String, enum: ['Happy', 'Waiting', 'Sad', 'Excited'] },
    language: { type: String, enum: ['English', 'Hindi'], default: 'English' },
    message: { type: String, required: true },
    category: { type: String, enum: ['Motivation', 'Reminder', 'ThankYou'], default: 'Motivation' },
    requiredLevel: { 
        type: String, 
        enum: ['Seed', 'Sprout', 'Plant', 'Growing Plant', 'Young Tree', 'Mature Tree', 'Mature Tree (Harvest)'], 
        default: 'Seed' 
    }
});

// 10. Security Log Schema (SRS 3.16 - Persistent Audit Trail)
const SecurityLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    eventType: { 
        type: String, 
        enum: [
            'LOGIN_SUCCESS', 'LOGIN_FAILED', 'OTP_SENT', 'OTP_FAILED',
            'DEVICE_LIMIT_HIT', 'RATE_LIMIT_HIT', 'BOT_DETECTED',
            'EARNING_LIMIT_HIT', 'SUSPICIOUS_PATTERN', 'ACCOUNT_BLOCKED',
            'ACCOUNT_UNBLOCKED', 'ADMIN_REVIEW', 'WITHDRAWAL_FLAGGED'
        ]
    },
    ip: { type: String },
    deviceId: { type: String },
    details: { type: String },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

SecurityLogSchema.index({ userId: 1 });
SecurityLogSchema.index({ createdAt: -1 });

// 11. Public Activity/Notice Schema (SRS 3.17)
const ActivitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String, // Denormalized for fast feed reading
    type: { type: String, enum: ['TREE_PLANTED', 'WITHDRAWAL', 'HARVEST', 'LEVEL_UP', 'ANNOUNCEMENT'] },
    text: String, // e.g., "ने आज 2 पेड़ लगाया"
    icon: String,
    createdAt: { type: Date, default: Date.now }
});
ActivitySchema.index({ createdAt: -1 });

// 12. Feedback & Complaints Schema (SRS 3.17)
const FeedbackSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: String,
    mobile: String,
    message: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Reviewed', 'Resolved'], default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Tree = mongoose.model('Tree', TreeSchema);
const PlantationProof = mongoose.model('PlantationProof', PlantationProofSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Withdrawal = mongoose.model('Withdrawal', WithdrawalSchema);
const Article = mongoose.model('Article', ArticleSchema);
const Referral = mongoose.model('Referral', ReferralSchema);
const SystemConfig = mongoose.model('SystemConfig', SystemConfigSchema);
const TreeMessage = mongoose.model('TreeMessage', TreeMessageSchema);
const SecurityLog = mongoose.model('SecurityLog', SecurityLogSchema);
const Activity = mongoose.model('Activity', ActivitySchema);
const Feedback = mongoose.model('Feedback', FeedbackSchema);

module.exports = { 
    User, 
    Tree, 
    PlantationProof, 
    Transaction, 
    Withdrawal, 
    Article, 
    Referral, 
    SystemConfig, 
    TreeMessage, 
    SecurityLog, 
    Activity,
    Feedback 
};