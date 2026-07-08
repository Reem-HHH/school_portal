const db = require('../db/init');

function logAction(req, { action, entityType = null, entityId = null, details = {} }) {
  const user = req.session?.user;
  db.prepare(`
    INSERT INTO audit_logs (user_id, user_email, user_name, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user?.id ?? null,
    user?.email ?? 'system',
    user?.full_name ?? null,
    action,
    entityType,
    entityId,
    JSON.stringify(details),
    req.ip || req.headers['x-forwarded-for'] || null
  );
}

function getAuditLogs(limit = 100, offset = 0) {
  return db.prepare(`
    SELECT id, user_id, user_email, user_name, action, entity_type, entity_id, details, ip_address, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

module.exports = { logAction, getAuditLogs };
