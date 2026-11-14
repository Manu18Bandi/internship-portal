/**
 * Authentication middleware.
 *  - If GitHub OAuth is not configured (no GITHUB_CLIENT_ID/SECRET), the API
 *    runs in DEMO MODE: every request passes, exactly like before auth existed.
 *  - When configured, requests must carry a signed JWT session cookie
 *    (or `Authorization: Bearer <token>`), and admin-only routes check the role.
 */
const jwt = require('jsonwebtoken');
const { ApiError, asyncHandler } = require('./error');
const { query } = require('../config/db');

const AUTH_ENABLED = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

// Fail closed: with OAuth enabled, refusing to start without a real JWT secret
// is far safer than silently falling back to a guessable dev value (which would
// let anyone forge session cookies, including admin sessions).
const JWT_SECRET = process.env.JWT_SECRET;
if (AUTH_ENABLED && !JWT_SECRET) {
  throw new Error('JWT_SECRET must be set when GitHub OAuth is enabled');
}

const COOKIE_NAME = 'portal_session';

function readToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[COOKIE_NAME] || null;
}

function decodeSession(req) {
  const token = readToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/** Attaches req.auth = { uid, login, role, sid } when a valid session exists. */
function attachSession(req, _res, next) {
  const session = decodeSession(req);
  if (session) {
    req.auth = {
      uid: session.uid,
      login: session.login,
      role: session.role,
      sid: session.sid, // linked student id (may be null)
    };
  }
  next();
}

/** Requires a valid session (skipped entirely in demo mode). */
function requireAuth(req, _res, next) {
  if (!AUTH_ENABLED) return next();
  if (!req.auth) return next(new ApiError(401, 'Sign in required'));
  next();
}

/** Requires an admin session (skipped in demo mode). */
function requireAdmin(req, _res, next) {
  if (!AUTH_ENABLED) return next();
  if (!req.auth) return next(new ApiError(401, 'Sign in required'));
  if (req.auth.role !== 'admin') return next(new ApiError(403, 'Admin access required'));
  next();
}

/**
 * Requires the :id student param to be the session's own student
 * (admins may access any student). Skipped in demo mode.
 */
const requireSelfOrAdmin = (idParam = 'id') =>
  asyncHandler(async (req, _res, next) => {
    if (!AUTH_ENABLED) return next();
    if (!req.auth) return next(new ApiError(401, 'Sign in required'));
    if (req.auth.role === 'admin') return next();

    let studentId = Number(req.params[idParam]);
    if (Number.isNaN(studentId)) {
      // nested form: /students/:id/... — already the same param
      return next(new ApiError(400, 'Invalid student id'));
    }
    // resolve the session's own student
    const [mine] = await query(
      `SELECT s.id FROM students s JOIN users u ON u.id = s.user_id WHERE u.id = ?`,
      [req.auth.uid]
    );
    const ownId = mine ? mine.id : req.auth.sid;
    if (ownId !== studentId) {
      return next(new ApiError(403, 'You can only access your own student record'));
    }
    next();
  });

module.exports = { AUTH_ENABLED, JWT_SECRET, COOKIE_NAME, attachSession, requireAuth, requireAdmin, requireSelfOrAdmin };
