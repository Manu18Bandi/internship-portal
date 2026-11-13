/**
 * Skills routes
 *   GET    /api/skills                        → master skill list (grouped by category)
 *   GET    /api/students/:id/skills           → student's skills
 *   POST   /api/students/:id/skills           → add skill to student { skill_id, proficiency }
 *   DELETE /api/students/:id/skills/:skillId  → remove skill from student
 */
const express = require('express');
const { query, execute } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/error');
const { requireIds, requireFields, requireEnum } = require('../middleware/validate');

const router = express.Router();
const PROFICIENCIES = ['Beginner', 'Intermediate', 'Advanced'];

/** GET /api/skills — master list */
router.get('/skills', asyncHandler(async (_req, res) => {
  const rows = await query('SELECT * FROM skills ORDER BY category, name');
  const grouped = rows.reduce((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});
  res.json({ data: { all: rows, grouped } });
}));

/** GET /api/students/:id/skills */
router.get('/students/:id/skills', requireIds('id'), asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT sk.name, sk.category, s2.proficiency, s2.skill_id AS id
       FROM student_skills s2
       JOIN skills sk ON sk.id = s2.skill_id
      WHERE s2.student_id = ? ORDER BY sk.category, sk.name`,
    [req.params.id]
  );
  res.json({ data: rows });
}));

/** POST /api/students/:id/skills — add a skill to a student */
router.post('/students/:id/skills',
  requireIds('id'),
  requireFields('skill_id'),
  requireEnum('proficiency', PROFICIENCIES, { optional: true }),
  asyncHandler(async (req, res) => {
    const skillId = req.body.skill_id;
    const proficiency = req.body.proficiency || 'Beginner';

    const [skill] = await query('SELECT id, name FROM skills WHERE id = ?', [skillId]);
    if (!skill) throw new ApiError(404, `Skill ${skillId} not found`);

    const dup = await query(
      'SELECT 1 FROM student_skills WHERE student_id = ? AND skill_id = ?',
      [req.params.id, skillId]
    );
    if (dup.length) throw new ApiError(409, `Skill "${skill.name}" is already added.`);

    await execute(
      'INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES (?, ?, ?)',
      [req.params.id, skillId, proficiency]
    );

    res.status(201).json({ data: { id: Number(skillId), name: skill.name, category: skill.category, proficiency } });
  })
);

/** DELETE /api/students/:id/skills/:skillId */
router.delete('/students/:id/skills/:skillId', requireIds('id', 'skillId'),
  asyncHandler(async (req, res) => {
    const result = await execute(
      'DELETE FROM student_skills WHERE student_id = ? AND skill_id = ?',
      [req.params.id, req.params.skillId]
    );
    if (!result.affectedRows) throw new ApiError(404, 'Skill not found for this student');
    res.json({ data: { deleted: true } });
  })
);

module.exports = router;
