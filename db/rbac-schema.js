const RBAC_SCHEMA = `
  CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    parent_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    section TEXT NOT NULL,
    date_of_birth TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS teacher_assignments (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    section TEXT NOT NULL,
    UNIQUE(teacher_id, subject, grade, section)
  );

  CREATE TABLE IF NOT EXISTS formative_grades (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    section TEXT NOT NULL,
    assessment_type TEXT NOT NULL CHECK(assessment_type IN ('quiz', 'exam', 'assignment')),
    assessment_name TEXT NOT NULL,
    score REAL NOT NULL,
    max_score REAL NOT NULL DEFAULT 100,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS schedule_entries (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    grade TEXT,
    section TEXT,
    day TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    subject TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_students_grade_section ON students(grade, section);
  CREATE INDEX IF NOT EXISTS idx_formative_student ON formative_grades(student_id);
  CREATE INDEX IF NOT EXISTS idx_formative_class ON formative_grades(grade_level, section, subject);
  CREATE INDEX IF NOT EXISTS idx_schedule_teacher ON schedule_entries(teacher_id);
  CREATE INDEX IF NOT EXISTS idx_schedule_class ON schedule_entries(grade, section);
`;

const RBAC_SCHEMA_SQLITE = `
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    parent_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    section TEXT NOT NULL,
    date_of_birth TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS teacher_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    section TEXT NOT NULL,
    UNIQUE(teacher_id, subject, grade, section)
  );

  CREATE TABLE IF NOT EXISTS formative_grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    section TEXT NOT NULL,
    assessment_type TEXT NOT NULL CHECK(assessment_type IN ('quiz', 'exam', 'assignment')),
    assessment_name TEXT NOT NULL,
    score REAL NOT NULL,
    max_score REAL NOT NULL DEFAULT 100,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schedule_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    grade TEXT,
    section TEXT,
    day TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    subject TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_students_grade_section ON students(grade, section);
  CREATE INDEX IF NOT EXISTS idx_formative_student ON formative_grades(student_id);
  CREATE INDEX IF NOT EXISTS idx_formative_class ON formative_grades(grade_level, section, subject);
  CREATE INDEX IF NOT EXISTS idx_schedule_teacher ON schedule_entries(teacher_id);
  CREATE INDEX IF NOT EXISTS idx_schedule_class ON schedule_entries(grade, section);
`;

async function seedRbacData(db, usePg) {
  const active = usePg ? true : 1;

  const teacherEmail = 'teacher@school.com';
  let teacher = await db.get('SELECT id FROM users WHERE email = ?', [teacherEmail]);
  if (!teacher) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('teacher123', 10);
    const result = await db.run(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [teacherEmail, hash, 'Mr. Ahmad', 'teacher']
    );
    teacher = { id: result.lastInsertRowid };
  }

  const studentCount = await db.get('SELECT COUNT(*) as count FROM students');
  if ((studentCount?.count ?? 0) === 0) {
    const students = [
      ['Ahmed Al-Mansouri', 'Grade 5', 'Section A'],
      ['Fatima Hassan', 'Grade 5', 'Section A'],
      ['Omar Khalid', 'Grade 5', 'Section A'],
      ['Sara Mohammed', 'Grade 5', 'Section A'],
      ['Layla Ibrahim', 'Grade 6', 'Section B'],
      ['Youssef Ali', 'Grade 6', 'Section B']
    ];
    for (const [name, grade, section] of students) {
      await db.run(
        'INSERT INTO students (name, grade, section, is_active) VALUES (?, ?, ?, ?)',
        [name, grade, section, active]
      );
    }
  }

  const assignCount = await db.get('SELECT COUNT(*) as count FROM teacher_assignments');
  if ((assignCount?.count ?? 0) === 0) {
    const assignments = [
      ['Math', 'Grade 5', 'Section A'],
      ['Science', 'Grade 5', 'Section A'],
      ['Math', 'Grade 6', 'Section B']
    ];
    for (const [subject, grade, section] of assignments) {
      await db.run(
        'INSERT INTO teacher_assignments (teacher_id, subject, grade, section) VALUES (?, ?, ?, ?)',
        [teacher.id, subject, grade, section]
      );
    }
  }

  const scheduleCount = await db.get('SELECT COUNT(*) as count FROM schedule_entries');
  if ((scheduleCount?.count ?? 0) === 0) {
    const teacherSlots = [
      ['Sun', '8:00 - 8:45', 'Math'],
      ['Mon', '9:00 - 9:45', 'Math'],
      ['Wed', '10:00 - 10:45', 'Science']
    ];
    for (const [day, time, subject] of teacherSlots) {
      await db.run(
        'INSERT INTO schedule_entries (teacher_id, day, time_slot, subject) VALUES (?, ?, ?, ?)',
        [teacher.id, day, time, subject]
      );
    }

    const classSlots = [
      ['Grade 5', 'Section A', 'Sun', '8:00 - 8:45', 'Math'],
      ['Grade 5', 'Section A', 'Mon', '8:00 - 8:45', 'English'],
      ['Grade 5', 'Section A', 'Tue', '8:00 - 8:45', 'Science'],
      ['Grade 5', 'Section A', 'Wed', '8:00 - 8:45', 'Arabic'],
      ['Grade 5', 'Section A', 'Thu', '8:00 - 8:45', 'Math'],
      ['Grade 6', 'Section B', 'Sun', '9:00 - 9:45', 'Math'],
      ['Grade 6', 'Section B', 'Mon', '9:00 - 9:45', 'English']
    ];
    for (const [grade, section, day, time, subject] of classSlots) {
      await db.run(
        'INSERT INTO schedule_entries (grade, section, day, time_slot, subject) VALUES (?, ?, ?, ?, ?)',
        [grade, section, day, time, subject]
      );
    }
  }

  const gradeCount = await db.get('SELECT COUNT(*) as count FROM formative_grades');
  if ((gradeCount?.count ?? 0) === 0) {
    const s1 = await db.get('SELECT id FROM students WHERE name = ?', ['Ahmed Al-Mansouri']);
    const s2 = await db.get('SELECT id FROM students WHERE name = ?', ['Fatima Hassan']);
    if (s1) {
      await db.run(
        `INSERT INTO formative_grades
         (student_id, teacher_id, subject, grade_level, section, assessment_type, assessment_name, score, max_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s1.id, teacher.id, 'Math', 'Grade 5', 'Section A', 'quiz', 'Quiz 1', 18, 20]
      );
      await db.run(
        `INSERT INTO formative_grades
         (student_id, teacher_id, subject, grade_level, section, assessment_type, assessment_name, score, max_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s1.id, teacher.id, 'Math', 'Grade 5', 'Section A', 'exam', 'Midterm Exam', 88, 100]
      );
    }
    if (s2) {
      await db.run(
        `INSERT INTO formative_grades
         (student_id, teacher_id, subject, grade_level, section, assessment_type, assessment_name, score, max_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s2.id, teacher.id, 'Math', 'Grade 5', 'Section A', 'quiz', 'Quiz 1', 16, 20]
      );
    }
  }
}

module.exports = { RBAC_SCHEMA, RBAC_SCHEMA_SQLITE, seedRbacData };
