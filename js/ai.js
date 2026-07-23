/* ============================================================
   NARUTO TGC — KI-Gegner
   turn() ist ein Generator: nach jeder Aktion wird pausiert,
   damit die UI animieren kann. Fenster (Fallen/Abwurf) werden
   über E.state.window verhandelt.

   Spielstärke nach difficulty:
     d<=2  basic   — solide Züge, keine Vorausplanung
     d 3–4 smart   — + Zielwahl, Konter, Tribut-Effizienz
     d>=5  genius  — + Lethal-/Survival-Erkennung, Wert-Bewertung
                     (Wipe zurückhalten, Köder-Angriffe, Boost nur
                     für Kills), Fallen-Köder
   ============================================================ */
(function (g) {
  const NT = (g.NTCG = g.NTCG || {});

  function cardOf(E, x) { return E.cardOf(x); }

  function handIdxOf(E, side, pred) {
    const h = E.state.players[side].hand;
    for (let i = 0; i < h.length; i++) if (pred(cardOf(E, h[i]), h[i], i)) return i;
    return -1;
  }
  function allHandIdx(E, side, pred) {
    const h = E.state.players[side].hand, out = [];
    for (let i = 0; i < h.length; i++) if (pred(cardOf(E, h[i]), h[i], i)) out.push(i);
    return out;
  }

  function freeM(E, side) { return E.state.players[side].m.indexOf(null); }
  function freeST(E, side) { return E.state.players[side].st.indexOf(null); }

  function bestOwnMonsterZone(E, side) {
    const p = E.state.players[side];
    let best = -1, bv = -1;
    for (let i = 0; i < 3; i++) if (p.m[i]) { const v = E.effAtk(side, i); if (v > bv) { bv = v; best = i; } }
    return best;
  }

  function weakestOwnMonsterZone(E, side) {
    const p = E.state.players[side];
    let best = -1, bv = Infinity;
    for (let i = 0; i < 3; i++) if (p.m[i]) { const v = E.effAtk(side, i); if (v < bv) { bv = v; best = i; } }
    return best;
  }

  // Versucht eine Engine-Aktion; gibt true bei Erfolg.
  function tryDo(fn) { try { fn(); return true; } catch (e) { return false; } }

  /* ================= Bewertungs-Helfer ================= */

  // Alle eigenen Monster-Zonen mit effAtk
  function monList(E, side) {
    const p = E.state.players[side], out = [];
    for (let i = 0; i < 3; i++) if (p.m[i]) out.push({ z: i, m: p.m[i], atk: E.effAtk(side, i), def: E.effDef(side, i), c: cardOf(E, p.m[i]) });
    return out;
  }

  // Höchste angriffsbereite gegnerische ATK + ob dieser Angreifer Durchdringung hat.
  // (WindBot-Prinzip: Position & Removal relativ zur besten gegnerischen Angriffskraft)
  function foeThreat(E, side) {
    const foe = E.other(side);
    let atk = 0, pierce = false;
    for (const x of monList(E, foe)) {
      if (x.m.mode !== 'atk') continue; // def/verdeckt kann nicht angreifen
      const p = E.isPiercing ? !!E.isPiercing(foe, x.z) : false;
      if (x.atk > atk) { atk = x.atk; pierce = p; }
      else if (x.atk === atk && p) pierce = true;
    }
    return { atk, pierce };
  }

  // Wert der on-summon-Effekte einer Ninja-Karte in der aktuellen Lage (genius)
  // → die KI spielt Effekt-Ninja nur dann, wenn ihre Effekte auch feuern
  function summonFxValue(E, side, c) {
    const st = E.state, foe = E.other(side);
    const foeMon = monList(E, foe).length;
    const foeST = st.players[foe].st.some(Boolean);
    const lpFrac = st.players[side].lp / (NT.START_LP || 8000);
    let v = 0;
    for (const ef of (c.effects || [])) {
      switch (ef.t) {
        case 'dmg_on_summon': v += (ef.v || 0) * 0.6; break;
        case 'heal_on_summon': v += (ef.v || 0) * (lpFrac < 0.6 ? 0.5 : 0.15); break;
        case 'draw_on_summon': v += 250 * (ef.n || 1); break;
        case 'token': v += 280; break;
        case 'weaken_on_summon': v += foeMon ? (ef.v || 0) * 0.7 : 0; break;
        case 'destroy_weakest_on_summon': v += foeMon ? 450 : 0; break;
        case 'destroy_strongest_on_summon': v += foeMon ? 600 : 0; break;
        case 'destroy_st_on_summon': v += foeST ? 300 * (ef.n || 1) : 0; break;
        case 'boost_self_on_summon': v += (ef.v || 0) * 0.7; break;
        case 'boost_all_on_summon': v += (ef.v || 0) * 0.5 * Math.max(1, monList(E, side).length); break;
        case 'summon_from': {
          // Combo-Bewusstsein: feuert der Effekt überhaupt? Wert skaliert mit
          // dem besten erreichbaren Ziel in Deck/Friedhof (Gamabunta→Naruto …)
          const hit = summonFromHit(E, side, c);
          v += hit ? 250 + hit * 0.1 : 0;
          break;
        }
        case 'battle_immune': v += 300; break;   // Marshmallon/Spirit-Reaper-Pendant
        case 'marshmallon': v += 250; break;
        case 'reaper_discard': v += 200; break;
        case 'dd_both': v += 150; break;
        case 'self_revive': v += 200; break;     // Treeborn-Frog-Pendant
        case 'cyber_summon': v += 200; break;
        case 'on_destroy_search': v += 250; break;
        case 'on_normal_search_jutsu': v += 400; break;  // Eremit: Jutsu-Suche bei Normal-Beschwörung
        case 'on_battle_destroy_summon': v += 250; break; // Gama: Kette bleibt erhalten
        case 'aura_self_tribe': v += isTribeNearby(E, side, ef.tribe, ef.idPrefix) ? 220 : 40; break;
        case 'aura_tribe': v += 200; break;            // Iruka: stärkt den ganzen Stamm
        case 'ally_summon_draw': v += 250; break;      // Iruka: Kartennachschub pro Beschwörung
        case 'def_boost_ally_on_summon': v += monList(E, side).length ? 160 : 30; break; // Sakura: braucht Verbündete
        case 'bounce_enemy_per_turn': v += 300; break;    // Kröten-König: Bounce jede Runde
        case 'boost_self_per_turn': v += 150; break;      // Klassenclown: Abwurf-Boost
        case 'summon_sick_if': v -= 120; break;           // Mizuki: Zweifel-Bremse mit Iruka
        case 'per_turn_summon': v += 350; break;
        case 'aura_atk': case 'aura_def': v += 200; break;
        case 'piercing': v += 120; break;
        case 'double_attack': v += (c.atk || 0) * 0.35; break;
        case 'flip_draw': v += 200 * (ef.n || 1); break;
        case 'on_destroy_summon': case 'on_destroy_draw': case 'on_destroy_heal': v += 150; break;
      }
    }
    return v;
  }

  // Bleibender Feldwert (Aura/per_turn/Doppelangriff/Durchdringung):
  // solche Karten behält die KI lieber und opfert andere
  function fieldFxValue(E, c) {
    let v = 0;
    for (const ef of (c.effects || [])) {
      if (ef.t === 'aura_atk' || ef.t === 'aura_def') v += 250;
      else if (ef.t === 'aura_tribe' || ef.t === 'ally_summon_draw') v += 250; // Iruka bleibt auf dem Feld!
      else if (ef.t === 'per_turn_summon') v += 300;
      else if (ef.t === 'double_attack') v += (c.atk || 0) * 0.3;
      else if (ef.t === 'piercing') v += 100;
      else if (ef.t === 'battle_immune') v += 200; // Wände nicht opfern
      else if (ef.t === 'bounce_enemy_per_turn') v += 300; // Kröten-König bleibt!
    }
    return v;
  }

  // Liegt ein offener eigener Ninja mit Stamm/Präfix auf dem Feld? (für aura_self_tribe)
  function isTribeNearby(E, side, tribe, idPrefix) {
    return E.state.players[side].m.some((m) => m && m.mode !== 'defdown' &&
      ((tribe && E.cardOf(m).tribe === tribe) || (idPrefix && m.id.indexOf(idPrefix) === 0)));
  }

  // Hand-Fallen (Kuriboh-Stil) gehören AUF DIE HAND — nie beschwören/abwerfen
  function isHandTrap(c) {
    return (c.effects || []).some((ef) => ef.t === 'hand_no_damage' || ef.t === 'hand_fader');
  }

  // Bester summon_from-Ziel-ANG in Deck/Friedhof (0 = Effekt würde ins Leere laufen)
  function summonFromHit(E, side, c) {
    const pp = E.state.players[side];
    let hit = 0;
    for (const ef of (c.effects || [])) {
      if (ef.t !== 'summon_from') continue;
      const src = ef.from === 'grave' ? pp.grave : ef.from === 'deck' ? pp.deck : pp.deck.concat(pp.grave);
      for (const id of src) {
        const cc = cardOf(E, id);
        if (cc.kind !== 'ninja' || cc.token) continue;
        if (ef.id ? id === ef.id : (cc.level || 0) <= (ef.maxLevel || 99)) hit = Math.max(hit, cc.atk);
      }
    }
    return hit;
  }

  // Größter einzelne Boost, den die Hand aktuell hergibt (Schnell + permanent + Equip)
  function bestBoostInHand(E, side) {
    let v = 0;
    const h = E.state.players[side].hand;
    for (const x of h) {
      const c = cardOf(E, x);
      if (c.kind !== 'jutsu') continue;
      if (c.effect.t === 'boost_temp' || c.effect.t === 'boost_perm' || c.sub === 'equip') v = Math.max(v, c.effect.v || 0);
    }
    return v;
  }

  // Schaden-Jutsu-Potenzial der Hand (direkter LP-Schaden)
  function spellDamageInHand(E, side) {
    let v = 0;
    const foe = E.other(side);
    const h = E.state.players[side].hand;
    for (const x of h) {
      const c = cardOf(E, x);
      if (c.kind !== 'jutsu' || c.sub === 'equip') continue;
      if (c.effect.t === 'dmg') v += c.effect.v;
      else if (c.effect.t === 'drain') {
        const fz = bestOwnMonsterZone(E, foe);
        if (fz >= 0) v += Math.ceil(E.effAtk(foe, fz) / 2);
      }
    }
    return v;
  }

  // Kann die KI diesen Zug durch Kampf + Jutsus gewinnen? (grobe, aber sichere Schätzung)
  function lethalAvailable(E, side) {
    const st = E.state, foe = E.other(side);
    const fp = st.players[foe];
    const mine = monList(E, side).filter((x) => x.m.mode === 'atk');
    if (!mine.length) return false;
    const boost = bestBoostInHand(E, side);
    let dmg = 0, boostLeft = boost;
    const foeMons = monList(E, foe);
    if (!foeMons.length) {
      for (const x of mine) dmg += x.atk * (x.m.attacksLeft || 1);
    } else {
      // Vereinfachung: Blocker, die wir (ggf. mit einem Boost) schlagen, zählen als entfernt;
      // jeder Blocker fängt genau einen Angriff ab. Rest geht direkt durch.
      const attackers = mine.slice().sort((a, b) => b.atk - a.atk);
      const blockers = foeMons.map((f) => ({ atk: f.m.mode === 'atk' ? f.atk : 0, def: f.m.mode === 'atk' ? f.atk : f.def, mode: f.m.mode }))
        .sort((a, b) => (a.mode === 'atk' ? a.atk : a.def) - (b.mode === 'atk' ? b.atk : b.def));
      const open = [];
      for (const a of attackers) {
        let bi = -1;
        for (let i = 0; i < blockers.length; i++) {
          const b = blockers[i];
          const wall = b.mode === 'atk' ? b.atk : b.def;
          if (a.atk > wall || a.atk + boostLeft > wall) { bi = i; break; }
        }
        if (bi >= 0) {
          const b = blockers[bi];
          const wall = b.mode === 'atk' ? b.atk : b.def;
          if (a.atk <= wall) boostLeft = 0; // Boost verbraucht
          if (b.mode === 'atk') dmg += Math.max(0, a.atk - wall);
          blockers.splice(bi, 1);
        } else {
          open.push(a);
        }
      }
      // übrige Angreifer gehen direkt (wenn alle Blocker weg sind)
      if (!blockers.length) for (const a of open) dmg += a.atk * (a.m.attacksLeft || 1);
      else return false; // Blocker stehen → kein sicherer Lethal
    }
    dmg += spellDamageInHand(E, side) + boostLeft;
    return dmg >= fp.lp;
  }

  // Droht uns nächsten Zug Lethal? (Summe offener gegnerischer ATK minus unsere Deckung)
  function lethalThreat(E, side) {
    const st = E.state, foe = E.other(side);
    const p = st.players[side];
    const foeAtk = monList(E, foe).filter((x) => x.m.mode === 'atk');
    if (!foeAtk.length) return false;
    const mine = monList(E, side);
    // Vereinfachung: jedes unserer Monster blockt einen Angriff (atk oder def)
    let blocks = mine.length;
    let dmg = 0;
    const sorted = foeAtk.slice().sort((a, b) => b.atk - a.atk);
    const walls = mine.map((x) => Math.max(x.atk, x.def)).sort((a, b) => b - a);
    for (const f of sorted) {
      if (blocks > 0) {
        blocks--;
        const w = walls.shift() || 0;
        if (f.atk > w) dmg += 0; // Monster verloren, aber kein LP-Schaden (grober Trost)
      } else {
        dmg += f.atk;
      }
    }
    return dmg >= p.lp;
  }

  /* ---------- Fallen-Antwort der KI ---------- */
  function respondTrap(E, side, difficulty) {
    const st = E.state;
    if (!st.window || st.window.kind !== 'trap' || st.window.side !== side) return null;
    const p = st.players[side];
    const smart = (difficulty || 3) >= 2;
    const genius = (difficulty || 3) >= 5;
    const pa = st.pendingAttack;
    // nur Zonen, die die Engine JETZT auch aktiviert (Bedingungen wie Stamm/Summon-Level)
    const validNow = E.validTraps(side, st.window.reason, st.window.ctx || {});
    for (let i = 0; i < 3; i++) {
      const s = p.st[i];
      if (!s || !s.faceDown) continue;
      if (validNow.indexOf(i) === -1) continue;
      const c = cardOf(E, s);
      if (c.kind !== 'falle' || c.trigger !== st.window.reason) continue;
      if (s.setTurn === st.turn) continue;
      if (st.window.reason === 'attack' && pa) {
        const atkZone = pa.zone, atkSide = pa.side;
        const direct = pa.target === -1;
        const myTarget = !direct ? st.players[side].m[pa.target] : null;
        const atkV = E.effAtk(atkSide, atkZone) +
          (myTarget && myTarget.mode !== 'defdown' && E.attrBonus ? E.attrBonus(atkSide, atkZone, side, pa.target) : 0);
        const myV = myTarget ? (myTarget.mode === 'atk' ? E.effAtk(side, pa.target) : E.effDef(side, pa.target)) : 0;
        const wouldLoseMon = myTarget && atkV > myV;
        const lethal = direct && atkV >= p.lp;
        const bigHit = direct && atkV >= (smart ? 1000 : 1500);
        const loseBigMon = wouldLoseMon && myV >= 1500;
        switch (c.effect.t) {
          case 'destroy_attacker':
            // Nur wenn wir wirklich etwas verlieren — oder der Angreifer dauerhaft gefährlich ist
            if (lethal || wouldLoseMon || bigHit || (atkV >= 1600 && !genius)) return i; break;
          case 'negate_attack':
            if (lethal || bigHit || loseBigMon) return i; break;
          case 'weaken_attacker': {
            // Lohnt, wenn unser Monster dadurch überlebt oder der Treffer ausbleibt
            const saved = wouldLoseMon && (atkV - c.effect.v) <= myV;
            const dodged = direct && (atkV - c.effect.v) <= 0;
            if (lethal || saved || dodged || (atkV >= 1900 && smart && !genius)) return i; break;
          }
          case 'negate_and_lock':
            if (lethal || atkV >= 2000 || bigHit) return i; break;
          case 'negate_and_heal':
            if (lethal || bigHit || (direct && atkV >= 700)) return i; break;
          case 'mirror_force':
            // teuerste Antwort: nur bei echter Drohung (mehrere Angreifer oder großer Verlust)
            if (lethal || loseBigMon || (st.players[atkSide].m.filter((m) => m && m.mode === 'atk').length >= 2 && (bigHit || wouldLoseMon))) return i; break;
          case 'magic_cylinder':
            if (lethal || bigHit || (atkV >= 2000 && (wouldLoseMon || direct))) return i; break;
          case 'banish_attacker':
            if (lethal || wouldLoseMon || bigHit || (atkV >= 1600 && !genius)) return i; break;
          case 'ring_attacker':
            // kostet uns selbst LP — nur wenn der Nutzen die eigenen LP überlebt
            if (lethal || ((wouldLoseMon || bigHit) && p.lp > atkV + 500)) return i; break;
          case 'negate_attack_tribe': // Stammes-Schild: freie Annullierung — Schwelle wie negate_attack
            if (lethal || bigHit || loseBigMon) return i; break;
          case 'negate_and_bounce_target': // Kawarimi: rettet das Ninja zurück auf die Hand
            if (lethal || bigHit || (wouldLoseMon && myV >= 1000)) return i; break;
        }
      } else if (st.window.reason === 'summon') {
        if (c.effect.t === 'destroy_summoned_min_level') {
          const m = st.players[st.window.ctx.side].m[st.window.ctx.zone];
          if (m && cardOf(E, m).level >= c.effect.level && E.effAtk(st.window.ctx.side, st.window.ctx.zone) >= (smart ? 2000 : 2400)) return i;
        }
        if (c.effect.t === 'banish_summoned_min_atk') {
          const m = st.players[st.window.ctx.side].m[st.window.ctx.zone];
          if (m && E.effAtk(st.window.ctx.side, st.window.ctx.zone) >= (smart ? 2000 : 2400)) return i;
        }
        if (c.effect.t === 'weaken_summoned') {
          // Hartschaum: lohnt ab mittleren Beschwörungen (der Burn ist ein Bonus)
          const m = st.players[st.window.ctx.side].m[st.window.ctx.zone];
          if (m && E.effAtk(st.window.ctx.side, st.window.ctx.zone) >= (smart ? 1500 : 1900)) return i;
        }
      } else if (st.window.reason === 'jutsu') {
        if (c.effect.t === 'negate_spell') {
          const spell = cardOf(E, st.window.ctx.spellInst);
          const t = spell.effect.t;
          const myMonCount = p.m.filter(Boolean).length;
          const myBest = bestOwnMonsterZone(E, side);
          const myV = myBest >= 0 ? E.effAtk(side, myBest) : 0;
          // Wipe/Übernahme/Bounce kontern, wenn wir nennenswert verlieren
          if (t === 'destroy_all_enemy' && (myMonCount >= 1 && (myMonCount >= 2 || myV >= 1500))) return i;
          if ((t === 'destroy_any_monster' || t === 'destroy_monster_max' || t === 'destroy_defense_monster') && myV >= 1500) return i;
          if (t === 'revive' || t === 'control' || t === 'mill') return i;
          if (t === 'bounce' && myV >= 1800) return i;
          if ((t === 'drain' || t === 'dmg') && (p.lp <= 2400)) return i;
          if (t === 'weaken_all' && myMonCount >= 2) return i;
          // bei niedriger Stufe: nur gegen die ganz gefährlichen
          if (!smart) return null;
          const danger = ['destroy_all_enemy', 'destroy_any_monster', 'destroy_monster_max', 'destroy_defense_monster',
            'revive', 'bounce', 'control', 'drain', 'mill', 'weaken_all'].indexOf(t) >= 0;
          if (danger && (myV >= 1700 || p.lp <= 1500 || smart)) return i;
        }
      }
    }
    return null;
  }

  function chooseDiscard(E, side) {
    const h = E.state.players[side].hand;
    let worst = 0, worstV = Infinity;
    for (let i = 0; i < h.length; i++) {
      const c = cardOf(E, h[i]);
      // Vanillas mit wenig ATK zuerst weg; Effekt-Karten und Fallen höher werten
      let v;
      if (isHandTrap(c)) v = 2200; // Hand-Fallen bleiben auf der Hand
      else if (c.kind === 'ninja') v = c.atk + (c.effects && c.effects.length ? 700 : 0) + (c.token ? -500 : 0);
      else if (c.kind === 'falle') v = 1500;
      else v = 1300 + ((c.effects && c.effects.length) ? 300 : 0);
      if (v < worstV) { worstV = v; worst = i; }
    }
    return worst;
  }

  /* ---------- Hand-Fallen-Antwort der KI ---------- */
  function respondHand(E, side, difficulty) {
    const st = E.state;
    if (!st.window || st.window.kind !== 'hand' || st.window.side !== side) return null;
    const p = st.players[side];
    const pa = st.pendingAttack;
    if (!pa) return null;
    const smart = (difficulty || 3) >= 2;
    const genius = (difficulty || 3) >= 5;
    const direct = pa.target === -1;
    const myTarget = !direct ? st.players[side].m[pa.target] : null;
    const atkV = E.effAtk(pa.side, pa.zone) +
      (myTarget && myTarget.mode !== 'defdown' && E.attrBonus ? E.attrBonus(pa.side, pa.zone, side, pa.target) : 0);
    const lethal = direct && atkV >= p.lp;
    const bigHit = direct && atkV >= (smart ? 1200 : 1700);
    const myV = myTarget ? (myTarget.mode === 'atk' ? E.effAtk(side, pa.target) : E.effDef(side, pa.target)) : 0;
    const loseBigMon = myTarget && atkV > myV && myV >= 1500;
    let fader = -1, noDmg = -1;
    for (const i of st.window.idxs) {
      const c = cardOf(E, p.hand[i]);
      if ((c.effects || []).some((e) => e.t === 'hand_fader') && fader < 0) fader = i;
      if ((c.effects || []).some((e) => e.t === 'hand_no_damage') && noDmg < 0) noDmg = i;
    }
    // Fader zuerst (blockiert + beendet die Phase), dann Schutz, immer geizig
    if (fader >= 0 && (lethal || bigHit)) return fader;
    if (noDmg >= 0 && (lethal || bigHit || (genius && loseBigMon))) return noDmg;
    return null;
  }

  /* ---------- Pick-Fenster (Friedhof/Deck) der KI ---------- */
  function respondPick(E, side) {
    const w = E.state.window;
    if (!w || w.kind !== 'pick') return null;
    let best = w.pool[0], bv = -1;
    for (const id of w.pool) {
      const c = cardOf(E, id);
      // Combo-Bewusstsein: on-summon-Effekte in der Lage mitbewerten —
      // so wählt die KI z. B. Gamabunta, wenn Naruto zum Rufen bereitliegt
      const v = (c.atk || 0) + (c.kind === 'ninja' ? c.level * 10 + summonFxValue(E, side, c) * 0.8 : 0);
      if (v > bv) { bv = v; best = id; }
    }
    return best;
  }

  /* ---------- Schnell-Boost im Kampf ---------- */
  function tryBoostForBattle(E, side, myZone, foeZone) {
    const p = E.state.players[side];
    const myAtk = E.effAtk(side, myZone);
    const foeAtk = E.effAtk(E.other(side), foeZone);
    if (myAtk > foeAtk) return true; // schon gut
    for (let i = 0; i < p.hand.length; i++) {
      const c = cardOf(E, p.hand[i]);
      if (c.kind === 'jutsu' && c.sub === 'schnell' && c.effect.t === 'boost_temp') {
        if (myAtk + c.effect.v > foeAtk) {
          if (tryDo(() => E.activateSpell(side, i, { targetZone: myZone }))) return true;
        }
      }
    }
    return myAtk > foeAtk;
  }

  /* ---------- Hauptphase-Aktionen ---------- */
  function* mainPhase(E, side, difficulty, phaseName) {
    const st = E.state, p = st.players[side], foe = E.other(side);
    const smart = difficulty >= 3;
    const genius = difficulty >= 5;

    const act = function* (fn) { if (tryDo(fn)) yield 'act'; };

    const foeMonCount = () => st.players[foe].m.filter(Boolean).length;
    const myMonCount = () => p.m.filter(Boolean).length;
    const foeBestZone = () => bestOwnMonsterZone(E, foe);
    const myBestZone = () => bestOwnMonsterZone(E, side);
    const foeBestAtk = () => { const z = foeBestZone(); return z >= 0 ? E.effAtk(foe, z) : 0; };
    const myBestAtk = () => { const z = myBestZone(); return z >= 0 ? E.effAtk(side, z) : 0; };
    const inDanger = () => genius && lethalThreat(E, side);
    const canKillNow = () => genius && lethalAvailable(E, side);

    /* ---- 0) LETHAL: Schaden-Jutsus zuerst, wenn sie den Sieg bringen ---- */
    if (genius) {
      const fp = st.players[foe];
      // Direktschaden aus der Hand allein tödlich?
      let sd = spellDamageInHand(E, side);
      if (sd >= fp.lp) {
        for (const t of ['dmg', 'drain']) {
          let hi;
          while ((hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === t && c.sub !== 'equip')) >= 0) {
            const ok = tryDo(() => E.activateSpell(side, hi));
            if (!ok) break;
            yield 'act';
            if (st.winner) return;
          }
        }
        if (st.winner) return;
      }
    }

    /* ---- 1) Karten ziehen / filtern ---- */
    let hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'draw');
    if (hi >= 0) yield* act(() => E.activateSpell(side, hi));
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'draw_discard');
    if (hi >= 0) yield* act(() => E.activateSpell(side, hi));
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'draw_per_monster');
    if (hi >= 0 && p.m.filter(Boolean).length >= (genius ? 2 : 1)) yield* act(() => E.activateSpell(side, hi));
    const lowHand = allHandIdx(E, side, (c) => c.kind === 'ninja' && !c.token && c.level <= 4);
    let wantSearch = lowHand.length === 0;
    if (!wantSearch && genius) {
      // Combo-Bewusstsein: sucht gezielt, wenn das beste Deck-Ziel die beste
      // kleine Hand-Option deutlich schlägt (z. B. Naruto für die Frosch-Kette)
      let deckV = 0;
      for (const id of p.deck) {
        const dc = cardOf(E, id);
        if (dc.kind === 'ninja' && !dc.token && (dc.level || 0) <= 4) {
          deckV = Math.max(deckV, dc.atk + summonFxValue(E, side, dc));
        }
      }
      let handV = 0;
      for (const li of lowHand) {
        const hc = cardOf(E, p.hand[li]);
        handV = Math.max(handV, hc.atk + summonFxValue(E, side, hc));
      }
      wantSearch = deckV > handV + 400;
    }
    if (wantSearch) {
      hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'search');
      if (hi >= 0) yield* act(() => E.activateSpell(side, hi));
    }

    /* ---- 2) Wiederbelebung / Mill ---- */
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'revive');
    if (hi >= 0 && freeM(E, side) >= 0) {
      let gv = 0;
      for (const id of p.grave) { const c = cardOf(E, id); if (c.kind === 'ninja' && c.atk > gv) gv = c.atk; }
      // lohnt, wenn das Revive-Monster das Feld verbessert oder Lethal ermöglicht
      if (gv >= (smart ? 2000 : 2400) || (genius && gv > myBestAtk()) || (genius && canKillNow())) {
        yield* act(() => E.activateSpell(side, hi));
      }
    }
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'mill');
    if (hi >= 0 && difficulty >= 6 && (st.players[foe].deck.length <= 8 || p.deck.length > st.players[foe].deck.length + 8)) {
      yield* act(() => E.activateSpell(side, hi));
    }

    /* ---- 3) Heilen ---- */
    const healLine = genius ? (inDanger() ? p.lp : 2800) : 2200;
    if (p.lp <= healLine) {
      hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'heal');
      if (hi >= 0) yield* act(() => E.activateSpell(side, hi));
    }

    /* ---- 4) Board-Wipe (Shinra Tensei): WERT abwägen, sonst WARTEN ---- */
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'destroy_all_enemy');
    if (hi >= 0 && smart) {
      const c = cardOf(E, p.hand[hi]);
      const cost = c.effect.costLP || 0;
      const foeMons = monList(E, foe);
      const wipeValue = foeMons.reduce((s, x) => s + x.atk, 0);
      const affordable = p.lp > cost + 400; // nicht in Konter-Reichweite reiten
      let use;
      if (genius) {
        use = affordable && (
          foeMons.length >= 2 ||                                   // Kernfall: 2+ Ninja
          (foeMons.length === 1 && wipeValue >= 2400 && myBestAtk() < wipeValue) || // großes Monster, das wir nicht schlagen
          (foeMons.length >= 1 && inDanger())                      // Notwehr
        );
        // Lethal-Setup: Wipe räumt den Weg frei
        if (!use && affordable && foeMons.length >= 1) {
          const before = monList(E, side).filter((x) => x.m.mode === 'atk').reduce((s, x) => s + x.atk, 0) + spellDamageInHand(E, side);
          if (before >= st.players[foe].lp) use = true;
        }
      } else {
        use = foeMons.length >= 2 || (foeMons.length >= 1 && myBestZone() === -1);
      }
      if (use) yield* act(() => E.activateSpell(side, hi));
    }

    /* ---- 5) Gezielte Entfernung — SPARSAM (relativ zur eigenen Stärke) ---- */
    // Lohnt die Zerstörung dieses Ziels? Nur wenn wir es im Kampf nicht schlagen,
    // es knapp an unserer Reichweite kratzt oder laufende Feld-Effekte trägt —
    // sonst für den richtigen Moment aufheben.
    const removalWorthIt = (tz) => {
      const tm = st.players[foe].m[tz];
      if (!tm) return false;
      const tv = tm.mode === 'atk' ? E.effAtk(foe, tz) : E.effDef(foe, tz);
      const reach = myBestAtk() + (genius ? bestBoostInHand(E, side) : 0);
      if (tv > reach) return true;                                   // im Kampf nicht schlagbar
      if (fieldFxValue(E, cardOf(E, tm)) > 0) return true;           // Aura/per_turn/Doppelangriff
      if (tv >= 1700 && tv >= myBestAtk() - 300) return true;        // echte Bedrohung
      if (genius && (inDanger() || foeMonCount() >= 3)) return true; // Notwehr / Tempo
      return false;
    };
    for (const t of ['destroy_any_monster', 'destroy_monster_max', 'destroy_defense_monster']) {
      hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === t);
      if (hi >= 0) {
        const c = cardOf(E, p.hand[hi]);
        const targets = E.listTargets(side, c, 'enemyMonster');
        if (targets.length) {
          const reach = myBestAtk() + (genius ? bestBoostInHand(E, side) : 0);
          let bestT = -1, bv = -1;
          for (const tz of targets) {
            const v = E.effAtk(foe, tz);
            // genius: bevorzugt Monster, die über unserer Kampf-Reichweite liegen
            const score = v + (genius && v > reach ? 1000 : 0);
            if (score > bv) { bv = score; bestT = tz; }
          }
          let use = removalWorthIt(bestT);
          // Lethal-Setup: einziger Blocker weg → direkter Sieg
          if (!use && genius && foeMonCount() === 1) {
            const direct = monList(E, side).filter((x) => x.m.mode === 'atk').reduce((s, x) => s + x.atk, 0) + spellDamageInHand(E, side);
            if (direct >= st.players[foe].lp) use = true;
          }
          if (use) yield* act(() => E.activateSpell(side, hi, { targetZone: bestT }));
        }
      }
    }

    /* ---- 6) Schaden-Jutsus (nicht-lethal: nur smarte Ziele) ---- */
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'dmg' && c.sub !== 'equip');
    if (hi >= 0) {
      // Sparsamkeit: Burn nur für Lethal oder wenn der Gegner schon niedrig ist —
      // smart hält jetzt ebenfalls zurück (basic darf ab 1600 LP burnen)
      const useBurn = genius ? (canKillNow() || st.players[foe].lp <= 2400)
        : smart ? st.players[foe].lp <= 2400
        : st.players[foe].lp <= 1600;
      if (useBurn) yield* act(() => E.activateSpell(side, hi));
    }

    /* ---- 7) Übernahme / Bounce des stärksten gegnerischen Ninja ---- */
    if (foeBestZone() >= 0 && smart) {
      const fz = foeBestZone();
      if (removalWorthIt(fz) || (genius && canKillNow())) {
        hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'control');
        if (hi >= 0 && freeM(E, side) >= 0) {
          yield* act(() => E.activateSpell(side, hi, { targetZone: fz }));
        } else {
          hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'bounce');
          if (hi >= 0) yield* act(() => E.activateSpell(side, hi, { targetZone: fz }));
        }
      }
    }

    /* ---- 8) Flächen-Schwäche / Drain ---- */
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'weaken_all');
    if (hi >= 0) {
      const wv = cardOf(E, p.hand[hi]).effect.v || 0;
      const reach = myBestAtk();
      const foeMons = monList(E, foe);
      // Sparsamkeit: nur wenn dadurch ein Monster schlagbar wird, die gegnerische
      // Gesamtstärke groß ist oder Notwehr droht — nicht auf zwei Minis verbrennen
      const flips = foeMons.filter((x) => x.m.mode === 'atk' && x.atk > reach && x.atk - wv <= reach).length;
      const sumAtk = foeMons.filter((x) => x.m.mode === 'atk').reduce((s, x) => s + x.atk, 0);
      const useWeaken = smart
        ? (flips >= 1 || (foeMons.length >= 2 && sumAtk >= 2600) || (genius && inDanger()))
        : foeMons.length >= 2;
      if (useWeaken) yield* act(() => E.activateSpell(side, hi));
    }
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'drain');
    if (hi >= 0 && foeBestZone() >= 0 && (E.effAtk(foe, foeBestZone()) >= 1800 || (genius && (p.lp <= 3000 || canKillNow())))) {
      yield* act(() => E.activateSpell(side, hi));
    }

    /* ---- 8a) Gezielte Schwächung (Shuriken-Wurf): Kill vorbereiten oder Drohung drücken ---- */
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'weaken_monster');
    if (hi >= 0) {
      const c = cardOf(E, p.hand[hi]);
      let wv = c.effect.v || 0;
      if (c.effect.vIf && isTribeNearby(E, side, c.effect.vIf.tribe, c.effect.vIf.idPrefix)) wv = c.effect.vIf.v;
      const targets = E.listTargets(side, c, 'enemyMonster');
      const reach = myBestAtk() + (genius ? bestBoostInHand(E, side) : 0);
      let bestT = -1, bv = -1, flipFound = false;
      for (const tz of targets) {
        const tv = E.effAtk(foe, tz);
        // am wertvollsten: Ziel, das durch die Schwächung in unsere Reichweite kippt
        const flips = tv > reach && tv - wv <= reach;
        const score = tv + (flips ? 1000 : 0);
        if (score > bv) { bv = score; bestT = tz; flipFound = flips; }
      }
      if (bestT >= 0) {
        const tv = E.effAtk(foe, bestT);
        const use = smart
          ? (flipFound || tv > reach || (genius && (inDanger() || canKillNow())))
          : tv >= 1400; // basic: nur gegen echte Hünen
        if (use) yield* act(() => E.activateSpell(side, hi, { targetZone: bestT }));
      }
    }

    /* ---- 8b) Backrow räumen, wenn wir angreifen wollen (destroy_st) ---- */
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'destroy_st');
    if (hi >= 0 && smart) {
      const c = cardOf(E, p.hand[hi]);
      const targets = E.listTargets(side, c, 'enemyST');
      if (targets.length) {
        // nur wenn wir diesen Zug angreifen (wollen/können) — sonst aufheben
        const wantAttack = canKillNow() || monList(E, side).some((x) => x.m.mode === 'atk');
        if (wantAttack) {
          // gesetzte (verdeckte) Karten zuerst — dort lauern die Fallen
          let bestT = targets[0];
          for (const tz of targets) { if (st.players[foe].st[tz].faceDown) { bestT = tz; break; } }
          yield* act(() => E.activateSpell(side, hi, { targetZone: bestT }));
        }
      }
    }

    /* ---- 8c) YGO-Staple-Jutsus: Backrow-Mass-Removal, Locks, Tricks ---- */
    // Fūton: Taifū (Harpie): ab 2 Backrow — oder 1, wenn wir angreifen wollen
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'destroy_all_st_enemy');
    if (hi >= 0 && smart) {
      const n = st.players[foe].st.filter(Boolean).length;
      if (n >= 2 || (n >= 1 && (canKillNow() || monList(E, side).some((x) => x.m.mode === 'atk')))) {
        yield* act(() => E.activateSpell(side, hi));
      }
    }
    // Riesen-Rückrufwelle (Giant Trunade): nur bei Backrow-Nachteil
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'bounce_all_st');
    if (hi >= 0 && smart) {
      const foeN = st.players[foe].st.filter(Boolean).length, myN = p.st.filter(Boolean).length;
      if (foeN >= 2 && foeN > myN) yield* act(() => E.activateSpell(side, hi));
    }
    // Mondschatten (Book of Moon): deren Bestes verdeckt legen — schlägbar in Def / Notwehr
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'flip_down');
    if (hi >= 0 && smart) {
      const fz = foeBestZone();
      if (fz >= 0 && st.players[foe].m[fz].mode === 'atk') {
        const fv = E.effAtk(foe, fz), fd = E.effDef(foe, fz);
        const reach = myBestAtk() + (genius ? bestBoostInHand(E, side) : 0);
        if ((fv > reach && myBestAtk() > fd) || (genius && inDanger())) {
          yield* act(() => E.activateSpell(side, hi, { targetZone: 3 + fz }));
        }
      }
    }
    // Shintenshin (Creature Swap): schlechtestes eigenes gegen bestes gegnerisches
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'swap_control');
    if (hi >= 0 && smart) {
      const fz = foeBestZone(), wz = weakestOwnMonsterZone(E, side);
      if (fz >= 0 && wz >= 0 && E.effAtk(foe, fz) - E.effAtk(side, wz) >= (genius ? 400 : 600)) {
        yield* act(() => E.activateSpell(side, hi, { ownZone: wz, targetZone: fz }));
      }
    }
    // Hachimon Kai (Limiter): nur für den direkten Sieg
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'limiter');
    if (hi >= 0 && genius && myBestZone() >= 0) {
      const bz = myBestZone();
      if (foeMonCount() === 0 && E.effAtk(side, bz) * 2 >= st.players[foe].lp) {
        yield* act(() => E.activateSpell(side, hi, { targetZone: bz }));
      }
    }
    // Lichtsiegel (Schwerter): Notwehr/Zeit gewinnen (genius)
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'attack_lock');
    if (hi >= 0 && genius && (inDanger() || (foeMonCount() >= 2 && myMonCount() <= 1))) {
      yield* act(() => E.activateSpell(side, hi));
    }
    // Weisheits-Grube (Foolish Burial): Revive-Futter, wenn der Friedhof leer ist
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'foolish');
    if (hi >= 0 && genius) {
      const hasRevive = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'revive') >= 0;
      let gv = 0;
      for (const id of p.grave) { const c = cardOf(E, id); if (c.kind === 'ninja' && c.atk > gv) gv = c.atk; }
      if (hasRevive && gv < 2000) yield* act(() => E.activateSpell(side, hi));
    }
    // Sumpf der Unterwelt (Dauer-Karte): ausspielen, sobald der Gegner Ninja hat
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.sub === 'dauer');
    if (hi >= 0 && smart && freeST(E, side) >= 0 && foeMonCount() >= 1) {
      yield* act(() => E.activateSpell(side, hi));
    }
    // Kröten-Magen: das gefährlichste gegnerische Ninja lahmlegen (wie Removal, nur temporär)
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'lock_monster');
    if (hi >= 0 && smart && foeBestZone() >= 0 && removalWorthIt(foeBestZone())) {
      yield* act(() => E.activateSpell(side, hi, { targetZone: foeBestZone() }));
    }

    /* ---- 9) Schutz & Angriffs-Verstärker ---- */
    if (difficulty >= 5 && myBestZone() >= 0) {
      const bz = myBestZone();
      const bv = E.effAtk(side, bz);
      // protect: wenn wir das Feld dominieren (Gegner muss mit Effekten kommen)
      hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'protect');
      if (hi >= 0 && bv >= Math.max(1700, foeBestAtk())) yield* act(() => E.activateSpell(side, hi, { targetZone: bz }));
      // double_attack: wenn 2 Kills oder Lethal durch das Monster möglich
      hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'grant_double_attack');
      if (hi >= 0 && bv >= 1700 && (canKillNow() || foeMonCount() >= 2 || foeMonCount() === 0)) {
        yield* act(() => E.activateSpell(side, hi, { targetZone: bz }));
      }
      // direct_attack: nur wenn es großen Schaden/Lethal bringt
      hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'direct_attack');
      if (hi >= 0 && (canKillNow() || bv >= 2400)) yield* act(() => E.activateSpell(side, hi, { targetZone: bz }));
    }

    /* ---- 10) Gegner in Verteidigung zwingen — nur wenn das einen Kill ermöglicht ---- */
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'pos_change');
    if (hi >= 0 && smart) {
      const ez = foeBestZone();
      if (ez >= 0 && st.players[foe].m[ez].mode === 'atk') {
        const foeV = E.effAtk(foe, ez), foeD = E.effDef(foe, ez);
        // lohnt nur, wenn wir das Ninja im Angriff nicht schlagen, in Verteidigung aber schon
        if (foeV > myBestAtk() && myBestAtk() > foeD) {
          yield* act(() => E.activateSpell(side, hi, { targetZone: ez }));
        }
      }
    }

    /* ---- 10b) Henge (Stat-Tausch): wenn der Tausch einen Kill oder die Threat-Wende bringt ---- */
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'swap_stats');
    if (hi >= 0 && smart) {
      const threat = foeThreat(E, side);
      let bestZ = -1, gain = 0;
      for (const x of monList(E, side)) {
        if (x.m.mode !== 'atk') continue;
        const g = x.def - x.atk; // was der Tausch an ANG brächte
        if (g > gain) { gain = g; bestZ = x.z; }
      }
      if (bestZ >= 0 && gain >= 300) {
        const nowA = E.effAtk(side, bestZ), newA = nowA + gain;
        const flipsThreat = nowA <= threat.atk && newA > threat.atk;
        if (flipsThreat || (genius && canKillNow())) {
          yield* act(() => E.activateSpell(side, hi, { targetZone: bestZ }));
        }
      }
    }

    /* ---- 11) Beschwörung (Tribut-Effizienz + Positionswahl) ---- */
    if (!p.normalSummoned) {
      // Cyber-Dragon-Stil: bei leerem eigenem Feld sofort spezialbeschwören (kostenlos)
      if (smart && !p.m.some(Boolean) && st.players[foe].m.some(Boolean)) {
        const ci = handIdxOf(E, side, (c) => c.kind === 'ninja' && !c.token && (c.effects || []).some((ef) => ef.t === 'cyber_summon'));
        if (ci >= 0 && tryDo(() => E.cyberSummon(side, ci, freeM(E, side)))) yield 'act';
      }
      // Combo-Bewusstsein: fehlt genau 1 Körper für einen Zwei-Tribut-Boss,
      // spielt die KI zuerst ein Token-Jutsu als Futter (Kagebunshin → Gamabunta/Jiraiya)
      if (genius && p.m.filter(Boolean).length === 1 && freeM(E, side) >= 0 &&
          handIdxOf(E, side, (c) => c.kind === 'ninja' && !c.token && c.level >= 7) >= 0) {
        const th = handIdxOf(E, side, (x) => x.kind === 'jutsu' && x.effect.t === 'token');
        if (th >= 0 && tryDo(() => E.activateSpell(side, th))) yield 'act';
      }
      // ALLE Tribut-Kandidaten der Hand bewerten (nicht nur der erste ≥5) —
      // sonst verhungern Boss-Monster hinter einem unpassenden ersten Kandidaten
      const cand = allHandIdx(E, side, (c) => c.kind === 'ninja' && !c.token && c.level >= 5);
      let didTribute = false;
      if (cand.length) {
        const myMon = p.m.map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
        let best = null;
        for (const tribIdx of cand) {
          const c = cardOf(E, p.hand[tribIdx]);
          const need = c.level >= 7 ? 2 : 1;
          if (myMon.length < need) continue;
          // Opfer: Tokens zuerst, dann nach Verlustwert (ATK + bleibende Feld-Effekte —
          // Aura-/per_turn-/Doppelangriff-Ninja opfert die KI nur ungern)
          const keepVal = (z) => E.effAtk(side, z) + (genius ? fieldFxValue(E, cardOf(E, p.m[z])) : 0);
          // Stammes-Tribut (Kröten-König/Echo-Bosse): NUR Stammes-Körper sind gültig —
          // sonst schlägt der Engine-Aufruf still fehl und der Boss verhungert auf der Hand
          let pool = myMon;
          if (c.tribeTribute) {
            pool = myMon.filter((z) => E.cardOf(p.m[z]).tribe === c.tribeTribute);
            if (pool.length < need) continue;
          }
          const sorted = pool.slice().sort((a, b) => {
            const ta = p.m[a].id === 'kage_token' ? 0 : 1, tb = p.m[b].id === 'kage_token' ? 0 : 1;
            if (ta !== tb) return ta - tb;
            return keepVal(a) - keepVal(b);
          });
          const tributes = sorted.slice(0, need);
          // Wert der Opfer: 2. Körper zählt nur halb — ATK-Summe überbewertet Mehrfach-Bodies
          // (schlechte Trades, Wipe-anfällig, 3 Zonen); Tokens zählen 0.
          const vals = tributes.map((z) => (p.m[z].id === 'kage_token' ? 0 : E.effAtk(side, z))).sort((a, b) => b - a);
          const tributeValue = vals.reduce((s, v, i) => s + v * (i === 0 ? 1 : 0.5), 0);
          // Wert des Neuzugangs inkl. on-summon-Effekten in der aktuellen Lage;
          // summon_from-Träger lassen das Feld nicht leer zurück (Ziel kommt sofort mit)
          const fxV = summonFxValue(E, side, c);
          const leftAfter = myMon.length - need + (summonFromHit(E, side, c) ? 1 : 0);
          const worthIt = genius
            ? (c.atk + fxV) > tributeValue + 200 && !(inDanger() && leftAfter === 0)
            : c.atk >= 2200 || !smart;
          if (!worthIt) continue;
          const score = c.atk + fxV - tributeValue;
          if (!best || score > best.score) best = { tribIdx, tributes, score };
        }
        if (best) {
          didTribute = tryDo(() => E.summon(side, best.tribIdx, best.tributes[0], { tributes: best.tributes }));
          if (didTribute) yield 'act';
        }
      }
      if (!didTribute && !p.normalSummoned) {
        const threat = foeThreat(E, side);
        const foeAttr = {}; // häufigstes gegnerisches Attribut für Element-Vorteil
        for (const x of monList(E, foe)) if (x.c.attr) foeAttr[x.c.attr] = (foeAttr[x.c.attr] || 0) + 1;
        // Bester Angreifer (ATK-orientiert) UND bester Wall (DEF-orientiert) getrennt suchen
        let bestHi = -1, bv = -1, wallHi = -1, wv = -1;
        for (let i = 0; i < p.hand.length; i++) {
          const c = cardOf(E, p.hand[i]);
          if (c.kind === 'ninja' && !c.token && c.level <= 4 && !isHandTrap(c)) { // Hand-Fallen bleiben auf der Hand
            const fx = genius ? summonFxValue(E, side, c) : 0; // feuern die Effekte überhaupt?
            let v = c.atk + c.def * 0.3 + fx;
            if (genius && c.attr && NT.ATTR_BEATS && NT.ATTR_BEATS[c.attr] && foeAttr[NT.ATTR_BEATS[c.attr]]) v += 300;
            if (v > bv) { bv = v; bestHi = i; }
            const w = c.def + fx; // Wall-Wert: DEF + feuernde Effekte
            if (w > wv) { wv = w; wallHi = i; }
          }
        }
        if (bestHi >= 0 && freeM(E, side) >= 0) {
          const c = cardOf(E, p.hand[bestHi]);
          const zone = freeM(E, side);
          const danger = genius && inDanger();
          // effektive ATK nach on-summon-Veränderungen: boost_self stärkt uns,
          // weaken_on_summon senkt deren bestes Ninja → beides gegen den Threat rechnen
          let boostSelf = 0, weakenV = 0;
          for (const ef of (c.effects || [])) {
            if (ef.t === 'boost_self_on_summon') boostSelf += ef.v || 0;
            if (ef.t === 'weaken_on_summon') weakenV += ef.v || 0;
          }
          const fx = genius ? summonFxValue(E, side, c) : 0;
          const beatsThreat = threat.atk === 0 || c.atk + boostSelf >= threat.atk - weakenV;
          const fxCarries = fx >= 250 && !danger; // feuernder Effekt rechtfertigt den Körper
          if (!smart) {
            // basic: wie bisher mutig
            if (c.atk >= 1300 || c.atk >= threat.atk) yield* act(() => E.summon(side, bestHi, zone, {}));
            else yield* act(() => E.summon(side, bestHi, zone, { faceDown: true }));
          } else if ((danger && c.atk + boostSelf < threat.atk) || (!beatsThreat && !fxCarries)) {
            // überlegener Gegner: besten Wall VERDECKT setzen — kein LP-Schaden,
            // falls er zerstört wird (außer Piercing, dann ist die Info wenigstens verdeckt)
            yield* act(() => E.summon(side, wallHi, zone, { faceDown: true }));
          } else {
            yield* act(() => E.summon(side, bestHi, zone, {}));
          }
        }
      }
    }

    /* ---- 12) Spezialbeschwörungen (Kuchiyose / Kröten-Ruf / Token) ---- */
    for (const spType of ['sp_summon_hand', 'sp_summon_hand_tribe']) {
      hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === spType);
      if (hi >= 0 && freeM(E, side) >= 0) {
        const c = cardOf(E, p.hand[hi]);
        const req = spType === 'sp_summon_hand' ? 'handNinja' : 'handTribe';
        const targets = E.listTargets(side, c, req);
        if (targets.length) {
          // Combo-Bewusstsein: Ziel nach ATK + feuernden on-summon-Effekten wählen
          let bestT = targets[0], bv = -1;
          for (const t of targets) {
            const cc = cardOf(E, p.hand[t]);
            const vv = cc.atk + summonFxValue(E, side, cc);
            if (vv > bv) { bv = vv; bestT = t; }
          }
          yield* act(() => E.activateSpell(side, hi, { selectHandIdx: bestT }));
        }
      }
    }
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'token');
    // smart immer; basic (Iruka) nur, wenn das Feld dünn ist — sonst verbrennt er den Schutz
    if (hi >= 0 && freeM(E, side) >= 0 && (smart || myMonCount() <= 1)) yield* act(() => E.activateSpell(side, hi));

    /* ---- 13) Boosts NUR für Kills/Lethal (Equip, Hachimon) ---- */
    if (myBestZone() >= 0) {
      const bz = myBestZone();
      const bv = E.effAtk(side, bz);
      const foeV = foeBestAtk();
      // Equip/Perm-Boost: nur wenn er einen Kill gegen deren bestes Monster ermöglicht
      // oder Lethal-Reichweite schafft — sonst für später aufheben
      const foeAlive = foeMonCount() > 0;
      const killNow = foeAlive && bv < foeV;
      for (const kind of ['equip', 'perm']) {
        hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' &&
          (kind === 'equip' ? c.sub === 'equip' : (c.effect.t === 'boost_perm')));
        if (hi < 0) continue;
        const c = cardOf(E, p.hand[hi]);
        const v = c.effect.v || c.effect.atk || 0;
        // Ausrüstung mit Kartenbindung (Rasengan→Eremit): richtiges Ziel suchen
        let bz2 = bz;
        if (kind === 'equip' && c.effect.tribeId) {
          bz2 = -1;
          for (let z = 0; z < 3; z++) if (p.m[z] && p.m[z].id === c.effect.tribeId) bz2 = z;
          if (bz2 < 0) continue;
        }
        const bv2 = E.effAtk(side, bz2);
        const killNow2 = foeAlive && bv2 < foeV;
        const lpOk = !c.effect.costLP || p.lp > c.effect.costLP + 900;
        let use;
        if (genius) {
          use = lpOk && (
            (killNow2 && bv2 + v > foeV) ||                       // Kill gegen deren Bestes
            (!foeAlive && st.players[foe].lp <= bv2 + v + spellDamageInHand(E, side) + bestBoostInHand(E, side)) || // Lethal-Reichweite
            (foeAlive && bv2 > foeV && bv2 >= 2400)               // Feld dominieren: verstärken ok
          );
        } else {
          use = lpOk && (kind === 'equip' ? freeST(E, side) >= 0 : smart);
        }
        if (kind === 'equip' && freeST(E, side) < 0) use = false;
        if (use) yield* act(() => E.activateSpell(side, hi, { targetZone: bz2 }));
      }
    }

    /* ---- 13b) bounce_own: wertvollen Effekt-Ninja retten (genius, konservativ) ---- */
    hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.effect.t === 'bounce_own');
    if (hi >= 0 && genius) {
      const threat = foeThreat(E, side);
      let bestZ = -1, bv = 0;
      for (const x of monList(E, side)) {
        if (x.m.mode !== 'atk') continue;
        const fx = summonFxValue(E, side, x.c);
        // würde nächste Runde überrannt und trägt einen feuernden on-summon-Effekt
        if (fx >= 300 && x.atk < threat.atk && fx > bv) { bv = fx; bestZ = x.z; }
      }
      if (bestZ >= 0 && (p.lp <= 3000 || threat.pierce)) {
        yield* act(() => E.activateSpell(side, hi, { targetZone: bestZ }));
      }
    }

    /* ---- 13c) Aktivierbare Monster-Effekte (Bounce/Zerstören/Boost 1×/Zug, Kosten 1 Handkarte) ---- */
    {
      for (let z = 0; z < 3; z++) {
        const m = p.m[z];
        if (!m || m.fxUsedTurn === st.turn || p.hand.length < 2) continue;
        const fx = (cardOf(E, m).effects || []).find((e) => e.t === 'bounce_enemy_per_turn' || e.t === 'destroy_weak_per_turn' || e.t === 'boost_self_per_turn');
        if (!fx) continue;
        if (fx.t === 'boost_self_per_turn') {
          // Klassenclown: nur wenn der Boost einen Kill kippt oder Lethal drückt (alle Stufen)
          const v = fx.v || 600;
          if (m.mode !== 'atk') continue;
          const myA = E.effAtk(side, z);
          let use = false;
          for (let t2 = 0; t2 < 3; t2++) {
            const fm = st.players[foe].m[t2];
            if (!fm) continue;
            const fv = fm.mode === 'atk' ? E.effAtk(foe, t2) : E.effDef(foe, t2);
            if (myA <= fv && myA + v > fv) { use = true; break; } // Kill kippt
          }
          if (!use && !st.players[foe].m.some(Boolean)) {
            use = st.players[foe].lp <= myA + v && st.players[foe].lp > myA; // Lethal-Reichweite
          }
          if (use) yield* act(() => E.activateMonsterFx(side, z));
        } else if (!smart) { /* basic: Bounce/Zerstören nicht nutzen */ }
        else if (fx.t === 'bounce_enemy_per_turn') {
          const fz = foeBestZone();
          if (fz >= 0 && E.effAtk(foe, fz) >= (genius ? 1600 : 2000)) {
            yield* act(() => E.activateMonsterFx(side, z));
          }
        } else {
          // destroy_weak: nur wenn das beste erreichbare Ziel es wert ist (oder Lethal-Frei)
          let bz2 = -1, bv2 = -1;
          for (let t = 0; t < 3; t++) {
            if (!st.players[foe].m[t]) continue;
            const v = E.effAtk(foe, t);
            if (v <= (fx.maxAtk || 2000) && v > bv2) { bv2 = v; bz2 = t; }
          }
          if (bz2 >= 0 && (bv2 >= (genius ? 1400 : 1700) || (genius && foeMonCount() === 1 && canKillNow()))) {
            yield* act(() => E.activateMonsterFx(side, z));
          }
        }
      }
    }

    /* ---- 14) Fallen setzen ---- */
    if (phaseName === 'main1' || phaseName === 'main2') {
      const maxSet = genius && inDanger() ? 3 : 2; // unter Drohung mehr Deckung
      for (let set = 0; set < maxSet; set++) {
        hi = handIdxOf(E, side, (c) => c.kind === 'falle');
        if (hi >= 0 && freeST(E, side) >= 0) {
          yield* act(() => E.setST(side, hi, freeST(E, side)));
        } else break;
      }
      // Bluff: ein normales Jutsu setzen, wenn Hand voll
      if (p.hand.length > 5 && freeST(E, side) >= 0) {
        hi = handIdxOf(E, side, (c) => c.kind === 'jutsu' && c.sub === 'normal');
        if (hi >= 0) yield* act(() => E.setST(side, hi, freeST(E, side)));
      }
    }

    /* ---- 15) Flip-Beschwörungen: nur wenn der Gegner damit geschlagen wird ---- */
    {
      const threat = foeThreat(E, side);
      for (let z = 0; z < 3; z++) {
        const m = p.m[z];
        if (m && m.mode === 'defdown' && m.summonedTurn !== st.turn) {
          const c = cardOf(E, m);
          const hasFlipFx = (c.effects || []).some((ef) => ef.t === 'flip_draw');
          const flipUp = !smart ? c.atk >= 1200
            : c.atk > threat.atk || (genius && canKillNow()) || hasFlipFx ||
              (threat.atk === 0 && c.atk >= 1000);
          if (flipUp) { if (tryDo(() => E.flipSummon(side, z))) yield 'act'; }
        }
      }
    }

    /* ---- 16) Positionswechsel (def, wenn der Gegner stärker ist — und zurück) ---- */
    if (smart && phaseName === 'main1') {
      // zurück in den Angriff, wenn wir deren Bestes jetzt schlagen
      const threat = foeThreat(E, side);
      for (let z = 0; z < 3; z++) {
        const m = p.m[z];
        if (!m || m.mode !== 'defup' || m.summonedTurn === st.turn || m.posChanged) continue;
        if (E.effAtk(side, z) >= threat.atk && E.effAtk(side, z) >= 1200) {
          if (tryDo(() => E.changePos(side, z))) yield 'act';
        }
      }
    }
    if (smart && phaseName === 'main2') {
      // Monster, die nichts schlagen konnten, in die Verteidigung (spart LP)
      const threat = foeThreat(E, side);
      if (threat.atk > 0 && !(genius && canKillNow())) {
        for (let z = 0; z < 3; z++) {
          const m = p.m[z];
          if (!m || m.mode !== 'atk' || m.summonedTurn === st.turn || m.posChanged) continue;
          const a = E.effAtk(side, z), d = E.effDef(side, z);
          // gegen Durchdringung nur wechseln, wenn DEF der bessere Schaden-Puffer ist
          const goDef = threat.pierce ? (a < threat.atk && d >= a) : a < threat.atk;
          if (goDef) { if (tryDo(() => E.changePos(side, z))) yield 'act'; }
        }
      }
    }
  }

  /* ---------- Kampfphase ---------- */
  function* battlePhase(E, side, difficulty) {
    const st = E.state, p = st.players[side], foe = E.other(side);
    const genius = difficulty >= 5;
    // Angriffsreihenfolge: bei gesetzten gegnerischen Fallen erst die entbehrlichsten
    // Angreifer als Köder; sonst stärkste zuerst (sichere Kills früh)
    function attackOrder() {
      const zones = [];
      for (let z = 0; z < 3; z++) if (E.canAttack(side, z)) zones.push(z);
      const foeSetTraps = st.players[foe].st.filter((s) => s && s.faceDown).length;
      if (genius && foeSetTraps > 0) zones.sort((a, b) => E.effAtk(side, a) - E.effAtk(side, b));
      else zones.sort((a, b) => E.effAtk(side, b) - E.effAtk(side, a));
      return zones;
    }
    for (const z of attackOrder()) {
      while (E.canAttack(side, z)) {
        if (st.winner) return;
        if (st.window) return; // Sicherheit
        const enemyHasMon = st.players[foe].m.some(Boolean);
        if (!enemyHasMon) {
          if (tryDo(() => E.declareAttack(side, z, -1))) yield 'attack';
          else break; // z. B. no_direct: dieses Ninja kann nicht direkt angreifen
          continue; // Doppelangriff: bei attacksLeft > 1 geht es direkt weiter
        }
        // bestes Ziel: maximaler LP-Schaden bei sicherem Kill; Sekundär: deren ATK
        let target = -1, bestGain = -Infinity, bestDiff = 0;
        for (let t = 0; t < 3; t++) {
          const tm = st.players[foe].m[t];
          if (!tm) continue;
          const myAtk = E.effAtk(side, z) +
            (tm.mode !== 'defdown' && E.attrBonus ? E.attrBonus(side, z, foe, t) : 0);
          // D.D.-Warnung: deutlich stärkeres Monster würde mitverbannt — schlechter Tausch
          if (genius && tm.mode !== 'defdown' && (cardOf(E, tm).effects || []).some((ef) => ef.t === 'dd_both') &&
              myAtk - (tm.mode === 'atk' ? E.effAtk(foe, t) : E.effDef(foe, t)) > 800) continue;
          if (tm.mode === 'atk') {
            const diff = myAtk - E.effAtk(foe, t);
            if (diff > 0) {
              const gain = diff * 10 + E.effAtk(foe, t); // Schaden zuerst, dann Bedrohung
              if (gain > bestGain) { bestGain = gain; target = t; bestDiff = diff; }
            }
          } else {
            const diff = myAtk - E.effDef(foe, t);
            if (diff > 0) {
              const gain = 2500 + diff; // DEF-Monster sicher killen (kein Rückschlag)
              if (gain > bestGain) { bestGain = gain; target = t; bestDiff = diff; }
            }
          }
        }
        if (target === -1 && difficulty >= 2) {
          // mit Boost retten? (D.D.-Warnung gilt hier genauso)
          let strongestFoe = -1, fv = -1;
          for (let t = 0; t < 3; t++) {
            const tm = st.players[foe].m[t];
            if (!tm || tm.mode !== 'atk') continue;
            if (genius && (cardOf(E, tm).effects || []).some((ef) => ef.t === 'dd_both') &&
                E.effAtk(side, z) - E.effAtk(foe, t) > 800) continue;
            const v = E.effAtk(foe, t);
            if (v > fv) { fv = v; strongestFoe = t; }
          }
          if (strongestFoe >= 0 && tryBoostForBattle(E, side, z, strongestFoe)) {
            yield 'boost';
            target = strongestFoe;
            const diff = E.effAtk(side, z) - E.effAtk(foe, target);
            if (diff <= 0) target = -1;
          }
        }
        if (target === -1 && genius) {
          // Gleichstands-Trade: nur der letzte verbleibende Angreifer, nur gegen
          // Angriffsposition — entfernt deren Monster ohne eigenen LP-Verlust
          let left = 0;
          for (let zz = 0; zz < 3; zz++) if (E.canAttack(side, zz)) left++;
          if (left === 1) {
            let eq = -1, ev = -1;
            for (let t = 0; t < 3; t++) {
              const tm = st.players[foe].m[t];
              if (tm && tm.mode === 'atk') {
                const v = E.effAtk(foe, t);
                // Trade nur, wenn er sich lohnt: Ziel trägt Feld-Effekte
                // oder wir haben weitere Monster, die den Gewinn sichern
                const worth = fieldFxValue(E, cardOf(E, tm)) > 0 || monList(E, side).length >= 2;
                if (worth && E.effAtk(side, z) === v && v > ev) { ev = v; eq = t; }
              }
            }
            if (eq >= 0) target = eq;
          }
        }
        if (target === -1) break; // kein lohnendes Ziel → Selbstmord nie
        E.declareAttack(side, z, target);
        yield 'attack';
      }
    }
  }

  /* ---------- Kompletter KI-Zug ---------- */
  function* turn(E, side, difficulty) {
    difficulty = difficulty || 3;
    const st = E.state;
    yield* mainPhase(E, side, difficulty, 'main1');
    if (st.winner) return;
    if (st.window) { yield { waitWindow: true }; if (st.winner) return; }
    // → Kampfphase
    if (st.phase === 'main1') {
      E.advance();
      yield 'phase';
    }
    if (st.phase === 'battle') {
      yield* battlePhase(E, side, difficulty);
      if (st.winner) return;
      if (st.window) { yield { waitWindow: true }; if (st.winner) return; }
    }
    if (st.phase === 'battle') { E.advance(); yield 'phase'; }
    // Hauptphase 2: noch setzen, was geht
    if (st.phase === 'main2') {
      yield* mainPhase(E, side, difficulty, 'main2');
      if (st.winner) return;
      E.advance();
      yield 'phase';
    }
    // Abwurf-Fenster der KI automatisch bedienen
    while (st.window && st.window.kind === 'discard' && st.window.side === side) {
      E.respondDiscard(chooseDiscard(E, side));
      yield 'discard';
    }
  }

  NT.AI = { turn, respondTrap, respondHand, chooseDiscard, respondPick };
})(typeof window !== 'undefined' ? window : globalThis);
