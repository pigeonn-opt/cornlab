# CornLab — Public Deployment Guide

## Architecture

```
Cloudflare Pages          Railway / Render / VPS
─────────────────         ──────────────────────
frontend/                 main.py  (FastAPI)
  index.html    ←──────→  /api/*
  js/config.js            PostgreSQL (Railway addon)
```

---

## Step 1 — Deploy the Backend (Railway — free tier)

1. Go to https://railway.app → New Project → Deploy from GitHub
2. Push the `cornlab-public/` folder to a GitHub repo
3. Railway auto-detects `railway.toml` and runs uvicorn
4. Add environment variables in Railway dashboard:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | auto-filled by Railway Postgres addon |
   | `ALLOWED_ORIGIN` | `https://cornlab.pages.dev` (your CF Pages URL) |

5. Add a **PostgreSQL** addon in Railway → it sets `DATABASE_URL` automatically
6. Note your backend URL: `https://cornlab-api.up.railway.app`

---

## Step 2 — Configure the Frontend

Edit `frontend/js/config.js` — replace the placeholder with your Railway URL:

```js
const CONFIG = {
  API_BASE: "https://cornlab-api.up.railway.app/api",
};
```

---

## Step 3 — Deploy Frontend to Cloudflare Pages

1. Go to https://pages.cloudflare.com → Create a project
2. Connect your GitHub repo
3. Set build settings:
   - **Build command:** *(leave empty — no build step needed)*
   - **Build output directory:** `frontend`
4. Deploy → Cloudflare gives you `https://cornlab.pages.dev`

---

## Step 4 — Update CORS on Backend

In Railway dashboard, set:
```
ALLOWED_ORIGIN = https://cornlab.pages.dev
```
Then redeploy.

---

## Files changed vs local version

| File | Change |
|------|--------|
| `frontend/js/config.js` | NEW — single place to set API URL |
| `frontend/js/api.js` | Uses `CONFIG.API_BASE` instead of hardcoded localhost |
| `frontend/index.html` | Loads `config.js` before `api.js` |
| `main.py` | Reads `ALLOWED_ORIGIN` and `PORT` from env, no static file serving |
| `backend/database.py` | Reads `DATABASE_URL` from env, supports PostgreSQL |
| `requirements.txt` | Added `psycopg2-binary` for PostgreSQL |
| `railway.toml` | NEW — Railway deployment config |
| `frontend/_redirects` | NEW — Cloudflare Pages SPA routing |
| `frontend/_headers` | NEW — Security headers |

---

## Alternative free backends

| Platform | Free tier | Notes |
|----------|-----------|-------|
| Railway | 500 hrs/month | Easiest, auto PostgreSQL |
| Render | 750 hrs/month | Sleeps after 15min inactivity |
| Fly.io | 3 shared VMs | Best performance |
| Koyeb | Always-on free | Good for Asia region |
