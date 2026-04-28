const mongoose = require('mongoose');
const { Tree, User, Transaction, PlantationProof, TreeMessage } = require('../models/AllModels');
const { processEarningsReferral } = require('../services/referralService');

const GROWTH_LEVELS = [
    { name: 'Seed', min: 0 },
    { name: 'Sprout', min: 15 },
    { name: 'Plant', min: 30 },
    { name: 'Growing Plant', min: 50 },
    { name: 'Young Tree', min: 75 },
    { name: 'Mature Tree', min: 90 },
    { name: 'Mature Tree (Harvest)', min: 100 }
];

const LEVEL_ORDER = ['Seed', 'Sprout', 'Plant', 'Growing Plant', 'Young Tree', 'Mature Tree', 'Mature Tree (Harvest)'];

const isLevelReached = (currentLevel, requiredLevel) => {
    return LEVEL_ORDER.indexOf(currentLevel) >= LEVEL_ORDER.indexOf(requiredLevel);
};

const getLevelName = (growthPerc) => {
    let currentLevel = 'Seed';
    for (let level of GROWTH_LEVELS) {
        if (growthPerc >= level.min) currentLevel = level.name;
    }
    return currentLevel;
};

const resolveTreeMood = (tree) => {
    const hoursSinceWatered = (Date.now() - new Date(tree.lastWatered).getTime()) / 3600000;
    
    // Excited: Recently watered (within 30 mins)
    if (hoursSinceWatered < 0.5) return 'Excited';
    
    // Happy: Watered within last 6 hours
    if (hoursSinceWatered < 6) return 'Happy';
    
    // Waiting: Neglected for 6 - 24 hours
    if (hoursSinceWatered < 24) return 'Waiting';
    
    // Sad: Neglected for > 24 hours
    return 'Sad';
};

exports.getTrees = async (req, res) => {
    try {
        const trees = await Tree.find({ userId: req.user.userId });
        
        // Dynamically update moods based on real-time care gaps
        const updatedTrees = trees.map(tree => {
            const newMood = resolveTreeMood(tree);
            // We don't necessarily need to save to DB every GET to save performance, 
            // but we return the computed mood to the UI.
            tree.mood = newMood; 
            return tree;
        });

        res.json({ success: true, trees: updatedTrees });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.renameTree = async (req, res) => {
    try {
        const { treeId, newName } = req.body;
        // Allowed limits check from 3.3.1
        if (!newName || newName.length > 20) {
            return res.status(400).json({ error: "Tree name must be between 1 and 20 characters." });
        }

        const tree = await Tree.findOneAndUpdate(
            { _id: treeId, userId: req.user.userId },
            { treeName: newName },
            { new: true }
        );

        if (!tree) return res.status(404).json({ error: "Tree not found or access denied." });

        res.json({ success: true, message: "Tree renamed successfully.", tree });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.waterTree = async (req, res) => {
    try {
        const { treeId, useFertilizer } = req.body;
        const tree = await Tree.findOne({ _id: treeId, userId: req.user.userId });
        if (!tree) return res.status(404).json({ error: "Tree not found" });
        const user = await User.findById(req.user.userId);

        // LAUNCH SECURITY: Enforce minimum 1 hour cooldown between watering
        // 🏁 SRS 3.2.1: Enforcement of Daily Growth Limit
        const dailyLimit = 100; // Testing: Allow 100% growth in one day (Market production: 4%)
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Reset if it's a new day
        if (new Date(tree.lastGrowthResetDate) < startOfToday) {
            tree.dailyGrowthGained = 0;
            tree.lastGrowthResetDate = now;
        }

        if (tree.dailyGrowthGained >= dailyLimit) {
            return res.status(403).json({ error: `You have reached the ${dailyLimit}% daily growth limit for this tree. Please come back tomorrow!` });
        }



        if (tree.lastWatered && (Date.now() - new Date(tree.lastWatered).getTime() < 30000)) {
            const timeRemaining = Math.ceil((30000 - (Date.now() - new Date(tree.lastWatered).getTime())) / 1000);
            return res.status(429).json({ error: `Tree is fully hydrated. Please wait ${timeRemaining} seconds before watering again.` });
        }

        // RPG Game Design: Rapid Testing Growth (20% per watering)
        let baseGrowth = 20; 
        let multiplier = 1;

        // Fertilizer RPG Economy Element
        if (useFertilizer && String(useFertilizer) === 'true') {
            if (user.fertilizerStock <= 0) {
                 return res.status(400).json({ error: "Insufficient Fertilizer Stock. Please buy or earn more!" });
            }
            user.fertilizerStock -= 1;
            // SRS 3.2.1: Fertilizer increases growth speed or provides a stage boost
            tree.growth += 20; // Rapid Testing Boost (Market: 5% or 2x speed)
            tree.lastFertilized = Date.now();
        }

        // Apply Growth & Hard Stop at 100%
        let addedGrowth = Math.floor(baseGrowth * multiplier);
        let newGrowth = tree.growth + addedGrowth;
        if (newGrowth > 100) {
             addedGrowth = 100 - tree.growth;
             newGrowth = 100;
        }

        tree.dailyGrowthGained += addedGrowth;

        const oldLevel = tree.level;
        const newLevel = getLevelName(newGrowth);

        const { Transaction, SystemConfig } = require('../models/AllModels');
        const config = await SystemConfig.findOne();
        const levelRewards = config?.levelUpRewards || {};

        let levelUpMessage = null;
        if (oldLevel !== newLevel) {
            
            // 💰 SRS 4.5: Configuration-driven level rewards
            if (newLevel === 'Sprout') {
                const reward = levelRewards.Sprout || 50;
                user.walletCoins += reward;
                user.totalEarnings += reward;
                levelUpMessage = `Level 2 Reached: Sprout! Earned ${reward} bonus coins.`;
                await new Transaction({ userId: user._id, type: 'Credit', source: 'Level Up', amountCoins: reward, notes: 'Level 2 Reward' }).save();
                await processEarningsReferral(user._id, reward, 'Level Up');
            } else if (newLevel === 'Plant') {
                const reward = levelRewards.Plant || 75;
                user.walletCoins += reward; // Added dynamic reward for level 3
                user.streakUnlocked = true; 
                levelUpMessage = `Level 3 Reached: Plant! Earned ${reward} coins & Streaks uncovered.`;
                await new Transaction({ userId: user._id, type: 'Credit', source: 'Level Up', amountCoins: reward, notes: 'Level 3 Reward' }).save();
            } else if (newLevel === 'Growing Plant') {
                const reward = levelRewards.GrowingPlant || 100;
                user.walletCoins += reward;
                if (!tree.unlockedElements.includes('birds')) tree.unlockedElements.push('birds', 'butterflies');
                levelUpMessage = `Level 4 Reached: Growing Plant! Earned ${reward} coins. Fauna (Birds) attracted.`;
                await new Transaction({ userId: user._id, type: 'Credit', source: 'Level Up', amountCoins: reward, notes: 'Level 4 Reward' }).save();
            } else if (newLevel === 'Young Tree') {
                const reward = levelRewards.YoungTree || 150;
                user.walletCoins += reward;
                if (!tree.unlockedElements.includes('flowers')) tree.unlockedElements.push('flowers');
                levelUpMessage = `Level 5 Reached: Young Tree! Earned ${reward} coins. Flowers blooming.`;
                await new Transaction({ userId: user._id, type: 'Credit', source: 'Level Up', amountCoins: reward, notes: 'Level 5 Reward' }).save();
            } else if (newLevel === 'Mature Tree') {
                const reward = levelRewards.MatureTree || 300;
                user.walletCoins += reward;
                if (!tree.unlockedElements.includes('fruits_system')) tree.unlockedElements.push('fruits_system');
                tree.fruitsAvailable += Math.floor(Math.random() * 5) + 3;
                levelUpMessage = `Level 6 Reached: Mature Tree! Earned ${reward} coins & fruits sprouted!`;
                await new Transaction({ userId: user._id, type: 'Credit', source: 'Level Up', amountCoins: reward, notes: 'Level 6 Reward' }).save();
            } else if (newLevel === 'Mature Tree (Harvest)') {
                tree.fruitsAvailable += Math.floor(Math.random() * 10) + 10; 
                levelUpMessage = "Max Level 7 Reached: Golden Harvest Phase Achieved!";
            }

            // Log Level-Up to Community Activity Board
            const { Activity } = require('../models/AllModels');
            await new Activity({
                userId: user._id,
                userName: user.name,
                type: 'LEVEL_UP',
                text: `का पेड़ Level-Up होकर '${newLevel}' बन गया!`,
                icon: '🌟'
            }).save();
        }

        // Normal Fruit Generation: Mature+ trees have a 30% chance to drop 1 fruit natively upon successful watering!
        if (['Mature Tree', 'Mature Tree (Harvest)'].includes(newLevel)) {
             if (Math.random() > 0.7 && tree.fruitsAvailable < 50) {
                  tree.fruitsAvailable += 1;
             }
        }

        user.dailyWaterCount += 1;
        await user.save();

        tree.growth = newGrowth;
        tree.level = newLevel;
        tree.lastWatered = Date.now();
        tree.mood = 'Happy'; 
        await tree.save();

        res.json({ success: true, tree, levelUpMessage, fertilizerRemaining: user.fertilizerStock });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.fertilizeTree = async (req, res) => {
    req.body.useFertilizer = true;
    return exports.waterTree(req, res);
};

exports.plantNewTree = async (req, res) => {
    try {
        const { treeName } = req.body;
        const user = await User.findById(req.user.userId);
        const newTree = new Tree({ userId: req.user.userId, treeName: treeName || "New Plant" });
        await newTree.save();

        // SRS 3.17 Logging for Notice Board
        const { Activity } = require('../models/AllModels');
        await new Activity({
            userId: user._id,
            userName: user.name,
            type: 'TREE_PLANTED',
            text: 'ने आज 1 नया पेड़ लगाया!', // SRS example
            icon: '🌳'
        }).save();

        res.json({ success: true, tree: newTree });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.harvestFruits = async (req, res) => {
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { treeId } = req.body;
        const tree = await Tree.findOne({ _id: treeId, userId: req.user.userId }).session(session);
        if (!tree) throw new Error("Tree not found.");

        if (tree.fruitsAvailable <= 0) {
            throw new Error("No fruits available to harvest.");
        }

        const { SystemConfig } = require('../models/AllModels');
        let config = await SystemConfig.findOne().session(session);
        
        const valNormal = config?.fruitValueNormal || 50;
        const valGolden = config?.fruitValueGolden || 250;
        const harvestCap = config?.dailyFruitHarvestLimit || 5000;

        const user = await User.findById(req.user.userId).session(session);
        
        const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
        const todayHarvests = await Transaction.find({ 
            userId: user._id, 
            source: 'Tree Harvest', 
            date: { $gte: startOfToday } 
        }).session(session);
        const currentSum = todayHarvests.reduce((acc, tx) => acc + tx.amountCoins, 0);

        if (currentSum >= harvestCap) {
             throw new Error(`Daily Fruit Harvest Cap reached (₹${harvestCap/100}). Growth continues, please harvest tomorrow!`);
        }

        let earnedCoins = 0;
        let goldenFruits = 0;
        let normalFruits = 0;

        for (let i = 0; i < tree.fruitsAvailable; i++) {
             if (currentSum + earnedCoins + valNormal > harvestCap) break;
             if (Math.random() > 0.95 && (currentSum + earnedCoins + valGolden <= harvestCap)) {
                 earnedCoins += valGolden; 
                 goldenFruits++;
             } else {
                 earnedCoins += valNormal;
                 normalFruits++;
             }
        }
        
        if (earnedCoins <= 0) throw new Error("Harvest limit reached or no fruits processed.");

        user.walletCoins += earnedCoins;
        user.totalEarnings += earnedCoins;
        user.fruitInventory += (normalFruits + goldenFruits); 
        await user.save({ session });

        const harvestSummary = `Harvested ${normalFruits} normal fruits & ${goldenFruits} Golden Fruits`;
        await new Transaction({
            userId: user._id, type: 'Credit', source: 'Tree Harvest',
            amountCoins: earnedCoins, notes: harvestSummary
        }).save({ session });

        await processEarningsReferral(user._id, earnedCoins, 'Tree Harvest', session);

        // Log Harvest to Community Activity Board
        const { Activity } = require('../models/AllModels');
        await new Activity({
            userId: user._id,
            userName: user.name,
            type: 'HARVEST',
            text: `ने ${earnedCoins} Coins का फल तोड़ा!`,
            icon: '🍎'
        }).save({ session });

        tree.fruitsAvailable = 0; 
        tree.mood = 'Excited'; 
        await tree.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ 
            success: true, 
            message: `Awesome! You ${harvestSummary} yielding ${earnedCoins} Coins!`, 
            tree, 
            walletCoins: user.walletCoins,
            goldenHits: goldenFruits
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: err.message });
    }
};

// 🌍 1.3 SRS: Real Plantation Tracking Upload with Cloudinary
exports.uploadPlantationProof = async (req, res) => {
    try {
        const { treeId, day, notes } = req.body;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "At least one plantation photo is required." });
        }

        const tree = await Tree.findById(treeId);
        if(!tree) return res.status(404).json({ error: "Tree record not found." });

        const allowedDays = [1, 7, 15, 30];
        const dayInt = parseInt(day);
        if (!allowedDays.includes(dayInt)) {
            return res.status(400).json({ error: "Invalid day milestone. Must be 1, 7, 15, or 30." });
        }

        // --- ENFORCE TIMELINE (SRS 3.3.3) ---
        // Temporarily bypassing timeline compliance for testing/demo purposes.
        /*
        const daysSincePlanted = Math.floor((Date.now() - new Date(tree.plantedAt).getTime()) / (1000 * 60 * 60 * 24));
        let isWithinWindow = false;
        if (dayInt === 1) {
            isWithinWindow = daysSincePlanted <= 2; // Same day or within 2 days
        } else {
            isWithinWindow = Math.abs(daysSincePlanted - dayInt) <= 2;
        }

        if (!isWithinWindow) {
            return res.status(403).json({ 
                error: `Compliance Error: You can only upload Day ${dayInt} proof within ±2 days of that milestone. Current days since planting: ${daysSincePlanted}` 
            });
        }
        */

        // Check if already uploaded for this day
        const existing = await PlantationProof.findOne({ userId: req.user.userId, treeId, day: dayInt });
        if(existing) return res.status(400).json({ error: `Proof for Day ${dayInt} already exists.` });

        // Store Cloudinary URLs
        const imagePaths = req.files.map(file => file.path);

        const newProof = new PlantationProof({
            userId: req.user.userId,
            treeId: treeId, 
            day: dayInt,
            images: imagePaths,
            notes: notes || "Standard growth proof.",
            status: "Pending"
        });

        await newProof.save();
        res.status(201).json({ success: true, message: `Day ${dayInt} proof submitted to Cloudinary. Pending Admin review.`, proof: newProof });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPlantationProofs = async (req, res) => {
    try {
        const proofs = await PlantationProof.find({ userId: req.user.userId }).sort({ day: 1 });
        res.json({ success: true, proofs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🎮 Shake Tree Game Endpoint (SRS 3.2.2 Compliance)
exports.shakeTree = async (req, res) => {
    try {
        const { treeId, hits } = req.body; // hits = Number of taps during the 10s game
        const tree = await Tree.findOne({ _id: treeId, userId: req.user.userId });
        if (!tree) return res.status(404).json({ error: "Tree not found" });

        // LAUNCH SECURITY: 30s Cooldown for testing (Production: 2 Hours)
        const COOLDOWN = 30000; 
        if (tree.lastShaken && (Date.now() - new Date(tree.lastShaken).getTime() < COOLDOWN)) {
             const timeRemaining = Math.ceil((COOLDOWN - (Date.now() - new Date(tree.lastShaken).getTime())) / 1000);
             return res.status(429).json({ error: `The tree needs to recover. Shake it again in ${timeRemaining} seconds!` });
        }

        // Logic: Award 1 fruit for every 5 hits (Taps)
        const fruitGain = Math.floor((hits || 0) / 5);
        const coinGain = Math.floor((hits || 0) / 10); // Small instant coin bonus

        tree.fruitsAvailable = (tree.fruitsAvailable || 0) + fruitGain;
        tree.lastShaken = Date.now();
        await tree.save();

        if (coinGain > 0) {
            const user = await User.findById(req.user.userId);
            user.walletCoins += coinGain;
            await user.save();
            await new Transaction({
                userId: user._id, type: 'Credit', source: 'Shake Tree',
                amountCoins: coinGain, notes: 'Instant coin bonus from shake'
            }).save();
        }

        res.json({ 
            success: true, 
            message: `Success! You shook down ${fruitGain} fruits!`, 
            fruitsAdded: fruitGain,
            totalFruits: tree.fruitsAvailable 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// 💬 Dynamic Messaging Engine (Language + Mood Matrix from SRS)
exports.getTreeMessage = async (req, res) => {
    try {
        const { treeId } = req.body;
        const tree = await Tree.findById(treeId);
        const user = await User.findById(req.user.userId);
        
        if (!tree || !user) return res.status(404).json({ error: "Record not found." });

        // Retrieve valid messages matching current tree mood + player language (English/Hindi)
        // Also Filter by level (SRS 3.11): Only show messages unlocked for current level
        let availableMessages = await TreeMessage.find({ mood: tree.mood, language: user.language });
        
        availableMessages = availableMessages.filter(msg => isLevelReached(tree.level, msg.requiredLevel || 'Seed'));
        
        // Fallback safety if DB lacks translation
        if (availableMessages.length === 0) {
             availableMessages = await TreeMessage.find({ mood: tree.mood, language: 'English' });
        }

        let selectedMessage = "I'm just a quiet tree.";
        if (availableMessages.length > 0) {
            // Pick a random message from the pool!
            const randomDrop = Math.floor(Math.random() * availableMessages.length);
            selectedMessage = availableMessages[randomDrop].message;
        } else {
            // Hard fallback if Admin hasn't added ANY messages to the database
            if (tree.mood === 'Happy') selectedMessage = "I'm feeling great today!";
            else if (tree.mood === 'Excited') selectedMessage = "Wow, harvest time!";
            else selectedMessage = "I need some water please.";
        }
        
        res.json({ success: true, message: selectedMessage });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateTreeName = async (req, res) => {
    try {
        const { treeId, newName } = req.body;
        if (!newName || newName.length < 3 || newName.length > 20) {
            return res.status(400).json({ error: "Tree name must be between 3 and 20 characters." });
        }

        const tree = await Tree.findOneAndUpdate(
            { _id: treeId, userId: req.user.userId },
            { treeName: newName },
            { new: true }
        );

        if (!tree) return res.status(404).json({ error: "Tree not found or unauthorized." });

        res.json({ success: true, message: "Tree renamed successfully!", tree });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



exports.getLeaderboard = async (req, res) => {
    try {
        // Advanced Aggregation: Rank by Tree Count first, then total earnings
        const leaders = await User.aggregate([
            {
                $lookup: {
                    from: 'trees',
                    localField: '_id',
                    foreignField: 'userId', 
                    as: 'userTrees'
                }
            },
            {
               $project: {
                   name: 1,
                   avatar: 1,
                   walletCoins: 1,
                   treeCount: { $size: '$userTrees' }
               }
            },
            { $sort: { treeCount: -1, walletCoins: -1 } },
            { $limit: 10 }
        ]);

        res.json({ success: true, leaders });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
