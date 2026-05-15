const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const NodeCache = require('node-cache');  

dotenv.config();

const cache = new NodeCache({ stdTTL: 60 });
module.exports.cache = cache; 

const app = express();

// 1. CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://quize-game-platform-eg2y.vercel.app',
    credentials: true
}));
app.use(compression()); 

// 2. Body parsers FIRST
app.use(express.json());
app.use(cookieParser());

// 3. Request logger AFTER body is parsed
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body) : '');
    next();
});

// 4. Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'quiz-game-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// 5. MongoDB connection
const MONGO_URL = process.env.MONGO_URL;
console.log('🔌 Attempting MongoDB connection...');
console.log('🔌 MONGO_URL exists:', !!MONGO_URL);
console.log('🔌 MONGO_URL prefix:', MONGO_URL ? MONGO_URL.substring(0, 30) + '...' : 'NOT SET');

mongoose.connect(MONGO_URL, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
})
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.error('❌ Full error:', err);
    });

// MongoDB connection event listeners
mongoose.connection.on('connected', () => console.log('🟢 Mongoose connected to MongoDB'));
mongoose.connection.on('error', (err) => console.error('🔴 Mongoose connection error:', err.message));
mongoose.connection.on('disconnected', () => console.log('🟠 Mongoose disconnected from MongoDB'));

// 6. Rate limiter BEFORE routes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, slow down!' }
});
app.use('/api/', limiter);

// 7. Routes
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const roomRoutes = require('./routes/room');
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// 8. Health check
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

// 9. Global error handler — always last
app.use((err, req, res, next) => {
    console.error('❌ Global Error Handler:', err.message);
    res.status(500).json({
        message: 'Internal Server Error',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);
});