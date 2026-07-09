require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./routes/auth');
const auditRoutes = require('./routes/audit');
const studentsRoutes = require('./routes/students');
const teachersRoutes = require('./routes/teachers');
const gradebookRoutes = require('./routes/gradebook');
const assessmentsRoutes = require('./routes/assessments');
const schedulesRoutes = require('./routes/schedules');
const exportsRoutes = require('./routes/exports');
const { attachUser } = require('./middleware/auth');
const { initDb, get } = require('./db/index');
const { isProduction } = require('./lib/errors');

const app = express();
const PORT = process.env.PORT || 3000;
const DOCS = path.join(__dirname, 'docs');

if (isProduction()) {
  app.set('trust proxy', 1);
}

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

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
    secure: isProduction(),
    sameSite: corsOrigin ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));
app.use(attachUser);

app.get('/api/health', async (_req, res) => {
  try {
    await get('SELECT 1 AS ok');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/api/config', (_req, res) => {
  const seedDemo = process.env.SEED_DEMO_DATA === 'true'
    || (!isProduction() && process.env.SEED_DEMO_DATA !== 'false');
  res.json({
    isProduction: isProduction(),
    showLoginHints: process.env.SHOW_LOGIN_HINTS === 'true' || !isProduction(),
    showSampleData: seedDemo
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/gradebook', gradebookRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/exports', exportsRoutes);

app.get('/portal.html', (_req, res) => res.redirect(301, '/'));
app.get('/admin.html', (_req, res) => res.redirect(301, '/dashboard-admin'));

app.use(express.static(DOCS));

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(DOCS, 'dashboard-admin.html'));
});

app.get('/dashboard-admin', (_req, res) => {
  res.sendFile(path.join(DOCS, 'dashboard-admin.html'));
});

app.get('/dashboard-teacher', (_req, res) => {
  res.sendFile(path.join(DOCS, 'dashboard-teacher.html'));
});

app.get('/dashboard-student', (_req, res) => {
  res.sendFile(path.join(DOCS, 'dashboard-student.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.path.includes('.')) return next();
  res.sendFile(path.join(DOCS, 'index.html'));
});

initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`School portal running on port ${PORT}`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL (Neon)' : 'SQLite (local)'}`);
    if (isProduction()) {
      console.log(`Demo data seeding: ${process.env.SEED_DEMO_DATA === 'true' ? 'enabled' : 'disabled'}`);
    }
  });
}).catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
