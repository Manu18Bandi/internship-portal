/**
 * MySQL connection pool (mysql2/promise).
 * Reads credentials from .env — see .env.example / README.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'internship_portal',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // return DATE/DATETIME as strings (avoids TZ surprises)
  // TiDB Cloud and other managed MySQL endpoints require TLS
  ...(String(process.env.DB_SSL) === '1' || /tidbcloud\.com$/i.test(process.env.DB_HOST || '')
    ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
    : {}),
});

/** Runs a query and returns plain row arrays. Throws ApiError(500) on failure. */
async function query(sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    err.isDbError = true;
    throw err;
  }
}

/** Runs a write query and returns { insertId, affectedRows }. */
async function execute(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return { insertId: result.insertId, affectedRows: result.affectedRows };
}

module.exports = { pool, query, execute };
