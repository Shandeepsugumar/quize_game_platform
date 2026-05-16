const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const helmet = require('helmet');
const NodeCache = require('node-cache');

dotenv.config();

// ── Validate required environment variables ──
const REQUIRED_ENV = ['MONGO_URL', 'JWT_SECRET', 'SESSION_SECRET'];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`❌ FATAL: Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

const cache = new NodeCache({ stdTTL: 60 });
module.exports.cache = cache;

const app = express();

// 1. Security headers
app.use(helmet());

// 2. CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://quize-game-platform-eg2y.vercel.app',
    credentials: true
}));
app.use(compression());

// 3. Body parsers with size limit to prevent payload DoS
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// 4. Request logger (sanitized — never log passwords or sensitive data)
app.use((req, res, next) => {
    const sanitizedBody = req.body ? { ...req.body } : {};
    // Remove sensitive fields from logs
    delete sanitizedBody.password;
    delete sanitizedBody.token;
    delete sanitizedBody.googleId;
    console.log(`📨 ${req.method} ${req.path}`, Object.keys(sanitizedBody).length > 0 ? JSON.stringify(sanitizedBody) : '');
    next();
});

// 5. Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// 6. MongoDB connection
const MONGO_URL = process.env.MONGO_URL;
console.log('🔌 Attempting MongoDB connection...');
console.log('🔌 MONGO_URL exists:', !!MONGO_URL);

mongoose.connect(MONGO_URL, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
})
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
    });

// MongoDB connection event listeners
mongoose.connection.on('connected', () => console.log('🟢 Mongoose connected to MongoDB'));
mongoose.connection.on('error', (err) => console.error('🔴 Mongoose connection error:', err.message));
mongoose.connection.on('disconnected', () => console.log('🟠 Mongoose disconnected from MongoDB'));

// 7. Rate limiter BEFORE routes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, slow down!' }
});
app.use('/api/', limiter);

// 8. Routes
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const roomRoutes = require('./routes/room');
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');
const aiRoutes = require('./routes/ai');

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/ai', aiRoutes);

// 9. Health check
app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    res.json({
        status: 'OK',
        message: 'Quiz Game Server is running!',
        database: dbStateMap[dbState] || 'unknown',
        dbState,
        timestamp: new Date()
    });
});

// 10. Global error handler — always last
app.use((err, req, res, next) => {
    console.error('❌ Global Error Handler:', err.message);
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({
        message: 'Internal Server Error',
        ...(isDev && { error: err.message, stack: err.stack })
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);
});