const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

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

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      grade TEXT NOT NULL,
      section TEXT NOT NULL,
      parent_phone TEXT,
      parent_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      exam_type TEXT NOT NULL,
      score INTEGER CHECK(score >= 0 AND score <= 100),
      teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(student_id, exam_type)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedule_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grade TEXT NOT NULL,
      section TEXT NOT NULL,
      day TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      subject TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_students_grade_section ON students(grade, section);
    CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_grade_section ON schedule_entries(grade, section);
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

  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  if (studentCount === 0) {
    const insertStudent = db.prepare(
      'INSERT INTO students (name, grade, section, parent_phone) VALUES (?, ?, ?, ?)'
    );
    const students = [
      ['Ahmed Al-Mansouri', 'Grade 5', 'Section A', '+971 50 123 4567'],
      ['Fatima Hassan', 'Grade 5', 'Section A', '+971 50 234 5678'],
      ['Omar Khalid', 'Grade 5', 'Section A', '+971 50 345 6789'],
      ['Sara Mohammed', 'Grade 5', 'Section A', '+971 50 456 7890'],
      ['Layla Ibrahim', 'Grade 6', 'Section B', '+971 50 567 8901'],
      ['Youssef Ali', 'Grade 6', 'Section B', '+971 50 678 9012']
    ];
    for (const s of students) insertStudent.run(...s);

    const insertGrade = db.prepare(
      'INSERT INTO grades (student_id, exam_type, score) VALUES (?, ?, ?)'
    );
    insertGrade.run(1, 'Midterm Exam', 92);
    insertGrade.run(2, 'Midterm Exam', 88);
    insertGrade.run(3, 'Midterm Exam', 75);
    insertGrade.run(4, 'Midterm Exam', 95);
  }

  const announcementCount = db.prepare('SELECT COUNT(*) as count FROM announcements').get().count;
  if (announcementCount === 0) {
    db.prepare(
      'INSERT INTO announcements (title, body) VALUES (?, ?)'
    ).run(
      'School Announcement',
      'Final exams start on July 20th. Please ensure all grades are submitted by July 15th.'
    );
  }

  const scheduleCount = db.prepare('SELECT COUNT(*) as count FROM schedule_entries').get().count;
  if (scheduleCount === 0) {
    const insertSchedule = db.prepare(
      'INSERT INTO schedule_entries (grade, section, day, time_slot, subject) VALUES (?, ?, ?, ?, ?)'
    );
    const slots = [
      ['Grade 5', 'Section A', 'Sun', '8:00 - 8:45', 'Math'],
      ['Grade 5', 'Section A', 'Mon', '8:00 - 8:45', 'English'],
      ['Grade 5', 'Section A', 'Tue', '8:00 - 8:45', 'Science'],
      ['Grade 5', 'Section A', 'Wed', '8:00 - 8:45', 'Arabic'],
      ['Grade 5', 'Section A', 'Thu', '8:00 - 8:45', 'Math'],
      ['Grade 5', 'Section A', 'Sun', '9:00 - 9:45', 'Science'],
      ['Grade 5', 'Section A', 'Mon', '9:00 - 9:45', 'Math'],
      ['Grade 5', 'Section A', 'Tue', '9:00 - 9:45', 'Art'],
      ['Grade 5', 'Section A', 'Wed', '9:00 - 9:45', 'English'],
      ['Grade 5', 'Section A', 'Thu', '9:00 - 9:45', 'PE'],
      ['Grade 5', 'Section A', 'Sun', '10:00 - 10:45', 'Arabic'],
      ['Grade 5', 'Section A', 'Mon', '10:00 - 10:45', 'Islamic'],
      ['Grade 5', 'Section A', 'Tue', '10:00 - 10:45', 'English'],
      ['Grade 5', 'Section A', 'Wed', '10:00 - 10:45', 'Math'],
      ['Grade 5', 'Section A', 'Thu', '10:00 - 10:45', 'Science'],
      ['Grade 5', 'Section A', 'Sun', '11:00 - 11:45', 'English'],
      ['Grade 5', 'Section A', 'Mon', '11:00 - 11:45', 'PE'],
      ['Grade 5', 'Section A', 'Tue', '11:00 - 11:45', 'Math'],
      ['Grade 5', 'Section A', 'Wed', '11:00 - 11:45', 'Science'],
      ['Grade 5', 'Section A', 'Thu', '11:00 - 11:45', 'Arabic']
    ];
    for (const s of slots) insertSchedule.run(...s);
  }

  const teacherEmail = 'teacher@school.com';
  const existingTeacher = db.prepare('SELECT id FROM users WHERE email = ?').get(teacherEmail);
  if (!existingTeacher) {
    const hash = bcrypt.hashSync('teacher123', 10);
    db.prepare(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
    ).run(teacherEmail, hash, 'Mr. Ahmad', 'teacher');
  }
}

initSchema();
seedData();

module.exports = db;
