/**
 * audio.js — BGM + SFX via Web Audio API (zero external files)
 * BGM tracks: intro, victory
 * SFX: sample, click, correct, wrong, reveal, hint, xp, chapter, dialogue
 */
const Audio = (() => {
  let _ctx        = null;
  let _masterGain = null;
  let _bgmGain    = null;
  let _sfxGain    = null;
  let _bgmNodes   = [];
  let _enabled    = true;
  let _currentBgm = null;

  function _loadPref() {
    try { return localStorage.getItem("cornlab_audio") !== "off"; } catch { return true; }
  }
  function _savePref(v) {
    try { localStorage.setItem("cornlab_audio", v ? "on" : "off"); } catch {}
  }

  function _init() {
    if (_ctx) return;
    _ctx        = new (window.AudioContext || window.webkitAudioContext)();
    _masterGain = _ctx.createGain();
    _bgmGain    = _ctx.createGain();
    _sfxGain    = _ctx.createGain();
    _bgmGain.connect(_masterGain);
    _sfxGain.connect(_masterGain);
    _masterGain.connect(_ctx.destination);
    _bgmGain.gain.value    = 0.18;
    _sfxGain.gain.value    = 0.55;
    _masterGain.gain.value = _enabled ? 1 : 0;
  }

  function _stopBgm() {
    _bgmNodes.forEach(n => { try { n.stop(); } catch {} });
    _bgmNodes   = [];
    _currentBgm = null;
  }

  function _note(freq, startT, dur, gainVal = 0.12, type = "sine", dest = null) {
    dest = dest || _bgmGain;
    const o = _ctx.createOscillator();
    const g = _ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, startT);
    g.gain.linearRampToValueAtTime(gainVal, startT + 0.02);
    g.gain.setValueAtTime(gainVal, startT + dur - 0.05);
    g.gain.linearRampToValueAtTime(0, startT + dur);
    o.connect(g); g.connect(dest);
    o.start(startT);
    o.stop(startT + dur + 0.01);
    _bgmNodes.push(o);
  }

  // ── BGM: Intro / Menu — calm pastoral pentatonic ─────────────────────
  function _bgmIntro() {
    _init();
    _stopBgm();
    _currentBgm = "intro";
    const t0   = _ctx.currentTime + 0.1;
    const beat = 60 / 72;
    const loop = 16 * beat;

    const scale = [261.63, 293.66, 329.63, 392.00, 440.00,
                   523.25, 587.33, 659.25, 783.99, 880.00];

    const melody = [
      [4,0,2],[5,2,1],[4,3,1],[3,4,2],[2,6,1],[3,7,1],
      [4,8,2],[5,10,1],[6,11,1],[5,12,2],[4,14,2],
      [2,16,2],[3,18,1],[4,19,1],[5,20,2],[4,22,2],
      [3,24,2],[2,26,1],[1,27,1],[0,28,4],
    ];
    const bass = [
      [0,0,4],[2,4,4],[0,8,4],[1,12,4],
      [0,16,4],[2,20,4],[3,24,4],[0,28,4],
    ];

    function scheduleLoop(offset) {
      melody.forEach(([si,bi,dur]) =>
        _note(scale[si], t0+offset+bi*beat, dur*beat, 0.10, "sine"));
      bass.forEach(([si,bi,dur]) =>
        _note(scale[si]/2, t0+offset+bi*beat, dur*beat, 0.08, "triangle"));
    }

    for (let i = 0; i < 4; i++) scheduleLoop(i * loop);
    let lc = 4;
    const iv = setInterval(() => {
      if (_currentBgm !== "intro") { clearInterval(iv); return; }
      scheduleLoop(lc * loop); lc++;
    }, loop * 1000);
  }

  // ── BGM: Victory — C major fanfare ───────────────────────────────────
  function _bgmVictory() {
    _init();
    _stopBgm();
    _currentBgm = "victory";
    const t0   = _ctx.currentTime + 0.1;
    const beat = 60 / 100;
    const fanfare = [
      [523.25,0,.3],[659.25,.3,.3],[783.99,.6,.3],[1046.5,.9,.6],
      [880,1.5,.3],[1046.5,1.8,.3],[1174.66,2.1,.6],
      [1046.5,2.7,.2],[880,2.9,.2],[783.99,3.1,.4],
      [1046.5,3.5,1.0],
    ];
    fanfare.forEach(([f,bi,dur]) =>
      _note(f, t0+bi*beat, dur, 0.15, "sine"));
  }

  // ── SFX ──────────────────────────────────────────────────────────────
  function _sfx(type) {
    _init();
    if (!_enabled) return;
    const t = _ctx.currentTime;

    switch (type) {

      case "sample": {
        for (let i = 0; i < 12; i++) {
          const buf = _ctx.createBuffer(1, _ctx.sampleRate * 0.05, _ctx.sampleRate);
          const d   = buf.getChannelData(0);
          for (let j = 0; j < d.length; j++) d[j] = (Math.random()*2-1) * 0.4;
          const src = _ctx.createBufferSource();
          src.buffer = buf;
          const gn = _ctx.createGain();
          gn.gain.setValueAtTime(0.3, t + i*0.04);
          gn.gain.linearRampToValueAtTime(0, t + i*0.04 + 0.05);
          src.connect(gn); gn.connect(_sfxGain);
          src.start(t + i * 0.04);
        }
        break;
      }

      case "click": {
        const o = _ctx.createOscillator();
        const g = _ctx.createGain();
        o.type = "sine"; o.frequency.value = 880;
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        o.connect(g); g.connect(_sfxGain);
        o.start(t); o.stop(t + 0.09);
        break;
      }

      case "correct": {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const o = _ctx.createOscillator();
          const g = _ctx.createGain();
          o.type = "sine"; o.frequency.value = f;
          g.gain.setValueAtTime(0, t + i*0.1);
          g.gain.linearRampToValueAtTime(0.25, t + i*0.1 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + i*0.1 + 0.35);
          o.connect(g); g.connect(_sfxGain);
          o.start(t + i*0.1); o.stop(t + i*0.1 + 0.36);
        });
        break;
      }

      case "wrong": {
        [220, 196, 174.61].forEach((f, i) => {
          const o = _ctx.createOscillator();
          const g = _ctx.createGain();
          o.type = "sawtooth"; o.frequency.value = f;
          g.gain.setValueAtTime(0.2, t + i*0.12);
          g.gain.exponentialRampToValueAtTime(0.001, t + i*0.12 + 0.25);
          o.connect(g); g.connect(_sfxGain);
          o.start(t + i*0.12); o.stop(t + i*0.12 + 0.26);
        });
        break;
      }

      case "reveal": {
        const o = _ctx.createOscillator();
        const g = _ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(200, t);
        o.frequency.exponentialRampToValueAtTime(800, t + 0.6);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        o.connect(g); g.connect(_sfxGain);
        o.start(t); o.stop(t + 0.71);
        break;
      }

      case "hint": {
        [1046.5, 1318.5].forEach((f, i) => {
          const o = _ctx.createOscillator();
          const g = _ctx.createGain();
          o.type = "sine"; o.frequency.value = f;
          g.gain.setValueAtTime(0.18, t + i*0.15);
          g.gain.exponentialRampToValueAtTime(0.001, t + i*0.15 + 0.5);
          o.connect(g); g.connect(_sfxGain);
          o.start(t + i*0.15); o.stop(t + i*0.15 + 0.51);
        });
        break;
      }

      case "xp": {
        [1318.5, 1567.98, 2093].forEach((f, i) => {
          const o = _ctx.createOscillator();
          const g = _ctx.createGain();
          o.type = "sine"; o.frequency.value = f;
          g.gain.setValueAtTime(0.15, t + i*0.07);
          g.gain.exponentialRampToValueAtTime(0.001, t + i*0.07 + 0.2);
          o.connect(g); g.connect(_sfxGain);
          o.start(t + i*0.07); o.stop(t + i*0.07 + 0.21);
        });
        break;
      }

      case "chapter": {
        const buf = _ctx.createBuffer(1, _ctx.sampleRate * 0.4, _ctx.sampleRate);
        const d   = buf.getChannelData(0);
        for (let j = 0; j < d.length; j++) d[j] = (Math.random()*2-1) * (1 - j/d.length);
        const src  = _ctx.createBufferSource();
        src.buffer = buf;
        const filt = _ctx.createBiquadFilter();
        filt.type = "bandpass"; filt.frequency.value = 1200; filt.Q.value = 0.5;
        const g = _ctx.createGain();
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        src.connect(filt); filt.connect(g); g.connect(_sfxGain);
        src.start(t);
        break;
      }

      case "dialogue": {
        const o = _ctx.createOscillator();
        const g = _ctx.createGain();
        o.type = "sine";
        o.frequency.value = 440 + Math.random() * 220;
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        o.connect(g); g.connect(_sfxGain);
        o.start(t); o.stop(t + 0.05);
        break;
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────
  function playBgm(track) {
    _init();
    if (!_enabled) return;
    if (_currentBgm === track) return;
    // only intro and victory remain
    if (track === "intro")   { _bgmIntro();   return; }
    if (track === "victory") { _bgmVictory(); return; }
    // game / tension → no BGM, just stop current
    _stopBgm();
  }

  function stopBgm() { _stopBgm(); }

  function sfx(type) {
    if (!_enabled) return;
    _init();
    _sfx(type);
  }

  function setEnabled(v) {
    _enabled = v;
    _savePref(v);
    if (_ctx) _masterGain.gain.setTargetAtTime(v ? 1 : 0, _ctx.currentTime, 0.1);
    if (!v) _stopBgm();
    _updateBtn();
  }

  function toggle() { setEnabled(!_enabled); }
  function isEnabled() { return _enabled; }

  function _updateBtn() {
    const btn = document.getElementById("audio-toggle");
    if (!btn) return;
    btn.textContent = _enabled ? "🔊" : "🔇";
    btn.title       = _enabled ? "Mute audio" : "Unmute audio";
    btn.classList.toggle("muted", !_enabled);
  }

  window.addEventListener("DOMContentLoaded", () => {
    _enabled = _loadPref();
    _updateBtn();
  });

  return { playBgm, stopBgm, sfx, setEnabled, toggle, isEnabled };
})();
