/**
 * Internship routes
 *   GET    /api/internships     → list, supports ?domain= &search= &open=true
 *   GET    /api/internships/domains → distinct domain list (for filter chips)
 *   GET    /api/internships/:id → single internship + company info + application count
 *   POST   /api/internships     → create (admin)
 *   PUT    /api/internships/:id → update (admin)
 *   DELETE /api/internships/:id → delete (admin)
 */
const express = require('express');
const { query, execute } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/error');
const { requireIds, requireFields, optionalNumber } = require('../middleware/validate');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

/** Builds WHERE clauses + params for list filters. */
function buildFilters({ domain, search, open }) {
  const where = [];
  const params = [];
  if (domain && domain !== 'All') { where.push('i.domain = ?'); params.push(domain); }
  if (open === 'true') { where.push('i.deadline >= CURDATE()'); }
  if (search) {
    where.push('(i.title LIKE ? OR c.name LIKE ? OR i.domain LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

/** GET /api/internships/domains — must be declared before /:id */
router.get('/domains', asyncHandler(async (_req, res) => {
  const rows = await query('SELECT DISTINCT domain FROM internships ORDER BY domain');
  res.json({ data: rows.map((r) => r.domain) });
}));

/** GET /api/internships */
router.get('/', asyncHandler(async (req, res) => {
  const { clause, params } = buildFilters(req.query);
  const rows = await query(
    `SELECT i.*, c.name AS company_name, c.location AS company_location, c.industry,
       (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS applicant_count
       FROM internships i JOIN companies c ON c.id = i.company_id
       ${clause} ORDER BY i.deadline ASC`,
    params
  );
  res.json({ data: rows, count: rows.length });
}));

/** GET /api/internships/:id */
router.get('/:id', requireIds('id'), asyncHandler(async (req, res) => {
  const [row] = await query(
    `SELECT i.*, c.name AS company_name, c.location AS company_location, c.website AS company_website,
       (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS applicant_count
       FROM internships i JOIN companies c ON c.id = i.company_id
       WHERE i.id = ?`,
    [req.params.id]
  );
  if (!row) throw new ApiError(404, `Internship ${req.params.id} not found`);
  res.json({ data: row });
}));

/** Validates deadline is a proper future-ish date string. */
function parseDeadline(body) {
  if (!body.deadline || Number.isNaN(Date.parse(body.deadline))) {
    throw new ApiError(400, 'Validation failed', { fields: { deadline: 'deadline must be a valid date (YYYY-MM-DD)' } });
  }
  return body.deadline;
}

/** POST /api/internships (admin only when auth is on) */
router.post('/',
  requireAdmin,
  requireFields('company_id', 'title', 'domain', 'deadline'),
  optionalNumber('stipend', { min: 0 }),
  optionalNumber('duration_weeks', { min: 1 }),
  optionalNumber('seats', { min: 1 }),
  asyncHandler(async (req, res) => {
    const deadline = parseDeadline(req.body);
    const { company_id, title, domain, description } = req.body;
    const duration = req.body.duration_weeks || 8;
    const stipend = req.body.stipend ?? 0;
    const seats = req.body.seats || 1;

    const [company] = await query('SELECT id FROM companies WHERE id = ?', [company_id]);
    if (!company) throw new ApiError(400, 'Validation failed', { fields: { company_id: 'company does not exist' } });

    const result = await execute(
      `INSERT INTO internships (company_id, title, domain, description, duration_weeks, stipend, seats, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_id, title.trim(), domain.trim(), description || null, duration, stipend, seats, deadline]
    );
    const [created] = await query('SELECT * FROM internships WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: created });
  })
);

/** PUT /api/internships/:id (admin only when auth is on) */
router.put('/:id',
  requireAdmin,
  requireIds('id'),
  requireFields('title', 'domain'),
  asyncHandler(async (req, res) => {
    const deadline = parseDeadline(req.body);
    const { title, domain, description, company_id } = req.body;
    const duration = req.body.duration_weeks || 8;
    const stipend = req.body.stipend ?? 0;
    const seats = req.body.seats || 1;

    const result = await execute(
      `UPDATE internships
          SET company_id=?, title=?, domain=?, description=?, duration_weeks=?, stipend=?, seats=?, deadline=?
        WHERE id = ?`,
      [company_id || 1, title.trim(), domain.trim(), description || null, duration, stipend, seats, deadline, req.params.id]
    );
    if (!result.affectedRows) throw new ApiError(404, `Internship ${req.params.id} not found`);
    const [updated] = await query('SELECT * FROM internships WHERE id = ?', [req.params.id]);
    res.json({ data: updated });
  })
);

/** DELETE /api/internships/:id (admin only when auth is on) */
router.delete('/:id', requireAdmin, requireIds('id'), asyncHandler(async (req, res) => {
  const result = await execute('DELETE FROM internships WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, `Internship ${req.params.id} not found`);
  res.json({ data: { deleted: true } });
}));

module.exports = router;
