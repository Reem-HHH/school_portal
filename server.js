require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const uploadsRoutes = require('./routes/uploads');
const auditRoutes = require('./routes/audit');
const { attachUser } = require('./middleware/auth');
const { initDb } = require('./db/index');

const app = express();
const PORT = process.env.PORT || 3000;
const DOCS = path.join(__dirname, 'docs');

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin === corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: corsOrigin ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));
app.use(attachUser);

app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/audit', auditRoutes);

app.use(express.static(DOCS));

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(DOCS, 'admin.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.path.includes('.')) return next();
  res.sendFile(path.join(DOCS, 'portal.html'));
});

initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`School portal running on port ${PORT}`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL (Neon)' : 'SQLite (local)'}`);
  });
}).catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
