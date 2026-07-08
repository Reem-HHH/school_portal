const express = require('express');
const db = require('../db/init');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { grade, section, examType } = req.query;

  if (!grade || !section || !examType) {
    return res.status(400).json({ error: 'grade, section, and examType are required' });
  }

  const rows = db.prepare(`
    SELECT s.id, s.name, g.score
    FROM students s
    LEFT JOIN grades g ON g.student_id = s.id AND g.exam_type = ?
    WHERE s.grade = ? AND s.section = ?
    ORDER BY s.name
  `).all(examType, grade, section);

  res.json({ grades: rows });
});

router.post('/bulk', requireAuth, requireRole('admin', 'teacher'), (req, res) => {
  const { examType, entries } = req.body;

  if (!examType || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'examType and entries array are required' });
  }

  const upsert = db.prepare(`
    INSERT INTO grades (student_id, exam_type, score, teacher_id, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(student_id, exam_type) DO UPDATE SET
      score = excluded.score,
      teacher_id = excluded.teacher_id,
      updated_at = datetime('now')
  `);

  const saveMany = db.transaction((items) => {
    for (const item of items) {
      if (item.score === null || item.score === undefined || item.score === '') continue;
      const score = parseInt(item.score, 10);
      if (Number.isNaN(score) || score < 0 || score > 100) {
        throw new Error(`Invalid score for student ${item.studentId}`);
      }
      upsert.run(item.studentId, examType, score, req.session.user.id);
    }
  });

  try {
    saveMany(entries);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
