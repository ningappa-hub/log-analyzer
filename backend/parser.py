import re
from datetime import datetime

LOG_PATTERNS = [
    # ISO format: 2024-01-15T10:30:45 INFO Some message
    re.compile(
        r"(?P<timestamp>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+"
        r"(?P<level>INFO|WARN|WARNING|ERROR|DEBUG)\s+"
        r"(?P<message>.+)"
    ),
    # Bracketed level: 2024-01-15 10:30:45 [INFO] Some message
    re.compile(
        r"(?P<timestamp>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+"
        r"\[(?P<level>INFO|WARN|WARNING|ERROR|DEBUG)\]\s+"
        r"(?P<message>.+)"
    ),
    # Level first: INFO 2024-01-15 10:30:45 Some message
    re.compile(
        r"(?P<level>INFO|WARN|WARNING|ERROR|DEBUG)\s+"
        r"(?P<timestamp>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+"
        r"(?P<message>.+)"
    ),
]

TIMESTAMP_FORMATS = [
    "%Y-%m-%dT%H:%M:%S.%f",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S.%f",
    "%Y-%m-%d %H:%M:%S",
]


def _parse_timestamp(raw: str) -> datetime:
    for fmt in TIMESTAMP_FORMATS:
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unable to parse timestamp: {raw}")


def _normalize_level(level: str) -> str:
    if level == "WARNING":
        return "WARN"
    return level


def parse_log_line(line: str) -> dict | None:
    line = line.strip()
    if not line:
        return None

    for pattern in LOG_PATTERNS:
        match = pattern.match(line)
        if match:
            groups = match.groupdict()
            return {
                "timestamp": _parse_timestamp(groups["timestamp"]),
                "level": _normalize_level(groups["level"]),
                "message": groups["message"].strip(),
            }
    return None
