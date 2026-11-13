/**
 * Certificate routes (with real file upload via multer)
 *   GET    /api/students/:id/certificates  → list certificates
 *   POST   /api/students/:id/certificates  → create (multipart/form-data: file?, title, issuer, issue_date)
 *   GET    /api/certificates/:id/file      → stream the uploaded file
 *   DELETE /api/certificates/:id           → delete certificate (+ file on disk)
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { query, execute } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/error');
const { requireIds, requireFields } = require('../middleware/validate');
const { upload, uploadDir } = require('../middleware/upload');

const router = express.Router();

// NOTE: mounted at /api — paths below are full resource paths.

/** GET /api/students/:id/certificates */
router.get('/students/:id/certificates', requireIds('id'), asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT id, title, issuer, issue_date, file_path, created_at
       FROM certificates WHERE student_id = ? ORDER BY issue_date DESC`,
    [req.params.id]
  );
  res.json({ data: rows });
}));

/** POST /api/students/:id/certificates — multipart with optional file */
router.post('/students/:id/certificates',
  requireIds('id'),
  upload.single('file'),
  requireFields('title', 'issuer', 'issue_date'),
  asyncHandler(async (req, res) => {
    if (Number.isNaN(Date.parse(req.body.issue_date))) {
      throw new ApiError(400, 'Validation failed', { fields: { issue_date: 'issue_date must be a valid date (YYYY-MM-DD)' } });
    }
    const { title, issuer, issue_date: issueDate } = req.body;
    const filePath = req.file ? `uploads/${req.file.filename}` : null;

    const result = await execute(
      'INSERT INTO certificates (student_id, title, issuer, issue_date, file_path) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, title.trim(), issuer.trim(), issueDate, filePath]
    );
    const [created] = await query('SELECT * FROM certificates WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: created });
  })
);

/** GET /api/certificates/:id/file — download/preview the stored file */
router.get('/certificates/:id/file', requireIds('id'), asyncHandler(async (req, res, next) => {
  const [cert] = await query('SELECT file_path, title FROM certificates WHERE id = ?', [req.params.id]);
  if (!cert) throw new ApiError(404, `Certificate ${req.params.id} not found`);
  if (!cert.file_path) throw new ApiError(404, 'This certificate has no attached file');

  const absolute = path.join(__dirname, '..', cert.file_path);
  if (!fs.existsSync(absolute)) throw new ApiError(404, 'File missing on server');

  res.sendFile(absolute, {
    headers: { 'Content-Disposition': `inline; filename="certificate-${req.params.id}${path.extname(absolute)}"` },
  }, (err) => { if (err) next(err); });
}));

/** DELETE /api/certificates/:id — also removes file from disk */
router.delete('/certificates/:id', requireIds('id'), asyncHandler(async (req, res) => {
  const [cert] = await query('SELECT file_path FROM certificates WHERE id = ?', [req.params.id]);
  if (!cert) throw new ApiError(404, `Certificate ${req.params.id} not found`);

  await execute('DELETE FROM certificates WHERE id = ?', [req.params.id]);

  if (cert.file_path) {
    const absolute = path.join(__dirname, '..', cert.file_path);
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  }
  res.json({ data: { deleted: true } });
}));

module.exports = { router, uploadDir };
