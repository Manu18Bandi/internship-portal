/**
 * Company routes (admin-facing CRUD)
 *   GET    /api/companies        → list companies (+ internship counts)
 *   GET    /api/companies/:id    → single company
 *   POST   /api/companies        → create company
 *   PUT    /api/companies/:id    → update company
 *   DELETE /api/companies/:id    → delete company (cascades internships)
 */
const express = require('express');
const { query, execute } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/error');
const { requireIds, requireFields } = require('../middleware/validate');

const router = express.Router();

/** GET /api/companies */
router.get('/', asyncHandler(async (_req, res) => {
  const rows = await query(`
    SELECT c.*,
      (SELECT COUNT(*) FROM internships i WHERE i.company_id = c.id) AS internship_count
    FROM companies c ORDER BY c.name`);
  res.json({ data: rows });
}));

/** GET /api/companies/:id */
router.get('/:id', requireIds('id'), asyncHandler(async (req, res) => {
  const [row] = await query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
  if (!row) throw new ApiError(404, `Company ${req.params.id} not found`);
  res.json({ data: row });
}));

/** POST /api/companies */
router.post('/', requireFields('name'), asyncHandler(async (req, res) => {
  const { name, industry, location, website } = req.body;
  const result = await execute(
    'INSERT INTO companies (name, industry, location, website) VALUES (?, ?, ?, ?)',
    [name.trim(), industry || null, location || null, website || null]
  );
  const [created] = await query('SELECT * FROM companies WHERE id = ?', [result.insertId]);
  res.status(201).json({ data: created });
}));

/** PUT /api/companies/:id */
router.put('/:id', requireIds('id'), requireFields('name'), asyncHandler(async (req, res) => {
  const { name, industry, location, website } = req.body;
  const result = await execute(
    'UPDATE companies SET name=?, industry=?, location=?, website=? WHERE id = ?',
    [name.trim(), industry || null, location || null, website || null, req.params.id]
  );
  if (!result.affectedRows) throw new ApiError(404, `Company ${req.params.id} not found`);
  const [updated] = await query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
  res.json({ data: updated });
}));

/** DELETE /api/companies/:id */
router.delete('/:id', requireIds('id'), asyncHandler(async (req, res) => {
  const result = await execute('DELETE FROM companies WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, `Company ${req.params.id} not found`);
  res.json({ data: { deleted: true } });
}));

module.exports = router;
