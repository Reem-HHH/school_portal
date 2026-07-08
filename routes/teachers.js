const express = require('express');
const db = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const teachers = await db.all(`
      SELECT id, email, full_name, is_active, created_at
      FROM users WHERE role = 'teacher'
      ORDER BY full_name
    `);

    for (const t of teachers) {
      const assignments = await db.all(
        'SELECT id, subject, grade, section FROM teacher_assignments WHERE teacher_id = ?',
        [t.id]
      );
      t.assignments = assignments;
      t.subjects = [...new Set(assignments.map(a => a.subject))].join(', ');
    }

    res.json({ teachers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/assignments', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id, 10);
    if (req.session.user.role === 'teacher' && req.session.user.id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const assignments = await db.all(
      'SELECT * FROM teacher_assignments WHERE teacher_id = ? ORDER BY grade, section, subject',
      [teacherId]
    );
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/assignments', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { subject, grade, section } = req.body;
    if (!subject || !grade || !section) {
      return res.status(400).json({ error: 'Subject, grade, and section are required' });
    }

    await db.run(
      'INSERT INTO teacher_assignments (teacher_id, subject, grade, section) VALUES (?, ?, ?, ?)',
      [req.params.id, subject.trim(), grade, section]
    );

    const assignments = await db.all(
      'SELECT * FROM teacher_assignments WHERE teacher_id = ? ORDER BY grade, section, subject',
      [req.params.id]
    );
    res.status(201).json({ assignments });
  } catch (err) {
    if (String(err.message).includes('UNIQUE') || String(err.message).includes('unique')) {
      return res.status(409).json({ error: 'This assignment already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/assignments/:assignmentId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.run(
      'DELETE FROM teacher_assignments WHERE id = ? AND teacher_id = ?',
      [req.params.assignmentId, req.params.id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    const assignments = await db.all(
      'SELECT * FROM teacher_assignments WHERE teacher_id = ? ORDER BY grade, section, subject',
      [req.params.id]
    );
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
