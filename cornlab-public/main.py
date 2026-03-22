"""
CornLab FastAPI — production entry point.
Reads all settings from environment variables.

Required env vars:
  DATABASE_URL   — postgres://user:pass@host/db  (or leave unset for SQLite)
  ALLOWED_ORIGIN — https://your-site.pages.dev   (Cloudflare Pages URL)
  PORT           — port to bind (Railway/Render set this automatically)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os, sys

_here = os.path.dirname(os.path.abspath(__file__))
if _here not in sys.path:
    sys.path.insert(0, _here)

from backend.database import init_db
from backend.routers.api import router

# ── CORS — read allowed origin from env, fallback to wildcard for dev ──
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")
origins = [ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"]

app = FastAPI(title="CornLab API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"status": "ok", "message": "CornLab API"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.on_event("startup")
def startup():
    init_db()
