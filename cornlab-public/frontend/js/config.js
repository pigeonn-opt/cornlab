/**
 * config.js — single source of truth for deployment settings
 *
 * FOR LOCAL DEV:   set API_BASE = "http://127.0.0.1:8000/api"
 * FOR PRODUCTION:  set API_BASE = "https://your-backend.railway.app/api"
 *
 * This is the ONLY file you need to edit when deploying.
 */
const CONFIG = {
  API_BASE: "https://YOUR_BACKEND_URL/api",   // ← replace before deploying
};
