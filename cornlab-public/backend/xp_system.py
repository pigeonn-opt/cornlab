"""
XP / Level / Badge system.
"""
import json

LEVELS = [
    (0,    "Beginner Analyst"),
    (100,  "Field Investigator"),
    (300,  "Data Analyst"),
    (600,  "Senior Scientist"),
    (1000, "Chief Decision Maker"),
]

XP_REWARDS = {
    "sample":          10,
    "histogram_view":   5,
    "correct_decision": 50,
    "chapter_complete": 80,
    "hint_penalty":    -5,
    "journal_entry":   15,
    "efficient_sample": 20,   # used fewer retries
}

BADGES = {
    "junior_detective":   "Junior Data Detective — completed tutorial",
    "first_blood":        "First Blood — first correct decision",
    "no_hints":           "Lone Wolf — completed chapter without hints",
    "type1_survivor":     "Type I Survivor — avoided false alarm",
    "type2_hunter":       "Type II Hunter — caught a missed effect",
    "speed_sampler":      "Speed Sampler — decided in under 60 s",
    "journal_keeper":     "Journal Keeper — wrote 3+ reflections",
    "master_scientist":   "Master Scientist — completed all chapters",
}


def get_level(xp: int) -> tuple[int, str]:
    level, title = 1, LEVELS[0][1]
    for i, (threshold, name) in enumerate(LEVELS):
        if xp >= threshold:
            level, title = i + 1, name
    return level, title


def award_xp(current_xp: int, action: str) -> dict:
    delta   = XP_REWARDS.get(action, 0)
    new_xp  = max(0, current_xp + delta)
    lvl, title = get_level(new_xp)
    return {"xp": new_xp, "delta": delta, "level": lvl, "title": title}


def check_badges(user_data: dict, result: dict) -> list[str]:
    earned = json.loads(user_data.get("badges", "[]"))
    new_badges = []

    def _add(b):
        if b not in earned:
            earned.append(b)
            new_badges.append(b)

    if result.get("chapter") == 1:
        _add("junior_detective")
    if result.get("correct") and "first_blood" not in earned:
        _add("first_blood")
    if result.get("hint_count", 1) == 0:
        _add("no_hints")
    if result.get("type1_error") is False and result.get("correct"):
        _add("type1_survivor")
    if result.get("type2_error") is False and result.get("correct"):
        _add("type2_hunter")
    if result.get("time_spent_sec", 999) < 60:
        _add("speed_sampler")
    if result.get("journal_text", "") and len(result["journal_text"]) > 20:
        _add("journal_keeper")
    if result.get("chapter") == 5 and result.get("correct"):
        _add("master_scientist")

    return new_badges, json.dumps(earned)
