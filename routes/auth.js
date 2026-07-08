const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../lib/audit');
const { dashboardPath } = require('../lib/rbac');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role, grade, section } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const allowedRoles = ['parent', 'student'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Registration is only available for parent and student roles' });
    }

    if (role === 'student' && (!grade || !section)) {
      return res.status(400).json({ error: 'Grade and section are required for student accounts' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = await db.run(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [email.toLowerCase().trim(), hash, fullName.trim(), role]
    );

    const user = await db.get(
      'SELECT id, email, full_name, role FROM users WHERE id = ?',
      [result.lastInsertRowid]
    );

    if (role === 'student') {
      const activeVal = db.usePg ? true : 1;
      await db.run(
        `INSERT INTO students (name, grade, section, user_id, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [fullName.trim(), grade.trim(), section.trim(), user.id, activeVal]
      );
    }

    req.session.user = user;
    await logAction(req, {
      action: 'user.register',
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, role: user.role }
    });

    res.status(201).json({ user, dashboard: dashboardPath(user.role) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.get(
      'SELECT id, email, password_hash, full_name, role, is_active FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (!user || !user.is_active) {
      await logAction(req, { action: 'auth.login_failed', details: { email: email.toLowerCase().trim() } });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      await logAction(req, { action: 'auth.login_failed', details: { email: email.toLowerCase().trim() } });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    req.session.user = sessionUser;
    await logAction(req, {
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, role: user.role }
    });

    res.json({ user: sessionUser, dashboard: dashboardPath(user.role) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', async (req, res) => {
  const user = req.session.user;
  await logAction(req, {
    action: 'auth.logout',
    entityType: 'user',
    entityId: user?.id,
    details: { email: user?.email }
  });

  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Could not log out' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({
    user: req.session.user,
    dashboard: dashboardPath(req.session.user.role)
  });
});

router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const allowedRoles = ['admin', 'teacher', 'parent', 'student'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = await db.run(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [email.toLowerCase().trim(), hash, fullName.trim(), role]
    );

    const user = await db.get(
      'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = ?',
      [result.lastInsertRowid]
    );

    await logAction(req, {
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, role: user.role }
    });

    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await db.all(
      'SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, role, isActive } = req.body;

    const before = await db.get(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = ?',
      [id]
    );
    if (!before) {
      return res.status(404).json({ error: 'User not found' });
    }

    const allowedRoles = ['admin', 'teacher', 'parent', 'student'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (fullName) {
      await db.run('UPDATE users SET full_name = ? WHERE id = ?', [fullName.trim(), id]);
    }
    if (role) {
      await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    }
    if (typeof isActive === 'boolean') {
      const activeVal = db.usePg ? isActive : (isActive ? 1 : 0);
      await db.run('UPDATE users SET is_active = ? WHERE id = ?', [activeVal, id]);
    }

    const updated = await db.get(
      'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = ?',
      [id]
    );

    await logAction(req, {
      action: 'user.update',
      entityType: 'user',
      entityId: parseInt(id, 10),
      details: { before, after: updated }
    });

    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await db.get('SELECT id, email, full_name, role FROM users WHERE id = ?', [id]);
    const result = await db.run('DELETE FROM users WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAction(req, {
      action: 'user.delete',
      entityType: 'user',
      entityId: parseInt(id, 10),
      details: user
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
