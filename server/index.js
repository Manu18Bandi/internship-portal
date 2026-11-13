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

const { notFound, errorHandler } = require('./middleware/error');
const studentsRouter = require('./routes/students');
const skillsRouter = require('./routes/skills');
const companiesRouter = require('./routes/companies');
const internshipsRouter = require('./routes/internships');
const applicationsRouter = require('./routes/applications');
const certificatesModule = require('./routes/certificates');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- global middleware ----------
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple request logger (dev)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`);
  next();
});

// ---------- routes ----------
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use('/api/students', studentsRouter);
app.use('/api', skillsRouter);            // mounts /api/skills and /api/students/:id/skills
app.use('/api/companies', companiesRouter);
app.use('/api/internships', internshipsRouter);
app.use('/api', applicationsRouter);      // mounts /api/applications*, /api/students/:id/applications
app.use('/api', certificatesModule.router); // mounts /api/students/:id/certificates, /api/certificates/:id*

// Uploaded certificate files (safe fallback; explicit file route exists too)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- 404 + centralized error handling ----------
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Internship Portal API running at http://localhost:${PORT}`);
});
