const express = require('express');
const db = require('../db/init');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { grade, section } = req.query;
  let students;

  if (grade && section) {
    students = db.prepare(
      'SELECT * FROM students WHERE grade = ? AND section = ? ORDER BY name'
    ).all(grade, section);
  } else {
    students = db.prepare('SELECT * FROM students ORDER BY name').all();
  }

  res.json({ students });
});

router.post('/', requireAuth, requireRole('admin', 'teacher'), (req, res) => {
  const { name, grade, section, parentPhone } = req.body;

  if (!name || !grade || !section) {
    return res.status(400).json({ error: 'Name, grade, and section are required' });
  }

  const result = db.prepare(
    'INSERT INTO students (name, grade, section, parent_phone, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(name.trim(), grade, section, parentPhone || null, req.session.user.id);

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ student });
});

router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const result = db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Student not found' });
  }
  res.json({ success: true });
});

router.get('/filters', requireAuth, (_req, res) => {
  const grades = db.prepare('SELECT DISTINCT grade FROM students ORDER BY grade').all().map(r => r.grade);
  const sections = db.prepare('SELECT DISTINCT section FROM students ORDER BY section').all().map(r => r.section);
  const combos = db.prepare(
    'SELECT DISTINCT grade, section FROM students ORDER BY grade, section'
  ).all();

  res.json({ grades, sections, combos });
});

module.exports = router;
