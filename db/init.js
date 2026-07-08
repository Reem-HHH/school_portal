const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dbPath = path.join(dataDir, 'school.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'parent', 'student')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_type TEXT NOT NULL CHECK(content_type IN ('schedule', 'grades')),
      display_format TEXT NOT NULL CHECK(display_format IN ('image', 'data')),
      title TEXT NOT NULL,
      label TEXT,
      file_path TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      mime_type TEXT,
      parsed_data TEXT,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_active INTEGER NOT NULL DEFAULT 1
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

    CREATE INDEX IF NOT EXISTS idx_uploads_type ON content_uploads(content_type, is_active);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
  `);
}

function seedData() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@school.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
    ).run(adminEmail, hash, adminName, 'admin');
  }
}

initSchema();
seedData();

module.exports = db;
