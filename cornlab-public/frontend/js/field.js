/**
 * field.js — 12×12 corn field renderer + heatmap reveal
 */
const Field = (() => {
  const grid = document.getElementById("field-grid");
  let _sampledIndices = new Set();
  let _revealData     = null;

  // Colour scale: low=brown, mid=green, high=bright-green
  function _yieldColor(val, min, max) {
    const t = (val - min) / (max - min);
    if (t < .33) return `hsl(30,${40+t*40}%,${25+t*20}%)`;
    if (t < .66) return `hsl(${80+t*40},${50+t*30}%,${30+t*20}%)`;
    return `hsl(120,${60+t*20}%,${40+t*20}%)`;
  }

  function render(sampledIndices = new Set()) {
    _sampledIndices = sampledIndices;
    grid.innerHTML  = "";
    for (let i = 0; i < 144; i++) {
      const el = document.createElement("div");
      el.className = "plot";
      el.dataset.i = i;

      if (_revealData) {
        const row = Math.floor(i / 12), col = i % 12;
        const val = _revealData.field[row][col];
        el.style.background = _yieldColor(val, _revealData.min, _revealData.max);
        el.title = `Plot ${i+1}: ${val.toFixed(1)} bu`;
        el.classList.add("revealed");
      } else {
        // Hidden — show soil texture
        const shade = 15 + Math.floor(Math.random() * 12);
        el.style.background = `hsl(30,25%,${shade}%)`;
      }

      if (sampledIndices.has(i)) el.classList.add("sampled");

      // Tooltip on hover
      el.addEventListener("mouseenter", e => {
        const tip = document.getElementById("tooltip");
        if (_revealData) {
          const row = Math.floor(i/12), col = i%12;
          tip.textContent = `Plot ${i+1} — Yield: ${_revealData.field[row][col].toFixed(1)} bu`;
        } else if (sampledIndices.has(i)) {
          tip.textContent = `Plot ${i+1} — Sampled ✓`;
        } else {
          tip.textContent = `Plot ${i+1} — Not yet sampled`;
        }
        tip.style.display = "block";
        tip.style.left = (e.clientX + 12) + "px";
        tip.style.top  = (e.clientY - 10) + "px";
      });
      el.addEventListener("mousemove", e => {
        const tip = document.getElementById("tooltip");
        tip.style.left = (e.clientX + 12) + "px";
        tip.style.top  = (e.clientY - 10) + "px";
      });
      el.addEventListener("mouseleave", () => {
        document.getElementById("tooltip").style.display = "none";
      });

      grid.appendChild(el);
    }
  }

  function markSampled(indices) {
    _sampledIndices = new Set(indices);
    render(_sampledIndices);
  }

  function reveal(data) {
    // data = { field: 12×12, true_mean, h0_mean }
    const flat = data.field.flat();
    _revealData = { ...data, min: Math.min(...flat), max: Math.max(...flat) };
    render(_sampledIndices);
  }

  function reset() {
    _revealData = null;
    _sampledIndices = new Set();
    render();
  }

  return { render, markSampled, reveal, reset };
})();
