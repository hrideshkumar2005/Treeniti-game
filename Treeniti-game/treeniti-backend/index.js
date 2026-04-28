require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const connectDB = require('./config/db');

const app = express();
app.use(helmet());
app.use(compression());
app.use(cors());

// Debug Middleware to log requests
app.use((req, res, next) => {
    console.log(`📥 Incoming ${req.method} to ${req.path}`);
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// 🛡️ Security Sanitization (MUST be after body-parsers)
// app.use(mongoSanitize()); 
// app.use(xss()); 


// Route Imports
const authRoutes = require('./routes/authRoutes');
const treeRoutes = require('./routes/treeRoutes');
const walletRoutes = require('./routes/walletRoutes');
const adminRoutes = require('./routes/adminRoutes');
const articleRoutes = require('./routes/articleRoutes');
const socialRoutes = require('./routes/socialRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const securityRoutes = require('./routes/securityRoutes');

// 🛡️ SRS 3.16 Security Middlewares
const {
    globalRateLimit,
    antiBotGuard,
    earningLimitGuard,
    riskScorer,
    mechanicalPatternGuard,
    deviceConsistencyGuard
} = require('./middlewares/securityMiddleware');

// 🌐 Global Rate Limit: Apply to ALL routes (120 req/min per IP)
app.use(globalRateLimit);

// Connect to MongoDB
connectDB();

// API Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Treeniti API is running' }));

// 🔐 Auth Routes (OTP rate limiting applied inside authRoutes.js)
app.use('/api/auth', authRoutes);

// 🌳 Tree Routes: anti-bot + earning guard on all tree actions
app.use('/api/tree', antiBotGuard, mechanicalPatternGuard, deviceConsistencyGuard, earningLimitGuard, riskScorer, treeRoutes);

// 💰 Wallet Routes: earning guard + risk scorer on all wallet actions
app.use('/api/wallet', antiBotGuard, mechanicalPatternGuard, deviceConsistencyGuard, earningLimitGuard, riskScorer, walletRoutes);

// 📰 Article Routes: earning guard
app.use('/api/articles', antiBotGuard, earningLimitGuard, articleRoutes);

// 👥 Social Routes: earning guard
app.use('/api/social', antiBotGuard, earningLimitGuard, socialRoutes);

// 🛡️ Security Routes (CAPTCHAs etc)
app.use('/api/security', securityRoutes);

// 🏆 Admin & Leaderboard (no earning guard needed)
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/activities', require('./routes/activityRoutes'));

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.log('❌ ERROR PATH:', req.path);
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Treeniti Backend Server is running on http://0.0.0.0:${PORT}`);
    console.log(`📡 Access it via your local IP: http://10.129.101.46:${PORT}`);
    console.log(`🛡️  Security Layer: Active (Rate Limiting + Anti-Bot + Earning Guards)\n`);
});