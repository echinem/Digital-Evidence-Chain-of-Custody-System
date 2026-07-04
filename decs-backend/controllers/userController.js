const User = require('../models/User');
const Team = require('../models/Team');
const { createAuditLog } = require('../middleware/audit');

// GET /api/users
const getUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Investigator access control: limit to self and teammates on their cases
    if (req.user.role !== 'admin') {
      const myTeams = await Team.find({ members: req.user._id });
      const teammateIds = new Set();
      teammateIds.add(String(req.user._id));
      myTeams.forEach(t => {
        t.members.forEach(m => teammateIds.add(String(m)));
      });
      filter._id = { $in: Array.from(teammateIds) };
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    // Populate team cases associated with each user
    const allTeams = await Team.find({});
    const usersWithCases = users.map(u => {
      const uObj = u.toObject();
      const sharedCases = allTeams
        .filter(t => t.members.some(m => String(m) === String(u._id)))
        .map(t => t.caseId);
      uObj.sharedCases = sharedCases;
      return uObj;
    });

    res.status(200).json({ success: true, total: usersWithCases.length, users: usersWithCases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/users  — admin creates a user
const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'name, email, password, and role are required.' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      createdBy: req.user._id,
    });

    await createAuditLog({
      action: 'USER_CREATE',
      performedBy: req.user._id,
      targetUser: user._id,
      details: `Created user: ${user.name} (${user.role})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'User created successfully.', user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already exists.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/users/:id  — admin edits a user
const updateUser = async (req, res) => {
  const { name, role, status } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Prevent admins from demoting themselves
    if (String(req.params.id) === String(req.user._id) && role && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'You cannot change your own role.' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (role) updates.role = role;
    if (status) updates.status = status;

    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

    await createAuditLog({
      action: 'USER_UPDATE',
      performedBy: req.user._id,
      targetUser: user._id,
      details: `Updated user: ${user.name} — changed: ${Object.keys(updates).join(', ')}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'User updated successfully.', user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/users/:id  — soft delete (deactivate)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    user.status = 'inactive';
    await user.save({ validateBeforeSave: false });

    await createAuditLog({
      action: 'USER_DELETE',
      performedBy: req.user._id,
      targetUser: user._id,
      details: `Deactivated user: ${user.name}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: `User ${user.name} has been deactivated.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/users/:id/unlock  — unlock a locked account
const unlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.status = 'active';
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save({ validateBeforeSave: false });

    await createAuditLog({
      action: 'USER_UNLOCK',
      performedBy: req.user._id,
      targetUser: user._id,
      details: `Unlocked account: ${user.name}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: `${user.name}'s account unlocked.`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser, unlockUser };
