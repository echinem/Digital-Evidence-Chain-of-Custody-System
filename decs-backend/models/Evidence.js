const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Evidence name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    caseId: {
      type: String,
      required: [true, 'Case ID is required'],
      trim: true,
      uppercase: true,
    },
    acquisitionDate: {
      type: Date,
      required: [true, 'Acquisition date is required'],
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      enum: [
        'disk-image',
        'mobile-extraction',
        'network-capture',
        'browser-data',
        'log-archive',
        'memory-dump',
        'email-archive',
        'database-dump',
        'multimedia',
        'other',
      ],
    },
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
      select: false, // internal server path, not exposed to clients
    },
    fileSize: {
      type: Number, // in bytes
      required: true,
    },
    mimeType: {
      type: String,
    },
    hash: {
      type: String,
      required: true,
      unique: true,
    },
    hashAlgorithm: {
      type: String,
      default: 'SHA-256',
    },
    status: {
      type: String,
      enum: ['active', 'transferred', 'verified', 'archived', 'compromised'],
      default: 'active',
    },
    integrityStatus: {
      type: String,
      enum: ['unverified', 'intact', 'compromised'],
      default: 'unverified',
    },
    integrityLastChecked: {
      type: Date,
      default: null,
    },
    currentCustodian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [String],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    retentionDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
evidenceSchema.index({ caseId: 1 });
evidenceSchema.index({ currentCustodian: 1 });
evidenceSchema.index({ uploadedBy: 1 });
evidenceSchema.index({ status: 1 });

// Virtual for human-readable file size
evidenceSchema.virtual('fileSizeFormatted').get(function () {
  const bytes = this.fileSize;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
});

evidenceSchema.set('toJSON', { virtuals: true });
evidenceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Evidence', evidenceSchema);
