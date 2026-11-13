/**
 * Multer configuration for certificate file uploads.
 * - Stored on disk in server/uploads/
 * - Only PDF/JPEG/PNG allowed, max size from .env (default 5 MB)
 * - Filename is sanitized + made unique to avoid collisions/overwrites
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ApiError } = require('./error');
require('dotenv').config();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-z0-9_-]/gi, '_')
      .slice(0, 60) || 'certificate';
    cb(null, `${base}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Invalid file type. Only PDF, JPG or PNG files are allowed.'));
    }
    cb(null, true);
  },
});

module.exports = { upload, uploadDir };
