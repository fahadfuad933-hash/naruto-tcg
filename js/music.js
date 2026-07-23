/* ============================================================
   NARUTO TGC — Musik-Player
   Spielt MP3-Loops aus assets/music/ (intro, menu, duel, boss).
   Fehlende Dateien werden still übersprungen, damit das Spiel
   ohne Musik-Assets läuft.
   ============================================================ */
(function (g) {
  const NT = g.NTCG;
  const DIR = 'assets/music/';
  let volume = 0.3; // Standard (leise genug für Dauerbetrieb); per Menü regelbar

  let cur = null;      // aktuelles Audio-Element
  let curName = null;
  let enabled = true;
  const missing = {};  // 404s nur einmal versuchen

  function fadeOut(a) {
    if (!a) return;
    const v0 = a.volume;
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      try { a.volume = Math.max(0, v0 * (1 - i / 8)); } catch (e) {}
      if (i >= 8) { clearInterval(t); a.pause(); a.removeAttribute('src'); }
    }, 50);
  }

  function play(name) {
    if (!enabled || !name || missing[name] || curName === name) return;
    const a = new Audio(DIR + name + '.mp3');
    a.loop = true;
    a.volume = volume;
    a.addEventListener('error', () => {
      missing[name] = true;
      if (cur === a) { cur = null; curName = null; }
    });
    const old = cur;
    cur = a; curName = name;
    fadeOut(old);
    const p = a.play();
    if (p && p.catch) p.catch(() => { // Autoplay-Blocker: beim nächsten Tap erneut versuchen
      if (cur === a) { cur = null; curName = null; }
    });
  }

  NT.Music = {
    play,
    stop() { fadeOut(cur); cur = null; curName = null; },
    setEnabled(v) { enabled = !!v; if (!enabled) this.stop(); },
    setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (cur) cur.volume = volume; },
    getVolume() { return volume; },
    current() { return curName; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
