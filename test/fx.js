/* Gezielte Unit-Tests für das Effekt-System (DOM-frei) — Kartenpool-Neustart:
   getestet werden die überlebenden Theme-Decks (Konoha-Starter + Kröten).
   Steuert Draw-Reihenfolge über Deck-Arrays (gezogen wird via pop() vom ENDE).
   Aufruf: node test/fx.js */
'use strict';
require('../js/data.js');
require('../js/engine.js');
const NT = globalThis.NTCG;

let fails = 0, count = 0;
const t = (name, cond) => { count++; if (!cond) { fails++; console.error('  ✗ ' + name); } else console.log('  ✓ ' + name); };

const FILL = 'akademie_schueler';
const mk = (handP, restP, handA, restA) => ({
  // pop() zieht vom Ende → Hand-Arrays umgekehrt anhängen, damit hand[0] = handP[0]
  deckP: restP.concat(handP.slice().reverse()),
  deckA: restA.concat(handA.slice().reverse()),
});
function game(deckP, deckA, seed) {
  // rng≈1 → shuffle = Identität, Draw-Reihenfolge bleibt exakt die Deck-Ordnung (pop vom Ende)
  const E = NT.Engine.create({ deckP, deckA, rng: () => 0.999999 });
  E.start();
  return E;
}
const ids = (arr) => arr.map((x) => (typeof x === 'string' ? x : x.id));
const fieldIds = (E, side) => ids(E.state.players[side].m.filter(Boolean));
const handIds = (E, side) => ids(E.state.players[side].hand);
function clearWindows(E) { // generisch alle offenen Fenster bedienen (erste Wahl)
  let g = 0;
  while (E.state.window && g++ < 10) {
    const w = E.state.window;
    if (w.kind === 'discard') E.respondDiscard(0);
    else if (w.kind === 'pick') E.respondPick(w.pool[0]);
    else if (w.kind === 'hand') E.respondHand(null);
    else E.respond(null);
  }
}
function passTurn(E) { // main1 → main2 → nächster Zug (Fenster generisch bedienen)
  if (E.state.phase === 'main1') E.advance();
  clearWindows(E);
  if (E.state.phase === 'battle') E.advance();
  clearWindows(E);
  if (E.state.phase === 'main2') E.advance();
  clearWindows(E);
}
const putM = (E, side, zone, id, mode) => {
  E.state.players[side].m[zone] = { uid: 500 + zone, id, mode: mode || 'atk', summonedTurn: 1,
    atkMod: 0, defMod: 0, tempAtk: 0, tempPierce: false, attacksLeft: 1, posChanged: false, lockUntil: 0 };
};
const setTrap = (E, side, zone, id) => { E.state.players[side].st[zone] = { uid: 900 + zone, id, faceDown: true, setTurn: 1 }; };
const toBattle = (E, active) => { E.state.phase = 'battle'; E.state.active = active || 'P'; E.state.turn = 2; };

/* ========== Starter-Theme: Team 7 / Konoha ========== */
console.log('== Starter-Deck (Konoha) ==');
{
  // Naruto-Schüler: Jutsu-Suche nur bei NORMALER Beschwörung
  const d = mk(['naruto_schueler', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, 'schatten_bindung', 'gama', FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  E.summon('P', 0, 0, {});
  t('Schüler: Such-Fenster, nur Jutsus im Pool',
    E.state.window && E.state.window.kind === 'pick' && E.state.window.pool.indexOf('schatten_bindung') >= 0 && E.state.window.pool.indexOf('gama') < 0);
  E.respondPick('schatten_bindung');
  t('Schüler: Jutsu auf die Hand', handIds(E, 'P').indexOf('schatten_bindung') >= 0);
}
{
  // Konohamaru-Rivale: bei Kampf-Tod Naruto-Genin aus dem Deck
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, 'naruto_genin', FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'konohamaru_rivale'); putM(E, 'A', 0, 'gamakichi_krieger');
  toBattle(E, 'A');
  E.declareAttack('A', 0, 0);
  t('Rivale: Kette nach Kampf-Tod', fieldIds(E, 'P').indexOf('naruto_genin') >= 0);
}
{
  // Naruto-Genin: +300 ANG nur mit Konoha daneben
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'naruto_genin');
  const solo = E.effAtk('P', 0) === 1500;
  putM(E, 'P', 1, 'konohamaru_rivale');
  t('Genin: 1500 solo / 1800 mit Konoha', solo && E.effAtk('P', 0) === 1800);
}
{
  // Iruka-Wächter: kein Direktangriff + Umleitung 1×/Zug
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'iruka_waechter');
  toBattle(E);
  let threw = false;
  try { E.declareAttack('P', 0, -1); } catch (e) { threw = true; }
  t('Iruka: kein Direktangriff möglich', threw);
}
{
  // Umleitung greift: Angreifer trifft Iruka statt Rivale
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'naruto_kyuubi');
  putM(E, 'A', 0, 'iruka_waechter'); putM(E, 'A', 1, 'konohamaru_rivale');
  toBattle(E);
  E.declareAttack('P', 0, 1); // Ziel Rivale → Umleitung auf Iruka (800 ANG, stirbt)
  t('Iruka: lenkt Angriff auf sich um (stirbt statt Rivale)',
    !E.state.players.A.m[0] && !!E.state.players.A.m[1]);
}
{
  // Kyūbi: nur Konoha-Tribut + Zerstörungs-Effekt (≤2000 ANG)
  const d = mk(['naruto_kyuubi', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'konohamaru_rivale'); putM(E, 'P', 1, 'gama'); // Gama ist KEIN Konoha
  let threw = false, msg = '';
  try { E.summon('P', 0, 0, { tributes: [0, 1] }); } catch (e) { threw = true; msg = e.message; }
  E.state.players.P.m[1] = null;
  putM(E, 'P', 1, 'naruto_genin'); // jetzt 2 Konoha
  E.summon('P', 0, 0, { tributes: [0, 1] });
  const summoned = fieldIds(E, 'P').indexOf('naruto_kyuubi') >= 0;
  putM(E, 'A', 0, 'gamakichi_krieger'); // 1500 → gültiges Ziel
  E.activateMonsterFx('P', 0);
  t('Kyūbi: Abwurf-Fenster für die Kosten', E.state.window && E.state.window.kind === 'discard');
  E.respondDiscard(0);
  t('Kyūbi: nur Konoha-Tribut; Effekt zerstört Krieger (≤2000)',
    threw && summoned && !E.state.players.A.m[0]);
  t('Kyūbi: Tribut-Fehlermeldung nennt Konoha (nicht Kröten)',
    msg.indexOf('Konoha') >= 0 && msg.indexOf('Kröten') < 0);
}
{
  // Kyūbi-Effekt: kein gültiges Ziel → deutsch gemecker, keine Kosten
  const d = mk(['naruto_kyuubi', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'naruto_kyuubi');
  putM(E, 'A', 0, 'gamabunta_koenig'); // 2400 > 2000 → kein Ziel
  let threw = false;
  try { E.activateMonsterFx('P', 0); } catch (e) { threw = e.message.indexOf('Kein passendes Ziel') >= 0; }
  t('Kyūbi: kein Ziel bei zu hoher ANG → Fehlermeldung, kein Fenster', threw && !E.state.window);
}
{
  // Team 7 – Formation: Spezial aus der Hand + Ziehen nur mit Naruto
  const d = mk(['team7_formation', 'konohamaru_rivale', FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  const handVorher = E.state.players.P.hand.length;
  E.activateSpell('P', 0, { selectHandIdx: 1 }); // rivale
  const noDraw = E.state.players.P.hand.length === handVorher - 2;
  putM(E, 'P', 1, 'naruto_schueler');
  E.state.players.P.hand.push({ uid: 990, id: 'team7_formation' }, { uid: 991, id: 'naruto_genin' });
  E.activateSpell('P', E.state.players.P.hand.length - 2, { selectHandIdx: E.state.players.P.hand.length - 1 });
  t('Formation: ohne Naruto kein Zug, mit Naruto +1 Karte',
    fieldIds(E, 'P').indexOf('naruto_genin') >= 0 && noDraw && E.state.players.P.hand.length === handVorher - 2 + 1);
}
{
  // Rasengan (Genin): nur für Genin + 400 Burn bei Kill
  const d = mk(['rasengan_genin', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'naruto_genin'); putM(E, 'P', 1, 'gama'); // gama = falsches Ziel, keine Konoha-Aura
  let threw = false;
  try { E.activateSpell('P', 0, { targetZone: 1 }); } catch (e) { threw = true; }
  E.activateSpell('P', 0, { targetZone: 0 });
  const boosted = E.effAtk('P', 0) === 2300; // 1500 + 800 (keine Aura: gama ist kein Konoha)
  putM(E, 'A', 0, 'gama'); // 600
  toBattle(E);
  E.declareAttack('P', 0, 0);
  t('Rasengan-Genin: Bindung + +800 + 400 Burn',
    threw && boosted && E.state.players.A.lp === 8000 - (2300 - 600) - 400);
}
{
  // Schattenspiel: -200 ANG/VERT + Münzwurf (rng 0.1 → Kopf)
  const E = NT.Engine.create({ deckP: Array(8).fill('schattenspiel'), deckA: Array(8).fill('akademie_schueler'), rng: () => 0.1 });
  E.start();
  E.activateSpell('P', 0);
  const open = E.state.players.P.st.some((s) => s && !s.faceDown && s.id === 'schattenspiel');
  putM(E, 'A', 0, 'gamabunta_koenig'); // 2400 → 2200 / 2000 → 1800
  const weakened = E.effAtk('A', 0) === 2200 && E.effDef('A', 0) === 1800;
  E.state.phase = 'battle'; E.state.active = 'A'; E.state.turn = 2;
  E.declareAttack('A', 0, -1); // Münzwurf rng 0.1 < 0.5 → abgebrochen
  t('Schattenspiel: offen liegend, -200/-200, Münzwurf bricht Angriff ab',
    open && weakened && E.state.players.P.lp === 8000 && !E.state.pendingAttack);
}
{
  // Schatten-Bindung: Angriff + Effekte gesperrt (Aura fällt weg)
  const d = mk(['schatten_bindung', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'A', 0, 'naruto_genin'); putM(E, 'A', 1, 'konohamaru_rivale'); // Genin-Aura +300 für sich selbst nicht, Rivale bekommt nichts — Genin verliert eigene +300? Nein: aura_self_tribe gilt für Genin selbst wenn Konoha daneben liegt
  const vorher = E.effAtk('A', 0) === 1800; // 1500 + 300 (Rivale daneben)
  E.activateSpell('P', 0, { targetZone: 0 });
  E.state.phase = 'battle'; E.state.active = 'A'; E.state.turn = 2;
  t('Bindung: kein Angriff, Effekt-Aura wirkungslos',
    vorher && !E.canAttack('A', 0) && E.effAtk('A', 0) === 1500);
}
{
  // Kawarimi-Trick: wirkt nur mit Konoha auf dem Feld
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'gamabunta_koenig');
  setTrap(E, 'A', 0, 'kawarimi_trick');
  toBattle(E);
  E.declareAttack('P', 0, -1); // kein Konoha bei A → kein Fenster → 2400 durch
  const durch = E.state.players.A.lp === 5600;
  putM(E, 'P', 0, 'gamabunta_koenig');
  putM(E, 'A', 0, 'konohamaru_rivale'); // jetzt mit Konoha
  E.state.players.P.m[0].attacksLeft = 1;
  E.state.phase = 'battle'; E.state.active = 'P';
  E.declareAttack('P', 0, 0);
  E.respond(0);
  t('Kawarimi-Trick: ohne Konoha wirkungslos, mit Konoha annulliert',
    durch && E.state.players.A.lp === 5600 && E.state.players.A.m[0] !== null);
}
{
  // Schattentäuschung: beschworenes Ninja -500 ANG + 300 Burn
  const d = mk(['naruto_genin', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  setTrap(E, 'A', 0, 'schattentaeuschung');
  E.state.turn = 2;
  E.summon('P', 0, 0, {});
  E.respond(0);
  t('Schattentäuschung: Genin 1500→1000, Gegner -300', E.effAtk('P', 0) === 1000 && E.state.players.P.lp === 7700);
}

/* ========== Kurogane Boss-Deck: Jiraiya & die Kröten ========== */
console.log('== Kröten-Deck (Kurogane) ==');
{
  // Eremit: Jutsu-Suche nur bei NORMALER Beschwörung
  const d = mk(['jiraiya_eremit', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, 'yomi_numa', 'gama', FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  E.summon('P', 0, 0, {});
  t('Eremit: Such-Fenster, nur Jutsus im Pool',
    E.state.window && E.state.window.kind === 'pick' && E.state.window.pool.indexOf('yomi_numa') >= 0 && E.state.window.pool.indexOf('gama') < 0);
  E.respondPick('yomi_numa');
  t('Eremit: Jutsu auf die Hand', handIds(E, 'P').indexOf('yomi_numa') >= 0);
}
{
  // Gama: bei Kampf-Zerstörung Gamakichi-Krieger aus dem Deck
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, 'gamakichi_krieger', FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'gama'); putM(E, 'A', 0, 'naruto_genin');
  toBattle(E, 'A');
  E.declareAttack('A', 0, 0);
  t('Gama: Kette nach Kampf-Tod', fieldIds(E, 'P').indexOf('gamakichi_krieger') >= 0);
}
{
  // Gamakichi-Krieger: +300 ANG nur mit Kröte/Jiraiya daneben
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'gamakichi_krieger');
  const solo = E.effAtk('P', 0) === 1500;
  putM(E, 'P', 1, 'gama');
  t('Gamakichi-Krieger: 1500 solo / 1800 mit Kröte', solo && E.effAtk('P', 0) === 1800);
}
{
  // Gamaken-Wächter: kein Direktangriff + Umleitung 1×/Zug
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'gamaken_waechter');
  putM(E, 'A', 0, 'konohamaru_rivale');
  toBattle(E);
  let threw = false;
  try { E.declareAttack('P', 0, -1); } catch (e) { threw = true; }
  t('Gamaken: kein Direktangriff möglich', threw);
}
{
  // Umleitung greift: Angreifer trifft Gamaken statt Rivale
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'naruto_kyuubi');
  putM(E, 'A', 0, 'gamaken_waechter'); putM(E, 'A', 1, 'konohamaru_rivale');
  toBattle(E);
  E.declareAttack('P', 0, 1); // Ziel Rivale → Umleitung auf Gamaken (800 ANG, stirbt)
  t('Gamaken: lenkt Angriff auf sich um (stirbt statt Rivale)',
    !E.state.players.A.m[0] && !!E.state.players.A.m[1]);
}
{
  // Gamabunta-König: nur Kröten-Tribut + Hand-Bounce per Effekt
  const d = mk(['gamabunta_koenig', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'gama'); putM(E, 'P', 1, 'konohamaru_rivale'); // kein Kröten-Paar
  let threw = false, msg = '';
  try { E.summon('P', 0, 0, { tributes: [0, 1] }); } catch (e) { threw = true; msg = e.message; }
  E.state.players.P.m[1] = null;
  putM(E, 'P', 1, 'gamakichi_krieger'); // jetzt 2 Kröten
  E.summon('P', 0, 0, { tributes: [0, 1] });
  const summoned = fieldIds(E, 'P').indexOf('gamabunta_koenig') >= 0;
  putM(E, 'A', 0, 'naruto_kyuubi');
  E.activateMonsterFx('P', 0);
  t('Bunta: Abwurf-Fenster für die Kosten', E.state.window && E.state.window.kind === 'discard');
  E.respondDiscard(0);
  t('Bunta: nur Kröten-Tribut; Bounce wirft Kyūbi auf die Hand',
    threw && summoned && !E.state.players.A.m[0] && handIds(E, 'A').indexOf('naruto_kyuubi') >= 0);
  t('Bunta: Tribut-Fehlermeldung nennt Kröten', msg.indexOf('Kröten') >= 0);
}
{
  // Kröten-Ruf: Spezial aus der Hand + Ziehen nur mit Jiraiya
  const d = mk(['kroeten_ruf', 'gama', FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  const handVorher = E.state.players.P.hand.length;
  E.activateSpell('P', 0, { selectHandIdx: 1 }); // gama
  const noDraw = E.state.players.P.hand.length === handVorher - 2;
  putM(E, 'P', 1, 'jiraiya_eremit');
  E.state.players.P.hand.push({ uid: 990, id: 'kroeten_ruf' }, { uid: 991, id: 'gama' });
  E.activateSpell('P', E.state.players.P.hand.length - 2, { selectHandIdx: E.state.players.P.hand.length - 1 });
  t('Kröten-Ruf: Spezial ohne Jiraiya kein Zug, mit Jiraiya +1 Karte',
    fieldIds(E, 'P').filter((x) => x === 'gama').length === 2 && noDraw &&
    E.state.players.P.hand.length === handVorher - 2 + 1);
}
{
  // Rasengan (Eremit): nur für den Eremiten + 400 Burn bei Kill
  const d = mk(['rasengan_eremit', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'jiraiya_eremit'); putM(E, 'P', 1, 'gama');
  let threw = false;
  try { E.activateSpell('P', 0, { targetZone: 1 }); } catch (e) { threw = true; }
  E.activateSpell('P', 0, { targetZone: 0 });
  const boosted = E.effAtk('P', 0) === 2000;
  putM(E, 'A', 0, 'konohamaru_rivale');
  toBattle(E);
  E.declareAttack('P', 0, 0);
  t('Rasengan-Eremit: Bindung + +800 + 400 Burn',
    threw && boosted && E.state.players.A.lp === 8000 - (2000 - 700) - 400);
}
{
  // Sumpf: -300 ANG/VERT + Münzwurf (rng 0.1 → Kopf)
  const E = NT.Engine.create({ deckP: Array(8).fill('yomi_numa'), deckA: Array(8).fill('akademie_schueler'), rng: () => 0.1 });
  E.start();
  E.activateSpell('P', 0);
  const open = E.state.players.P.st.some((s) => s && !s.faceDown && s.id === 'yomi_numa');
  putM(E, 'A', 0, 'naruto_kyuubi'); // 2500 → 2200 / 2000 → 1700
  const weakened = E.effAtk('A', 0) === 2200 && E.effDef('A', 0) === 1700;
  E.state.phase = 'battle'; E.state.active = 'A'; E.state.turn = 2;
  E.declareAttack('A', 0, -1); // Münzwurf rng 0.1 < 0.5 → abgebrochen
  t('Sumpf: offen liegend, -300/-300, Münzwurf bricht Angriff ab',
    open && weakened && E.state.players.P.lp === 8000 && !E.state.pendingAttack);
}
{
  // Kröten-Magen: Angriff + Effekte gesperrt (Aura fällt weg)
  const d = mk(['kroeten_magen', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'A', 0, 'gamakichi_krieger'); putM(E, 'A', 1, 'gama'); // Krieger-Aura +300
  const vorher = E.effAtk('A', 0) === 1800;
  E.activateSpell('P', 0, { targetZone: 0 });
  E.state.phase = 'battle'; E.state.active = 'A'; E.state.turn = 2;
  t('Kröten-Magen: kein Angriff, Aura wirkungslos',
    vorher && !E.canAttack('A', 0) && E.effAtk('A', 0) === 1500);
}
{
  // Kröten-Schild: wirkt nur mit Kröte auf dem Feld
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'naruto_kyuubi');
  setTrap(E, 'A', 0, 'kroeten_schild');
  toBattle(E);
  E.declareAttack('P', 0, -1); // keine Kröte → kein Fenster → 2500 durch
  const durch = E.state.players.A.lp === 5500;
  putM(E, 'P', 0, 'naruto_kyuubi');
  putM(E, 'A', 0, 'gama'); // jetzt mit Kröte
  E.state.players.P.m[0].attacksLeft = 1;
  E.state.phase = 'battle'; E.state.active = 'P';
  E.declareAttack('P', 0, 0);
  E.respond(0);
  t('Kröten-Schild: ohne Kröte wirkungslos, mit Kröte annulliert',
    durch && E.state.players.A.lp === 5500 && E.state.players.A.m[0] !== null);
}
{
  // Hartschaum: beschworenes Ninja -500 ANG + 300 Burn
  const d = mk(['naruto_genin', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  setTrap(E, 'A', 0, 'hartschaum');
  E.state.turn = 2;
  E.summon('P', 0, 0, {});
  E.respond(0);
  t('Hartschaum: Genin 1500→1000, Gegner -300', E.effAtk('P', 0) === 1000 && E.state.players.P.lp === 7700);
}

/* ========== Iruka-Deck: Akademie & Grundlagen ========== */
console.log('== Iruka-Deck (Akademie) ==');
{
  // Iruka-Lehrer: Stammes-Aura +300/+300 für ANDERE Akademie-Ninja (nicht sich selbst)
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'iruka_lehrer'); putM(E, 'P', 1, 'schueler_naruto');
  t('Iruka-Aura: Naruto 800→1100 / 500→800, Iruka selbst unverändert',
    E.effAtk('P', 1) === 1100 && E.effDef('P', 1) === 800 && E.effAtk('P', 0) === 1300);
}
{
  // Iruka zieht, wenn ein Akademie-Ninja beschworen wird (Token zählt nicht)
  const d = mk(['schueler_naruto', 'bunshin_jutsu', FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'iruka_lehrer');
  const h0 = E.state.players.P.hand.length;
  E.summon('P', 0, 1, {}); // Naruto normal: -1 Hand, +1 Unterrichts-Zug
  const drew = E.state.players.P.hand.length === h0;
  E.activateSpell('P', 0, {}); // Bunshin-Token
  const tok = E.state.players.P.hand.length === h0 - 1 && fieldIds(E, 'P').indexOf('bunshin_token') >= 0;
  t('Iruka-Draw: +1 bei Akademie-Beschwörung, Token zieht nicht', drew && tok);
}
{
  // Sakura: +400 VERT für das schwächste Verbündete (hier: einziger Kandidat)
  const d = mk(['schuelerin_sakura', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'schueler_naruto'); // 500 VERT
  E.summon('P', 0, 1, {});
  t('Sakura: Naruto-VERT 500→900 dauerhaft', E.effDef('P', 0) === 900);
}
{
  // Mizuki: Zweifel-Bremse nur mit Iruka im Beschwörungszug
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'mizuki'); putM(E, 'P', 1, 'iruka_lehrer');
  toBattle(E);
  E.state.players.P.m[0].summonedTurn = E.state.turn; // gerade erst beschworen
  const locked = !E.canAttack('P', 0);
  E.state.players.P.m[1] = null; // Iruka weg
  t('Mizuki: mit Iruka gesperrt, ohne Iruka angriffsbereit', locked && E.canAttack('P', 0));
}
{
  // Bunshin-Token: zwingt den Angriff auf sich (Taunt)
  const d = mk(['bunshin_jutsu', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, FILL); // 1000/1000
  E.activateSpell('P', 0, {}); // Token → Zone 1
  putM(E, 'A', 0, 'gamakichi_krieger'); // 1500
  toBattle(E, 'A');
  E.declareAttack('A', 0, 0); // zielt auf den Füller → Taunt lenkt aufs Token um
  t('Bunshin: Angriff wird auf den Doppelgänger umgelenkt (Füller überlebt)',
    !E.state.players.P.m[1] && !!E.state.players.P.m[0]);
}
{
  // Shuriken-Wurf: -600 ANG, mit Iruka auf dem Feld -900
  const d = mk(['shuriken_wurf', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'A', 0, 'gamabunta_koenig'); // 2400
  E.activateSpell('P', 0, { targetZone: 0 });
  const ohne = E.effAtk('A', 0) === 1800;
  const d2 = mk(['shuriken_wurf', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E2 = game(d2.deckP, d2.deckA);
  putM(E2, 'P', 0, 'iruka_lehrer'); putM(E2, 'A', 0, 'gamabunta_koenig');
  E2.activateSpell('P', 0, { targetZone: 0 });
  t('Shuriken: 2400→1800 ohne / →1500 mit Iruka', ohne && E2.effAtk('A', 0) === 1500);
}
{
  // Akademie-Unterricht: Pick-Pool enthält nur Akademie-Ninja
  const d = mk(['akademie_unterricht', FILL, FILL, FILL], [FILL, FILL, 'gama', 'schueler_naruto', 'mizuki', FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  E.activateSpell('P', 0, {});
  const w = E.state.window;
  t('Unterricht: nur Akademie im Pool (Naruto/Mizuki ja, Gama nein)',
    !!w && w.kind === 'pick' && w.pool.indexOf('schueler_naruto') >= 0 && w.pool.indexOf('mizuki') >= 0 && w.pool.indexOf('gama') < 0);
  E.respondPick('schueler_naruto');
}
{
  // Henge: ANG/VERT getauscht bis Zugende
  const d = mk(['henge_jutsu', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'iruka_lehrer'); // 1300/1400
  E.activateSpell('P', 0, { targetZone: 0 });
  const swapped = E.effAtk('P', 0) === 1400 && E.effDef('P', 0) === 1300;
  passTurn(E);
  t('Henge: 1300/1400 → 1400/1300, Reset am Zugende', swapped && E.effAtk('P', 0) === 1300);
}
{
  // Kawarimi: Angriff annulliert + Ziel zurück auf die Hand
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'gamakichi_krieger'); putM(E, 'A', 0, 'naruto_genin');
  setTrap(E, 'A', 0, 'kawarimi_klassik');
  toBattle(E);
  E.declareAttack('P', 0, 0);
  E.respond(0);
  t('Kawarimi: Genin zurück auf der Hand, kein Schaden',
    !E.state.players.A.m[0] && handIds(E, 'A').indexOf('naruto_genin') >= 0 && E.state.players.A.lp === 8000);
}
{
  // Beschützender Körper: Angriff annulliert, Iruka verliert 200 ANG
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'gamakichi_krieger');
  putM(E, 'A', 0, 'iruka_lehrer'); putM(E, 'A', 1, 'schueler_naruto');
  setTrap(E, 'A', 0, 'beschuetzer_koerper');
  toBattle(E);
  E.declareAttack('P', 0, 1); // zielt auf Naruto
  E.respond(0);
  t('Beschützer: Angriff annulliert + Iruka 1300→1100',
    !!E.state.players.A.m[1] && E.effAtk('A', 0) === 1100);
}
{
  // Klassenclown: Abwurf → +600 ANG bis Zugende
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putM(E, 'P', 0, 'schueler_naruto'); // 800
  E.activateMonsterFx('P', 0);
  const win = !!E.state.window && E.state.window.kind === 'discard';
  E.respondDiscard(0);
  const boosted = E.effAtk('P', 0) === 1400;
  passTurn(E);
  t('Klassenclown: Abwurf-Fenster, 800→1400, Reset am Zugende',
    win && boosted && E.effAtk('P', 0) === 800);
}

console.log('');
if (fails) { console.error('FEHLER: ' + fails + ' von ' + count + ' Tests fehlgeschlagen.'); process.exit(1); }
console.log('Alle ' + count + ' Effekt-Tests bestanden.');
