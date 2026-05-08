const express = require('express');
const router = express.Router();
const User = require('../models/User');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @route   POST /api/auth/check-email
// @desc    Check if email exists and return user info if found
// @access   Public
router.post('/check-email', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      // User exists - return minimal info for frontend
      res.json({ 
        exists: true,
        user: {
          username: user.username,
          authMethod: user.authMethod,
          avatar: user.avatar
        }
      });
    } else {
      // User doesn't exist
      res.json({ 
        exists: false,
        user: null 
      });
    }
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access   Public
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email' });
    }

    // Check if user already exists
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const usernameExists = await User.findOne({ username: username.toLowerCase() });
    if (usernameExists) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create user
    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      authMethod: 'email'
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access   Public
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email' });
    }

    // Find user with password
    const user = await User.findByEmailWithPassword(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access   Private
router.get('/me', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod,
        avatar: user.avatar,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/auth/google
// @desc    Authenticate with Google
// @access   Public
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// @route   GET /api/auth/google/callback
// @desc    Google auth callback
// @access   Public
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?auth=error&message=Google authentication failed`,
    session: false 
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user._id);
      const redirectUrl = `${process.env.FRONTEND_URL}/login?auth=success&token=${token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?auth=error&message=Authentication failed`);
    }
  }
);

// @route   GET /api/auth/discord
// @desc    Authenticate with Discord
// @access   Public
router.get('/discord', passport.authenticate('discord', {
  scope: ['identify', 'email']
}));

// @route   GET /api/auth/discord/callback
// @desc    Discord auth callback
// @access   Public
router.get('/discord/callback',
  passport.authenticate('discord', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?auth=error&message=Discord authentication failed`,
    session: false 
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user._id);
      const redirectUrl = `${process.env.FRONTEND_URL}/login?auth=success&token=${token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Discord callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?auth=error&message=Authentication failed`);
    }
  }
);

// @route   GET /api/auth/github
// @desc    Authenticate with GitHub
// @access   Public
router.get('/github', passport.authenticate('github', {
  scope: ['user:email']
}));

// @route   GET /api/auth/github/callback
// @desc    GitHub auth callback
// @access   Public
router.get('/github/callback',
  passport.authenticate('github', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?auth=error&message=GitHub authentication failed`,
    session: false 
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user._id);
      const redirectUrl = `${process.env.FRONTEND_URL}/login?auth=success&token=${token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('GitHub callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?auth=error&message=Authentication failed`);
    }
  }
);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access   Private
router.post('/logout', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
