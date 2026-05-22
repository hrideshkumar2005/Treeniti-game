const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
    const db = mongoose.connection;
    const trees = await db.collection('trees').find({}).toArray();
    let updated = 0;

    for (let tree of trees) {
        const msDiff = Date.now() - new Date(tree.plantedAt).getTime();
        const daysGrowing = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
        const maxGrowthAllowed = Math.min(100, daysGrowing * 4.762);

        if (tree.growth > maxGrowthAllowed || tree.dailyGrowthGained > 4.762) {
            // Determine correct level based on actual max growth
            let newLevel = 'Seed';
            const GROWTH_LEVELS = [
                { name: 'Seed', min: 0 },
                { name: 'Sprout', min: 15 },
                { name: 'Plant', min: 30 },
                { name: 'Growing Plant', min: 50 },
                { name: 'Young Tree', min: 75 },
                { name: 'Mature Tree', min: 90 },
                { name: 'Mature Tree (Harvest)', min: 100 }
            ];
            for (let level of GROWTH_LEVELS) {
                if (maxGrowthAllowed >= level.min) newLevel = level.name;
            }

            const correctGrowth = parseFloat(maxGrowthAllowed.toFixed(3));
            await db.collection('trees').updateOne(
                { _id: tree._id },
                {
                    $set: {
                        growth: correctGrowth,
                        level: newLevel,
                        dailyGrowthGained: 4.762, // Max one day's worth
                        unlockedElements: [] // Reset unlocked elements too
                    }
                }
            );
            console.log(`Fixed: "${tree.treeName}" (Day ${daysGrowing}) | ${tree.growth}% → ${correctGrowth}% | ${tree.level} → ${newLevel}`);
            updated++;
        }
    }

    console.log(`\n✅ Done! Fixed ${updated} trees.`);
    process.exit(0);
}).catch(err => {
    console.error('DB Error:', err.message);
    process.exit(1);
});
