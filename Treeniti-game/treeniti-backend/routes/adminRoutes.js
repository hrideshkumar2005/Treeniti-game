const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const articleController = require('../controllers/articleController');
const authMiddleware = require('../middlewares/authMiddleware');

// Feedback Submission (Open to all logged-in users)
router.post('/feedback', authMiddleware, adminController.submitFeedback);

// --- PROTECTED ADMIN ROUTES ---
router.use(authMiddleware);
router.use(adminController.isAdmin);

// Dashboard Analytics
router.get('/dashboard', adminController.getDashboardStats);
router.get('/feedback', adminController.getAllFeedback); // Admins can view all feedback

// User Management
router.get('/users', adminController.getAllUsers);
router.post('/users/block', adminController.blockUser);
router.post('/users/update', adminController.updateUser);

// Super Admin Only: Role Manager & System Configurations
router.post('/roles/update', adminController.isSuperAdmin, adminController.changeUserRole);
router.post('/config/update', adminController.isSuperAdmin, adminController.updateSystemConfig);

// Proof Management
router.get('/proofs/pending', adminController.getPendingProofs);
router.post('/proofs/verify', adminController.verifyPlantationProof);

// Withdrawals
router.get('/withdrawals/pending', adminController.getPendingWithdrawals);
router.post('/withdrawals/process', adminController.processWithdrawal);

// Tree Messages & Mood Management
router.post('/messages', adminController.createTreeMessage);
router.put('/messages/:id', adminController.updateTreeMessage);

// Article Management
router.post('/articles', articleController.createArticle);
router.put('/articles/:id', articleController.updateArticle);
router.delete('/articles/:id', articleController.deleteArticle);

// 🏛️ Super Admin explicitly
router.get('/analytics', adminController.isSuperAdmin, adminController.getGlobalAnalytics);
router.get('/admins', adminController.isSuperAdmin, adminController.getAdminList);

// Withdrawal History
router.get('/withdrawals/history', adminController.getWithdrawalHistory);

// Tree Messages all
router.get('/messages/all', adminController.getTreeMessages);

// System Config Fetch
router.get('/config', adminController.getSystemConfig);

// 🛡️ SRS 3.16 Security Management
router.get('/security/flagged', adminController.getFlaggedUsers);
router.get('/security/logs', adminController.getSecurityLogs);
router.post('/security/review', adminController.reviewFlaggedUser);
router.post('/security/resolve', adminController.resolveSecurityLog);

module.exports = router;
