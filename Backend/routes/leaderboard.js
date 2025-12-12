const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameResult = require('../models/GameResult');

// Get Global Leaderboard
router.get('/global', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

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
            winRate: user.gamesPlayed > 0 ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) : 0
        }));

        res.json({ leaderboard: formattedLeaderboard });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ message: 'Server error fetching leaderboard' });
    }
});

// Get Recent Games
router.get('/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const recentGames = await GameResult.find()
            .populate('quiz', 'title category difficulty')
            .populate('rankings.user', 'username avatar')
            .populate('winner', 'username avatar')
            .sort({ playedAt: -1 })
            .limit(limit);

        res.json({ recentGames });
    } catch (error) {
        console.error('Get recent games error:', error);
        res.status(500).json({ message: 'Server error fetching recent games' });
    }
});

// Get User Stats
router.get('/user/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('username avatar totalScore gamesPlayed gamesWon');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get user's rank
        const higherScoreCount = await User.countDocuments({ totalScore: { $gt: user.totalScore } });
        const rank = higherScoreCount + 1;

        // Get user's recent games
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
            winRate: user.gamesPlayed > 0 ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) : 0,
            recentGames
        };

        res.json({ stats });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ message: 'Server error fetching user stats' });
    }
});

module.exports = router;
