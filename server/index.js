/**
 * Internship & Skills Management Portal — REST API
 * Node.js + Express + MySQL
 *
 * Mounts all resource routers, serves uploaded certificate files,
 * and applies centralized error handling.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

const { notFound, errorHandler } = require('./middleware/error');
const { attachSession, requireAuth, requireAdmin, requireSelfOrAdmin, AUTH_ENABLED } = require('./middleware/auth');
const studentsRouter = require('./routes/students');
const skillsRouter = require('./routes/skills');
const companiesRouter = require('./routes/companies');
const internshipsRouter = require('./routes/internships');
const applicationsRouter = require('./routes/applications');
const certificatesModule = require('./routes/certificates');
const visitsRouter = require('./routes/visits');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');

// ---------- global middleware ----------
// Security headers (HSTS, X-Content-Type-Options, X-Frame-Options via CSP
// frame-ancestors, Referrer-Policy, etc.). CSP allows GitHub avatars and the
// same-origin app bundle only.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "https://avatars.githubusercontent.com"],
      "connect-src": ["'self'"],
      "font-src": ["'self'", "data:"],
      "object-src": ["'self'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS allowlist — only origins we control may send credentialed requests.
const allowList = [
  process.env.APP_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean).map((u) => u.replace(/\/$/, ''));
const corsOptions = {
  origin(origin, cb) {
    // non-browser tools (curl, cron) send no Origin — allow those
    if (!origin || allowList.includes(origin)) return cb(null, true);
    return cb(null, false); // don't reflect unknown origins
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(attachSession);

// Simple request logger (dev)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`);
  next();
});

// ---------- routes ----------
app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  uptime: process.uptime(),
  auth: AUTH_ENABLED ? 'github-oauth' : 'demo-mode',
}));
app.use('/api', authRouter); // mounts /api/auth/* (status always; OAuth routes when configured)
app.use('/api', visitsRouter);            // ping stays PUBLIC (cron); summary guards itself

// All other data APIs require a session once OAuth is enabled (demo mode: open)
app.use('/api', requireAuth);

app.use('/api/students', studentsRouter);
app.use('/api', skillsRouter);            // mounts /api/skills and /api/students/:id/skills
app.use('/api/companies', companiesRouter);
app.use('/api/internships', internshipsRouter);
app.use('/api', applicationsRouter);      // mounts /api/applications*, /api/students/:id/applications
app.use('/api', certificatesModule.router); // mounts /api/students/:id/certificates, /api/certificates/:id*

// NOTE: uploaded certificate files are NOT served statically. All access goes
// through GET /api/certificates/:id/file, which enforces ownership (self/admin).

// ---------- production: serve the built React app (client/dist) ----------
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback — any non-API GET renders the React app
  app.get(/^\/(?!api|uploads).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ---------- 404 + centralized error handling ----------
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Internship Portal API running at http://localhost:${PORT}`);
});
