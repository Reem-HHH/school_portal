const express = require('express');
const db = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../lib/audit');
const { verifyTeacherClass, getTeacherSubjects } = require('../lib/teacher-class');

const router = express.Router();
const activeClause = db.usePg ? 'is_active = true' : 'is_active = 1';

async function loadAssessment(id) {
  return db.get('SELECT * FROM assessments WHERE id = ?', [id]);
}

router.get('/subjects', requireAuth, requireRole('teacher'), async (req, res) => {
  try {
    const { grade, section } = req.query;
    if (!grade || !section) {
      return res.status(400).json({ error: 'grade and section are required' });
    }
    const subjects = await getTeacherSubjects(req.session.user.id, grade, section);
    res.json({ subjects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
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

    const assessments = await db.all(`
      SELECT a.*, u.full_name as teacher_name
      FROM assessments a
      LEFT JOIN users u ON u.id = a.teacher_id
      WHERE a.grade_level = ? AND a.section = ? AND a.subject = ?
      ORDER BY a.created_at DESC, a.name
    `, [grade, section, subject]);

    res.json({ assessments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const user = req.session.user;
    const { subject, grade, section, assessmentType, name, maxScore } = req.body;

    if (!subject || !grade || !section || !assessmentType || !name) {
      return res.status(400).json({ error: 'subject, grade, section, assessmentType, and name are required' });
    }

    const allowedTypes = ['quiz', 'exam', 'assignment'];
    if (!allowedTypes.includes(assessmentType)) {
      return res.status(400).json({ error: 'Invalid assessment type' });
    }

    const max = parseFloat(maxScore) || 100;
    if (max <= 0) {
      return res.status(400).json({ error: 'maxScore must be greater than 0' });
    }

    if (user.role === 'teacher') {
      const allowed = await verifyTeacherClass(user.id, grade, section, subject);
      if (!allowed) return res.status(403).json({ error: 'You are not assigned to this class' });
    }

    const existing = await db.get(`
      SELECT id FROM assessments
      WHERE subject = ? AND grade_level = ? AND section = ?
        AND assessment_type = ? AND name = ?
    `, [subject, grade, section, assessmentType, name.trim()]);

    if (existing) {
      return res.status(409).json({ error: 'An assessment with this name and type already exists for this class' });
    }

    const result = await db.run(`
      INSERT INTO assessments (teacher_id, subject, grade_level, section, assessment_type, name, max_score, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
    `, [user.id, subject, grade, section, assessmentType, name.trim(), max]);

    const assessment = await loadAssessment(result.lastInsertRowid);

    await logAction(req, {
      action: 'assessment.create',
      entityType: 'assessment',
      entityId: assessment.id,
      details: { subject, grade, section, name: name.trim(), assessmentType, maxScore: max }
    });

    res.status(201).json({ assessment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/marks', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const user = req.session.user;
    const assessment = await loadAssessment(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    if (user.role === 'teacher') {
      const allowed = await verifyTeacherClass(
        user.id, assessment.grade_level, assessment.section, assessment.subject
      );
      if (!allowed) return res.status(403).json({ error: 'You are not assigned to this class' });
    }

    const students = await db.all(`
      SELECT s.id, s.name
      FROM students s
      WHERE s.grade = ? AND s.section = ? AND s.${activeClause}
      ORDER BY s.name
    `, [assessment.grade_level, assessment.section]);

    const grades = await db.all(`
      SELECT student_id, score, max_score, id
      FROM formative_grades
      WHERE assessment_id = ?
    `, [assessment.id]);

    res.json({ assessment, students, grades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/marks', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const user = req.session.user;
    const { entries } = req.body;
    const assessment = await loadAssessment(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    if (user.role === 'teacher') {
      const allowed = await verifyTeacherClass(
        user.id, assessment.grade_level, assessment.section, assessment.subject
      );
      if (!allowed) return res.status(403).json({ error: 'You are not assigned to this class' });
    }

    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'entries array is required' });
    }

    for (const entry of entries) {
      if (entry.score === '' || entry.score === null || entry.score === undefined) continue;

      const score = parseFloat(entry.score);
      if (Number.isNaN(score) || score < 0 || score > assessment.max_score) {
        return res.status(400).json({
          error: `Score must be between 0 and ${assessment.max_score} for ${assessment.name}`
        });
      }

      const existing = await db.get(
        'SELECT id FROM formative_grades WHERE assessment_id = ? AND student_id = ?',
        [assessment.id, entry.studentId]
      );

      if (existing) {
        await db.run(`
          UPDATE formative_grades
          SET score = ?, max_score = ?, teacher_id = ?,
              updated_at = ${db.usePg ? 'NOW()' : "datetime('now')"}
          WHERE id = ?
        `, [score, assessment.max_score, user.id, existing.id]);
      } else {
        await db.run(`
          INSERT INTO formative_grades
            (student_id, teacher_id, assessment_id, subject, grade_level, section,
             assessment_type, assessment_name, score, max_score)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          entry.studentId, user.id, assessment.id,
          assessment.subject, assessment.grade_level, assessment.section,
          assessment.assessment_type, assessment.name, score, assessment.max_score
        ]);
      }
    }

    await logAction(req, {
      action: 'assessment.save_marks',
      entityType: 'assessment',
      entityId: assessment.id,
      details: { count: entries.length }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const user = req.session.user;
    const { status } = req.body;
    const assessment = await loadAssessment(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    if (user.role === 'teacher') {
      const allowed = await verifyTeacherClass(
        user.id, assessment.grade_level, assessment.section, assessment.subject
      );
      if (!allowed) return res.status(403).json({ error: 'You are not assigned to this class' });
    }

    if (status && !['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (status) {
      await db.run(`
        UPDATE assessments SET status = ?,
          updated_at = ${db.usePg ? 'NOW()' : "datetime('now')"}
        WHERE id = ?
      `, [status, assessment.id]);
    }

    const updated = await loadAssessment(assessment.id);
    res.json({ assessment: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
