/**
 * cutscene.js — canvas-based cinematic cutscene engine
 */
const Cutscene = (() => {
  const canvas  = document.getElementById("cutscene-canvas");
  const ctx     = canvas.getContext("2d");
  const subEl   = document.getElementById("cutscene-subtitle");
  const skipBtn = document.getElementById("cutscene-skip");

  let _raf        = null;
  let _skipResolve = null;   // holds the Promise resolver so skip can fire it immediately

  function _resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener("resize", _resize);
  _resize();

  // ── Skip: cancel RAF and resolve the waiting Promise immediately ────
  skipBtn.addEventListener("click", _doSkip);
  document.addEventListener("keydown", e => { if (e.code === "Space") _doSkip(); });

  function _doSkip() {
    cancelAnimationFrame(_raf);
    subEl.textContent = "";
    if (_skipResolve) { _skipResolve(); _skipResolve = null; }
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  function _makeParticles(n = 80) {
    return Array.from({ length: n }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      vy: 1 + Math.random() * 2,
      vx: (Math.random() - .5) * .5,
      r: 3 + Math.random() * 4,
      color: `hsl(${45 + Math.random()*30},80%,${50+Math.random()*20}%)`,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - .5) * .05,
    }));
  }

  function _drawParticles(pts) {
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
      if (p.y > canvas.height + 10) { p.y = -10; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 1.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  function _drawBg(color1 = "#0a1a0a", color2 = "#000") {
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width*.7);
    grad.addColorStop(0, color1); grad.addColorStop(1, color2);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function _text(text, y, size = 48, color = "#ffd700", alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
    ctx.font = `bold ${size}px 'Segoe UI', sans-serif`;
    ctx.textAlign = "center"; ctx.shadowColor = color; ctx.shadowBlur = 20;
    ctx.fillText(text, canvas.width / 2, y); ctx.restore();
  }

  // ── Core scene runner ────────────────────────────────────────────────
  // duration ms, draw callback receives (t) elapsed ms
  function _runScene(durationMs, drawFn) {
    return new Promise(res => {
      _skipResolve = res;   // allow skip to resolve immediately
      const start = performance.now();
      function frame(now) {
        const t = now - start;
        drawFn(t);
        if (t < durationMs) { _raf = requestAnimationFrame(frame); }
        else { _skipResolve = null; res(); }
      }
      _raf = requestAnimationFrame(frame);
    });
  }

  // ── Scenes ───────────────────────────────────────────────────────────
  const SCENES = {

    intro: () => {
      const pts = _makeParticles(60);
      subEl.textContent = "";
      const lines = [
        [0,    "Somewhere in the midwest, a corn farmer is worried…"],
        [3000, "Last year's harvest was 50 bushels per plot."],
        [6000, "This year… something feels different."],
        [9000, "But we can't measure every single plot."],
        [12000,"We need a smarter approach."],
        [15000,"We need… Hypothesis Testing."],
      ];
      let li = 0;
      return _runScene(18000, t => {
        _drawBg();
        _drawParticles(pts);
        if (t > 1000) {
          const a = Math.min((t - 1000) / 1000, 1);
          _text("🌽 CornLab", canvas.height * .35, 64, "#ffd700", a);
          _text("The Hypothesis Trial", canvas.height * .35 + 70, 28, "#81c784", a);
        }
        while (li < lines.length && t >= lines[li][0]) { subEl.textContent = lines[li][1]; li++; }
      });
    },

    ch2: () => {
      const pts = _makeParticles(30); subEl.textContent = "";
      const lines = [
        [0,    "Chapter 2: The Claim"],
        [2500, "Farmer John insists: 'My yield is the same as last year!'"],
        [5500, "Dr. Smith is skeptical. The data tells a different story."],
        [8500, "Your mission: Sample the field. Test the claim."],
      ];
      let li = 0;
      return _runScene(11000, t => {
        _drawBg(); _drawParticles(pts);
        _text("Chapter 2",  canvas.height*.4,    52, "#ffd700", Math.min(t/800,1));
        _text("The Claim",  canvas.height*.4+60, 30, "#81c784", Math.min((t-400)/800,1));
        while (li < lines.length && t >= lines[li][0]) { subEl.textContent = lines[li][1]; li++; }
      });
    },

    ch3: () => {
      const pts = _makeParticles(40); subEl.textContent = "";
      const lines = [
        [0,    "Chapter 3: Conflicting Data"],
        [2500, "Farmer John and Dr. Smith are arguing."],
        [5000, "The data is noisy. The truth is hidden."],
        [7500, "Can you cut through the noise and find the signal?"],
      ];
      let li = 0;
      return _runScene(10000, t => {
        ctx.fillStyle = "rgba(20,5,5,1)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        _drawParticles(pts);
        _text("Chapter 3",       canvas.height*.4,    52, "#ef5350", Math.min(t/800,1));
        _text("Conflicting Data", canvas.height*.4+60, 30, "#ffcdd2", Math.min((t-400)/800,1));
        while (li < lines.length && t >= lines[li][0]) { subEl.textContent = lines[li][1]; li++; }
      });
    },

    ch4: () => {
      const pts = _makeParticles(80); subEl.textContent = "";
      const lines = [
        [0,    "Chapter 4: The Storm"],
        [2500, "A weather event hit the region. Variance is extreme."],
        [5500, "Some plots thrived. Others failed. The spread is wide."],
        [8500, "High variance makes decisions harder. Stay sharp."],
      ];
      let li = 0;
      return _runScene(11000, t => {
        _drawBg("#050a1a", "#000");
        if (Math.sin(t * .003) > .97) { ctx.fillStyle = "rgba(200,220,255,0.08)"; ctx.fillRect(0,0,canvas.width,canvas.height); }
        _drawParticles(pts);
        _text("Chapter 4", canvas.height*.4,    52, "#42a5f5", Math.min(t/800,1));
        _text("The Storm", canvas.height*.4+60, 30, "#90caf9", Math.min((t-400)/800,1));
        while (li < lines.length && t >= lines[li][0]) { subEl.textContent = lines[li][1]; li++; }
      });
    },

    ch5: () => {
      const pts = _makeParticles(20); subEl.textContent = "";
      const lines = [
        [0,    "Chapter 5: The Policy Decision"],
        [2500, "The government needs an answer. Subsidies are on the line."],
        [5500, "A wrong decision affects thousands of farmers."],
        [8500, "This is what hypothesis testing is really for."],
        [11000,"Choose wisely. The stakes have never been higher."],
      ];
      let li = 0;
      return _runScene(14000, t => {
        _drawBg("#1a1500", "#000"); _drawParticles(pts);
        _text("Chapter 5",          canvas.height*.4,    52, "#ffd700", Math.min(t/800,1));
        _text("The Policy Decision", canvas.height*.4+60, 30, "#fff9c4", Math.min((t-400)/800,1));
        while (li < lines.length && t >= lines[li][0]) { subEl.textContent = lines[li][1]; li++; }
      });
    },

    ending: (summary) => {
      const pts = _makeParticles(100); subEl.textContent = "";
      const acc = summary?.accuracy ?? "?";
      const lines = [
        [0,    "The investigation is complete."],
        [3000, `Your overall accuracy: ${acc}%`],
        [6000, "You've learned to make decisions under uncertainty."],
        [9000, "That is the power of hypothesis testing."],
        [12000,"You have mastered the art of the Hypothesis Trial."],
        [15000,"🌽 Thank you for playing CornLab 🌽"],
      ];
      let li = 0;
      return _runScene(18000, t => {
        _drawBg(); _drawParticles(pts);
        if (t > 1000) _text("🏆 Mission Complete", canvas.height*.35, 56, "#ffd700", Math.min((t-1000)/1500,1));
        while (li < lines.length && t >= lines[li][0]) { subEl.textContent = lines[li][1]; li++; }
      });
    },
  };

  async function play(name, data) {
    SceneManager.show("cutscene");
    Audio.playBgm("intro");
    if (SCENES[name]) await SCENES[name](data);
    subEl.textContent = "";
    _skipResolve = null;
    Audio.stopBgm();
  }

  return { play };
})();
