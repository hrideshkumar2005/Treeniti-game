const { User } = require('../models/AllModels');

const adminMiddleware = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || (user.role !== 'Admin' && user.role !== 'SuperAdmin')) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: 'Internal server error during authorization.' });
    }
};

module.exports = adminMiddleware;
