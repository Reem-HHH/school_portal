# School Portal — Complete User Guide

This guide explains how to run the School Portal on your computer (locally) or on the internet (online), how to log in, how to upload files, where uploaded files are stored, and everything else you need to know.

---

## Table of contents

1. [What this app does](#what-this-app-does)
2. [Default login credentials](#default-login-credentials)
3. [Run locally (on your computer)](#run-locally-on-your-computer)
4. [Run online (live website)](#run-online-live-website)
5. [Using the website after login](#using-the-website-after-login)
6. [Admin guide — uploads, users, activity log](#admin-guide--uploads-users-activity-log)
7. [Where uploaded files are stored](#where-uploaded-files-are-stored)
8. [Supported file types for uploads](#supported-file-types-for-uploads)
9. [User roles explained](#user-roles-explained)
10. [GitHub Pages (optional)](#github-pages-optional)
11. [Environment variables reference](#environment-variables-reference)
12. [Troubleshooting](#troubleshooting)
13. [Quick reference](#quick-reference)

---

## What this app does

The School Portal is a school management website with **role-based access control (RBAC)**:

- **Admins** manage users, browse teachers and students, view a master gradebook, upload legacy schedule/grade files, and review the activity log.
- **Teachers** enter formative assessment grades (quizzes/exams) by subject and class, and view their personal teaching schedule.
- **Students** see their profile, class timetable, and formative grades.
- **Parents** see the same information for linked children (linked by an admin).
- **Parents and students** can self-register; teachers and admins are created by an admin.
- All important actions are recorded in an **activity log**.

---

## Default login credentials

When the app starts for the first time, it creates a default admin account:

| Field | Value |
|-------|-------|
| **Email** | `admin@school.com` |
| **Password** | `admin123` |

A sample teacher account is also seeded on first run:

| Field | Value |
|-------|-------|
| **Email** | `teacher@school.com` |
| **Password** | `teacher123` |

### Important notes about passwords

- **Local use:** The password above works out of the box.
- **Online (Render):** Render may generate a **random** admin password. You must check the Render dashboard (see [Run online](#run-online-live-website) below) or set your own password in environment variables.
- **Change the default password** after your first login in production by creating a new admin user and deleting the old one, or by setting `ADMIN_PASSWORD` in your environment before the first deploy.

There is **no default teacher/parent/student account**. Those users either:

- Register themselves at `/register.html`, or
- Are created by an admin in the Admin panel.

---

## Run locally (on your computer)

Use this when developing or testing on your own machine.

### Requirements

- **Node.js** version 20 (recommended; see `.node-version`)  
  Check if installed: open Terminal and run:
  ```bash
  node -v
  ```
  If not installed, download from [https://nodejs.org](https://nodejs.org)

- **Git** (to download the project)  
  Download from [https://git-scm.com](https://git-scm.com)

### Step 1 — Download the project

Open Terminal (Mac/Linux) or Command Prompt / PowerShell (Windows) and run:

```bash
git clone https://github.com/Reem-HHH/school_portal.git
cd school_portal
```

If you already have the repo, just go into the folder and pull the latest code:

```bash
cd school_portal
git pull
```

### Step 2 — Install dependencies

Run this **once** inside the project folder:

```bash
npm install
```

This downloads the libraries the app needs (Express, database tools, etc.).

### Step 3 — Start the server

```bash
npm start
```

You should see:

```
School portal running on port 3000
Database: SQLite (local)
```

### Step 4 — Open the website

Open your browser and go to:

**http://localhost:3000**

You will see the **login page**.

### Step 5 — Sign in

- Email: `admin@school.com`
- Password: `admin123`

After login you are taken to the main portal.

### Step 6 — Stop the server

In the terminal where the server is running, press **Ctrl + C**.

### Where local data is stored

| Data | Location on your computer |
|------|---------------------------|
| Database (users, uploads metadata, activity log) | `school_portal/data/school.db` |
| Uploaded file content | Inside `school.db` (not as separate files on disk) |

The `data/` folder is created automatically the first time you run the app.

### Optional — Custom local settings

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to change the admin email, password, or port. Example:

```
PORT=3000
ADMIN_EMAIL=admin@school.com
ADMIN_PASSWORD=your-new-password
```

Restart the server after changing `.env`.

---

## Run online (live website)

GitHub Pages **cannot** run this app (no login, no database, no uploads). You need **Render** (free) for the server and **Neon** (free) for the database.

### Overview

```
Your browser  →  Render (runs the Node.js app)  →  Neon (stores database + uploaded files)
```

### Step 1 — Create a free Neon database

1. Go to [https://neon.tech](https://neon.tech) and create a free account.
2. Click **New Project**.
3. Choose a name (e.g. `school-portal`) and region close to you.
4. After creation, open the **Dashboard** for your project.
5. Find **Connection string** and copy the full URL. It looks like:
   ```
   postgresql://username:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```
6. Keep this string private — it is your database password.

### Step 2 — Deploy on Render

1. Go to [https://render.com](https://render.com) and sign up (you can use “Sign in with GitHub”).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub account if asked.
4. Select the repository: **Reem-HHH/school_portal** (or your fork).
5. Render reads `render.yaml` and shows the services to create.
6. When prompted for **`DATABASE_URL`**, paste your Neon connection string from Step 1.
7. Click **Apply** / **Deploy**.

Wait a few minutes for the build to finish.

### Step 3 — Get your live website URL

After deploy succeeds, Render shows a URL like:

```
https://school-portal-xxxx.onrender.com
```

**This is your live website.** Share this link with users.

### Step 4 — Admin login (online)

Default credentials on Render:

- **Email:** `admin@school.com`
- **Password:** `admin123`

The admin password is synced from the `ADMIN_PASSWORD` environment variable on every server start. To use a custom password, set `ADMIN_PASSWORD` in Render → **Environment** and redeploy.

Sign in at your Render URL with those credentials.

### Step 5 — First login online

1. Open `https://your-app.onrender.com`
2. Sign in with `admin@school.com` and your admin password.
3. Click **Admin** in the top navigation.
4. Upload a schedule or grades file to confirm everything works.

### Render free tier notes

- The app **spins down after ~15 minutes of no traffic**. The first visit after idle may take **30–60 seconds** to load.
- Free tier has **no persistent disk** — that is why we use Neon for the database and store uploads inside the database.
- If deploy fails, check that `DATABASE_URL` is set correctly in Render → Environment.

### Updating the online app

Push changes to GitHub `main` branch. If Render is connected to your repo, it redeploys automatically.

---

## Using the website after login

After login you are taken to your **role dashboard** (admin, teacher, or student/parent).

### Main pages

| Page | URL (local) | Who can access |
|------|-------------|----------------|
| Login | http://localhost:3000/index.html | Everyone |
| Register | …/register.html | Everyone (parent/student only) |
| Admin dashboard | …/dashboard-admin.html | Admin only |
| Teacher dashboard | …/dashboard-teacher.html | Teacher only |
| Student / parent dashboard | …/dashboard-student.html | Student and parent only |
| Legacy portal | …/portal.html | Redirects to your role dashboard |

### Role dashboards

**Admin dashboard** tabs: Users, Teachers, Students (filter by grade/section), Master Gradebook, Uploads, Activity Log.

**Teacher dashboard** tabs: Gradebook (enter formative grades by class/subject), Schedule (personal timetable).

**Student / parent dashboard** tabs: Profile, Timetable, Grades (formative assessments). Parents with multiple children can switch between them.

### Register a new account (parent or student)

1. Go to the login page.
2. Click **Register**.
3. Fill in name, email, password, and choose **Parent** or **Student**.
4. For **Student**, also enter grade and section (e.g. `Grade 5`, `Section A`).
5. Submit — you are logged in and taken to your dashboard.

Teachers and additional admins must be created by an admin (see below). Parents must be linked to students by an admin (Students tab → edit student record).

### Log out

Click **Logout** in the top navigation.

---

## Admin guide — uploads, users, activity log

After login as admin, open **Admin Dashboard** (`dashboard-admin.html`).

The admin dashboard has six tabs: **Users**, **Teachers**, **Students**, **Master Gradebook**, **Uploads**, and **Activity log**.

### Upload a schedule

1. Admin → **Uploads** tab.
2. Under **Upload schedule**:
   - **Title** — e.g. `Grade 5 Week 1 Timetable`
   - **Label** (optional) — e.g. `Grade 5 · Section A`
   - **File** — choose an image or spreadsheet (see [supported types](#supported-file-types-for-uploads))
3. Click **Upload schedule**.
4. The schedule appears under **Published content** and on the portal **Schedules** page for all logged-in users.

### Upload grades

1. Same **Uploads** tab.
2. Under **Upload grades**:
   - **Title** — e.g. `Midterm Results 2026`
   - **Label** (optional) — e.g. `Grade 5 · Section A`
   - **File** — image or Excel/CSV
3. Click **Upload grades**.

**Excel/CSV format:** The first row must be column headers. Example:

| Student Name | Grade | Score |
|--------------|-------|-------|
| Ahmed Ali | 5 | 92 |
| Sara Hassan | 5 | 88 |

### Remove an upload

In **Published content**, click **Remove** next to the item. It is hidden from users but kept in the database for the activity log.

### Create a user (admin, teacher, parent, student)

1. Admin → **Users** tab.
2. Fill in name, email, password, and role.
3. Click **Create user**.

### Manage existing users

- Change **role** with the dropdown.
- Click **Active** / **Inactive** to disable an account without deleting it.
- Click **Delete** to permanently remove a user (you cannot delete your own account).

### Activity log

Admin → **Activity log** tab shows every recorded action:

- Logins and failed login attempts
- Logouts
- User registration, creation, update, deletion
- File uploads and removals

Columns: **Time**, **User**, **Action**, **Details**, **IP address**.

---

## Where uploaded files are stored

Uploaded files are **not saved as separate files** in a folder you can browse in File Explorer or Finder. They are stored **inside the database** as binary data.

### Local (on your computer)

| What | Where |
|------|-------|
| Database file | `school_portal/data/school.db` |
| Uploaded images and spreadsheets | Inside `school.db`, in the `content_uploads` table, column `file_data` |
| Parsed spreadsheet data (tables) | Inside `school.db`, column `parsed_data` |

### Online (Render + Neon)

| What | Where |
|------|-------|
| Everything (users, uploads, logs) | Your Neon PostgreSQL database |
| Uploaded file bytes | `content_uploads.file_data` column in Neon |
| Parsed Excel/CSV as JSON | `content_uploads.parsed_data` column in Neon |

### How users view uploads

- **Images** — displayed in the browser, loaded from `/api/uploads/{id}/file`
- **Excel/CSV** — parsed and shown as a table on the Schedules or Grades page (original file also kept in database)

### How to download an uploaded file

There is no “download” button in the UI yet. To access the raw file:

1. Log in as admin or any user with access.
2. Open in browser (replace `{id}` with the upload ID from Admin → Published content):
   - Local: `http://localhost:3000/api/uploads/{id}/file`
   - Online: `https://your-app.onrender.com/api/uploads/{id}/file`

You must be logged in (session cookie) for this URL to work.

### Exporting data from Neon (advanced)

1. Log in to [neon.tech](https://neon.tech).
2. Open your project → **SQL Editor**.
3. Example query to list uploads:
   ```sql
   SELECT id, title, label, content_type, original_filename, created_at
   FROM content_uploads
   WHERE is_active = true
   ORDER BY created_at DESC;
   ```

To export binary files from Neon requires additional tools (e.g. pgAdmin or a custom script). For most school use, viewing through the website is sufficient.

---

## Supported file types for uploads

| Type | Formats | How it displays |
|------|---------|-----------------|
| **Image** | JPG, JPEG, PNG, GIF, WebP | Shown as a picture |
| **Spreadsheet** | CSV, XLS, XLSX | Parsed into a table (first row = headers) |

Maximum file size: **10 MB** per upload.

---

## User roles explained

| Role | Dashboard | Can do |
|------|-----------|--------|
| **Admin** | Admin dashboard | Manage users, view teacher directory, browse/filter students, master gradebook, upload legacy files, activity log |
| **Teacher** | Teacher dashboard | Enter formative grades for assigned classes, view personal schedule |
| **Student** | Student dashboard | View profile, class timetable, formative grades |
| **Parent** | Student dashboard | View linked children's profile, timetable, and formative grades |

Each role is restricted to its own dashboard and API endpoints. Attempting to access another role's pages redirects you to your dashboard.

---

## GitHub Pages (optional)

Your repo can also publish a static copy of the login page to GitHub Pages:

**URL example:** `https://reem-hhh.github.io/school_portal/`

### Limitations

GitHub Pages shows the **frontend only**. Login, uploads, and database **do not work** unless you also connect a Render backend (advanced setup with `api-base` meta tag and `CORS_ORIGIN`).

### For a fully working site

Use your **Render URL** only. That is the real live website.

### Enable GitHub Pages (optional UI preview)

1. GitHub repo → **Settings** → **Pages**.
2. **Source:** GitHub Actions.
3. Push to `main` — the workflow deploys the `docs/` folder automatically.

---

## Environment variables reference

| Variable | Local | Render | Description |
|----------|-------|--------|-------------|
| `PORT` | Optional (default 3000) | Set by Render | Server port |
| `NODE_ENV` | Optional | `production` | Production mode |
| `SESSION_SECRET` | Optional locally | Auto-generated on Render | Encrypts login sessions — keep secret |
| `ADMIN_EMAIL` | Optional | `admin@school.com` | First admin email |
| `ADMIN_PASSWORD` | Optional | `admin123` | Admin password (synced on each deploy) |
| `ADMIN_NAME` | Optional | Optional | Admin display name |
| `DATABASE_URL` | Not needed locally | **Required** | Neon PostgreSQL connection string |
| `CORS_ORIGIN` | Not needed | Only for GitHub Pages split setup | Your github.io URL |

---

## Troubleshooting

### “Cannot find module” or `npm start` fails locally

Run `npm install` again inside the project folder.

### Login fails locally

- Use `admin@school.com` / `admin123`.
- Make sure the server is running (`npm start`).
- Try deleting `data/school.db` and restarting (resets all local data and recreates admin).

### Login fails online

- Confirm `DATABASE_URL` is set in Render → Environment.
- Use `admin@school.com` / `admin123`, or whatever you set for `ADMIN_PASSWORD` in Render → Environment.
- If login still fails, set `ADMIN_PASSWORD=admin123` in Render → Environment, save, and redeploy (password syncs on startup).
- Wait 60 seconds if the app was idle (free tier cold start).

### Upload fails

- File must be under 10 MB.
- Use allowed formats: JPG, PNG, GIF, WebP, CSV, XLS, XLSX.
- For spreadsheets, ensure the first row has column headers and at least one data row.

### GitHub Pages shows README instead of login

- Set Pages source to **GitHub Actions** (not “Deploy from branch / root”).
- Ensure the latest code is pushed to `main`.

### Render deploy fails

- Verify Neon connection string is complete and includes `?sslmode=require`.
- Check Render build logs for errors.
- Ensure Node.js 18+ is used (already configured in `package.json`).

### Lost admin password online

1. Render → your service → **Environment**.
2. Set `ADMIN_PASSWORD` to a new value.
3. Save — Render redeploys.
4. If admin user already exists in database, changing the env var only affects **new** installs. To reset: use Neon SQL Editor to delete the admin user row, redeploy, and the app recreates admin from env vars. Or create a new admin user via SQL/API if you have another admin account.

---

## Quick reference

### Local start (copy-paste)

```bash
git clone https://github.com/Reem-HHH/school_portal.git
cd school_portal
npm install
npm start
```

Open: **http://localhost:3000**  
Login: **admin@school.com** / **admin123**

### Online URLs

| Service | URL |
|---------|-----|
| Live website | `https://your-app.onrender.com` (from Render dashboard) |
| GitHub repo | https://github.com/Reem-HHH/school_portal |
| Neon database | https://console.neon.tech |
| Render dashboard | https://dashboard.render.com |

### Key pages

| Page | Path |
|------|------|
| Login | `/index.html` |
| Register | `/register.html` |
| Portal | `/portal.html` |
| Admin | `/admin.html` |

### Default admin

| Email | Password (local) |
|-------|------------------|
| admin@school.com | admin123 |

---

*Last updated for School Portal v2 — Neon PostgreSQL + in-database file storage.*
