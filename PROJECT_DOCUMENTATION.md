# Internship & Skills Management Portal — Complete Project Documentation

> **Purpose of this file:** If you received this project as a ZIP/repo, this document alone is enough to understand **what the project is, how it was built, how to run it, what was tested, and how security is handled**. A shorter quick-start also exists in [`README.md`](./README.md).

> 🌐 **This project is deployed and live:** https://internship-portal-rthh.onrender.com
> (Render free tier + TiDB Cloud free database + GitHub Actions keep-alive cron — see §14 "Live Deployment".)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Credentials & Configuration](#4-credentials--configuration)
5. [Setup From Scratch (ZIP → Running)](#5-setup-from-scratch-zip--running)
6. [How the Project Was Developed](#6-how-the-project-was-developed)
7. [What Is Working (Feature List)](#7-what-is-working-feature-list)
8. [Database Design](#8-database-design)
9. [API Reference (Summary)](#9-api-reference-summary)
10. [End-to-End Functional Testing Performed](#10-end-to-end-functional-testing-performed)
11. [Security Measures & Checks](#11-security-measures--checks)
12. [Known Limitations](#12-known-limitations)
13. [Troubleshooting / FAQ](#13-troubleshooting--faq)
14. [Live Deployment (Render + TiDB Cloud + Keep-Alive Cron)](#14-live-deployment-render--tidb-cloud--keep-alive-cron)
15. [Git Workflow Used](#15-git-workflow-used)

---

## 1. Project Overview

The **Computer Science department** needs a centralized system where students manage their internship journey: profile, technical skills, internship applications, certificates, and completion status. Department staff (admin) manage companies, internship postings, and application decisions.

This project implements that system as a **three-tier web application**:

```
┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────┐
│   React frontend     │  HTTP  │  Express REST API    │  SQL   │   MySQL 8        │
│   Vite dev :3000     │ ─────► │   :5000              │ ─────► │   :3306          │
│   (UI, forms, state) │  JSON  │  (validation, rules) │        │  (7 FK tables)   │
└──────────────────────┘        └──────────────────────┘        └──────────────────┘
```

- **No login** by design (per requirements): the app operates in *single demo student* mode — student ID `1` is hardcoded in the frontend (`client/src/components/Layout.jsx`).
- An **admin section** (no auth, per scope) lets department staff manage companies, internships, and application statuses.

---

## 2. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | **React 18** + **Vite 5**, React Router 6, Axios | Fast dev server, SPA routing, simple HTTP client |
| Styling | Hand-written CSS (`client/src/styles/theme.css`) | Strict 4-color palette, zero UI-library bloat |
| Backend | **Node.js 18+**, **Express 4** (CommonJS) | Simple REST layer, huge ecosystem |
| DB driver | **mysql2/promise** (connection pool) | Parameterized queries → SQL-injection safe |
| Uploads | **Multer 2.x** | Multipart file handling with type/size limits |
| Config | **dotenv** | Credentials kept out of code (`.env`, gitignored) |
| Database | **MySQL 8.4** (local dev) · **TiDB Cloud Serverless** (production, TLS) | Relational data with foreign keys; free cloud DB for the live deployment |
| Hosting | **Render** free web service + **GitHub Actions** cron | Serves API + built frontend; 5-min keep-alive pings (see §14) |
| Testing | Node built-in `fetch` (API), Chromium browser session (UI/E2E) | No extra deps needed for the checks performed |

---

## 3. Folder Structure

```
Manoj/
├── README.md                    # Quick start + API documentation
├── PROJECT_DOCUMENTATION.md     # ← this file (full walkthrough)
├── render.yaml                  # Render deployment blueprint
├── package.json                 # monorepo scripts (build → install both + build client)
├── .github/workflows/keep-alive.yml   # 5-minute keep-alive cron (uses repo var RENDER_URL)
├── .gitignore                   # node_modules, .env, uploads/, build output
│
├── server/                      # ===== BACKEND (Express + MySQL) =====
│   ├── index.js                 # App entry: middleware, route mounting, error handling
│   ├── schema.sql               # Creates DB + 8 tables + seed data (idempotent: DROP+CREATE)
│   ├── load-schema.js           # Loads schema.sql into any configured DB (TLS-safe for TiDB)
│   ├── .env                     # DB credentials & port (gitignored — see §4)
│   ├── package.json
│   ├── config/
│   │   └── db.js                # mysql2 pool + query()/execute() helpers
│   ├── middleware/
│   │   ├── validate.js          # requireFields / requireIds / requireEnum / assertExists
│   │   ├── error.js             # ApiError class, 404 handler, centralized errorHandler
│   │   └── upload.js            # Multer disk storage, MIME whitelist, 5 MB cap
│   ├── routes/
│   │   ├── students.js          # GET /, GET /:id, PUT /:id
│   │   ├── skills.js            # Master list + student↔skill add/remove
│   │   ├── companies.js         # Full CRUD
│   │   ├── internships.js       # List w/ filters, CRUD
│   │   ├── applications.js      # Apply, list, status PATCH, withdraw
│   │   └── certificates.js      # Multipart upload, file streaming, delete
│   └── uploads/                 # Uploaded certificate files (gitignored, auto-created)
│
└── client/                      # ===== FRONTEND (React + Vite) =====
    ├── index.html
    ├── vite.config.js           # Port 3000; proxies /api and /uploads → :5000
    └── src/
        ├── main.jsx             # Entry: Router + ToastProvider
        ├── App.jsx              # All routes (student + admin)
        ├── api/client.js        # Axios instance (baseURL /api) + error extractor
        ├── styles/theme.css     # The 4-color white theme (design tokens)
        ├── components/
        │   ├── Layout.jsx       # Sidebar + topbar; exports STUDENT_ID = 1
        │   ├── Toast.jsx        # Global toast notifications (context)
        │   ├── Modal.jsx, StatusBadge.jsx, Loader.jsx, EmptyState.jsx
        └── pages/
            ├── student/
            │   ├── Dashboard.jsx          # Profile summary, stat cards, status breakdown
            │   ├── Profile.jsx            # Controlled form + skill add/remove
            │   ├── BrowseInternships.jsx  # Domain chips + search + apply
            │   ├── MyApplications.jsx     # Tracker + withdraw
            │   └── Certificates.jsx       # Upload (FormData) / view / delete
            └── admin/
                ├── AdminApplications.jsx  # All applications + status dropdown
                ├── AdminCompanies.jsx     # CRUD with modal forms
                └── AdminInternships.jsx   # CRUD with modal forms
```

---

## 4. Credentials & Configuration

Everything lives in **`server/.env`** (created from the values below; it is *gitignored* so re-create it after unzipping if missing):

```ini
# MySQL connection
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=internship_portal

# API server
PORT=5000

# Upload limit
MAX_UPLOAD_MB=5
```

### Default development credentials

| What | Value | Notes |
|---|---|---|
| MySQL host / port | `localhost:3306` | Standard local install |
| MySQL user | `root` | |
| MySQL password | *(empty)* | Dev convenience — **change for any real deployment** |
| Database name | `internship_portal` | Created by `schema.sql` |
| API port | `5000` | Frontend proxies to it automatically |
| Frontend port | `3000` | Set in `client/vite.config.js` |
| Demo student | ID `1` — *Manoj Kumar*, `manoj.kumar@college.edu` | Seeded by `schema.sql` |
| File upload limits | PDF / JPG / PNG only, ≤ 5 MB | Enforced in `server/middleware/upload.js` |

> ⚠️ **These are local-development credentials, not production credentials.** Never ship an app with an empty root password (see §11).

---

## 5. Setup From Scratch (ZIP → Running)

### Prerequisites
- **Node.js 18+** (`node -v` to check)
- **MySQL 8** installed and running on port 3306
  - Windows: install via [MySQL Installer](https://dev.mysql.com/downloads/installer/) or `winget install Oracle.MySQL`
  - Remember the root password you set — you'll put it in `server/.env`

### Step 1 — Create the database
```bash
mysql -u root -p < server/schema.sql
```
This creates `internship_portal` with all 7 tables and seed data
(1 student, 6 companies, 10 internships, 20 skills, 4 applications, 3 certificates).
`schema.sql` is **re-runnable**: it drops and recreates the database.

### Step 2 — Configure + start the backend
```bash
cd server
npm install
# create .env with the values from §4 (set DB_PASSWORD to your MySQL root password)
npm run dev
# ✅ Internship Portal API running at http://localhost:5000
```

### Step 3 — Start the frontend
```bash
cd client
npm install
npm run dev
# ➜ Local: http://localhost:3000/
```

### Step 4 — Use it
Open **http://localhost:3000**. You land on the student Dashboard.

---

## 6. How the Project Was Developed

The build followed a **database-first, API-second, UI-third** order, mirroring the dependency chain (UI needs API, API needs schema):

| Phase | What was done |
|---|---|
| **1. Requirements analysis** | Mapped the scenario to entities → 7-table ER design; decided status lifecycle, M:N skill relation, single-student mode (no auth), real file uploads, admin section |
| **2. Database** | `schema.sql` with FKs, ENUM constraints, junction table, unique keys (`uq_student_internship`), seed data; loaded via MySQL CLI and verified with `SHOW TABLES` / counts |
| **3. Backend core** | Express app, mysql2 pool wrapper (`query`/`execute`), centralized error handler + `asyncHandler` wrapper, validation middleware, Multer config |
| **4. Backend routes** | All REST endpoints, each with validation + business rules (duplicate apply → 409, expired deadline → 400, duplicate skill/email → 409) |
| **5. API testing** | Every endpoint exercised with HTTP requests (see §10) *before* frontend work began; two bugs found and fixed here (see §6.1) |
| **6. Frontend foundation** | 4-color design tokens in `theme.css`, Layout (sidebar/topbar), Axios client with unified error extraction, Toast system |
| **7. Student pages** | Dashboard → Profile & Skills → Browse (filters) → Applications → Certificates, all built on `useState` + controlled forms |
| **8. Admin pages** | Applications status management, Companies CRUD, Internships CRUD (modal forms) |
| **9. Browser E2E testing** | Real Chromium session: clicked through every page, applied filters, submitted forms, changed statuses — zero console errors (see §10.2) |
| **10. Git workflow** | Feature branches per module, `--no-ff` merges into `main` (see §14) |

### 6.1 Real bugs found during development (and fixed)

| # | Bug | Symptom | Fix |
|---|---|---|---|
| 1 | **Validator rejected numbers** | `POST /applications` with `{student_id: 1}` returned *"student_id is required"* | `isNonEmptyString()` in `middleware/validate.js` only accepted `typeof 'string'`; changed to accept any non-null value whose `String(v).trim()` is non-empty |
| 2 | **Wrong route mounts** | `/api/students/1/applications` and `/api/certificates/:id/file` returned **404** | Routers were mounted at `/api/applications` but declared nested paths like `/students/:id/...`. Remounted at `/api` and made all paths fully explicit (e.g. `/applications/:id/status`) |

Both were caught by the API test pass in phase 5, not by chance at demo time — this is why the API-first order matters.

---

## 7. What Is Working (Feature List)

### Student side
- ✅ **Dashboard** — profile summary card, stat cards (total/active applications, skills, certificates), status breakdown, recent applications table
- ✅ **Profile** — edit name/email/phone/department/year/CGPA/bio via controlled form; duplicate-email protection
- ✅ **Skills** — add from categorized master list (with proficiency Beginner/Intermediate/Advanced), remove, duplicates blocked; dropdown excludes already-added skills (`filter()`)
- ✅ **Browse internships** — domain filter chips (dynamic from DB), live search (title/company/domain), open-deadline filtering, seat/stipend/duration info, applicant counts
- ✅ **Apply** — one click; button becomes disabled *Applied ✓*; blocked if already applied (409) or deadline passed (400)
- ✅ **My Applications** — full list with 3-stage progress tracker, status badges, withdraw (only while `Applied`)
- ✅ **Certificates** — upload with optional file (PDF/JPG/PNG ≤ 5 MB) via `FormData`, view file in new tab, delete (removes DB row **and** file on disk)

### Admin side
- ✅ **Applications** — all applications with student/internship details, status filter, status change dropdown (5 states)
- ✅ **Companies** — full CRUD with modal forms; delete cascades internships (confirmed in UI)
- ✅ **Internships** — full CRUD with modal forms; domain datalist suggestions; company dropdown

### Cross-cutting
- ✅ Centralized JSON error shape `{ error: { message, details? } }` across the API
- ✅ Toast feedback on every mutation; loading states; empty states
- ✅ All data fetching via `useEffect` + Axios; all forms controlled with a single `onChange` handler
- ✅ **Visit tracking + keep-alive** — every page load records a `user` visit; an external cron records a `cron` ping every 5 minutes (even with 0 users); totals shown on the Dashboard "Site activity" card
- ✅ **Deployed to production** — single Render web service serving API + built frontend (see §14)

---

## 8. Database Design

```
students ──┬──< student_skills >── skills        (M:N with proficiency)
           ├──< applications >── internships >── companies
           ├──< certificates
           └──< visits (keep-alive pings + user visits)
```

| Table | Key columns | Constraints of note |
|---|---|---|
| `students` | name, email, dept, year, cgpa, bio | `email UNIQUE`, `cgpa CHECK 0–10` |
| `companies` | name, industry, location, website | |
| `internships` | company_id FK, title, domain, duration, stipend, seats, deadline | `ON DELETE CASCADE` from company |
| `skills` | name UNIQUE, category | master list (20 seeded) |
| `student_skills` | student_id + skill_id | **composite PK** (prevents duplicate skill), proficiency ENUM |
| `applications` | student_id FK, internship_id FK, status ENUM | `UNIQUE (student_id, internship_id)` — DB-level duplicate-apply protection; `ON UPDATE CURRENT_TIMESTAMP` |
| `certificates` | student_id FK, title, issuer, issue_date, file_path | file_path nullable (metadata-only certs allowed) |
| `visits` | source ENUM('cron','user'), visited_at | one row per keep-alive ping / user visit — complete uptime record |

---

## 9. API Reference (Summary)

Base URL `http://localhost:5000/api` — success `{ "data": ... }`, failure `{ "error": { "message", "details?" } }`.

| Resource | Endpoints |
|---|---|
| Health | `GET /health` |
| Students | `GET /students`, `GET /students/:id` (profile+skills+stats), `PUT /students/:id` |
| Skills | `GET /skills`, `GET /students/:id/skills`, `POST /students/:id/skills`, `DELETE /students/:id/skills/:skillId` |
| Companies | `GET/POST /companies`, `GET/PUT/DELETE /companies/:id` |
| Internships | `GET /internships?domain=&search=&open=`, `GET /internships/domains`, `GET/POST/PUT/DELETE /internships/:id` |
| Applications | `GET /applications?status=`, `GET /students/:id/applications`, `POST /applications`, `PATCH /applications/:id/status`, `DELETE /applications/:id` |
| Certificates | `GET /students/:id/certificates`, `POST /students/:id/certificates` (multipart), `GET /certificates/:id/file`, `DELETE /certificates/:id` |
| Visits | `POST /visits/ping?source=cron\|user` (records a visit; never fails the keep-alive), `GET /visits/summary` (totals + last ping) |

Full request/response examples: [`README.md`](./README.md#api-documentation).

---

## 10. End-to-End Functional Testing Performed

All checks below were **actually executed** against the running system during development.

### 10.1 API-level tests (every endpoint exercised)

| Check | Expected | Result |
|---|---|---|
| `GET /health` | 200 `{status:"ok"}` | ✅ |
| `GET /students/1` | 200 — profile + 8 skills + status stats | ✅ |
| `GET /internships?domain=Data Science` | 200 — only the 2 Data Science rows | ✅ |
| `GET /internships/domains` | 200 — 8 distinct domains | ✅ |
| `POST /applications` (valid) | 201 + created row | ✅ |
| `POST /applications` (same pair again) | **409** "You have already applied to this internship." | ✅ |
| `POST /applications` (missing fields) | 400 with field-level details | ✅ |
| `PATCH /applications/2/status` `{status:"Under Review"}` | 200 + updated row | ✅ |
| `PATCH` invalid status `"Bogus"` | 400 — "must be one of: Applied, Under Review, …" | ✅ |
| `PATCH` nonexistent id 999 | 404 | ✅ |
| `POST /students/1/skills` (valid) | 201 | ✅ |
| `POST /students/1/skills` (duplicate) | **409** "Skill \"Python\" is already added." | ✅ |
| `GET /api/nope` (unknown route) | 404 "Route not found: GET /api/nope" | ✅ |
| Malformed JSON body | 400 JSON parse error (graceful, no crash) | ✅ |
| All 9 core GET endpoints after route fix | 200 | ✅ |

### 10.2 UI end-to-end tests (real Chromium browser session)

| Flow | Steps performed | Result |
|---|---|---|
| Dashboard render | Load `/`, wait for seeded student name | ✅ stat cards show live counts (5 applications, 9 skills, 3 certificates) |
| Domain filter | Click **Data Science** chip | ✅ list reduced to *Machine Learning Intern* + *Data Science Intern* only |
| Apply flow | Click **All** chip → **Apply** on *Java Backend Intern* | ✅ toast shown; button flipped to disabled **Applied ✓**; applied-card count 4 → 5 (verified server-side too) |
| Skill add | Profile → pick skill from dropdown → **+ Add skill** | ✅ toast "Skill added ✔"; skill pill count 9 → 10 |
| Admin status change | Admin → Applications → change first row's status to **Selected** | ✅ badge re-rendered to *Selected* (server persisted) |
| Admin pages load | Companies → 6 rows; Internships → 10 rows | ✅ both render with data |
| Console health | Read console after every page | ✅ **zero errors** across the entire session (only React DevTools/router info notices) |
| Visual check | Screenshots of Dashboard & Browse | ✅ 4-color white theme renders as designed |

### 10.3 Live deployment verification (executed against https://internship-portal-rthh.onrender.com)

| Check | Expected | Result |
|---|---|---|
| `GET /api/health` (prod) | 200 `{status:"ok"}` | ✅ |
| `GET /api/students/1` (prod, TiDB over TLS) | 200 — full profile + skills | ✅ |
| `GET /api/internships?domain=Web Development` (prod) | 200 — filtered rows | ✅ |
| `GET /api/applications` (prod) | 200 — 4 seeded applications | ✅ |
| `POST /api/visits/ping?source=cron` (prod) | 200 + **`stored: true`** | ✅ |
| Dashboard in browser (prod) | Live data, "Site activity" card, 0 console errors | ✅ |
| Keep-alive workflow run (GitHub Actions) | `conclusion: success` | ✅ |
| Graceful DB-down state (before DB was connected) | Friendly "database not connected" card, no crash | ✅ |

### 10.4 How you can re-run the checks yourself

```bash
# API smoke test (Node 18+ has fetch)
node -e "fetch('http://localhost:5000/api/health').then(r=>r.json()).then(console.log)"

# duplicate-apply guard (expect 409 on second call)
node -e "
const post=()=>fetch('http://localhost:5000/api/applications',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({student_id:1,internship_id:3})}).then(r=>console.log(r.status));
post().then(post)"
```

UI: walk the app at http://localhost:3000 — apply to an internship twice, add the same skill twice, set an invalid date in an internship form, upload a `.txt` file as a certificate — each is handled with a clear error toast.

---

## 11. Security Measures & Checks

### Implemented protections

| Threat | Protection | Where |
|---|---|---|
| **SQL injection** | 100% parameterized queries (`pool.query(sql, params)`) — user input never string-concatenated into SQL | `server/config/db.js`, all routes |
| **Bad file uploads** | MIME whitelist (PDF/JPEG/PNG only), 5 MB size cap, sanitized + randomized filenames (original extension only, no path traversal), files stored outside webroot and served through a controlled route | `server/middleware/upload.js`, `routes/certificates.js` |
| **Invalid/malicious input** | Validation middleware on every write route: required fields, positive-integer IDs, ENUM whitelists, numeric ranges (cgpa 0–10, stipend ≥ 0), date parsing; referenced FKs verified to exist before insert | `middleware/validate.js` |
| **XSS (cross-site scripting)** | React escapes all rendered values by default; no `dangerouslySetInnerHTML` anywhere in the codebase | whole frontend |
| **Information leakage** | 500 responses return a generic message; SQL details only in dev mode; central handler logs server-side | `middleware/error.js` |
| **Duplicate/spam data** | DB-level unique keys (email, student↔internship, student↔skill) + application-level 409 checks + deadline check on apply | schema + routes |
| **Oversized payloads** | JSON body limit 1 MB; upload limit from env | `index.js`, `upload.js` |
| **Secrets in code** | DB credentials in `.env`, which is **gitignored** — the repo/zip contains no secrets | `.gitignore` |

### Security checks performed
- ✅ Sent malformed JSON → server returned a clean 400 (no stack trace, no crash)
- ✅ Sent invalid ENUM value (`"Bogus"`) → rejected with whitelist message
- ✅ Sent non-existent IDs (999) → 404, no data leak
- ✅ Verified every DB call is parameterized (code review of `routes/*.js`)
- ✅ Upload filter rejects non-PDF/JPG/PNG MIME types

### ⚠️ Deliberate gaps (documented scope decisions — do NOT deploy as-is)
1. **No authentication** — anyone can act as any student or admin. Production would need JWT/session auth + role checks (the student/admin API split is already structured for this).
2. **Empty MySQL root password** — fine for local dev only.
3. **No HTTPS/rate limiting/helmet** — recommended additions for deployment.
4. **Uploaded files not virus-scanned** — MIME + extension checks only.

---

## 12. Known Limitations

- Single demo student (ID `1`) — no multi-user switching (per requirements: no login)
- Admin section is unauthenticated (per scope) — add auth before real department use
- Certificate preview opens in a new tab; no in-page PDF viewer
- Search is server-side `LIKE` — fine at this scale, switch to FULLTEXT for large data
- Frontend assumes the API proxy is up (Vite proxy → :5000)

---

## 13. Troubleshooting / FAQ

| Problem | Fix |
|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL isn't running. Start the service (`net start MySQL84` on Windows) or launch `mysqld`. |
| `ER_ACCESS_DENIED_ERROR` | `server/.env` credentials don't match your MySQL. Set `DB_PASSWORD` correctly. |
| `Unknown database 'internship_portal'` | Run `mysql -u root -p < server/schema.sql` first. |
| Port 5000/3000 already in use | Change `PORT` in `server/.env` / `client/vite.config.js`. |
| API 404 on `/api/students/1/applications` | You're running an old server process — restart `npm run dev` (route mounts were fixed). |
| Certificate upload fails | Check file type (PDF/JPG/PNG) and size (≤ 5 MB). |
| Frontend shows no data | Ensure the API is running on :5000; check `http://localhost:5000/api/health`. |

---

## 14. Live Deployment (Render + TiDB Cloud + Keep-Alive Cron)

**URL:** https://internship-portal-rthh.onrender.com — deployed via the Render API, all steps scripted and repeatable.

### Architecture in production
```
GitHub (main) ──auto-deploy──► Render web service (free, Node 22, singapore)
                                   │  serves client/dist + REST API on one port
                                   ▼
                        TiDB Cloud Serverless (free, MySQL-compatible, TLS)
                                   ▲
GitHub Actions cron (*/5 min) ─────┘── POST /api/visits/ping?source=cron
```

### Components

| Component | Choice | Why |
|---|---|---|
| Hosting | **Render** free web service | Hosts Node API **and** built React app as one service; auto-deploys on push to `main` |
| Database | **TiDB Cloud Serverless** (free) | Render has no free MySQL; TiDB is MySQL-compatible, free forever, TLS-enforced |
| Keep-alive | **GitHub Actions** cron | Free on public repos; pings every 5 min so the service never sleeps, storing a visit row each time |

### Production configuration
| Setting | Value |
|---|---|
| Service ID | `srv-dbri1mdg1s2s738iff0g` |
| Region / plan | `singapore` / `free` |
| Build / start | `npm run build` (installs server+client, builds React) / `npm start` (`node server/index.js`) |
| Health check | `/api/health` (does not touch the DB — deploy always passes) |
| Env vars | `DB_HOST, DB_PORT=4000, DB_USER=<id>.root, DB_PASSWORD, DB_NAME=internship_portal, DB_SSL=1, NODE_VERSION=22.11.0` — set via Render API/dashboard, **never committed** |
| Repo variable | `RENDER_URL` = live URL, consumed by the keep-alive workflow |

### How the keep-alive works (the "24/7" mechanism)
1. `.github/workflows/keep-alive.yml` runs on schedule `*/5 * * * *` (GitHub may delay scheduled runs by a few minutes).
2. It POSTs to `/api/visits/ping?source=cron` (3 attempts, 20 s apart, must get 200).
3. The HTTP request itself resets Render's 15-minute idle timer → **the service stays warm**.
4. Every ping inserts a row in `visits` → a **complete uptime record exists every 5 minutes even with zero visitors**. User visits are recorded separately by the app on page load.
5. Totals are visible on the student Dashboard → "Site activity" card.

> **Honest caveat:** Render's free tier sleeps after 15 idle minutes and GitHub cron runs are best-effort (can be delayed). In the worst case the service sleeps and wakes (~40 s) on the next ping or human visit. For a demo/college deployment this is effectively always-on; truly guaranteed uptime needs a paid plan.

### Reproducing the deployment from scratch
1. Push the repo to GitHub.
2. In Render: create a **web service** from the repo (runtime Node, build `npm run build`, start `npm start`, health check `/api/health`) — or use [`render.yaml`](render.yaml) as a blueprint. Set the `DB_*` env vars.
3. In TiDB Cloud: create a **Serverless** cluster → set `DB_*` env vars (TLS is auto-enabled by `config/db.js` for `*.tidbcloud.com` hosts).
4. Load the schema: `cd server && node load-schema.js` (reads `.env`, works over TLS).
5. Add a repository **variable** `RENDER_URL` = your onrender.com URL → the cron starts pinging automatically.

---

## 15. Git Workflow Used

Development used **feature branches merged into `main` with `--no-ff`** (merge commits keep module history):

```
main ──●──●──●──●──●   (merge commits)
        │  │  │  │
        │  │  │  └─ feat/database    → schema.sql (8 tables + seed)
        │  │  └──── feat/backend-api → Express REST API, middleware, uploads
        │  └─────── feat/student-ui  → React frontend (student + admin)
        └────────── docs/readme      → README + documentation
```

Conventions:
- Branch names: `feat/<module>`, `docs/<topic>`, `chore/<topic>`
- Commit style: `feat:`, `fix:`, `chore:`, `docs:` prefixes
- `.gitignore` excludes `node_modules/`, `.env`, `uploads/*`, `dist/`, logs

### After unzipping / cloning — push to your GitHub
```bash
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
git push origin feat/database feat/backend-api feat/student-ui docs/readme   # keep branch history
# then open Pull Requests on GitHub from the feat/* branches into main
```

---

*Document generated as part of the project build — all test results in §10 reflect actual executed checks, not assumptions.*
