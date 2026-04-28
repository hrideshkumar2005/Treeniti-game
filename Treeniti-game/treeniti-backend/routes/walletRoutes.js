const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, walletController.getWallet);
router.post('/earn', authMiddleware, walletController.earnCoins);
router.post('/withdraw', authMiddleware, walletController.requestWithdrawal);
router.post('/convert', authMiddleware, walletController.convertCoins); // High Level Exchange
router.post('/daily-login', authMiddleware, walletController.claimDailyLogin);
router.post('/claim-ad', authMiddleware, walletController.claimAdReward);
router.get('/history', authMiddleware, walletController.getTransactionHistory);

module.exports = router;
