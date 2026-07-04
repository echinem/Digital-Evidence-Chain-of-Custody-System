const Team = require('../models/Team');
const User = require('../models/User');
const { createAuditLog } = require('../middleware/audit');

// POST /api/teams - Create a team (Admin only)
const createTeam = async (req, res) => {
  const { caseId, members } = req.body;

  if (!caseId || !members || !Array.isArray(members)) {
    return res.status(400).json({ success: false, message: 'caseId and members (array) are required.' });
  }

  try {
    const uppercaseCaseId = caseId.trim().toUpperCase();

    // Check if team already exists for this case
    const existing = await Team.findOne({ caseId: uppercaseCaseId });
    if (existing) {
      return res.status(400).json({ success: false, message: `A team already exists for Case ID: ${uppercaseCaseId}.` });
    }

    const team = await Team.create({
      caseId: uppercaseCaseId,
      members,
      createdBy: req.user._id,
    });

    await createAuditLog({
      action: 'TEAM_CREATE',
      performedBy: req.user._id,
      details: `Created team for case ${uppercaseCaseId} with ${members.length} members`,
      ipAddress: req.ip,
      metadata: { caseId: uppercaseCaseId, membersCount: members.length },
    });

    const populatedTeam = await team.populate('members', 'name email role status lastLogin');

    res.status(201).json({ success: true, message: 'Team created successfully.', team: populatedTeam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/teams - Get all teams (Admin sees all, investigator sees their teams)
const getTeams = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'admin') {
      filter.members = req.user._id;
    }

    const teams = await Team.find(filter)
      .populate('members', 'name email role status lastLogin')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, total: teams.length, teams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/teams/:id - Get single team
const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members', 'name email role status lastLogin')
      .populate('createdBy', 'name email');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    // Access control
    if (req.user.role !== 'admin' && !team.members.some(m => String(m._id) === String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Access denied to this team.' });
    }

    res.status(200).json({ success: true, team });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/teams/:id - Update team (Admin only)
const updateTeam = async (req, res) => {
  const { caseId, members } = req.body;

  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    if (caseId) {
      const uppercaseCaseId = caseId.trim().toUpperCase();
      if (uppercaseCaseId !== team.caseId) {
        // Check uniqueness if caseId changes
        const existing = await Team.findOne({ caseId: uppercaseCaseId });
        if (existing) {
          return res.status(400).json({ success: false, message: `A team already exists for Case ID: ${uppercaseCaseId}.` });
        }
        team.caseId = uppercaseCaseId;
      }
    }

    if (members && Array.isArray(members)) {
      team.members = members;
    }

    await team.save();

    await createAuditLog({
      action: 'TEAM_UPDATE',
      performedBy: req.user._id,
      details: `Updated team for case ${team.caseId}. Members count: ${team.members.length}`,
      ipAddress: req.ip,
      metadata: { caseId: team.caseId, membersCount: team.members.length },
    });

    const populatedTeam = await team.populate('members', 'name email role status lastLogin');

    res.status(200).json({ success: true, message: 'Team updated successfully.', team: populatedTeam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/teams/:id - Delete team (Admin only)
const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    const caseId = team.caseId;
    await Team.findByIdAndDelete(req.params.id);

    await createAuditLog({
      action: 'TEAM_DELETE',
      performedBy: req.user._id,
      details: `Disbanded/deleted team for case ${caseId}`,
      ipAddress: req.ip,
      metadata: { caseId },
    });

    res.status(200).json({ success: true, message: `Team for case ${caseId} has been disbanded.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createTeam, getTeams, getTeamById, updateTeam, deleteTeam };
