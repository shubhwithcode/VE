# Vishwakarma Enterprises (Admin + Staff Management System)

## Tech
- Frontend: HTML/CSS/JS
- Backend: Node.js + Express
- DB: MySQL
- Uploads: Multer
- Voice: MediaRecorder (WebM audio)

## Setup (Local)

### 1) MySQL
1. Create database (example):
   - `CREATE DATABASE vishwakarma_enterprises;`
2. Run schema:
   - import `backend/schema.sql`

### 2) Backend env
Copy `backend/.env.example` to `backend/.env` and update:
```
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=vishwakarma_enterprises

JWT_SECRET=change_this_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

On first boot, the server auto-creates the admin user if no admin exists (from `ADMIN_USERNAME` / `ADMIN_PASSWORD`).

### 3) Install + Run
From `backend/`:
```
npm install
npm run dev
```

Or:
```
node server.js
```

Open:
- `http://localhost:3000/`
- Admin: `http://localhost:3000/admin/login.html`
- Staff: `http://localhost:3000/staff/login.html`

### Important (Frontend + API)
- Best: open pages from the backend server (`http://localhost:3000/...`). This keeps UI + API on same origin and avoids CORS/cookie issues.
- If you open the UI using VS Code Live Server (example `http://127.0.0.2:5500/frontend/...`), the frontend will call the backend API on `http://localhost:3000`, so the backend must be running.

### Clear Demo Data (Optional)
Deletes all demo data (all `role='staff'` users + attendance/work/gallery/hero tables). Admin user stays.

PowerShell:
```
$env:CONFIRM_CLEAR_DEMO='YES'
node backend/scripts/clearDemoData.js
```

Also delete uploaded files:
```
$env:CONFIRM_CLEAR_DEMO='YES'
node backend/scripts/clearDemoData.js --uploads
```

## Notes
- Staff checkout is blocked until "Today Work Detail" is submitted.
- Attendance captures: time + GPS + selfie on check-in and check-out.
- Admin can view attendance and generate monthly salary by present days.
