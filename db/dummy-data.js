const bcrypt = require('bcryptjs');
const { LESSON_SLOTS, normalizeTimeSlot } = require('../lib/schedule-constants');

const GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'];
const SECTIONS = ['Section A', 'Section B', 'Section C', 'Section D'];

const TEACHER1_SUBJECTS = ['Math', 'Science', 'PE'];
const TEACHER2_SUBJECTS = ['Arabic', 'English', 'Islamic Studies', 'Art'];

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

async function ensureStudent(db, usePg, { name, grade, section, parentUserId = null, userId = null }) {
  const active = usePg ? true : 1;
  let row = await db.get('SELECT id, parent_user_id, user_id FROM students WHERE name = ? AND grade = ? AND section = ?', [name, grade, section]);
  if (!row) {
    const result = await db.run(
      'INSERT INTO students (name, grade, section, parent_user_id, user_id, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [name, grade, section, parentUserId, userId, active]
    );
    row = { id: result.lastInsertRowid };
  } else {
    if (parentUserId && !row.parent_user_id) {
      await db.run('UPDATE students SET parent_user_id = ? WHERE id = ?', [parentUserId, row.id]);
    }
    if (userId && !row.user_id) {
      await db.run('UPDATE students SET user_id = ? WHERE id = ?', [userId, row.id]);
    }
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

async function cleanupLegacyScheduleEntries(db) {
  const entries = await db.all(
    'SELECT id, grade, section, day, time_slot, teacher_id FROM schedule_entries'
  );
  const classSlotKeys = new Set();

  for (const entry of entries) {
    const normalized = normalizeTimeSlot(entry.time_slot);

    if (!LESSON_SLOTS.includes(normalized) || entry.time_slot !== normalized) {
      await db.run('DELETE FROM schedule_entries WHERE id = ?', [entry.id]);
      continue;
    }

    if (entry.grade && entry.section) {
      const key = `${entry.grade}|${entry.section}|${entry.day}|${normalized}`;
      if (classSlotKeys.has(key)) {
        await db.run('DELETE FROM schedule_entries WHERE id = ?', [entry.id]);
        continue;
      }
      classSlotKeys.add(key);
    }
  }
}

async function ensureTeacherSchedule(db, teacherId, day, timeSlot, subject) {
  const slot = normalizeTimeSlot(timeSlot);
  const row = await db.get(
    'SELECT id FROM schedule_entries WHERE teacher_id = ? AND day = ? AND time_slot = ? AND subject = ?',
    [teacherId, day, slot, subject]
  );
  if (!row) {
    await db.run(
      'INSERT INTO schedule_entries (teacher_id, day, time_slot, subject) VALUES (?, ?, ?, ?)',
      [teacherId, day, slot, subject]
    );
  }
}

async function ensureClassSchedule(db, grade, section, day, timeSlot, subject) {
  const slot = normalizeTimeSlot(timeSlot);
  const existing = await db.get(
    'SELECT id FROM schedule_entries WHERE grade = ? AND section = ? AND day = ? AND time_slot = ?',
    [grade, section, day, slot]
  );
  if (existing) {
    await db.run('UPDATE schedule_entries SET subject = ? WHERE id = ?', [subject, existing.id]);
    return;
  }

  await db.run(
    'INSERT INTO schedule_entries (grade, section, day, time_slot, subject) VALUES (?, ?, ?, ?, ?)',
    [grade, section, day, slot, subject]
  );
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
  if (row) {
    await db.run(`
      UPDATE formative_grades
      SET score = ?, max_score = ?, assessment_id = ?, teacher_id = ?
      WHERE id = ?
    `, [score, maxScore, assessmentId, teacherId, row.id]);
    return;
  }

  await db.run(`
    INSERT INTO formative_grades
      (student_id, teacher_id, assessment_id, subject, grade_level, section, assessment_type, assessment_name, score, max_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [studentId, teacherId, assessmentId, subject, gradeLevel, section, type, name, score, maxScore]);
}

function teacherForSubject(subject) {
  if (TEACHER1_SUBJECTS.includes(subject)) return 'teacher1';
  if (TEACHER2_SUBJECTS.includes(subject)) return 'teacher2';
  return 'teacher1';
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
  await cleanupLegacyScheduleEntries(db);

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

  const demoStudent = await ensureUser(db, {
    email: 'student@school.com',
    password: 'student123',
    fullName: 'Ahmed Al-Mansouri',
    role: 'student'
  });

  let nameIdx = 0;
  for (const grade of GRADES) {
    for (const section of SECTIONS) {
      for (let i = 0; i < 2; i++) {
        const name = STUDENT_NAMES[nameIdx % STUDENT_NAMES.length];
        nameIdx++;
        const isDemoStudent = grade === 'Grade 1' && section === 'Section A' && i === 0;
        const parentId = isDemoStudent ? parent.id : null;
        const userId = isDemoStudent ? demoStudent.id : null;
        await ensureStudent(db, usePg, { name, grade, section, parentUserId: parentId, userId });
      }
    }
  }

  const weeklySubjects = ['Arabic', 'English', 'Math', 'Science', 'Islamic Studies', 'Art', 'PE'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  const classScheduleTemplate = [];
  days.forEach((day, dayIndex) => {
    LESSON_SLOTS.forEach((slot, slotIndex) => {
      const subject = weeklySubjects[(dayIndex + slotIndex) % weeklySubjects.length];
      classScheduleTemplate.push([day, slot, subject]);
    });
  });

  for (const grade of GRADES) {
    for (const section of SECTIONS) {
      for (const subject of TEACHER1_SUBJECTS) {
        await ensureAssignment(db, teacher1.id, subject, grade, section);
      }
      for (const subject of TEACHER2_SUBJECTS) {
        await ensureAssignment(db, teacher2.id, subject, grade, section);
      }
      for (const [day, time, subject] of classScheduleTemplate) {
        await ensureClassSchedule(db, grade, section, day, time, subject);
      }
    }
  }

  const teacher1Slots = [
    ['Sun', '9:15 - 10:00', 'Math'],
    ['Mon', '10:00 - 10:45', 'Science'],
    ['Tue', '7:30 - 8:15', 'Math'],
    ['Wed', '11:45 - 12:30', 'PE'],
    ['Thu', '12:30 - 13:15', 'Math']
  ];
  for (const [day, time, subject] of teacher1Slots) {
    await ensureTeacherSchedule(db, teacher1.id, day, time, subject);
  }

  const teacher2Slots = [
    ['Sun', '7:30 - 8:15', 'Arabic'],
    ['Mon', '8:15 - 9:00', 'English'],
    ['Tue', '10:45 - 11:30', 'Islamic Studies'],
    ['Wed', '7:30 - 8:15', 'English'],
    ['Thu', '8:15 - 9:00', 'Arabic'],
    ['Mon', '11:45 - 12:30', 'Art']
  ];
  for (const [day, time, subject] of teacher2Slots) {
    await ensureTeacherSchedule(db, teacher2.id, day, time, subject);
  }

  const teachers = { teacher1: teacher1.id, teacher2: teacher2.id };
  const sampleGrades = [
    { grade: 'Grade 1', section: 'Section A', subject: 'Math', type: 'quiz', name: 'Quiz 1', scores: [18, 16] },
    { grade: 'Grade 1', section: 'Section A', subject: 'Arabic', type: 'exam', name: 'Reading Test', scores: [88, 92] },
    { grade: 'Grade 2', section: 'Section B', subject: 'Math', type: 'quiz', name: 'Quiz 1', scores: [17, 15] },
    { grade: 'Grade 2', section: 'Section B', subject: 'English', type: 'assignment', name: 'Spelling', scores: [45, 48], max: 50 },
    { grade: 'Grade 3', section: 'Section C', subject: 'Science', type: 'quiz', name: 'Unit 1 Quiz', scores: [19, 8], max: 20 },
    { grade: 'Grade 3', section: 'Section C', subject: 'Math', type: 'exam', name: 'Midterm', scores: [85, 78] },
    { grade: 'Grade 4', section: 'Section D', subject: 'English', type: 'exam', name: 'Midterm', scores: [90, 82] },
    { grade: 'Grade 4', section: 'Section D', subject: 'Math', type: 'quiz', name: 'Quiz 2', scores: [16, 18], max: 20 }
  ];

  for (const sample of sampleGrades) {
    const students = await db.all(
      'SELECT id FROM students WHERE grade = ? AND section = ? ORDER BY id LIMIT 2',
      [sample.grade, sample.section]
    );
    const teacherKey = teacherForSubject(sample.subject);
    const teacherId = teachers[teacherKey];
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
