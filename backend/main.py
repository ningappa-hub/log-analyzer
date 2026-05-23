from fastapi import FastAPI, UploadFile, File, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import json
import re
from pydantic import BaseModel, Field

# Prefer direct Google SDK usage.
try:
    import google.genai as genai
    HAS_GENAI = True
except Exception:
    genai = None
    HAS_GENAI = False

try:
    import google.generativeai as legacy_genai
    HAS_LEGACY_GENAI = True
except Exception:
    legacy_genai = None
    HAS_LEGACY_GENAI = False
import models
from database import engine, get_db, Base
from parser import parse_log_content

# Load environment variables from .env file if it exists
if os.path.exists(".env"):
    try:
        with open(".env", "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip().strip('"').strip("'")
    except Exception as e:
        print(f"Error loading .env file: {e}")


# Create tables in the SQLite database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Log Analyzer API", version="1.0.0")

# Setup CORS middleware to allow requests from the React frontend
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Log Analyzer API is running successfully!"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "Log Analyzer API"}

@app.post("/api/upload")
async def upload_log_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Check file extension
    if not file.filename.endswith(('.log', '.txt')):
        raise HTTPException(status_code=400, detail="Only .log or .txt files are supported.")
    
    try:
        # Read the file content
        content = await file.read()
        text_content = content.decode("utf-8", errors="ignore")
        
        # Parse the logs
        parsed_entries = parse_log_content(text_content)
        
        if not parsed_entries:
            return {"message": "No log entries found in the file", "count": 0}
            
        # Convert parsed logs to LogEntry models
        db_entries = [
            models.LogEntry(
                timestamp=entry["timestamp"],
                timestamp_raw=entry["timestamp_raw"],
                level=entry["level"],
                message=entry["message"]
            )
            for entry in parsed_entries
        ]
        
        # Save to database
        db.bulk_save_objects(db_entries)
        db.commit()
        
        return {
            "message": "Logs uploaded and parsed successfully",
            "filename": file.filename,
            "count": len(db_entries)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error parsing log file: {str(e)}")

@app.get("/api/logs", response_model=None)
def get_logs(
    level: Optional[str] = Query(None, description="Filter logs by level (INFO, WARN, ERROR, DEBUG)"),
    search: Optional[str] = Query(None, description="Search term in log messages"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(models.LogEntry)
    
    # Filter by level
    if level:
        query = query.filter(models.LogEntry.level == level.upper())
        
    # Search in message
    if search:
        query = query.filter(models.LogEntry.message.ilike(f"%{search}%"))
        
    # Get total count before pagination
    total_count = query.count()
    
    # Sort by timestamp (descending, latest first) and paginated result
    # If timestamp is null, SQLite will put them first or last. Let's order by ID descending to handle fallback order too
    logs = query.order_by(models.LogEntry.id.desc()).offset(offset).limit(limit).all()
    
    # Format response
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
            "id": log.id,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "timestamp_raw": log.timestamp_raw,
            "level": log.level,
            "message": log.message
        })
        
    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "logs": formatted_logs
    }

@app.delete("/api/logs")
def clear_all_logs(db: Session = Depends(get_db)):
    try:
        num_deleted = db.query(models.LogEntry).delete()
        db.commit()
        return {"message": "All log entries deleted successfully", "count": num_deleted}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing logs: {str(e)}")

class AnalysisResponse(BaseModel):
    root_cause: str = Field(description="A brief root cause hypothesis of the error.")
    suggested_fix: str = Field(description="A suggested fix or resolution step for the error.")

@app.post("/api/analyze-error/{log_id}", response_model=AnalysisResponse)
def analyze_error_log(log_id: int, db: Session = Depends(get_db)):
    log_entry = db.query(models.LogEntry).filter(models.LogEntry.id == log_id).first()
    if not log_entry:
        raise HTTPException(status_code=404, detail="Log entry not found")
        
    openai_key = os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY_HERE")
    gemini_key = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY"))
    
    # Clean placeholders
    if openai_key == "YOUR_OPENAI_API_KEY_HERE":
        openai_key = None
    if gemini_key == "YOUR_GEMINI_API_KEY_HERE":
        gemini_key = None
        
    use_gemini = gemini_key is not None
    use_openai = openai_key is not None and not use_gemini
    
    # Handle placeholder API key gracefully for ready-to-run demo compatibility
    if not use_gemini and not use_openai:
        msg_lower = log_entry.message.lower()
        if "database" in msg_lower or "db" in msg_lower or "connection" in msg_lower or "sql" in msg_lower:
            rc = ("[DEMO] Database Connection Failure. The application was unable to establish a database session. "
                  "This typically happens because the database server/service is offline, "
                  "network configuration or firewall rules are blocking the connection, "
                  "or the connection credentials or URL configuration in the environment are incorrect.")
            sf = ("1. Verify that your database service is active and running.\n"
                  "2. Check the database connection string and authentication parameters in your environment configuration.\n"
                  "3. Verify network accessibility (e.g., run a ping or telnet connection test from your application host to the database host).")
        elif "timeout" in msg_lower:
            rc = ("[DEMO] Connection Timeout. A request or operation timed out because the destination service or database "
                  "failed to respond within the expected threshold. This can be caused by high network latency, "
                  "locked database tables, or the target service being overloaded.")
            sf = ("1. Inspect the CPU/Memory utilization and query logs of the target database or service.\n"
                  "2. Implement request retry policies with exponential backoff.\n"
                  "3. Increase the connection timeout parameters in your configuration if the operation naturally takes longer.")
        elif "valueerror" in msg_lower or "keyerror" in msg_lower or "typeerror" in msg_lower:
            rc = ("[DEMO] Unhandled Python Runtime Exception. An exception occurred due to invalid data formats, "
                  "such as attempting to cast an incompatible type, or accessing a dictionary key that does not exist.")
            sf = ("1. Validate input data structures and payload schemas before processing them.\n"
                  "2. Add defensive checks (e.g. use dict.get('key') with a default fallback value).\n"
                  "3. Wrap the parsing block in a try-except block to handle anomalies gracefully without crashing.")
        else:
            rc = ("[DEMO] Unexpected Exception. An unexpected ERROR was logged. This indicates a runtime failure or "
                  "unhandled exception in the application logic.")
            sf = ("1. Examine the traceback details in the expanded log row.\n"
                  "2. Add defensive checks and input validation to variables near the crash location.\n"
                  "3. Check application metrics to see if this error is an isolated case or part of a systemic issue.")
        
        return AnalysisResponse(
            root_cause=rc,
            suggested_fix=sf
        )
        
    try:
        # If Gemini key is present prefer direct Google SDK usage.
        if use_gemini:
            system_prompt = (
                "You are an expert AI Support Engineer.\n"
                "Analyze the provided error log and return ONLY a JSON object with two keys: \"root_cause\" and \"suggested_fix\"."
                " The values should be short, actionable strings. Do not include extra explanation or surrounding text."
            )
            prompt = f"{system_prompt}\n\nError log:\n{log_entry.message}\n\nRespond with JSON."
            text_output = None

            if HAS_GENAI:
                model_name = os.getenv("GEMINI_MODEL", "models/gemini-2.5-flash")
                client = genai.Client(api_key=gemini_key)
                resp = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={"temperature": 0.0}
                )
                text_output = getattr(resp, "text", None)

                if not text_output and getattr(resp, "candidates", None):
                    try:
                        parts = resp.candidates[0].content.parts
                        text_output = "\n".join([p.text for p in parts if getattr(p, "text", None)])
                    except Exception:
                        text_output = None
            elif HAS_LEGACY_GENAI:
                # Legacy SDK fallback.
                model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
                legacy_genai.configure(api_key=gemini_key)
                model = legacy_genai.GenerativeModel(model_name)
                resp = model.generate_content(prompt)
                text_output = getattr(resp, "text", None)

            if not text_output:
                raise RuntimeError("No Gemini SDK available in runtime or empty model response")

            # Try to extract JSON payload from the model output.
            m = re.search(r"\{[\s\S]*\}", text_output)
            if not m:
                lines = [l.strip() for l in text_output.splitlines() if l.strip()]
                data = {
                    "root_cause": lines[0] if lines else "",
                    "suggested_fix": lines[1] if len(lines) > 1 else ""
                }
            else:
                json_text = m.group(0)
                try:
                    data = json.loads(json_text)
                except Exception:
                    try:
                        data = json.loads(json_text.replace("'", '"'))
                    except Exception as ex:
                        raise RuntimeError(f"Failed to parse JSON from model output: {ex}; raw output: {text_output}")

            rc = data.get("root_cause") or data.get("rootCause") or data.get("root-cause") or ""
            sf = data.get("suggested_fix") or data.get("suggestedFix") or data.get("suggested-fix") or ""
            return AnalysisResponse(root_cause=str(rc), suggested_fix=str(sf))
        else:
            return AnalysisResponse(
                root_cause="[AI unavailable] No Gemini API key found.",
                suggested_fix="Set GEMINI_API_KEY or GOOGLE_API_KEY in backend/.env and restart the backend service."
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI Analysis failed. Make sure your API key is valid. Error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

