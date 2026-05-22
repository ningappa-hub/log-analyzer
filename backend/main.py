from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import LogEntry
from parser import parse_log_line

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Log Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Log Analyzer API is running"}


@app.post("/upload")
async def upload_log(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.endswith(".log"):
        raise HTTPException(
            status_code=400, detail="Only .log files are accepted"
        )

    content = await file.read()
    lines = content.decode("utf-8", errors="replace").splitlines()

    parsed_count = 0
    skipped_count = 0

    for line in lines:
        result = parse_log_line(line)
        if result is None:
            skipped_count += 1
            continue

        entry = LogEntry(
            timestamp=result["timestamp"],
            level=result["level"],
            message=result["message"],
        )
        db.add(entry)
        parsed_count += 1

    db.commit()

    return {
        "filename": file.filename,
        "parsed": parsed_count,
        "skipped": skipped_count,
    }


@app.get("/logs")
def get_logs(
    level: str | None = Query(None, description="Filter by log level"),
    db: Session = Depends(get_db),
):
    query = db.query(LogEntry)

    if level is not None:
        normalized = level.upper()
        if normalized not in ("INFO", "WARN", "ERROR", "DEBUG"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid level '{level}'. Must be INFO, WARN, ERROR, or DEBUG",
            )
        query = query.filter(LogEntry.level == normalized)

    entries = query.order_by(LogEntry.timestamp).all()

    return [
        {
            "id": entry.id,
            "timestamp": entry.timestamp.isoformat(),
            "level": entry.level,
            "message": entry.message,
        }
        for entry in entries
    ]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
