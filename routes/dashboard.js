const express = require('express');
const db = require('../db/init');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', requireAuth, (req, res) => {
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  const classCombos = db.prepare(
    'SELECT COUNT(DISTINCT grade || section) as count FROM students'
  ).get().count;
  const pendingGrades = db.prepare(`
    SELECT COUNT(*) as count FROM students s
    WHERE NOT EXISTS (
      SELECT 1 FROM grades g WHERE g.student_id = s.id AND g.exam_type = 'Midterm Exam'
    )
  `).get().count;

  res.json({
    stats: {
      totalStudents,
      classCombos,
      pendingGrades
    }
  });
});

router.get('/announcements', requireAuth, (req, res) => {
  const announcements = db.prepare(
    'SELECT id, title, body, created_at FROM announcements ORDER BY created_at DESC LIMIT 5'
  ).all();
  res.json({ announcements });
});

router.post('/announcements', requireAuth, requireRole('admin', 'teacher'), (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  const result = db.prepare(
    'INSERT INTO announcements (title, body, created_by) VALUES (?, ?, ?)'
  ).run(title.trim(), body.trim(), req.session.user.id);

  const announcement = db.prepare(
    'SELECT id, title, body, created_at FROM announcements WHERE id = ?'
  ).get(result.lastInsertRowid);

  res.status(201).json({ announcement });
});

module.exports = router;
