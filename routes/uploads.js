const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/init');
const { upload } = require('../middleware/upload');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../lib/audit');
const { isImage, isDataFile, parseDataFile } = require('../lib/parse');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { type } = req.query;
  let sql = `
    SELECT id, content_type, display_format, title, label, original_filename, created_at
    FROM content_uploads WHERE is_active = 1
  `;
  const params = [];

  if (type) {
    sql += ' AND content_type = ?';
    params.push(type);
  }

  sql += ' ORDER BY created_at DESC';
  const uploads = db.prepare(sql).all(...params);
  res.json({ uploads });
});

router.get('/:id', requireAuth, (req, res) => {
  const item = db.prepare(`
    SELECT id, content_type, display_format, title, label, file_path, original_filename,
           mime_type, parsed_data, created_at
    FROM content_uploads WHERE id = ? AND is_active = 1
  `).get(req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Upload not found' });
  }

  res.json({
    upload: {
      ...item,
      file_url: `/uploads/${path.basename(item.file_path)}`,
      parsed_data: item.parsed_data ? JSON.parse(item.parsed_data) : null
    }
  });
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
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'contentType must be schedule or grades' });
    }
    if (!title?.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Title is required' });
    }

    const image = isImage(req.file.mimetype);
    const dataFile = isDataFile(req.file.originalname, req.file.mimetype);

    if (!image && !dataFile) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Upload an image or CSV/Excel file' });
    }

    let parsedData = null;
    if (dataFile) {
      try {
        parsedData = parseDataFile(req.file.path, req.file.originalname);
      } catch (err) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `Could not parse file: ${err.message}` });
      }
    }

    const result = db.prepare(`
      INSERT INTO content_uploads
        (content_type, display_format, title, label, file_path, original_filename, mime_type, parsed_data, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contentType,
      image ? 'image' : 'data',
      title.trim(),
      label?.trim() || null,
      req.file.path,
      req.file.originalname,
      req.file.mimetype,
      parsedData ? JSON.stringify(parsedData) : null,
      req.session.user.id
    );

    logAction(req, {
      action: 'upload.create',
      entityType: 'content_upload',
      entityId: result.lastInsertRowid,
      details: { contentType, title, format: image ? 'image' : 'data', filename: req.file.originalname }
    });

    const created = db.prepare(`
      SELECT id, content_type, display_format, title, label, original_filename, created_at
      FROM content_uploads WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ upload: created });
    } catch (innerErr) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: innerErr.message });
    }
  });
});

router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const item = db.prepare('SELECT * FROM content_uploads WHERE id = ?').get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Upload not found' });
  }

  db.prepare('UPDATE content_uploads SET is_active = 0 WHERE id = ?').run(req.params.id);

  logAction(req, {
    action: 'upload.delete',
    entityType: 'content_upload',
    entityId: item.id,
    details: { title: item.title, contentType: item.content_type }
  });

  res.json({ success: true });
});

module.exports = router;
