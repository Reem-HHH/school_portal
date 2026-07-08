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

module.exports = { RBAC_SCHEMA, RBAC_SCHEMA_SQLITE };
