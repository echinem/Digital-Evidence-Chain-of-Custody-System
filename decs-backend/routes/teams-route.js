const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
} = require('../controllers/teamController');

// All team routes require authentication
router.use(protect);

router.get('/', getTeams);
router.get('/:id', getTeamById);

// Write routes restricted to admin
router.post('/', restrictTo('admin'), createTeam);
router.put('/:id', restrictTo('admin'), updateTeam);
router.delete('/:id', restrictTo('admin'), deleteTeam);

module.exports = router;
