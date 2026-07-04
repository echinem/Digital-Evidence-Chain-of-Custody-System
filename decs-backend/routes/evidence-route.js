const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const {
  uploadEvidence,
  getEvidence,
  getEvidenceById,
  transferCustody,
  verifyIntegrity,
  batchVerify,
} = require('../controllers/evidenceController');

// All evidence routes require authentication
router.use(protect);

// GET  /api/evidence          — list evidence
router.get('/', getEvidence);

// POST /api/evidence          — upload one or more files (investigators + admins)
router.post(
  '/',
  restrictTo('admin', 'investigator'),
  upload.array('files', 10),
  handleMulterError,
  uploadEvidence
);

// POST /api/evidence/batch-verify  — batch integrity check
router.post('/batch-verify', batchVerify);

// GET  /api/evidence/:id      — single evidence detail + custody logs
router.get('/:id', getEvidenceById);

// POST /api/evidence/:id/transfer  — transfer custody
router.post('/:id/transfer', restrictTo('admin', 'investigator'), transferCustody);

// POST /api/evidence/:id/verify   — verify SHA-256 integrity
router.post('/:id/verify', verifyIntegrity);

module.exports = router;
