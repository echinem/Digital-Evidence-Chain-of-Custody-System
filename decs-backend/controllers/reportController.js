const Evidence = require('../models/Evidence');
const CustodyLog = require('../models/CustodyLog');
const { generateForensicPDF } = require('../utils/pdf');
const { createAuditLog } = require('../middleware/audit');

// POST /api/reports/generate  — stream a PDF to the client
const generateReport = async (req, res) => {
  const { caseId, dateFrom, dateTo, reportType, evidenceStatus, integrityStatus } = req.body;

  try {
    // Build evidence filter
    const filter = { isDeleted: false };

    if (req.user.role !== 'admin') {
      filter.$or = [
        { currentCustodian: req.user._id },
        { uploadedBy: req.user._id },
      ];
    }

    if (caseId) filter.caseId = { $regex: caseId.trim(), $options: 'i' };
    if (evidenceStatus) filter.status = evidenceStatus;
    if (integrityStatus) filter.integrityStatus = integrityStatus;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59));
    }

    const evidenceList = await Evidence.find(filter)
      .populate('currentCustodian uploadedBy', 'name email role')
      .sort({ caseId: 1, createdAt: 1 });

    if (evidenceList.length === 0) {
      return res.status(404).json({ success: false, message: 'No evidence records found for the specified criteria.' });
    }

    // Fetch all custody logs for these evidence items
    const evidenceIds = evidenceList.map(e => e._id);
    const custodyLogs = await CustodyLog.find({ evidence: { $in: evidenceIds } })
      .populate('fromUser toUser performedBy', 'name email')
      .sort({ createdAt: 1 });

    // Set PDF response headers
    const filename = `forensic_report_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Generate and stream PDF directly to response
    generateForensicPDF({
      evidenceList,
      custodyLogs,
      generatedBy: req.user,
      params: { caseId, dateFrom, dateTo, reportType, evidenceStatus },
      outputStream: res,
    });

    await createAuditLog({
      action: 'REPORT_GENERATED',
      performedBy: req.user._id,
      details: `Generated ${reportType || 'full'} report — ${evidenceList.length} evidence records — Case: ${caseId || 'All'}`,
      ipAddress: req.ip,
    });
  } catch (error) {
    console.error('Report error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Report generation failed: ' + error.message });
    }
  }
};

module.exports = { generateReport };
