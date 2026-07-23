/* ============================================================
   NARUTO TGC — Duell-Bildschirm (Touch-Steuerung, Animationen)
   ============================================================ */
(function (g) {
  const NT = g.NTCG;
  const $ = (s) => document.querySelector(s);

  const D = {
    E: null, opp: null,
    busy: false,        // KI-Zug läuft / Animation
    sel: null,          // Auswahl-Modus: {mode:'attack'|'target'|'tribute', ...}
    finished: false,
    prevKeys: new Set(), // Karten-Schlüssel des letzten Renders (für Pop-in nur bei neuen Karten)
    vlog: [],           // Kampflog-Vorschau: letzte 5 Aktionen (neueste zuerst)
    vlogAll: [],        // komplette Kampflog-Historie (für Log-Modal, max. 200)
    dying: [],          // gerade zerstörte Karten (Todes-Animation über leerem Slot)
  };

  // Während render() aktiv: sammelt Karten-Schlüssel und markiert neue Karten mit .pop
  let _newKeys = null;
  function markNew(el, key) {
    if (!_newKeys) return;
    _newKeys.add(key);
    if (!D.prevKeys.has(key)) el.classList.add('pop');
  }

  /* ---------- Tempo (1×/2×/3×) & Haptics ---------- */
  // skaliert Wartezeiten (KI-Pacing, Overlays) — NICHT die CSS-Animationen selbst
  function spd(ms) { return Math.max(30, Math.round(ms / ((NT.Store.data && NT.Store.data.animSpeed) || 1))); }
  function buzz(pattern) {
    try { if (NT.Store.data && NT.Store.data.sound && navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  const PHASE_LABEL = {
    main1: () => (D.E.state.turn === 1 ? 'Hauptphase 2 ➡️' : 'Kampfphase ⚔️'),
    battle: () => 'Hauptphase 2 ➡️',
    main2: () => 'Zug beenden ✔️',
  };
  const KIND_ICON = { normal: '📜', schnell: '⚡', equip: '🗡️', falle: '🪤', dauer: '♾️' };

  /* Boss-Arenen: eigenes Feld-Design + Hintergrund hinter dem Feld.
     Trifft ein Gegner zu, gewinnt die Boss-Arena und das Shop-Theme (theme-*)
     wird für dieses Duell NICHT angewendet. Fehlt die Bild-Datei, wirkt nur
     der Farb-Teil (CSS-Gradient) — kein Fehler. */
  const BOSS_ARENA = {
    kurogane:       { img: 'assets/ui/bossbg-kurogane.jpg',   cls: 'boss-kurogane' }, // Kröten-Orange/Sumpf-Grün
    itachi:         { img: 'assets/ui/bossbg-itachi.jpg',     cls: 'boss-itachi' },   // Dunkelrot/Schwarz, Krähen (Welt-1-Boss)
    kagaa_kagaa:    { img: 'assets/story/18-direktor.jpg',    cls: 'boss-kagaa' },    // Schwarz/Gold Corp
    echo_spiegel:   { img: 'assets/story/22-echo-kern.jpg',   cls: 'boss-echo' },     // Void-Violett
    zabuza_story:   { img: 'assets/story/33-bruecke.jpg',     cls: 'boss-zabuza' },   // Nebel-Blaugrau
    gaara_story:    { img: 'assets/story/44-gaara-sturm.jpg', cls: 'boss-gaara' },    // Sand-Amber
    itachi_story:   { img: 'assets/story/45-itachi-tore.jpg', cls: 'boss-itachi2' },  // Blutrot
    kimimaro_story: { img: 'assets/story/47-kimimaro-klang.jpg', cls: 'boss-kimimaro' }, // Knochen-Weiß/Grün
    pain_story:     { img: 'assets/story/35-amegakure.jpg',   cls: 'boss-pain' },     // Stahl-Lila/Regen
    madara_story:   { img: 'assets/story/37-roter-mond.jpg',  cls: 'boss-madara' },   // Karmesin/Schwarz
  };

  /* ================= Karten-HTML ================= */
  function attrVar(id) {
    const c = NT.CARDS[id];
    const a = c.attr && NT.ATTRS[c.attr];
    // Jutsu/Falle haben kein Attribut → Kartenfarben wie in Duel Links (Jutsu türkis, Falle magenta)
    return '--attr:' + (a ? a.color : c.kind === 'falle' ? '#c2477f' : '#1f9e8f');
  }

  function miniCard(id, opts) {
    opts = opts || {};
    const c = NT.CARDS[id];
    const el = document.createElement('div');
    el.className = 'card rar-' + c.rarity + (opts.extraClass ? ' ' + opts.extraClass : '');
    el.style.cssText = attrVar(id);
    if (opts.faceDown) {
      el.classList.add('facedown');
      el.innerHTML = '<div class="c-back">🍥<img src="assets/ui/card-back.jpg" alt="" draggable="false" onerror="this.remove()"></div>';
      return el;
    }
    let html = '';
    const img = (NT.CARD_IMG || {})[id];
    html += '<div class="c-art">' +
      (img ? '<img src="' + img + '" alt="" draggable="false">' : '<span class="c-emoji">' + c.emoji + '</span>') +
      '</div>';
    if (c.kind === 'ninja') {
      html += '<span class="c-attr">' + NT.ATTRS[c.attr].icon + '</span>';
      html += '<span class="c-lvl">★' + c.level + '</span>';
      html += '<div class="c-name">' + c.name + '</div>';
      const atk = opts.atk !== undefined ? opts.atk : c.atk;
      const def = opts.def !== undefined ? opts.def : c.def;
      const atkCls = atk > c.atk ? ' style="color:#5eff8a"' : atk < c.atk ? ' style="color:#ff6b5e"' : '';
      html += '<div class="c-stats"><span class="c-atk"' + atkCls + '>' + atk + '</span><span class="c-def">' + def + '</span></div>';
    } else {
      const icon = c.kind === 'falle' ? KIND_ICON.falle : KIND_ICON[c.sub];
      html += '<span class="c-attr">' + (c.kind === 'falle' ? '🪤' : '📜') + '</span>';
      html += '<span class="c-kind">' + icon + '</span>';
      html += '<div class="c-name">' + c.name + '</div>';
    }
    el.innerHTML = html;
    return el;
  }

  function bigCard(id) {
    const c = NT.CARDS[id];
    const el = document.createElement('div');
    el.className = 'big-card rar-' + c.rarity;
    el.style.cssText = attrVar(id);
    const rar = NT.RARITY[c.rarity];
    const img = (NT.CARD_IMG || {})[id];
    let html = '<div class="b-name">' + c.name + '</div>';
    html += '<div class="b-art">' +
      (img ? '<img src="' + img + '" alt="" draggable="false">' : '<span class="b-emoji">' + c.emoji + '</span>') +
      '</div>';
    if (c.kind === 'ninja') {
      html += '<div class="b-row"><span>' + NT.ATTRS[c.attr].icon + ' ' + NT.ATTRS[c.attr].name + '</span><span>' + '★'.repeat(c.level) + '</span></div>';
      html += '<div class="b-stats"><span class="c-atk">ATK ' + c.atk + '</span><span class="c-def">DEF ' + c.def + '</span></div>';
    } else {
      const kindName = c.kind === 'falle' ? 'Fallenkarte' : c.sub === 'schnell' ? 'Schnell-Jutsu' : c.sub === 'equip' ? 'Ausrüstungs-Jutsu' : c.sub === 'dauer' ? 'Dauer-Jutsu' : 'Jutsukarte';
      html += '<div class="b-row"><span>' + kindName + '</span></div>';
    }
    html += '<div class="b-rar" style="color:' + rar.color + '">' + rar.label + '</div>';
    html += '<div class="b-desc">' + c.desc + '</div>';
    el.innerHTML = html;
    return el;
  }

  /* ================= Rendering ================= */
  function lpBar(side) {
    const p = D.E.state.players[side];
    const pct = Math.max(0, Math.min(100, (p.lp / (NT.START_LP || 8000)) * 100));
    const fill = $(side === 'P' ? '#my-lpfill' : '#opp-lpfill');
    const text = $(side === 'P' ? '#my-lptext' : '#opp-lptext');
    fill.style.width = pct + '%';
    fill.className = 'lpfill' + (pct <= 20 ? ' crit' : pct <= 45 ? ' low' : '');
    // LP-Zähler rollt zum neuen Wert
    const from = text.dataset.v !== undefined ? +text.dataset.v : p.lp;
    const to = p.lp;
    text.dataset.v = to;
    if (from === to) { text.textContent = to; return; }
    const t0 = performance.now();
    cancelAnimationFrame(text._raf);
    (function tick(now) {
      const k = Math.max(0, Math.min(1, (now - t0) / 800)); // LP-Rollen etwas ruhiger
      text.textContent = Math.round(from + (to - from) * (1 - (1 - k) * (1 - k)));
      if (k < 1) text._raf = requestAnimationFrame(tick);
    })(t0);
  }

  function slotEl(side, type, zi) {
    const slot = document.createElement('div');
    slot.className = 'slot' + (type === 'st' ? ' st-slot' : '');
    slot.dataset.side = side; slot.dataset.type = type; slot.dataset.zone = zi;
    const p = D.E.state.players[side];
    if (type === 'm') {
      const m = p.m[zi];
      if (m) {
        const faceDown = m.mode === 'defdown';
        const card = miniCard(m.id, {
          faceDown,
          atk: faceDown ? undefined : D.E.effAtk(side, zi),
          def: faceDown ? undefined : D.E.effDef(side, zi),
        });
        if (m.mode !== 'atk') card.classList.add('def');
        markNew(card, 'm' + side + zi + ':' + m.id + ':' + m.mode);
        if (side === 'P' && !faceDown && canMfxUI(zi)) card.classList.add('can-act'); // aktivierbarer Effekt leuchtet
        slot.appendChild(card);
        slot.classList.add('clickable');
        // Handler auf die KARTE (nicht den Slot): die aufrecht stehende Karte ragt
        // sichtbar über die flache Slot-Box hinaus — nur so ist die ganze Karte klickbar
        if (side === 'P' || !faceDown) attachLongPress(card, () => openSheet(m.id, []));
        card.onclick = () => onMonsterTap(side, zi);
      } else {
        slot.onclick = () => onEmptyTap(side, 'm', zi);
        // Zerstörungs-Geist: die Karte ist weg, aber ihre Todes-Animation läuft noch
        const now = Date.now();
        const gi = D.dying.findIndex((g) => g.side === side && g.zone === zi);
        if (gi >= 0) {
          const gd = D.dying[gi];
          if (now < gd.until) {
            const ghost = miniCard(gd.id, {});
            ghost.classList.add('card-dying');
            for (const cls of ['shard', 'shard s2']) {
              const sh = document.createElement('div');
              sh.className = cls;
              ghost.appendChild(sh);
            }
            slot.appendChild(ghost);
          } else D.dying.splice(gi, 1);
        }
      }
    } else {
      const s = p.st[zi];
      if (s) {
        const card = s.faceDown ? miniCard(s.id, { faceDown: true }) : miniCard(s.id);
        markNew(card, 'st' + side + zi + ':' + s.id + ':' + (s.faceDown ? 'd' : 'o'));
        if (side === 'P' && s.faceDown && canActivateSetUI(zi)) card.classList.add('can-act'); // aktivierbare Jutsu leuchtet
        slot.appendChild(card);
        slot.classList.add('clickable');
        if (side === 'P' || !s.faceDown) attachLongPress(card, () => openSheet(s.id, []));
        card.onclick = () => onSTTap(side, zi);
      }
    }
    return slot;
  }

  function render() {
    if (!D.E) return;
    _newKeys = new Set();
    const st = D.E.state;
    // Zonen
    const rows = { 'opp-st': ['A', 'st'], 'opp-mon': ['A', 'm'], 'my-mon': ['P', 'm'], 'my-st': ['P', 'st'] };
    for (const id in rows) {
      const box = document.getElementById(id);
      box.innerHTML = '';
      const [side, type] = rows[id];
      for (let zi = 0; zi < 3; zi++) box.appendChild(slotEl(side, type, zi));
    }
    // Hand (optional sortiert: Typ → Stufe → ANG; Klicks nutzen weiterhin den Engine-Index)
    const hand = $('#hand');
    hand.innerHTML = '';
    const seen = {};
    const order = st.players.P.hand.map((x, i) => ({ x, i }));
    if (NT.Store.data && NT.Store.data.handSort) {
      const KA = { ninja: 0, jutsu: 1, falle: 2 };
      order.sort((a, b) => {
        const ca = NT.CARDS[a.x.id], cb = NT.CARDS[b.x.id];
        if (KA[ca.kind] !== KA[cb.kind]) return KA[ca.kind] - KA[cb.kind];
        return (cb.level || 0) - (ca.level || 0) || (cb.atk || 0) - (ca.atk || 0) || ca.name.localeCompare(cb.name, 'de');
      });
    }
    for (const { x, i } of order) {
      const wrap = document.createElement('div');
      wrap.className = 'hand-card' + (isPlayableHint(x.id) ? ' playable' : '');
      const card = miniCard(x.id);
      const n = (seen[x.id] = (seen[x.id] || 0) + 1);
      markNew(card, 'h:' + x.id + '#' + n);
      wrap.appendChild(card);
      attachLongPress(wrap, () => showCardOnly(i)); // Long-Press: Karte groß
      wrap.onclick = () => { NT.Audio.play('click'); openHandSheet(i); };
      hand.appendChild(wrap);
    }
    // Balken & Zähler
    lpBar('P'); lpBar('A');
    $('#opp-hand').textContent = st.players.A.hand.length;
    $('#opp-fan').innerHTML = '<div class="fan-back">🍥<img src="assets/ui/card-back.jpg" alt="" draggable="false" onerror="this.remove()"></div>'.repeat(Math.min(st.players.A.hand.length, 8));
    $('#opp-deck').textContent = st.players.A.deck.length;
    $('#my-deck').textContent = st.players.P.deck.length;
    $('#opp-grave').textContent = st.players.A.grave.length;
    $('#my-grave').textContent = st.players.P.grave.length;
    renderPiles(st);
    const ob = $('#opp-banish'), mb = $('#my-banish');
    if (ob) ob.textContent = st.players.A.banished.length;
    if (mb) mb.textContent = st.players.P.banished.length;
    // Phasen
    document.querySelectorAll('#phase-chips span').forEach((sp) => {
      sp.classList.toggle('on', sp.dataset.ph === st.phase && !st.winner);
    });
    $('#turn-num').textContent = st.turn;
    $('#board-phase').textContent = st.winner ? '' :
      st.active === 'A' ? 'GEGNERISCHER ZUG' :
      ({ main1: 'HAUPTPHASE 1', battle: 'KAMPFPHASE', main2: 'HAUPTPHASE 2', draw: 'ZIEHPHASE', end: 'ENDPHASE' })[st.phase] || '';
    const btn = $('#phase-btn');
    btn.textContent = st.active === 'A' ? 'Gegner …' : (PHASE_LABEL[st.phase] ? PHASE_LABEL[st.phase]() : '…');
    btn.disabled = st.active !== 'P' || D.busy || !!st.window || !!st.winner;
    // Log
    $('#duel-log').innerHTML = st.log.slice(0, 2).map((l) => '<div>' + l + '</div>').join('');
    // Auswahl-Highlights
    applySelHighlights();
    D.prevKeys = _newKeys;
    _newKeys = null;
  }

  function isPlayableHint(id) {
    const c = NT.CARDS[id];
    if (!myTurn()) return false;
    if (c.kind === 'ninja') return canSummonUI(id);
    if (c.kind === 'falle') return canSetSTUI();
    return canSpellHandUI(c) || canSetSTUI();
  }

  /* ================= Legalitäts-Checks (Spieler) ================= */
  const st = () => D.E.state;
  const myTurn = () => st().active === 'P' && !st().window && !st().winner && !D.busy;
  const myMain = () => myTurn() && (st().phase === 'main1' || st().phase === 'main2');
  const freeM = () => st().players.P.m.indexOf(null);
  const freeST = () => st().players.P.st.indexOf(null);
  const ownMonCount = () => st().players.P.m.filter(Boolean).length;

  function canSummonUI(id) {
    if (!myMain() || st().players.P.normalSummoned) return false;
    const need = D.E.tributesNeeded(id);
    if (need === 0) return freeM() !== -1;
    return ownMonCount() >= need;
  }

  function canSetSTUI() { return myMain() && freeST() !== -1; }

  function canSpellHandUI(c) {
    if (!myTurn()) return false;
    const inMain = st().phase === 'main1' || st().phase === 'main2';
    if (c.sub !== 'schnell' && !inMain) return false;
    if (!inMain && st().phase !== 'battle') return false;
    return spellConditionsUI(c);
  }

  function spellConditionsUI(c) {
    const ef = c.effect;
    if (ef.t === 'token' || ef.t === 'sp_summon_hand' || ef.t === 'sp_summon_hand_tribe') { if (freeM() === -1) return false; }
    if (ef.costLP && st().players.P.lp <= ef.costLP) return false;
    if (ef.t === 'destroy_all_enemy' && !st().players.A.m.some(Boolean)) return false;
    if (c.sub === 'equip' && freeST() === -1) return false;
    if (c.sub === 'dauer' && freeST() === -1) return false;
    const req = D.E.targetRequirement(c);
    if (req && D.E.listTargets('P', c, req).length === 0) return false;
    return true;
  }

  function canActivateSetUI(zi) {
    const s = st().players.P.st[zi];
    if (!s || !s.faceDown || !myTurn()) return false;
    const c = NT.CARDS[s.id];
    if (c.kind === 'falle') return false;
    if (c.sub === 'schnell' && s.setTurn === st().turn) return false;
    const inMain = st().phase === 'main1' || st().phase === 'main2';
    if (c.sub !== 'schnell' && !inMain) return false;
    if (!inMain && st().phase !== 'battle') return false;
    return spellConditionsUI(c);
  }

  /* Aktivierbarer Monster-Effekt (1×/Zug, Kosten: 1 Handkarte) — spiegelt E.activateMonsterFx */
  function canMfxUI(zi) {
    if (!myMain()) return false;
    const m = st().players.P.m[zi];
    if (!m || m.mode === 'defdown') return false;
    const ef = D.E.monsterFxOf('P', zi);
    if (!ef) return false;
    if (m.effectsLocked >= st().turn || m.fxUsedTurn === st().turn) return false;
    if (st().players.P.hand.length < 1) return false;
    if (ef.t === 'bounce_enemy_per_turn' && !st().players.A.m.some(Boolean)) return false;
    if (ef.t === 'destroy_weak_per_turn') {
      const ok = st().players.A.m.some((mm, i) => mm && D.E.effAtk('A', i) <= (ef.maxAtk || 2000));
      if (!ok) return false;
    }
    return true;
  }

  /* ---------- Seiten-Rails: Deck-, Friedhofs- & Verbannt-Stapel ---------- */
  function renderPiles(st) {
    pileDeck($('#my-deckpile'), st.players.P.deck.length);
    pileDeck($('#opp-deckpile'), st.players.A.deck.length);
    pileGy($('#my-gypile'), st.players.P.grave);
    pileGy($('#opp-gypile'), st.players.A.grave);
    pileBan($('#my-banpile'), st.players.P.banished);
    pileBan($('#opp-banpile'), st.players.A.banished);
  }
  function pileDeck(el, n) {
    if (!el) return;
    el.innerHTML = n > 0
      ? '<div class="pd-back"></div><span class="pile-n">' + n + '</span>'
      : '<div class="pile-empty">🂠</div>';
  }
  function pileGy(el, grave) {
    if (!el) return;
    el.innerHTML = '';
    if (!grave.length) { el.innerHTML = '<div class="pile-empty">🪦</div>'; return; }
    el.appendChild(miniCard(grave[grave.length - 1]));
    const b = document.createElement('span');
    b.className = 'pile-n';
    b.textContent = grave.length;
    el.appendChild(b);
  }
  function pileBan(el, banished) {
    if (!el) return;
    el.innerHTML = '';
    if (!banished.length) { el.innerHTML = '<div class="pile-empty">🚫</div>'; return; }
    el.appendChild(miniCard(banished[banished.length - 1]));
    const b = document.createElement('span');
    b.className = 'pile-n';
    b.textContent = banished.length;
    el.appendChild(b);
  }

  /* Stapel-Übersicht als Modal (Friedhof/Verbannt, beide Seiten, neueste oben) */
  function showPileModal(side, kind) {
    NT.Audio.play('click');
    const ban = kind === 'banished';
    const g = st().players[side][kind];
    const body = $('#modal-body');
    body.innerHTML = '<h3>' + (ban ? '🚫 ' : '🪦 ') +
      (ban
        ? (side === 'P' ? 'Deine verbannten Karten' : 'Verbannte Karten des Gegners')
        : (side === 'P' ? 'Dein Friedhof' : 'Gegner-Friedhof')) +
      ' (' + g.length + ')</h3>';
    if (!g.length) {
      const e = document.createElement('div');
      e.className = 'gy-empty';
      e.textContent = 'Noch keine Karten hier.';
      body.appendChild(e);
    } else {
      const grid = document.createElement('div');
      grid.className = 'gy-grid';
      g.slice().reverse().forEach((id) => {
        const cell = document.createElement('button');
        cell.className = 'gy-cell';
        cell.appendChild(miniCard(id));
        const nm = document.createElement('small');
        nm.textContent = cardName(id);
        cell.appendChild(nm);
        cell.onclick = () => { NT.Audio.play('click'); NT.CardView.show(id); };
        grid.appendChild(cell);
      });
      body.appendChild(grid);
    }
    const close = document.createElement('button');
    close.className = 'btn gy-close';
    close.textContent = 'Schließen';
    close.onclick = () => { NT.Audio.play('click'); closeModal(); };
    body.appendChild(close);
    $('#modal').classList.remove('hidden');
  }
  function showGyModal(side) { showPileModal(side, 'grave'); }
  function showBanModal(side) { showPileModal(side, 'banished'); }

  /* ================= Aktionen mit Fehler-Toast ================= */
  function doEngine(fn) {
    try { fn(); return true; }
    catch (e) { toast(e.message); return false; }
  }

  function continueFlow() {
    render();
    if (checkWin()) return; // Sieg kann durch eine Fenster-Auflösung (Falle) entstanden sein
    if (st().winner || st().window) return;
    if (st().active === 'A' && !D.busy) runAiTurn();
  }

  function afterAction() {
    render();
    if (checkWin()) return;
    if (st().window) { handleWindow(continueFlow); return; }
    continueFlow();
  }

  /* ================= Hand-Aktionsmenü ================= */
  function openHandSheet(handIdx) {
    if (!myTurn() && !st().window) { showCardOnly(handIdx); return; }
    if (D.busy || st().window) return;
    const x = st().players.P.hand[handIdx];
    if (!x) return;
    const c = NT.CARDS[x.id];
    const actions = [];
    if (c.kind === 'ninja') {
      const need = D.E.tributesNeeded(x.id);
      const label = need > 0 ? ' (' + need + ' Tribut' + (need > 1 ? 'e' : '') + ')' : '';
      actions.push({
        label: '⭐ Beschwören' + label, ok: canSummonUI(x.id),
        fn: () => startSummon(handIdx, false),
      });
      actions.push({
        label: '🛡️ Verdeckt setzen' + label, ok: canSummonUI(x.id),
        fn: () => startSummon(handIdx, true),
      });
      if ((c.effects || []).some((e) => e.t === 'cyber_summon')) {
        // Cyber-Dragon-Bedingung: eigenes Feld leer, Gegner hat Ninja
        const cyberOk = myMain() && !st().players.P.m.some(Boolean) && st().players.A.m.some(Boolean) && freeM() >= 0;
        actions.push({
          label: '⚡ Spezial-Beschwörung (Bedingung)', ok: cyberOk,
          fn: () => { if (doEngine(() => D.E.cyberSummon('P', handIdx, freeM()))) afterAction(); },
        });
      }
    } else if (c.kind === 'jutsu') {
      actions.push({
        label: '✨ Aktivieren', ok: canSpellHandUI(c),
        fn: () => startSpell({ from: 'hand', handIdx }),
      });
      actions.push({ label: '⬇️ Setzen', ok: canSetSTUI(), fn: () => doEngine(() => D.E.setST('P', handIdx, freeST())) && afterAction() });
    } else if (c.kind === 'falle') {
      actions.push({ label: '🪤 Setzen', ok: canSetSTUI(), fn: () => doEngine(() => D.E.setST('P', handIdx, freeST())) && afterAction() });
    }
    openSheet(x.id, actions);
  }

  function showCardOnly(handIdx) {
    const x = st().players.P.hand[handIdx];
    if (x) openSheet(x.id, []);
  }

  function openSheet(id, actions) {
    const box = $('#sheet-card');
    box.innerHTML = '';
    box.appendChild(bigCard(id));
    const act = $('#sheet-actions');
    act.innerHTML = '';
    for (const a of actions) {
      const b = document.createElement('button');
      b.className = 'btn' + (a.ok ? ' btn-primary' : '');
      b.disabled = !a.ok;
      b.textContent = a.label;
      b.onclick = () => { closeSheet(); NT.Audio.play('click'); a.fn(); };
      act.appendChild(b);
    }
    $('#sheet').classList.remove('hidden');
  }

  function closeSheet() { $('#sheet').classList.add('hidden'); }

  /* ================= Beschwörung (mit Tribut-Wahl) ================= */
  function startSummon(handIdx, faceDown) {
    const id = st().players.P.hand[handIdx].id;
    const need = D.E.tributesNeeded(id);
    if (need === 0) {
      if (doEngine(() => D.E.summon('P', handIdx, freeM(), { faceDown }))) afterAction();
      return;
    }
    D.sel = { mode: 'tribute', handIdx, faceDown, need, chosen: [] };
    const tt = NT.cardOf(id).tribeTribute;
    const req = tt ? ' (nur ' + (NT.TRIBE_NAMES[tt] || tt) + ')' : '';
    showBanner('Wähle ' + need + ' Tribut' + (need > 1 ? 'e' : '') + req, true);
    render();
  }

  /* ================= Jutsu mit Zielwahl ================= */
  function startSpell(src) {
    const card = src.from === 'hand' ? NT.CARDS[st().players.P.hand[src.handIdx].id] : NT.CARDS[st().players.P.st[src.zone].id];
    const req = D.E.targetRequirement(card);
    if (!req) {
      const ok = doEngine(() => src.from === 'hand' ? D.E.activateSpell('P', src.handIdx) : D.E.activateSet('P', src.zone));
      if (ok) afterAction();
      return;
    }
    if (req === 'handNinja' || req === 'handTribe') { showHandNinjaModal(src, card); return; }
    D.sel = { mode: 'target', src, card, req };
    const txt = { ownMonster: 'Wähle dein Ninja', enemyMonster: 'Wähle ein gegnerisches Ninja', enemyST: 'Wähle eine gegnerische Karte',
      anyMonster: 'Wähle ein beliebiges offenes Ninja', swapPair: 'Wähle DEIN Ninja zum Tauschen' }[req];
    showBanner(txt, false);
    render();
  }

  function castWithTarget(targetZone, selectHandIdx, extra) {
    const src = D.sel ? D.sel.src : null;
    if (!src) return;
    const opts = {};
    if (targetZone !== undefined) opts.targetZone = targetZone;
    if (selectHandIdx !== undefined) opts.selectHandIdx = selectHandIdx;
    if (extra) Object.assign(opts, extra);
    clearSel();
    const ok = doEngine(() => src.from === 'hand' ? D.E.activateSpell('P', src.handIdx, opts) : D.E.activateSet('P', src.zone, opts));
    if (ok) afterAction(); else render();
  }

  function showHandNinjaModal(src, card) {
    const req = D.E.targetRequirement(card);
    const valid = D.E.listTargets('P', card, req);
    const body = $('#modal-body');
    body.innerHTML = '<h3>' + card.emoji + ' ' + card.name + '</h3><p>Wähle ein Ninja aus deiner Hand:</p>';
    valid.forEach((hi) => {
      const c = NT.CARDS[st().players.P.hand[hi].id];
      const b = document.createElement('button');
      b.className = 'btn trap-choice';
      b.innerHTML = '<span class="t-emoji">' + c.emoji + '</span><span><b>' + c.name + '</b><small>★' + c.level + ' · ATK ' + c.atk + ' / DEF ' + c.def + '</small></span>';
      b.onclick = () => { closeModal(); NT.Audio.play('click'); D.sel = { src }; castWithTarget(undefined, hi); };
      body.appendChild(b);
    });
    const cancel = document.createElement('button');
    cancel.className = 'btn';
    cancel.textContent = 'Abbrechen';
    cancel.onclick = () => closeModal();
    body.appendChild(cancel);
    $('#modal').classList.remove('hidden');
  }

  /* ================= Tippen aufs Feld ================= */
  function onMonsterTap(side, zi) {
    if (D.sel) {
      if (D.sel.mode === 'tribute' && side === 'P') { toggleTribute(zi); return; }
      if (D.sel.mode === 'attack' && side === 'A') { playerAttack(zi); return; }
      if (D.sel.mode === 'target') {
        const req = D.sel.req;
        if ((req === 'ownMonster' && side === 'P') || (req === 'enemyMonster' && side === 'A')) {
          if (D.E.listTargets('P', D.sel.card, req).includes(zi)) castWithTarget(zi);
          return;
        }
        if (req === 'anyMonster') { // kodiert: eigene 0–2, gegnerische 3–5
          const enc = (side === 'P' ? 0 : 3) + zi;
          if (D.E.listTargets('P', D.sel.card, req).includes(enc)) castWithTarget(enc);
          return;
        }
        if (req === 'swapPair') {
          if (side === 'P' && D.sel.swapOwn === undefined) {
            if (st().players.P.m[zi]) {
              D.sel.swapOwn = zi;
              showBanner('Wähle das GEGNERISCHE Ninja zum Tauschen', false);
              render();
            }
            return;
          }
          if (side === 'A' && D.sel.swapOwn !== undefined) {
            if (st().players.A.m[zi]) castWithTarget(zi, undefined, { ownZone: D.sel.swapOwn });
            return;
          }
          return;
        }
      }
    }
    if (side === 'P') openMonsterSheet(zi);
    else showEnemyMonster(zi);
  }

  function onEmptyTap() { /* nichts */ }

  function onSTTap(side, zi) {
    if (D.sel && D.sel.mode === 'target' && D.sel.req === 'enemyST' && side === 'A') {
      if (D.E.listTargets('P', D.sel.card, 'enemyST').includes(zi)) castWithTarget(zi);
      return;
    }
    const s = st().players[side].st[zi];
    if (!s) return;
    if (side === 'A') {
      if (s.faceDown) { toast('Verdeckte Karte des Gegners'); return; }
      openSheet(s.id, []);
      return;
    }
    // eigene ST-Zone
    const c = NT.CARDS[s.id];
    if (!s.faceDown) { openSheet(s.id, []); return; }
    const actions = [];
    if (c.kind === 'jutsu') {
      actions.push({ label: '✨ Aktivieren', ok: canActivateSetUI(zi), fn: () => startSpell({ from: 'st', zone: zi }) });
      actions.push({ label: '👁️ Nur ansehen', ok: true, fn: () => {} });
    } else {
      actions.push({ label: '🪤 Falle — wartet auf ihren Auslöser', ok: true, fn: () => {} });
    }
    openSheet(s.id, actions);
  }

  function showEnemyMonster(zi) {
    const m = st().players.A.m[zi];
    if (!m) return;
    if (m.mode === 'defdown') { toast('Verdecktes Ninja — greife an, um es aufzudecken!'); return; }
    openSheet(m.id, []);
  }

  /* ================= Eigenes Ninja-Menü ================= */
  function openMonsterSheet(zi) {
    const m = st().players.P.m[zi];
    if (!m) return;
    if (!myTurn()) {
      if (m.mode === 'defdown') { toast('Verdeckt — nur du kennst dieses Ninja.'); return; }
      openSheet(m.id, []);
      return;
    }
    const c = NT.CARDS[m.id];
    const actions = [];
    if (st().phase === 'battle' && m.mode === 'atk' && D.E.canAttack('P', zi)) {
      actions.push({
        label: '⚔️ Angreifen', ok: true,
        fn: () => {
          if (!st().players.A.m.some(Boolean)) {
            // Kein gegnerisches Ninja auf dem Feld → sofort Direktangriff (ohne Bestätigung)
            if (doEngine(() => D.E.declareAttack('P', zi, -1))) afterAction(); else render();
            return;
          }
          D.sel = { mode: 'attack', zone: zi };
          showBanner('Wähle das Angriffsziel', false);
          render();
        },
      });
    }
    if (myMain()) {
      if (m.mode === 'defdown' && m.summonedTurn !== st().turn) {
        actions.push({ label: '🌟 Flip-Beschwörung', ok: true, fn: () => doEngine(() => D.E.flipSummon('P', zi)) && afterAction() });
      }
      if (m.mode !== 'defdown' && m.summonedTurn !== st().turn && !m.posChanged) {
        const lbl = m.mode === 'atk' ? '🛡️ In Verteidigung' : '⚔️ In Angriffsposition';
        actions.push({ label: lbl, ok: true, fn: () => doEngine(() => D.E.changePos('P', zi)) && afterAction() });
      }
      // Aktivierbarer Monster-Effekt (1×/Zug, Kosten 1 Handkarte)
      const mfx = D.E.monsterFxOf ? D.E.monsterFxOf('P', zi) : null;
      if (mfx) {
        const fxOk = m.fxUsedTurn !== st().turn && st().players.P.hand.length >= 1 &&
          (m.effectsLocked || 0) < st().turn && st().players.A.m.some(Boolean);
        const fxLabel = mfx.t === 'destroy_weak_per_turn'
          ? '🔥 Effekt: Zerstören (≤' + (mfx.maxAtk || 2000) + ' ANG, 1 Handkarte)'
          : '💨 Effekt: Rückwurf (1 Handkarte)';
        actions.push({
          label: fxLabel, ok: fxOk,
          fn: () => { if (doEngine(() => D.E.activateMonsterFx('P', zi))) afterAction(); },
        });
      }
    }
    openSheet(m.id, actions);
  }

  function playerAttack(target) {
    const zone = D.sel.zone;
    clearSel();
    if (doEngine(() => D.E.declareAttack('P', zone, target))) afterAction(); else render();
  }

  function toggleTribute(zi) {
    const ch = D.sel.chosen;
    const i = ch.indexOf(zi);
    if (i >= 0) ch.splice(i, 1);
    else if (ch.length < D.sel.need) ch.push(zi);
    NT.Audio.play('click');
    render();
    $('#sel-ok').disabled = ch.length !== D.sel.need;
  }

  /* ================= Auswahl-Banner / Highlights ================= */
  function showBanner(text, okLabel) {
    $('#sel-text').textContent = text;
    const ok = $('#sel-ok');
    if (okLabel) { ok.classList.remove('hidden'); ok.textContent = okLabel === true ? 'OK' : okLabel; ok.disabled = okLabel === true; }
    else ok.classList.add('hidden');
    $('#sel-banner').classList.remove('hidden');
  }

  function clearSel() {
    D.sel = null;
    $('#sel-banner').classList.add('hidden');
  }

  function applySelHighlights() {
    if (!D.sel) return;
    document.querySelectorAll('.slot').forEach((slot) => {
      const side = slot.dataset.side, type = slot.dataset.type, zi = +slot.dataset.zone;
      if (D.sel.mode === 'tribute' && side === 'P' && type === 'm' && st().players.P.m[zi]) {
        slot.classList.add('hl-tribute');
        if (D.sel.chosen.includes(zi)) slot.classList.add('sel');
      } else if (D.sel.mode === 'attack' && side === 'A' && type === 'm' && st().players.A.m[zi]) {
        slot.classList.add('hl-attack');
        // Elementvorteil anzeigen: Ziel wird vom Angreifer-Chakra geschlagen
        const tm = st().players.A.m[zi];
        if (tm.mode !== 'defdown' && D.E.attrBonus('P', D.sel.zone, 'A', zi) > 0) slot.classList.add('hl-elem');
        // Schadens-Vorschau: prognostiziertes Kampfergebnis als Badge am Ziel
        const pv = attackPreview(zi);
        if (pv) {
          const b = document.createElement('div');
          b.className = 'atk-preview ' + pv.cls;
          b.textContent = pv.txt;
          slot.appendChild(b);
        }
      } else if (D.sel.mode === 'target') {
        const req = D.sel.req;
        if (req === 'anyMonster' && type === 'm') {
          const enc = (side === 'P' ? 0 : 3) + zi;
          if (D.E.listTargets('P', D.sel.card, req).includes(enc)) slot.classList.add('hl-target');
        } else if (req === 'swapPair' && type === 'm') {
          // erst eigenes Ninja wählen, dann gegnerisches
          if (D.sel.swapOwn === undefined && side === 'P' && st().players.P.m[zi]) slot.classList.add('hl-target');
          else if (D.sel.swapOwn !== undefined && side === 'A' && st().players.A.m[zi]) slot.classList.add('hl-target');
        } else {
          const match =
            (req === 'ownMonster' && side === 'P' && type === 'm') ||
            (req === 'enemyMonster' && side === 'A' && type === 'm') ||
            (req === 'enemyST' && side === 'A' && type === 'st');
          if (match && D.E.listTargets('P', D.sel.card, req).includes(zi)) slot.classList.add('hl-target');
        }
      }
    });
  }

  /* Schadens-Vorschau: was passiert, wenn der gewählte Angreifer Ziel zi attackiert?
     Spiegelt die resolveAttack-Regeln der Engine (inkl. Element-Bonus + Durchdringung). */
  function attackPreview(zi) {
    const tm = st().players.A.m[zi];
    if (!tm || !D.sel || D.sel.mode !== 'attack') return null;
    const atk = D.E.effAtk('P', D.sel.zone) + D.E.attrBonus('P', D.sel.zone, 'A', zi);
    if (tm.mode === 'defdown') return { txt: '🎴 ?', cls: 'unk' }; // verdeckt: Stats unbekannt
    if (tm.mode === 'atk') {
      const diff = atk - D.E.effAtk('A', zi);
      if (diff > 0) return { txt: '💥 +' + diff, cls: 'good' };  // Ziel weg + Schaden
      if (diff === 0) return { txt: '💀 0', cls: 'mid' };         // beide weg
      return { txt: '⚠️ ' + diff, cls: 'bad' };                   // eigener Ninja weg
    }
    const diff = atk - D.E.effDef('A', zi); // defup
    if (diff > 0) return D.E.isPiercing('P', D.sel.zone) ? { txt: '💥🗡 +' + diff, cls: 'good' } : { txt: '💥', cls: 'good' };
    if (diff === 0) return { txt: '➖', cls: 'mid' };
    return { txt: '⚠️ ' + diff, cls: 'bad' }; // Angriff prallt ab, du kassierst
  }

  /* ================= Phasen-Button ================= */
  function onPhaseBtn() {
    if (!myTurn()) return;
    NT.Audio.play('click');
    clearSel();
    if (doEngine(() => D.E.advance())) afterAction();
  }

  /* ================= Fenster (Falle / Abwurf / Auswahl) ================= */
  function handleWindow(cb) {
    const w = st().window;
    if (!w || st().winner) { cb(); return; }
    render();
    if (w.kind === 'discard') {
      if (w.side === 'P') { showDiscardModal(cb); return; }
      D.E.respondDiscard(NT.AI.chooseDiscard(D.E, 'A'));
      render();
      setTimeout(() => handleWindow(cb), spd(640));
      return;
    }
    if (w.kind === 'pick') { // Auswahl aus Friedhof/Deck
      if (w.side === 'P') { showPickModal(cb); return; }
      D.E.respondPick(NT.AI.respondPick(D.E, 'A'));
      render();
      setTimeout(() => handleWindow(cb), spd(1200));
      return;
    }
    if (w.kind === 'hand') { // Hand-Falle (Kuriboh-Stil)
      if (w.side === 'P') { showHandModal(cb); return; }
      const hi = NT.AI.respondHand(D.E, 'A', D.opp.difficulty);
      D.E.respondHand(hi);
      render();
      setTimeout(() => handleWindow(cb), spd(960));
      return;
    }
    // Fallen-Fenster
    if (w.side === 'P') { showTrapModal(cb); return; }
    const z = NT.AI.respondTrap(D.E, 'A', D.opp.difficulty);
    if (z !== null && z !== undefined) {
      D.E.respond(z);
      render();
      setTimeout(() => handleWindow(cb), spd(1200));
    } else {
      D.E.respond(null);
      render();
      setTimeout(cb, spd(400));
    }
  }

  function showTrapModal(cb) {
    const w = st().window;
    const valid = D.E.validTraps('P', w.reason, w.ctx);
    const body = $('#modal-body');
    const reasonText = w.reason === 'attack' ? 'Der Gegner greift an!'
      : w.reason === 'jutsu' ? 'Der Gegner aktiviert ein Jutsu — kontern?'
      : 'Der Gegner hat beschworen!';
    body.innerHTML = '<h3>🪤 Falle aktivieren?</h3><p>' + reasonText + '</p>';
    valid.forEach((zi) => {
      const s = st().players.P.st[zi];
      const c = NT.CARDS[s.id];
      const b = document.createElement('button');
      b.className = 'btn trap-choice';
      b.innerHTML = '<span class="t-emoji">' + c.emoji + '</span><span><b>' + c.name + '</b><small>' + c.desc + '</small></span>';
      b.onclick = () => {
        closeModal();
        NT.Audio.play('trap');
        doEngine(() => D.E.respond(zi));
        afterWindowStep(cb);
      };
      body.appendChild(b);
    });
    const pass = document.createElement('button');
    pass.className = 'btn';
    pass.textContent = 'Nicht aktivieren';
    pass.onclick = () => {
      closeModal();
      doEngine(() => D.E.respond(null));
      afterWindowStep(cb);
    };
    body.appendChild(pass);
    $('#modal').classList.remove('hidden');
  }

  function showHandModal(cb) {
    const w = st().window;
    const body = $('#modal-body');
    body.innerHTML = '<h3>🛡️ Hand-Falle einsetzen?</h3><p>Der Gegner greift an — eine Karte aus deiner Hand kann jetzt wirken:</p>';
    w.idxs.forEach((hi) => {
      const x = st().players.P.hand[hi];
      const c = NT.CARDS[x.id];
      const b = document.createElement('button');
      b.className = 'btn trap-choice';
      b.innerHTML = '<span class="t-emoji">' + c.emoji + '</span><span><b>' + c.name + '</b><small>' + c.desc + '</small></span>';
      b.onclick = () => {
        closeModal();
        NT.Audio.play('trap');
        doEngine(() => D.E.respondHand(hi));
        afterWindowStep(cb);
      };
      body.appendChild(b);
    });
    const pass = document.createElement('button');
    pass.className = 'btn';
    pass.textContent = 'Nicht einsetzen';
    pass.onclick = () => {
      closeModal();
      doEngine(() => D.E.respondHand(null));
      afterWindowStep(cb);
    };
    body.appendChild(pass);
    $('#modal').classList.remove('hidden');
  }

  function afterWindowStep(cb) {
    render();
    if (checkWin()) return;
    if (st().window && st().window.side === 'P') { handleWindow(cb); return; }
    cb();
  }

  function showDiscardModal(cb) {
    const w = st().window;
    const body = $('#modal-body');
    body.innerHTML = '<h3>✋ Karten abwerfen</h3><p>Noch ' + w.count + ' Karte(n) abwerfen (max. 6 auf der Hand):</p>';
    st().players.P.hand.forEach((x, hi) => {
      const c = NT.CARDS[x.id];
      const b = document.createElement('button');
      b.className = 'btn trap-choice';
      b.innerHTML = '<span class="t-emoji">' + c.emoji + '</span><span><b>' + c.name + '</b><small>' +
        (c.kind === 'ninja' ? '★' + c.level + ' · ATK ' + c.atk : c.desc) + '</small></span>';
      b.onclick = () => {
        NT.Audio.play('click');
        doEngine(() => D.E.respondDiscard(hi));
        if (st().window) { showDiscardModal(cb); render(); }
        else { closeModal(); cb(); }
      };
      body.appendChild(b);
    });
    $('#modal').classList.remove('hidden');
  }

  function showPickModal(cb) {
    const w = st().window;
    const body = $('#modal-body');
    body.innerHTML = '<h3>🔍 ' + (w.why || 'Karte wählen') + '</h3><p>' +
      (w.from === 'grave' ? 'Aus deinem Friedhof:' : 'Aus deinem Deck:') + '</p>';
    w.pool.slice().sort((a, b) => {
      const ca = NT.CARDS[a], cb2 = NT.CARDS[b];
      return (cb2.atk || 0) - (ca.atk || 0) || a.localeCompare(b);
    }).forEach((id) => {
      const c = NT.CARDS[id];
      const b = document.createElement('button');
      b.className = 'btn trap-choice';
      b.innerHTML = '<span class="t-emoji">' + c.emoji + '</span><span><b>' + c.name + '</b><small>' +
        (c.kind === 'ninja' ? '★' + c.level + ' · ATK ' + c.atk + ' / DEF ' + c.def : c.desc) + '</small></span>';
      b.onclick = () => {
        closeModal();
        NT.Audio.play('click');
        doEngine(() => D.E.respondPick(id));
        afterWindowStep(cb);
      };
      body.appendChild(b);
    });
    $('#modal').classList.remove('hidden');
  }

  function closeModal() { $('#modal').classList.add('hidden'); }

  /* ================= KI-Zug ================= */
  function runAiTurn() {
    if (D.busy) return;
    D.busy = true;
    clearSel();
    render();
    const gen = NT.AI.turn(D.E, 'A', D.opp.difficulty);
    const step = () => {
      if (checkWin()) return;
      if (st().window) { handleWindow(() => setTimeout(step, spd(560))); return; }
      let r;
      try { r = gen.next(); }
      catch (e) { console.error(e); endAiTurn(); return; }
      render();
      if (r.done) { endAiTurn(); return; }
      setTimeout(step, spd(1120));
    };
    const endAiTurn = () => {
      D.busy = false;
      render();
      checkWin();
    };
    setTimeout(step, spd(1280));
  }

  /* ================= Ende / Ergebnis ================= */
  function checkWin() {
    if (!st().winner || D.finished) return false;
    D.finished = true;
    D.busy = false;
    clearSel();
    render();
    const win = st().winner === 'P';
    NT.Audio.play(win ? 'win' : 'lose');
    buzz(win ? [50, 60, 120] : 150);
    const reasonText = { lp: 'Die LP des Gegners sind auf 0!', deckout: 'Das gegnerische Deck ist leer!', surrender: 'Aufgegeben.' };
    // Ryo-Auszahlung: Sieg skaliert mit Schwierigkeit (Boss ×1.5, Erst-Sieg ×1.5), Niederlage klein
    const diff = D.opp.difficulty || 3;
    const ryo = win
      ? Math.round((60 + 30 * diff) * (D.opp.boss ? 1.5 : 1) * (NT.Store.wins(D.opp.id) === 0 ? 1.5 : 1) / 5) * 5
      : Math.round((20 + 10 * diff) / 5) * 5;
    NT.Store.addRyo(ryo); // gespeichert mit recordWin/recordLoss
    let rewardHtml = '<div class="reward-box ryo-box">💰 <b>+' + ryo + ' Ryo</b>' +
      (win ? '' : ' — Siege geben deutlich mehr!') + '</div>';
    if (win) {
      const firstWin = NT.Store.wins(D.opp.id) === 0;
      // Beute: pro Raritäts-Stufe 1 Roll über dem Farm-Pool (einzigartige Karten
      // des gegnerischen Decks). N ist sicher, R 50 %, SR 5 %, UR 2 % —
      // der Erst-Sieg boostet die Chancen (R 80 % · SR 30 % · UR 10 %), garantiert aber nichts.
      const pool = NT.farmPool(D.opp);
      const rates = firstWin ? { UR: 0.10, SR: 0.30, R: 0.80, N: 1 } : { UR: 0.02, SR: 0.05, R: 0.50, N: 1 };
      const cards = {}, names = [];
      for (const r of ['UR', 'SR', 'R', 'N']) {
        if (!pool[r].length || Math.random() >= rates[r]) continue;
        const id = pool[r][Math.floor(Math.random() * pool[r].length)];
        cards[id] = 1;
        names.push(NT.CARDS[id].name + ' <b style="color:' + NT.RARITY[r].color + '">' + r + '</b>');
      }
      NT.Store.recordWin(D.opp.id, Object.keys(cards).length ? cards : null);
      rewardHtml += '<div class="reward-box">🎁 <b>Beute aus dem gegnerischen Deck:</b><br>' +
        (names.length ? names.join('<br>') : '<i>Keine Karte erbeutet — das Chakra verfliegt.</i>') +
        (firstWin ? '<br><small>Erster Sieg: Drop-Chancen waren erhöht!</small>' : '') +
        (!D.opp.farm && !D.opts.onEnd && firstWin ? '<br>🆕 Neuer Gegner freigeschaltet!' : '') + '</div>';
    } else {
      NT.Store.recordLoss(D.opp.id);
    }
    // Erfolge prüfen (nach Sieg wie Niederlage) — neue werden als Toast + im Ergebnis-Modal gezeigt
    const newAch = NT.Store.checkAchievements ? NT.Store.checkAchievements() : [];
    if (newAch.length) {
      rewardHtml += '<div class="reward-box ach-box">🏆 <b>Erfolg' + (newAch.length > 1 ? 'e' : '') + ' freigeschaltet:</b><br>' +
        newAch.map((x) => x.ach.name + ' → +' + NT.CARDS[x.cardId].name + ' (' + x.ach.rarity + ')').join('<br>') + '</div>';
      setTimeout(() => toast('🏆 ' + newAch[0].ach.name + ' → +' + NT.CARDS[newAch[0].cardId].name), spd(1440));
    }
    const body = $('#modal-body');
    body.innerHTML =
      '<div class="result-banner"><img src="assets/ui/' + (win ? 'win' : 'lose') + '-banner.jpg" alt="" draggable="false" onerror="this.remove()">' +
      '<div class="result-emoji">' + (win ? '🏆' : '💀') + '</div></div>' +
      '<div class="result-title ' + (win ? 'win' : 'lose') + '">' + (win ? 'SIEG!' : 'NIEDERLAGE') + '</div>' +
      '<p>' + (reasonText[st().winReason] || '') + '</p>' + rewardHtml;
    const again = document.createElement('button');
    again.className = 'btn btn-primary';
    again.textContent = '🔄 Revanche';
    again.onclick = () => { closeModal(); NT.Duel.start(D.opp, D.opts); };
    const back = document.createElement('button');
    back.className = 'btn';
    back.textContent = D.opts.backLabel || '⬅️ Zurück zur Gegnerwahl';
    back.onclick = () => {
      closeModal(); NT.Duel.leave();
      if (D.opts.onEnd) D.opts.onEnd(win);
      else NT.Main.showSelect();
    };
    body.appendChild(again);
    body.appendChild(back);
    const logBtn = document.createElement('button');
    logBtn.className = 'btn';
    logBtn.textContent = '📄 Log exportieren';
    logBtn.onclick = exportLog;
    body.appendChild(logBtn);
    setTimeout(() => $('#modal').classList.remove('hidden'), spd(960));
    return true;
  }

  /* ================= Events → Animation & Sound ================= */
  function floater(targetEl, text, cls) {
    if (!targetEl) return;
    const r = targetEl.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'floater ' + cls;
    f.textContent = text;
    f.style.left = (r.left + r.width / 2 - 20) + 'px';
    f.style.top = (r.top - 6) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1600); // float-up läuft jetzt 1.5s
  }

  /* ---------- Long-Press → Karte groß anzeigen ---------- */
  /* Long-Press (Touch & Maus, 480 ms) ruft fn; der nachfolgende Tap/Klick wird
     unterdrückt, damit nicht zusätzlich die normale Aktion auslöst. */
  function attachLongPress(el, fn) {
    let t = null, sx = 0, sy = 0, fired = false;
    const start = (x, y) => {
      sx = x; sy = y; fired = false;
      t = setTimeout(() => {
        t = null; fired = true;
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
        NT.Audio.play('click');
        fn();
      }, 480);
    };
    const move = (x, y) => { if (t && (Math.abs(x - sx) > 10 || Math.abs(y - sy) > 10)) { clearTimeout(t); t = null; } };
    const end = () => { if (t) { clearTimeout(t); t = null; } };
    el.addEventListener('touchstart', (e) => start(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    el.addEventListener('touchmove', (e) => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    el.addEventListener('mousedown', (e) => start(e.clientX, e.clientY));
    el.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    el.addEventListener('mouseup', end);
    // Capture: frisst den Klick direkt nach einem ausgelösten Long-Press
    el.addEventListener('click', (e) => { if (fired) { fired = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }

  /* FX-Overlay auf einem Slot (Slash/Explosion/Portal/Blitz) */
  function fxSpawn(slot, cls, ms) {
    if (!slot) return;
    const f = document.createElement('div');
    f.className = cls;
    slot.appendChild(f);
    setTimeout(() => f.remove(), ms || 830);
  }
  /* Projektil von Element A nach Element B (Direktangriff) */
  function fxShot(from, to) {
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'fx-shot';
    f.style.setProperty('--x0', (a.left + a.width / 2) + 'px');
    f.style.setProperty('--y0', (a.top + a.height / 2) + 'px');
    f.style.setProperty('--x1', (b.left + b.width / 2) + 'px');
    f.style.setProperty('--y1', (b.top + b.height / 2) + 'px');
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 900); // shot-fly läuft jetzt 0.72s
  }
  /* kurze Klasse auf ein Element legen (Shake/Flash), retriggerbar */
  function fxPulse(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms || 800);
  }

  /* Zieh-Animation: Kartenrücken fliegt vom Deck-Stapel in die Hand */
  function fxDraw(side) {
    const from = side === 'P' ? $('#my-deckpile') : $('#opp-deckpile');
    const to = side === 'P' ? $('#hand') : $('#opp-fan');
    if (!from || !to) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'fx-drawcard';
    el.innerHTML = '<div class="c-back">🍥<img src="assets/ui/card-back.jpg" alt="" draggable="false" onerror="this.remove()"></div>';
    el.style.left = (a.left + a.width / 2) + 'px';
    el.style.top = (a.top + a.height / 2) + 'px';
    el.style.setProperty('--dx', (b.left + b.width / 2 - (a.left + a.width / 2)) + 'px');
    el.style.setProperty('--dy', (b.top + b.height / 2 - (a.top + a.height / 2)) + 'px');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), spd(1120));
  }

  /* Angriffs-Pfeil (ygopro): Strahl vom Angreifer zum Ziel */
  function fxArrow(from, to) {
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    const dx = (b.left + b.width / 2) - x0, dy = (b.top + b.height / 2) - y0;
    const el = document.createElement('div');
    el.className = 'fx-arrow';
    el.style.left = x0 + 'px';
    el.style.top = y0 + 'px';
    el.style.width = Math.sqrt(dx * dx + dy * dy) + 'px';
    el.style.transform = 'rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI) + 'deg)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), spd(1020));
  }

  /* VS-Gegenüberstellung beim Angriff (t: {id,faceDown} | 'LP' | null) */
  function showVs(aId, t) {
    const box = $('#duel-vs');
    const A = $('#vs-a'), B = $('#vs-b');
    A.innerHTML = ''; B.innerHTML = '';
    A.appendChild(aId ? miniCard(aId) : backMini());
    if (t === 'LP') B.innerHTML = '<div class="vs-lp">💥</div>';
    else if (t && t.id) B.appendChild(t.faceDown ? backMini() : miniCard(t.id));
    else B.appendChild(backMini());
    box.classList.remove('hidden', 'vs-anim');
    void box.offsetWidth;
    box.classList.add('vs-anim');
    NT.Audio.play('vs');
    setTimeout(() => box.classList.add('hidden'), spd(1020));
  }

  function zoneEl(side, type, zi) {
    return document.querySelector('.slot[data-side="' + side + '"][data-type="' + type + '"][data-zone="' + zi + '"]');
  }

  /* ---------- Karten-Enthüllung (Flip / Jutsu / Falle) ---------- */
  const revealQ = [];
  let revealActive = false;
  function revealCard(id, caption) {
    revealQ.push({ id, caption });
    pumpReveal();
  }
  function pumpReveal() {
    if (revealActive || !revealQ.length) return;
    revealActive = true;
    const ev = revealQ.shift();
    const box = $('#reveal');
    const slot = $('#reveal-card');
    slot.innerHTML = '';
    slot.appendChild(bigCard(ev.id));
    $('#reveal-caption').textContent = ev.caption;
    box.classList.remove('hidden');
    box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
    const wait = spd(revealQ.length > 2 ? 1040 : 1840); // bei Rückstau schneller abspielen
    box.style.animationDuration = wait + 'ms';
    setTimeout(() => {
      box.classList.add('hidden');
      revealActive = false;
      pumpReveal();
    }, wait);
  }

  /* ---------- Kampflog (seitlich, letzte 5 Aktionen) ---------- */
  const cardName = (id) => (NT.CARDS[id] ? NT.CARDS[id].name : '?');
  function backMini() {
    const el = document.createElement('div');
    el.className = 'card facedown';
    el.innerHTML = '<div class="c-back">🍥<img src="assets/ui/card-back.jpg" alt="" draggable="false" onerror="this.remove()"></div>';
    return el;
  }
  function vlogAdd(entry) { // {side, id?|back?|icon?, text}
    entry.turn = D.E ? D.E.state.turn : 0;
    D.vlog.unshift(entry);
    if (D.vlog.length > 5) D.vlog.length = 5;
    D.vlogAll.unshift(entry);           // komplette Historie fürs Log-Modal
    if (D.vlogAll.length > 200) D.vlogAll.length = 200;
    renderVlog();
  }

  /* Ganzes Kampflog als Modal: scrollen, Eintrag mit Karte antippen → Großansicht */
  function showLogModal() {
    if (!D.E) return;
    NT.Audio.play('click');
    const body = $('#modal-body');
    body.innerHTML = '<h3>📜 Kampflog</h3><p class="log-hint">Tippe einen Eintrag mit Karte an, um die Karte groß zu sehen.</p>';
    const list = document.createElement('div');
    list.className = 'log-list';
    if (!D.vlogAll.length) list.innerHTML = '<p class="log-empty">Noch keine Aktionen in diesem Duell.</p>';
    D.vlogAll.forEach((e) => {
      const row = document.createElement('div');
      row.className = 'log-row ' + (e.side === 'P' ? 'me' : 'foe');
      if (e.id || e.back) {
        const th = document.createElement('div');
        th.className = 'log-thumb';
        th.appendChild(e.back ? backMini() : miniCard(e.id));
        row.appendChild(th);
      } else {
        const ic = document.createElement('div');
        ic.className = 'log-ico';
        ic.textContent = e.icon || '•';
        row.appendChild(ic);
      }
      const t = document.createElement('div');
      t.className = 'log-txt';
      t.innerHTML = e.text +
        '<div class="log-meta">' + (e.side === 'P' ? 'Du' : 'Gegner') + ' · Zug ' + e.turn + '</div>';
      row.appendChild(t);
      if (e.id) {
        row.classList.add('has-card');
        row.onclick = () => { NT.Audio.play('click'); NT.CardView.show(e.id); };
      }
      list.appendChild(row);
    });
    body.appendChild(list);
    const btnRow = document.createElement('div');
    btnRow.className = 'log-btnrow';
    const exp = document.createElement('button');
    exp.className = 'btn';
    exp.textContent = '📄 Log exportieren';
    exp.onclick = exportLog;
    btnRow.appendChild(exp);
    const close = document.createElement('button');
    close.className = 'btn btn-primary';
    close.textContent = 'Schließen';
    close.onclick = closeModal;
    btnRow.appendChild(close);
    body.appendChild(btnRow);
    $('#modal').classList.remove('hidden');
  }

  /* Duell-Report als .txt herunterladen (für Balancing-Analysen) */
  function exportLog() {
    if (!D.E || !D.opp) return;
    NT.Audio.play('click');
    const strip = (h) => String(h).replace(/<[^>]*>/g, '');
    const L = [];
    L.push('NARUTO TGC — Duell-Report');
    L.push('Datum: ' + new Date().toISOString());
    L.push('Gegner: ' + D.opp.name + ' (ID ' + D.opp.id + ', Schwierigkeit ' + (D.opp.difficulty || 1) + (D.opp.boss ? ', BOSS' : '') + ')');
    L.push('Ergebnis: ' + (st().winner
      ? (st().winner === 'P' ? 'SIEG' : 'NIEDERLAGE') + ' (' + (st().winReason || '?') + ')'
      : 'abgebrochen/laufend') + ' · Züge: ' + st().turn);
    L.push('LP am Ende: Du ' + st().players.P.lp + ' · Gegner ' + st().players.A.lp);
    if (NT.Store) {
      const dk = NT.Store.getDeck();
      L.push('Spieler-Deck (' + dk.length + '): ' + dk.join(', '));
    }
    if (D.opp.deck) L.push('Gegner-Deck (' + D.opp.deck.length + '): ' + D.opp.deck.join(', '));
    L.push('');
    L.push('--- Kampflog (chronologisch) ---');
    D.vlogAll.slice().reverse().forEach((e) => {
      L.push('[Zug ' + e.turn + '] ' + (e.side === 'P' ? 'DU ' : 'NPC') + ' · ' + strip(e.text));
    });
    const blob = new Blob([L.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ntgc-log-' + D.opp.id + '-zug' + st().turn + '.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('📄 Log exportiert — liegt in deinen Downloads!');
  }
  function renderVlog() {
    const box = $('#vlog');
    if (!box) return;
    box.innerHTML = '';
    for (const e of D.vlog) {
      const row = document.createElement('div');
      row.className = 'vlog-row ' + (e.side === 'P' ? 'me' : 'foe');
      if (e.id || e.back) {
        const th = document.createElement('div');
        th.className = 'vlog-thumb';
        th.appendChild(e.back ? backMini() : miniCard(e.id));
        row.appendChild(th);
      } else {
        const ic = document.createElement('div');
        ic.className = 'vlog-ico';
        ic.textContent = e.icon || '•';
        row.appendChild(ic);
      }
      const t = document.createElement('div');
      t.className = 'vlog-txt';
      t.innerHTML = e.text;
      row.appendChild(t);
      box.appendChild(row);
    }
  }

  function lpEl(side) { return $(side === 'P' ? '#my-lpfill' : '#opp-lpfill').parentElement; }

  function handleEvent(ev) {
    switch (ev.t) {
      case 'damage': {
        NT.Audio.play('damage');
        buzz(ev.side === 'P' ? 35 : 20); // eigener Treffer vibriert stärker
        lpBar(ev.side);
        fxPulse(lpEl(ev.side), 'lp-flash-d');
        floater(lpEl(ev.side), '-' + ev.amount, 'dmg');
        if (ev.side === 'A' && NT.Store.recordDamage) NT.Store.recordDamage(ev.amount); // Schaden DURCH den Spieler
        vlogAdd({ side: ev.side, icon: '💥', text: '<b>−' + ev.amount + ' LP</b><br>' + (ev.side === 'P' ? 'Du' : 'Gegner') });
        if (ev.amount >= 1000) {
          const f = $('#duel-field');
          f.classList.remove('field-shake'); void f.offsetWidth; f.classList.add('field-shake');
        }
        break;
      }
      case 'heal':
        NT.Audio.play('heal'); lpBar(ev.side); fxPulse(lpEl(ev.side), 'lp-flash-h');
        floater(lpEl(ev.side), '+' + ev.amount, 'heal');
        vlogAdd({ side: ev.side, icon: '💚', text: '<b>+' + ev.amount + ' LP</b><br>' + (ev.side === 'P' ? 'Du' : 'Gegner') });
        break;
      case 'summon':
        NT.Audio.play(ev.special ? 'special' : (NT.CARDS[ev.id] && NT.CARDS[ev.id].token ? 'token' : 'summon'));
        fxSpawn(zoneEl(ev.side, 'm', ev.zone), 'fx-ring', 1000);
        vlogAdd({ side: ev.side, id: ev.id, text: '<b>' + cardName(ev.id) + '</b><br>' + (ev.special ? 'Spezial-Beschwörung!' : 'beschworen!') });
        break;
      case 'set-monster':
        NT.Audio.play('set');
        vlogAdd({ side: ev.side, back: true, text: 'Ninja<br>verdeckt gesetzt' });
        break;
      case 'set-st':
        NT.Audio.play('set');
        vlogAdd({ side: ev.side, back: true, text: 'Jutsu/Falle<br>verdeckt gesetzt' });
        break;
      case 'flip':
        NT.Audio.play('flip'); revealCard(ev.id, 'Aufgedeckt!');
        vlogAdd({ side: ev.side, id: ev.id, text: '<b>' + cardName(ev.id) + '</b><br>aufgedeckt!' });
        break;
      case 'activate': {
        const ac = NT.CARDS[ev.id];
        NT.Audio.play(ac.kind === 'falle' ? 'trap' : (ac.sub === 'equip' ? 'equip' : 'spell'));
        if (ev.zone !== undefined) fxSpawn(zoneEl(ev.side, 'st', ev.zone), 'fx-flash', 750);
        revealCard(ev.id, ac.kind === 'falle' ? 'Falle aktiviert!' : 'Jutsu aktiviert!');
        vlogAdd({ side: ev.side, id: ev.id, text: '<b>' + cardName(ev.id) + '</b><br>aktiviert!' });
        break;
      }
      case 'attack': {
        const am = st().players[ev.side].m[ev.zone];
        const tm = ev.target === -1 ? null : st().players[D.E.other(ev.side)].m[ev.target];
        NT.Audio.play(ev.target === -1 ? 'direct' : 'attack');
        vlogAdd({
          side: ev.side, id: am ? am.id : null, icon: '⚔️',
          text: (am ? '<b>' + cardName(am.id) + '</b><br>' : '') +
            (ev.target === -1 ? 'Direktangriff!' : 'greift ' + (tm ? (tm.mode === 'defdown' ? 'ein verdecktes Ninja' : '<b>' + cardName(tm.id) + '</b>') : '…') + ' an'),
        });
        const from = zoneEl(ev.side, 'm', ev.zone);
        const to = ev.target === -1 ? lpEl(D.E.other(ev.side)) : zoneEl(D.E.other(ev.side), 'm', ev.target);
        if (from && to) {
          // VS-Gegenüberstellung + Angriffs-Pfeil (ygopro), dann Lunge & Treffer
          showVs(am ? am.id : null,
            ev.target === -1 ? 'LP' : (tm ? { id: tm.id, faceDown: tm.mode === 'defdown' } : null));
          fxArrow(from, to);
          const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
          from.style.setProperty('--dx', (b.left - a.left) * 0.5 + 'px');
          from.style.setProperty('--dy', (b.top - a.top) * 0.5 + 'px');
          setTimeout(() => {
            from.classList.add('lunge');
            setTimeout(() => from.classList.remove('lunge'), spd(670));
          }, spd(450));
          // Treffer-Effekt zeitverzögert auf dem Ziel
          setTimeout(() => {
            if (ev.target === -1) fxShot(from, to);
            else fxSpawn(to, 'fx-slash', 830);
          }, spd(865));
        }
        break;
      }
      case 'trap':
        NT.Audio.play('trap');
        if (ev.zone !== undefined) fxSpawn(zoneEl(ev.side, 'st', ev.zone), 'fx-flash', 750);
        revealCard(ev.id, 'Falle aktiviert!');
        vlogAdd({ side: ev.side, id: ev.id, text: '<b>' + cardName(ev.id) + '</b><br>Falle aktiviert!' });
        break;
      case 'tribute':
        NT.Audio.play('discard');
        vlogAdd({ side: ev.side, id: ev.id, text: '<b>' + cardName(ev.id) + '</b><br>als Tribut geopfert' });
        break;
      case 'banish':
        NT.Audio.play('banish');
        vlogAdd({ side: ev.side, id: ev.id, text: '<b>' + cardName(ev.id) + '</b><br>🚫 verbannt!' });
        break;
      case 'handtrap':
        NT.Audio.play('negate');
        revealCard(ev.id, 'Hand-Falle!');
        vlogAdd({ side: ev.side, id: ev.id, text: '<b>' + cardName(ev.id) + '</b><br>🛡️ Hand-Falle!' });
        break;
      case 'lock':
        NT.Audio.play('debuff');
        vlogAdd({ side: ev.side, icon: '⚔️', text: '<b>Angriffs-Sperre</b><br>' + ev.turns + ' Züge' });
        break;
      case 'destroy': case 'destroy-st': {
        NT.Audio.play('destroy');
        buzz(20);
        const zs = zoneEl(ev.side, ev.t === 'destroy' ? 'm' : 'st', ev.zone);
        fxSpawn(zs, 'fx-boom', 850);
        fxPulse(zs, 'slot-hit', 600);
        if (ev.t === 'destroy') { // Todes-Animation der Karte selbst (Geist über dem leeren Slot)
          D.dying.push({ side: ev.side, zone: ev.zone, id: ev.id, until: Date.now() + spd(1520) });
          if (D.dying.length > 8) D.dying.splice(0, D.dying.length - 8);
        }
        vlogAdd({ side: ev.side, id: ev.id, text: '<b>' + cardName(ev.id) + '</b><br>zerstört' });
        break;
      }
      case 'bounce':
        NT.Audio.play('bounce');
        vlogAdd({ side: ev.side, id: ev.id, text: '<b>' + cardName(ev.id) + '</b><br>zurück auf die Hand' });
        break;
      case 'control':
        NT.Audio.play('buff');
        vlogAdd({ side: ev.side, id: ev.id, text: '<b>' + cardName(ev.id) + '</b><br>übernommen!' });
        break;
      case 'control-back':
        NT.Audio.play('bounce');
        vlogAdd({ side: ev.side, id: ev.id, text: '<b>' + cardName(ev.id) + '</b><br>zurück zum Besitzer' });
        break;
      case 'negate':
        NT.Audio.play('negate');
        vlogAdd({ side: ev.side, icon: '🚫', text: '<b>Annulliert!</b>' });
        break;
      case 'search':
        NT.Audio.play('search');
        vlogAdd({ side: ev.side, icon: '🔍', text: 'Karte gesucht<br>und gezogen' });
        break;
      case 'mill':
        NT.Audio.play('discard');
        vlogAdd({ side: ev.side, icon: '🌪️', text: '<b>' + ev.n + ' Karten</b><br>vom Deck gefegt' });
        break;
      case 'protect':
        vlogAdd({ side: ev.side, icon: '🛡️', text: '<b>' + cardName(ev.id) + '</b><br>geschützt!' });
        break;
      case 'buff': NT.Audio.play('buff'); floater(zoneEl(ev.side, 'm', ev.zone), '+' + ev.v + ' ATK', 'buff'); break;
      case 'element': { // Elementvorteil im Kampf
        NT.Audio.play('buff');
        const ac = NT.CARDS[st().players[ev.side].m[ev.zone].id];
        const ic = ac.attr ? NT.ATTRS[ac.attr].icon : '🔥';
        floater(zoneEl(D.E.other(ev.side), 'm', ev.target), ic + ' +' + ev.v + ' ANG', 'elem');
        vlogAdd({ side: ev.side, icon: ic, text: '<b>Elementvorteil!</b><br>+' + ev.v + ' ANG' });
        break;
      }
      case 'debuff': NT.Audio.play('debuff'); floater(zoneEl(ev.side, 'm', ev.zone), '-' + ev.v + ' ATK', 'dmg'); break;
      case 'draw':
        NT.Audio.play('draw');
        fxDraw(ev.side); // Kartenrücken fliegt vom Deck-Stapel in die Hand
        break;
      case 'turn': {
        NT.Audio.play('turn');
        const b = $('#turn-banner');
        b.textContent = ev.side === 'P' ? '🍥 Dein Zug!' : '🌑 Gegnerischer Zug';
        b.classList.remove('hidden');
        b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
        setTimeout(() => b.classList.add('hidden'), spd(1920));
        break;
      }
      case 'win':
        // Sicherheitsnetz: falls ein Flow checkWin auslässt, Sieg trotzdem zeigen
        setTimeout(() => checkWin(), spd(1440));
        break;
    }
  }

  /* ================= Toast ================= */
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
  }

  /* ================= Responsive Kartengröße ================= */
  const TILT = { landscape: 0.58, portrait: 0.90 }; // sichtbare Höhe des Feldes nach rotateX + Perspektive
  function fitLayout() {
    const field = document.getElementById('duel-field');
    if (!field || !document.getElementById('scr-duel').classList.contains('active')) return;
    const H = field.clientHeight, W = field.clientWidth;
    const landscape = W > H;
    const root = document.documentElement.style;

    // Handkarten: eigenes Band am unteren Rand, so groß wie möglich
    let handW = ((landscape ? H * 0.26 : H * 0.19) - 10) / 1.3667;
    handW = Math.min(handW, (W * (landscape ? 0.60 : 0.92)) / 4.2); // 6 Karten mit Überlappung
    handW = Math.max(56, Math.min(landscape ? 116 : 96, Math.floor(handW)));
    root.setProperty('--hand-w', handW + 'px');

    // Feldkarten: müssen in die perspektivisch verkürzte Arena passen
    const sceneH = H - (handW * 1.3667 + 10) - 4 + handW * 0.30; // Hand überlappt das Feld deutlich (Duel-Links-Stil)
    const tilt = landscape ? TILT.landscape : TILT.portrait;
    const reserve = landscape ? 16 : 92; // Puffer für HUD-Elemente
    const railW = landscape ? 2 * 56 : 2 * 60; // Seiten-Rails (Pile + Abstand zur Matte) einrechnen
    let w = ((sceneH - reserve) / tilt - 38) / 4.6; // 4 Reihen + Lücken + Padding
    w = Math.min(w, (W * (landscape ? 0.65 : 0.94) - 30 - railW) / 3.7);
    w = Math.max(landscape ? 62 : 40, Math.min(landscape ? 128 : 104, Math.floor(w)));
    root.setProperty('--card-w', w + 'px');
  }

  /* ================= Start / Verlassen ================= */
  NT.CardView = { mini: miniCard, big: bigCard, show: (id) => openSheet(id, []) };
  NT.attachLongPress = attachLongPress;
  NT.Duel = {
    start(opp, opts) {
      D.opp = opp;
      D.opts = opts || {};
      D.busy = false; D.finished = false; D.sel = null;
      D.prevKeys = new Set();
      revealQ.length = 0; revealActive = false;
      $('#reveal').classList.add('hidden');
      D.vlog = []; D.vlogAll = []; D.dying = []; renderVlog();
      closeSheet(); closeModal();
      const deckP = NT.Store.getDeck();
      D.E = NT.Engine.create({ deckP, deckA: opp.deck, onEvent: handleEvent });
      $('#opp-avatar').innerHTML = NT.avatarHtml(opp.avatar, NT.OPP_AVATAR_IMG[opp.id]);
      $('.avatar.me').innerHTML = NT.avatarHtml('🍥', NT.PLAYER_AVATAR_IMG);
      $('#opp-name').textContent = opp.name;
      $('#my-name').textContent = NT.Store.getName() || 'Du';
      // Arena-Theme: Boss-Arena (falls definiert) schlägt das Shop-Theme aus dem Kartenladen
      const bd = document.getElementById('board-3d');
      const scr = document.getElementById('scr-duel');
      if (bd) {
        bd.className = bd.className.replace(/\s*(theme|boss)-\S+/g, '');
        if (scr) {
          scr.className = scr.className.replace(/\s*boss-\S+/g, '');
          scr.style.removeProperty('--bossimg');
        }
        const ba = BOSS_ARENA[opp.id];
        if (ba) {
          bd.classList.add(ba.cls);
          if (scr) {
            scr.classList.add(ba.cls);
            scr.style.setProperty('--bossimg', "url('" + ba.img + "')");
          }
        } else {
          const th = (NT.Store.data && NT.Store.data.theme) || 'standard';
          if (th !== 'standard') bd.classList.add('theme-' + th);
        }
      }
      if (D.refreshQol) D.refreshQol(); // Tempo-/Sort-Buttons mit gespeicherten Werten
      NT.Main.show('scr-duel');
      if (NT.Music) NT.Music.play(opp.boss ? 'boss' : (NT.Store.data.duelTrack || 'duel'));
      D.E.start();
      $('#rotate-hint').classList.remove('hidden');
      fitLayout();
      render();
      requestAnimationFrame(() => { fitLayout(); render(); });
    },
    leave() {
      D.E = null; D.sel = null; D.busy = false; D.finished = false;
      // Boss-Arena-Klassen wieder entfernen (Shop-Theme bleibt unberührt, wird in start() neu gesetzt)
      const bd = document.getElementById('board-3d');
      const scr = document.getElementById('scr-duel');
      if (bd) bd.className = bd.className.replace(/\s*boss-\S+/g, '');
      if (scr) {
        scr.className = scr.className.replace(/\s*boss-\S+/g, '');
        scr.style.removeProperty('--bossimg');
      }
    },
    toast,
  };

  /* ================= DOM-Events ================= */
  document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('resize', fitLayout);
    window.addEventListener('orientationchange', () => setTimeout(fitLayout, 200));
    $('#phase-btn').addEventListener('click', onPhaseBtn);
    $('#sheet-close').addEventListener('click', closeSheet);
    $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });
    $('#sel-cancel').addEventListener('click', () => { clearSel(); render(); });
    $('#sel-ok').addEventListener('click', () => {
      if (!D.sel) return;
      if (D.sel.mode === 'tribute' && D.sel.chosen.length === D.sel.need) {
        const s = D.sel;
        clearSel();
        if (doEngine(() => D.E.summon('P', s.handIdx, s.chosen[0], { tributes: s.chosen, faceDown: s.faceDown }))) afterAction();
        else render();
      } else if (D.sel.mode === 'attack' && !st().players.A.m.some(Boolean)) {
        playerAttack(-1);
      }
    });
    // QoL: Animations-Tempo (1×→2×→3×) + Hand-Sortierung
    const curSpeed = () => (NT.Store.data && NT.Store.data.animSpeed) || 1;
    const speedLabel = () => { $('#btn-speed').textContent = '⏩ ' + curSpeed() + '×'; };
    speedLabel();
    $('#btn-speed').addEventListener('click', () => {
      NT.Store.data.animSpeed = curSpeed() >= 3 ? 1 : curSpeed() + 1;
      NT.Store.save();
      speedLabel();
      NT.Audio.play('click');
      toast('⏩ Tempo: ' + NT.Store.data.animSpeed + '×');
    });
    const sortLabel = () => { $('#btn-handsort').style.opacity = !NT.Store.data || NT.Store.data.handSort ? '1' : '0.45'; };
    sortLabel();
    D.refreshQol = () => { speedLabel(); sortLabel(); };
    $('#btn-handsort').addEventListener('click', () => {
      NT.Store.data.handSort = !NT.Store.data.handSort;
      NT.Store.save();
      sortLabel();
      NT.Audio.play('click');
      toast(NT.Store.data.handSort ? '⇅ Hand sortiert (Typ/Stufe)' : '⇅ Hand unsortiert');
      if (D.E) render();
    });
    $('#btn-surrender').addEventListener('click', () => {
      if (!D.E || D.finished) return;
      const body = $('#modal-body');
      body.innerHTML = '<h3>🏳️ Aufgeben?</h3><p>Willst du das Duell wirklich aufgeben?</p>';
      const yes = document.createElement('button');
      yes.className = 'btn btn-primary'; yes.textContent = 'Ja, aufgeben';
      yes.onclick = () => { closeModal(); D.E.surrender('P'); checkWin(); };
      const no = document.createElement('button');
      no.className = 'btn'; no.textContent = 'Weiterkämpfen!';
      no.onclick = () => closeModal();
      body.appendChild(yes); body.appendChild(no);
      $('#modal').classList.remove('hidden');
    });
    $('#rotate-ok').addEventListener('click', () => {
      const h = $('#rotate-hint');
      h.classList.add('dismissed');
      setTimeout(() => h.classList.add('hidden'), 300);
    });
    $('#vlog').addEventListener('click', showLogModal);
    $('#my-gypile').addEventListener('click', () => { if (D.E) showGyModal('P'); });
    $('#opp-gypile').addEventListener('click', () => { if (D.E) showGyModal('A'); });
    $('#my-banpile').addEventListener('click', () => { if (D.E) showBanModal('P'); });
    $('#opp-banpile').addEventListener('click', () => { if (D.E) showBanModal('A'); });
  });
})(typeof window !== 'undefined' ? window : globalThis);
