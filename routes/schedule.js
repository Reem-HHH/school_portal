const express = require('express');
const db = require('../db/init');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
const TIME_SLOTS = ['8:00 - 8:45', '9:00 - 9:45', '10:00 - 10:45', '11:00 - 11:45'];

router.get('/', requireAuth, (req, res) => {
  const { grade, section } = req.query;

  if (!grade || !section) {
    return res.status(400).json({ error: 'grade and section are required' });
  }

  const entries = db.prepare(
    'SELECT day, time_slot, subject FROM schedule_entries WHERE grade = ? AND section = ?'
  ).all(grade, section);

  const lookup = {};
  for (const e of entries) {
    lookup[`${e.time_slot}|${e.day}`] = e.subject;
  }

  const rows = TIME_SLOTS.map((time) => ({
    time,
    days: DAYS.reduce((acc, day) => {
      acc[day] = lookup[`${time}|${day}`] || '—';
      return acc;
    }, {})
  }));

  res.json({ days: DAYS, rows });
});

module.exports = router;
