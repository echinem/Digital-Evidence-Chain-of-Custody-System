const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { createAuditLog } = require('../middleware/audit');

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    // Find user with password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +status +failedLoginAttempts +lockedUntil');

    if (!user) {
      await createAuditLog({
        action: 'USER_LOGIN_FAILED',
        details: `Failed login attempt for unknown email: ${email}`,
        ipAddress: req.ip,
      });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check if account is inactive
    if (user.status === 'inactive') {
      return res.status(401).json({ success: false, message: 'Account has been deactivated. Contact administrator.' });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      await createAuditLog({
        action: 'USER_LOGIN_FAILED',
        performedBy: user._id,
        details: `Login attempt on locked account: ${email}`,
        ipAddress: req.ip,
      });
      return res.status(401).json({
        success: false,
        message: 'Account is locked due to multiple failed attempts. Contact administrator.',
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementFailedAttempts();
      const remaining = Math.max(0, 3 - user.failedLoginAttempts);

      await createAuditLog({
        action: 'USER_LOGIN_FAILED',
        performedBy: user._id,
        details: `Incorrect password. ${remaining} attempt(s) remaining.`,
        ipAddress: req.ip,
      });

      if (user.status === 'locked') {
        await createAuditLog({
          action: 'USER_LOCKED',
          performedBy: user._id,
          details: 'Account locked after 3 failed login attempts',
          ipAddress: req.ip,
        });
        return res.status(401).json({
          success: false,
          message: 'Account locked after 3 failed attempts. Contact administrator.',
        });
      }

      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${remaining} attempt(s) remaining before lockout.`,
      });
    }

    // Successful login
    await user.resetFailedAttempts();
    const token = generateToken(user._id);

    await createAuditLog({
      action: 'USER_LOGIN',
      performedBy: user._id,
      details: `${user.role === 'admin' ? 'Administrator' : 'Investigator'} logged in`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  await createAuditLog({
    action: 'USER_LOGOUT',
    performedBy: req.user._id,
    details: 'User logged out',
    ipAddress: req.ip,
  });
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, user });
};

module.exports = { login, logout, getMe };
