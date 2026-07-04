const AuditLog = require('../models/AuditLog');

// Helper to create an audit log entry
const createAuditLog = async ({
  action,
  performedBy = null,
  targetUser = null,
  targetEvidence = null,
  details = '',
  ipAddress = '',
  userAgent = '',
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      action,
      performedBy,
      targetUser,
      targetEvidence,
      details,
      ipAddress,
      userAgent,
      metadata,
    });
  } catch (err) {
    // Audit log failure should never crash the main request
    console.error('⚠️  Audit log write failed:', err.message);
  }
};

// Express middleware factory
const auditMiddleware = (action, getDetails) => {
  return async (req, res, next) => {
    // Attach audit helper to request for controllers to use
    req.audit = {
      log: (overrides = {}) =>
        createAuditLog({
          action,
          performedBy: req.user?._id || null,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
          details: typeof getDetails === 'function' ? getDetails(req) : getDetails || '',
          ...overrides,
        }),
    };
    next();
  };
};

module.exports = { createAuditLog, auditMiddleware };
