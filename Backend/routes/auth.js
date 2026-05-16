const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// No fallback secret — server.js enforces JWT_SECRET is set on startup
const JWT_SECRET = process.env.JWT_SECRET;

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Secure cookie options
const getCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

// Email validation regex
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Username validation (alphanumeric, underscores, hyphens, 3-30 chars)
const isValidUsername = (username) => /^[a-zA-Z0-9_-]{3,30}$/.test(username);

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (!isValidUsername(username)) {
            return res.status(400).json({ message: 'Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({
                message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
            });
        }

        // Create user
        const user = new User({
            username,
            email,
            password,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.cookie('token', token, getCookieOptions());

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
        console.error('❌ Register error:', error.message);
        res.status(500).json({ message: 'Server error during registration' });
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

        res.cookie('token', token, getCookieOptions());

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
        console.error('Login error:', error.message);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Google OAuth Login/Register
// ⚠️  WARNING: This route trusts the googleId from the client.
// For full production security, verify the Google ID token server-side
// using the 'google-auth-library' package before trusting the identity.
router.post('/google', async (req, res) => {
    try {
        const { googleId, email, username, avatar } = req.body;

        if (!googleId || !email) {
            return res.status(400).json({ message: 'Google authentication data required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Invalid email from Google' });
        }

        // Find or create user
        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
            const sanitizedUsername = (username || email.split('@')[0]).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
            user = new User({
                googleId,
                email,
                username: sanitizedUsername,
                avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
            });
            await user.save();
        } else if (!user.googleId) {
            // Link Google account to existing user
            user.googleId = googleId;
            if (avatar) user.avatar = avatar;
            await user.save();
        }

        // Generate token
        const token = generateToken(user._id);

        res.cookie('token', token, getCookieOptions());

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
        console.error('Google auth error:', error.message);
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
        console.error('Get user error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update Profile
router.put('/update-profile', authMiddleware, async (req, res) => {
    try {
        const { username, avatar } = req.body;

        const updateData = {};
        if (username) {
            if (!isValidUsername(username)) {
                return res.status(400).json({ message: 'Invalid username format' });
            }
            updateData.username = username;
        }
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
        console.error('Update profile error:', error.message);
        res.status(500).json({ message: 'Server error updating profile' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
});

module.exports = router;
