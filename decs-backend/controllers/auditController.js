const AuditLog = require('../models/AuditLog');

// GET /api/audit  — paginated audit log (admin only)
const getAuditLogs = async (req, res) => {
  try {
    const { action, userId, evidenceId, page = 1, limit = 50, dateFrom, dateTo } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.performedBy = userId;
    if (evidenceId) filter.targetEvidence = evidenceId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(filter);

    const logs = await AuditLog.find(filter)
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email')
      .populate('targetEvidence', 'name caseId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      logs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAuditLogs };
