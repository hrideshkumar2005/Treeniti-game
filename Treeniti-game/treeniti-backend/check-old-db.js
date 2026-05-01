const mongoose = require('mongoose');
const { User } = require('./models/AllModels');

async function checkOld() {
  const oldUri = "mongodb+srv://treenitiofficial_db_user:BnlvaPISaeTzDcAi@cluster0.vb1i7yp.mongodb.net/Treeniti";
  try {
    await mongoose.connect(oldUri);
    const count = await User.countDocuments();
    console.log(`--- OLD CLUSTER STATUS ---`);
    console.log(`Users found: ${count}`);
    if (count > 0) {
        const sample = await User.findOne().select('name mobile');
        console.log(`Sample User: ${sample.name} (${sample.mobile})`);
    }
    process.exit(0);
  } catch(e) {
    console.error("❌ Old cluster inaccessible:", e.message);
    process.exit(1);
  }
}
checkOld();
