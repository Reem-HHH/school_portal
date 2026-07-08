# School Portal

Minimal school portal with admin uploads, user auth, and activity logging.

**Full step-by-step guide:** see [USER_GUIDE.md](./USER_GUIDE.md) for local/online setup, logins, uploads, where files are stored, and troubleshooting.

**Render MCP (deploy debugging):** see [RENDER_MCP_SETUP.md](./RENDER_MCP_SETUP.md) to connect Render MCP and set your workspace.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 — uses local SQLite automatically (no setup needed).

**Admin login:** `admin@school.com` / `admin123`

---

## Deploy on Render (free tier — no disk needed)

Render's free tier has no persistent disk, so the app uses a **free Neon PostgreSQL database** and stores uploaded files **inside the database**. Data persists across restarts.

### Step 1 — Create a free database (Neon)

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Create a new project
3. Copy the **connection string** (starts with `postgresql://...`)

### Step 2 — Deploy on Render

1. Go to [render.com](https://render.com) → **New → Blueprint**
2. Connect your GitHub repo: `Reem-HHH/school_portal`
3. When prompted, set **`DATABASE_URL`** to your Neon connection string
4. Deploy — your site will be at `https://school-portal-xxxx.onrender.com`

That's your live website. Login, uploads, admin, and activity log all work — no disk required.

### Step 3 — Save your admin password

Render generates a random `ADMIN_PASSWORD`. Find it in Render → your service → **Environment** tab, or set your own value there.

---

## GitHub Pages (optional — frontend only)

GitHub Pages can show the login page UI but **cannot run the server**. For a working site, use your **Render URL**.

To fix GitHub Pages showing the README instead of the login page:

1. Repo → **Settings → Pages → Source → GitHub Actions**
2. Push to `main` — the workflow deploys the `docs/` folder

---

## Admin features

- Upload schedules and grades as **images** or **Excel/CSV**
- Manage users and roles
- View activity log of all user changes

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | On Render | Neon PostgreSQL connection string |
| `SESSION_SECRET` | On Render | Random secret for sessions |
| `ADMIN_EMAIL` | Optional | Default admin email |
| `ADMIN_PASSWORD` | Optional | Default admin password |
| `CORS_ORIGIN` | Optional | Only if using GitHub Pages frontend |

## Project structure

```
docs/           Website files
server.js       Node.js server
db/             Database layer (SQLite local / PostgreSQL on Render)
render.yaml     Render deployment config
```
