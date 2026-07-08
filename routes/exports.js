const express = require('express');
const db = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');
const { toCsv } = require('../lib/csv');
const { buildBrandedBuffer, buildScheduleTimetableBuffer, groupScheduleEntries } = require('../lib/branded-export');

const router = express.Router();
const activeClause = db.usePg ? 'is_active = true' : 'is_active = 1';

function sendCsv(res, filename, headers, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + toCsv(headers, rows));
}

async function sendBrandedXlsx(res, filename, options) {
  const buffer = await buildBrandedBuffer(options);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
}

function wantsCsv(req) {
  return String(req.query.format || '').toLowerCase() === 'csv';
}

async function sendScheduleTimetableXlsx(res, filename, rows, { teacherName = '' } = {}) {
  const sheets = groupScheduleEntries(rows, { teacherName });
  const buffer = await buildScheduleTimetableBuffer({ sheets });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
}

async function respondExport(req, res, {
  baseName,
  title,
  sheetName,
  columns,
  rows,
  csvHeaders
}) {
  if (wantsCsv(req)) {
    return sendCsv(res, `${baseName}.csv`, csvHeaders, rows);
  }

  await sendBrandedXlsx(res, `${baseName}.xlsx`, {
    title,
    sheetName,
    columns,
    rows
  });
}

router.get('/students', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const students = await db.all(`
      SELECT s.name, s.grade, s.section, u.email as user_email, p.full_name as parent_name
      FROM students s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN users p ON p.id = s.parent_user_id
      WHERE s.${activeClause}
      ORDER BY s.grade, s.section, s.name
    `);
    const rows = students.map(s => ({
      name: s.name,
      grade: s.grade,
      section: s.section,
      user_email: s.user_email || '',
      parent_name: s.parent_name || ''
    }));

    await respondExport(req, res, {
      baseName: 'students',
      title: 'Students Export',
      sheetName: 'Students',
      csvHeaders: ['name', 'grade', 'section', 'user_email', 'parent_name'],
      columns: [
        { key: 'name', header: 'Student', width: 24 },
        { key: 'grade', header: 'Grade', width: 12 },
        { key: 'section', header: 'Section', width: 12 },
        { key: 'user_email', header: 'Email', width: 28 },
        { key: 'parent_name', header: 'Parent', width: 24 }
      ],
      rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/teachers', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT u.full_name, u.email, ta.subject, ta.grade, ta.section
      FROM users u
      JOIN teacher_assignments ta ON ta.teacher_id = u.id
      WHERE u.role = 'teacher'
      ORDER BY u.full_name, ta.grade, ta.section, ta.subject
    `);

    await respondExport(req, res, {
      baseName: 'teachers',
      title: 'Teachers Export',
      sheetName: 'Teachers',
      csvHeaders: ['full_name', 'email', 'subject', 'grade', 'section'],
      columns: [
        { key: 'full_name', header: 'Teacher', width: 24 },
        { key: 'email', header: 'Email', width: 28 },
        { key: 'subject', header: 'Subject', width: 18 },
        { key: 'grade', header: 'Grade', width: 12 },
        { key: 'section', header: 'Section', width: 12 }
      ],
      rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/grades', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    let sql = `
      SELECT s.name as student_name, fg.grade_level, fg.section, fg.subject,
             fg.assessment_type, fg.assessment_name, fg.score, fg.max_score,
             u.full_name as teacher_name
      FROM formative_grades fg
      JOIN students s ON s.id = fg.student_id
      LEFT JOIN users u ON u.id = fg.teacher_id
      WHERE s.${activeClause}
    `;
    const params = [];

    if (user.role === 'teacher') {
      sql += ' AND fg.teacher_id = ?';
      params.push(user.id);
    } else if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    sql += ' ORDER BY fg.grade_level, fg.section, fg.subject, s.name, fg.assessment_name';
    const grades = await db.all(sql, params);

    await respondExport(req, res, {
      baseName: 'grades',
      title: user.role === 'teacher' ? 'My Gradebook Export' : 'Gradebook Export',
      sheetName: 'Grades',
      csvHeaders: ['student_name', 'grade_level', 'section', 'subject', 'assessment_type', 'assessment_name', 'score', 'max_score', 'teacher_name'],
      columns: [
        { key: 'student_name', header: 'Student', width: 22 },
        { key: 'grade_level', header: 'Grade', width: 12 },
        { key: 'section', header: 'Section', width: 12 },
        { key: 'subject', header: 'Subject', width: 16 },
        { key: 'assessment_type', header: 'Type', width: 14 },
        { key: 'assessment_name', header: 'Assessment', width: 22 },
        { key: 'score', header: 'Score', width: 10 },
        { key: 'max_score', header: 'Out of', width: 10 },
        { key: 'teacher_name', header: 'Teacher', width: 22 }
      ],
      rows: grades
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schedules', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    let rows = [];

    if (user.role === 'admin') {
      rows = await db.all(`
        SELECT COALESCE(u.full_name, '') as teacher_name, COALESCE(se.grade, '') as grade,
               COALESCE(se.section, '') as section, se.day, se.time_slot, se.subject
        FROM schedule_entries se
        LEFT JOIN users u ON u.id = se.teacher_id
        ORDER BY se.grade, se.section, se.day, se.time_slot
      `);
    } else if (user.role === 'teacher') {
      rows = await db.all(`
        SELECT u.full_name as teacher_name, '' as grade, '' as section, se.day, se.time_slot, se.subject
        FROM schedule_entries se
        JOIN users u ON u.id = se.teacher_id
        WHERE se.teacher_id = ?
        ORDER BY se.day, se.time_slot
      `, [user.id]);
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (wantsCsv(req)) {
      return sendCsv(res, 'schedules.csv',
        ['teacher_name', 'grade', 'section', 'day', 'time_slot', 'subject'],
        rows
      );
    }

    await sendScheduleTimetableXlsx(res, 'schedules.xlsx', rows, {
      teacherName: user.role === 'teacher' ? user.full_name : ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
