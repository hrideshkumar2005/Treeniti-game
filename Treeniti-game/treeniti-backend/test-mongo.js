const mongoose = require('mongoose');
const uri = "mongodb+srv://hrideshkcp_db_user:Hridesh_2005@cluster0.4snx4gk.mongodb.net/Treeniti";

console.log("Testing connection...");
mongoose.connect(uri)
  .then(() => {
    console.log("✅ Successfully connected to MongoDB Atlas!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Connection failed:", err.message);
    process.exit(1);
  });
