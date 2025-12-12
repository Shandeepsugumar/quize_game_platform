const mongoose = require('mongoose');

const gameResultSchema = new mongoose.Schema({
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    rankings: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        score: Number,
        correctAnswers: Number,
        totalQuestions: Number,
        accuracy: Number,
        rank: Number
    }],
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    playedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('GameResult', gameResultSchema);
