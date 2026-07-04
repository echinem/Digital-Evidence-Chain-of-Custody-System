const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generateReport } = require('../controllers/reportController');

router.use(protect);

// POST /api/reports/generate  — generate + download PDF
router.post('/generate', generateReport);

module.exports = router;
