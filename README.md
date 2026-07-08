# School Portal

Minimal school portal with admin uploads, user auth, and activity logging.

## Important: GitHub Pages vs live app

**GitHub Pages can only show the frontend** (HTML/CSS). It cannot run the Node.js server, database, login, or file uploads.

| Host | What works |
|------|------------|
| **Render** (recommended) | Everything — login, uploads, admin, database |
| **GitHub Pages** | Frontend only — login needs a Render backend connected |

## Run locally (full app)

```bash
npm install
npm start
```

Open http://localhost:3000 — sign in with `admin@school.com` / `admin123`

## Deploy online (recommended — full app)

1. Go to [render.com](https://render.com) and sign up
2. **New → Blueprint** → connect this GitHub repo
3. Render reads `render.yaml` and deploys automatically
4. Use your Render URL (e.g. `https://school-portal-xxxx.onrender.com`) — **this is your live website**

## GitHub Pages setup (frontend only)

If you want your GitHub Pages link to show the login page instead of the README:

1. Go to your repo on GitHub → **Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. Push to `main` — the workflow deploys the `docs/` folder automatically
4. Your site will be at `https://YOUR-USERNAME.github.io/school_portal/`

### Connect GitHub Pages to Render backend

After deploying to Render, edit `docs/index.html` and set your Render URL:

```html
<meta name="api-base" content="https://YOUR-APP.onrender.com">
```

Also set the same meta tag in `portal.html`, `register.html`, and `admin.html`.

On Render, add environment variable:

```
CORS_ORIGIN=https://YOUR-USERNAME.github.io
```

Then login from GitHub Pages will talk to your Render server.

**Easier option:** skip GitHub Pages and just share your Render URL — everything works on one link.

## Admin features

- Upload schedules and grades as **images** or **Excel/CSV**
- Manage users and roles
- View activity log of all changes

## Demo login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@school.com | admin123 |

## Project structure

```
docs/           Website files (GitHub Pages + Express)
server.js       Node.js server
db/             SQLite database
render.yaml     Render deployment config
```
