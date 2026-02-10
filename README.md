## Mini Jira – Bug Tracking App

This is a small full‑stack bug tracker inspired by Jira.  
You can create projects, users and tickets, assign work, and filter the board.

### Tech stack

- Frontend: React + TypeScript (Vite)
- Backend: Node.js + Express + Prisma + SQLite

---

### 1. Prerequisites

- Node.js 18+ and npm

---

### 2. Install dependencies

From the project root:

```bash
cd backend
npm install

cd ../frontend
npm install
```

You only need to do this once.

---

### 3. Run the backend

From the `backend` folder:

```bash
cd backend
npm run dev
```

What this does:

- runs Prisma migrations against a local SQLite DB (`backend/dev.db`)
- starts the API on `http://localhost:4000`
- seeds a few example users and projects (so the dropdowns are not empty)

---

### 4. Run the frontend

From the `frontend` folder:

```bash
cd frontend
npm run dev
```

Then open the URL printed by Vite, for example:

- `http://localhost:5173`

The frontend talks to the backend through `/api` (Vite proxy is already configured).

---

### 5. How to use the app

- **Create tickets**
  - Fill in title, description, project, priority and (optionally) assignee.
  - Click “Create Ticket”.
- **Edit tickets**
  - Click “Edit” in the table row.
  - You can change title, description, project, assignee, priority and status.
- **Search and filter**
  - Left sidebar lets you filter by project, assignee (including “Unassigned”), status and priority.
  - The search box filters by title and description as you type.

All filtering is live – there is no separate “Apply” button.

---

### 6. Notes

- Data is stored in a local SQLite file and will persist between runs as long as you keep `backend/dev.db`.
- There is no login UI; users only exist for assignment and filtering.

