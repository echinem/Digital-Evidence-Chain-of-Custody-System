const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  unlockUser,
} = require('../controllers/userController');

// User listing is allowed for authenticated investigators and admins
router.get('/', protect, getUsers);

// Mutation operations are strictly admin only
router.post('/', protect, restrictTo('admin'), createUser);
router.get('/:id', protect, restrictTo('admin'), getUserById);
router.put('/:id', protect, restrictTo('admin'), updateUser);
router.delete('/:id', protect, restrictTo('admin'), deleteUser);
router.post('/:id/unlock', protect, restrictTo('admin'), unlockUser);

module.exports = router;
