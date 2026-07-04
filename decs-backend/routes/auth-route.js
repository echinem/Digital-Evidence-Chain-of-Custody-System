console.log('AUTH ROUTES LOADED');

const express = require('express');
const router = express.Router();
const { login, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/logout  (requires token)
router.post('/logout', protect, logout);

// GET /api/auth/me
router.get('/me', protect, getMe);

router.get('/test', (req, res) => {
  res.json({ message: 'auth router working' });
});

module.exports = router;
