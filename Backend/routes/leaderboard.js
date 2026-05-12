const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameResult = require('../models/GameResult');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 60 }); // 60 second cache

// Get Global Leaderboard
router.get('/global', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const cacheKey = `leaderboard_global_${limit}`;

        // Check cache first
        const cached = cache.get(cacheKey);
        if (cached) {
            console.log('📦 Global leaderboard served from cache');
            return res.json(cached);
        }

        const leaderboard = await User.find()
            .select('username avatar totalScore gamesPlayed gamesWon')
            .sort({ totalScore: -1 })
            .limit(limit);

        const formattedLeaderboard = leaderboard.map((user, index) => ({
            rank: index + 1,
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar
            },
            totalScore: user.totalScore,
            gamesPlayed: user.gamesPlayed,
            gamesWon: user.gamesWon,
            winRate: user.gamesPlayed > 0
                ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1)
                : 0
        }));

        const result = { leaderboard: formattedLeaderboard };
        cache.set(cacheKey, result); // store in cache
        res.json(result);

    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ message: 'Server error fetching leaderboard' });
    }
});

// Get Recent Games
router.get('/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const cacheKey = `leaderboard_recent_${limit}`;

        // Check cache first
        const cached = cache.get(cacheKey);
        if (cached) {
            console.log('📦 Recent games served from cache');
            return res.json(cached);
        }

        const recentGames = await GameResult.find()
            .populate('quiz', 'title category difficulty')
            .populate('rankings.user', 'username avatar')
            .populate('winner', 'username avatar')
            .sort({ playedAt: -1 })
            .limit(limit);

        const result = { recentGames };
        cache.set(cacheKey, result); // store in cache
        res.json(result);

    } catch (error) {
        console.error('Get recent games error:', error);
        res.status(500).json({ message: 'Server error fetching recent games' });
    }
});

// Get User Stats
router.get('/user/:userId', async (req, res) => {
    try {
        const cacheKey = `leaderboard_user_${req.params.userId}`;

        // Check cache first
        const cached = cache.get(cacheKey);
        if (cached) {
            console.log(`📦 User stats for ${req.params.userId} served from cache`);
            return res.json(cached);
        }

        const user = await User.findById(req.params.userId)
            .select('username avatar totalScore gamesPlayed gamesWon');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const higherScoreCount = await User.countDocuments({
            totalScore: { $gt: user.totalScore }
        });
        const rank = higherScoreCount + 1;

        const recentGames = await GameResult.find({ 'rankings.user': user._id })
            .populate('quiz', 'title category')
            .sort({ playedAt: -1 })
            .limit(5);

        const stats = {
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar
            },
            rank,
            totalScore: user.totalScore,
            gamesPlayed: user.gamesPlayed,
            gamesWon: user.gamesWon,
            winRate: user.gamesPlayed > 0
                ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1)
                : 0,
            recentGames
        };

        const result = { stats };
        cache.set(cacheKey, result); // store in cache
        res.json(result);

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ message: 'Server error fetching user stats' });
    }
});

// ✅ Helper — call this from game.js after a game ends to clear stale cache
router.clearLeaderboardCache = (userId) => {
    cache.del(`leaderboard_global_10`);
    cache.del(`leaderboard_global_20`);
    cache.del(`leaderboard_recent_10`);
    cache.del(`leaderboard_recent_20`);
    if (userId) cache.del(`leaderboard_user_${userId}`);
    console.log('🗑️ Leaderboard cache cleared');
};

module.exports = router;