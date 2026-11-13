# Internship & Skills Management Portal

A centralized department system for managing **internship companies, internship opportunities, student technical skills, certificates, and application/completion status**.

🌐 **Live deployment:** https://internship-portal-rthh.onrender.com *(kept awake 24/7 by an automated cron — see [Live Deployment](#-live-deployment))*

Built with **React + Node.js/Express + MySQL**, in a clean 4-color white theme.

---

## 📑 Table of Contents
1. [Tech Stack & Tools](#-tech-stack--tools)
2. [Features](#-features)
3. [Live Deployment](#-live-deployment)
4. [How to Use the App](#-how-to-use-the-app)
5. [Run Locally](#-run-locally)
6. [Project Structure](#-project-structure)
7. [Database Schema](#-database-schema)
8. [API Documentation](#-api-documentation)
9. [Testing Performed](#-testing-performed)
10. [Security](#-security)
11. [Git Workflow](#-git-workflow)
12. [Troubleshooting](#-troubleshooting)

> 📘 **Full walkthrough** (development process, executed test results, security analysis, deployment steps): see [`PROJECT_DOCUMENTATION.md`](./PROJECT_DOCUMENTATION.md)

---

## 🛠 Tech Stack & Tools

| Layer | Technology | Used for |
|---|---|---|
| **Frontend** | React 18 + Vite 5 | SPA UI, fast dev server, production build |
| | React Router 6 | Client-side routing (student + admin sections) |
| | Axios | HTTP client with unified error handling |
| | Plain CSS (design tokens) | 4-color white theme — no UI framework |
| **Backend** | Node.js 22 + Express 4 | REST API (CommonJS) |
| | mysql2/promise | Connection pool, parameterized queries |
| | Multer 2 | Certificate file uploads (PDF/JPG/PNG ≤ 5 MB) |
| | dotenv | Environment-based configuration |
| **Database** | MySQL-compatible SQL | 8 relational tables, FKs, junction table |
| | **Local dev:** MySQL 8.4 | `localhost:3306` |
| | **Production:** TiDB Cloud Serverless | Free, MySQL-compatible, TLS |
| **Deployment** | Render (free web service) | Hosts API + built frontend as one service |
| | GitHub Actions (cron `*/5 * * * *`) | Keep-alive pings + visit tracking |
| | GitHub | Source control, branches, issues, PRs |
| **Tooling** | Git 2.55, npm 11 | Version control, dependency management |
| | Node `fetch` / Chromium | API + browser E2E testing |

---

## ✨ Features

### Student
- **Dashboard** — profile summary, stat cards, status breakdown, site-activity monitor
- **Profile & Skills** — controlled form; add/remove technical skills with proficiency (Beginner / Intermediate / Advanced)
- **Browse Internships** — dynamic domain filter chips, live search, one-click apply
- **My Applications** — status tracker (Applied → Under Review → Selected/Rejected → Completed), withdraw while pending
- **Certificates** — upload real files (PDF/JPG/PNG ≤ 5 MB), view in browser, delete

### Department Admin
- **Applications** — all applications with status filter + one-click status management
- **Companies** — full CRUD (modal forms)
- **Internships** — full CRUD (modal forms)

### System
- **Keep-alive + visit tracking** — a cron pings every 5 minutes; every ping is stored in the `visits` table (even with 0 visitors) and shown on the Dashboard

---

## 🌐 Live Deployment

| Component | Service | Details |
|---|---|---|
| Web app (API + UI) | [Render](https://render.com) — free web service | Node 22, region `singapore`, health check `/api/health` |
| Database | [TiDB Cloud](https://tidbcloud.com) Serverless (free) | MySQL-compatible, host `gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000`, TLS required |
| Keep-alive cron | GitHub Actions → [`.github/workflows/keep-alive.yml`](.github/workflows/keep-alive.yml) | `POST /api/visits/ping?source=cron` every 5 min; reads the site URL from repo variable `RENDER_URL` |

**How the 24/7 keep-alive works:**
1. GitHub Actions fires every 5 minutes → pings the live URL
2. The HTTP request resets Render's 15-minute sleep timer → service stays warm
3. Each ping inserts a row in the `visits` table → a complete uptime record exists even with **zero** visitors
4. Real user visits are tracked separately (inserted by the app on page load)

**Deploying updates:** push to `main` → Render auto-deploys (build: `npm run build`, start: `npm start`). Manual redeploy: Render Dashboard → Deploys → Trigger Deploy.

**Re-deploying from scratch:** create a Render web service from this repo (config in [`render.yaml`](render.yaml)), set env vars `DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME` (plus `DB_SSL=1` for TiDB), then load the schema: `cd server && node load-schema.js` (reads the same env vars).

---

## 📖 How to Use the App

Open the live URL (or `http://localhost:3000` locally). The app has no login — it opens on the demo student's dashboard.

### As a student
1. **Dashboard** — see your profile, counts of applications/skills/certificates, status breakdown, and recent applications
2. **Profile & Skills** — edit your details → **Save profile**. Add skills: pick one from the categorized dropdown, choose proficiency → **+ Add skill** (✕ on a pill removes it)
3. **Browse Internships** — click a **domain chip** (e.g. *Data Science*) or type in the search box to filter → **Apply** on a card (button becomes *Applied ✓*)
4. **My Applications** — track progress (3-step bar), withdraw while status is *Applied*
5. **Certificates** — fill title/issuer/date, optionally attach a PDF/JPG/PNG → **+ Add certificate** → **View** opens the file, **Delete** removes it

### As department admin (sidebar → Department Admin)
1. **Applications** — filter by status; change any application's status from the dropdown (Applied → Under Review → Selected / Rejected / Completed)
2. **Companies** — **+ Add company**, or **Edit / Delete** existing ones
3. **Internships** — **+ Add internship** (company, domain, duration, stipend, seats, deadline), or **Edit / Delete**

---

## 💻 Run Locally

### Prerequisites
- Node.js 18+ (`node -v`)
- MySQL 8 running on `localhost:3306`

### 1. Database
```bash
mysql -u root -p < server/schema.sql     # creates internship_portal + 8 tables + seed data
```

### 2. Backend
```bash
cd server
npm install
# create .env — see §Credentials below
npm run dev        # API → http://localhost:5000
```

### 3. Frontend
```bash
cd client
npm install
npm run dev        # UI → http://localhost:3000  (proxies /api → :5000)
```

### Credentials (`.env` in `server/`)
```ini
DB_HOST=localhost        # or gateway01.<region>.prod.aws.tidbcloud.com for TiDB
DB_PORT=3306             # 4000 for TiDB
DB_USER=root             # <id>.root for TiDB
DB_PASSWORD=             # your MySQL/TiDB password
DB_NAME=internship_portal
PORT=5000
DB_SSL=                  # 1 when using TiDB Cloud (TLS enforced)
MAX_UPLOAD_MB=5
```
`.env` is **gitignored** — never commit credentials. To (re)load schema into a remote DB: `node load-schema.js`.

---

## 📁 Project Structure

```
├── client/                     # React frontend (Vite)
│   └── src/
│       ├── api/client.js       # Axios instance (baseURL /api)
│       ├── components/         # Layout, Toast, Modal, StatusBadge, Loader…
│       ├── pages/student/      # Dashboard, Profile&Skills, Browse, Applications, Certificates
│       ├── pages/admin/        # AdminApplications, AdminCompanies, AdminInternships
│       └── styles/theme.css    # 4-color white theme
├── server/                     # Express backend
│   ├── config/db.js            # mysql2 pool (TLS auto-enabled for TiDB)
│   ├── middleware/             # validate.js, error.js, upload.js
│   ├── routes/                 # students, skills, companies, internships,
│   │                           # applications, certificates, visits
│   ├── uploads/                # certificate files (gitignored, auto-created)
│   ├── schema.sql              # 8 tables + seed data (re-runnable)
│   ├── load-schema.js          # loads schema.sql into any configured DB (TLS-safe)
│   └── index.js                # app entry — also serves client/dist in production
├── .github/workflows/keep-alive.yml   # 5-minute keep-alive cron
├── render.yaml                 # Render deployment blueprint
├── README.md                   # this file
└── PROJECT_DOCUMENTATION.md    # full development + testing + security walkthrough
```

---

## 🗄 Database Schema

```
students ──┬──< student_skills >── skills       (M:N + proficiency)
           ├──< applications >── internships >── companies
           ├──< certificates
           └──< visits (keep-alive / user-visit log)
```

| Table | Purpose | Key constraints |
|---|---|---|
| `students` | profiles | `email UNIQUE`, cgpa CHECK 0–10 |
| `companies` | internship companies | cascade delete → internships |
| `internships` | openings | FK → companies, deadline DATE |
| `skills` | master list (20 seeded) | `name UNIQUE` |
| `student_skills` | M:N junction | composite PK prevents duplicates |
| `applications` | apply records | `UNIQUE(student_id, internship_id)`, status ENUM |
| `certificates` | certificates + optional file | FK → students |
| `visits` | keep-alive pings + user visits | source ENUM('cron','user') |

---

## 📮 API Documentation

Base URL: `http://localhost:5000/api` (prod: `/api` on the Render URL).
Success → `{ "data": ... }` · Failure → `{ "error": { "message", "details"? } }`

| Resource | Endpoints |
|---|---|
| Health | `GET /health` |
| Students | `GET /students` · `GET /students/:id` · `PUT /students/:id` |
| Skills | `GET /skills` · `GET /students/:id/skills` · `POST /students/:id/skills` · `DELETE /students/:id/skills/:skillId` |
| Companies | `GET/POST /companies` · `GET/PUT/DELETE /companies/:id` |
| Internships | `GET /internships?domain=&search=&open=` · `GET /internships/domains` · `GET/POST/PUT/DELETE /internships/:id` |
| Applications | `GET /applications?status=` · `GET /students/:id/applications` · `POST /applications` · `PATCH /applications/:id/status` · `DELETE /applications/:id` |
| Certificates | `GET /students/:id/certificates` · `POST /students/:id/certificates` (multipart) · `GET /certificates/:id/file` · `DELETE /certificates/:id` |
| Visits | `POST /visits/ping?source=cron\|user` · `GET /visits/summary` |

**Error codes:** 400 validation · 404 not found · 409 duplicate · 413 file too large · 500 internal

**Example — apply:**
```bash
curl -X POST http://localhost:5000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1, "internship_id": 3}'
```

---

## 🧪 Testing Performed

All checks were executed for real (full details & results: [`PROJECT_DOCUMENTATION.md`](./PROJECT_DOCUMENTATION.md) §10):

- **API level** — every endpoint exercised: valid creates (201), duplicates (409), invalid enums (400), unknown routes (404), malformed JSON
- **Browser E2E** — domain filtering, apply flow, skill add/remove, admin status changes, certificate upload — **zero console errors**
- **Live deployment** — health check, data endpoints, and visit storage (`stored: true`) verified on the Render URL

---

## 🔐 Security

- **SQL injection** → 100% parameterized queries (mysql2)
- **Malicious uploads** → MIME whitelist + 5 MB cap + sanitized randomized filenames
- **Bad input** → validation middleware on every write route (required fields, enums, ranges, FK existence)
- **XSS** → React auto-escaping; no `dangerouslySetInnerHTML`
- **Secrets** → `.env` gitignored; production credentials only in Render's encrypted env vars
- **Error leakage** → generic 500 messages; SQL details only in dev
- ⚠️ **Scope decision:** no authentication (single demo student + open admin, per requirements) — add JWT/session auth before any real-world use. See PROJECT_DOCUMENTATION.md §11 for the full analysis.

---

## 🌿 Git Workflow

```
main ──●──●──●──●──●──●──●   (merge commits, --no-ff)
```
Feature branches: `feat/database`, `feat/backend-api`, `feat/student-ui`, `feat/production-deploy`, `docs/readme`, `docs/project-documentation`, `docs/project-documentation` merged into `main`. Commits use conventional prefixes (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`).

**Push after cloning:**
```bash
git remote add origin https://github.com/Manu18Bandi/internship-portal.git
git push -u origin main
```

---

## 🧰 Troubleshooting

| Problem | Fix |
|---|---|
| `ECONNREFUSED :3306` | Start MySQL service |
| `ER_ACCESS_DENIED_ERROR` | Fix `DB_USER`/`DB_PASSWORD` in `server/.env` |
| `Unknown database` | Run `mysql -u root -p < server/schema.sql` |
| Live site shows "database not connected" | Check `DB_*` env vars on Render → redeploy |
| Live site slow first load | Free tier cold start (~40 s) — the cron keeps it mostly warm |
| Certificate upload fails | Only PDF/JPG/PNG, max 5 MB |
| Port 3000/5000 busy | Change ports in `client/vite.config.js` / `server/.env` |

---

*Theme: exactly 4 colors — White `#FFFFFF` · Ink `#111827` · Primary Blue `#2563EB` · Soft Gray `#6B7280`*
