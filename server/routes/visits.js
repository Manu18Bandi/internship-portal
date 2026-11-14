/**
 * Visit tracking routes (keep-alive + analytics)
 *   POST /api/visits/ping?source=cron|user  → record a visit (cron pings every 5 min)
 *   GET  /api/visits/summary                → totals for display
 *
 * The external cron (GitHub Actions) pings this endpoint every 5 minutes so the
 * Render free-tier service stays awake; a row is stored even when 0 users visited.
 */
const express = require('express');
const { query, execute } = require('../config/db');
const { asyncHandler } = require('../middleware/error');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const SOURCES = ['cron', 'user'];

// Optional hardening: when CRON_TOKEN is set (server env), cron-sourced pings
// must present a matching ?token= value (GitHub Actions passes it via the
// CRON_TOKEN secret). User pings stay open — the browser holds no secrets.
const CRON_TOKEN = process.env.CRON_TOKEN || '';

/** POST /api/visits/ping — record one visit */
router.post('/visits/ping', asyncHandler(async (req, res) => {
  const source = SOURCES.includes(req.query.source) ? req.query.source
    : SOURCES.includes(req.body?.source) ? req.body.source : 'user';

  if (CRON_TOKEN && source === 'cron' && req.query.token !== CRON_TOKEN) {
    return res.status(401).json({ error: { message: 'Invalid cron token' } });
  }

  let stored = false;
  try {
    await execute('INSERT INTO visits (source) VALUES (?)', [source]);
    stored = true;
  } catch (err) {
    // DB unreachable (e.g. pending cloud DB setup) — never fail the keep-alive ping
    console.error('[visits] ping not stored:', err.code || err.message);
  }
  res.json({ data: { ok: true, source, stored, at: new Date().toISOString() } });
}));

/** GET /api/visits/summary — totals (session required when auth is on) */
router.get('/visits/summary', requireAuth, asyncHandler(async (_req, res) => {
  try {
    const [totals] = await query(
      `SELECT
         SUM(source = 'user') AS user_visits,
         SUM(source = 'cron') AS cron_pings,
         COUNT(*)             AS total,
         MAX(visited_at)      AS last_ping
       FROM visits`
    );
    res.json({ data: totals });
  } catch (err) {
    res.json({ data: { user_visits: null, cron_pings: null, total: null, last_ping: null, db: 'unavailable' } });
  }
}));

module.exports = router;
