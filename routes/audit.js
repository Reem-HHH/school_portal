const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getAuditLogs } = require('../lib/audit');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const offset = parseInt(req.query.offset, 10) || 0;
  const logs = getAuditLogs(limit, offset).map((log) => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null
  }));
  res.json({ logs });
});

module.exports = router;
