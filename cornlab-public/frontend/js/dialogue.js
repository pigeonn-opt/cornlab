/**
 * dialogue.js — NPC dialogue system with typing animation
 */
const Dialogue = (() => {
  const NPCS = {
    farmer: { name: "Farmer John",   emoji: "👨‍🌾", color: "#81c784" },
    doctor: { name: "Dr. Smith",     emoji: "👩‍🔬", color: "#42a5f5" },
    policy: { name: "Policy Maker",  emoji: "🏛️",  color: "#ffd700" },
    system: { name: "CornLab",       emoji: "🌽",  color: "#4caf50" },
  };

  let _queue = [], _typing = null, _resolve = null;

  const box       = document.getElementById("dialogue-box");
  const portrait  = document.getElementById("dialogue-portrait");
  const nameEl    = document.getElementById("dialogue-name");
  const textEl    = document.getElementById("dialogue-text");
  const closeBtn  = document.getElementById("dialogue-close");

  closeBtn.addEventListener("click", _next);

  function _type(text, speed = 28) {
    return new Promise(res => {
      textEl.textContent = "";
      let i = 0;
      clearInterval(_typing);
      _typing = setInterval(() => {
        textEl.textContent += text[i++];
        // blip every 3 chars so it's not too rapid
        if (i % 3 === 0) Audio.sfx("dialogue");
        if (i >= text.length) { clearInterval(_typing); res(); }
      }, speed);
    });
  }

  async function _show(npc, text) {
    const cfg = NPCS[npc] || NPCS.system;
    portrait.textContent  = cfg.emoji;
    portrait.style.borderColor = cfg.color;
    nameEl.textContent    = cfg.name;
    nameEl.style.color    = cfg.color;
    box.classList.add("open");
    await _type(text);
  }

  function _next() {
    if (_queue.length) {
      const { npc, text } = _queue.shift();
      _show(npc, text).then(() => {
        if (!_queue.length && _resolve) { _resolve(); _resolve = null; }
      });
    } else {
      box.classList.remove("open");
      if (_resolve) { _resolve(); _resolve = null; }
    }
  }

  /** Play a sequence of dialogue lines and resolve when done */
  function play(lines) {
    return new Promise(res => {
      _resolve = res;
      _queue   = [...lines];
      _next();
    });
  }

  /** Single line, auto-close after ms */
  function say(npc, text, ms = 3500) {
    return new Promise(res => {
      _show(npc, text).then(() => {
        setTimeout(() => {
          box.classList.remove("open");
          res();
        }, ms);
      });
    });
  }

  return { play, say };
})();
