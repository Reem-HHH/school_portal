const express = require('express');
const db = require('../db/index');
const { requireAuth } = require('../middleware/auth');
const { canAccessStudent } = require('../lib/rbac');

const router = express.Router();
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

router.get('/teacher', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Teachers only' });
    }

    const teacherId = user.role === 'admin' && req.query.teacherId
      ? req.query.teacherId
      : user.id;

    const entries = await db.all(
      'SELECT day, time_slot, subject FROM schedule_entries WHERE teacher_id = ? ORDER BY day, time_slot',
      [teacherId]
    );

    res.json({ days: DAYS, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/class', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    let { grade, section, studentId } = req.query;

    if (user.role === 'student') {
      const me = await db.get('SELECT grade, section FROM students WHERE user_id = ?', [user.id]);
      if (!me) return res.json({ days: DAYS, entries: [] });
      grade = me.grade;
      section = me.section;
    } else if (user.role === 'parent') {
      if (!studentId) return res.status(400).json({ error: 'studentId required' });
      const allowed = await canAccessStudent(user, studentId);
      if (!allowed) return res.status(403).json({ error: 'Access denied' });
      const child = await db.get('SELECT grade, section FROM students WHERE id = ?', [studentId]);
      if (!child) return res.status(404).json({ error: 'Student not found' });
      grade = child.grade;
      section = child.section;
    }

    if (!grade || !section) {
      return res.status(400).json({ error: 'grade and section are required' });
    }

    const entries = await db.all(
      'SELECT day, time_slot, subject FROM schedule_entries WHERE grade = ? AND section = ? ORDER BY day, time_slot',
      [grade, section]
    );

    res.json({ days: DAYS, entries, grade, section });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
