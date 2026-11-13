/**
 * Application routes
 *   GET   /api/applications                      → all applications (admin view)
 *   GET   /api/students/:id/applications         → student's applications + internship info
 *   POST  /api/applications                      → apply { student_id, internship_id }
 *   PATCH /api/applications/:id/status           → update status (admin)
 *   DELETE /api/applications/:id                 → withdraw application
 */
const express = require('express');
const { query, execute } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/error');
const { requireIds, requireFields, requireEnum, assertExists, optionalNumber } = require('../middleware/validate');
const { requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');

const router = express.Router();

const STATUSES = ['Applied', 'Under Review', 'Selected', 'Rejected', 'Completed'];

// NOTE: this router is mounted at /api — all paths below include the full
// resource path to avoid ambiguity between nested and top-level resources.

/** GET /api/applications?status= — all applications (admin only when auth is on) */
router.get('/applications', requireAdmin, asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = status && STATUSES.includes(status) ? 'WHERE a.status = ?' : '';
  const params = status && STATUSES.includes(status) ? [status] : [];
  const rows = await query(
    `SELECT a.*, s.name AS student_name, s.email AS student_email,
            i.title AS internship_title, i.domain, i.duration_weeks,
            c.name AS company_name
       FROM applications a
       JOIN students s    ON s.id = a.student_id
       JOIN internships i ON i.id = a.internship_id
       JOIN companies c   ON c.id = i.company_id
       ${where} ORDER BY a.applied_at DESC`,
    params
  );
  res.json({ data: rows });
}));

/** GET /api/students/:id/applications — own list (self or admin) */
router.get('/students/:id/applications', requireIds('id'), requireSelfOrAdmin('id'), asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT a.*, i.title AS internship_title, i.domain, i.duration_weeks, i.stipend,
            i.deadline, c.name AS company_name, c.location AS company_location
       FROM applications a
       JOIN internships i ON i.id = a.internship_id
       JOIN companies c   ON c.id = i.company_id
      WHERE a.student_id = ? ORDER BY a.applied_at DESC`,
    [req.params.id]
  );
  res.json({ data: rows });
}));

/** POST /api/applications — apply to an internship (session's student; admins may apply for any) */
router.post('/applications',
  requireFields('internship_id'),
  assertExists('internships', 'internship_id', 'internship_id'),
  asyncHandler(async (req, res) => {
    // students always apply as themselves; admins may specify student_id
    const student_id = (req.auth && req.auth.role === 'admin' && req.body.student_id)
      ? req.body.student_id
      : (req.auth?.sid || req.body.student_id);
    const { internship_id } = req.body;

    const dup = await query(
      'SELECT id FROM applications WHERE student_id = ? AND internship_id = ?',
      [student_id, internship_id]
    );
    if (dup.length) throw new ApiError(409, 'You have already applied to this internship.');

    const [internship] = await query('SELECT deadline FROM internships WHERE id = ?', [internship_id]);
    if (new Date(internship.deadline) < new Date(new Date().toDateString())) {
      throw new ApiError(400, 'The application deadline for this internship has passed.');
    }

    const result = await execute(
      "INSERT INTO applications (student_id, internship_id, status) VALUES (?, ?, 'Applied')",
      [student_id, internship_id]
    );
    const [created] = await query('SELECT * FROM applications WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: created });
  })
);

/** PATCH /api/applications/:id/status — admin status management */
router.patch('/applications/:id/status',
  requireAdmin,
  requireIds('id'),
  requireFields('status'),
  requireEnum('status', STATUSES),
  asyncHandler(async (req, res) => {
    const result = await execute(
      'UPDATE applications SET status = ? WHERE id = ?',
      [req.body.status, req.params.id]
    );
    if (!result.affectedRows) throw new ApiError(404, `Application ${req.params.id} not found`);
    const [updated] = await query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    res.json({ data: updated });
  })
);

/** DELETE /api/applications/:id — withdraw (owner or admin) */
router.delete('/applications/:id', requireIds('id'), asyncHandler(async (req, res) => {
  // ownership check (skipped in demo mode / for admins)
  if (req.auth && req.auth.role !== 'admin') {
    const [app] = await query('SELECT student_id FROM applications WHERE id = ?', [req.params.id]);
    if (!app) throw new ApiError(404, `Application ${req.params.id} not found`);
    const [mine] = await query(
      'SELECT id FROM students WHERE user_id = ? AND id = ?',
      [req.auth.uid, app.student_id]
    );
    if (!mine) throw new ApiError(403, 'You can only withdraw your own applications');
  }
  const result = await execute('DELETE FROM applications WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, `Application ${req.params.id} not found`);
  res.json({ data: { deleted: true } });
}));

module.exports = router;
