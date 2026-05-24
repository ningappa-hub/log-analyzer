# 📊 Log Analyzer Monorepo

A modern, high-performance Log Analyzer application built to parse, store, and analyze log files. It features a **Python FastAPI** backend (using SQLite & SQLAlchemy) and a **React + Tailwind CSS v4** frontend (using Vite & Lucide Icons).

## 🌟 Key Features
- **Regex-Based Parser**: Automatically parses timestamp, level (INFO, WARN, ERROR, DEBUG), and message fields from uploaded log files.
- **Multiline Support**: Safely merges multiline tracebacks or stack traces into a single log entry.
- **Relational Storage**: Saves parsed logs to a SQLite database (`logs.db`).
- **AI Integration**: Integrated with Google Gemini models (`google-genai`) to provide live AI analysis of log details.
- **Interactive UI Dashboard**:
  - Live statistics display (total logs, error/warning/info/debug breakdowns).
  - Drag-and-drop log ingestion (`.log` or `.txt` files).
  - Server-side filtering by log levels.
  - Server-side text-based search filtering.
  - Expansible rows to display large multiline stack traces in a terminal-like environment.
  - Clear database button.

## 🛠️ Tech Stack

### Backend
*   **Framework**: FastAPI (served via Uvicorn)
*   **Database**: SQLite with SQLAlchemy ORM
*   **AI**: Google GenAI (`google-genai`, `google-generativeai`)
*   **Parsing**: Python `re` (Regex-based multiline parser)

### Frontend
*   **Framework**: React 19
*   **Tooling**: Vite
*   **Styling**: Tailwind CSS v4
*   **Icons**: Lucide React

### Infrastructure
*   **Containerization**: Docker & Docker Compose
*   **Web Server (Prod Frontend)**: Nginx

---

## 📂 Directory Structure
```text
log-analyzer/
├── docker-compose.yml    # Orchestrates the backend and frontend services
├── README.md             # Project documentation
├── backend/              # FastAPI Application
│   ├── main.py           # Application entry point, CRUD routes, file uploads
│   ├── database.py       # SQLAlchemy engine and session setup
│   ├── models.py         # SQLAlchemy models (e.g., LogEntry)
│   ├── parser.py         # Regex logic for single/multiline log parsing
│   ├── .env              # Environment variables (e.g., GEMINI_API_KEY)
│   ├── Dockerfile        # Backend container configuration
│   └── requirements.txt  # Python dependencies
└── frontend/             # React UI Application
    ├── index.html        # HTML template
    ├── package.json      # Node dependencies & scripts
    ├── vite.config.js    # Vite & Tailwind configurations
    ├── nginx.conf        # Nginx configuration for Docker serving
    ├── Dockerfile        # Frontend container configuration
    └── src/
        ├── main.jsx      # React DOM entry point
        ├── App.jsx       # Main Dashboard UI component
        └── index.css     # Tailwind imports
```

---

## 🚀 How to Run

### Workspace Recommendation
Open this folder (`C:\Users\Dell\.gemini\antigravity\scratch\log-analyzer`) directly in VS Code or your preferred editor, and make sure it is set as your active workspace.

### 0. Run with Docker (Recommended)
From the repository root:
```bash
Copy-Item backend/.env.example backend/.env
docker compose up --build
```
*   **Frontend**: Available at [http://localhost:3000](http://localhost:3000)
*   **Backend API**: Available at [http://localhost:8000](http://localhost:8000)

To run in detached mode:
```bash
Copy-Item backend/.env.example backend/.env
docker compose up -d --build
```

To stop the stack:
```bash
docker compose down
```

### Terminal Commands (Local Development)
If you prefer running the app directly in terminals instead of Docker, use these commands.

### 1. Backend Setup (FastAPI)
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create a local environment file from the safe template:
   ```bash
   copy .env.example .env
   ```
   *Note: Fill in `GEMINI_API_KEY` or `GOOGLE_API_KEY` only if you want live AI analysis. The backend also runs in safe "demo mode" without those keys.*
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

