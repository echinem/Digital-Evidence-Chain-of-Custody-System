const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'USER_LOGIN',
        'USER_LOGOUT',
        'USER_LOGIN_FAILED',
        'USER_LOCKED',
        'USER_CREATE',
        'USER_UPDATE',
        'USER_DELETE',
        'USER_UNLOCK',
        'EVIDENCE_UPLOAD',
        'EVIDENCE_VIEW',
        'EVIDENCE_DOWNLOAD',
        'CUSTODY_TRANSFER',
        'INTEGRITY_CHECK',
        'INTEGRITY_FAILED',
        'REPORT_GENERATED',
        'REPORT_DOWNLOADED',
        'TEAM_CREATE',
        'TEAM_UPDATE',
        'TEAM_DELETE',
      ],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    targetEvidence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evidence',
      default: null,
    },
    details: {
      type: String,
      maxlength: 1000,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
      select: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Audit logs are immutable
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs are immutable');
});
auditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs are immutable');
});

auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
