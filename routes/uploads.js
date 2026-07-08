const express = require('express');
const db = require('../db/index');
const { upload } = require('../middleware/upload');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../lib/audit');
const { isImage, isDataFile, parseDataFile } = require('../lib/parse');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { type } = req.query;
    let sql = `
      SELECT id, content_type, display_format, title, label, original_filename, created_at
      FROM content_uploads WHERE is_active = ${db.usePg ? 'true' : '1'}
    `;
    const params = [];

    if (type) {
      sql += ' AND content_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC';
    const uploads = await db.all(sql, params);
    res.json({ uploads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/file', requireAuth, async (req, res) => {
  try {
    const item = await db.get(
      'SELECT file_data, mime_type, original_filename FROM content_uploads WHERE id = ? AND is_active = ' + (db.usePg ? 'true' : '1'),
      [req.params.id]
    );

    if (!item || !item.file_data) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', item.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${item.original_filename}"`);
    res.send(item.file_data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const item = await db.get(`
      SELECT id, content_type, display_format, title, label, original_filename,
             mime_type, parsed_data, created_at
      FROM content_uploads WHERE id = ? AND is_active = ${db.usePg ? 'true' : '1'}
    `, [req.params.id]);

    if (!item) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    let parsed = item.parsed_data;
    if (parsed && typeof parsed === 'string') parsed = JSON.parse(parsed);

    res.json({
      upload: {
        ...item,
        file_url: `/api/uploads/${item.id}/file`,
        parsed_data: parsed
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { contentType, title, label } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
      }
      if (!contentType || !['schedule', 'grades'].includes(contentType)) {
        return res.status(400).json({ error: 'contentType must be schedule or grades' });
      }
      if (!title?.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const image = isImage(req.file.mimetype);
      const dataFile = isDataFile(req.file.originalname, req.file.mimetype);

      if (!image && !dataFile) {
        return res.status(400).json({ error: 'Upload an image or CSV/Excel file' });
      }

      let parsedData = null;
      if (dataFile) {
        try {
          parsedData = parseDataFile(req.file.buffer, req.file.originalname);
        } catch (parseErr) {
          return res.status(400).json({ error: `Could not parse file: ${parseErr.message}` });
        }
      }

      const parsedValue = parsedData
        ? (db.usePg ? parsedData : JSON.stringify(parsedData))
        : null;

      const result = await db.run(`
        INSERT INTO content_uploads
          (content_type, display_format, title, label, file_data, original_filename, mime_type, parsed_data, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        contentType,
        image ? 'image' : 'data',
        title.trim(),
        label?.trim() || null,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        parsedValue,
        req.session.user.id
      ]);

      await logAction(req, {
        action: 'upload.create',
        entityType: 'content_upload',
        entityId: result.lastInsertRowid,
        details: { contentType, title, format: image ? 'image' : 'data', filename: req.file.originalname }
      });

      const created = await db.get(`
        SELECT id, content_type, display_format, title, label, original_filename, created_at
        FROM content_uploads WHERE id = ?
      `, [result.lastInsertRowid]);

      res.status(201).json({ upload: created });
    } catch (innerErr) {
      res.status(500).json({ error: innerErr.message });
    }
  });
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const item = await db.get('SELECT * FROM content_uploads WHERE id = ?', [req.params.id]);
    if (!item) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    await db.run('UPDATE content_uploads SET is_active = ? WHERE id = ?', [db.usePg ? false : 0, req.params.id]);

    await logAction(req, {
      action: 'upload.delete',
      entityType: 'content_upload',
      entityId: item.id,
      details: { title: item.title, contentType: item.content_type }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
