const mongoose = require('mongoose');
const { User, SystemConfig } = require('./models/AllModels');
require('dotenv').config();

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("--- SYSTEM CONFIG ---");
    const config = await SystemConfig.findOne();
    console.log(config);

    console.log("\n--- RECENT USERS ---");
    const users = await User.find().sort({ createdAt: -1 }).limit(5);
    users.forEach(u => {
      console.log(`User: ${u.name} (${u.mobile}) | Blocked: ${u.isBlocked} | Flagged: ${u.isFlagged} | Role: ${u.role}`);
    });

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
diagnose();
