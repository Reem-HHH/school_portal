# Login Information — Al Kharran Primary School Portal

Use this guide to sign in to the school portal on **Render** (production). Keep it private — do not commit real passwords to git.

---

## 1. Where to sign in

| Environment | URL | Works for login? |
|-------------|-----|------------------|
| **Render (production)** | `https://school-portal.onrender.com` or your service URL from the Render dashboard | **Yes** |
| **GitHub Pages** | `https://reem-hhh.github.io/school_portal/` | **No** (frontend only unless `api-base` meta tag points to Render) |
| **Local dev** | `http://localhost:3000` | Yes (with SQLite or Neon) |

**Always use your Render URL** for admin, teacher, parent, and student login in production.

Find your exact Render URL:

1. Open [Render Dashboard](https://dashboard.render.com)
2. Select the **school-portal** web service
3. Copy the URL at the top (e.g. `https://school-portal-xxxx.onrender.com`)

---

## 2. Default admin credentials (first deploy)

On first startup the app creates one admin account from environment variables.

| Field | Environment variable | Default (if not set) |
|-------|---------------------|----------------------|
| Email | `ADMIN_EMAIL` | `admin@school.com` |
| Password | `ADMIN_PASSWORD` | `admin123` |
| Display name | `ADMIN_NAME` | Al Kharran Primary School Administrator |

### Sign in steps

1. Open your **Render URL** in the browser
2. Wait 30–60 seconds if the free tier service was sleeping (first load can be slow)
3. Enter:
   - **Email:** value of `ADMIN_EMAIL` (default `admin@school.com`)
   - **Password:** value of `ADMIN_PASSWORD` in Render Environment
4. Click **Sign in**
5. You should land on the **Admin Dashboard**

---

## 3. Render environment variables (login-related)

In Render → **school-portal** → **Environment**:

| Variable | Purpose | Production recommendation |
|----------|---------|---------------------------|
| `ADMIN_EMAIL` | Admin login email | Set to your real admin email |
| `ADMIN_PASSWORD` | Admin login password | **Change from `admin123`** to a strong password |
| `ADMIN_NAME` | Admin display name | School administrator name |
| `ADMIN_SYNC_PASSWORD` | When `true`, overwrites admin password from `ADMIN_PASSWORD` on each restart | Use only when resetting password; set back to `false` after |
| `SESSION_SECRET` | Session cookie signing | Auto-generated on Render (keep secret) |
| `DATABASE_URL` | Neon PostgreSQL connection | **Required** — app will not work without it |
| `NODE_ENV` | `production` | Set automatically via `render.yaml` |
| `SEED_DEMO_DATA` | `true` = seed demo teachers/students on startup | **`false` in production** (default in `render.yaml`) |
| `SHOW_LOGIN_HINTS` | Show demo credentials on login page | Leave unset (hidden in production) |

---

## 4. Reset admin password on Render

The app **does not** change your password on every restart anymore. To reset the admin password:

### Option A — One-time sync (recommended)

1. Render → **Environment** → set:
   - `ADMIN_PASSWORD` = your new password
   - `ADMIN_SYNC_PASSWORD` = `true`
2. **Save** and wait for redeploy
3. Sign in with `ADMIN_EMAIL` + new `ADMIN_PASSWORD`
4. Set `ADMIN_SYNC_PASSWORD` back to `false` (or remove it) and redeploy  
   (prevents accidental password resets on future deploys)

### Option B — Create another admin user

1. Sign in as an existing admin
2. **Users** tab → **Create user** → role **Admin**
3. Use the new account; deactivate or delete the old one if needed

### Option C — Forgot everything

1. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SYNC_PASSWORD=true` in Render
2. Redeploy — on startup the admin account is created or password synced
3. Sign in, then set `ADMIN_SYNC_PASSWORD=false`

---

## 5. Demo / teacher accounts (local dev only)

When `SEED_DEMO_DATA=true` (default locally, **off on Render**), these accounts are created:

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Teacher | `teacher@school.com` | `teacher123` | Math, Science, PE |
| Teacher | `teacher2@school.com` | `teacher123` | Arabic, English, Islamic Studies, Art |
| Parent | `parent@school.com` | `parent123` | Linked to Ahmed Al-Mansouri (Grade 1A) |
| Student | `student@school.com` | `student123` | Ahmed Al-Mansouri (Grade 1A) |

Demo data includes 32 students (2 per class), full weekly timetables (7:30 start), teacher assignments for all scheduled subjects, and sample formative grades.

On production Render with `SEED_DEMO_DATA=false`, these accounts are **not** seeded. Create teachers via **Admin → Users**.

---

## 6. Troubleshooting

### "Invalid email or password"

- Confirm you are on the **Render URL**, not GitHub Pages
- Check `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Render Environment
- If you changed `ADMIN_PASSWORD` but login still fails, set `ADMIN_SYNC_PASSWORD=true`, redeploy, try again, then turn sync off
- Ensure the account is **Active** (Admin → Users)

### Page loads forever / timeout

- Free Render services **spin down** after inactivity — wait up to 60 seconds and refresh
- Check Render **Logs** for startup errors (e.g. missing `DATABASE_URL`)

### Login works locally but not on Render

- Render requires `DATABASE_URL` (Neon PostgreSQL)
- `SESSION_SECRET` must be set (Render generates this)
- Use `https://` Render URL, not `http://`

### Too many login attempts

- Login is rate-limited (20 attempts per 15 minutes per IP)
- Wait 15 minutes or redeploy to clear (if needed)

### Health check

- Open `https://your-app.onrender.com/api/health`
- Should return: `{"status":"ok","database":"connected"}`
- If `database: disconnected`, fix `DATABASE_URL` in Render

---

## 7. Security checklist (production)

- [ ] Change `ADMIN_PASSWORD` from default `admin123`
- [ ] Keep `SEED_DEMO_DATA=false`
- [ ] Do not set `SHOW_LOGIN_HINTS=true`
- [ ] After password reset, set `ADMIN_SYNC_PASSWORD=false`
- [ ] Use a strong `SESSION_SECRET` (Render handles this)
- [ ] Store this document securely — not in a public repo with real passwords

---

## 8. Quick reference

```
Production login URL:  https://<your-render-service>.onrender.com
Admin email:           ADMIN_EMAIL env var (default admin@school.com)
Admin password:        ADMIN_PASSWORD env var
Reset password:        ADMIN_SYNC_PASSWORD=true + redeploy (one time)
Health check:          /api/health
Admin dashboard:       /dashboard-admin
```

---

*Al Kharran Primary School · Grades 1–4 · UAE Ministry of Education branding*
