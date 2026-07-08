const db = require('../db/index');

async function logAction(req, { action, entityType = null, entityId = null, details = {} }) {
  const user = req.session?.user;
  const detailsValue = db.usePg ? details : JSON.stringify(details);

  await db.run(`
    INSERT INTO audit_logs (user_id, user_email, user_name, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    user?.id ?? null,
    user?.email ?? 'system',
    user?.full_name ?? null,
    action,
    entityType,
    entityId,
    detailsValue,
    req.ip || req.headers['x-forwarded-for'] || null
  ]);
}

async function getAuditLogs(limit = 100, offset = 0) {
  const logs = await db.all(`
    SELECT id, user_id, user_email, user_name, action, entity_type, entity_id, details, ip_address, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);

  return logs.map(log => ({
    ...log,
    details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
  }));
}

module.exports = { logAction, getAuditLogs };
