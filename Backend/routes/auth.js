const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'quiz-game-jwt-secret-2024';

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Register
router.post('/register', async (req, res) => {
    try {
        console.log('📝 Registration attempt:', req.body);
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            console.log('⚠️ User already exists:', existingUser.email === email ? 'email' : 'username');
            return res.status(400).json({
                message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
            });
        }

        // Create user
        console.log('Creating new user...');
        const user = new User({
            username,
            email,
            password,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        });

        console.log('Saving user to database...');
        await user.save();
        console.log('✅ User saved successfully');

        // Generate token
        const token = generateToken(user._id);

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('❌ Register error:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(user._id);

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                totalScore: user.totalScore,
                gamesPlayed: user.gamesPlayed
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Google OAuth Login/Register
router.post('/google', async (req, res) => {
    try {
        console.log('🔐 Google OAuth request received');
        const { googleId, email, username, avatar } = req.body;
        console.log('📋 Google data:', { googleId, email, username });

        if (!googleId || !email) {
            console.error('❌ Missing required Google data');
            return res.status(400).json({ message: 'Google authentication data required' });
        }

        // Find or create user
        console.log('🔍 Searching for existing user...');
        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
            console.log('👤 User not found. Creating new user...');
            user = new User({
                googleId,
                email,
                username: username || email.split('@')[0],
                avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
            });
            await user.save();
            console.log('✅ New user created and saved to database!');
            console.log('   User ID:', user._id);
            console.log('   Username:', user.username);
            console.log('   Email:', user.email);
        } else if (!user.googleId) {
            console.log('🔗 Linking Google account to existing user...');
            // Link Google account to existing user
            user.googleId = googleId;
            if (avatar) user.avatar = avatar;
            await user.save();
            console.log('✅ Google account linked to existing user');
        } else {
            console.log('✅ Existing Google user found');
            console.log('   User ID:', user._id);
            console.log('   Username:', user.username);
        }

        // Generate token
        const token = generateToken(user._id);
        console.log('🎫 JWT token generated');

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        console.log('✅ Google authentication successful!');
        res.json({
            message: 'Google authentication successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                totalScore: user.totalScore,
                gamesPlayed: user.gamesPlayed
            }
        });
    } catch (error) {
        console.error('❌ Google auth error:', error);
        console.error('Error message:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ message: 'Server error during Google authentication' });
    }
});

// Get Current User
router.get('/me', authMiddleware, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                avatar: req.user.avatar,
                totalScore: req.user.totalScore,
                gamesPlayed: req.user.gamesPlayed,
                gamesWon: req.user.gamesWon
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update Profile
router.put('/update-profile', authMiddleware, async (req, res) => {
    try {
        const { username, avatar } = req.body;

        const updateData = {};
        if (username) updateData.username = username;
        if (avatar) updateData.avatar = avatar;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        ).select('-password');

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                totalScore: user.totalScore,
                gamesPlayed: user.gamesPlayed
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
});

module.exports = router;
