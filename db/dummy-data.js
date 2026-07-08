const bcrypt = require('bcryptjs');

const GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'];
const SECTIONS = ['Section A', 'Section B', 'Section C', 'Section D'];

const STUDENT_NAMES = [
  'Ahmed Al-Mansouri', 'Fatima Hassan', 'Omar Khalid', 'Sara Mohammed',
  'Mariam Nasser', 'Hassan Youssef', 'Layla Ibrahim', 'Youssef Ali',
  'Noor Saleh', 'Zainab Farouk', 'Rashid Hamad', 'Dana Mahmoud',
  'Tariq Saeed', 'Hessa Al-Kaabi', 'Khalid Al-Shamsi', 'Aisha Al-Mazrouei',
  'Saeed Al-Nuaimi', 'Maha Al-Dhaheri', 'Hamad Al-Ketbi', 'Shamma Al-Falasi',
  'Salem Al-Ali', 'Reem Al-Suwaidi', 'Faisal Al-Muhairi', 'Noura Al-Hashmi',
  'Mohammed Al-Ahbabi', 'Latifa Al-Rumaithi', 'Abdullah Al-Mansoori', 'Moza Al-Darmaki',
  'Ali Al-Mehairbi', 'Salama Al-Kaabi', 'Majid Al-Hosani', 'Amna Al-Shehhi'
];

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

async function ensureAssessment(db, { teacherId, subject, gradeLevel, section, type, name, maxScore, status = 'closed' }) {
  let row = await db.get(`
    SELECT id FROM assessments
    WHERE subject = ? AND grade_level = ? AND section = ?
      AND assessment_type = ? AND name = ?
  `, [subject, gradeLevel, section, type, name]);
  if (!row) {
    const result = await db.run(`
      INSERT INTO assessments (teacher_id, subject, grade_level, section, assessment_type, name, max_score, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [teacherId, subject, gradeLevel, section, type, name, maxScore, status]);
    row = { id: result.lastInsertRowid };
  }
  return row;
}

async function ensureGrade(db, { studentId, teacherId, subject, gradeLevel, section, type, name, score, maxScore, assessmentId }) {
  const row = await db.get(`
    SELECT id FROM formative_grades
    WHERE student_id = ? AND subject = ? AND grade_level = ? AND section = ?
      AND assessment_type = ? AND assessment_name = ?
  `, [studentId, subject, gradeLevel, section, type, name]);
  if (!row) {
    await db.run(`
      INSERT INTO formative_grades
        (student_id, teacher_id, assessment_id, subject, grade_level, section, assessment_type, assessment_name, score, max_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [studentId, teacherId, assessmentId, subject, gradeLevel, section, type, name, score, maxScore]);
  }
}

async function deactivateOutOfRangeGrades(db, usePg) {
  const inactive = usePg ? false : 0;
  const placeholders = GRADES.map(() => '?').join(', ');
  await db.run(
    `UPDATE students SET is_active = ? WHERE grade NOT IN (${placeholders})`,
    [inactive, ...GRADES]
  );
}

async function seedDummyData(db, usePg) {
  await deactivateOutOfRangeGrades(db, usePg);

  const teacher1 = await ensureUser(db, {
    email: 'teacher@school.com',
    password: 'teacher123',
    fullName: 'Mr. Ahmad Al-Kharrani',
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

  let nameIdx = 0;
  for (const grade of GRADES) {
    for (const section of SECTIONS) {
      for (let i = 0; i < 2; i++) {
        const name = STUDENT_NAMES[nameIdx % STUDENT_NAMES.length];
        nameIdx++;
        const parentId = (grade === 'Grade 1' && section === 'Section A' && i === 0) ? parent.id : null;
        await ensureStudent(db, usePg, { name, grade, section, parentUserId: parentId });
      }
    }
  }

  const classScheduleTemplate = [
    ['Sun', '8:00 - 8:45', 'Arabic'],
    ['Sun', '9:00 - 9:45', 'Math'],
    ['Mon', '8:00 - 8:45', 'English'],
    ['Mon', '9:00 - 9:45', 'Science'],
    ['Tue', '8:00 - 8:45', 'Math'],
    ['Tue', '9:00 - 9:45', 'Islamic Studies'],
    ['Wed', '8:00 - 8:45', 'Arabic'],
    ['Wed', '9:00 - 9:45', 'English'],
    ['Thu', '8:00 - 8:45', 'Science'],
    ['Thu', '9:00 - 9:45', 'Math']
  ];

  for (const grade of GRADES) {
    for (const section of SECTIONS) {
      await ensureAssignment(db, teacher1.id, 'Math', grade, section);
      await ensureAssignment(db, teacher1.id, 'Science', grade, section);
      await ensureAssignment(db, teacher2.id, 'Arabic', grade, section);
      await ensureAssignment(db, teacher2.id, 'English', grade, section);
      for (const [day, time, subject] of classScheduleTemplate) {
        await ensureClassSchedule(db, grade, section, day, time, subject);
      }
    }
  }

  const teacher1Slots = [
    ['Sun', '9:00 - 9:45', 'Math'],
    ['Mon', '9:00 - 9:45', 'Science'],
    ['Tue', '8:00 - 8:45', 'Math'],
    ['Wed', '9:00 - 9:45', 'Science'],
    ['Thu', '9:00 - 9:45', 'Math']
  ];
  for (const [day, time, subject] of teacher1Slots) {
    await ensureTeacherSchedule(db, teacher1.id, day, time, subject);
  }

  const teacher2Slots = [
    ['Sun', '8:00 - 8:45', 'Arabic'],
    ['Mon', '8:00 - 8:45', 'English'],
    ['Tue', '9:00 - 9:45', 'Arabic'],
    ['Wed', '8:00 - 8:45', 'English'],
    ['Thu', '8:00 - 8:45', 'Arabic']
  ];
  for (const [day, time, subject] of teacher2Slots) {
    await ensureTeacherSchedule(db, teacher2.id, day, time, subject);
  }

  const sampleGrades = [
    { grade: 'Grade 1', section: 'Section A', subject: 'Math', type: 'quiz', name: 'Quiz 1', scores: [18, 16] },
    { grade: 'Grade 1', section: 'Section A', subject: 'Arabic', type: 'exam', name: 'Reading Test', scores: [88, 92] },
    { grade: 'Grade 2', section: 'Section B', subject: 'Math', type: 'quiz', name: 'Quiz 1', scores: [17, 15] },
    { grade: 'Grade 2', section: 'Section B', subject: 'English', type: 'assignment', name: 'Spelling', scores: [45, 48], max: 50 },
    { grade: 'Grade 3', section: 'Section C', subject: 'Science', type: 'quiz', name: 'Unit 1 Quiz', scores: [19, 14], max: 20 },
    { grade: 'Grade 3', section: 'Section C', subject: 'Math', type: 'exam', name: 'Midterm', scores: [85, 78] },
    { grade: 'Grade 4', section: 'Section D', subject: 'English', type: 'exam', name: 'Midterm', scores: [90, 82] },
    { grade: 'Grade 4', section: 'Section D', subject: 'Math', type: 'quiz', name: 'Quiz 2', scores: [16, 18], max: 20 }
  ];

  for (const sample of sampleGrades) {
    const students = await db.all(
      'SELECT id FROM students WHERE grade = ? AND section = ? ORDER BY id LIMIT 2',
      [sample.grade, sample.section]
    );
    const teacherId = ['Math', 'Science'].includes(sample.subject) ? teacher1.id : teacher2.id;
    const maxScore = sample.max || (sample.type === 'quiz' ? 20 : 100);
    const assessment = await ensureAssessment(db, {
      teacherId,
      subject: sample.subject,
      gradeLevel: sample.grade,
      section: sample.section,
      type: sample.type,
      name: sample.name,
      maxScore
    });
    for (let i = 0; i < students.length; i++) {
      if (sample.scores[i] !== undefined) {
        await ensureGrade(db, {
          studentId: students[i].id,
          teacherId,
          subject: sample.subject,
          gradeLevel: sample.grade,
          section: sample.section,
          type: sample.type,
          name: sample.name,
          score: sample.scores[i],
          maxScore,
          assessmentId: assessment.id
        });
      }
    }
  }
}

module.exports = { seedDummyData, GRADES, SECTIONS };
