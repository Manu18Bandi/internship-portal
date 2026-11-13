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

// ---------- global middleware ----------
app.use(cors({ origin: true, credentials: true }));
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

// Uploaded certificate files (safe fallback; explicit file route exists too)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
