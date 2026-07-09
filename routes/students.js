const express = require('express');
const db = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../lib/audit');
const { canAccessStudent } = require('../lib/rbac');
const { GRADES, SECTIONS, isValidGrade, isValidSection } = require('../lib/validation');
const { safeError } = require('../lib/errors');

const router = express.Router();
const activeClause = db.usePg ? 'is_active = true' : 'is_active = 1';

router.get('/meta', requireAuth, requireRole('admin'), (_req, res) => {
  res.json({ grades: GRADES, sections: SECTIONS });
});

async function validateUserLink(userId, expectedRole, studentId) {
  if (!userId) return null;

  const user = await db.get(
    'SELECT id, role, is_active FROM users WHERE id = ?',
    [userId]
  );
  if (!user) {
    throw Object.assign(new Error('Linked user not found'), { status: 404 });
  }
  if (!user.is_active) {
    throw Object.assign(new Error('Linked user account is inactive'), { status: 400 });
  }
  if (user.role !== expectedRole) {
    throw Object.assign(new Error(`User must have the ${expectedRole} role`), { status: 400 });
  }

  const existing = await db.get(
    `SELECT id FROM students WHERE ${expectedRole === 'student' ? 'user_id' : 'parent_user_id'} = ? AND id != ?`,
    [userId, studentId || 0]
  );
  if (existing) {
    throw Object.assign(new Error(`This ${expectedRole} is already linked to another student`), { status: 409 });
  }

  return user;
}

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { grade, section } = req.query;
    let sql = `SELECT s.*, u.email as user_email, p.full_name as parent_name,
                      s.parent_user_id, s.user_id
               FROM students s
               LEFT JOIN users u ON u.id = s.user_id
               LEFT JOIN users p ON p.id = s.parent_user_id
               WHERE s.${activeClause}`;
    const params = [];

    if (grade) { sql += ' AND s.grade = ?'; params.push(grade); }
    if (section) { sql += ' AND s.section = ?'; params.push(section); }
    sql += ' ORDER BY s.grade, s.section, s.name';

    const students = await db.all(sql, params);
    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

router.get('/filters', requireAuth, requireRole('admin', 'teacher'), async (_req, res) => {
  try {
    const grades = (await db.all(
      `SELECT DISTINCT grade FROM students WHERE ${activeClause} ORDER BY grade`
    )).map(r => r.grade);
    const sections = (await db.all(
      `SELECT DISTINCT section FROM students WHERE ${activeClause} ORDER BY section`
    )).map(r => r.section);
    const combos = await db.all(
      `SELECT DISTINCT grade, section FROM students WHERE ${activeClause} ORDER BY grade, section`
    );
    res.json({ grades, sections, combos });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;

    if (user.role === 'student') {
      const student = await db.get(
        `SELECT * FROM students WHERE user_id = ? AND ${activeClause}`,
        [user.id]
      );
      return res.json({ student });
    }

    if (user.role === 'parent') {
      const children = await db.all(
        `SELECT * FROM students WHERE parent_user_id = ? AND ${activeClause} ORDER BY name`,
        [user.id]
      );
      return res.json({ children });
    }

    res.status(403).json({ error: 'Not a student or parent account' });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const allowed = await canAccessStudent(req.session.user, req.params.id);
    if (!allowed) return res.status(403).json({ error: 'Access denied' });

    const student = await db.get(
      `SELECT s.*, u.email as user_email, p.full_name as parent_name
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN users p ON p.id = s.parent_user_id
       WHERE s.id = ? AND s.${activeClause}`,
      [req.params.id]
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ student });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, grade, section, parentUserId, userId, dateOfBirth } = req.body;
    if (!name || !grade || !section) {
      return res.status(400).json({ error: 'Name, grade, and section are required' });
    }
    if (!isValidGrade(grade)) {
      return res.status(400).json({ error: 'Invalid grade. Use Grade 1 through Grade 4.' });
    }
    if (!isValidSection(section)) {
      return res.status(400).json({ error: 'Invalid section. Use Section A through Section D.' });
    }

    if (parentUserId) await validateUserLink(parentUserId, 'parent', null);
    if (userId) await validateUserLink(userId, 'student', null);

    const activeVal = db.usePg ? true : 1;
    const result = await db.run(
      `INSERT INTO students (name, grade, section, parent_user_id, user_id, date_of_birth, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), grade, section, parentUserId || null, userId || null, dateOfBirth || null, activeVal]
    );

    await logAction(req, {
      action: 'student.create',
      entityType: 'student',
      entityId: result.lastInsertRowid,
      details: { name, grade, section }
    });

    const student = await db.get('SELECT * FROM students WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ student });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || safeError(err) });
  }
});

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, grade, section, parentUserId, userId, isActive } = req.body;
    const student = await db.get('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (grade && !isValidGrade(grade)) {
      return res.status(400).json({ error: 'Invalid grade. Use Grade 1 through Grade 4.' });
    }
    if (section && !isValidSection(section)) {
      return res.status(400).json({ error: 'Invalid section. Use Section A through Section D.' });
    }

    if (parentUserId !== undefined && parentUserId) {
      await validateUserLink(parentUserId, 'parent', req.params.id);
    }
    if (userId !== undefined && userId) {
      await validateUserLink(userId, 'student', req.params.id);
    }

    if (name) await db.run('UPDATE students SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
    if (grade) await db.run('UPDATE students SET grade = ? WHERE id = ?', [grade, req.params.id]);
    if (section) await db.run('UPDATE students SET section = ? WHERE id = ?', [section, req.params.id]);
    if (parentUserId !== undefined) {
      await db.run('UPDATE students SET parent_user_id = ? WHERE id = ?', [parentUserId || null, req.params.id]);
    }
    if (userId !== undefined) {
      await db.run('UPDATE students SET user_id = ? WHERE id = ?', [userId || null, req.params.id]);
    }
    if (typeof isActive === 'boolean') {
      const val = db.usePg ? isActive : (isActive ? 1 : 0);
      await db.run('UPDATE students SET is_active = ? WHERE id = ?', [val, req.params.id]);
    }

    const updated = await db.get('SELECT * FROM students WHERE id = ?', [req.params.id]);
    await logAction(req, { action: 'student.update', entityType: 'student', entityId: parseInt(req.params.id, 10), details: updated });
    res.json({ student: updated });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || safeError(err) });
  }
});

module.exports = router;
