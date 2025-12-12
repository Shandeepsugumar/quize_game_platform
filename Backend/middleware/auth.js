const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'quiz-game-jwt-secret-2024';

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

        if (!token) {
            console.log('❌ No token found in request');
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            console.log('❌ User not found for token');
            return res.status(401).json({ message: 'User not found' });
        }

        console.log('✅ User authenticated:', user.username);
        req.user = user;
        next();
    } catch (error) {
        console.log('❌ Auth error:', error.message);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;
