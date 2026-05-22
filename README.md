# Log Analyzer

A full-stack Log Analyzer application.

## Structure

```
log-analyzer/
├── backend/          # Python FastAPI application
│   ├── main.py       # Application entry point
│   └── requirements.txt
└── frontend/         # React + Tailwind CSS application
    ├── src/
    │   ├── App.jsx   # Application entry point
    │   ├── main.jsx  # React root
    │   └── index.css # Tailwind CSS imports
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The API will be available at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.
