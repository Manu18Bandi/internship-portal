/**
 * GitHub OAuth authentication routes.
 *
 *   GET  /api/auth/status                → { enabled } (frontend boot)
 *   GET  /api/auth/github                → redirect to GitHub authorize
 *   GET  /api/auth/github/callback       → exchange code, upsert user, set session cookie
 *   GET  /api/auth/me                    → { user, student } for the current session
 *   POST /api/auth/logout                → clear session cookie
 *
 * Role model: GitHub logins listed in ADMIN_GITHUB_LOGINS (comma-separated,
 * default "Manu18Bandi") are promoted to 'admin'. Admins are also linked to the
 * seeded demo student profile so the department owner sees the demo data.
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const { query, execute } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/error');
const { AUTH_ENABLED, COOKIE_NAME } = require('../middleware/auth');

const router = express.Router();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const REDIRECT_URI = `${APP_URL}/api/auth/github/callback`;
const parseList = (s) => (s || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
const ADMIN_LOGINS = parseList(process.env.ADMIN_GITHUB_LOGINS || 'Manu18Bandi');
// Portal is private: ONLY these GitHub accounts may sign in at all.
const ALLOWED_LOGINS = parseList(process.env.ALLOWED_GITHUB_LOGINS).length
  ? parseList(process.env.ALLOWED_GITHUB_LOGINS)
  : ADMIN_LOGINS;

/** GET /api/auth/status — is OAuth configured? */
router.get('/auth/status', (_req, res) => {
  res.json({ data: { enabled: AUTH_ENABLED } });
});

if (AUTH_ENABLED) {
  /** GET /api/auth/github — start the OAuth flow */
  router.get('/auth/github', (req, res) => {
    const state = require('crypto').randomBytes(12).toString('hex');
    res.cookie('oauth_state', state, { httpOnly: true, maxAge: 10 * 60 * 1000, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'read:user user:email',
      state,
      allow_signup: 'true',
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  /** GET /api/auth/github/callback — finish the OAuth flow */
  router.get('/auth/github/callback', asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    if (!code) throw new ApiError(400, 'Missing authorization code');
    if (!state || state !== req.cookies?.oauth_state) {
      throw new ApiError(400, 'Invalid OAuth state');
    }
    res.clearCookie('oauth_state');

    // 1. exchange code for an access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, redirect_uri: REDIRECT_URI }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new ApiError(401, 'GitHub authorization failed', tokenData.error_description);
    }

    // 2. fetch the GitHub profile + primary email
    const ghHeaders = {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'internship-portal',
    };
    const ghUser = await (await fetch('https://api.github.com/user', { headers: ghHeaders })).json();
    let email = ghUser.email;
    if (!email) {
      const emails = await (await fetch('https://api.github.com/user/emails', { headers: ghHeaders })).json();
      email = Array.isArray(emails) ? (emails.find((e) => e.primary)?.email || emails[0]?.email) : null;
    }

    // 2b. portal is private — only allow-listed GitHub accounts may sign in
    if (!ALLOWED_LOGINS.includes(ghUser.login.toLowerCase())) {
      return res.redirect(`${APP_URL}/login?denied=1`);
    }

    // 3. upsert the user (admins by login list)
    const login = ghUser.login;
    const role = ADMIN_LOGINS.includes(login.toLowerCase()) ? 'admin' : 'student';
    let [user] = await query('SELECT * FROM users WHERE github_id = ?', [ghUser.id]);
    if (user) {
      await execute(
        'UPDATE users SET login=?, name=?, email=?, avatar_url=?, role=?, last_login_at=NOW() WHERE id = ?',
        [login, ghUser.name || login, email, ghUser.avatar_url, role, user.id]
      );
      [user] = await query('SELECT * FROM users WHERE id = ?', [user.id]);
    } else {
      const result = await execute(
        'INSERT INTO users (github_id, login, name, email, avatar_url, role) VALUES (?, ?, ?, ?, ?, ?)',
        [ghUser.id, login, ghUser.name || login, email, ghUser.avatar_url, role]
      );
      [user] = await query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    }

    // 4. link (or create) the student profile
    let [student] = await query('SELECT * FROM students WHERE user_id = ?', [user.id]);
    if (!student) {
      const [demo] = await query(
        'SELECT * FROM students WHERE user_id IS NULL ORDER BY id ASC LIMIT 1'
      );
      if (role === 'admin' && demo) {
        // department owner adopts the seeded demo profile
        await execute('UPDATE students SET user_id = ? WHERE id = ?', [user.id, demo.id]);
        [student] = await query('SELECT * FROM students WHERE id = ?', [demo.id]);
      } else {
        const result = await execute(
          'INSERT INTO students (user_id, name, email, department, year) VALUES (?, ?, ?, ?, ?)',
          [user.id, user.name || login, user.email || `${login}@users.noreply.github.com`, 'Computer Science', '3']
        );
        [student] = await query('SELECT * FROM students WHERE id = ?', [result.insertId]);
      }
    }

    // 5. issue the session cookie
    const token = jwt.sign(
      { uid: user.id, login: user.login, role: user.role, sid: student.id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' || APP_URL.startsWith('https'),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${APP_URL}/`);
  }));

  /** GET /api/auth/me — current session */
  router.get('/auth/me', asyncHandler(async (req, res) => {
    if (!req.auth) throw new ApiError(401, 'Not signed in');
    const [user] = await query('SELECT id, github_id, login, name, email, avatar_url, role FROM users WHERE id = ?', [req.auth.uid]);
    if (!user) throw new ApiError(401, 'Session user no longer exists');
    const [student] = await query(
      'SELECT * FROM students WHERE user_id = ? LIMIT 1',
      [req.auth.uid]
    );
    res.json({ data: { user, student: student || null } });
  }));

  /** POST /api/auth/logout */
  router.post('/auth/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ data: { loggedOut: true } });
  });
}

module.exports = router;
