/* ============================================================
   NARUTO TGC — Map „Neo-Konoha" + Zeitreise-Map „Die Shinobi-Ära"
   Zwei Welten auf einem Screen: Stationen, Kapitel (Szene → Duell
   → Szene), Farm-Kämpfe. Fortschritt je Welt aus Siegen abgeleitet.
   Welt 2 (Vergangenheit) wird nach dem Sieg über das Dunkle Echo
   freigeschaltet (Button #map-world) und startet mit dem
   Zeitreise-Intro (Rinnegan-Auge am Himmel).
   ============================================================ */
(function (g) {
  const NT = g.NTCG;
  const $ = (s) => document.querySelector(s);
  const wins = (id) => NT.Store.wins(id);

  /* ================= Welt 1: Neo-Konoha (Bestand) ================= */
  const STATIONS_NEO = [
    { id: 'akademie', name: 'Akademie',        icon: '🏫', x: 30, y: 44, min: 1 },
    { id: 'ramen',    name: 'Ramen-Gai',       icon: '🍜', x: 25, y: 70, min: 2 },
    { id: 'training', name: 'Trainingsfelder', icon: '🥋', x: 74, y: 42, min: 2 },
    { id: 'arena',    name: 'Arena',           icon: '🏟️', x: 80, y: 74, min: 4 },
    { id: 'hokage',   name: 'Hokage-Turm',     icon: '🗼', x: 50, y: 62, min: 8 },
    { id: 'kagaa',    name: 'Kagā-Turm',       icon: '🏢', x: 16, y: 36, min: 5 },
    { id: 'shop',     name: 'Kartenladen',     icon: '🏪', x: 58, y: 28, min: 1, shop: true },
  ];
  const CHAPTERS_NEO = [
    { id: 1, station: 'akademie', opp: 'iruka_story',    pre: 'k1_anreise',  post: 'k1_sieg',          min: 1,
      name: 'Kapitel 1: Die Aufnahmeprüfung',  hint: 'Story + Prüfungsduell · Akademie-Paket', stars: 2 },
    { id: 2, station: 'ramen',    opp: 'ramen_kotei',    pre: 'k2_ramen',    post: 'k2_ramen_sieg',    min: 2,
      name: 'Kapitel 2: Ramen & Raufbold',     hint: 'Story + Straßenduell', stars: 1 },
    { id: 3, station: 'training', opp: 'chunin_trainer', pre: 'k2_training', post: 'k2_training_sieg', min: 3,
      name: 'Kapitel 2: Ayas Prüfungskampf',   hint: 'Story + Duell (★★★★)', stars: 4 },
    { id: 4, station: 'arena',    opp: 'kurogane',       pre: 'k2_arena',    post: 'k2_arena_sieg',    min: 4,
      name: 'Kapitel 2: Der Champion',         hint: '⚠️ BOSS — UR-Deck! Erst farmen (Daigo/SR)', stars: 7 },
    { id: 5, station: 'kagaa',    opp: 'kagaa_shizuka',  pre: 'k3_empfang',  post: 'k3_empfang_sieg',  min: 5,
      name: 'Kapitel 3: Der Kagā-Turm',        hint: 'Story + Eignungsprüfung (★★★★★)', stars: 5 },
    { id: 6, station: 'kagaa',    opp: 'kagaa_raiga',    pre: 'k3_archiv',   post: 'k3_archiv_sieg',   min: 6,
      name: 'Kapitel 3: Das Echo-Archiv',      hint: 'Story + Duell (★★★★★★★)', stars: 7 },
    { id: 7, station: 'kagaa',    opp: 'kagaa_kagaa',    pre: 'k3_direktor', post: 'k3_ende',          min: 7,
      name: 'Kapitel 3: Der Direktor',         hint: '⚠️ BOSS — UR-Deck + Konter-Fallen!', stars: 8 },
    { id: 8, station: 'hokage',   opp: 'echo_waechter',  pre: 'k4_ruf',      post: 'k4_waechter_sieg', min: 8,
      name: 'Kapitel 4: Der Ruf des Steins',   hint: 'Story + Prüfung des Wächters (★★★★★★★)', stars: 7 },
    { id: 9, station: 'hokage',   opp: 'riss_stimme',    pre: 'k4_stimmen',  post: 'k4_stimmen_sieg',  min: 9,
      name: 'Kapitel 4: Die Stimmen',          hint: 'Story + Duell (★★★★★★★★)', stars: 8 },
    { id: 10, station: 'hokage',  opp: 'echo_spiegel',   pre: 'k4_kern',     post: 'k4_ende',          min: 10,
      name: 'Kapitel 4: Das Dunkle Echo',      hint: '⚠️ FINAL-BOSS — dein Spiegelbild kennt jeden Trick!', stars: 9 },
  ];
  const FARMS_NEO = {
    akademie: [{ opp: 'iruka_story', hint: 'Rematch · Deck-Beute', when: () => wins('iruka_story') > 0 }],
    training: [
      { opp: 'genin_trainer',  hint: '★★ · N/R-Beute',  when: () => true },
      { opp: 'chunin_trainer', hint: '★★★★ · R-Beute', when: () => wins('genin_trainer') > 0 || wins('chunin_trainer') > 0 },
      { opp: 'jonin_trainer',  hint: '★★★★★★ · SR/UR-Beute', when: () => wins('chunin_trainer') > 0 },
    ],
    ramen:  [{ opp: 'ramen_kotei', hint: '★ · N/R-Beute', when: () => wins('ramen_kotei') > 0 }],
    arena:  [{ opp: 'kurogane', hint: '★★★★★★★ BOSS · Frosch-Deck farmen', when: () => wins('kurogane') > 0 }],
    kagaa:  [
      { opp: 'kagaa_shizuka', hint: '★★★★★ · Deck-Beute', when: () => wins('kagaa_shizuka') > 0 },
      { opp: 'kagaa_raiga',   hint: '★★★★★★★ · Wall-Deck farmen', when: () => wins('kagaa_raiga') > 0 },
      { opp: 'kagaa_kagaa',   hint: '★★★★★★★★ BOSS · UR-Beute', when: () => wins('kagaa_kagaa') > 0 },
    ],
    hokage: [
      { opp: 'echo_waechter', hint: '★★★★★★★ · UR-Beute', when: () => wins('echo_waechter') > 0 },
      { opp: 'riss_stimme',   hint: '★★★★★★★★ · UR-Beute', when: () => wins('riss_stimme') > 0 },
      { opp: 'echo_spiegel',  hint: '★★★★★★★★★ BOSS · UR-Beute', when: () => wins('echo_spiegel') > 0 },
    ],
  };
  function progressNeo() {
    let p = (NT.Store.data && NT.Store.data.story.progress) || 0;
    if (wins('iruka_story') > 0) p = Math.max(p, 2);
    if (wins('ramen_kotei') > 0) p = Math.max(p, 3);
    if (wins('chunin_trainer') > 0) p = Math.max(p, 4);
    if (wins('kurogane') > 0) p = Math.max(p, 5);
    if (wins('kagaa_shizuka') > 0) p = Math.max(p, 6);
    if (wins('kagaa_raiga') > 0) p = Math.max(p, 7);
    if (wins('kagaa_kagaa') > 0) p = Math.max(p, 8);
    if (wins('echo_waechter') > 0) p = Math.max(p, 9);
    if (wins('riss_stimme') > 0) p = Math.max(p, 10);
    if (wins('echo_spiegel') > 0) p = Math.max(p, 11);
    return p;
  }
  function objectiveNeo() {
    if (wins('iruka_story') === 0) return '🎓 Geh zur Akademie — die Aufnahmeprüfung wartet!';
    if (wins('ramen_kotei') === 0) return '🍜 Kaito wartet in der Ramen-Gai!';
    if (wins('chunin_trainer') === 0) return '🥋 Trainingsfelder: Bestehe Ayas Prüfungskampf!';
    if (wins('kurogane') === 0) return '🏟️ Arena: Fordere Champion Kurogane heraus — vorher Deck prüfen (Daigos Deck birgt SR/UR-Karten)!';
    if (wins('kagaa_shizuka') === 0) return '🏢 Der Kagā-Turm lädt dich ein — bestehe Shizukas Eignungsprüfung!';
    if (wins('kagaa_raiga') === 0) return '🏢 Kagā-Turm: Das Echo-Archiv — Sicherheitschef Raiga wartet!';
    if (wins('kagaa_kagaa') === 0) return '🏢 BOSS: Direktor Kagā an der Spitze — baue dein bestes Deck (Konter-Fallen)!';
    if (wins('echo_waechter') === 0) return '🗼 Der Riss ist zurück! Hokage-Turm: Bestehe die Prüfung des Wächters!';
    if (wins('riss_stimme') === 0) return '🗼 Kammer der Prophezeiung: Die Stimme des Risses wartet!';
    if (wins('echo_spiegel') === 0) return '🗼 FINALE: Stell dich dem Dunklen Echo im Herzen des Risses!';
    return '🏆 Die Prophezeiung ist erfüllt! 🌀 Die Shinobi-Ära wartet (Button unten rechts)!';
  }

  /* ================= Welt 2: Die Shinobi-Ära (Zeitreise, Kanon) ================= */
  const STATIONS_PAST = [
    { id: 'akademie_p', name: 'Akademie',           icon: '🏫', x: 36, y: 48, min: 1 },
    { id: 'bruecke',    name: 'Große Brücke',       icon: '🌉', x: 72, y: 55, min: 2 },
    { id: 'pruefung',   name: 'Prüfungswald',       icon: '🌲', x: 16, y: 80, min: 4 },
    { id: 'tore',       name: 'Konoha-Tore',        icon: '⛩️', x: 26, y: 72, min: 6 },
    { id: 'klang',      name: 'Versteck des Klangs', icon: '🦴', x: 74, y: 78, min: 7 },
    { id: 'regen',      name: 'Amegakure',          icon: '🌧️', x: 88, y: 68, min: 8 },
    { id: 'shop_p',     name: 'Kartenladen',        icon: '🏪', x: 52, y: 40, min: 1, shop: true },
  ];
  const CHAPTERS_PAST = [
    { id: 1, station: 'akademie_p', opp: 'mizuki_story',     pre: 'z_k5_akademie', post: 'z_k5_sieg',       min: 1,
      name: 'Kapitel 5: Die gestohlene Schriftrolle', hint: 'Story + Duell (★★★★★★★)', stars: 7 },
    { id: 2, station: 'bruecke',    opp: 'haku_story',       pre: 'z_k6_bruecke',  post: 'z_k6_haku_sieg',  min: 2,
      name: 'Kapitel 6: Spiegel aus Eis',           hint: 'Story + Duell (★★★★★★★)', stars: 7 },
    { id: 3, station: 'bruecke',    opp: 'zabuza_story',     pre: 'z_k6_nebel',    post: 'z_k6_sieg',       min: 3,
      name: 'Kapitel 6: Der Dämon des Nebels',      hint: '⚠️ BOSS — Zabuza & Kubikiribōchō!', stars: 8 },
    { id: 4, station: 'pruefung',   opp: 'orochimaru_story', pre: 'z_k7_wald',     post: 'z_k7_wald_sieg',  min: 4,
      name: 'Kapitel 7: Der Wald des Todes',        hint: 'Story + Duell (★★★★★★★★)', stars: 8 },
    { id: 5, station: 'pruefung',   opp: 'gaara_story',      pre: 'z_k7_sturm',    post: 'z_k7_sturm_sieg', min: 5,
      name: 'Kapitel 7: Sturm auf Konoha',          hint: '⚠️ BOSS — Shukaku erwacht!', stars: 8 },
    { id: 6, station: 'tore',       opp: 'itachi_story',     pre: 'z_k8_tore',     post: 'z_k8_tore_sieg',  min: 6,
      name: 'Kapitel 8: Akatsuki in Konoha',        hint: '⚠️ BOSS — Genjutsu & Samehada!', stars: 9 },
    { id: 7, station: 'klang',      opp: 'kimimaro_story',   pre: 'z_k8_klang',    post: 'z_k8_klang_sieg', min: 7,
      name: 'Kapitel 8: Der Viererklang',           hint: '⚠️ BOSS — Kimimaro wartet am Ende!', stars: 9 },
    { id: 8, station: 'regen',      opp: 'pain_story',       pre: 'z_k9_regen',    post: 'z_k9_regen_sieg', min: 8,
      name: 'Kapitel 9: Die Sechs Pfade',           hint: '⚠️ BOSS — Schmerz für die Welt!', stars: 9 },
    { id: 9, station: 'regen',      opp: 'madara_story',     pre: 'z_k9_mond',     post: 'z_k9_ende',       min: 9,
      name: 'Kapitel 9: Das Auge am Himmel',        hint: '⚠️ FINAL-BOSS — Madara & das Mugen Tsukuyomi!', stars: 10 },
  ];
  const FARMS_PAST = {
    akademie_p: [{ opp: 'mizuki_story', hint: '★★★★★★★ · Schriftrollen-Beute', when: () => wins('mizuki_story') > 0 }],
    bruecke: [
      { opp: 'haku_story',   hint: '★★★★★★★ · Eis-Beute', when: () => wins('haku_story') > 0 },
      { opp: 'zabuza_story', hint: '★★★★★★★★ BOSS · UR-Beute', when: () => wins('zabuza_story') > 0 },
    ],
    pruefung: [
      { opp: 'orochimaru_story', hint: '★★★★★★★★ · Schlangen-Beute', when: () => wins('orochimaru_story') > 0 },
      { opp: 'gaara_story',      hint: '★★★★★★★★ BOSS · UR-Beute', when: () => wins('gaara_story') > 0 },
    ],
    tore:  [{ opp: 'itachi_story', hint: '★★★★★★★★★ BOSS · UR-Beute', when: () => wins('itachi_story') > 0 }],
    klang: [{ opp: 'kimimaro_story', hint: '★★★★★★★★★ BOSS · UR-Beute', when: () => wins('kimimaro_story') > 0 }],
    regen: [
      { opp: 'pain_story',   hint: '★★★★★★★★★ BOSS · UR-Beute', when: () => wins('pain_story') > 0 },
      { opp: 'madara_story', hint: '★★★★★★★★★★ FINAL · Chase-URs', when: () => wins('madara_story') > 0 },
    ],
  };
  function progressPast() {
    let p = (NT.Store.data && NT.Store.data.story.progressPast) || 0;
    if (wins('mizuki_story') > 0) p = Math.max(p, 2);
    if (wins('haku_story') > 0) p = Math.max(p, 3);
    if (wins('zabuza_story') > 0) p = Math.max(p, 4);
    if (wins('orochimaru_story') > 0) p = Math.max(p, 5);
    if (wins('gaara_story') > 0) p = Math.max(p, 6);
    if (wins('itachi_story') > 0) p = Math.max(p, 7);
    if (wins('kimimaro_story') > 0) p = Math.max(p, 8);
    if (wins('pain_story') > 0) p = Math.max(p, 9);
    if (wins('madara_story') > 0) p = Math.max(p, 10);
    return p;
  }
  function objectivePast() {
    if (wins('mizuki_story') === 0) return '🏫 Die Schriftrolle der Siegelung wurde gestohlen — stell Mizuki an der Akademie!';
    if (wins('haku_story') === 0) return '🌉 Land der Wellen: Eis-Spiegel warten auf der Großen Brücke!';
    if (wins('zabuza_story') === 0) return '🌉 Der Dämon des Nebels — Zabuza erwartet dich!';
    if (wins('orochimaru_story') === 0) return '🌲 Prüfungswald: Etwas Schlangenhaftes treibt sich im Wald des Todes herum …';
    if (wins('gaara_story') === 0) return '🌲 Sturm auf Konoha: Halte Gaara auf — Shukaku erwacht!';
    if (wins('itachi_story') === 0) return '⛩️ Akatsuki in Konoha: Itachi & Kisame stehen an den Toren!';
    if (wins('kimimaro_story') === 0) return '🦴 Versteck des Klangs: Der Viererklang versperrt den Weg!';
    if (wins('pain_story') === 0) return '🌧️ Amegakure: Stell dich den Sechs Pfaden von Pain!';
    if (wins('madara_story') === 0) return '🌕 FINALE: Das Auge am Himmel — brich das Mugen Tsukuyomi!';
    return '🏆 Das Mugen Tsukuyomi ist zerbrochen! Farme die Legenden der Shinobi-Ära!';
  }

  /* ================= Welten-Registry ================= */
  const WORLDS = {
    neo:  { stations: STATIONS_NEO,  chapters: CHAPTERS_NEO,  farms: FARMS_NEO,
            progress: progressNeo,   objective: objectiveNeo, past: false },
    past: { stations: STATIONS_PAST, chapters: CHAPTERS_PAST, farms: FARMS_PAST,
            progress: progressPast,  objective: objectivePast, past: true },
  };
  const curWorld = () => (NT.Store.data && NT.Store.data.world === 'past' ? 'past' : 'neo');
  const W = () => WORLDS[curWorld()];
  const pastUnlocked = () => wins('echo_spiegel') > 0;

  function setProgress(v) {
    const st = NT.Store.data && NT.Store.data.story;
    if (!st) return;
    if (curWorld() === 'past') {
      if (v > (st.progressPast || 0)) { st.progressPast = v; NT.Store.save(); }
    } else if (v > (st.progress || 0)) { st.progress = v; NT.Store.save(); }
  }

  const opp = (id) => NT.STORY_OPPS.find((o) => o.id === id);
  const chapterAt = (st) => W().chapters.find((c) => c.station === st.id && W().progress() >= c.min && wins(c.opp) === 0);

  /* ---------- Rendering ---------- */
  function render() {
    const world = W();
    const p = world.progress();
    $('#map-objective').textContent = world.objective();
    $('#map-inner').classList.toggle('world-past', world.past);
    const wb = $('#map-world');
    if (world.past) wb.textContent = '🏙️ Neo-Konoha';
    else wb.textContent = pastUnlocked() ? '🌀 Shinobi-Ära' : '🔒 ???';
    const box = $('#map-stations');
    box.innerHTML = '';
    for (const st of world.stations) {
      const locked = p < st.min;
      const hasChapter = !locked && !!chapterAt(st);
      const b = document.createElement('button');
      b.className = 'map-station' + (locked ? ' locked' : '') + (hasChapter ? ' pulse' : '');
      b.style.left = st.x + '%';
      b.style.top = st.y + '%';
      b.innerHTML = '<span class="map-pin">' + (locked ? '🔒' : st.icon) + '</span>' +
        '<span class="map-label">' + st.name + '</span>';
      b.onclick = () => onStationTap(st, locked);
      box.appendChild(b);
    }
  }

  function onStationTap(st, locked) {
    NT.Audio.play('click');
    if (locked) return NT.Duel.toast('🔒 ' + st.name + ' ist noch verschlossen — folge dem Ziel oben!');
    if (st.shop) return NT.ShopUI.show(); // Kartenladen: kein Panel, direkt in den Shop
    openPanel(st);
  }

  function openPanel(st) {
    $('#map-panel-title').textContent = st.icon + ' ' + st.name;
    const list = $('#map-panel-list');
    list.innerHTML = '';

    const ch = chapterAt(st);
    if (ch) {
      list.appendChild(encBtn({
        cls: 'chapter', avatar: '📖', name: ch.name,
        sub: ch.hint, stars: '★'.repeat(Math.min(6, ch.stars)) + (ch.stars > 6 ? '+' : ''),
        onTap: () => { closePanel(); startChapter(ch); },
      }));
    }

    const farms = (W().farms[st.id] || []).filter((f) => f.when());
    if (farms.length) {
      const head = document.createElement('div');
      head.className = 'map-farm-head';
      head.textContent = 'Freie Kämpfe';
      list.appendChild(head);
      for (const f of farms) {
        const o = opp(f.opp);
        list.appendChild(encBtn({
          avatar: NT.avatarHtml(o.avatar, NT.OPP_AVATAR_IMG[o.id]), name: o.name,
          sub: o.title + ' · ' + f.hint + ' · Siege: ' + wins(o.id),
          stars: '★'.repeat(Math.min(6, o.difficulty)) + (o.difficulty > 6 ? '+' : ''),
          onTap: () => { closePanel(); startDuel(o); },
        }));
      }
    }
    if (!ch && !farms.length) {
      const empty = document.createElement('div');
      empty.className = 'map-farm-head';
      empty.textContent = 'Hier gibt es im Moment nichts zu tun.';
      list.appendChild(empty);
    }
    $('#map-panel').classList.remove('hidden');
  }

  function encBtn(opts) {
    const b = document.createElement('button');
    b.className = 'map-enc' + (opts.cls ? ' ' + opts.cls : '');
    b.innerHTML =
      '<span class="enc-avatar">' + opts.avatar + '</span>' +
      '<span class="enc-info"><b>' + opts.name + '</b><small>' + opts.sub + '</small></span>' +
      '<span class="enc-right"><span class="enc-stars">' + opts.stars + '</span></span>';
    b.onclick = () => { NT.Audio.play('click'); opts.onTap(); };
    return b;
  }

  function closePanel() { $('#map-panel').classList.add('hidden'); }

  /* ---------- Duelle & Kapitel ---------- */
  function startDuel(o, after) {
    NT.Duel.start(o, {
      backLabel: '⬅️ Zurück zur Karte',
      onEnd(win) {
        if (after) after(win);
        else showMap();
      },
    });
  }

  function startChapter(ch) {
    const o = opp(ch.opp);
    NT.Story.play(ch.pre, () => {
      startDuel(o, (win) => {
        if (win) {
          setProgress(ch.id + 1);
          NT.Story.play(ch.post, showMap);
        } else {
          showMap();
          NT.Duel.toast('💪 Noch nicht geschafft — trainiere, baue dein Deck um und versuch’s erneut!');
        }
      });
    });
  }

  /* ---------- Weltwechsel (Gate: Sieg über das Dunkle Echo) ---------- */
  function switchWorld() {
    NT.Audio.play('click');
    if (curWorld() === 'past') {
      NT.Store.data.world = 'neo';
      NT.Store.save();
      showMap();
      return;
    }
    if (!pastUnlocked()) {
      NT.Duel.toast('🔒 Noch versiegelt — erfülle zuerst die Prophezeiung (besiege das Dunkle Echo)!');
      return;
    }
    NT.Store.data.world = 'past';
    const st = NT.Store.data.story;
    st.progressPast = Math.max(st.progressPast || 0, 1); // Akademie + Kapitel 5 sofort offen
    NT.Store.save();
    if (!st.flags.pastIntro) { // Zeitreise-Intro nur beim ersten Mal
      st.flags.pastIntro = 1;
      NT.Store.save();
      NT.Story.play('z_intro', showMap);
    } else {
      showMap();
    }
  }

  /* ---------- Anzeigen ---------- */
  function showMap() {
    render();
    NT.Main.show('scr-map');
    if (NT.Music) NT.Music.play('menu');
  }

  NT.Map = { show: showMap, render, world: curWorld };

  /* ---------- Layout: Map-Bild unverzerrt einpassen (Marker = % des Bildes) ---------- */
  function fitMap() {
    const el = $('#map-inner');
    if (!el || !$('#scr-map').classList.contains('active')) return;
    const Wd = window.innerWidth, H = window.innerHeight;
    const R = 1408 / 768;
    let w = Wd, h = w / R;
    if (h > H) { h = H; w = h * R; }
    el.style.width = Math.floor(w) + 'px';
    el.style.height = Math.floor(h) + 'px';
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#map-back').addEventListener('click', () => { NT.Audio.play('click'); NT.Main.show('scr-menu'); });
    $('#map-world').addEventListener('click', switchWorld);
    $('#map-panel-close').addEventListener('click', () => { NT.Audio.play('click'); closePanel(); });
    window.addEventListener('resize', fitMap);
    window.addEventListener('orientationchange', () => setTimeout(fitMap, 200));
    // fitMap nach jedem Screen-Wechsel zur Map
    const obs = new MutationObserver(fitMap);
    obs.observe($('#scr-map'), { attributes: true, attributeFilter: ['class'] });
  });
})(typeof window !== 'undefined' ? window : globalThis);
