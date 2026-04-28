const mongoose = require('mongoose');
const { User } = require('../models/AllModels');

exports.getGlobalLeaderboard = async (req, res) => {
    try {
        const { metric = 'coins' } = req.query; // 'coins', 'trees', 'proofs'
        let leaders = [];

        if (metric === 'trees') {
            leaders = await User.aggregate([
                { $match: { role: 'User', isBlocked: false } },
                { $lookup: { from: 'trees', localField: '_id', foreignField: 'userId', as: 'treeList' } },
                { $addFields: { score: { $size: '$treeList' } } },
                { $sort: { score: -1 } },
                { $limit: 30 },
                { $project: { name: 1, score: 1, walletCoins: 1 } }
            ]);
        } else if (metric === 'proofs') {
            leaders = await User.aggregate([
                { $match: { role: 'User', isBlocked: false } },
                { $lookup: { from: 'plantationproofs', localField: '_id', foreignField: 'userId', as: 'proofList' } },
                { $addFields: { score: { $size: '$proofList' } } },
                { $sort: { score: -1 } },
                { $limit: 30 },
                { $project: { name: 1, score: 1, walletCoins: 1 } }
            ]);
        } else {
            // Default: Coins
            leaders = await User.find({ role: 'User', isBlocked: false })
                                .sort({ walletCoins: -1 })
                                .limit(50)
                                .select('name walletCoins')
                                .then(docs => docs.map(d => ({ _id: d._id, name: d.name, score: d.walletCoins, walletCoins: d.walletCoins })));
        }
        
        const currentUser = await User.findById(req.user.userId);
        if(!currentUser) return res.status(404).json({ success: false, error: "User not found" });
        
        let myScore = 0;
        let usersAhead = 0;

        if (metric === 'trees') {
            const myTrees = await mongoose.model('Tree').countDocuments({ userId: req.user.userId });
            myScore = myTrees;
            usersAhead = await User.aggregate([
                { $lookup: { from: 'trees', localField: '_id', foreignField: 'userId', as: 'treeList' } },
                { $match: { role: 'User', isBlocked: false, 'treeList.0': { $exists: true } } },
                { $addFields: { treeCount: { $size: '$treeList' } } },
                { $match: { treeCount: { $gt: myTrees } } },
                { $count: 'count' }
            ]);
            usersAhead = usersAhead.length > 0 ? usersAhead[0].count : 0;
        } else if (metric === 'proofs') {
            const myProofs = await mongoose.model('PlantationProof').countDocuments({ userId: req.user.userId });
            myScore = myProofs;
            usersAhead = await User.aggregate([
                { $lookup: { from: 'plantationproofs', localField: '_id', foreignField: 'userId', as: 'proofList' } },
                { $match: { role: 'User', isBlocked: false, 'proofList.0': { $exists: true } } },
                { $addFields: { proofCount: { $size: '$proofList' } } },
                { $match: { proofCount: { $gt: myProofs } } },
                { $count: 'count' }
            ]);
            usersAhead = usersAhead.length > 0 ? usersAhead[0].count : 0;
        } else {
            myScore = currentUser.walletCoins;
            usersAhead = await User.countDocuments({ role: 'User', isBlocked: false, walletCoins: { $gt: myScore } });
        }

        res.json({ success: true, leaders, myRank: usersAhead + 1, myScore });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
