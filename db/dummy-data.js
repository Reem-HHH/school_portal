const bcrypt = require('bcryptjs');

async function ensureUser(db, { email, password, fullName, role }) {
  let user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (!user) {
    const hash = bcrypt.hashSync(password, 10);
    const result = await db.run(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [email, hash, fullName, role]
    );
    user = { id: result.lastInsertRowid };
  }
  return user;
}

async function ensureStudent(db, usePg, { name, grade, section, parentUserId = null }) {
  const active = usePg ? true : 1;
  let row = await db.get('SELECT id FROM students WHERE name = ? AND grade = ? AND section = ?', [name, grade, section]);
  if (!row) {
    const result = await db.run(
      'INSERT INTO students (name, grade, section, parent_user_id, is_active) VALUES (?, ?, ?, ?, ?)',
      [name, grade, section, parentUserId, active]
    );
    row = { id: result.lastInsertRowid };
  }
  return row;
}

async function ensureAssignment(db, teacherId, subject, grade, section) {
  const row = await db.get(
    'SELECT id FROM teacher_assignments WHERE teacher_id = ? AND subject = ? AND grade = ? AND section = ?',
    [teacherId, subject, grade, section]
  );
  if (!row) {
    await db.run(
      'INSERT INTO teacher_assignments (teacher_id, subject, grade, section) VALUES (?, ?, ?, ?)',
      [teacherId, subject, grade, section]
    );
  }
}

async function ensureTeacherSchedule(db, teacherId, day, timeSlot, subject) {
  const row = await db.get(
    'SELECT id FROM schedule_entries WHERE teacher_id = ? AND day = ? AND time_slot = ? AND subject = ?',
    [teacherId, day, timeSlot, subject]
  );
  if (!row) {
    await db.run(
      'INSERT INTO schedule_entries (teacher_id, day, time_slot, subject) VALUES (?, ?, ?, ?)',
      [teacherId, day, timeSlot, subject]
    );
  }
}

async function ensureClassSchedule(db, grade, section, day, timeSlot, subject) {
  const row = await db.get(
    'SELECT id FROM schedule_entries WHERE grade = ? AND section = ? AND day = ? AND time_slot = ? AND subject = ?',
    [grade, section, day, timeSlot, subject]
  );
  if (!row) {
    await db.run(
      'INSERT INTO schedule_entries (grade, section, day, time_slot, subject) VALUES (?, ?, ?, ?, ?)',
      [grade, section, day, timeSlot, subject]
    );
  }
}

async function ensureGrade(db, { studentId, teacherId, subject, gradeLevel, section, type, name, score, maxScore }) {
  const row = await db.get(`
    SELECT id FROM formative_grades
    WHERE student_id = ? AND subject = ? AND grade_level = ? AND section = ?
      AND assessment_type = ? AND assessment_name = ?
  `, [studentId, subject, gradeLevel, section, type, name]);
  if (!row) {
    await db.run(`
      INSERT INTO formative_grades
        (student_id, teacher_id, subject, grade_level, section, assessment_type, assessment_name, score, max_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [studentId, teacherId, subject, gradeLevel, section, type, name, score, maxScore]);
  }
}

async function seedDummyData(db, usePg) {
  const teacher1 = await ensureUser(db, {
    email: 'teacher@school.com',
    password: 'teacher123',
    fullName: 'Mr. Ahmad',
    role: 'teacher'
  });

  const teacher2 = await ensureUser(db, {
    email: 'teacher2@school.com',
    password: 'teacher123',
    fullName: 'Ms. Fatima Al-Rashid',
    role: 'teacher'
  });

  const parent = await ensureUser(db, {
    email: 'parent@school.com',
    password: 'parent123',
    fullName: 'Khalid Al-Mansouri',
    role: 'parent'
  });

  const students = [
    { name: 'Ahmed Al-Mansouri', grade: 'Grade 5', section: 'Section A', parentUserId: parent.id },
    { name: 'Fatima Hassan', grade: 'Grade 5', section: 'Section A' },
    { name: 'Omar Khalid', grade: 'Grade 5', section: 'Section A' },
    { name: 'Sara Mohammed', grade: 'Grade 5', section: 'Section A' },
    { name: 'Mariam Nasser', grade: 'Grade 5', section: 'Section A' },
    { name: 'Hassan Youssef', grade: 'Grade 5', section: 'Section A' },
    { name: 'Layla Ibrahim', grade: 'Grade 6', section: 'Section B' },
    { name: 'Youssef Ali', grade: 'Grade 6', section: 'Section B' },
    { name: 'Noor Saleh', grade: 'Grade 6', section: 'Section B' },
    { name: 'Zainab Farouk', grade: 'Grade 6', section: 'Section B' },
    { name: 'Rashid Hamad', grade: 'Grade 6', section: 'Section A' },
    { name: 'Dana Mahmoud', grade: 'Grade 6', section: 'Section A' },
    { name: 'Tariq Saeed', grade: 'Grade 6', section: 'Section A' }
  ];

  const studentIds = {};
  for (const s of students) {
    const row = await ensureStudent(db, usePg, s);
    studentIds[s.name] = row.id;
  }

  const assignments = [
    [teacher1.id, 'Math', 'Grade 5', 'Section A'],
    [teacher1.id, 'Science', 'Grade 5', 'Section A'],
    [teacher1.id, 'Math', 'Grade 6', 'Section B'],
    [teacher2.id, 'English', 'Grade 5', 'Section A'],
    [teacher2.id, 'Arabic', 'Grade 5', 'Section A'],
    [teacher2.id, 'Science', 'Grade 6', 'Section A']
  ];
  for (const [tid, subject, grade, section] of assignments) {
    await ensureAssignment(db, tid, subject, grade, section);
  }

  const teacher1Slots = [
    ['Sun', '8:00 - 8:45', 'Math'],
    ['Mon', '9:00 - 9:45', 'Math'],
    ['Tue', '10:00 - 10:45', 'Science'],
    ['Wed', '8:00 - 8:45', 'Math'],
    ['Thu', '9:00 - 9:45', 'Science']
  ];
  for (const [day, time, subject] of teacher1Slots) {
    await ensureTeacherSchedule(db, teacher1.id, day, time, subject);
  }

  const teacher2Slots = [
    ['Sun', '8:00 - 8:45', 'English'],
    ['Mon', '8:00 - 8:45', 'Arabic'],
    ['Tue', '9:00 - 9:45', 'English'],
    ['Wed', '10:00 - 10:45', 'Arabic'],
    ['Thu', '8:00 - 8:45', 'English']
  ];
  for (const [day, time, subject] of teacher2Slots) {
    await ensureTeacherSchedule(db, teacher2.id, day, time, subject);
  }

  const classSlots = [
    ['Grade 5', 'Section A', 'Sun', '8:00 - 8:45', 'Math'],
    ['Grade 5', 'Section A', 'Mon', '8:00 - 8:45', 'English'],
    ['Grade 5', 'Section A', 'Tue', '8:00 - 8:45', 'Science'],
    ['Grade 5', 'Section A', 'Wed', '8:00 - 8:45', 'Arabic'],
    ['Grade 5', 'Section A', 'Thu', '8:00 - 8:45', 'Math'],
    ['Grade 6', 'Section B', 'Sun', '9:00 - 9:45', 'Math'],
    ['Grade 6', 'Section B', 'Mon', '9:00 - 9:45', 'English'],
    ['Grade 6', 'Section B', 'Tue', '9:00 - 9:45', 'Science'],
    ['Grade 6', 'Section A', 'Sun', '10:00 - 10:45', 'Science'],
    ['Grade 6', 'Section A', 'Mon', '10:00 - 10:45', 'English'],
    ['Grade 6', 'Section A', 'Wed', '10:00 - 10:45', 'Arabic']
  ];
  for (const [grade, section, day, time, subject] of classSlots) {
    await ensureClassSchedule(db, grade, section, day, time, subject);
  }

  const grades = [
    { student: 'Ahmed Al-Mansouri', teacherId: teacher1.id, subject: 'Math', grade: 'Grade 5', section: 'Section A', type: 'quiz', name: 'Quiz 1', score: 18, max: 20 },
    { student: 'Ahmed Al-Mansouri', teacherId: teacher1.id, subject: 'Math', grade: 'Grade 5', section: 'Section A', type: 'exam', name: 'Midterm Exam', score: 88, max: 100 },
    { student: 'Fatima Hassan', teacherId: teacher1.id, subject: 'Math', grade: 'Grade 5', section: 'Section A', type: 'quiz', name: 'Quiz 1', score: 16, max: 20 },
    { student: 'Fatima Hassan', teacherId: teacher1.id, subject: 'Math', grade: 'Grade 5', section: 'Section A', type: 'exam', name: 'Midterm Exam', score: 92, max: 100 },
    { student: 'Omar Khalid', teacherId: teacher1.id, subject: 'Math', grade: 'Grade 5', section: 'Section A', type: 'quiz', name: 'Quiz 1', score: 14, max: 20 },
    { student: 'Sara Mohammed', teacherId: teacher1.id, subject: 'Science', grade: 'Grade 5', section: 'Section A', type: 'assignment', name: 'Lab Report 1', score: 45, max: 50 },
    { student: 'Mariam Nasser', teacherId: teacher2.id, subject: 'English', grade: 'Grade 5', section: 'Section A', type: 'quiz', name: 'Vocabulary Quiz', score: 19, max: 20 },
    { student: 'Hassan Youssef', teacherId: teacher2.id, subject: 'Arabic', grade: 'Grade 5', section: 'Section A', type: 'exam', name: 'Reading Exam', score: 78, max: 100 },
    { student: 'Layla Ibrahim', teacherId: teacher1.id, subject: 'Math', grade: 'Grade 6', section: 'Section B', type: 'quiz', name: 'Quiz 2', score: 17, max: 20 },
    { student: 'Youssef Ali', teacherId: teacher1.id, subject: 'Math', grade: 'Grade 6', section: 'Section B', type: 'exam', name: 'Unit Test', score: 85, max: 100 },
    { student: 'Noor Saleh', teacherId: teacher2.id, subject: 'Science', grade: 'Grade 6', section: 'Section A', type: 'assignment', name: 'Project 1', score: 40, max: 50 },
    { student: 'Rashid Hamad', teacherId: teacher2.id, subject: 'English', grade: 'Grade 6', section: 'Section A', type: 'quiz', name: 'Grammar Quiz', score: 15, max: 20 }
  ];

  for (const g of grades) {
    const studentId = studentIds[g.student];
    if (studentId) {
      await ensureGrade(db, {
        studentId,
        teacherId: g.teacherId,
        subject: g.subject,
        gradeLevel: g.grade,
        section: g.section,
        type: g.type,
        name: g.name,
        score: g.score,
        maxScore: g.max
      });
    }
  }
}

module.exports = { seedDummyData };
