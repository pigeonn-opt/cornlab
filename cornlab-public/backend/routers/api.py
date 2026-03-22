"""
API routers — users, game, analytics, export.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import json, csv, io
from fastapi.responses import StreamingResponse
from datetime import datetime

from backend.database import get_db, User, Session as GameSession, Action, Result, PrePostTest
from backend.game_engine import (generate_field, draw_sample, t_test_one_sample,
                                  evaluate_decision, histogram_bins, CHAPTERS)
from backend.xp_system import award_xp, check_badges, BADGES

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    group: str = "A"

class StartSession(BaseModel):
    user_id: int
    chapter: int = 1
    seed: int = 42

class SampleRequest(BaseModel):
    session_id: int
    user_id: int
    chapter: int
    seed: int = 42

class DecideRequest(BaseModel):
    session_id: int
    user_id: int
    chapter: int
    h0_accepted: bool
    sample_mean: float
    sample_std: float
    time_spent_sec: float
    hint_count: int = 0
    journal_text: str = ""
    retry_count: int = 0

class ActionLog(BaseModel):
    session_id: int
    user_id: int
    action_type: str
    payload: dict = {}

class TestSubmit(BaseModel):
    user_id: int
    test_type: str   # pre | post
    answers: dict
    correct_answers: dict


# ── Users ─────────────────────────────────────────────────────────────────────
@router.post("/users/create")
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        return {"user_id": existing.id, "xp": existing.xp, "level": existing.level,
                "badges": json.loads(existing.badges)}
    user = User(username=body.username, group=body.group)
    db.add(user); db.commit(); db.refresh(user)
    return {"user_id": user.id, "xp": 0, "level": 1, "badges": []}


@router.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    return {"user_id": user.id, "username": user.username, "group": user.group,
            "xp": user.xp, "level": user.level, "badges": json.loads(user.badges)}


# ── Sessions ──────────────────────────────────────────────────────────────────
@router.post("/sessions/start")
def start_session(body: StartSession, db: Session = Depends(get_db)):
    sess = GameSession(user_id=body.user_id, chapter=body.chapter, seed=body.seed)
    db.add(sess); db.commit(); db.refresh(sess)
    return {"session_id": sess.id}


@router.post("/sessions/{session_id}/end")
def end_session(session_id: int, db: Session = Depends(get_db)):
    sess = db.query(GameSession).filter(GameSession.id == session_id).first()
    if sess:
        sess.ended_at = datetime.utcnow()
        db.commit()
    return {"ok": True}


# ── Game ──────────────────────────────────────────────────────────────────────
@router.post("/game/field")
def get_field(body: SampleRequest, db: Session = Depends(get_db)):
    field = generate_field(body.chapter, body.seed)
    # Return grid without values (hidden) — client renders colour by index
    return {"grid_size": 12, "chapter": body.chapter,
            "h0_mean": CHAPTERS[body.chapter]["h0_mean"],
            "chapter_label": CHAPTERS[body.chapter]["label"]}


@router.post("/game/sample")
def sample_field(body: SampleRequest, db: Session = Depends(get_db)):
    field  = generate_field(body.chapter, body.seed)
    sample = draw_sample(field, seed=body.seed)
    stats  = t_test_one_sample(sample, CHAPTERS[body.chapter]["h0_mean"])
    hist   = histogram_bins(sample)
    # Log action
    db.add(Action(session_id=body.session_id, user_id=body.user_id,
                  action_type="sample", payload=json.dumps({"chapter": body.chapter})))
    db.commit()
    # XP
    user = db.query(User).filter(User.id == body.user_id).first()
    if user:
        res = award_xp(user.xp, "sample")
        user.xp = res["xp"]; user.level = res["level"]; db.commit()
        xp_info = res
    else:
        xp_info = {}
    return {"sample": sample, "stats": stats, "histogram": hist, "xp": xp_info}


@router.post("/game/decide")
def decide(body: DecideRequest, db: Session = Depends(get_db)):
    eval_res = evaluate_decision(body.chapter, body.h0_accepted)
    user     = db.query(User).filter(User.id == body.user_id).first()
    if not user: raise HTTPException(404)

    # XP
    action  = "correct_decision" if eval_res["correct"] else "histogram_view"
    xp_info = award_xp(user.xp, action)
    if body.hint_count > 0:
        xp_info = award_xp(xp_info["xp"], "hint_penalty")
    user.xp = xp_info["xp"]; user.level = xp_info["level"]

    # Badges
    result_data = {**eval_res, "chapter": body.chapter,
                   "hint_count": body.hint_count,
                   "time_spent_sec": body.time_spent_sec,
                   "journal_text": body.journal_text}
    new_badges, badges_json = check_badges({"badges": user.badges}, result_data)
    user.badges = badges_json
    db.commit()

    # Persist result
    r = Result(session_id=body.session_id, user_id=body.user_id,
               chapter=body.chapter, h0_accepted=body.h0_accepted,
               correct=eval_res["correct"], type1_error=eval_res["type1_error"],
               type2_error=eval_res["type2_error"], sample_mean=body.sample_mean,
               sample_std=body.sample_std, true_mean=eval_res["true_mean"],
               retry_count=body.retry_count, time_spent_sec=body.time_spent_sec,
               hint_count=body.hint_count, journal_text=body.journal_text)
    db.add(r); db.commit()

    return {**eval_res, "xp": xp_info, "new_badges": new_badges,
            "badge_descriptions": {b: BADGES[b] for b in new_badges}}


@router.post("/game/reveal")
def reveal_field(body: SampleRequest, db: Session = Depends(get_db)):
    field = generate_field(body.chapter, body.seed)
    cfg   = CHAPTERS[body.chapter]
    flat  = [v for row in field for v in row]
    true_mean = sum(flat) / len(flat)
    return {"field": field, "true_mean": round(true_mean, 4),
            "h0_mean": cfg["h0_mean"], "true_std": cfg["true_std"]}


# ── Actions log ───────────────────────────────────────────────────────────────
@router.post("/actions/log")
def log_action(body: ActionLog, db: Session = Depends(get_db)):
    db.add(Action(session_id=body.session_id, user_id=body.user_id,
                  action_type=body.action_type, payload=json.dumps(body.payload)))
    db.commit()
    return {"ok": True}


# ── Pre/Post test ─────────────────────────────────────────────────────────────
@router.post("/test/submit")
def submit_test(body: TestSubmit, db: Session = Depends(get_db)):
    correct = sum(1 for k, v in body.answers.items()
                  if body.correct_answers.get(k) == v)
    score   = correct / max(len(body.correct_answers), 1) * 100
    t = PrePostTest(user_id=body.user_id, test_type=body.test_type,
                    answers=json.dumps(body.answers), score=score)
    db.add(t); db.commit()
    return {"score": round(score, 1), "correct": correct,
            "total": len(body.correct_answers)}


# ── Analytics ─────────────────────────────────────────────────────────────────
@router.get("/analytics/summary")
def analytics_summary(db: Session = Depends(get_db)):
    results = db.query(Result).all()
    if not results:
        return {"total": 0}
    total   = len(results)
    correct = sum(1 for r in results if r.correct)
    t1      = sum(1 for r in results if r.type1_error)
    t2      = sum(1 for r in results if r.type2_error)
    return {"total": total, "accuracy": round(correct/total*100, 1),
            "type1_rate": round(t1/total*100, 1),
            "type2_rate": round(t2/total*100, 1)}


@router.get("/analytics/export/csv")
def export_csv(db: Session = Depends(get_db)):
    results = db.query(Result).all()
    output  = io.StringIO()
    fields  = ["id","session_id","user_id","chapter","h0_accepted","correct",
               "type1_error","type2_error","sample_mean","sample_std","true_mean",
               "retry_count","time_spent_sec","hint_count","journal_text","timestamp"]
    writer  = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for r in results:
        writer.writerow({f: getattr(r, f) for f in fields})
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=cornlab_results.csv"})
