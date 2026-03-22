/**
 * game.js — main game controller
 * Manages state, chapter flow, player actions, result display
 */
const Game = (() => {
  // ── State ──────────────────────────────────────────────────────────
  let state = {
    userId: null, sessionId: null, username: "",
    chapter: 1, seed: 42,
    sampleData: null, stats: null,
    startTime: null, hintCount: 0,
    retryCount: 0, tutorialStep: 0,
    isTutorial: true, group: "A",
  };

  const CHAPTER_LABELS = {
    1: "Tutorial — The Suspicious Harvest",
    2: "Chapter 2 — The Claim",
    3: "Chapter 3 — Conflicting Data",
    4: "Chapter 4 — The Storm",
    5: "Chapter 5 — The Policy Decision",
  };

  const CHAPTER_CUTSCENES = { 2:"ch2", 3:"ch3", 4:"ch4", 5:"ch5" };

  // ── Toast helper ───────────────────────────────────────────────────
  function toast(msg, type = "") {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className   = "show " + type;
    setTimeout(() => el.className = "", 2800);
  }

  // ── Update HUD ─────────────────────────────────────────────────────
  function _updateHUD(xpInfo) {
    if (xpInfo) {
      XPSystem.update(xpInfo.xp, xpInfo.level);
      XPSystem.flash(xpInfo.delta);
    }
    document.getElementById("chapter-label").textContent =
      CHAPTER_LABELS[state.chapter] || `Chapter ${state.chapter}`;
  }

  // ── Stats panel ────────────────────────────────────────────────────
  function _renderStats(stats, h0Mean) {
    const pClass = stats.p_value < 0.05 ? "danger" : "warn";
    document.getElementById("stats-body").innerHTML = `
      <div class="stat-row"><span>Sample size (n)</span><span class="stat-val">${stats.n}</span></div>
      <div class="stat-row"><span>Sample mean (x̄)</span><span class="stat-val">${stats.mean.toFixed(2)} bu</span></div>
      <div class="stat-row"><span>Std deviation</span><span class="stat-val">${stats.std.toFixed(2)}</span></div>
      <div class="stat-row"><span>Std error</span><span class="stat-val">${stats.se.toFixed(3)}</span></div>
      <div class="stat-row"><span>t-statistic</span><span class="stat-val">${stats.t_stat.toFixed(3)}</span></div>
      <div class="stat-row"><span>p-value</span>
        <span class="stat-val ${pClass}" title="If p < 0.05 we reject H₀">${stats.p_value.toFixed(4)}</span></div>
      <div class="stat-row"><span>95% CI</span>
        <span class="stat-val">[${stats.ci_lo.toFixed(2)}, ${stats.ci_hi.toFixed(2)}]</span></div>
      <div class="stat-row"><span>H₀ mean (μ₀)</span><span class="stat-val">${h0Mean} bu</span></div>
    `;
  }

  // ── Hypothesis panel ───────────────────────────────────────────────
  function _renderHypothesis(h0Mean) {
    document.getElementById("hyp-body").innerHTML = `
      <div class="stat-row">
        <span>H₀ (Null)</span>
        <span class="stat-val">Mean = ${h0Mean} bu <span title="Nothing changed">ℹ️</span></span>
      </div>
      <div class="stat-row">
        <span>H₁ (Alternative)</span>
        <span class="stat-val warn">Mean ≠ ${h0Mean} bu</span>
      </div>
      <div class="stat-row">
        <span>Significance (α)</span>
        <span class="stat-val">0.05</span>
      </div>
    `;
  }

  // ── Sample action ──────────────────────────────────────────────────
  async function doSample() {
    document.getElementById("btn-sample").disabled = true;
    toast("🌽 Sampling 35 random plots…", "gold-toast");
    Audio.sfx("sample");

    try {
      const res = await API.sample(state.sessionId, state.userId, state.chapter, state.seed);
      state.sampleData = res.sample;
      state.stats      = res.stats;
      state.startTime  = Date.now();

      // Mark sampled plots on field (random indices matching backend seed)
      const indices = _sampleIndices(state.seed, 35);
      Field.markSampled(new Set(indices));

      _renderStats(res.stats, res.stats.ci_lo !== undefined ? 50 : 50);
      Histogram.draw(res.histogram, res.stats, 50);

      // Enable decision buttons
      document.getElementById("btn-accept").disabled = false;
      document.getElementById("btn-reject").disabled = false;
      document.getElementById("btn-reveal").disabled = false;

      _updateHUD(res.xp);
      Audio.sfx("xp");

      if (state.isTutorial && state.tutorialStep === 2) {
        state.tutorialStep = 3;
        await Tutorial.runStep(3);
        state.tutorialStep = 4;
        await Tutorial.runStep(4);
        state.tutorialStep = 5;
      }
    } catch(e) {
      toast("⚠️ Could not reach server. Check backend.", "red-toast");
      document.getElementById("btn-sample").disabled = false;
    }
  }

  // Reproduce the same random sample indices the backend uses
  function _sampleIndices(seed, n) {
    // Simple seeded shuffle (matches Python random.sample logic approximately)
    const arr = Array.from({length:144},(_,i)=>i);
    let s = seed + 1000;
    function rand() { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, n);
  }

  // ── Decision action ────────────────────────────────────────────────
  async function doDecide(h0Accepted) {
    if (!state.stats) { toast("Sample first!", "red-toast"); return; }

    document.getElementById("btn-accept").disabled = true;
    document.getElementById("btn-reject").disabled = true;

    const timeSec = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
    const journal = document.getElementById("journal-input").value;

    try {
      const res = await API.decide({
        session_id:     state.sessionId,
        user_id:        state.userId,
        chapter:        state.chapter,
        h0_accepted:    h0Accepted,
        sample_mean:    state.stats.mean,
        sample_std:     state.stats.std,
        time_spent_sec: timeSec,
        hint_count:     state.hintCount,
        journal_text:   journal,
        retry_count:    state.retryCount,
      });

      _updateHUD(res.xp);
      Audio.sfx(res.correct ? "correct" : "wrong");
      _showResult(res, h0Accepted);

      if (state.isTutorial && state.tutorialStep === 5) {
        await Tutorial.runStep(5);
      }
    } catch(e) {
      toast("⚠️ Server error on decision.", "red-toast");
    }
  }

  // ── Result overlay ─────────────────────────────────────────────────
  function _showResult(res, h0Accepted) {
    const overlay = document.getElementById("result-overlay");
    const card    = document.getElementById("result-card");

    let icon, title, msg, color;
    if (res.correct) {
      icon  = "✅"; title = "Correct Decision!"; color = "#4caf50";
      msg   = h0Accepted
        ? "You correctly accepted H₀. The yield hasn't significantly changed."
        : "You correctly rejected H₀. The yield has significantly changed!";
    } else if (res.type1_error) {
      icon  = "⚠️"; title = "Type I Error (False Alarm)"; color = "#ffd700";
      msg   = "You rejected H₀ when it was actually true. This is a false alarm — like convicting an innocent person.";
    } else {
      icon  = "🔍"; title = "Type II Error (Missed Effect)"; color = "#42a5f5";
      msg   = "You accepted H₀ when it was actually false. You missed a real change — like letting a guilty person go free.";
    }

    const badges = res.new_badges?.map(b =>
      `<div class="badge-chip">🏅 ${res.badge_descriptions?.[b] ?? b}</div>`
    ).join("") || "";

    card.innerHTML = `
      <div class="result-icon">${icon}</div>
      <h2 style="color:${color}">${title}</h2>
      <p>${msg}</p>
      <p style="font-size:.85rem;color:#81c784">
        True mean: <strong>${res.true_mean} bu</strong> &nbsp;|&nbsp;
        H₀ mean: <strong>50 bu</strong> &nbsp;|&nbsp;
        Null was: <strong>${res.null_true ? "TRUE" : "FALSE"}</strong>
      </p>
      ${badges ? `<div class="badge-list">${badges}</div>` : ""}
      <div style="display:flex;gap:.8rem;justify-content:center;margin-top:1rem;flex-wrap:wrap">
        <button class="btn" onclick="Game.redoChapter()">🔄 Redo</button>
        ${state.chapter < 5
          ? `<button class="btn gold" onclick="Game.nextChapter()">Next Chapter →</button>`
          : `<button class="btn gold" onclick="Game.showEnding()">🏆 See Ending</button>`}
      </div>
    `;

    overlay.classList.add("show");
  }

  function closeResult() {
    document.getElementById("result-overlay").classList.remove("show");
  }

  // ── Redo: restart current chapter without advancing ────────────────
  async function redoChapter() {
    closeResult();
    state.retryCount++;
    state.sampleData = null;
    state.stats      = null;
    state.hintCount  = 0;
    state.startTime  = null;

    // Start a fresh session for the same chapter
    await API.endSession(state.sessionId);
    const sess = await API.startSession(state.userId, state.chapter, state.seed);
    state.sessionId = sess.session_id;

    // Reset UI
    Field.reset();
    Histogram.clear();
    document.getElementById("stats-body").innerHTML = "<p style='color:#555;font-size:.85rem'>Sample first to see statistics.</p>";
    document.getElementById("btn-sample").disabled = false;
    document.getElementById("btn-accept").disabled = true;
    document.getElementById("btn-reject").disabled = true;
    document.getElementById("journal-input").value = "";

    _renderHypothesis(50);
    _updateHUD(null);
    SceneManager.show("game");
    toast(`🔄 Restarting ${CHAPTER_LABELS[state.chapter]}…`, "gold-toast");
  }

  // ── Reveal action ──────────────────────────────────────────────────
  async function doReveal() {
    try {
      const res = await API.reveal(state.sessionId, state.userId, state.chapter, state.seed);
      Field.reveal(res);
      Audio.sfx("reveal");
      toast(`🌽 True mean: ${res.true_mean.toFixed(2)} bu (H₀ was ${res.h0_mean} bu)`, "gold-toast");
      await API.logAction(state.sessionId, state.userId, "reveal", { chapter: state.chapter });
    } catch(e) {
      toast("⚠️ Reveal failed.", "red-toast");
    }
  }

  // ── Hint system ────────────────────────────────────────────────────
  async function showHint() {
    state.hintCount++;
    const hints = [
      "Look at the p-value. If it's below 0.05, the evidence against H₀ is strong.",
      "The green shaded area on the histogram is the 95% Confidence Interval.",
      "If the yellow H₀ line (μ₀=50) is outside the green CI, consider rejecting H₀.",
      "A large t-statistic (far from 0) means the sample mean is far from H₀.",
      "Remember: rejecting H₀ doesn't mean H₀ is definitely false — just unlikely.",
    ];
    const hint = hints[(state.hintCount - 1) % hints.length];
    Audio.sfx("hint");
    await Dialogue.say("doctor", `💡 Hint ${state.hintCount}: ${hint}`, 5000);
    XPSystem.flash(-5);
    await API.logAction(state.sessionId, state.userId, "hint", { count: state.hintCount });
  }

  // ── Chapter navigation ─────────────────────────────────────────────
  async function nextChapter() {
    closeResult();
    state.chapter++;
    state.isTutorial  = false;
    state.sampleData  = null;
    state.stats       = null;
    state.hintCount   = 0;
    state.retryCount  = 0;
    state.startTime   = null;

    // End old session, start new
    await API.endSession(state.sessionId);
    const sess = await API.startSession(state.userId, state.chapter, state.seed);
    state.sessionId = sess.session_id;

    // Cutscene
    Audio.sfx("chapter");
    const cs = CHAPTER_CUTSCENES[state.chapter];
    if (cs) await Cutscene.play(cs);

    // Reset UI
    Field.reset();
    Histogram.clear();
    document.getElementById("stats-body").innerHTML = "<p style='color:#555;font-size:.85rem'>Sample first to see statistics.</p>";
    document.getElementById("btn-sample").disabled  = false;
    document.getElementById("btn-accept").disabled  = true;
    document.getElementById("btn-reject").disabled  = true;
    document.getElementById("journal-input").value  = "";
    document.getElementById("progress-wrap").style.display = "none";

    _renderHypothesis(50);
    _updateHUD(null);

    SceneManager.show("game");
    Audio.playBgm(state.chapter >= 3 ? "tension" : "game");

    // Chapter-specific NPC intro
    const intros = {
      2: [{ npc:"farmer", text:"I'm telling you, my yield is the same as last year. 50 bushels. Test it yourself!" },
          { npc:"doctor", text:"Let's see what the data says. Sample the field and run the test." }],
      3: [{ npc:"farmer", text:"The data is all over the place this year. I don't know what to believe." },
          { npc:"doctor", text:"High variability makes it harder to detect real changes. Stay focused on the statistics." }],
      4: [{ npc:"policy", text:"We had a major weather event. Variance is extreme. Your decision will affect subsidy allocation." },
          { npc:"doctor", text:"With high variance, the confidence interval widens. Be careful about your conclusion." }],
      5: [{ npc:"policy", text:"The government needs your final report. Thousands of farmers depend on this decision." },
          { npc:"farmer", text:"Please — get it right. My family's livelihood is on the line." },
          { npc:"doctor", text:"Apply everything you've learned. This is the real test." }],
    };
    if (intros[state.chapter]) await Dialogue.play(intros[state.chapter]);
  }

  async function showEnding() {
    closeResult();
    Audio.sfx("correct");
    Audio.playBgm("victory");
    const summary = await API.analytics();
    await Cutscene.play("ending", summary);
    Audio.stopBgm();
    SceneManager.show("login");
  }

  // ── Init ───────────────────────────────────────────────────────────
  async function init(userId, username, group) {
    state.userId   = userId;
    state.username = username;
    state.group    = group;
    state.chapter  = 1;
    state.isTutorial = true;

    const sess = await API.startSession(userId, 1, state.seed);
    state.sessionId = sess.session_id;

    const user = await API.getUser(userId);
    XPSystem.update(user.xp, user.level);

    _renderHypothesis(50);
    _updateHUD(null);
    Field.reset();
    Histogram.clear();

    document.getElementById("btn-sample").disabled = false;
    document.getElementById("btn-accept").disabled = true;
    document.getElementById("btn-reject").disabled = true;
    document.getElementById("progress-wrap").style.display = "block";

    SceneManager.show("game");
    Audio.playBgm("game");
    await Tutorial.start();
  }

  function setTutorialStep(n) { state.tutorialStep = n; }

  return { init, doSample, doDecide, doReveal, showHint, nextChapter, redoChapter, showEnding, closeResult, setTutorialStep };
})();
