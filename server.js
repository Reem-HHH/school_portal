require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

require('./db/init');

const authRoutes = require('./routes/auth');
const uploadsRoutes = require('./routes/uploads');
const auditRoutes = require('./routes/audit');
const { attachUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
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
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));
app.use(attachUser);

app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/audit', auditRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'data', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.path.includes('.')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`School portal running on port ${PORT}`);
});
