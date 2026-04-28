const mongoose = require('mongoose');
const { User, Tree, PlantationProof, Withdrawal, Transaction, Article, SystemConfig, TreeMessage, SecurityLog, Feedback } = require('../models/AllModels');

// Middleware to check Admin role
exports.isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user && (user.role === 'Admin' || user.role === 'SuperAdmin')) {
            next();
        } else {
            return res.status(403).json({ error: "Access Denied. Admin only." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Middleware for Super Admin explicitly
exports.isSuperAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user && (user.role === 'Admin' || user.role === 'SuperAdmin')) {
            next();
        } else {
            return res.status(403).json({ error: "Access Denied. Administrator only." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- Admin Dashboard Stats ---
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalTreesPlant = await Tree.countDocuments();
        const pendingWithdrawalsCount = await Withdrawal.countDocuments({ status: 'Pending' });
        const pendingProofsCount = await PlantationProof.countDocuments({ status: 'Pending' });
        const flaggedUsersCount = await User.countDocuments({ isFlagged: true });
        const unresolvedSecLogs = await SecurityLog.countDocuments({ resolved: false });
        
        // 🚩 FRAUD DETECTION: Users with > 10,000 coins in < 24 hours
        const sharpEarners = await User.find({ 
            walletCoins: { $gt: 10000 },
            createdAt: { $gt: new Date(Date.now() - 86400000) }
        }).select('name mobile walletCoins');

        // Fetch most recent pending actions
        const latestProofs = await PlantationProof.find({ status: 'Pending' })
              .populate('userId', 'name mobile')
              .populate('treeId', 'treeName')
              .limit(5);

        res.json({ 
            success: true, 
            stats: { 
                users: totalUsers, 
                trees: totalTreesPlant, 
                w_pending: pendingWithdrawalsCount, 
                p_pending: pendingProofsCount,
                flagged: flaggedUsersCount,
                securityAlerts: unresolvedSecLogs
            },
            latestProofs,
            flaggedUsers: sharpEarners
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- User Management ---
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-__v');
        res.json({ success: true, count: users.length, users });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.blockUser = async (req, res) => {
    try {
        const { userId, isBlocked } = req.body;
        const user = await User.findByIdAndUpdate(userId, { isBlocked }, { new: true });
        res.json({ success: true, user });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- New: Admin Edit User (to fix names/data) ---
exports.updateUser = async (req, res) => {
    try {
        const { userId, name, mobile, walletCoins, walletCash, isFlagged } = req.body;
        const user = await User.findById(userId);
        if(!user) return res.status(404).json({ error: "User not found" });

        if(name) user.name = name;
        if(mobile) user.mobile = mobile;
        if(walletCoins !== undefined) user.walletCoins = walletCoins;
        if(walletCash !== undefined) user.walletCash = walletCash;
        if(isFlagged !== undefined) user.isFlagged = isFlagged;

        await user.save();
        console.log(`👤 Admin updated user: ${user.mobile} (${user.name})`);
        res.json({ success: true, message: "User updated successfully", user });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Admin Account Management ---
exports.changeUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body; // 'Admin', 'User'
        if (!['Admin', 'User'].includes(role)) {
            return res.status(400).json({ error: "Invalid role specified." });
        }
        const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
        res.json({ success: true, message: `User role updated to ${role}`, user });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- System Configuration (Global Limits) ---
exports.updateSystemConfig = async (req, res) => {
    try {
        let config = await SystemConfig.findOne();
        if (!config) {
            config = new SystemConfig(req.body);
        } else {
            Object.assign(config, req.body);
            config.updatedAt = Date.now();
        }
        await config.save();
        res.json({ success: true, message: "Global config updated successfully", config });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Tree Messages Management ---
exports.createTreeMessage = async (req, res) => {
    try {
        const msg = new TreeMessage(req.body);
        await msg.save();
        res.json({ success: true, msg });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateTreeMessage = async (req, res) => {
    try {
        const msg = await TreeMessage.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, msg });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Plantation Verification ---
exports.getPendingProofs = async (req, res) => {
    try {
        const proofs = await PlantationProof.find({ status: 'Pending' }).populate('userId', 'name mobile').populate('treeId', 'treeName level');
        res.json({ success: true, count: proofs.length, proofs });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.verifyPlantationProof = async (req, res) => {
    try {
        const { proofId, status, adminNotes } = req.body; 
        if (!['Verified', 'Rejected'].includes(status)) {
             return res.status(400).json({ error: "Invalid status. Must be Verified or Rejected." });
        }

        const proof = await PlantationProof.findById(proofId);
        if(!proof) return res.status(404).json({ error: "Proof not found" });

        proof.status = status;
        proof.adminNotes = adminNotes || "";
        proof.verifiedAt = Date.now();
        await proof.save();

        if (status === 'Verified') {
            const user = await User.findById(proof.userId);
            if (user) {
                // RPG Reward: ₹50 Reward for real plantation proof (SRS 2.4 / 3.12)
                // Assuming walletCash stores the INR balance
                user.walletCash += 50; 
                user.totalEarnings += 50 * 100; // Track in coins equivalent for total stats
                await user.save();

                await new Transaction({
                    userId: user._id,
                    type: 'Credit',
                    source: 'Real Plantation',
                    amountCoins: 0,
                    amountCash: 50,
                    notes: `Verified Day ${proof.day} Growth Proof reward (₹50)`
                }).save();
            }
        }

        res.json({ success: true, message: `Proof marked as ${status}`, proof });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Withdrawals ---
exports.getPendingWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ status: 'Pending' }).populate('userId', 'name mobile');
        res.json({ success: true, count: withdrawals.length, withdrawals });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.processWithdrawal = async (req, res) => {
    try {
        const { withdrawalId, status, transactionId, notes } = req.body; // Approved or Rejected
        const withdrawal = await Withdrawal.findById(withdrawalId);
        if (!withdrawal) return res.status(404).json({ error: "Not found" });

        withdrawal.status = status;
        withdrawal.transactionId = transactionId;
        withdrawal.adminNotes = notes;
        withdrawal.processDate = Date.now();
        await withdrawal.save();

        if (status === 'Rejected') {
            // Refund the wallet cash
            const user = await User.findById(withdrawal.userId);
            if (user) {
                user.walletCash += withdrawal.amount;
                await user.save();
            }
        }

        res.json({ success: true, withdrawal });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════════════
// 🛡️ SRS 3.16 SECURITY MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════

// --- Get all flagged users for admin review ---
exports.getFlaggedUsers = async (req, res) => {
    try {
        const flaggedUsers = await User.find({ isFlagged: true })
            .select('name mobile walletCoins totalEarnings deviceIds securityFlags isFlagged isBlocked createdAt')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: flaggedUsers.length, flaggedUsers });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Get persistent security audit logs ---
exports.getSecurityLogs = async (req, res) => {
    try {
        const { severity, eventType, resolved, limit } = req.query;
        const filter = {};
        if (severity) filter.severity = severity;
        if (eventType) filter.eventType = eventType;
        if (resolved !== undefined) filter.resolved = resolved === 'true';

        const logs = await SecurityLog.find(filter)
            .populate('userId', 'name mobile')
            .populate('resolvedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit) || 50);

        res.json({ success: true, count: logs.length, logs });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Review a flagged user: unflag, block, or restrict ---
exports.reviewFlaggedUser = async (req, res) => {
    try {
        const { userId, action, adminNotes } = req.body;
        // action: 'unflag', 'block', 'unflag_and_unblock'

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        let logEventType = 'ADMIN_REVIEW';

        if (action === 'unflag') {
            user.isFlagged = false;
            logEventType = 'ADMIN_REVIEW';
        } else if (action === 'block') {
            user.isBlocked = true;
            user.isFlagged = false; // Resolved by blocking
            logEventType = 'ACCOUNT_BLOCKED';
        } else if (action === 'unflag_and_unblock') {
            user.isFlagged = false;
            user.isBlocked = false;
            logEventType = 'ACCOUNT_UNBLOCKED';
        } else {
            return res.status(400).json({ error: "Invalid action. Use: unflag, block, unflag_and_unblock" });
        }

        user.securityFlags.push({
            flagType: 'ADMIN_DECISION',
            notes: `Admin action: ${action}. Notes: ${adminNotes || 'None'}`
        });
        await user.save();

        // Persist to audit log
        await new SecurityLog({
            userId: user._id,
            eventType: logEventType,
            details: `Admin ${action}: ${adminNotes || 'No notes'}`,
            severity: action === 'block' ? 'HIGH' : 'MEDIUM',
            resolved: true,
            resolvedBy: req.user.userId,
            resolvedAt: new Date()
        }).save();

        res.json({ success: true, message: `User ${action} successfully.`, user });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Resolve a security log entry ---
exports.resolveSecurityLog = async (req, res) => {
    try {
        const { logId, notes } = req.body;
        const log = await SecurityLog.findById(logId);
        if (!log) return res.status(404).json({ error: 'Log not found.' });

        log.resolved = true;
        log.resolvedBy = req.user.userId;
        log.resolvedAt = new Date();
        if (notes) log.details += ` | Resolution: ${notes}`;
        await log.save();

        res.json({ success: true, message: 'Security log resolved.', log });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Global Analytics ---
exports.getGlobalAnalytics = async (req, res) => {
    try {
        const totalEarnings = await Transaction.aggregate([
            { $match: { type: 'Credit' } },
            { $group: { _id: null, total: { $sum: '$amountCash' }, coins: { $sum: '$amountCoins' } } }
        ]);
        const totalWithdrawals = await Withdrawal.aggregate([
            { $match: { status: 'Approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const dailyGrowthUsers = await User.countDocuments({ createdAt: { $gt: last7Days } });

        res.json({ 
            success: true, 
            analytics: {
                revenueBurn: totalWithdrawals[0]?.total || 0,
                totalCoinsInCirculation: totalEarnings[0]?.coins || 0,
                newUsers7d: dailyGrowthUsers,
                totalDistributedCash: totalEarnings[0]?.total || 0
            }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Admin Accounts Management ---
exports.getAdminList = async (req, res) => {
    try {
        const admins = await User.find({ role: { $in: ['Admin', 'SuperAdmin'] } }).select('name mobile role lastLoginDate');
        res.json({ success: true, admins });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Extended Withdrawal Management (History & Reports) ---
exports.getWithdrawalHistory = async (req, res) => {
    try {
        const { status, limit } = req.query;
        const filter = status ? { status } : {};
        const withdrawals = await Withdrawal.find(filter)
            .populate('userId', 'name mobile')
            .sort({ requestDate: -1 })
            .limit(parseInt(limit) || 100);
        
        res.json({ success: true, withdrawals });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Tree Messages Fetch ---
exports.getTreeMessages = async (req, res) => {
    try {
        const messages = await TreeMessage.find();
        res.json({ success: true, messages });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- System Config Fetch ---
exports.getSystemConfig = async (req, res) => {
    try {
        const config = await SystemConfig.findOne();
        res.json({ success: true, config });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 📣 SRS 3.17 Feedback & Complaints
exports.submitFeedback = async (req, res) => {
    try {
        const { message } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const newFeedback = new Feedback({
            userId: user._id,
            userName: user.name,
            mobile: user.mobile,
            message
        });

        await newFeedback.save();
        res.json({ success: true, message: "Feedback submitted. Thank you for helping Treeniti grow!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAllFeedback = async (req, res) => {
    try {
        const list = await Feedback.find().sort({ createdAt: -1 });
        res.json({ success: true, feedback: list });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
