# Internship & Skills Management Portal

A centralized department system for managing **internship companies, internship opportunities, student technical skills, certificates, and application/completion status**.

Built with **React (Vite) + Node.js/Express + MySQL**, in a clean 4-color white theme.

---

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18, React Router 6, Axios, Vite — controlled forms, `useState`, `map()`, `filter()`, conditional rendering |
| Backend   | Node.js, Express 4 — REST API, validation middleware, centralized error handling, Multer file uploads |
| Database  | MySQL 8 — 7 relational tables with foreign keys and a junction table |

---

## Project Structure

```
├── client/                     # React frontend
│   └── src/
│       ├── api/                # Axios instance
│       ├── components/         # Layout, Toast, Modal, StatusBadge, Loader…
│       ├── pages/student/      # Dashboard, Profile & Skills, Browse Internships,
│       │                       # My Applications, Certificates
│       ├── pages/admin/        # Applications admin, Companies, Internships
│       └── styles/theme.css    # 4-color white theme
├── server/                     # Express backend
│   ├── config/db.js            # mysql2 connection pool
│   ├── middleware/             # validate.js, error.js, upload.js (multer)
│   ├── routes/                 # students, skills, companies, internships,
│   │                           # applications, certificates
│   ├── uploads/                # uploaded certificate files (gitignored)
│   ├── schema.sql              # all tables + seed data
│   └── index.js
└── README.md
```

---

## Database Schema (7 tables)

```
students ──┬──< student_skills >── skills
           ├──< applications >── internships >── companies
           └──< certificates
```

| Table | Purpose |
|---|---|
| `students` | Student profiles (name, email, department, year, CGPA, bio) |
| `companies` | Internship companies (industry, location, website) |
| `internships` | Openings — FK → companies (domain, duration, stipend, seats, deadline) |
| `skills` | Master skill list (name, category) |
| `student_skills` | Junction table — student ↔ skill with proficiency |
| `applications` | FK → students, internships. Status: `Applied → Under Review → Selected / Rejected → Completed` |
| `certificates` | Student certificates with optional uploaded file (PDF/JPG/PNG) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8 running on `localhost:3306`

### 1. Database

```bash
# create schema + seed data (adjust credentials as needed)
mysql -u root -p < server/schema.sql
```

### 2. Backend

```bash
cd server
npm install
# edit .env → set DB_USER / DB_PASSWORD for your MySQL
npm run dev        # API at http://localhost:5000
```

### 3. Frontend

```bash
cd client
npm install
npm run dev        # UI at http://localhost:3000 (proxies /api → :5000)
```

---

## API Documentation

Base URL: `http://localhost:5000/api`
All responses: `{ "data": ... }` on success, `{ "error": { "message", "details"? } }` on failure.

### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health check |

### Students
| Method | Endpoint | Description |
|---|---|---|
| GET | `/students` | List students (with skill/application counts) |
| GET | `/students/:id` | Full profile: student + skills + status stats |
| PUT | `/students/:id` | Update profile. Body: `name*, email*, phone, department*, year, cgpa, bio` |

### Skills
| Method | Endpoint | Description |
|---|---|---|
| GET | `/skills` | Master list, grouped by category |
| GET | `/students/:id/skills` | Student's skills |
| POST | `/students/:id/skills` | Add skill. Body: `{ skill_id*, proficiency? }` |
| DELETE | `/students/:id/skills/:skillId` | Remove skill from student |

### Companies
| Method | Endpoint | Description |
|---|---|---|
| GET | `/companies` | List (with internship counts) |
| GET | `/companies/:id` | Single company |
| POST | `/companies` | Create. Body: `name*, industry, location, website` |
| PUT | `/companies/:id` | Update |
| DELETE | `/companies/:id` | Delete (cascades internships) |

### Internships
| Method | Endpoint | Description |
|---|---|---|
| GET | `/internships` | List. Query: `?domain=Web Development&search=react&open=true` |
| GET | `/internships/domains` | Distinct domain list (for filter chips) |
| GET | `/internships/:id` | Single internship + company + applicant count |
| POST | `/internships` | Create. Body: `company_id*, title*, domain*, deadline*, description, duration_weeks, stipend, seats` |
| PUT | `/internships/:id` | Update |
| DELETE | `/internships/:id` | Delete |

### Applications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/applications` | All applications (admin). Query: `?status=Selected` |
| GET | `/students/:id/applications` | Student's applications + internship details |
| POST | `/applications` | Apply. Body: `{ student_id*, internship_id* }`. Rejects duplicates and expired deadlines |
| PATCH | `/applications/:id/status` | Update status. Body: `{ status* }` — one of `Applied, Under Review, Selected, Rejected, Completed` |
| DELETE | `/applications/:id` | Withdraw application |

### Certificates
| Method | Endpoint | Description |
|---|---|---|
| GET | `/students/:id/certificates` | List certificates |
| POST | `/students/:id/certificates` | Create — `multipart/form-data`: `title*, issuer*, issue_date*`, optional `file` (PDF/JPG/PNG ≤ 5 MB) |
| GET | `/certificates/:id/file` | Stream/preview the uploaded file |
| DELETE | `/certificates/:id` | Delete record + file on disk |

### Error handling
- **400** validation failure (field-level details) or invalid value
- **404** resource not found / unknown route
- **409** duplicate entry (already applied, skill already added, email taken)
- **413** uploaded file too large
- **500** internal server error (safe message; details only in dev)

---

## Git Workflow

- `main` — stable branch
- Feature branches: `feat/student-profile`, `feat/applications`, `feat/admin`, `feat/certificates`, `docs/readme`
- GitHub Issues track each module; PRs merge features into `main`
- `.gitignore` excludes `node_modules/`, `.env`, `uploads/`, build output

---

## Theme

White theme with exactly **4 colors**:

| Token | Hex | Usage |
|---|---|---|
| White | `#FFFFFF` | Backgrounds, cards |
| Ink | `#111827` | Text, headings |
| Primary Blue | `#2563EB` | Buttons, links, active states, progress |
| Soft Gray | `#6B7280` | Secondary text, borders, muted fills |
