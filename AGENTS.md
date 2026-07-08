# AGENTS.md

## Cursor Cloud specific instructions

This is a single Node.js/Express app (Digital School Management Portal) using SQLite via `better-sqlite3`. There is no separate frontend build — static files in `public/` are served directly by Express.

### Running

- Dev server (hot reload via `node --watch`): `npm run dev`. Plain start: `npm start`. Serves on `http://localhost:3000`.
- `.env` is git-ignored; copy from `.env.example` (defaults work for local dev). The update script does this automatically only when `.env` is missing.
- The SQLite DB is auto-created and seeded on startup at `data/school.db` (git-ignored). Deleting the `data/` dir resets all data; it re-seeds demo students, schedule, announcements, and the admin/teacher accounts on next start.

### Notable

- No test or lint scripts are configured (`package.json` has only `start` and `dev`).
- Seeded demo accounts: admin `admin@school.com` / `admin123`, teacher `teacher@school.com` / `teacher123`. Parents/students self-register at `/register.html`.
- Auth is session-cookie based; API calls need the session cookie from `POST /api/auth/login`.
