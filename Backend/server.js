const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// 1. CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://quize-game-platform-eg2y.vercel.app',
    credentials: true
}));

// 2. Body parsers FIRST
app.use(express.json());
app.use(cookieParser());

// 3. Request logger AFTER body is parsed
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body) : '');
    next();
});

// 4. Session with persistent store
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URL }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// 5. MongoDB connection
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

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
    res.json({ status: 'OK', message: 'Quiz Game Server is running!', timestamp: new Date() });
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