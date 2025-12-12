const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    name: {
        type: String,
        required: true
    },
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    players: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        score: {
            type: Number,
            default: 0
        },
        answers: [{
            questionIndex: Number,
            selectedAnswer: Number,
            isCorrect: Boolean,
            points: Number,
            timeSpent: Number
        }],
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    maxPlayers: {
        type: Number,
        default: 10,
        min: 2,
        max: 50
    },
    status: {
        type: String,
        enum: ['waiting', 'in-progress', 'completed'],
        default: 'waiting'
    },
    currentQuestion: {
        type: Number,
        default: 0
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Generate unique room code
roomSchema.statics.generateRoomCode = async function () {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let exists = true;

    while (exists) {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        exists = await this.findOne({ roomCode: code });
    }

    return code;
};

module.exports = mongoose.model('Room', roomSchema);
