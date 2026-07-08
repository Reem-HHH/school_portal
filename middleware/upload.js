const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpe?g|png|gif|webp|csv|xlsx|xls)$/i.test(file.originalname);
    if (!allowed) {
      return cb(new Error('Allowed: JPG, PNG, GIF, WebP, CSV, XLSX'));
    }
    cb(null, true);
  }
});

module.exports = { upload, uploadsDir };
