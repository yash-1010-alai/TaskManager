# NexTask — Task Manager

> A full-stack task management web application with a modern dark-theme UI, role-based access control, and a clean REST API.

---

## 👨‍💻 About This Project

**Backend** — Designed and developed by **Yash Alai** using **FastAPI** and **PostgreSQL**. All server-side logic, authentication, database modelling, and API design were written by the developer from scratch.

**Frontend** — The UI (HTML, CSS, JavaScript) was built with the assistance of **AI tools** to produce a premium glassmorphism design system, including the dashboard layout, animations, and responsive components.

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure register & login with token-based sessions
- 👥 **Role-Based Access Control** — `manager` and `member` roles with different permissions
- ✅ **Task CRUD** — Create, edit, delete tasks with one-click status cycling
- 📊 **Dashboard** — Live stats, sprint progress bar with shimmer animation, paginated recent tasks
- 📋 **Tasks Page** — Filter by status, live search, status summary chips
- 🎨 **Premium UI** — Dark glassmorphism theme, purple/indigo palette, sticky top bar, animated sidebar

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI (Python) |
| **Database** | PostgreSQL + SQLAlchemy ORM |
| **Auth** | JWT via `python-jose`, `passlib` (pbkdf2-sha256) |
| **Frontend** | Vanilla HTML / CSS / JavaScript |
| **Fonts** | Google Fonts — Inter, Outfit |

---

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/Task-Manager.git
cd Task-Manager
```

### 2. Create a virtual environment
```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
```

### 3. Install dependencies
```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose passlib python-dotenv
```

### 4. Configure environment variables
```bash
copy .env.example .env      # Windows
# cp .env.example .env      # macOS/Linux
```
Edit `.env` with your PostgreSQL credentials:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/auth
SECRET_KEY=your-super-secret-jwt-key
```

### 5. Set up the database
Make sure PostgreSQL is running and the `auth` database exists:
```sql
CREATE DATABASE auth;
```
Tables are created automatically on first run via SQLAlchemy.

### 6. Run the development server
```bash
python -m uvicorn main:app --reload
```
Open **http://127.0.0.1:8000** in your browser.

---

## 📁 Project Structure

```
Task-Manager/
├── main.py           # FastAPI app — routes & static file serving
├── auth.py           # JWT auth helpers, password hashing
├── crud.py           # Database CRUD operations
├── models.py         # SQLAlchemy ORM models (User, Task)
├── schemas.py        # Pydantic request/response schemas
├── database.py       # DB engine, session factory, Base
├── .env.example      # Environment variable template
└── static/
    ├── index.html    # Landing page
    ├── login.html    # Login page
    ├── register.html # Registration page
    ├── dashboard.html
    ├── tasks.html
    ├── css/
    │   └── main.css      # Full design system (glassmorphism theme)
    └── js/
        ├── main.js       # Particle canvas, API fetch helper
        └── dashboard.js  # Task CRUD, stats, pagination logic
```

---

## 🔑 API Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Register a new user |
| POST | `/auth/login` | ❌ | Login and receive JWT token |
| GET | `/auth/me` | ✅ | Get current user info |
| GET | `/tasks/` | ✅ | List all tasks for the user |
| POST | `/tasks/` | ✅ | Create a new task |
| PUT | `/tasks/{id}` | ✅ | Update a task |
| DELETE | `/tasks/{id}` | ✅ | Delete a task |
| GET | `/users/` | Manager only | List all users |
| PUT | `/users/{id}/role` | Manager only | Change a user's role |

---

## 📝 License

MIT © Yash Alai
