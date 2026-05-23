# Log Analyzer Monorepo

A modern, high-performance Log Analyzer application built with a **Python FastAPI** backend (using SQLite & SQLAlchemy) and a **React + Tailwind CSS v4** frontend (using Vite & Lucide Icons).

## Features
- **Regex-Based Parser**: Automatically parses timestamp, level (INFO, WARN, ERROR, DEBUG), and message fields from uploaded log files.
- **Multiline Support**: Safely merges multiline tracebacks or stack traces into a single log entry.
- **Relational Storage**: Saves parsed logs to a SQLite database (`logs.db`).
- **Interactive UI Dashboard**:
  - Live statistics display (total logs, error/warning/info/debug breakdowns).
  - Drag-and-drop log ingestion (`.log` or `.txt` files).
  - Server-side filtering by log levels.
  - Server-side text-based search filtering.
  - Expansible rows to display large multiline stack traces in a terminal-like environment.
  - Clear database button.

---

## Directory Structure
```
log-analyzer/
├── backend/
│   ├── database.py       # SQLAlchemy setup and database session engine
│   ├── models.py         # LogEntry SQLAlchemy model
│   ├── parser.py         # Robust regex log parser supporting multiline logs
│   ├── main.py           # FastAPI entry point, CRUD routes, and file uploads
│   └── requirements.txt  # Python requirements
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # React Tailwind v4 UI dashboard
│   │   ├── index.css     # Tailwind v4 import
│   │   └── main.jsx      # React entry point
│   ├── vite.config.js    # Vite configuration containing Tailwind v4 plugin
│   └── package.json      # React dependencies
└── README.md             # This readme file
```

---

## How to Run

### Workspace Recommendation
Open this folder (`C:\Users\Dell\.gemini\antigravity\scratch\log-analyzer`) directly in VS Code or your preferred editor, and make sure it is set as your active workspace.

### 1. Backend Setup (FastAPI)
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create a local environment file from the safe template:
   ```bash
   copy .env.example .env
   ```
   Fill in `GEMINI_API_KEY` or `GOOGLE_API_KEY` only if you want live AI analysis. The backend also runs in demo mode without those keys.
3. (Optional but recommended) Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On Windows (CMD):
   .\venv\Scripts\activate.bat
   ```
4. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
5. Start the FastAPI development server:
   ```bash
   python main.py
   ```
   *The backend will start running on [http://localhost:8000](http://localhost:8000).*
   *API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).*

### 2. Frontend Setup (React + Tailwind)
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install the node packages:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   *The frontend application will start running on [http://localhost:5173](http://localhost:5173).*
