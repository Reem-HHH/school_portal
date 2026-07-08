# Digital School Management Portal

A full-stack school management portal with authentication, role-based access, SQLite database, and bilingual (English/Arabic) support.

## Features

- **Authentication**: Login, self-registration (parent/student), session-based auth
- **Admin panel**: Create users, assign roles, activate/deactivate accounts, delete users
- **Dashboard**: Live stats, announcements, weekly timetable
- **Grading**: Teachers and admins can enter and save exam grades
- **Students**: Add and view student records stored in the database
- **Bilingual UI**: English and Arabic with RTL support

## Quick Start

```bash
npm install
cp .env.example .env   # optional — defaults work for local dev
npm start
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

## Demo Accounts

| Role    | Email               | Password    |
|---------|---------------------|-------------|
| Admin   | admin@school.com    | admin123    |
| Teacher | teacher@school.com  | teacher123  |

Parents and students can register at `/register.html`.

## Tech Stack

- **Backend**: Node.js, Express, express-session
- **Database**: SQLite (via better-sqlite3) — stored in `data/school.db`
- **Frontend**: HTML, Tailwind CSS, vanilla JavaScript
- **Auth**: bcrypt password hashing, cookie sessions

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/register` | Register (parent/student) |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Current user |
| GET/POST/PATCH/DELETE | `/api/auth/users` | Admin user management |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET/POST | `/api/students` | Student records |
| GET/POST | `/api/grades` | Grade entry |
| GET | `/api/schedule` | Weekly timetable |

## Environment Variables

See `.env.example` for `PORT`, `SESSION_SECRET`, and default admin credentials.

## Project Structure

```
├── server.js           # Express server
├── db/init.js          # Database schema & seed data
├── routes/             # API route handlers
├── middleware/         # Auth middleware
├── public/             # Frontend static files
│   ├── index.html      # Main dashboard
│   ├── login.html
│   ├── register.html
│   ├── admin.html
│   ├── css/
│   └── js/
└── data/               # SQLite database (auto-created)
```
