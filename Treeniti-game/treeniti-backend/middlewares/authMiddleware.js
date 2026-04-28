const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

const authMiddleware = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'Access denied. No token provided.' });

    const token = authHeader.replace('Bearer ', '');
    
    // 🛠️ Developer Bypass Logic (SRS 5)
    if (token === 'DEV_BYPASS_TOKEN') {
        const { User } = require('../models/AllModels');
        let devUser = await User.findOne({ mobile: '0000000000' }); 
        
        // Auto-Create Developer User if DB is empty
        if (!devUser) {
            devUser = new User({
                mobile: '0000000000',
                name: 'Developer Bypass',
                role: 'SuperAdmin',
                referralCode: 'DEV000'
            });
            await devUser.save();
        }

        req.user = { userId: devUser._id, role: devUser.role };
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; 

        // 🛡️ SRS 3.16: Enforce Account Restriction (Blocking)
        const { User } = require('../models/AllModels');
        const user = await User.findById(decoded.userId).select('isBlocked');
        if (user && user.isBlocked) {
             return res.status(403).json({ error: "Access Denied. Your account has been restricted by Admin for suspicious activity." });
        }

        next();
    } catch (ex) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

module.exports = authMiddleware;
