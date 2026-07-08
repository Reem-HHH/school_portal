const express = require('express');
const db = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../lib/audit');
const { canAccessStudent } = require('../lib/rbac');
const { verifyTeacherClass } = require('../lib/teacher-class');

const router = express.Router();
const activeClause = db.usePg ? 'is_active = true' : 'is_active = 1';

router.get('/class-view', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const user = req.session.user;
    const { grade, section, subject } = req.query;

    if (!grade || !section || !subject) {
      return res.status(400).json({ error: 'grade, section, and subject are required' });
    }

    if (user.role === 'teacher') {
      const allowed = await verifyTeacherClass(user.id, grade, section, subject);
      if (!allowed) return res.status(403).json({ error: 'You are not assigned to this class' });
    }

    const students = await db.all(`
      SELECT id, name FROM students
      WHERE grade = ? AND section = ? AND ${activeClause}
      ORDER BY name
    `, [grade, section]);

    const assessments = await db.all(`
      SELECT id, name, assessment_type, max_score, status, created_at
      FROM assessments
      WHERE grade_level = ? AND section = ? AND subject = ?
      ORDER BY created_at ASC, name
    `, [grade, section, subject]);

    const grades = await db.all(`
      SELECT fg.id, fg.student_id, fg.assessment_id, fg.score, fg.max_score
      FROM formative_grades fg
      JOIN students s ON s.id = fg.student_id
      WHERE fg.grade_level = ? AND fg.section = ? AND fg.subject = ?
        AND s.${activeClause}
        AND fg.assessment_id IS NOT NULL
    `, [grade, section, subject]);

    res.json({ students, assessments, grades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { grade, section, subject, studentId, assessmentType } = req.query;

    if (user.role === 'admin') {
      if (!grade || !section) {
        return res.status(400).json({ error: 'grade and section are required' });
      }

      let sql = `
        SELECT fg.*, s.name as student_name
        FROM formative_grades fg
        JOIN students s ON s.id = fg.student_id
        WHERE s.${activeClause}
          AND fg.grade_level = ?
          AND fg.section = ?
      `;
      const params = [grade, section];
      if (subject) { sql += ' AND fg.subject = ?'; params.push(subject); }
      if (assessmentType) { sql += ' AND fg.assessment_type = ?'; params.push(assessmentType); }
      sql += ' ORDER BY fg.grade_level, fg.section, fg.subject, s.name, fg.assessment_name';
      const grades = await db.all(sql, params);
      return res.json({ grades });
    }

    if (user.role === 'student' || user.role === 'parent') {
      let targetStudentId = studentId;
      if (user.role === 'student') {
        const me = await db.get(`SELECT id FROM students WHERE user_id = ? AND ${activeClause}`, [user.id]);
        if (!me) return res.json({ grades: [] });
        targetStudentId = me.id;
      }
      if (!targetStudentId) {
        return res.status(400).json({ error: 'studentId is required for parent accounts' });
      }
      const allowed = await canAccessStudent(user, targetStudentId);
      if (!allowed) return res.status(403).json({ error: 'Access denied' });

      const grades = await db.all(`
        SELECT fg.*, u.full_name as teacher_name
        FROM formative_grades fg
        LEFT JOIN users u ON u.id = fg.teacher_id
        WHERE fg.student_id = ?
        ORDER BY fg.subject, fg.assessment_type, fg.assessment_name
      `, [targetStudentId]);
      return res.json({ grades });
    }

    res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const {
      studentId, subject, grade, section,
      assessmentType, assessmentName, score, maxScore, notes, assessmentId
    } = req.body;

    if (!studentId || !subject || !grade || !section || !assessmentType || !assessmentName || score === undefined) {
      return res.status(400).json({ error: 'Missing required grade fields' });
    }

    const user = req.session.user;
    if (user.role === 'teacher') {
      const allowed = await verifyTeacherClass(user.id, grade, section, subject);
      if (!allowed) return res.status(403).json({ error: 'You are not assigned to this class' });
    }

    const student = await db.get(`SELECT * FROM students WHERE id = ? AND ${activeClause}`, [studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const result = await db.run(`
      INSERT INTO formative_grades
        (student_id, teacher_id, assessment_id, subject, grade_level, section, assessment_type, assessment_name, score, max_score, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      studentId, user.id, assessmentId || null, subject, grade, section,
      assessmentType, assessmentName.trim(), parseFloat(score),
      maxScore ?? 100, notes || null
    ]);

    await logAction(req, {
      action: 'grade.create',
      entityType: 'formative_grade',
      entityId: result.lastInsertRowid,
      details: { studentId, subject, assessmentName, score }
    });

    const created = await db.get('SELECT * FROM formative_grades WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ grade: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/assignments', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const user = req.session.user;
    if (user.role === 'admin') {
      const assignments = await db.all(`
        SELECT ta.*, u.full_name as teacher_name
        FROM teacher_assignments ta
        JOIN users u ON u.id = ta.teacher_id
        ORDER BY ta.grade, ta.section, ta.subject
      `);
      return res.json({ assignments });
    }

    const assignments = await db.all(
      'SELECT * FROM teacher_assignments WHERE teacher_id = ? ORDER BY grade, section, subject',
      [user.id]
    );
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
