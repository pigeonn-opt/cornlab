/**
 * tutorial.js — Chapter 1 guided tutorial flow
 * Fully guided, cannot fail, progress bar driven
 */
const Tutorial = (() => {
  const STEPS = [
    {
      progress: 10,
      action: async () => {
        await Dialogue.play([
          { npc: "farmer", text: "Welcome to my farm! I'm Farmer John. Last year I got 50 bushels per plot on average. This year I'm worried things have changed." },
          { npc: "doctor", text: "Hello! I'm Dr. Smith. I'm a statistician. We're going to use something called Hypothesis Testing to investigate Farmer John's claim." },
          { npc: "system", text: "Your job: act as a Data Detective. You'll sample plots, look at the data, and decide if the yield has really changed." },
        ]);
      }
    },
    {
      progress: 25,
      action: async () => {
        await Dialogue.play([
          { npc: "doctor", text: "First, we set up our hypotheses. H₀ (the null) says: 'Nothing changed — yield is still 50.' H₁ (the alternative) says: 'Something changed!'" },
          { npc: "farmer", text: "Think of H₀ as 'innocent until proven guilty'. We assume nothing changed unless the data proves otherwise." },
        ]);
        // Highlight the hypothesis panel
        document.getElementById("hyp-panel").classList.add("highlight");
        await _wait(2000);
        document.getElementById("hyp-panel").classList.remove("highlight");
      }
    },
    {
      progress: 45,
      action: async () => {
        await Dialogue.play([
          { npc: "doctor", text: "Now click the 🌽 SAMPLE button. We'll randomly pick 35 plots and measure their yield. We can't check all 144 — that's too expensive!" },
          { npc: "system", text: "👇 Click the green SAMPLE button below the field." },
        ]);
        document.getElementById("btn-sample").classList.add("highlight");
      }
    },
    {
      progress: 65,
      action: async () => {
        document.getElementById("btn-sample").classList.remove("highlight");
        await Dialogue.play([
          { npc: "doctor", text: "Great! Look at the histogram. The green line is your sample mean. The yellow dashed line is what we expected (50 bu)." },
          { npc: "doctor", text: "The shaded green area is the 95% Confidence Interval — the range where the true mean probably lives." },
          { npc: "farmer", text: "If the yellow line is inside the green zone, the yield probably hasn't changed much!" },
        ]);
        document.getElementById("hist-card").classList.add("highlight");
        await _wait(2500);
        document.getElementById("hist-card").classList.remove("highlight");
      }
    },
    {
      progress: 80,
      action: async () => {
        await Dialogue.play([
          { npc: "doctor", text: "Now look at the p-value. If it's less than 0.05, we have strong evidence against H₀. If it's bigger, we don't." },
          { npc: "system", text: "👇 Now click ACCEPT H₀ or REJECT H₀ based on what you see. In this tutorial, either choice is fine — we'll explain the result!" },
        ]);
        document.getElementById("decision-area").classList.add("highlight");
      }
    },
    {
      progress: 95,
      action: async () => {
        document.getElementById("decision-area").classList.remove("highlight");
        await Dialogue.play([
          { npc: "doctor", text: "Excellent work! You've just completed your first hypothesis test. Let's reveal the true field data and see how you did." },
          { npc: "farmer", text: "Don't worry if you made an error — even scientists make Type I and Type II errors. That's why we study them!" },
        ]);
      }
    },
  ];

  let _step = 0;

  function _wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function _setProgress(pct) {
    document.getElementById("progress-bar").style.width = pct + "%";
  }

  async function runStep(stepIndex) {
    if (stepIndex >= STEPS.length) return;
    const s = STEPS[stepIndex];
    _setProgress(s.progress);
    await s.action();
  }

  async function start() {
    _step = 0;
    document.getElementById("progress-wrap").style.display = "block";
    _setProgress(5);
    await runStep(0);
    await runStep(1);
    // Steps 2–5 are triggered by player actions (sample, decide, reveal)
    Game.setTutorialStep(2);
  }

  async function advance() {
    _step++;
    if (_step < STEPS.length) await runStep(_step);
  }

  return { start, advance, runStep };
})();
