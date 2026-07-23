/* ============================================================
   NARUTO TGC — Soundeffekte (WebAudio, ohne Dateien)
   ============================================================ */
(function (g) {
  const NT = (g.NTCG = g.NTCG || {});
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) {
      const AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    const c = ac();
    if (!c || !enabled) return;
    const t0 = c.currentTime + (when || 0);
    const o = c.createOscillator();
    const gn = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.015);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, when, low) {
    const c = ac();
    if (!c || !enabled) return;
    const t0 = c.currentTime + (when || 0);
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = low ? 'lowpass' : 'highpass';
    f.frequency.value = low ? 400 : 2000;
    const gn = c.createGain();
    gn.gain.value = vol || 0.15;
    src.connect(f).connect(gn).connect(c.destination);
    src.start(t0);
  }

  const SFX = {
    click:   () => tone(600, 0.06, 'square', 0.05),
    draw:    () => tone(500, 0.09, 'triangle', 0.08, 0, 750),
    summon:  () => { tone(220, 0.25, 'sawtooth', 0.1, 0, 660); tone(440, 0.3, 'triangle', 0.08, 0.08, 880); },
    set:     () => tone(300, 0.1, 'triangle', 0.07, 0, 200),
    flip:    () => tone(400, 0.15, 'square', 0.07, 0, 900),
    attack:  () => { noise(0.18, 0.14); tone(180, 0.2, 'sawtooth', 0.1, 0, 60); },
    damage:  () => { noise(0.25, 0.18, 0, true); tone(90, 0.3, 'sine', 0.18, 0, 45); },
    heal:    () => { tone(520, 0.18, 'sine', 0.09); tone(660, 0.18, 'sine', 0.09, 0.1); tone(780, 0.25, 'sine', 0.09, 0.2); },
    trap:    () => { tone(800, 0.12, 'square', 0.1, 0, 300); tone(300, 0.2, 'square', 0.08, 0.1, 150); },
    destroy: () => { noise(0.3, 0.16, 0, true); tone(150, 0.35, 'sawtooth', 0.1, 0, 50); },
    buff:    () => tone(350, 0.2, 'triangle', 0.09, 0, 700),
    win:     () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, i * 0.15)); },
    lose:    () => { [400, 350, 300, 200].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.09, i * 0.18)); },
    turn:    () => tone(700, 0.08, 'sine', 0.06, 0, 900),
    /* ygopro-Set (2026-07-23): mehr Abwechslung pro Ereignis */
    special: () => { tone(180, 0.4, 'sawtooth', 0.1, 0, 900); tone(360, 0.5, 'triangle', 0.08, 0.1, 1200); },
    direct:  () => { noise(0.22, 0.2, 0, true); tone(70, 0.28, 'sine', 0.2, 0, 40); },
    spell:   () => { tone(300, 0.3, 'triangle', 0.09, 0, 900); tone(450, 0.35, 'sine', 0.08, 0.12, 1000); },
    banish:  () => { tone(600, 0.4, 'sawtooth', 0.09, 0, 80); noise(0.3, 0.1, 0.05, true); },
    bounce:  () => tone(300, 0.18, 'triangle', 0.09, 0, 900),
    negate:  () => { tone(900, 0.1, 'square', 0.1, 0, 250); tone(250, 0.16, 'square', 0.09, 0.08, 120); },
    equip:   () => { tone(1200, 0.12, 'triangle', 0.08, 0, 1600); noise(0.06, 0.06); },
    token:   () => noise(0.25, 0.14, 0, true),
    coin:    () => { tone(1400, 0.08, 'square', 0.07); tone(1400, 0.08, 'square', 0.07, 0.12); tone(1700, 0.12, 'sine', 0.08, 0.24); },
    vs:      () => { tone(110, 0.5, 'sawtooth', 0.14, 0, 55); noise(0.35, 0.12, 0.02, true); tone(220, 0.4, 'triangle', 0.1, 0.1, 110); },
    discard: () => { noise(0.12, 0.1, 0, true); tone(240, 0.1, 'triangle', 0.06, 0, 180); },
    search:  () => { for (let i = 0; i < 5; i++) noise(0.04, 0.07, i * 0.05); },
    debuff:  () => tone(500, 0.35, 'sawtooth', 0.08, 0, 120),
  };

  /* ---------- Datei-SFX (assets/sfx/<name>.mp3) mit Synth-Fallback ---------- */
  const FILES = { click: 1, draw: 1, summon: 1, set: 1, flip: 1, attack: 1, damage: 1, heal: 1, trap: 1, destroy: 1, buff: 1, win: 1, lose: 1, turn: 1,
    special: 1, direct: 1, spell: 1, banish: 1, bounce: 1, negate: 1, equip: 1, token: 1, coin: 1, vs: 1, discard: 1, search: 1, debuff: 1 };
  const cache = {};

  function playFile(name) {
    if (!FILES[name] || !enabled) return false;
    try {
      let a = cache[name];
      if (!a) {
        a = new Audio('assets/sfx/' + name + '.mp3');
        a.preload = 'auto';
        a.onerror = () => { FILES[name] = 0; }; // Datei fehlt → dauerhaft Synth
        cache[name] = a;
      }
      a.currentTime = 0;
      a.volume = 0.85;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
      return true;
    } catch (e) { return false; }
  }

  NT.Audio = {
    play(name) {
      if (!enabled) return;
      if (playFile(name)) return;
      if (SFX[name]) { try { SFX[name](); } catch (e) {} }
    },
    unlock() {
      try { ac(); } catch (e) {}
      for (const n in FILES) { // nach erstem Tap vorladen
        try { if (!cache[n]) { cache[n] = new Audio('assets/sfx/' + n + '.mp3'); cache[n].preload = 'auto'; cache[n].onerror = () => { FILES[n] = 0; }; } } catch (e) {}
      }
    },
    setEnabled(v) { enabled = !!v; },
    isEnabled() { return enabled; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
