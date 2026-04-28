const express = require('express');
const router = express.Router();
const treeController = require('../controllers/treeController');
const authMiddleware = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');

router.get('/', authMiddleware, treeController.getTrees);
router.post('/water', authMiddleware, treeController.waterTree);
router.post('/fertilize', authMiddleware, treeController.fertilizeTree);
router.post('/plant', authMiddleware, treeController.plantNewTree);
router.put('/rename', authMiddleware, treeController.updateTreeName);
router.post('/harvest', authMiddleware, treeController.harvestFruits);


const { uploadCloud, uploadProof } = require('../config/cloudinary');

// Real plantation photo uploads (max 3 images, goes to treeniti_proofs folder)
router.post('/real-plantation', authMiddleware, uploadProof.array('photos', 3), treeController.uploadPlantationProof);
router.get('/real-plantation/status', authMiddleware, treeController.getPlantationProofs);

// Game Minigame: Shake Tree
router.post('/shake', authMiddleware, treeController.shakeTree);
router.get('/leaderboard', authMiddleware, treeController.getLeaderboard);

// Dynamic Chat Bubble Messaging (Language Specific)
router.post('/message', authMiddleware, treeController.getTreeMessage);

module.exports = router;
