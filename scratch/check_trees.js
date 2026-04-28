const mongoose = require('mongoose');
const { User, Tree } = require('./treeniti-backend/models/AllModels');

async function check() {
  try {
    await mongoose.connect('mongodb+srv://admin:admin123@cluster0.4snx4gk.mongodb.net/treeniti?retryWrites=true&w=majority');
    const user = await User.findOne({ mobile: '9123456789' }); // I'll search by name if mobile is unknown, but usually Hridesh uses a specific name
    const users = await User.find({ name: /Hridesh/i });
    
    console.log('--- USER INFO ---');
    for (let u of users) {
        console.log(`User Found: ${u.name} (ID: ${u._id})`);
        const trees = await Tree.find({ userId: u._id });
        console.log(`Trees: ${trees.length}`);
        trees.forEach(t => console.log(` - ${t.treeName}: Level ${t.level}, Growth ${t.growth}%`));
    }
    process.exit();
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
check();
