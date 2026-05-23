import re
from datetime import datetime
from typing import List, Dict, Any, Optional

# Regex patterns to test against lines
PATTERNS = [
    # 1. Timestamp (optional brackets) followed by Level (optional brackets) and Message
    # Example: 2026-05-22 22:06:46 [INFO] Message
    # Example: [2026-05-22T22:06:46.123Z] ERROR: Message
    re.compile(
        r"^\[?(?P<timestamp>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[,\.]\d+)?(?:[+-]\d{2}:?\d{2}|Z)?)\]?"
        r"\s+\[?(?P<level>INFO|WARN|WARNING|ERROR|DEBUG|FATAL|CRITICAL)\]?[:\s]+(?P<message>.*)",
        re.IGNORECASE
    ),
    # 2. Level followed by Timestamp and Message
    # Example: INFO [2026-05-22 22:06:46] Message
    re.compile(
        r"^\[?(?P<level>INFO|WARN|WARNING|ERROR|DEBUG|FATAL|CRITICAL)\]?"
        r"\s+\[?(?P<timestamp>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[,\.]\d+)?(?:[+-]\d{2}:?\d{2}|Z)?)\]?[:\s]+(?P<message>.*)",
        re.IGNORECASE
    ),
    # 3. Simple Level and Message (no timestamp)
    # Example: ERROR: Something went wrong
    re.compile(
        r"^\[?(?P<level>INFO|WARN|WARNING|ERROR|DEBUG|FATAL|CRITICAL)\]?[:\s]+(?P<message>.*)",
        re.IGNORECASE
    )
]

def parse_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    
    dt_str = dt_str.strip().replace(",", ".")
    
    # Try common formats
    formats = [
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
            
    # Try using fromisoformat (handles standard offsets)
    try:
        iso_str = dt_str
        if iso_str.endswith("Z"):
            iso_str = iso_str[:-1] + "+00:00"
        return datetime.fromisoformat(iso_str)
    except ValueError:
        pass
        
    return None

def normalize_level(level_str: str) -> str:
    lvl = level_str.upper().strip()
    if lvl == "WARNING":
        return "WARN"
    if lvl in ["FATAL", "CRITICAL"]:
        return "ERROR"
    if lvl in ["INFO", "WARN", "ERROR", "DEBUG"]:
        return lvl
    return "INFO"

def parse_log_content(content: str) -> List[Dict[str, Any]]:
    """
    Parses the log file content line-by-line using regex.
    Supports multiline logs (e.g. stack traces) by appending unmatched lines 
    to the preceding log entry.
    """
    lines = content.splitlines()
    parsed_logs = []
    
    for line in lines:
        if not line.strip():
            continue
            
        matched = False
        for pattern in PATTERNS:
            match = pattern.match(line)
            if match:
                groups = match.groupdict()
                timestamp_str = groups.get("timestamp")
                level_str = groups.get("level", "INFO")
                message_str = groups.get("message", "").strip()
                
                parsed_dt = parse_datetime(timestamp_str) if timestamp_str else None
                
                parsed_logs.append({
                    "timestamp": parsed_dt,
                    "timestamp_raw": timestamp_str,
                    "level": normalize_level(level_str),
                    "message": message_str
                })
                matched = True
                break
                
        # If the line doesn't match any pattern, it's likely a multiline detail (like a traceback)
        # We append it to the message of the last parsed log if possible.
        if not matched:
            if parsed_logs:
                parsed_logs[-1]["message"] += "\n" + line.strip()
            else:
                # If no log entry has been created yet, create a default INFO log entry
                parsed_logs.append({
                    "timestamp": None,
                    "timestamp_raw": None,
                    "level": "INFO",
                    "message": line.strip()
                })
                
    return parsed_logs
