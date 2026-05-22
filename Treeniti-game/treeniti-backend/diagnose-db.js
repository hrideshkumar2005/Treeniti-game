const mongoose = require('mongoose');
const { User, SystemConfig } = require('./models/AllModels');
require('dotenv').config();

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const { Tree } = require('./models/AllModels');
    console.log("--- SYSTEM CONFIG ---");
    const config = await SystemConfig.findOne();
    console.log(config);

    console.log("\n--- RECENT USERS & THEIR TREES ---");
    const users = await User.find().sort({ createdAt: -1 }).limit(10);
    for (let u of users) {
      const trees = await Tree.find({ userId: u._id });
      console.log(`User: ${u.name} (${u.mobile}) | Coins: ${u.walletCoins} | Trees Count: ${trees.length}`);
      trees.forEach((t, i) => {
        console.log(`  -> Tree [${i+1}]: Name: "${t.treeName}" | Level: "${t.level}" | Growth: ${t.growth}% | isHarvested: ${t.isHarvested}`);
      });
    }

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
diagnose();
