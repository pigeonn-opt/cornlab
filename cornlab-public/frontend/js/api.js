/**
 * api.js — backend client
 * Base URL is read from config.js (CONFIG.API_BASE).
 */
const API = (() => {
  const BASE = CONFIG.API_BASE;

  async function post(path, body) {
    const r = await fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`API ${path} -> ${r.status}`);
    return r.json();
  }

  async function get(path) {
    const r = await fetch(BASE + path);
    if (!r.ok) throw new Error(`API ${path} -> ${r.status}`);
    return r.json();
  }

  return {
    createUser:   (username, group)                    => post("/users/create", { username, group }),
    getUser:      (id)                                 => get(`/users/${id}`),
    startSession: (user_id, chapter, seed)             => post("/sessions/start", { user_id, chapter, seed }),
    endSession:   (session_id)                         => post(`/sessions/${session_id}/end`, {}),
    getField:     (session_id, user_id, chapter, seed) => post("/game/field",  { session_id, user_id, chapter, seed }),
    sample:       (session_id, user_id, chapter, seed) => post("/game/sample", { session_id, user_id, chapter, seed }),
    decide:       (body)                               => post("/game/decide", body),
    reveal:       (session_id, user_id, chapter, seed) => post("/game/reveal", { session_id, user_id, chapter, seed }),
    logAction:    (session_id, user_id, type, payload) => post("/actions/log", { session_id, user_id, action_type: type, payload }),
    submitTest:   (body)                               => post("/test/submit", body),
    analytics:    ()                                   => get("/analytics/summary"),
  };
})();
