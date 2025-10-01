from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Time, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to events
    events = relationship("Event", back_populates="user", cascade="all, delete-orphan")


class Event(Base):
    __tablename__ = "events"
    
    event_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    location = Column(String(500))
    images = Column(JSON, default="[]")  # Store as JSON string instead of ARRAY
    start_time = Column(Time)
    end_time = Column(Time)
    start_date = Column(Date)
    end_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="events")
    layouts = relationship("Layout", back_populates="event", cascade="all, delete-orphan")


class Layout(Base):
    __tablename__ = "layouts"
    
    layout_id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.event_id"), nullable=False)
    name = Column(String(200), nullable=False)
    layout = Column(JSON)  # Use generic JSON instead of PostgreSQL-specific JSONB
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    event = relationship("Event", back_populates="layouts")