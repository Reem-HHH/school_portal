const express = require('express');
const db = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../lib/audit');
const { canAccessStudent } = require('../lib/rbac');
const { DAYS, isValidGrade, isValidSection, isValidDay } = require('../lib/validation');
const { safeError } = require('../lib/errors');

const router = express.Router();

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
      'SELECT id, day, time_slot, subject FROM schedule_entries WHERE teacher_id = ? ORDER BY day, time_slot',
      [teacherId]
    );

    res.json({ days: DAYS, entries });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
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
      'SELECT id, day, time_slot, subject FROM schedule_entries WHERE grade = ? AND section = ? ORDER BY day, time_slot',
      [grade, section]
    );

    res.json({ days: DAYS, entries, grade, section });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

router.get('/admin/class', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { grade, section } = req.query;
    if (!grade || !section) {
      return res.status(400).json({ error: 'grade and section are required' });
    }

    const entries = await db.all(
      'SELECT id, day, time_slot, subject FROM schedule_entries WHERE grade = ? AND section = ? ORDER BY day, time_slot',
      [grade, section]
    );

    res.json({ days: DAYS, entries, grade, section });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

router.post('/class', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { grade, section, day, timeSlot, subject } = req.body;

    if (!grade || !section || !day || !timeSlot || !subject) {
      return res.status(400).json({ error: 'grade, section, day, timeSlot, and subject are required' });
    }
    if (!isValidGrade(grade) || !isValidSection(section) || !isValidDay(day)) {
      return res.status(400).json({ error: 'Invalid grade, section, or day' });
    }

    const result = await db.run(
      'INSERT INTO schedule_entries (grade, section, day, time_slot, subject) VALUES (?, ?, ?, ?, ?)',
      [grade, section, day, timeSlot.trim(), subject.trim()]
    );

    await logAction(req, {
      action: 'schedule.create',
      entityType: 'schedule',
      entityId: result.lastInsertRowid,
      details: { grade, section, day, timeSlot, subject }
    });

    const entry = await db.get('SELECT id, day, time_slot, subject FROM schedule_entries WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ entry });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { day, timeSlot, subject } = req.body;
    const existing = await db.get('SELECT * FROM schedule_entries WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Schedule entry not found' });

    if (day && !isValidDay(day)) {
      return res.status(400).json({ error: 'Invalid day' });
    }

    if (day) await db.run('UPDATE schedule_entries SET day = ? WHERE id = ?', [day, req.params.id]);
    if (timeSlot) await db.run('UPDATE schedule_entries SET time_slot = ? WHERE id = ?', [timeSlot.trim(), req.params.id]);
    if (subject) await db.run('UPDATE schedule_entries SET subject = ? WHERE id = ?', [subject.trim(), req.params.id]);

    const entry = await db.get('SELECT id, grade, section, day, time_slot, subject FROM schedule_entries WHERE id = ?', [req.params.id]);

    await logAction(req, {
      action: 'schedule.update',
      entityType: 'schedule',
      entityId: parseInt(req.params.id, 10),
      details: entry
    });

    res.json({ entry });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM schedule_entries WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Schedule entry not found' });

    await db.run('DELETE FROM schedule_entries WHERE id = ?', [req.params.id]);

    await logAction(req, {
      action: 'schedule.delete',
      entityType: 'schedule',
      entityId: parseInt(req.params.id, 10),
      details: existing
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

module.exports = router;
