const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const GameResult = require('../models/GameResult');
const authMiddleware = require('../middleware/auth');

// Submit Answer
router.post('/answer', authMiddleware, async (req, res) => {
    try {
        const { roomCode, questionIndex, selectedAnswer, timeSpent } = req.body;

        const room = await Room.findOne({ roomCode: roomCode.toUpperCase() })
            .populate('quiz');

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.status !== 'in-progress') {
            return res.status(400).json({ message: 'Game is not in progress' });
        }

        // Find player
        const playerIndex = room.players.findIndex(p => p.user.toString() === req.user._id.toString());
        if (playerIndex === -1) {
            return res.status(404).json({ message: 'Player not found in room' });
        }

        const question = room.quiz.questions[questionIndex];
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        const isCorrect = selectedAnswer === question.correctAnswer;

        // Time-based scoring: faster answers get more points
        let points = 0;
        if (isCorrect) {
            const basePoints = question.points;
            const timeLimit = question.timeLimit;

            // Calculate time bonus (0-50% bonus based on speed)
            // If answered instantly (0 seconds), get 50% bonus
            // If answered at time limit, get 0% bonus
            const timeRatio = Math.max(0, Math.min(1, timeSpent / timeLimit));
            const timeBonusMultiplier = 1 + (0.5 * (1 - timeRatio)); // 1.0 to 1.5x

            points = Math.round(basePoints * timeBonusMultiplier);
        }

        // Check if already answered
        const alreadyAnswered = room.players[playerIndex].answers.some(a => a.questionIndex === questionIndex);
        if (alreadyAnswered) {
            return res.status(400).json({ message: 'Already answered this question' });
        }

        // Add answer
        room.players[playerIndex].answers.push({
            questionIndex,
            selectedAnswer,
            isCorrect,
            points,
            timeSpent
        });

        room.players[playerIndex].score += points;

        await room.save();

        res.json({
            message: 'Answer submitted',
            isCorrect,
            points,
            correctAnswer: question.correctAnswer,
            totalScore: room.players[playerIndex].score
        });
    } catch (error) {
        console.error('Submit answer error:', error);
        res.status(500).json({ message: 'Server error submitting answer' });
    }
});

// Complete Game
router.post('/complete', authMiddleware, async (req, res) => {
    try {
        const { roomCode } = req.body;

        const room = await Room.findOne({ roomCode: roomCode.toUpperCase() })
            .populate('quiz players.user');

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the host can complete the game' });
        }

        room.status = 'completed';
        room.completedAt = new Date();

        // Calculate rankings
        const rankings = room.players
            .map(player => {
                const correctAnswers = player.answers.filter(a => a.isCorrect).length;
                const totalQuestions = room.quiz.questions.length;
                const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

                return {
                    user: player.user._id,
                    score: player.score,
                    correctAnswers,
                    totalQuestions,
                    accuracy
                };
            })
            .sort((a, b) => b.score - a.score)
            .map((player, index) => ({
                ...player,
                rank: index + 1
            }));

        // Save game result
        const gameResult = new GameResult({
            room: room._id,
            quiz: room.quiz._id,
            rankings,
            winner: rankings[0]?.user
        });

        await gameResult.save();

        // Update user statistics
        for (let ranking of rankings) {
            await User.findByIdAndUpdate(ranking.user, {
                $inc: {
                    totalScore: ranking.score,
                    gamesPlayed: 1,
                    gamesWon: ranking.rank === 1 ? 1 : 0
                }
            });
        }

        // Update quiz statistics
        await Quiz.findByIdAndUpdate(room.quiz._id, {
            $inc: { timesPlayed: 1 }
        });

        await room.save();

        res.json({
            message: 'Game completed',
            rankings
        });
    } catch (error) {
        console.error('Complete game error:', error);
        res.status(500).json({ message: 'Server error completing game' });
    }
});

// Get Game Results
router.get('/results/:roomCode', authMiddleware, async (req, res) => {
    try {
        console.log('📊 Fetching results for room:', req.params.roomCode);

        const room = await Room.findOne({ roomCode: req.params.roomCode.toUpperCase() })
            .populate('quiz')
            .populate('players.user', 'username avatar');

        if (!room) {
            console.log('❌ Room not found:', req.params.roomCode);
            return res.status(404).json({ message: 'Room not found' });
        }

        console.log('✅ Room found:', room.roomCode, 'Players:', room.players.length);

        const rankings = room.players
            .map(player => {
                const correctAnswers = player.answers.filter(a => a.isCorrect).length;
                const totalQuestions = room.quiz.questions ? room.quiz.questions.length : 0;
                const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

                return {
                    user: player.user,
                    score: player.score,
                    correctAnswers,
                    totalQuestions,
                    accuracy,
                    answers: player.answers
                };
            })
            .sort((a, b) => b.score - a.score)
            .map((player, index) => ({
                ...player,
                rank: index + 1
            }));

        console.log('✅ Rankings calculated:', rankings.length, 'players');

        res.json({
            room,
            rankings
        });
    } catch (error) {
        console.error('❌ Get results error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            message: 'Server error fetching results',
            error: error.message
        });
    }
});

module.exports = router;
