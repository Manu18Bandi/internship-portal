/**
 * Student profile routes
 *   GET    /api/students           → list students
 *   GET    /api/students/:id       → profile + skills + application stats
 *   PUT    /api/students/:id       → update profile
 */
const express = require('express');
const { query, execute } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/error');
const { requireIds, requireFields, optionalNumber } = require('../middleware/validate');

const router = express.Router();

/** GET /api/students */
router.get('/', asyncHandler(async (_req, res) => {
  const rows = await query(`
    SELECT s.*,
      (SELECT COUNT(*) FROM student_skills k  WHERE k.student_id = s.id) AS skill_count,
      (SELECT COUNT(*) FROM applications  a  WHERE a.student_id = s.id) AS application_count
    FROM students s ORDER BY s.id`);
  res.json({ data: rows });
}));

/** GET /api/students/:id — full profile with skills and stats */
router.get('/:id', requireIds('id'), asyncHandler(async (req, res) => {
  const [student] = await query('SELECT * FROM students WHERE id = ?', [req.params.id]);
  if (!student) throw new ApiError(404, `Student ${req.params.id} not found`);

  const [skills, stats] = await Promise.all([
    query(
      `SELECT k.id, k.name, k.category, sk.proficiency
         FROM student_skills sk JOIN skills k ON k.id = sk.skill_id
        WHERE sk.student_id = ? ORDER BY k.category, k.name`,
      [student.id]
    ),
    query(
      `SELECT status, COUNT(*) AS count FROM applications
        WHERE student_id = ? GROUP BY status`,
      [student.id]
    ),
  ]);

  res.json({
    data: {
      ...student,
      skills,
      stats: stats.reduce((acc, r) => ({ ...acc, [r.status]: r.count }), {}),
    },
  });
}));

/** PUT /api/students/:id — update editable profile fields */
router.put('/:id',
  requireIds('id'),
  requireFields('name', 'email', 'department'),
  optionalNumber('cgpa', { min: 0, max: 10 }),
  asyncHandler(async (req, res) => {
    const { name, email, phone, department, year, cgpa, bio } = req.body;

    const dup = await query('SELECT id FROM students WHERE email = ? AND id <> ?', [email, req.params.id]);
    if (dup.length) throw new ApiError(409, 'Email is already used by another student.');

    const result = await execute(
      `UPDATE students SET name=?, email=?, phone=?, department=?, year=?, cgpa=?, bio=?
        WHERE id = ?`,
      [name.trim(), email.trim(), phone || null, department.trim(), year || '3', cgpa ?? null, bio || null, req.params.id]
    );
    if (!result.affectedRows) throw new ApiError(404, `Student ${req.params.id} not found`);

    const [updated] = await query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    res.json({ data: updated });
  })
);

module.exports = router;
