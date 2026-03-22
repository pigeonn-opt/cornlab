"""
CornLab Database — supports both SQLite (dev) and PostgreSQL (production).
Reads DATABASE_URL from environment. Falls back to SQLite if not set.
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cornlab.db")

# SQLAlchemy requires postgresql:// not postgres:// (Railway uses the old form)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine       = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()


class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True, index=True)
    username   = Column(String, unique=True, index=True)
    group      = Column(String, default="A")
    xp         = Column(Integer, default=0)
    level      = Column(Integer, default=1)
    badges     = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)


class Session(Base):
    __tablename__ = "sessions"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, index=True)
    chapter    = Column(Integer, default=1)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at   = Column(DateTime, nullable=True)
    seed       = Column(Integer, default=42)


class Action(Base):
    __tablename__ = "actions"
    id          = Column(Integer, primary_key=True, index=True)
    session_id  = Column(Integer, index=True)
    user_id     = Column(Integer, index=True)
    action_type = Column(String)
    payload     = Column(Text)
    timestamp   = Column(DateTime, default=datetime.utcnow)


class Result(Base):
    __tablename__ = "results"
    id             = Column(Integer, primary_key=True, index=True)
    session_id     = Column(Integer, index=True)
    user_id        = Column(Integer, index=True)
    chapter        = Column(Integer)
    h0_accepted    = Column(Boolean)
    correct        = Column(Boolean)
    type1_error    = Column(Boolean, default=False)
    type2_error    = Column(Boolean, default=False)
    sample_mean    = Column(Float)
    sample_std     = Column(Float)
    true_mean      = Column(Float)
    retry_count    = Column(Integer, default=0)
    time_spent_sec = Column(Float)
    hint_count     = Column(Integer, default=0)
    journal_text   = Column(Text, default="")
    timestamp      = Column(DateTime, default=datetime.utcnow)


class PrePostTest(Base):
    __tablename__ = "pretests"
    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, index=True)
    test_type = Column(String)
    answers   = Column(Text)
    score     = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
