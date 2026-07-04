const mongoose = require('mongoose');

const integrityLogSchema = new mongoose.Schema(
  {
    evidence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evidence',
      required: true,
    },
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storedHash: {
      type: String,
      required: true,
    },
    calculatedHash: {
      type: String,
      required: true,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    algorithm: {
      type: String,
      default: 'SHA-256',
    },
    ipAddress: {
      type: String,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

integrityLogSchema.index({ evidence: 1, createdAt: -1 });
integrityLogSchema.index({ passed: 1 });

module.exports = mongoose.model('IntegrityLog', integrityLogSchema);
