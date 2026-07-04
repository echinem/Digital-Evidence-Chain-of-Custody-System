const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage config — use disk storage with unique filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `evidence-${uniqueSuffix}${ext}`);
  },
});

// File type validation — accept all file types for digital evidence
const fileFilter = (req, file, cb) => {
  // Block only known dangerous executable types that aren't evidence
  const blockedTypes = [];
  if (blockedTypes.includes(file.mimetype)) {
    return cb(new Error('File type not permitted'), false);
  }
  cb(null, true);
};

const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10);

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSizeMB * 1024 * 1024,
    files: 10, // max 10 files per request
  },
});

// Error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${maxSizeMB}MB.`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files per upload.',
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};

module.exports = { upload, handleMulterError };
