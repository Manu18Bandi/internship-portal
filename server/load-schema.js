/**
 * One-off script: loads schema.sql into the database from .env (works with
 * TiDB Cloud TLS and local MySQL). Usage: node load-schema.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = sql
    .split(/;\s*\n/)            // split on statement-terminating semicolons
    .map((s) => s.replace(/(--[^\n]*\n)|(\/\*[\s\S]*?\*\/)/g, '') // strip comments
                 .trim())
    .filter((s) => s.length > 0);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: false,
    ssl: /tidbcloud\.com$/i.test(process.env.DB_HOST || '')
      ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
      : undefined,
  });

  // TiDB Cloud defaults tidb_multi_statement_mode=OFF; allow multi-row seeds
  try { await conn.query("SET SESSION tidb_multi_statement_mode='ON'"); } catch { /* local MySQL: not needed */ }

  for (const stmt of statements) {
    process.stdout.write(`${stmt.slice(0, 60).replace(/\n/g, ' ')}... `);
    await conn.query(stmt);
    console.log('ok');
  }
  console.log(`\n✅ Schema loaded (${statements.length} statements) into ${process.env.DB_NAME || 'internship_portal'} @ ${process.env.DB_HOST}`);
  await conn.end();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
