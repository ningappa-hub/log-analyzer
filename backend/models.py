from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base

class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=True, index=True)
    timestamp_raw = Column(String(100), nullable=True)
    level = Column(String(20), nullable=False, index=True)
    message = Column(Text, nullable=False)
