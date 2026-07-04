const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: [true, 'Case ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing for search efficiency
teamSchema.index({ caseId: 1 });
teamSchema.index({ members: 1 });

module.exports = mongoose.model('Team', teamSchema);
