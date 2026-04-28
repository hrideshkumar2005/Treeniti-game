// Jab koi user coins earn karega, tab ye function chalega
const distributeCommission = async (userId, earnedAmount) => {
  // 1. Find User B (Jisne earn kiya)
  const userB = await User.findByPk(userId);
  
  if (userB.referredBy) {
    // 2. Find User A (B ka referrer) - Get 5%
    const userA = await User.findByPk(userB.referredBy);
    const commA = earnedAmount * 0.05;
    await userA.increment('wallet', { by: commA });

    if (userA.referredBy) {
      // 3. Find User A ka referrer (Upper Level) - Get 2%
      const userParentA = await User.findByPk(userA.referredBy);
      const commParent = earnedAmount * 0.02;
      await userParentA.increment('wallet', { by: commParent });
    }
  }
};