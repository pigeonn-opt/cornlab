/**
 * scene.js — screen/scene manager + pre/post test + login flow
 */
const SceneManager = (() => {
  const screens = {};

  function show(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const el = document.getElementById(`screen-${name}`);
    if (el) { el.classList.add("active"); el.classList.add("fade-in"); }
    screens._current = name;
  }

  return { show };
})();

// ── Pre/Post test questions ────────────────────────────────────────────────
const TEST_QUESTIONS = [
  {
    id: "q1", text: "What does H₀ (the null hypothesis) represent?",
    options: ["A) The alternative claim", "B) No change from baseline", "C) The sample mean", "D) The p-value threshold"],
    answer: "B"
  },
  {
    id: "q2", text: "If p-value = 0.03 and α = 0.05, what do you do?",
    options: ["A) Accept H₀", "B) Reject H₀", "C) Need more data", "D) Cannot decide"],
    answer: "B"
  },
  {
    id: "q3", text: "A Type I error means:",
    options: ["A) Missing a real effect", "B) Rejecting a true H₀", "C) Accepting a false H₀", "D) Sample too small"],
    answer: "B"
  },
  {
    id: "q4", text: "A 95% confidence interval means:",
    options: ["A) 95% of data is inside", "B) H₀ is 95% true", "C) 95% of such intervals contain the true mean", "D) p-value is 0.95"],
    answer: "C"
  },
  {
    id: "q5", text: "Why do we sample instead of measuring everything?",
    options: ["A) Sampling is more accurate", "B) Measuring everything is too costly/impossible", "C) Samples have no error", "D) Statistics requires it"],
    answer: "B"
  },
];

const CORRECT_ANSWERS = Object.fromEntries(TEST_QUESTIONS.map(q => [q.id, q.answer]));

function renderTest(type) {
  const box = document.getElementById("test-box");
  box.innerHTML = `
    <h2>${type === "pre" ? "📋 Pre-Game Knowledge Check" : "📊 Post-Game Assessment"}</h2>
    <p style="color:#81c784;margin-bottom:1.2rem;font-size:.9rem">
      ${type === "pre"
        ? "Answer these questions before playing. Don't worry — there's no penalty!"
        : "Let's see how much you've learned!"}
    </p>
    ${TEST_QUESTIONS.map(q => `
      <div class="q-block">
        <p>${q.text}</p>
        ${q.options.map(o => `
          <label>
            <input type="radio" name="${q.id}" value="${o[0]}"> ${o}
          </label>
        `).join("")}
      </div>
    `).join("")}
    <button class="btn gold" onclick="submitTest('${type}')">Submit Answers</button>
  `;
}

async function submitTest(type) {
  const answers = {};
  TEST_QUESTIONS.forEach(q => {
    const sel = document.querySelector(`input[name="${q.id}"]:checked`);
    answers[q.id] = sel ? sel.value : "";
  });

  const userId = window._cornlabUser?.userId;
  if (userId) {
    const res = await API.submitTest({
      user_id: userId, test_type: type,
      answers, correct_answers: CORRECT_ANSWERS,
    });
    // Only post-test remains
    alert(`Post-test score: ${res.score}% (${res.correct}/${res.total})\n\nThank you for playing CornLab!`);
    SceneManager.show("login");
  }
}

// ── Login flow ─────────────────────────────────────────────────────────────
async function startLogin() {
  const username = document.getElementById("username-input").value.trim();
  const group    = document.getElementById("group-select").value;
  if (!username) { alert("Please enter your name."); return; }

  try {
    Audio.sfx("click");
    const user = await API.createUser(username, group);
    // store username + group alongside the API response
    window._cornlabUser = { ...user, username, group };
    await startGame();
  } catch(e) {
    console.error(e);
    alert("Cannot connect to server. Make sure the backend is running on port 8000.\n\nDetail: " + e.message);
  }
}

async function startGame() {
  // API returns user_id (snake_case) — read both to be safe
  const user     = window._cornlabUser;
  const userId   = user.user_id ?? user.userId;
  const username = user.username ?? "";
  const group    = user.group   ?? "A";
  try {
    await Cutscene.play("intro");
    await Game.init(userId, username, group);
  } catch(e) {
    console.error("Game init error:", e);
    alert("Game failed to start: " + e.message);
  }
}

// ── Boot ───────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  SceneManager.show("login");
  Audio.playBgm("intro");
  document.getElementById("username-input")
    .addEventListener("keydown", e => { if (e.key === "Enter") startLogin(); });
});
