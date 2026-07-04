const mongoose = require('mongoose');

const custodyLogSchema = new mongoose.Schema(
  {
    evidence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evidence',
      required: true,
    },
    action: {
      type: String,
      enum: ['uploaded', 'transferred', 'verified', 'archived', 'integrity_failed', 'accessed'],
      required: true,
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    hashAtTime: {
      type: String, // snapshot of hash at the time of this event
    },
    ipAddress: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // any extra data
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Custody logs are immutable — prevent updates and deletes
custodyLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Custody logs are immutable and cannot be modified');
});

custodyLogSchema.pre('updateOne', function () {
  throw new Error('Custody logs are immutable and cannot be modified');
});

custodyLogSchema.index({ evidence: 1, createdAt: -1 });
custodyLogSchema.index({ performedBy: 1 });
custodyLogSchema.index({ action: 1 });

module.exports = mongoose.model('CustodyLog', custodyLogSchema);
