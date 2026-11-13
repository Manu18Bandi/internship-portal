/**
 * One-off migration: adds the users table + students.user_id FK.
 * Usage: node migrate-auth.js   (reads DB_* from .env)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'internship_portal',
    ssl: /tidbcloud\.com$/i.test(process.env.DB_HOST || '')
      ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
      : undefined,
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME || 'internship_portal';
  await c.query(`CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    github_id BIGINT UNSIGNED NOT NULL UNIQUE,
    login VARCHAR(100) NOT NULL,
    name VARCHAR(150),
    email VARCHAR(150),
    avatar_url VARCHAR(300),
    role ENUM('student','admin') NOT NULL DEFAULT 'student',
    last_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);

  // add user_id column if missing
  const [cols] = await c.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND COLUMN_NAME = 'user_id'`,
    [dbName]
  );
  if (!cols[0].n) {
    await c.query('ALTER TABLE students ADD COLUMN user_id INT UNSIGNED NULL');
    await c.query(
      'ALTER TABLE students ADD CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id)'
    );
  }
  console.log('✅ users table + students.user_id ready on', process.env.DB_HOST);
  await c.end();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
