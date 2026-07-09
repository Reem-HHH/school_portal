const bcrypt = require('bcryptjs');
const { RBAC_SCHEMA, RBAC_SCHEMA_SQLITE } = require('./rbac-schema');
const { seedDummyData } = require('./dummy-data');
const { migrateAssessments } = require('./migrate-assessments');

const usePg = !!process.env.DATABASE_URL;
let pool = null;
let sqlite = null;

function toPgParams(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function normalizeRow(row) {
  if (!row) return row;
  if (row.is_active !== undefined) {
    row.is_active = row.is_active === true || row.is_active === 1 ? 1 : 0;
  }
  return row;
}

async function initDb() {
  if (usePg) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'parent', 'student')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS content_uploads (
        id SERIAL PRIMARY KEY,
        content_type TEXT NOT NULL CHECK(content_type IN ('schedule', 'grades')),
        display_format TEXT NOT NULL CHECK(display_format IN ('image', 'data')),
        title TEXT NOT NULL,
        label TEXT,
        file_data BYTEA NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT,
        parsed_data JSONB,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_active BOOLEAN NOT NULL DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_email TEXT NOT NULL,
        user_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        details JSONB,
        ip_address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_uploads_type ON content_uploads(content_type, is_active);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
    `);

    await pool.query(RBAC_SCHEMA);
  } else {
    let Database;
    try {
      Database = require('better-sqlite3');
    } catch {
      throw new Error(
        'Local SQLite requires the better-sqlite3 dev dependency. Run npm install, or set DATABASE_URL for PostgreSQL.'
      );
    }
    const path = require('path');
    const fs = require('fs');
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    sqlite = new Database(path.join(dataDir, 'school.db'));
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'parent', 'student')),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_email TEXT NOT NULL,
        user_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
    `);

    const uploadCols = sqlite.prepare("PRAGMA table_info(content_uploads)").all();
    const needsMigration = uploadCols.some(c => c.name === 'file_path');

    if (needsMigration || uploadCols.length === 0) {
      sqlite.exec('DROP TABLE IF EXISTS content_uploads');
    }

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS content_uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_type TEXT NOT NULL CHECK(content_type IN ('schedule', 'grades')),
        display_format TEXT NOT NULL CHECK(display_format IN ('image', 'data')),
        title TEXT NOT NULL,
        label TEXT,
        file_data BLOB NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT,
        parsed_data TEXT,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_uploads_type ON content_uploads(content_type, is_active);
    `);

    sqlite.exec(RBAC_SCHEMA_SQLITE);
  }

  await migrateAssessments({ get, all, run }, usePg);
  await seedAdmin();

  const seedDemo = process.env.SEED_DEMO_DATA === 'true'
    || (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_DATA !== 'false');
  if (seedDemo) {
    await seedDummyData({ get, all, run }, usePg);
  }
}

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@school.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'Al Kharran Primary School Administrator';
  const syncPassword = process.env.ADMIN_SYNC_PASSWORD === 'true';

  const existing = await get('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (!existing) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    await run(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [adminEmail, hash, adminName, 'admin']
    );
  } else if (syncPassword) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    await run('UPDATE users SET password_hash = ? WHERE email = ?', [hash, adminEmail]);
  }
}

async function get(sql, params = []) {
  if (usePg) {
    const result = await pool.query(toPgParams(sql), params);
    return normalizeRow(result.rows[0]);
  }
  return normalizeRow(sqlite.prepare(sql).get(...params));
}

async function all(sql, params = []) {
  if (usePg) {
    const result = await pool.query(toPgParams(sql), params);
    return result.rows.map(normalizeRow);
  }
  return sqlite.prepare(sql).all(...params).map(normalizeRow);
}

async function run(sql, params = []) {
  if (usePg) {
    let pgSql = toPgParams(sql);
    const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
    if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING id';
    }
    const result = await pool.query(pgSql, params);
    return {
      lastInsertRowid: result.rows[0]?.id ?? null,
      changes: result.rowCount
    };
  }
  const result = sqlite.prepare(sql).run(...params);
  return {
    lastInsertRowid: result.lastInsertRowid,
    changes: result.changes
  };
}

module.exports = { initDb, get, all, run, usePg };
