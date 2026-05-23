from sqlalchemy import Column, DateTime, Integer, String

from database import Base


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False)
    level = Column(String, nullable=False, index=True)
    message = Column(String, nullable=False)
