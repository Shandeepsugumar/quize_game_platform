const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Quiz = require('../models/Quiz');
const authMiddleware = require('../middleware/auth');

// Create Room
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { name, quizId, maxPlayers } = req.body;

        if (!name || !quizId) {
            return res.status(400).json({ message: 'Room name and quiz are required' });
        }

        // Check if quiz exists
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // Generate unique room code
        const roomCode = await Room.generateRoomCode();

        const room = new Room({
            roomCode,
            name,
            quiz: quizId,
            host: req.user._id,
            maxPlayers: maxPlayers || 10,
            players: [{
                user: req.user._id,
                score: 0,
                answers: []
            }]
        });

        await room.save();
        await room.populate('quiz host players.user', 'title username avatar');

        res.status(201).json({
            message: 'Room created successfully',
            room
        });
    } catch (error) {
        console.error('Create room error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        res.status(500).json({
            message: 'Server error creating room',
            error: error.message
        });
    }
});

// Join Room
router.post('/join', authMiddleware, async (req, res) => {
    try {
        const { roomCode } = req.body;

        if (!roomCode) {
            return res.status(400).json({ message: 'Room code is required' });
        }

        const room = await Room.findOne({ roomCode: roomCode.toUpperCase() })
            .populate('quiz host players.user', 'title username avatar');

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.status !== 'waiting') {
            return res.status(400).json({ message: 'Game already in progress or completed' });
        }

        if (room.players.length >= room.maxPlayers) {
            return res.status(400).json({ message: 'Room is full' });
        }

        // Check if user already in room
        const alreadyJoined = room.players.some(p => p.user._id.toString() === req.user._id.toString());
        if (alreadyJoined) {
            return res.json({ message: 'Already in room', room });
        }

        room.players.push({
            user: req.user._id,
            score: 0,
            answers: []
        });

        await room.save();
        await room.populate('players.user', 'username avatar');

        res.json({
            message: 'Joined room successfully',
            room
        });
    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json({ message: 'Server error joining room' });
    }
});

// Get Room
router.get('/:roomCode', authMiddleware, async (req, res) => {
    try {
        const room = await Room.findOne({ roomCode: req.params.roomCode.toUpperCase() })
            .populate('quiz host players.user', 'title questions username avatar');

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        res.json({ room });
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({ message: 'Server error fetching room' });
    }
});

// Toggle Power-Ups
router.post('/:roomCode/toggle-powerups', authMiddleware, async (req, res) => {
    try {
        const { powerUpsEnabled } = req.body;

        const room = await Room.findOne({ roomCode: req.params.roomCode.toUpperCase() })
            .populate('quiz host players.user', 'title username avatar');

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.host._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the host can toggle power-ups' });
        }

        if (room.status !== 'waiting') {
            return res.status(400).json({ message: 'Cannot change power-ups after game has started' });
        }

        room.powerUpsEnabled = powerUpsEnabled;
        await room.save();

        res.json({
            message: `Power-ups ${powerUpsEnabled ? 'enabled' : 'disabled'}`,
            room
        });
    } catch (error) {
        console.error('Toggle power-ups error:', error);
        res.status(500).json({ message: 'Server error toggling power-ups' });
    }
});

// Start Game
router.post('/:roomCode/start', authMiddleware, async (req, res) => {
    try {
        const room = await Room.findOne({ roomCode: req.params.roomCode.toUpperCase() })
            .populate('quiz');

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the host can start the game' });
        }

        if (room.players.length < 1) {
            return res.status(400).json({ message: 'At least 1 player required to start' });
        }

        room.status = 'in-progress';
        room.startedAt = new Date();
        room.currentQuestion = 0;

        await room.save();

        res.json({
            message: 'Game started',
            room
        });
    } catch (error) {
        console.error('Start game error:', error);
        res.status(500).json({ message: 'Server error starting game' });
    }
});

// Get Active Rooms
router.get('/active/all', async (req, res) => {
    try {
        const rooms = await Room.find({ status: 'waiting' })
            .populate('quiz host', 'title username avatar')
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({ rooms });
    } catch (error) {
        console.error('Get active rooms error:', error);
        res.status(500).json({ message: 'Server error fetching rooms' });
    }
});

module.exports = router;
