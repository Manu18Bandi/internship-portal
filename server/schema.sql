-- ============================================================
--  Internship & Skills Management Portal — MySQL Schema
--  Department-level system for internships, skills, certificates
-- ============================================================

DROP DATABASE IF EXISTS internship_portal;
CREATE DATABASE internship_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE internship_portal;

-- ------------------------------------------------------------
-- 1. STUDENTS
-- ------------------------------------------------------------
CREATE TABLE students (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  phone         VARCHAR(20),
  department    VARCHAR(80)   NOT NULL,
  year          ENUM('1','2','3','4') NOT NULL DEFAULT '3',
  cgpa          DECIMAL(3,2)  CHECK (cgpa BETWEEN 0 AND 10),
  bio           VARCHAR(500),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. COMPANIES
-- ------------------------------------------------------------
CREATE TABLE companies (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  industry      VARCHAR(80),
  location      VARCHAR(120),
  website       VARCHAR(200),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. INTERNSHIPS
-- ------------------------------------------------------------
CREATE TABLE internships (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    INT UNSIGNED NOT NULL,
  title         VARCHAR(150) NOT NULL,
  domain        VARCHAR(80)  NOT NULL,          -- e.g. Web Dev, Data Science
  description   VARCHAR(1000),
  duration_weeks SMALLINT UNSIGNED NOT NULL,
  stipend       DECIMAL(8,2) DEFAULT 0,
  seats         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  deadline      DATE NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. SKILLS (master list)
-- ------------------------------------------------------------
CREATE TABLE skills (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(80) NOT NULL UNIQUE,
  category      VARCHAR(60) NOT NULL          -- e.g. Language, Framework, Tool
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. STUDENT_SKILLS (M:N junction)
-- ------------------------------------------------------------
CREATE TABLE student_skills (
  student_id    INT UNSIGNED NOT NULL,
  skill_id      INT UNSIGNED NOT NULL,
  proficiency   ENUM('Beginner','Intermediate','Advanced') NOT NULL DEFAULT 'Beginner',
  PRIMARY KEY (student_id, skill_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id)   REFERENCES skills(id)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. APPLICATIONS
-- ------------------------------------------------------------
CREATE TABLE applications (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id    INT UNSIGNED NOT NULL,
  internship_id INT UNSIGNED NOT NULL,
  status        ENUM('Applied','Under Review','Selected','Rejected','Completed')
                NOT NULL DEFAULT 'Applied',
  applied_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_internship (student_id, internship_id),
  FOREIGN KEY (student_id)    REFERENCES students(id)     ON DELETE CASCADE,
  FOREIGN KEY (internship_id) REFERENCES internships(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. CERTIFICATES
-- ------------------------------------------------------------
CREATE TABLE certificates (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id    INT UNSIGNED NOT NULL,
  title         VARCHAR(150) NOT NULL,
  issuer        VARCHAR(120) NOT NULL,
  issue_date    DATE NOT NULL,
  file_path     VARCHAR(300),                 -- uploaded PDF/image (nullable)
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. VISITS (keep-alive pings + user visit tracking)
--    A cron pings every 5 min (source='cron') — a row exists even
--    when zero users visited, proving continuous uptime.
-- ------------------------------------------------------------
CREATE TABLE visits (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source        ENUM('cron','user') NOT NULL DEFAULT 'user',
  visited_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
--  SEED DATA
-- ============================================================

-- Demo student (single-student mode, no auth)
INSERT INTO students (name, email, phone, department, year, cgpa, bio) VALUES
('Manoj Kumar', 'manoj.kumar@college.edu', '9876543210', 'Computer Science', '3', 8.65,
 'Final-year CS student passionate about full-stack development and cloud technologies.');

-- Companies
INSERT INTO companies (name, industry, location, website) VALUES
('Zoho Corporation',   'SaaS',           'Chennai',    'https://www.zoho.com'),
('TCS',                'IT Services',    'Mumbai',     'https://www.tcs.com'),
('Freshworks',         'SaaS',           'Chennai',    'https://www.freshworks.com'),
('Amazon',             'E-commerce',     'Bengaluru',  'https://www.amazon.com'),
('Infosys',            'IT Services',    'Mysuru',     'https://www.infosys.com'),
('PayPal',             'Fintech',        'Chennai',    'https://www.paypal.com');

-- Internships
INSERT INTO internships (company_id, title, domain, description, duration_weeks, stipend, seats, deadline) VALUES
(1, 'Full Stack Developer Intern',      'Web Development', 'Build features across Zoho apps using React and Node.js. Work closely with product teams.', 12, 20000, 3, '2027-01-15'),
(1, 'Frontend Developer Intern',        'Web Development', 'Craft pixel-perfect, accessible UI in React with modern tooling.', 8,  15000, 2, '2026-12-20'),
(2, 'Data Science Intern',              'Data Science',    'Analyze enterprise datasets, build dashboards and ML prototypes.', 10, 18000, 4, '2027-02-01'),
(3, 'Cloud DevOps Intern',              'Cloud & DevOps',  'Work on CI/CD pipelines, containerization and AWS infrastructure.', 12, 22000, 2, '2026-12-30'),
(3, 'React Native Intern',              'Mobile Development', 'Help ship the Freshservice mobile app with React Native.', 10, 18000, 2, '2027-01-10'),
(4, 'Machine Learning Intern',          'Data Science',    'Assist the personalization team with recommendation models.', 12, 35000, 1, '2027-01-25'),
(5, 'Java Backend Intern',              'Backend Development', 'Develop REST APIs and microservices in Java Spring Boot.', 8,  12000, 5, '2026-12-15'),
(5, 'UI/UX Design Intern',              'UI/UX Design',    'Design flows and prototypes for enterprise products in Figma.', 6,  10000, 2, '2027-02-10'),
(6, 'Backend Developer Intern (Node)',  'Backend Development', 'Build payment-integration APIs with Node.js, Express and MySQL.', 12, 30000, 3, '2027-01-05'),
(6, 'Cybersecurity Intern',             'Cybersecurity',   'Support security reviews, automation scripts and threat analysis.', 10, 25000, 1, '2026-12-25');

-- Skills (master list)
INSERT INTO skills (name, category) VALUES
('JavaScript',   'Language'),
('Python',       'Language'),
('Java',         'Language'),
('C++',          'Language'),
('SQL',          'Language'),
('HTML/CSS',     'Web'),
('React',        'Framework'),
('Node.js',      'Framework'),
('Express',      'Framework'),
('Spring Boot',  'Framework'),
('Flask',        'Framework'),
('React Native', 'Framework'),
('MySQL',        'Database'),
('MongoDB',      'Database'),
('Git & GitHub', 'Tool'),
('Docker',       'Tool'),
('AWS',          'Cloud'),
('Figma',        'Design'),
('TensorFlow',   'AI/ML'),
('Pandas',       'AI/ML');

-- Student skills (demo student)
INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES
(1, 1,  'Advanced'),        -- JavaScript
(1, 6,  'Advanced'),        -- HTML/CSS
(1, 7,  'Advanced'),        -- React
(1, 8,  'Intermediate'),    -- Node.js
(1, 9,  'Intermediate'),    -- Express
(1, 13, 'Intermediate'),    -- MySQL
(1, 15, 'Advanced'),        -- Git & GitHub
(1, 17, 'Beginner');        -- AWS

-- Applications
INSERT INTO applications (student_id, internship_id, status) VALUES
(1, 1, 'Under Review'),
(1, 4, 'Applied'),
(1, 9, 'Selected'),
(1, 6, 'Rejected');

-- Certificates
INSERT INTO certificates (student_id, title, issuer, issue_date, file_path) VALUES
(1, 'Full Stack Web Development Specialization', 'Coursera — Meta',        '2026-05-20', NULL),
(1, 'AWS Cloud Practitioner Essentials',         'Amazon Web Services',    '2026-07-10', NULL),
(1, 'MySQL Bootcamp',                            'Udemy',                  '2026-03-02', NULL);
