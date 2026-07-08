const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/init');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../lib/audit');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password, fullName, role } = req.body;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const allowedRoles = ['parent', 'student'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Registration is only available for parent and student roles' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
  ).run(email.toLowerCase().trim(), hash, fullName.trim(), role);

  const user = db.prepare(
    'SELECT id, email, full_name, role FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);

  req.session.user = user;

  logAction(req, {
    action: 'user.register',
    entityType: 'user',
    entityId: user.id,
    details: { email: user.email, role: user.role }
  });

  res.status(201).json({ user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare(
    'SELECT id, email, password_hash, full_name, role, is_active FROM users WHERE email = ?'
  ).get(email.toLowerCase().trim());

  if (!user || !user.is_active) {
    logAction(req, { action: 'auth.login_failed', details: { email: email.toLowerCase().trim() } });
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    logAction(req, { action: 'auth.login_failed', details: { email: email.toLowerCase().trim() } });
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const sessionUser = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role
  };

  req.session.user = sessionUser;

  logAction(req, {
    action: 'auth.login',
    entityType: 'user',
    entityId: user.id,
    details: { email: user.email, role: user.role }
  });

  res.json({ user: sessionUser });
});

router.post('/logout', (req, res) => {
  const user = req.session.user;
  logAction(req, {
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
  res.json({ user: req.session.user });
});

router.post('/users', requireAuth, requireRole('admin'), (req, res) => {
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

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
  ).run(email.toLowerCase().trim(), hash, fullName.trim(), role);

  const user = db.prepare(
    'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);

  logAction(req, {
    action: 'user.create',
    entityType: 'user',
    entityId: user.id,
    details: { email: user.email, role: user.role }
  });

  res.status(201).json({ user });
});

router.get('/users', requireAuth, requireRole('admin'), (req, res) => {
  const users = db.prepare(
    'SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json({ users });
});

router.patch('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { fullName, role, isActive } = req.body;

  const before = db.prepare('SELECT id, email, full_name, role, is_active FROM users WHERE id = ?').get(id);
  if (!before) {
    return res.status(404).json({ error: 'User not found' });
  }

  const allowedRoles = ['admin', 'teacher', 'parent', 'student'];
  if (role && !allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  if (fullName) {
    db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(fullName.trim(), id);
  }
  if (role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  }
  if (typeof isActive === 'boolean') {
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
  }

  const updated = db.prepare(
    'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = ?'
  ).get(id);

  logAction(req, {
    action: 'user.update',
    entityType: 'user',
    entityId: parseInt(id, 10),
    details: { before, after: updated }
  });

  res.json({ user: updated });
});

router.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  const { id } = req.params;

  if (parseInt(id, 10) === req.session.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const user = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(id);
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  logAction(req, {
    action: 'user.delete',
    entityType: 'user',
    entityId: parseInt(id, 10),
    details: user
  });

  res.json({ success: true });
});

module.exports = router;
