const express = require('express');
const router = express.Router();
const { Activity } = require('../models/AllModels');
const authMiddleware = require('../middlewares/authMiddleware');

// Get Notice Board Feed (SRS 3.17)
router.get('/', async (req, res) => {
    try {
        const activities = await Activity.find()
            .sort({ createdAt: -1 })
            .limit(20);
        
        // If empty, providing some nice seed data for the user to see (SRS compliant)
        if (activities.length === 0) {
            return res.json({
                success: true,
                activities: [
                    { _id: '1', userName: 'रवि', text: 'ने आज 1 पेड़ लगाया', type: 'TREE_PLANTED', icon: '🌳', createdAt: new Date() },
                    { _id: '2', userName: 'Alok', text: 'withdrew ₹50 successfully!', type: 'WITHDRAWAL', icon: '💰', createdAt: new Date(Date.now() - 1000 * 60 * 10) },
                    { _id: '3', userName: 'Admin', text: 'Welcome to Treeniti v2.5 Launch!', type: 'ANNOUNCEMENT', icon: '📢', createdAt: new Date(Date.now() - 1000 * 60 * 60) }
                ]
            });
        }

        res.json({ success: true, activities });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
