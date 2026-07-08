const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpe?g|png|gif|webp|csv|xlsx|xls)$/i.test(file.originalname);
    if (!allowed) {
      return cb(new Error('Allowed: JPG, PNG, GIF, WebP, CSV, XLSX'));
    }
    cb(null, true);
  }
});

module.exports = { upload };
