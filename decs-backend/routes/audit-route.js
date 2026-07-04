const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditController');

// Admin only
router.use(protect, restrictTo('admin'));

router.get('/', getAuditLogs);

module.exports = router;
