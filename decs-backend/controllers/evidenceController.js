const { uploadFile, deleteFile } = require("../services/s3Service");
const fs = require('fs');
const path = require('path');
const Evidence = require('../models/Evidence');
const CustodyLog = require('../models/CustodyLog');
const IntegrityLog = require('../models/IntegrityLog');
const User = require('../models/User');
const { hashFile, verifyFileHash } = require('../utils/hash');
const { createAuditLog } = require('../middleware/audit');
const { sendCustodyTransferEmail, sendIntegrityAlertEmail } = require('../utils/email');

// POST /api/evidence  — upload one or more files
const uploadEvidence = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded.' });
  }

  const { name, description, caseId, acquisitionDate, fileType } = req.body;

  if (!name || !caseId || !acquisitionDate || !fileType) {
    // Clean up uploaded files
    req.files.forEach(f => fs.unlink(f.path, () => { }));
    return res.status(400).json({ success: false, message: 'name, caseId, acquisitionDate, and fileType are required.' });
  }

  try {
    const results = [];

    for (const file of req.files) {
      // Compute real SHA-256 hash using Node.js crypto streaming
      const hash = await hashFile(file.path);

      // Check for duplicate hash (same file already in system)
      const existing = await Evidence.findOne({ hash });
      if (existing) {
        fs.unlink(file.path, () => { });
        results.push({ file: file.originalname, error: 'Duplicate: file with identical hash already exists', existingId: existing._id });
        continue;
      }

      let s3Result;
      let evidence;

      try {
        s3Result = await uploadFile(file, caseId);
        evidence = await Evidence.create({
          name: req.files.length === 1 ? name : `${name} — ${file.originalname}`,
          description,
          caseId: caseId.toUpperCase(),
          acquisitionDate: new Date(acquisitionDate),
          fileType,
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          s3Key: s3Result.key,
          fileSize: file.size,
          mimeType: file.mimetype,
          hash,
          hashAlgorithm: 'SHA-256',
          currentCustodian: req.user._id,
          uploadedBy: req.user._id,
        });
      } catch (err) {
        if (s3Result) {
          await deleteFile(s3Result.key);
        }
        throw err;
      }



      //fs.unlink(file.path, () => { });

      // Record custody log
      await CustodyLog.create({
        evidence: evidence._id,
        action: 'uploaded',
        toUser: req.user._id,
        performedBy: req.user._id,
        reason: 'Initial evidence upload',
        hashAtTime: hash,
        ipAddress: req.ip,
      });

      await createAuditLog({
        action: 'EVIDENCE_UPLOAD',
        performedBy: req.user._id,
        targetEvidence: evidence._id,
        details: `Uploaded evidence: ${evidence.name} (${evidence._id}) | SHA-256: ${hash}`,
        ipAddress: req.ip,
      });

      results.push({ file: file.originalname, evidence: await evidence.populate('currentCustodian uploadedBy', 'name email role') });
    }

    res.status(201).json({
      success: true,
      message: `${results.filter(r => r.evidence).length} file(s) uploaded successfully.`,
      results,
    });
  } catch (error) {
    // Clean up files on error
    req.files.forEach(f => fs.unlink(f.path, () => { }));
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed: ' + error.message });
  }
};

// GET /api/evidence  — list evidence (admin sees all, investigator sees own)
const getEvidence = async (req, res) => {
  try {
    const { caseId, status, integrityStatus, search, page = 1, limit = 20 } = req.query;

    const filter = { isDeleted: false };

    // Investigators only see evidence they're associated with
    if (req.user.role !== 'admin') {
      filter.$or = [
        { currentCustodian: req.user._id },
        { uploadedBy: req.user._id },
      ];
    }

    if (caseId) filter.caseId = { $regex: caseId, $options: 'i' };
    if (status) filter.status = status;
    if (integrityStatus) filter.integrityStatus = integrityStatus;
    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { caseId: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Evidence.countDocuments(filter);
    const evidenceList = await Evidence.find(filter)
      .populate('currentCustodian uploadedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      evidence: evidenceList,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/evidence/:id  — single evidence with custody logs
const getEvidenceById = async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id)
      .populate('currentCustodian uploadedBy', 'name email role');

    if (!evidence || evidence.isDeleted) {
      return res.status(404).json({ success: false, message: 'Evidence not found.' });
    }

    // Investigators can only view their assigned evidence
    if (req.user.role !== 'admin') {
      const isAssigned =
        String(evidence.currentCustodian._id) === String(req.user._id) ||
        String(evidence.uploadedBy._id) === String(req.user._id);
      if (!isAssigned) {
        return res.status(403).json({ success: false, message: 'Access denied to this evidence.' });
      }
    }

    const custodyLogs = await CustodyLog.find({ evidence: evidence._id })
      .populate('fromUser toUser performedBy', 'name email role')
      .sort({ createdAt: -1 });

    const integrityLogs = await IntegrityLog.find({ evidence: evidence._id })
      .populate('checkedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    await createAuditLog({
      action: 'EVIDENCE_VIEW',
      performedBy: req.user._id,
      targetEvidence: evidence._id,
      details: `Viewed evidence: ${evidence.name}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, evidence, custodyLogs, integrityLogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/evidence/:id/transfer  — transfer custody
const transferCustody = async (req, res) => {
  const { toUserId, reason } = req.body;

  if (!toUserId || !reason) {
    return res.status(400).json({ success: false, message: 'toUserId and reason are required.' });
  }

  try {
    const evidence = await Evidence.findById(req.params.id)
      .populate('currentCustodian', 'name email');

    if (!evidence || evidence.isDeleted) {
      return res.status(404).json({ success: false, message: 'Evidence not found.' });
    }

    // Only current custodian or admin can transfer
    if (req.user.role !== 'admin' && String(evidence.currentCustodian._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not the current custodian of this evidence.' });
    }

    const toUser = await User.findById(toUserId);
    if (!toUser || toUser.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Recipient user not found or inactive.' });
    }

    if (String(toUserId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Cannot transfer evidence to yourself.' });
    }

    const fromUser = evidence.currentCustodian;

    // Update evidence custodian
    evidence.currentCustodian = toUserId;
    evidence.status = 'transferred';
    await evidence.save();

    // Record immutable custody log
    await CustodyLog.create({
      evidence: evidence._id,
      action: 'transferred',
      fromUser: req.user._id,
      toUser: toUserId,
      performedBy: req.user._id,
      reason,
      hashAtTime: evidence.hash,
      ipAddress: req.ip,
    });

    await createAuditLog({
      action: 'CUSTODY_TRANSFER',
      performedBy: req.user._id,
      targetEvidence: evidence._id,
      details: `Transferred ${evidence.name} from ${fromUser.name} to ${toUser.name}`,
      ipAddress: req.ip,
    });

    // Send email notifications (non-blocking)
    const admins = await User.find({ role: 'admin', status: 'active' });
    const adminEmails = admins.map(a => a.email);
    sendCustodyTransferEmail({ fromUser, toUser, evidence, reason, adminEmails }).catch(console.error);

    res.status(200).json({
      success: true,
      message: 'Custody transferred successfully.',
      evidence: await evidence.populate('currentCustodian', 'name email role'),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/evidence/:id/verify  — verify SHA-256 integrity
const verifyIntegrity = async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id).select('+filePath');

    if (!evidence || evidence.isDeleted) {
      return res.status(404).json({ success: false, message: 'Evidence not found.' });
    }

    // Check file exists on disk
    if (!fs.existsSync(evidence.filePath)) {
      return res.status(404).json({ success: false, message: 'Evidence file not found on storage. It may have been moved or deleted.' });
    }

    // Re-compute SHA-256 hash
    const { match, calculatedHash, storedHash } = await verifyFileHash(evidence.filePath, evidence.hash);

    // Update evidence integrity status
    evidence.integrityLastChecked = new Date();
    evidence.integrityStatus = match ? 'intact' : 'compromised';
    if (!match) evidence.status = 'compromised';
    await evidence.save();

    // Record integrity log
    await IntegrityLog.create({
      evidence: evidence._id,
      checkedBy: req.user._id,
      storedHash,
      calculatedHash,
      passed: match,
      ipAddress: req.ip,
    });

    // Record custody log
    await CustodyLog.create({
      evidence: evidence._id,
      action: match ? 'verified' : 'integrity_failed',
      performedBy: req.user._id,
      reason: match
        ? 'Integrity verification passed — SHA-256 hashes match'
        : '⚠️ INTEGRITY FAILED — SHA-256 hashes do not match',
      hashAtTime: calculatedHash,
      ipAddress: req.ip,
    });

    await createAuditLog({
      action: match ? 'INTEGRITY_CHECK' : 'INTEGRITY_FAILED',
      performedBy: req.user._id,
      targetEvidence: evidence._id,
      details: `Integrity check for ${evidence.name} — ${match ? 'PASSED' : 'FAILED'}`,
      ipAddress: req.ip,
    });

    // Alert admins on failure
    if (!match) {
      const admins = await User.find({ role: 'admin', status: 'active' });
      sendIntegrityAlertEmail({
        adminEmails: admins.map(a => a.email),
        evidence,
        checkedBy: req.user,
      }).catch(console.error);
    }

    res.status(200).json({
      success: true,
      match,
      storedHash,
      calculatedHash,
      integrityStatus: evidence.integrityStatus,
      checkedAt: evidence.integrityLastChecked,
      message: match
        ? 'Evidence integrity verified — SHA-256 hashes match.'
        : '⚠️ Evidence integrity COMPROMISED — hashes do not match.',
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ success: false, message: 'Verification failed: ' + error.message });
  }
};

// POST /api/evidence/batch-verify  — verify multiple evidence items
const batchVerify = async (req, res) => {
  const { evidenceIds } = req.body;
  if (!evidenceIds || !Array.isArray(evidenceIds)) {
    return res.status(400).json({ success: false, message: 'evidenceIds array required.' });
  }

  const results = [];
  for (const id of evidenceIds) {
    try {
      const evidence = await Evidence.findById(id).select('+filePath');
      if (!evidence || !fs.existsSync(evidence.filePath)) {
        results.push({ id, error: 'File not found' });
        continue;
      }
      const { match, calculatedHash } = await verifyFileHash(evidence.filePath, evidence.hash);
      evidence.integrityLastChecked = new Date();
      evidence.integrityStatus = match ? 'intact' : 'compromised';
      if (!match) evidence.status = 'compromised';
      await evidence.save();

      await IntegrityLog.create({ evidence: evidence._id, checkedBy: req.user._id, storedHash: evidence.hash, calculatedHash, passed: match, ipAddress: req.ip });
      results.push({ id, name: evidence.name, match, integrityStatus: evidence.integrityStatus });
    } catch (err) {
      results.push({ id, error: err.message });
    }
  }

  res.status(200).json({ success: true, results });
};

module.exports = { uploadEvidence, getEvidence, getEvidenceById, transferCustody, verifyIntegrity, batchVerify };
