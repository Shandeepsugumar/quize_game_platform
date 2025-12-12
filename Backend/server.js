const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const session = require('express-session');

dotenv.config();

const app = express();

// Middleware - CORS Configuration (Development Mode)
app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true
}));

// Request logger
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body) : '');
    next();
});

app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: 'quiz-game-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Import Routes
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const roomRoutes = require('./routes/room');
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Quiz Game Server is running!' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Global Error Handler:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({
        message: 'Internal Server Error',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);
});
