/* ============================================================
   NARUTO TGC — Spiel-Engine (Speed-Duel-Regeln wie Duel Links)
   8000 LP · 3 Ninja-Zonen · 3 Jutsu/Fallen-Zonen · 1 Normal-
   beschwörung/Zug · Tribute ab Stufe 5 · Deck 20–30
   Läuft ohne DOM (auch in Node, für Tests).
   ============================================================ */
(function (g) {
  const NT = (g.NTCG = g.NTCG || {});

  let UID = 1;
  const inst = (id) => ({ uid: UID++, id });

  function create(cfg) {
    const rng = cfg.rng || Math.random;
    const onEvent = cfg.onEvent || function () {};
    const C = NT.CARDS;
    // Effekt-Arrays normalisieren (einmalig, idempotent): Karten dürfen mehrere Effekte haben
    for (const id in C) { const c = C[id]; if (!c.effects) c.effects = c.effect ? [c.effect] : []; }

    const E = { state: null };

    /* ---------- Basics ---------- */
    const emit = (t, d) => onEvent(Object.assign({ t }, d || {}));
    const cardOf = (x) => C[typeof x === 'string' ? x : x.id];
    const other = (s) => (s === 'P' ? 'A' : 'P');
    const pl = (s) => E.state.players[s];
    const fail = (msg) => { throw new Error(msg); };

    function log(msg) {
      E.state.log.unshift(msg);
      if (E.state.log.length > 4) E.state.log.length = 4;
      emit('log', { msg });
    }

    function shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    /* ---------- Werte / Effekte ---------- */
    function hasPiercing(card) {
      return card.effects.some((ef) => ef.t === 'piercing' || ef.piercing === true);
    }
    function hasFx(card, t) { return card.effects.some((ef) => ef.t === t); }

    // Auren: offene eigene Ninjas verstärken das eigene Team (live berechnet)
    function auraSum(side, t) {
      let v = 0;
      for (const m of pl(side).m) {
        if (!m || m.mode === 'defdown') continue;
        if (m.effectsLocked >= E.state.turn) continue; // Kröten-Magen: Effekte gesperrt
        for (const ef of cardOf(m).effects) if (ef.t === t) v += ef.v;
      }
      return v;
    }

    // Dauer-Flächen des Gegners (Sumpf der Unterwelt): drücken ANG/VERT unserer Ninja
    function contWeaken(side) {
      let v = 0;
      for (const s of pl(other(side)).st) {
        if (s && !s.faceDown && cardOf(s).effect.t === 'cont_weaken_all') v += cardOf(s).effect.v || 0;
      }
      return v;
    }

    // Stammes-Aura (Iruka-Lehrer): ANDERE offene eigene Ninja mit aura_tribe
    // stärken dieses Ninja, wenn es zum genannten Stamm/Präfix passt
    function auraTribeSum(side, zi, key) {
      const m = pl(side).m[zi];
      if (!m) return 0;
      const mc = cardOf(m);
      let v = 0;
      for (let i = 0; i < 3; i++) {
        if (i === zi) continue;
        const am = pl(side).m[i];
        if (!am || am.mode === 'defdown') continue;
        if ((am.effectsLocked || 0) >= E.state.turn) continue;
        for (const ef of cardOf(am).effects) {
          if (ef.t !== 'aura_tribe') continue;
          const match = (ef.tribe && mc.tribe === ef.tribe) || (ef.idPrefix && m.id.indexOf(ef.idPrefix) === 0);
          if (match) v += ef[key] || 0;
        }
      }
      return v;
    }

    function effAtk(side, zi) {
      const m = pl(side).m[zi];
      if (!m) return 0;
      const c = cardOf(m);
      const base = m.swapStats ? c.def : c.atk; // Henge: ANG/VERT getauscht
      let v = base + m.atkMod + m.tempAtk + auraSum(side, 'aura_atk') + auraTribeSum(side, zi, 'atk') - contWeaken(side);
      for (const ef of c.effects) {
        if (ef.t === 'aura_self_tribe' && (m.effectsLocked || 0) < E.state.turn && tribeOnField(side, ef.tribe, ef.idPrefix, zi)) v += ef.v || 0;
      }
      for (const s of pl(side).st) {
        if (s && !s.faceDown && s.equipTo === zi) v += cardOf(s).effect.atk || 0;
      }
      return Math.max(0, v);
    }

    function effDef(side, zi) {
      const m = pl(side).m[zi];
      if (!m) return 0;
      const c = cardOf(m);
      const base = m.swapStats ? c.atk : c.def; // Henge: ANG/VERT getauscht
      let v = base + m.defMod + auraSum(side, 'aura_def') + auraTribeSum(side, zi, 'def') - contWeaken(side);
      return Math.max(0, v);
    }

    function isPiercing(side, zi) {
      const m = pl(side).m[zi];
      if (!m) return false;
      if (hasPiercing(cardOf(m)) || m.tempPierce) return true;
      for (const s of pl(side).st) {
        if (s && !s.faceDown && s.equipTo === zi && cardOf(s).effect.piercing) return true;
      }
      return false;
    }

    // Elementvorteil: greift zi von atkSide das Ninja tzi von defSide an
    // und schlägt sein Chakra-Natur das des Ziels → +NT.ATTR_BONUS ANG (nur im Angriff).
    function attrBonus(atkSide, zi, defSide, tzi) {
      const am = pl(atkSide).m[zi], dm = pl(defSide).m[tzi];
      if (!am || !dm) return 0;
      const beats = NT.ATTR_BEATS || {};
      const a = cardOf(am).attr, d = cardOf(dm).attr;
      return a && d && beats[a] === d ? (NT.ATTR_BONUS || 300) : 0;
    }

    function freeZone(zones) { return zones.indexOf(null); }

    /* ---------- Stämme (Tribes, z. B. Kröten/Konoha) ---------- */
    function tribeOf(x) { return cardOf(x).tribe || null; }
    // Liegt ein offenes eigenes Ninja mit Stamm `tribe` ODER id-Präfix `idPrefix` auf dem Feld?
    function tribeOnField(side, tribe, idPrefix, exceptZone) {
      for (let i = 0; i < 3; i++) {
        const m = pl(side).m[i];
        if (!m || i === exceptZone || m.mode === 'defdown') continue;
        if (m.effectsLocked >= E.state.turn) continue;
        if ((tribe && tribeOf(m) === tribe) || (idPrefix && m.id.indexOf(idPrefix) === 0)) return true;
      }
      return false;
    }

    /* ---------- Zerstören / Friedhof ---------- */
    function toGrave(side, x) {
      const c = cardOf(x);
      if (!c.token) pl(side).grave.push(x.id);
    }

    function destroyMonster(side, zi, why) {
      const p = pl(side);
      const m = p.m[zi];
      if (!m) return;
      if (m.protectEff && why !== 'battle') { // Schutz nur gegen Effekt-Zerstörung
        emit('protect', { side, zone: zi, id: m.id });
        log(cardOf(m).name + ' wird durch ein Jutsu geschützt!');
        return;
      }
      for (const s of p.st) {
        if (s && !s.faceDown && s.equipTo === zi) {
          toGrave(side, s);
          p.st[p.st.indexOf(s)] = null;
        }
      }
      p.m[zi] = null;
      toGrave(side, m);
      emit('destroy', { side, zone: zi, id: m.id, why });
      log(cardOf(m).name + ' wurde zerstört.');
      applyOnDestroyEffects(side, m, why);
    }

    function destroyST(side, zi) {
      const p = pl(side);
      const s = p.st[zi];
      if (!s) return;
      p.st[zi] = null;
      toGrave(side, s);
      emit('destroy-st', { side, zone: zi, id: s.id });
      log(cardOf(s).name + ' wurde zerstört.');
    }

    /* ---------- Verbannung (YGO REMOVED-Zone): umgeht Friedhof/on-destroy/revive ---------- */
    function toBanish(side, x) {
      const c = cardOf(x);
      if (!c.token) pl(side).banished.push(x.id); // Tokens hören einfach auf zu existieren
    }

    function banishMonster(side, zi, why) {
      const p = pl(side);
      const m = p.m[zi];
      if (!m) return;
      for (const s of p.st) { // Ausrüstungen darauf zerstören (Regel: Ziel weg → Equip weg)
        if (s && !s.faceDown && s.equipTo === zi) {
          toGrave(side, s);
          p.st[p.st.indexOf(s)] = null;
        }
      }
      p.m[zi] = null;
      toBanish(side, m);
      emit('banish', { side, zone: zi, id: m.id, why });
      log(cardOf(m).name + ' wurde verbannt!');
      // KEINE on-destroy-Effekte: Verbannung ist keine Zerstörung
    }

    /* ---------- LP ---------- */
    function damage(side, amount, why) {
      if (amount <= 0 || E.state.winner) return;
      const p = pl(side);
      p.lp = Math.max(0, p.lp - amount);
      emit('damage', { side, amount, lp: p.lp, why });
      log((side === 'P' ? 'Du erhältst' : 'Gegner erhält') + ' ' + amount + ' Schaden.');
      if (p.lp <= 0) setWinner(other(side), 'lp');
    }

    function heal(side, amount) {
      if (amount <= 0 || E.state.winner) return;
      const p = pl(side);
      p.lp += amount;
      emit('heal', { side, amount, lp: p.lp });
      log((side === 'P' ? 'Du erhältst' : 'Gegner erhält') + ' ' + amount + ' LP.');
    }

    function setWinner(w, reason) {
      if (E.state.winner) return;
      E.state.winner = w;
      E.state.winReason = reason;
      emit('win', { winner: w, reason });
    }

    /* ---------- Ziehen ---------- */
    function drawCards(side, n) {
      const p = pl(side);
      for (let i = 0; i < n; i++) {
        if (p.deck.length === 0) { setWinner(other(side), 'deckout'); return; }
        const id = p.deck.pop();
        p.hand.push(inst(id));
        emit('draw', { side, id: side === 'P' ? id : undefined });
      }
    }

    /* ---------- Spielaufbau ---------- */
    function mkPlayer(deckIds) {
      return {
        lp: NT.START_LP || 8000,
        deck: shuffle(deckIds.slice()),
        hand: [], grave: [], banished: [], // banished = Verbannung (YGO REMOVED-Zone)
        m: [null, null, null],
        st: [null, null, null],
        normalSummoned: false,
        attackLockTurns: 0, attackLocked: false, // Schwerter-Stil: n eigene Züge kein Angriff
      };
    }

    E.start = function () {
      E.state = {
        turn: 1, active: 'P', phase: 'main1',
        players: { P: mkPlayer(cfg.deckP), A: mkPlayer(cfg.deckA) },
        window: null, pendingAttack: null, battleEnded: false,
        winner: null, winReason: null, log: [],
      };
      UID = 1;
      drawCards('P', 4); drawCards('A', 4);
      if (E.state.winner) return E.state;
      beginTurn('P', true);
      return E.state;
    };

    /* ---------- Zug-Ablauf ---------- */
    function beginTurn(side, isFirst) {
      const st = E.state;
      st.active = side;
      st.battleEnded = false;
      const p = pl(side);
      p.normalSummoned = false;
      // Angriffs-Sperre (Schwerter-Stil): zählt die eigenen Züge des Gesperrten herunter
      if (p.attackLockTurns > 0) { p.attackLockTurns--; p.attackLocked = true; }
      else p.attackLocked = false;
      for (const m of p.m) {
        if (m) {
          const c = cardOf(m);
          m.attacksLeft = hasFx(c, 'double_attack') ? 2 : 1;
          m.posChanged = false;
        }
      }
      emit('turn', { side, n: st.turn });
      log(side === 'P' ? '— Dein Zug —' : '— Gegnerischer Zug —');
      if (!isFirst) {
        // Zieh-Phase
        if (p.deck.length === 0) { setWinner(other(side), 'deckout'); return; }
        drawCards(side, 1);
        log(side === 'P' ? 'Du ziehst 1 Karte.' : 'Gegner zieht 1 Karte.');
      }
      if (E.state.winner) return;
      st.phase = 'main1';
      emit('phase', { phase: 'main1', side });
      applyTurnStartEffects(side);
    }

    E.advance = function () {
      const st = E.state;
      if (st.winner) fail('Das Duell ist vorbei.');
      if (st.window) fail('Zuerst das offene Fenster beantworten.');
      const side = st.active;
      if (st.phase === 'main1') {
        if (st.turn === 1) {
          st.phase = 'main2';
          log('Im ersten Zug gibt es keine Kampfphase.');
        } else {
          st.phase = 'battle';
          log(side === 'P' ? 'Kampfphase! Wähle ein Ninja zum Angreifen.' : 'Gegner beginnt die Kampfphase.');
        }
        emit('phase', { phase: st.phase, side });
      } else if (st.phase === 'battle') {
        st.phase = 'main2';
        emit('phase', { phase: 'main2', side });
        log('Hauptphase 2.');
      } else if (st.phase === 'main2') {
        // Endphase: temporäre Zustände entfernen, geliehene Ninja zurückgeben
        for (let i = 0; i < 3; i++) {
          const m = pl(side).m[i];
          if (!m) continue;
          if (m.borrowedFrom) {
            const home = pl(m.borrowedFrom);
            pl(side).m[i] = null;
            if (!home.m[m.borrowedZone]) {
              home.m[m.borrowedZone] = m;
              m.borrowedFrom = null;
              emit('control-back', { side: other(side), zone: m.borrowedZone, id: m.id });
              log(cardOf(m).name + ' kehrt zum Besitzer zurück.');
            } else {
              toGrave(m.borrowedFrom, m);
              log(cardOf(m).name + ' geht auf den Friedhof.');
            }
            continue;
          }
          m.tempAtk = 0; m.tempPierce = false; m.tempDirect = false; m.protectEff = false; m.swapStats = false;
          if (m.limiterDies) { m.limiterDies = false; destroyMonster(side, i, 'effect'); continue; }
        }
        const p = pl(side);
        if (p.hand.length > 6) {
          st.window = { kind: 'discard', side, count: p.hand.length - 6 };
          emit('window', { kind: 'discard', side, count: st.window.count });
          log((side === 'P' ? 'Du hast' : 'Gegner hat') + ' zu viele Karten: ' + st.window.count + ' abwerfen.');
          return;
        }
        nextTurn();
      }
    };

    function nextTurn() {
      const st = E.state;
      st.turn++;
      beginTurn(other(st.active), false);
    }

    E.respondDiscard = function (handIdx) {
      const st = E.state;
      if (!st.window || st.window.kind !== 'discard') fail('Kein Abwurf nötig.');
      const side = st.window.side;
      const p = pl(side);
      const x = p.hand[handIdx];
      if (!x) fail('Ungültige Karte.');
      p.hand.splice(handIdx, 1);
      toGrave(side, x);
      emit('discard', { side, id: x.id });
      log(cardOf(x).name + ' wurde abgeworfen.');
      st.window.count--;
      if (st.window.count <= 0) {
        const resume = st.window.resume, resumeFx = st.window.resumeFx, zone = st.window.zone, fxT = st.window.fxT;
        st.window = null;
        if (resumeFx === 'mfx') applyMonsterFx(side, zone, fxT);
        else if (!resume) nextTurn(); // resume=true: Abwurf mitten im Zug (z. B. draw_discard)
      }
    };

    /* ---------- Beschwörungen ---------- */
    E.tributesNeeded = function (id) {
      const l = cardOf(id).level;
      return l >= 7 ? 2 : l >= 5 ? 1 : 0;
    };

    E.summon = function (side, handIdx, zone, opts) {
      opts = opts || {};
      const st = E.state, p = pl(side);
      if (st.winner) fail('Das Duell ist vorbei.');
      if (st.window) fail('Zuerst das offene Fenster beantworten.');
      if (st.active !== side) fail('Nicht dein Zug.');
      if (st.phase !== 'main1' && st.phase !== 'main2') fail('Nur in der Hauptphase beschwören.');
      const x = p.hand[handIdx];
      if (!x) fail('Ungültige Karte.');
      const c = cardOf(x);
      if (c.kind !== 'ninja') fail('Das ist kein Ninja.');
      if (p.normalSummoned) fail('Du hast diese Runde schon normal beschworen.');
      const need = E.tributesNeeded(x.id);
      const tribs = opts.tributes || [];
      if (tribs.length !== need) fail(need > 0 ? 'Du brauchst ' + need + ' Tribut(e).' : 'Dieses Ninja braucht kein Tribut.');
      for (const tz of tribs) if (!p.m[tz]) fail('Ungültiges Tribut.');
      if (c.tribeTribute) { // Stammes-Tribut (z. B. nur Kröten für den Kröten-König)
        for (const tz of tribs) {
          if (tribeOf(p.m[tz]) !== c.tribeTribute)
            fail('Als Tribut für ' + c.name + ' werden nur ' + (NT.TRIBE_NAMES[c.tribeTribute] || c.tribeTribute) + ' akzeptiert!');
        }
      }
      // Zielzone darf besetzt sein, wenn dort ein Tribut steht (wird gleich geopfert)
      if (p.m[zone] && tribs.indexOf(zone) === -1) fail('Zone ist besetzt.');
      // Tribute opfern
      for (const tz of tribs) {
        toGrave(side, p.m[tz]);
        emit('tribute', { side, zone: tz, id: p.m[tz].id });
        p.m[tz] = null;
      }
      if (p.m[zone]) fail('Zone ist besetzt.');
      p.hand.splice(handIdx, 1);
      const faceDown = !!opts.faceDown;
      p.m[zone] = Object.assign(x, {
        mode: faceDown ? 'defdown' : 'atk',
        summonedTurn: st.turn, atkMod: 0, defMod: 0, tempAtk: 0,
        tempPierce: false, attacksLeft: hasFx(c, 'double_attack') ? 2 : 1, posChanged: false, lockUntil: 0,
      });
      p.normalSummoned = true;
      if (faceDown) {
        emit('set-monster', { side, zone });
        log((side === 'P' ? 'Du setzt' : 'Gegner setzt') + ' ein Ninja verdeckt.');
      } else {
        emit('summon', { side, zone, id: x.id });
        log((side === 'P' ? 'Du beschwörst' : 'Gegner beschwört') + ' ' + c.name + '!');
        applySummonEffects(side, zone, true); // isNormal: „bei NORMALER Beschwörung"-Effekte
      }
      if (st.winner || st.window) return; // Pick-Fenster offen → Fallen-Fenster danach
      openSummonWindow(side, zone);
    };

    function specialSummon(side, id, zone, mode) {
      const p = pl(side);
      p.m[zone] = Object.assign(inst(id), {
        mode: mode || 'atk', summonedTurn: E.state.turn, atkMod: 0, defMod: 0,
        tempAtk: 0, tempPierce: false, attacksLeft: hasFx(cardOf(id), 'double_attack') ? 2 : 1, posChanged: false, lockUntil: 0,
      });
      emit('summon', { side, zone, id, special: true });
      log(cardOf(id).name + ' spezial-beschworen!');
      applySummonEffects(side, zone);
    }

    E.flipSummon = function (side, zone) {
      const st = E.state, p = pl(side);
      if (st.window) fail('Zuerst das offene Fenster beantworten.');
      if (st.active !== side) fail('Nicht dein Zug.');
      if (st.phase !== 'main1' && st.phase !== 'main2') fail('Nur in der Hauptphase.');
      const m = p.m[zone];
      if (!m || m.mode !== 'defdown') fail('Kein verdecktes Ninja.');
      if (m.summonedTurn === st.turn) fail('Nicht im Setz-Zug umdrehen.');
      m.mode = 'atk';
      m.posChanged = true;
      emit('flip', { side, zone, id: m.id });
      log(cardOf(m).name + ' wurde aufgedeckt!');
      applyFlipEffect(side, zone);
      if (st.winner || st.window) return;
      openSummonWindow(side, zone);
    };

    E.changePos = function (side, zone) {
      const st = E.state, p = pl(side);
      if (st.window) fail('Zuerst das offene Fenster beantworten.');
      if (st.active !== side) fail('Nicht dein Zug.');
      if (st.phase !== 'main1' && st.phase !== 'main2') fail('Nur in der Hauptphase.');
      const m = p.m[zone];
      if (!m) fail('Kein Ninja.');
      if (m.mode === 'defdown') fail('Verdeckte Ninja nur per Flip-Beschwörung aufdecken.');
      if (m.summonedTurn === st.turn) fail('Nicht im Beschwörungszug möglich.');
      if (m.posChanged) fail('Position wurde schon geändert.');
      m.mode = m.mode === 'atk' ? 'defup' : 'atk';
      m.posChanged = true;
      emit('pos', { side, zone, mode: m.mode });
      log(cardOf(m).name + ': ' + (m.mode === 'atk' ? 'Angriffs-' : 'Verteidigungs-') + 'position.');
    };

    /* ---------- Pick-Fenster (Wahl aus Friedhof/Deck) ---------- */
    function openPickWindow(side, pc) {
      const st = E.state;
      const p = pl(side);
      let pool = (pc.from === 'grave' ? p.grave.slice() : p.deck.slice()).filter((id) => {
        const c = cardOf(id);
        if (c.token) return false;
        if (pc.kind2 && c.kind !== pc.kind2) return false;
        if (pc.maxLevel && (c.level || 0) > pc.maxLevel) return false;
        if (pc.maxAtk && (c.atk || 0) > pc.maxAtk) return false;
        if (pc.tribe && c.tribe !== pc.tribe) return false;
        if (pc.idPrefix && id.indexOf(pc.idPrefix) !== 0) return false;
        return true;
      });
      if (!pool.length) return false;
      st.window = { kind: 'pick', side, from: pc.from, pool, why: pc.why, then: pc.then };
      emit('window', { kind: 'pick', side, from: pc.from, why: pc.why });
      return true;
    }

    E.listPick = function () {
      const w = E.state.window;
      return w && w.kind === 'pick' ? w.pool.slice() : [];
    };

    E.respondPick = function (id) {
      const st = E.state;
      if (!st.window || st.window.kind !== 'pick') fail('Keine Auswahl offen.');
      const w = st.window;
      const side = w.side, p = pl(side);
      if (w.pool.indexOf(id) === -1) fail('Diese Karte steht nicht zur Auswahl.');
      if (w.from === 'grave') p.grave.splice(p.grave.indexOf(id), 1);
      else { p.deck.splice(p.deck.indexOf(id), 1); shuffle(p.deck); }
      const then = w.then;
      st.window = null;
      if (then.fx === 'search') {
        p.hand.push(inst(id));
        emit('search', { side, id: side === 'P' ? id : undefined });
        log(cardOf(id).name + ' wurde auf die Hand genommen.');
      } else if (then.fx === 'recycle') {
        p.deck.push(id); shuffle(p.deck);
        log(cardOf(id).name + ' wurde ins Deck gemischt.');
      } else if (then.fx === 'foolish') {
        p.grave.push(id);
        log(cardOf(id).name + ' wurde auf den Friedhof gelegt.');
      } else { // 'revive' / 'summon_from' → Spezialbeschwörung
        const z = freeZone(p.m);
        if (z === -1) { toGrave(side, { id }); log('Keine freie Zone — ' + cardOf(id).name + ' geht auf den Friedhof.'); }
        else specialSummon(side, id, z);
      }
    };

    // Konkrete Karte aus Deck/Friedhof holen (für summon_from mit fester id / per_turn)
    function takeFromSource(side, id, from) {
      const p = pl(side);
      const tryPile = (pile, isDeck) => {
        const ix = pile.indexOf(id);
        if (ix === -1) return false;
        pile.splice(ix, 1);
        if (isDeck) shuffle(pile);
        return true;
      };
      if (from === 'grave') return tryPile(p.grave, false);
      if (from === 'deck') return tryPile(p.deck, true);
      return tryPile(p.grave, false) || tryPile(p.deck, true); // 'any'
    }

    /* ---------- Effekte bei Beschwörung ---------- */
    function strongestZone(side) {
      const p = pl(side);
      let best = -1, bv = -1;
      for (let i = 0; i < 3; i++) {
        if (p.m[i]) { const v = effAtk(side, i); if (v > bv) { bv = v; best = i; } }
      }
      return best;
    }
    function weakestZone(side) {
      const p = pl(side);
      let best = -1, bv = Infinity;
      for (let i = 0; i < 3; i++) {
        if (p.m[i]) { const v = effAtk(side, i); if (v < bv) { bv = v; best = i; } }
      }
      return best;
    }

    function applySummonEffects(side, zone, isNormal) {
      const m = pl(side).m[zone];
      if (!m) return;
      const foe = other(side);
      for (const ef of cardOf(m).effects) {
        if (E.state.winner || E.state.window) return; // Pick-Fenster pausiert die Kette
        switch (ef.t) {
          case 'on_normal_search_jutsu': { // nur bei NORMALER Beschwörung (kind2 wählbar: jutsu/falle)
            if (!isNormal) break;
            const k2 = ef.kind2 || 'jutsu';
            openPickWindow(side, { from: 'deck', kind2: k2,
              why: cardOf(m).name + ': ' + (k2 === 'falle' ? 'Falle' : 'Jutsu') + ' für deine Hand wählen', then: { fx: 'search' } });
            break;
          }
          case 'token': {
            for (let i = 0; i < (ef.n || 1); i++) {
              const z = freeZone(pl(side).m);
              if (z === -1) break;
              if (z === zone) continue;
              const tokId = ef.id || 'kage_token';
              pl(side).m[z] = Object.assign(inst(tokId), {
                mode: 'atk', summonedTurn: E.state.turn, atkMod: 0, defMod: 0,
                tempAtk: 0, tempPierce: false, attacksLeft: 1, posChanged: false, lockUntil: 0,
              });
              emit('summon', { side, zone: z, id: tokId, special: true });
              log(cardOf(tokId).name + ' erscheint!');
            }
            break;
          }
          case 'def_boost_ally_on_summon': { // Sakura: schwächstes verbündetes Ninja +VERT dauerhaft
            let bz = -1, low = Infinity;
            for (let i = 0; i < 3; i++) {
              if (i === zone || !pl(side).m[i]) continue;
              const dv = effDef(side, i);
              if (dv < low) { low = dv; bz = i; }
            }
            if (bz >= 0) {
              pl(side).m[bz].defMod += ef.v || 0;
              emit('buff', { side, zone: bz, v: ef.v || 0 });
              log(cardOf(pl(side).m[bz]).name + ' wird beschützt: +' + (ef.v || 0) + ' VERT dauerhaft!');
            }
            break;
          }
          case 'dmg_on_summon': damage(foe, ef.v, 'effect'); break;
          case 'heal_on_summon': heal(side, ef.v); break;
          case 'draw_on_summon': drawCards(side, ef.n || 1); break;
          case 'boost_self_on_summon': m.atkMod += ef.v; emit('buff', { side, zone, v: ef.v }); break;
          case 'boost_all_on_summon':
            for (let i = 0; i < 3; i++) if (pl(side).m[i]) { pl(side).m[i].atkMod += ef.v; emit('buff', { side, zone: i, v: ef.v }); }
            break;
          case 'weaken_on_summon': {
            const z = strongestZone(foe);
            if (z >= 0) {
              const fm = pl(foe).m[z];
              fm.atkMod -= Math.min(effAtk(foe, z), ef.v);
              emit('debuff', { side: foe, zone: z, v: ef.v });
              log(cardOf(fm).name + ' verliert ' + ef.v + ' ATK.');
            }
            break;
          }
          case 'destroy_weakest_on_summon': { const z = weakestZone(foe); if (z >= 0) destroyMonster(foe, z, 'effect'); break; }
          case 'destroy_strongest_on_summon': { const z = strongestZone(foe); if (z >= 0) destroyMonster(foe, z, 'effect'); break; }
          case 'destroy_st_on_summon': {
            let left = ef.n || 1;
            while (left-- > 0) {
              const occ = pl(foe).st.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
              if (!occ.length) break;
              destroyST(foe, occ[Math.floor(rng() * occ.length)]);
            }
            break;
          }
          case 'summon_from': { // „Wenn A beschworen wird: beschwöre B"
            if (freeZone(pl(side).m) === -1) break;
            if (ef.id) { // konkrete Karte, automatisch
              if (takeFromSource(side, ef.id, ef.from || 'any')) {
                specialSummon(side, ef.id, freeZone(pl(side).m));
                log(cardOf(m).name + ' ruft ' + cardOf(ef.id).name + '!');
              }
            } else { // Kategorie → Pick-Fenster
              openPickWindow(side, { from: ef.from === 'grave' ? 'grave' : 'deck', kind2: 'ninja', maxLevel: ef.maxLevel,
                why: cardOf(m).name + ': Ninja zur Spezialbeschwörung wählen', then: { fx: 'summon_from' } });
            }
            break;
          }
        }
      }
      // Lehrer-Reaktion (Iruka): offene eigene Ninja mit ally_summon_draw ziehen,
      // wenn ein passender Stammes-Ninja beschworen wurde (nicht der Beschworene selbst)
      if (!E.state.winner) {
        const sc = cardOf(m);
        for (let i = 0; i < 3; i++) {
          if (i === zone) continue;
          const om = pl(side).m[i];
          if (!om || om.mode === 'defdown') continue;
          if ((om.effectsLocked || 0) >= E.state.turn) continue;
          for (const ef of cardOf(om).effects) {
            if (ef.t !== 'ally_summon_draw') continue;
            const match = (ef.tribe && sc.tribe === ef.tribe) || (ef.idPrefix && m.id.indexOf(ef.idPrefix) === 0);
            if (match) {
              drawCards(side, ef.n || 1);
              log(cardOf(om).name + ' treibt den Unterricht voran: ' + (ef.n || 1) + ' Karte gezogen!');
            }
          }
        }
      }
    }

    /* ---------- Effekte bei Zerstörung ---------- */
    function applyOnDestroyEffects(side, m, why) {
      const c = cardOf(m);
      for (const ef of c.effects) {
        if (E.state.winner || E.state.window) return;
        switch (ef.t) {
          case 'on_battle_destroy_summon': { // Gama: nur bei Zerstörung durch KAMPF
            if (why !== 'battle') break;
            if (freeZone(pl(side).m) < 0) break;
            if (takeFromSource(side, ef.id, 'deck')) {
              specialSummon(side, ef.id, freeZone(pl(side).m));
              log(c.name + ' ruft im letzten Atemzug ' + cardOf(ef.id).name + '!');
            }
            break;
          }
          case 'on_destroy_summon':
            if (freeZone(pl(side).m) >= 0) {
              openPickWindow(side, { from: 'deck', kind2: 'ninja', maxLevel: ef.maxLevel,
                why: c.name + ': Ersatz-Ninja wählen', then: { fx: 'summon_from' } });
            }
            break;
          case 'on_destroy_draw': drawCards(side, ef.n || 1); log(c.name + ': Letzter Wille — Karte ziehen.'); break;
          case 'on_destroy_heal': heal(side, ef.v); break;
          case 'on_destroy_search': // Sangan-Pendant: Ninja ≤ maxAtk aus dem Deck auf die Hand
            openPickWindow(side, { from: 'deck', kind2: 'ninja', maxAtk: ef.maxAtk || 1500,
              why: c.name + ': Ninja für deine Hand wählen', then: { fx: 'search' } });
            break;
        }
      }
    }

    /* ---------- Effekte zu Zugbeginn (Generatoren) ---------- */
    function applyTurnStartEffects(side) {
      // self_revive (Treeborn-Frog-Pendant): aus dem Friedhof selbst beschwören,
      // solange keine eigenen Jutsu/Fallen liegen und eine Zone frei ist
      {
        const p = pl(side);
        const stClear = !p.st.some(Boolean);
        if (stClear) {
          for (const id of p.grave.slice()) {
            if (E.state.winner || E.state.window) return;
            const c = cardOf(id);
            if (!hasFx(c, 'self_revive') || freeZone(p.m) === -1) continue;
            p.grave.splice(p.grave.indexOf(id), 1);
            specialSummon(side, id, freeZone(p.m));
            log(c.name + ' kehrt aus dem Friedhof zurück!');
          }
        }
      }
      for (let zi = 0; zi < 3; zi++) {
        const m = pl(side).m[zi];
        if (!m || m.mode === 'defdown') continue;
        if (m.effectsLocked >= E.state.turn) continue; // Kröten-Magen: Effekte gesperrt
        for (const ef of cardOf(m).effects) {
          if (E.state.winner || E.state.window) return;
          if (ef.t === 'per_turn_summon' && freeZone(pl(side).m) >= 0) {
            if (ef.from === 'token') {
              specialSummon(side, ef.id, freeZone(pl(side).m));
            } else if (takeFromSource(side, ef.id, ef.from || 'deck')) {
              specialSummon(side, ef.id, freeZone(pl(side).m));
              log(cardOf(m).name + ' beschwört ' + cardOf(ef.id) + '!');
            }
          }
        }
      }
    }

    function applyFlipEffect(side, zone) {
      const m = pl(side).m[zone];
      if (!m) return;
      for (const ef of cardOf(m).effects) {
        if (ef.t === 'flip_draw') {
          drawCards(side, ef.n || 1);
          log(cardOf(m).name + ': FLIP-Effekt — Karte ziehen.');
        }
      }
    }

    /* ---------- Jutsu / Falle setzen & aktivieren ---------- */
    E.setST = function (side, handIdx, zone) {
      const st = E.state, p = pl(side);
      if (st.window) fail('Zuerst das offene Fenster beantworten.');
      if (st.active !== side) fail('Nicht dein Zug.');
      if (st.phase !== 'main1' && st.phase !== 'main2') fail('Nur in der Hauptphase setzen.');
      const x = p.hand[handIdx];
      if (!x) fail('Ungültige Karte.');
      const c = cardOf(x);
      if (c.kind !== 'jutsu' && c.kind !== 'falle') fail('Nur Jutsu oder Fallen.');
      if (p.st[zone]) fail('Zone ist besetzt.');
      p.hand.splice(handIdx, 1);
      p.st[zone] = Object.assign(x, { faceDown: true, setTurn: st.turn, equipTo: null });
      emit('set-st', { side, zone });
      log((side === 'P' ? 'Du setzt' : 'Gegner setzt') + ' eine Karte.');
    };

    // Welche Zielart braucht ein Jutsu? (für UI & KI)
    E.targetRequirement = function (card) {
      const ef = card.effect;
      switch (ef.t) {
        case 'boost_temp': case 'boost_perm': case 'equip':
        case 'protect': case 'grant_double_attack': case 'direct_attack':
        case 'limiter': case 'swap_stats':
        case 'bounce_own': return 'ownMonster';
        case 'destroy_monster_max': case 'destroy_any_monster':
        case 'destroy_defense_monster': case 'pos_change':
        case 'banish_monster': case 'lock_monster': case 'weaken_monster':
        case 'bounce': case 'control': return 'enemyMonster';
        case 'flip_down': return 'anyMonster';
        case 'swap_control': return 'swapPair';
        case 'destroy_st': return 'enemyST';
        case 'sp_summon_hand': return 'handNinja';
        case 'sp_summon_hand_tribe': return 'handTribe';
        default: return null;
      }
    };

    E.listTargets = function (side, card, req) {
      const foe = other(side);
      const out = [];
      if (req === 'ownMonster') {
        for (let i = 0; i < 3; i++) if (pl(side).m[i]) out.push(i);
      } else if (req === 'enemyMonster') {
        const ef = card.effect;
        for (let i = 0; i < 3; i++) {
          const m = pl(foe).m[i];
          if (!m) continue;
          if (ef.t === 'destroy_monster_max' && effAtk(foe, i) > ef.maxAtk) continue;
          if (ef.t === 'destroy_defense_monster' && m.mode === 'atk') continue;
          out.push(i);
        }
      } else if (req === 'enemyST') {
        for (let i = 0; i < 3; i++) if (pl(foe).st[i]) out.push(i);
      } else if (req === 'anyMonster') {
        // kodiert: eigene Zonen 0–2, gegnerische 3–5 (nur offene, keine Tokens)
        for (const s of [side, foe]) {
          for (let i = 0; i < 3; i++) {
            const m = pl(s).m[i];
            if (m && m.mode !== 'defdown' && !cardOf(m).token) out.push((s === side ? 0 : 3) + i);
          }
        }
      } else if (req === 'swapPair') {
        if (pl(side).m.some(Boolean) && pl(foe).m.some(Boolean)) out.push(1); // Marker: beidseitig belegt
      } else if (req === 'handNinja') {
        for (let i = 0; i < pl(side).hand.length; i++) {
          const c = cardOf(pl(side).hand[i]);
          if (c.kind === 'ninja' && !c.token && c.level <= card.effect.maxLevel) out.push(i);
        }
      } else if (req === 'handTribe') {
        for (let i = 0; i < pl(side).hand.length; i++) {
          const c = cardOf(pl(side).hand[i]);
          if (c.kind === 'ninja' && !c.token && c.tribe === card.effect.tribe) out.push(i);
        }
      }
      return out;
    };

    function checkSpellConditions(side, card, opts) {
      const ef = card.effect;
      const st = E.state, p = pl(side), foe = other(side);
      const req = E.targetRequirement(card);
      opts = opts || {};
      if (ef.t === 'token' && freeZone(p.m) === -1) fail('Keine freie Ninja-Zone.');
      if (ef.t === 'sp_summon_hand' && freeZone(p.m) === -1) fail('Keine freie Ninja-Zone.');
      if (ef.t === 'control' && freeZone(p.m) === -1) fail('Keine freie Ninja-Zone.');
      if (ef.t === 'revive') {
        if (freeZone(p.m) === -1) fail('Keine freie Ninja-Zone.');
        if (!p.grave.some((id) => cardOf(id).kind === 'ninja' && !cardOf(id).token)) fail('Kein Ninja im Friedhof.');
      }
      if (ef.t === 'search') {
        const k2 = ef.kind2 || 'ninja';
        if (!p.deck.some((id) => cardOf(id).kind === k2 && !cardOf(id).token &&
          (!ef.maxLevel || (cardOf(id).level || 0) <= ef.maxLevel) &&
          (!ef.tribe || cardOf(id).tribe === ef.tribe) &&
          (!ef.idPrefix || id.indexOf(ef.idPrefix) === 0)))
          fail('Keine passende Karte im Deck.');
      }
      if (ef.t === 'drain' && !pl(foe).m.some(Boolean)) fail('Der Gegner hat keine Ninja.');
      if (ef.t === 'draw_per_monster' && !p.m.some(Boolean)) fail('Du hast keine Ninja auf dem Feld.');
      if (ef.costLP && p.lp <= ef.costLP) fail('Nicht genug LP für die Kosten.');
      if (req && req !== 'swapPair') {
        const valid = E.listTargets(side, card, req);
        let idx = req === 'ownMonster' || req === 'handNinja' ? opts.targetZone : opts.targetZone;
        if (req === 'handNinja' || req === 'handTribe') idx = opts.selectHandIdx;
        if (valid.length === 0) fail('Kein gültiges Ziel.');
        if (idx === undefined || idx === null || valid.indexOf(idx) === -1) fail('Ungültiges Ziel.');
      }
      if (ef.t === 'destroy_all_enemy') {
        if (!pl(other(side)).m.some(Boolean)) fail('Der Gegner hat keine Ninja.');
      }
      if (ef.t === 'foolish') {
        if (!p.deck.some((id) => cardOf(id).kind === 'ninja' && !cardOf(id).token)) fail('Kein Ninja im Deck.');
      }
      if (req === 'swapPair') {
        if (!pl(side).m.some(Boolean) || !pl(other(side)).m.some(Boolean)) fail('Beide Seiten brauchen ein Ninja.');
        if (!pl(side).m[opts.ownZone]) fail('Ungültiges eigenes Ninja.');
        if (!pl(other(side)).m[opts.targetZone]) fail('Ungültiges gegnerisches Ninja.');
      }
      if (ef.t === 'equip' && ef.tribeId) { // Ausrüstung nur für eine bestimmte Karte (Rasengan→Jiraiya)
        const tm = p.m[opts.targetZone];
        if (!tm || tm.id !== ef.tribeId) fail('Diese Ausrüstung passt nur auf ' + cardOf(ef.tribeId).name + '.');
      }
    }

    E.activateSpell = function (side, handIdx, opts) {
      const st = E.state, p = pl(side);
      if (st.window) fail('Zuerst das offene Fenster beantworten.');
      if (st.active !== side) fail('Nicht dein Zug.');
      const x = p.hand[handIdx];
      if (!x) fail('Ungültige Karte.');
      const c = cardOf(x);
      if (c.kind !== 'jutsu') fail('Das ist kein Jutsu.');
      const inMain = st.phase === 'main1' || st.phase === 'main2';
      if (c.sub === 'normal' && !inMain) fail('Normale Jutsus nur in der Hauptphase.');
      if (c.sub === 'equip' && !inMain) fail('Ausrüstungen nur in der Hauptphase.');
      if (c.sub === 'schnell' && !inMain && st.phase !== 'battle') fail('Hier nicht aktivierbar.');
      checkSpellConditions(side, c, opts);
      // Hand-Zielindex an das gleich folgende Entfernen des Jutsus anpassen
      if (opts && typeof opts.selectHandIdx === 'number' && opts.selectHandIdx > handIdx) opts.selectHandIdx--;
      if (c.sub === 'equip') {
        const z = freeZone(p.st);
        if (z === -1) fail('Keine freie Jutsu-Zone.');
        p.hand.splice(handIdx, 1);
        p.st[z] = Object.assign(x, { faceDown: false, setTurn: st.turn, equipTo: opts.targetZone });
        emit('activate', { side, id: x.id, zone: z });
        log(c.name + ' an ' + cardOf(p.m[opts.targetZone]).name + ' ausgerüstet.');
        return;
      }
      if (c.sub === 'dauer') { // Dauer-Karte (Feld-Karte): bleibt offen liegen
        const z = freeZone(p.st);
        if (z === -1) fail('Keine freie Jutsu-Zone.');
        p.hand.splice(handIdx, 1);
        p.st[z] = Object.assign(x, { faceDown: false, setTurn: st.turn, equipTo: null, continuous: true });
        emit('activate', { side, id: x.id, zone: z });
        log(c.name + ' liegt jetzt dauerhaft offen!');
        return;
      }
      p.hand.splice(handIdx, 1);
      emit('activate', { side, id: x.id });
      log((side === 'P' ? 'Du aktivierst' : 'Gegner aktiviert') + ' ' + c.name + '!');
      // Konter-Falle des Gegners? (Trigger 'jutsu')
      if (E.validTraps(other(side), 'jutsu', {}).length) {
        st.window = { kind: 'trap', side: other(side), reason: 'jutsu', ctx: { spellSide: side, spellInst: x, opts: opts || {} } };
        emit('window', { kind: 'trap', side: other(side), reason: 'jutsu' });
        return;
      }
      resolveSpell(side, c, opts);
      if (!E.state.winner) toGrave(side, x);
    };

    E.activateSet = function (side, zone, opts) {
      const st = E.state, p = pl(side);
      if (st.window) fail('Zuerst das offene Fenster beantworten.');
      if (st.active !== side) fail('Nicht dein Zug.');
      const s = p.st[zone];
      if (!s || !s.faceDown) fail('Keine gesetzte Karte.');
      const c = cardOf(s);
      if (c.kind === 'falle') fail('Fallen werden automatisch bei ihrem Auslöser aktiviert.');
      if (c.sub === 'schnell' && s.setTurn === st.turn) fail('Schnell-Jutsu nicht im Setz-Zug aktivierbar.');
      const inMain = st.phase === 'main1' || st.phase === 'main2';
      if (c.sub === 'normal' && !inMain) fail('Nur in der Hauptphase.');
      if (c.sub === 'schnell' && !inMain && st.phase !== 'battle') fail('Hier nicht aktivierbar.');
      checkSpellConditions(side, c, opts);
      p.st[zone] = null;
      s.faceDown = false;
      if (c.sub === 'dauer') { // gesetzte Dauer-Karte wird einfach aufgedeckt (bleibt liegen)
        s.continuous = true;
        p.st[zone] = s;
        emit('activate', { side, id: s.id, zone });
        log((side === 'P' ? 'Du aktivierst' : 'Gegner aktiviert') + ' ' + c.name + ' — sie liegt jetzt dauerhaft offen!');
        return;
      }
      emit('activate', { side, id: s.id, zone });
      log((side === 'P' ? 'Du aktivierst' : 'Gegner aktiviert') + ' ' + c.name + '!');
      // Konter-Falle des Gegners? (Trigger 'jutsu')
      if (E.validTraps(other(side), 'jutsu', {}).length) {
        st.window = { kind: 'trap', side: other(side), reason: 'jutsu', ctx: { spellSide: side, spellInst: s, opts: opts || {} } };
        emit('window', { kind: 'trap', side: other(side), reason: 'jutsu' });
        return;
      }
      resolveSpell(side, c, opts);
      toGrave(side, s);
    };

    function resolveSpell(side, c, opts) {
      const ef = c.effect, foe = other(side), p = pl(side);
      switch (ef.t) {
        case 'dmg': damage(foe, ef.v, 'jutsu'); break;
        case 'heal': heal(side, ef.v); break;
        case 'draw': drawCards(side, ef.n); if (ef.heal) heal(side, ef.heal); break;
        case 'draw_per_monster': {
          const n = Math.min(ef.cap || 2, p.m.filter(Boolean).length);
          if (n > 0) drawCards(side, n);
          break;
        }
        case 'token': {
          for (let i = 0; i < (ef.n || 1); i++) {
            const z = freeZone(p.m);
            if (z === -1) break;
            specialSummon(side, ef.id || 'kage_token', z);
          }
          break;
        }
        case 'sp_summon_hand': {
          const hx = p.hand[opts.selectHandIdx];
          p.hand.splice(opts.selectHandIdx, 1);
          specialSummon(side, hx.id, freeZone(p.m));
          break;
        }
        case 'boost_temp': {
          const m = p.m[opts.targetZone];
          m.tempAtk += ef.v;
          if (ef.piercing) m.tempPierce = true;
          emit('buff', { side, zone: opts.targetZone, v: ef.v });
          log(cardOf(m).name + ' +' + ef.v + ' ATK bis Zugende.');
          if (ef.heal) heal(side, ef.heal);
          break;
        }
        case 'boost_perm': {
          damage(side, ef.costLP, 'cost');
          const m = p.m[opts.targetZone];
          m.atkMod += ef.v;
          emit('buff', { side, zone: opts.targetZone, v: ef.v });
          log(cardOf(m).name + ' erhält dauerhaft +' + ef.v + ' ATK!');
          break;
        }
        case 'destroy_monster_max':
        case 'destroy_any_monster':
        case 'destroy_defense_monster':
          destroyMonster(foe, opts.targetZone, 'jutsu');
          if (ef.dmg) damage(foe, ef.dmg, 'jutsu');
          break;
        case 'destroy_all_enemy': {
          damage(side, ef.costLP, 'cost');
          for (let i = 0; i < 3; i++) if (pl(foe).m[i]) destroyMonster(foe, i, 'jutsu');
          break;
        }
        case 'destroy_st': destroyST(foe, opts.targetZone); break;
        case 'pos_change': {
          const m = pl(foe).m[opts.targetZone];
          m.mode = 'defup';
          emit('pos', { side: foe, zone: opts.targetZone, mode: 'defup', reveal: m.mode });
          log(cardOf(m).name + ' wurde in Verteidigungsposition gebracht.');
          break;
        }
        /* ----- Strategische Jutsus ----- */
        case 'search':
          openPickWindow(side, { from: 'deck', kind2: ef.kind2 || 'ninja', maxLevel: ef.maxLevel, tribe: ef.tribe, idPrefix: ef.idPrefix,
            why: (ef.kind2 === 'falle' ? 'Falle' : ef.kind2 === 'jutsu' ? 'Jutsu' : 'Ninja') + ' für deine Hand wählen', then: { fx: 'search' } });
          break;
        case 'revive':
          openPickWindow(side, { from: 'grave', kind2: 'ninja',
            why: 'Ninja zur Wiederbelebung wählen', then: { fx: 'revive' } });
          break;
        case 'recycle':
          openPickWindow(side, { from: 'grave',
            why: 'Karte für dein Deck wählen', then: { fx: 'recycle' } });
          break;
        case 'bounce': {
          const z = opts.targetZone;
          const fm = pl(foe).m[z];
          for (const s of pl(foe).st) { // Ausrüstungen darauf zerstören
            if (s && !s.faceDown && s.equipTo === z) { toGrave(foe, s); pl(foe).st[pl(foe).st.indexOf(s)] = null; }
          }
          pl(foe).m[z] = null;
          pl(foe).hand.push(inst(fm.id));
          emit('bounce', { side: foe, zone: z, id: fm.id });
          log(cardOf(fm).name + ' kehrt auf die gegnerische Hand zurück!');
          break;
        }
        case 'bounce_own': {
          const z = opts.targetZone;
          const m = p.m[z];
          p.m[z] = null;
          p.hand.push(inst(m.id));
          emit('bounce', { side, zone: z, id: m.id });
          log(cardOf(m).name + ' kehrt auf deine Hand zurück.');
          if (ef.heal) heal(side, ef.heal);
          break;
        }
        case 'control': {
          const z = opts.targetZone;
          const fm = pl(foe).m[z];
          for (const s of pl(foe).st) { // Ausrüstungen darauf zerstören (Regel: Ziel verlässt die Seite)
            if (s && !s.faceDown && s.equipTo === z) { toGrave(foe, s); pl(foe).st[pl(foe).st.indexOf(s)] = null; }
          }
          pl(foe).m[z] = null;
          fm.borrowedFrom = foe; fm.borrowedZone = z;
          fm.tempAtk = 0; fm.tempPierce = false; fm.attacksLeft = 1; fm.posChanged = true;
          const nz = freeZone(p.m);
          p.m[nz] = fm;
          emit('control', { side, zone: nz, from: z, id: fm.id });
          log(cardOf(fm).name + ' wird bis Zugende übernommen!');
          break;
        }
        case 'protect': {
          const m = p.m[opts.targetZone];
          m.protectEff = true;
          emit('buff', { side, zone: opts.targetZone, v: 0 });
          log(cardOf(m).name + ' ist diesen Zug vor Effekt-Zerstörung geschützt.');
          break;
        }
        case 'grant_double_attack': {
          const m = p.m[opts.targetZone];
          m.attacksLeft = 2;
          emit('buff', { side, zone: opts.targetZone, v: 0 });
          log(cardOf(m).name + ' greift in diesem Zug zweimal an!');
          break;
        }
        case 'direct_attack': {
          const m = p.m[opts.targetZone];
          m.tempDirect = true;
          emit('buff', { side, zone: opts.targetZone, v: 0 });
          log(cardOf(m).name + ' darf in diesem Zug direkt angreifen!');
          break;
        }
        case 'drain': {
          const z = strongestZone(foe);
          const v = Math.ceil(effAtk(foe, z) / 2);
          damage(foe, v, 'jutsu');
          heal(side, v);
          log('Chakra-Absorption: ' + v + ' LP gestohlen.');
          break;
        }
        case 'mill': {
          const fp = pl(foe);
          const n = Math.min(ef.n || 3, fp.deck.length);
          for (let i = 0; i < n; i++) fp.grave.push(fp.deck.pop());
          emit('mill', { side: foe, n });
          log('Gegner legt die obersten ' + n + ' Karten auf den Friedhof.');
          break;
        }
        case 'draw_discard': {
          drawCards(side, ef.draw || 2);
          if (!E.state.winner && pl(side).hand.length) {
            E.state.window = { kind: 'discard', side, count: ef.discard || 1, resume: true };
            emit('window', { kind: 'discard', side, count: E.state.window.count });
          }
          break;
        }
        case 'weaken_all': {
          for (let i = 0; i < 3; i++) {
            const fm = pl(foe).m[i];
            if (fm) {
              fm.atkMod -= Math.min(effAtk(foe, i), ef.v);
              emit('debuff', { side: foe, zone: i, v: ef.v });
            }
          }
          log('Alle gegnerischen Ninja verlieren dauerhaft ' + ef.v + ' ATK.');
          break;
        }
        /* ----- YGO-Staples (neu) ----- */
        case 'destroy_all_st_enemy': { // Harpie's Feather Duster
          for (let i = 0; i < 3; i++) if (pl(foe).st[i]) destroyST(foe, i);
          log('Alle gegnerischen Jutsu- und Fallenkarten wurden zerstört!');
          break;
        }
        case 'bounce_all_st': { // Giant Trunade: alles zurück auf die Hand
          for (const s of [side, foe]) {
            for (let i = 0; i < 3; i++) {
              const x = pl(s).st[i];
              if (x) { pl(s).st[i] = null; pl(s).hand.push(inst(x.id)); emit('bounce', { side: s, zone: i, id: x.id, st: true }); }
            }
          }
          log('Alle Jutsu- und Fallenkarten kehren auf die Hand zurück!');
          break;
        }
        case 'flip_down': { // Book of Moon: offenes Ninja verdeckt legen (Tokens immun)
          const tz = opts.targetZone;
          const ts = tz < 3 ? side : foe, z = tz % 3;
          const m = pl(ts).m[z];
          if (!m || m.mode === 'defdown' || cardOf(m).token) break;
          for (const s of pl(ts).st) { // Ausrüstungen verfallen per Regel
            if (s && !s.faceDown && s.equipTo === z) { toGrave(ts, s); pl(ts).st[pl(ts).st.indexOf(s)] = null; }
          }
          m.mode = 'defdown'; m.posChanged = true;
          emit('pos', { side: ts, zone: z, mode: 'defdown' });
          log(cardOf(m).name + ' wurde verdeckt gelegt!');
          break;
        }
        case 'swap_control': { // Creature Swap: dauerhafter Tausch
          const mine = p.m[opts.ownZone], theirs = pl(foe).m[opts.targetZone];
          if (!mine || !theirs) break;
          for (const mm of [mine, theirs]) {
            mm.tempAtk = 0; mm.tempPierce = false; mm.tempDirect = false;
            mm.posChanged = true; mm.borrowedFrom = null;
          }
          p.m[opts.ownZone] = theirs; pl(foe).m[opts.targetZone] = mine;
          emit('control', { side, zone: opts.ownZone, from: opts.targetZone, id: theirs.id, swap: true });
          emit('control', { side: foe, zone: opts.targetZone, from: opts.ownZone, id: mine.id, swap: true });
          log(cardOf(mine).name + ' und ' + cardOf(theirs).name + ' tauschen die Seiten!');
          break;
        }
        case 'limiter': { // Limiter Removal: ANG verdoppeln, am Zugende zerstört
          const z = opts.targetZone;
          const m = p.m[z];
          m.tempAtk += effAtk(side, z);
          m.limiterDies = true;
          emit('buff', { side, zone: z, v: m.tempAtk });
          log(cardOf(m).name + ': ANG verdoppelt — aber die Last zerstört es am Zugende!');
          break;
        }
        case 'attack_lock': { // Swords of Revealing Light
          pl(foe).attackLockTurns = ef.turns || 2;
          for (let i = 0; i < 3; i++) { // verdeckte gegnerische Ninja aufdecken (ohne Flip-Effekte)
            const fm = pl(foe).m[i];
            if (fm && fm.mode === 'defdown') { fm.mode = 'defup'; emit('flip', { side: foe, zone: i, id: fm.id, reveal: true }); }
          }
          emit('lock', { side: foe, turns: ef.turns || 2 });
          log('Lichtsiegel: Der Gegner kann ' + (ef.turns || 2) + ' Züge nicht angreifen!');
          break;
        }
        case 'banish_monster': // gezielte Verbannung
          banishMonster(foe, opts.targetZone, 'jutsu');
          break;
        case 'foolish': // Foolish Burial: Ninja aus dem Deck auf den Friedhof
          openPickWindow(side, { from: 'deck', kind2: 'ninja',
            why: 'Ninja für den Friedhof wählen', then: { fx: 'foolish' } });
          break;
        case 'lock_monster': { // Kröten-Magen: keine Angriffe/Effekte für N Züge
          const m = pl(foe).m[opts.targetZone];
          const until = E.state.turn + (ef.turns || 2) * 2;
          m.lockUntil = until;
          m.effectsLocked = until;
          emit('debuff', { side: foe, zone: opts.targetZone, v: 0 });
          log(cardOf(m).name + ' versinkt im Kröten-Magen (' + (ef.turns || 2) + ' Züge gelähmt)!');
          break;
        }
        case 'weaken_monster': { // Großes Shuriken-Werfen: gezielte dauerhafte Schwächung
          const z = opts.targetZone;
          const fm = pl(foe).m[z];
          let v = ef.v || 0;
          if (ef.vIf && tribeOnField(side, ef.vIf.tribe, ef.vIf.idPrefix)) v = ef.vIf.v; // mit Iruka: präziser Wurf
          fm.atkMod -= Math.min(effAtk(foe, z), v);
          emit('debuff', { side: foe, zone: z, v });
          log(cardOf(fm).name + ' verliert dauerhaft ' + v + ' ANG (Shuriken-Treffer)!');
          break;
        }
        case 'swap_stats': { // Henge: ANG/VERT eines eigenen Ninja bis Zugende tauschen
          const m = p.m[opts.targetZone];
          m.swapStats = true;
          emit('buff', { side, zone: opts.targetZone, v: 0 });
          log(cardOf(m).name + ' verwandelt sich: ANG und VERT getauscht!');
          break;
        }
        case 'sp_summon_hand_tribe': { // Kröten-Ruf: Stammes-Ninja aus der Hand
          const hx = p.hand[opts.selectHandIdx];
          p.hand.splice(opts.selectHandIdx, 1);
          specialSummon(side, hx.id, freeZone(p.m));
          if (ef.drawIf && p.m.some((m) => m && m.id.indexOf(ef.drawIf) === 0)) {
            drawCards(side, 1);
            log('Jiraiya belohnt den Ruf: 1 Karte gezogen.');
          }
          break;
        }
      }
      // Spirit-Reaper-Regel: wird ein solches Ninja Ziel eines Effekts, zerstört es sich
      if (opts && typeof opts.targetZone === 'number' && !E.state.winner) {
        const tz = opts.targetZone;
        for (const s of [side, foe]) {
          const m = pl(s).m[tz];
          if (m && m.mode !== 'defdown' && hasFx(cardOf(m), 'reaper_fragile')) {
            destroyMonster(s, tz, 'effect');
            log(cardOf(m).name + ' löst sich auf — es wurde zum Effekt-Ziel!');
          }
        }
      }
    }

    /* ---------- Kampf ---------- */
    E.canAttack = function (side, zone) {
      const st = E.state, m = pl(side).m[zone];
      if (!m || m.mode !== 'atk') return false;
      if (st.active !== side || st.phase !== 'battle') return false;
      if (st.battleEnded) return false;              // Kampfphase beendet (Kawarimi/Rauchbombe)
      if (pl(side).attackLocked) return false;       // Angriffs-Sperre (Lichtsiegel)
      if (m.attacksLeft <= 0) return false;
      if (st.turn <= m.lockUntil) return false;
      if (m.summonedTurn === st.turn) { // Mizuki: Zweifel — nicht im Beschwörungszug, wenn Bedingung erfüllt
        for (const ef of cardOf(m).effects) {
          if (ef.t === 'summon_sick_if' && tribeOnField(side, ef.tribe, ef.idPrefix, zone)) return false;
        }
      }
      return true;
    };

    /* ---------- Hand-Fallen (Kuriboh-Stil): Fenster nach Angriffs-Deklaration ---------- */
    function handTrapIdxs(side) {
      const st = E.state, pa = st.pendingAttack, p = pl(side), out = [];
      if (!pa) return out;
      for (let i = 0; i < p.hand.length; i++) {
        const c = cardOf(p.hand[i]);
        for (const ef of (c.effects || [])) {
          if (ef.t === 'hand_no_damage') { out.push(i); break; }
          if (ef.t === 'hand_fader' && pa.target === -1 && freeZone(p.m) >= 0) { out.push(i); break; }
        }
      }
      return out;
    }
    function maybeHandWindow(side) {
      const idxs = handTrapIdxs(side);
      if (!idxs.length) return false;
      E.state.window = { kind: 'hand', side, idxs };
      emit('window', { kind: 'hand', side });
      return true;
    }

    E.respondHand = function (handIdx) {
      const st = E.state;
      if (!st.window || st.window.kind !== 'hand') fail('Kein Hand-Fenster offen.');
      const side = st.window.side, p = pl(side);
      if (handIdx === null || handIdx === undefined) { // Passen → Angriff durchgehen lassen
        st.window = null;
        resolveAttack();
        return;
      }
      if (st.window.idxs.indexOf(handIdx) === -1) fail('Diese Karte kann jetzt nicht eingesetzt werden.');
      const x = p.hand[handIdx];
      const c = cardOf(x);
      const pa = st.pendingAttack;
      const ef = (c.effects || []).find((e) => e.t === 'hand_no_damage' || (e.t === 'hand_fader' && pa && pa.target === -1));
      p.hand.splice(handIdx, 1);
      st.window = null;
      emit('handtrap', { side, id: x.id });
      log((side === 'P' ? 'Du nutzt' : 'Gegner nutzt') + ' ' + c.name + ' als Hand-Falle!');
      if (ef.t === 'hand_fader' && pa) {
        pa.negated = true;
        st.battleEnded = true; // Battle-Fader-Pendant: selbst in Verteidigung beschwören + Kampfphase beenden
        specialSummon(side, x.id, freeZone(p.m), 'defup');
        log('Die Kampfphase endet sofort!');
      } else if (ef.t === 'hand_no_damage' && pa) {
        toGrave(side, x);
        pa.noDamage = true;
        log('Der Kampfschaden wird komplett abgeblockt!');
      }
      resolveAttack();
    };

    E.validTraps = function (side, reason, ctx) {
      const p = pl(side), st = E.state, out = [];
      for (let i = 0; i < 3; i++) {
        const s = p.st[i];
        if (!s || !s.faceDown) continue;
        const c = cardOf(s);
        if (c.kind !== 'falle' || c.trigger !== reason) continue;
        if (s.setTurn === st.turn) continue;
        if (c.effect.t === 'destroy_summoned_min_level') {
          const m = pl(ctx.side).m[ctx.zone];
          if (!m || cardOf(m).level < c.effect.level) continue;
        }
        if (c.effect.t === 'banish_summoned_min_atk') {
          const m = pl(ctx.side).m[ctx.zone];
          if (!m || effAtk(ctx.side, ctx.zone) < c.effect.minAtk) continue;
        }
        if (c.effect.t === 'negate_attack_tribe') { // Stammes-Schild braucht Stamm/Präfix auf dem Feld
          const ef2 = c.effect;
          if (!p.m.some((m) => m && (tribeOf(m) === ef2.tribe || (ef2.idPrefix && m.id.indexOf(ef2.idPrefix) === 0)))) continue;
        }
        out.push(i);
      }
      return out;
    };

    function openSummonWindow(side, zone) {
      const st = E.state;
      if (st.winner) return;
      const def = other(side);
      const traps = E.validTraps(def, 'summon', { side, zone });
      if (traps.length) {
        st.window = { kind: 'trap', side: def, reason: 'summon', ctx: { side, zone } };
        emit('window', { kind: 'trap', side: def, reason: 'summon' });
      }
    }

    E.declareAttack = function (side, zone, target) {
      const st = E.state;
      if (st.window) fail('Zuerst das offene Fenster beantworten.');
      if (!E.canAttack(side, zone)) fail('Dieses Ninja kann nicht angreifen.');
      const foe = other(side);
      const enemyHasMon = pl(foe).m.some(Boolean);
      if (target === -1) {
        if (enemyHasMon && !pl(side).m[zone].tempDirect) fail('Direktangriff nur wenn der Gegner keine Ninja hat.');
        if (hasFx(cardOf(pl(side).m[zone]), 'no_direct')) fail('Dieses Ninja kann nicht direkt angreifen.');
      } else if (!pl(foe).m[target]) fail('Ungültiges Angriffsziel.');
      pl(side).m[zone].attacksLeft--;
      // Sumpf der Unterwelt: Münzwurf gegen jeden Angriff
      const swamp = pl(foe).st.find((s) => s && !s.faceDown && cardOf(s).effect.t === 'cont_weaken_all' && cardOf(s).effect.coinNegate);
      if (swamp && rng() < 0.5) {
        emit('negate', { side, zone });
        log(cardOf(swamp).name + ': Münzwurf KOPF — der Angriff versandet!');
        return;
      }
      st.pendingAttack = { side, zone, target, negated: false };
      // Bunshin-Täuschung: Doppelgänger mit taunt MÜSSEN zuerst angegriffen werden
      if (target !== -1) {
        for (let i = 0; i < 3; i++) {
          const tm = pl(foe).m[i];
          if (tm && i !== target && tm.mode !== 'defdown' && hasFx(cardOf(tm), 'taunt')) {
            st.pendingAttack.target = i;
            emit('redirect', { side: foe, zone: i });
            log(cardOf(tm).name + ' zwingt den Angriff auf sich!');
            break;
          }
        }
      }
      // Angriffs-Umleitung (Gamaken): zieht den Angriff einmal pro Zug auf sich
      if (st.pendingAttack.target !== -1) {
        for (let i = 0; i < 3; i++) {
          const rm = pl(foe).m[i];
          if (rm && i !== st.pendingAttack.target && rm.redirectUsedTurn !== st.turn && hasFx(cardOf(rm), 'attack_redirect')) {
            rm.redirectUsedTurn = st.turn;
            st.pendingAttack.target = i;
            emit('redirect', { side: foe, zone: i });
            log(cardOf(rm).name + ' lenkt den Angriff auf sich um!');
            break;
          }
        }
      }
      const finalTarget = st.pendingAttack.target;
      emit('attack', { side, zone, target: finalTarget });
      log(cardOf(pl(side).m[zone]).name + ' greift ' +
        (finalTarget === -1 ? 'direkt an!' : cardOf(pl(foe).m[finalTarget]).name + ' an!'));
      const traps = E.validTraps(foe, 'attack', {});
      if (traps.length) {
        st.window = { kind: 'trap', side: foe, reason: 'attack', ctx: {} };
        emit('window', { kind: 'trap', side: foe, reason: 'attack' });
      } else if (!maybeHandWindow(foe)) {
        resolveAttack();
      }
    };

    E.respond = function (trapZone) {
      const st = E.state;
      if (!st.window || st.window.kind !== 'trap') fail('Kein Fallen-Fenster offen.');
      const side = st.window.side;
      const reason = st.window.reason, ctx = st.window.ctx;
      if (trapZone === null || trapZone === undefined) {
        // Passen → Fenster schließen, ggf. Hand-Fallen-Fenster, dann weiter
        st.window = null;
        if (reason === 'attack') { if (!maybeHandWindow(side)) resolveAttack(); }
        else if (reason === 'jutsu') finishSpellResolution(ctx);
        return;
      }
      const valid = E.validTraps(side, reason, ctx);
      if (valid.indexOf(trapZone) === -1) fail('Diese Falle kann jetzt nicht aktiviert werden.');
      const p = pl(side);
      const s = p.st[trapZone];
      const c = cardOf(s);
      p.st[trapZone] = null;
      toGrave(side, s);
      emit('trap', { side, zone: trapZone, id: s.id });
      log((side === 'P' ? 'Du aktivierst' : 'Gegner aktiviert') + ' die Falle ' + c.name + '!');
      applyTrap(side, c, reason, ctx);
      if (reason === 'jutsu') { // Konter: Jutsu geht wirkungslos auf den Friedhof
        st.window = null;
        toGrave(ctx.spellSide, ctx.spellInst);
        log('Das Jutsu wurde annulliert!');
        return;
      }
      // Nach Fallen-Effekt: wenn Angriff erledigt → Fenster schließen
      const pa = st.pendingAttack;
      const attackDead = reason === 'attack' &&
        (!pa || pa.negated || !pl(pa.side).m[pa.zone] || (pa.target !== -1 && !pl(other(pa.side)).m[pa.target]));
      if (attackDead) {
        st.window = null;
        if (pa && !pa.negated && !pl(pa.side).m[pa.zone]) { /* Angreifer zerstört */ }
        st.pendingAttack = null;
      }
    };

    // Jutsu-Auflösung, nachdem der Gegner nicht kontert
    function finishSpellResolution(ctx) {
      const c = cardOf(ctx.spellInst);
      resolveSpell(ctx.spellSide, c, ctx.opts || {});
      if (!E.state.winner) toGrave(ctx.spellSide, ctx.spellInst);
    }

    function applyTrap(side, c, reason, ctx) {
      const st = E.state, foe = other(side);
      const ef = c.effect;
      if (reason === 'attack') {
        const pa = st.pendingAttack;
        if (!pa) return;
        const atkSide = pa.side;
        const am = pl(atkSide).m[pa.zone];
        switch (ef.t) {
          case 'destroy_attacker':
            if (am) destroyMonster(atkSide, pa.zone, 'trap');
            pa.negated = true;
            break;
          case 'negate_attack':
            pa.negated = true;
            st.battleEnded = true; // YGO „Negate Attack": beendet die Kampfphase
            emit('negate', { side: atkSide, zone: pa.zone });
            log('Der Angriff wurde annulliert — die Kampfphase endet!');
            break;
          case 'weaken_attacker':
            if (am) {
              am.atkMod -= Math.min(effAtk(atkSide, pa.zone), ef.v);
              emit('debuff', { side: atkSide, zone: pa.zone, v: ef.v });
              log(cardOf(am).name + ' verliert dauerhaft ' + ef.v + ' ATK.');
            }
            break;
          case 'negate_and_lock':
            pa.negated = true;
            if (am) am.lockUntil = st.turn + 2;
            emit('negate', { side: atkSide, zone: pa.zone });
            log('Angriff annulliert — ' + (am ? cardOf(am).name : '') + ' ist gefesselt!');
            break;
          case 'negate_and_heal':
            pa.negated = true;
            heal(side, ef.v);
            break;
          case 'mirror_force': { // Mirror Force: alle ANG-Ninja des Angreifers zerstören
            for (let i = 0; i < 3; i++) {
              const mm = pl(atkSide).m[i];
              if (mm && mm.mode === 'atk') destroyMonster(atkSide, i, 'trap');
            }
            pa.negated = true;
            log('Reflexion! Alle angreifenden Ninja werden zerstört!');
            break;
          }
          case 'magic_cylinder': // Magic Cylinder: annullieren + Schaden = ANG des Angreifers
            pa.negated = true;
            if (am) damage(atkSide, effAtk(atkSide, pa.zone), 'trap');
            log('Chakra-Rückstoß! Der Angriff prallt als Schaden zurück!');
            break;
          case 'banish_attacker': // Dimensional Prison: Angreifer verbannen
            if (am) banishMonster(atkSide, pa.zone, 'trap');
            pa.negated = true;
            break;
          case 'ring_attacker': { // Ring of Destruction (reaktiv): zerstören + beide kriegen dessen ANG
            if (am) {
              const v = effAtk(atkSide, pa.zone);
              destroyMonster(atkSide, pa.zone, 'trap');
              damage(atkSide, v, 'trap');
              damage(side, v, 'trap');
            }
            pa.negated = true;
            break;
          }
          case 'negate_attack_tribe': { // Stammes-Schild: einfache Annullierung (validTraps prüft Stamm)
            pa.negated = true;
            emit('negate', { side: atkSide, zone: pa.zone });
            log('Der Angriff wurde annulliert!');
            if (ef.weakenPrefix) { // Beschützender Körper: Iruka opfert ANG für seine Schüler
              for (let i = 0; i < 3; i++) {
                const om = pl(side).m[i];
                if (om && om.mode !== 'defdown' && om.id.indexOf(ef.weakenPrefix) === 0) {
                  om.atkMod -= Math.min(effAtk(side, i), ef.weakenV || 200);
                  emit('debuff', { side, zone: i, v: ef.weakenV || 200 });
                  log(cardOf(om).name + ' wirft sich dazwischen: -' + (ef.weakenV || 200) + ' ANG.');
                  break;
                }
              }
            }
            break;
          }
          case 'negate_and_bounce_target': { // Kawarimi: Angriff annullieren + Ziel-Ninja zurück auf die Hand
            pa.negated = true;
            emit('negate', { side: atkSide, zone: pa.zone });
            log('Der Angriff wurde annulliert!');
            if (pa.target !== -1) {
              const tm = pl(side).m[pa.target];
              if (tm) {
                for (const s of pl(side).st) { // Ausrüstungen darauf zerstören
                  if (s && !s.faceDown && s.equipTo === pa.target) { toGrave(side, s); pl(side).st[pl(side).st.indexOf(s)] = null; }
                }
                pl(side).m[pa.target] = null;
                pl(side).hand.push(inst(tm.id));
                emit('bounce', { side, zone: pa.target, id: tm.id });
                log(cardOf(tm).name + ' tauscht sich gegen einen Holzklotz und kehrt auf die Hand zurück!');
              }
            }
            break;
          }
        }
      } else if (reason === 'summon') {
        if (ef.t === 'destroy_summoned_min_level') {
          const m = pl(ctx.side).m[ctx.zone];
          if (m && cardOf(m).level >= ef.level) destroyMonster(ctx.side, ctx.zone, 'trap');
        }
        if (ef.t === 'banish_summoned_min_atk') { // Bottomless Trap Hole
          const m = pl(ctx.side).m[ctx.zone];
          if (m) banishMonster(ctx.side, ctx.zone, 'trap');
        }
        if (ef.t === 'weaken_summoned') { // Hartschaum-Haare: -ANG dauerhaft + Burn
          const m = pl(ctx.side).m[ctx.zone];
          if (m) {
            m.atkMod -= Math.min(effAtk(ctx.side, ctx.zone), ef.v || 500);
            emit('debuff', { side: ctx.side, zone: ctx.zone, v: ef.v || 500 });
            log(cardOf(m).name + ' verliert dauerhaft ' + (ef.v || 500) + ' ANG (Hartschaum-Haare)!');
            damage(ctx.side, ef.dmg || 300, 'trap');
          }
        }
      } else if (reason === 'jutsu') {
        if (ef.t === 'negate_spell') {
          emit('negate', { side: ctx.spellSide, id: ctx.spellInst.id });
          log(c.name + ': Das gegnerische Jutsu wird versiegelt!');
        }
      }
    }

    function resolveAttack() {
      const st = E.state;
      const pa = st.pendingAttack;
      st.pendingAttack = null;
      if (!pa || pa.negated) return;
      const atkSide = pa.side, defSide = other(pa.side);
      const am = pl(atkSide).m[pa.zone];
      if (!am) return;
      const elemV = pa.target !== -1 ? attrBonus(atkSide, pa.zone, defSide, pa.target) : 0;
      const atk = effAtk(atkSide, pa.zone) + elemV;
      if (elemV > 0) {
        emit('element', { side: atkSide, zone: pa.zone, target: pa.target, v: elemV });
        log('Elementvorteil! ' + cardOf(am).name + ' erhält +' + elemV + ' ANG.');
      }

      if (pa.target === -1) {
        if (!pa.noDamage) {
          damage(defSide, atk, 'direct');
          // Spirit-Reaper-Pendant: Direkttreffer kostet den Gegner eine Handkarte
          if (!E.state.winner && hasFx(cardOf(am), 'reaper_discard')) {
            const fp = pl(defSide);
            if (fp.hand.length) {
              const ix = Math.floor(rng() * fp.hand.length);
              const dx = fp.hand.splice(ix, 1)[0];
              toGrave(defSide, dx);
              emit('discard', { side: defSide, id: dx.id });
              log(cardOf(am).name + ': Der Gegner verliert eine Handkarte (' + cardOf(dx).name + ')!');
            }
          }
        } else log('Der Schaden wird abgeblockt!');
        return;
      }
      const dm = pl(defSide).m[pa.target];
      if (!dm) { log('Angriffsziel nicht mehr vorhanden.'); return; }
      let flipped = false;
      if (dm.mode === 'defdown') {
        dm.mode = 'defup';
        flipped = true;
        emit('flip', { side: defSide, zone: pa.target, id: dm.id, byAttack: true });
        log(cardOf(dm).name + ' wird durch den Angriff aufgedeckt!');
      }
      const amImmune = hasFx(cardOf(am), 'battle_immune');
      const dmImmune = hasFx(cardOf(dm), 'battle_immune');
      const deal = (s, v, why) => { if (!pa.noDamage) damage(s, v, why); };
      const burnOnKill = () => { // Ausrüstung mit burnOnKill (Rasengan-Eremit): 400 bei Kampf-Kill
        for (const s of pl(atkSide).st) {
          if (s && !s.faceDown && s.equipTo === pa.zone && cardOf(s).effect.burnOnKill) {
            damage(defSide, cardOf(s).effect.burnOnKill, 'effect');
            log(cardOf(s).name + ': ' + cardOf(s).effect.burnOnKill + ' Schaden hinterher!');
          }
        }
      };
      if (dm.mode === 'atk') {
        const def = effAtk(defSide, pa.target);
        if (atk > def) {
          if (!dmImmune) { destroyMonster(defSide, pa.target, 'battle'); burnOnKill(); }
          else log(cardOf(dm).name + ' kann nicht durch Kampf zerstört werden!');
          deal(defSide, atk - def, 'battle');
        } else if (atk < def) {
          if (!amImmune) destroyMonster(atkSide, pa.zone, 'battle');
          else log(cardOf(am).name + ' kann nicht durch Kampf zerstört werden!');
          deal(atkSide, def - atk, 'battle');
        } else if (atk !== 0) { // Gleichstand: beide zerstört — außer 0 vs 0 (YGO-Regel)
          if (!dmImmune) destroyMonster(defSide, pa.target, 'battle');
          if (!amImmune) destroyMonster(atkSide, pa.zone, 'battle');
          log('Beide Ninja wurden zerstört.');
        } else {
          log('Gleichstand — nichts passiert.');
        }
      } else {
        const def = effDef(defSide, pa.target);
        if (atk > def) {
          if (!dmImmune) { destroyMonster(defSide, pa.target, 'battle'); burnOnKill(); }
          else log(cardOf(dm).name + ' kann nicht durch Kampf zerstört werden!');
          if (isPiercing(atkSide, pa.zone)) {
            log('Durchdringungsschaden!');
            deal(defSide, atk - def, 'piercing');
          }
        } else if (atk < def) {
          log('Der Angriff prallt ab!');
          deal(atkSide, def - atk, 'battle');
        } else {
          log('Gleichstand — nichts passiert.');
        }
      }
      // D.D.-Pendant: nach einem Kampf gegen ein gegnerisches Ninja beide verbannen
      if (!E.state.winner && (hasFx(cardOf(am), 'dd_both') || hasFx(cardOf(dm), 'dd_both'))) {
        if (pl(defSide).m[pa.target]) banishMonster(defSide, pa.target, 'effect');
        if (pl(atkSide).m[pa.zone]) banishMonster(atkSide, pa.zone, 'effect');
      }
      if (flipped) {
        // Marshmallon-Pendant: wurde es verdeckt angegriffen, bekommt der Angreifer Burn
        const burn = cardOf(dm).effects.find((e) => e.t === 'marshmallon');
        if (burn) {
          damage(atkSide, burn.v || 1000, 'effect');
          log(cardOf(dm).name + ': Der Angriff im Verborgenen kostet ' + (burn.v || 1000) + ' LP!');
        }
        applyFlipEffect(defSide, pa.target);
      }
    }

    /* ---------- Bedingte Spezialbeschwörung (Cyber-Dragon-Stil) ---------- */
    E.cyberSummon = function (side, handIdx, zone) {
      const st = E.state, p = pl(side);
      if (st.window) fail('Zuerst das offene Fenster beantworten.');
      if (st.active !== side) fail('Nicht dein Zug.');
      if (st.phase !== 'main1' && st.phase !== 'main2') fail('Nur in der Hauptphase.');
      const x = p.hand[handIdx];
      if (!x) fail('Ungültige Karte.');
      const c = cardOf(x);
      if (!hasFx(c, 'cyber_summon')) fail('Dieses Ninja hat keine solche Bedingung.');
      if (p.m.some(Boolean)) fail('Nur beschwörbar, solange du keine Ninja kontrollierst.');
      if (!pl(other(side)).m.some(Boolean)) fail('Der Gegner braucht ein Ninja.');
      if (p.m[zone]) fail('Zone ist besetzt.');
      p.hand.splice(handIdx, 1);
      specialSummon(side, x.id, zone);
      log(c.name + ' nutzt die Lücke und erscheint sofort!');
    };

    /* ---------- Aktivierbare Monster-Effekte (1×/Zug, Kosten: 1 Handkarte) ---------- */
    const PER_TURN_FX = ['bounce_enemy_per_turn', 'destroy_weak_per_turn', 'boost_self_per_turn'];

    E.monsterFxOf = function (side, zone) {
      const m = pl(side).m[zone];
      if (!m) return null;
      return cardOf(m).effects.find((e) => PER_TURN_FX.indexOf(e.t) >= 0) || null;
    };

    E.activateMonsterFx = function (side, zone) {
      const st = E.state, p = pl(side);
      if (st.window) fail('Zuerst das offene Fenster beantworten.');
      if (st.active !== side) fail('Nicht dein Zug.');
      if (st.phase !== 'main1' && st.phase !== 'main2') fail('Nur in der Hauptphase.');
      const m = p.m[zone];
      if (!m) fail('Kein Ninja.');
      const ef = E.monsterFxOf(side, zone);
      if (!ef) fail('Dieses Ninja hat keinen aktivierbaren Effekt.');
      if (m.effectsLocked >= st.turn) fail('Die Effekte dieses Ninja sind gesperrt.');
      if (m.fxUsedTurn === st.turn) fail('Effekt wurde diesen Zug schon genutzt.');
      if (p.hand.length < 1) fail('Du brauchst 1 Handkarte als Kosten.');
      if (ef.t === 'bounce_enemy_per_turn' && !pl(other(side)).m.some(Boolean)) fail('Der Gegner hat keine Ninja.');
      if (ef.t === 'destroy_weak_per_turn' && destroyWeakTarget(side, ef) < 0) fail('Kein passendes Ziel (ANG zu hoch).');
      st.window = { kind: 'discard', side, count: 1, resume: true, resumeFx: 'mfx', zone, fxT: ef.t };
      emit('window', { kind: 'discard', side, count: 1 });
    };

    // Stärkstes gegnerisches Ninja, das der Schwellen-ANG genügt (null = keins)
    function destroyWeakTarget(side, ef) {
      const foe = other(side);
      let best = -1, bv = -1;
      for (let i = 0; i < 3; i++) {
        if (!pl(foe).m[i]) continue;
        const v = effAtk(foe, i);
        if (v <= (ef.maxAtk || 2000) && v > bv) { bv = v; best = i; }
      }
      return best;
    }

    function applyMonsterFx(side, zone, fxT) {
      const p = pl(side), m = p.m[zone];
      if (!m) return;
      m.fxUsedTurn = E.state.turn;
      const foe = other(side);
      if (fxT === 'bounce_enemy_per_turn') {
        const z = strongestZone(foe);
        if (z < 0) return;
        const fm = pl(foe).m[z];
        for (const s of pl(foe).st) { // Ausrüstungen darauf zerstören
          if (s && !s.faceDown && s.equipTo === z) { toGrave(foe, s); pl(foe).st[pl(foe).st.indexOf(s)] = null; }
        }
        pl(foe).m[z] = null;
        pl(foe).hand.push(inst(fm.id));
        emit('bounce', { side: foe, zone: z, id: fm.id });
        log(cardOf(m).name + ': ' + cardOf(fm).name + ' wird auf die gegnerische Hand zurückgeworfen!');
      } else if (fxT === 'destroy_weak_per_turn') {
        const ef = E.monsterFxOf(side, zone);
        const z = destroyWeakTarget(side, ef || {});
        if (z < 0) { log(cardOf(m).name + ': Kein passendes Ziel — der Effekt verpufft.'); return; }
        log(cardOf(m).name + ' zerfetzt ' + cardOf(pl(foe).m[z]).name + ' im Kyūbi-Rausch!');
        destroyMonster(foe, z, 'effect');
      } else if (fxT === 'boost_self_per_turn') { // Klassenclown: alles auf eine Karte
        const ef = E.monsterFxOf(side, zone) || {};
        m.tempAtk += ef.v || 600;
        emit('buff', { side, zone, v: ef.v || 600 });
        log(cardOf(m).name + ' mobilisiert alle Reserven: +' + (ef.v || 600) + ' ANG bis Zugende!');
      }
    }

    E.surrender = function (side) {
      setWinner(other(side), 'surrender');
    };

    /* ---------- Getter für UI/KI ---------- */
    E.cardOf = cardOf;
    E.effAtk = effAtk;
    E.effDef = effDef;
    E.isPiercing = isPiercing;
    E.attrBonus = attrBonus;
    E.other = other;
    return E;
  }

  NT.Engine = { create };
})(typeof window !== 'undefined' ? window : globalThis);
