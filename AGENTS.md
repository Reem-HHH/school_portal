# AGENTS.md

## Cursor Cloud specific instructions

This is a single-service Node.js/Express app ("School Portal"). See `README.md` and `USER_GUIDE.md` for full details; standard commands live in `package.json`.

### Running the app
- Start (dev, auto-reload): `npm run dev` (runs `node --watch server.js`). Production-style: `npm start`.
- The server listens on port `3000` (override with `PORT`) at `http://localhost:3000`.
- Seeded admin login: `admin@school.com` / `admin123` (override via `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

### Database (non-obvious)
- With no `DATABASE_URL` set, the app automatically uses an embedded **SQLite** DB at `data/school.db` (auto-created; `data/` is gitignored). No external DB or extra service is needed to run/test locally.
- Setting `DATABASE_URL` switches the app to **PostgreSQL** (Neon) — used only for production/Render. Leave it unset for local development.
- Tables and the admin user are created/seeded automatically on startup by `initDb()`; there is no separate migration step.

### Tests / lint
- There is no test suite and no lint config in this repo (no `test`/`lint` npm scripts, no CI beyond the GitHub Pages deploy workflow). Verify changes by running the server and exercising the API/UI.

### Uploads
- Uploaded files (schedules/grades) are stored inside the DB as binary; `xlsx`/CSV files are parsed into JSON on upload. Only `admin` role can upload.
