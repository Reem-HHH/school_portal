# School Portal

Minimal school portal. Admins upload schedules and grades as **images** or **Excel/CSV files**. All user actions are logged.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000

**Admin:** `admin@school.com` / `admin123`

## Features

- Minimal black-and-white UI
- Admin uploads for schedules and grades (image or spreadsheet)
- Spreadsheet files are parsed and shown as tables; images are displayed directly
- User login, registration (parent/student), admin user management
- Activity log of every login, upload, and user change

## Admin uploads

| Type | Image | Data file |
|------|-------|-----------|
| Schedule | JPG, PNG, WebP | CSV or Excel (first row = headers) |
| Grades | JPG, PNG, WebP | CSV or Excel (first row = headers) |

Go to **Admin → Uploads** to publish content. Users see it under **Schedules** or **Grades** on the main portal.

## Deploy online (Render — free tier)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Blueprint**
3. Connect the repo — Render reads `render.yaml` automatically
4. Set a strong `ADMIN_PASSWORD` in the dashboard after deploy
5. Your site will be at `https://your-app.onrender.com`

The Render config mounts a **persistent disk** at `data/` so uploads and the database survive restarts.

### Deploy with Docker (any host)

```bash
docker build -t school-portal .
docker run -p 3000:3000 -v school-data:/app/data -e SESSION_SECRET=your-secret school-portal
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 3000) |
| `SESSION_SECRET` | Required in production |
| `ADMIN_EMAIL` | First admin email |
| `ADMIN_PASSWORD` | First admin password |
| `NODE_ENV` | Set to `production` when deployed |

## Project structure

```
server.js           Express server
db/init.js          SQLite schema
routes/             API routes
lib/audit.js        Activity logging
public/             Frontend pages
data/               Database + uploads (auto-created)
render.yaml         Render deployment config
```
