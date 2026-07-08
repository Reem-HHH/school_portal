const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getAuditLogs } = require('../lib/audit');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const offset = parseInt(req.query.offset, 10) || 0;
    const logs = await getAuditLogs(limit, offset);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
