/**
 * xp.js — client-side XP bar + level display
 */
const XPSystem = (() => {
  const LEVELS = [
    [0,    "Beginner Analyst"],
    [100,  "Field Investigator"],
    [300,  "Data Analyst"],
    [600,  "Senior Scientist"],
    [1000, "Chief Decision Maker"],
  ];

  const barEl   = document.getElementById("xp-bar");
  const badgeEl = document.getElementById("level-badge");
  const xpText  = document.getElementById("xp-text");

  let _xp = 0, _level = 1;

  function _getLevel(xp) {
    let lv = 1, title = LEVELS[0][1], next = LEVELS[1]?.[0] ?? 9999;
    for (let i = 0; i < LEVELS.length; i++) {
      if (xp >= LEVELS[i][0]) { lv = i + 1; title = LEVELS[i][1]; next = LEVELS[i+1]?.[0] ?? 9999; }
    }
    return { lv, title, next };
  }

  function update(xp, level) {
    _xp = xp; _level = level;
    const { title, next } = _getLevel(xp);
    const prev = LEVELS[level - 1]?.[0] ?? 0;
    const pct  = Math.min(((xp - prev) / (next - prev)) * 100, 100);
    barEl.style.width   = pct + "%";
    badgeEl.textContent = `Lv.${level} ${title}`;
    xpText.textContent  = `${xp} XP`;
  }

  function flash(delta) {
    if (!delta) return;
    const sign  = delta > 0 ? "+" : "";
    const toast = document.getElementById("toast");
    toast.textContent = `${sign}${delta} XP`;
    toast.className   = delta > 0 ? "show gold-toast" : "show red-toast";
    setTimeout(() => toast.className = "", 2200);
  }

  return { update, flash };
})();
