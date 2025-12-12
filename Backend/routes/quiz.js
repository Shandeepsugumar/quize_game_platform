const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const authMiddleware = require('../middleware/auth');

// Create Quiz
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { title, description, category, difficulty, questions } = req.body;

        // Validation
        if (!title || !category || !difficulty || !questions || questions.length === 0) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate questions
        for (let q of questions) {
            if (!q.question || !q.options || q.options.length !== 4 || q.correctAnswer === undefined) {
                return res.status(400).json({ message: 'Each question must have a question text, 4 options, and a correct answer' });
            }
        }

        const quiz = new Quiz({
            title,
            description,
            category,
            difficulty,
            questions,
            createdBy: req.user._id
        });

        await quiz.save();

        res.status(201).json({
            message: 'Quiz created successfully',
            quiz
        });
    } catch (error) {
        console.error('Create quiz error:', error);
        res.status(500).json({ message: 'Server error creating quiz' });
    }
});

// Get All Quizzes
router.get('/all', async (req, res) => {
    try {
        const { category, difficulty, search } = req.query;

        let filter = { isPublic: true };

        if (category && category !== 'All') {
            filter.category = category;
        }

        if (difficulty && difficulty !== 'All') {
            filter.difficulty = difficulty;
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const quizzes = await Quiz.find(filter)
            .populate('createdBy', 'username avatar')
            .sort({ createdAt: -1 });

        res.json({ quizzes });
    } catch (error) {
        console.error('Get quizzes error:', error);
        res.status(500).json({ message: 'Server error fetching quizzes' });
    }
});

// Get Quiz by ID
router.get('/:id', async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id)
            .populate('createdBy', 'username avatar');

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        res.json({ quiz });
    } catch (error) {
        console.error('Get quiz error:', error);
        res.status(500).json({ message: 'Server error fetching quiz' });
    }
});

// Get My Quizzes
router.get('/my/quizzes', authMiddleware, async (req, res) => {
    try {
        const quizzes = await Quiz.find({ createdBy: req.user._id })
            .sort({ createdAt: -1 });

        res.json({ quizzes });
    } catch (error) {
        console.error('Get my quizzes error:', error);
        res.status(500).json({ message: 'Server error fetching quizzes' });
    }
});

// Delete Quiz
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        if (quiz.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this quiz' });
        }

        await quiz.deleteOne();

        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Delete quiz error:', error);
        res.status(500).json({ message: 'Server error deleting quiz' });
    }
});

module.exports = router;
