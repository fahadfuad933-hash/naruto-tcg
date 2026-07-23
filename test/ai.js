/* Verhaltens-Tests für die KI (DOM-frei) — Kartenpool-Neustart:
   Konoha-Starter + Kröten-Theme. Aufruf: node test/ai.js */
'use strict';
require('../js/data.js');
require('../js/engine.js');
require('../js/ai.js');
const NT = globalThis.NTCG;

let fails = 0, count = 0;
const t = (name, cond) => { count++; if (!cond) { fails++; console.error('  ✗ ' + name); } else console.log('  ✓ ' + name); };

const FILL = 'akademie_schueler';
const mk = (handP, restP, handA, restA) => ({
  deckP: restP.concat(handP.slice().reverse()),
  deckA: restA.concat(handA.slice().reverse()),
});
function game(deckP, deckA) {
  const E = NT.Engine.create({ deckP, deckA, rng: () => 0.999999 });
  E.start();
  return E;
}
const handIds = (E, side) => E.state.players[side].hand.map((x) => (typeof x === 'string' ? x : x.id));
function runAiTurn(E, side, difficulty) {
  const gen = NT.AI.turn(E, side, difficulty);
  let r = gen.next(), guard = 0;
  while (!r.done && guard++ < 200) {
    let wguard = 0;
    while (E.state.window && !E.state.winner && wguard++ < 10) {
      const w = E.state.window;
      if (w.kind === 'discard') E.respondDiscard(NT.AI.chooseDiscard(E, w.side));
      else if (w.kind === 'pick') E.respondPick(NT.AI.respondPick(E, w.side));
      else if (w.kind === 'hand') E.respondHand(NT.AI.respondHand(E, w.side, difficulty));
      else { const z = NT.AI.respondTrap(E, w.side, difficulty); E.respond(z); }
    }
    if (E.state.winner) break;
    r = gen.next();
  }
}
function putMonster(E, side, zone, id, mode) {
  E.state.players[side].m[zone] = Object.assign({ uid: 900 + zone, id }, {
    mode: mode || 'atk', summonedTurn: 1, atkMod: 0, defMod: 0, tempAtk: 0,
    tempPierce: false, attacksLeft: 1, posChanged: false, lockUntil: 0,
  });
}
function passTurn(E) {
  let g = 0;
  while (E.state.active === 'P' && g++ < 6 && !E.state.winner) {
    if (E.state.window) { E.respond(null); continue; }
    E.advance();
  }
}

/* ========== 1) Verteidigung: verdeckt gegen stärkeren Gegner + Wall-Wahl ========== */
console.log('== Verteidigung & Position ==');
{
  // Kyūbi (2500) steht offen — KI darf nichts Offen-Angreifendes beschwören
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['gamakichi_krieger', 'iruka_waechter', FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'P', 0, 'naruto_kyuubi', 'atk');
  passTurn(E);
  runAiTurn(E, 'A', 7);
  const waechter = E.state.players.A.m.find((x) => x && x.id === 'iruka_waechter');
  t('KI setzt den DEF-Wall (Iruka 2200) verdeckt gegen Kyūbi',
    !!waechter && waechter.mode === 'defdown' &&
    !E.state.players.A.m.some((x) => x && x.id === 'gamakichi_krieger'));
}
{
  // Flip-Disziplin: schwaches verdecktes Ninja bleibt liegen
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'gamakichi_krieger', 'defdown');
  putMonster(E, 'P', 0, 'naruto_kyuubi', 'atk');
  E.state.turn = 5;
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Krieger bleibt verdeckt, wenn der Gegner stärker ist',
    E.state.players.A.m[0] && E.state.players.A.m[0].mode === 'defdown');
}
{
  // changePos: überlegener Gegner → Verteidigungsposition in main2
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'gamaken_waechter', 'atk'); // 800/2200 — kann Kyūbi nicht schlagen
  putMonster(E, 'P', 0, 'naruto_kyuubi', 'atk');
  E.state.turn = 5;
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Überranten drohend → Wechsel in Verteidigungsposition',
    E.state.players.A.m[0] && E.state.players.A.m[0].mode === 'defup');
}
{
  // Gleichstands-Trade: letzter Angreifer räumt gleichstarkes Monster (mit Backup)
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'gamakichi_krieger', 'atk');
  putMonster(E, 'P', 0, 'naruto_genin', 'atk'); // 1500 = 1500 (keine Konoha-Aura: solo)
  E.state.turn = 5;
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Gleichstands-Trade räumt das gegnerische Monster (KI hat Backup)',
    E.state.players.P.m[0] === null && E.state.players.A.m[0] === null &&
    E.state.players.A.m.some(Boolean));
}

/* ========== 2) Removal-/Boost-Sparsamkeit ========== */
console.log('== Sparsamkeit ==');
{
  // Kröten-Magen bleibt gegen schlagbares Mini in der Hand
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['kroeten_magen', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'gamabunta_koenig', 'atk'); // 2400 — schlägt Rivale locker
  putMonster(E, 'P', 0, 'konohamaru_rivale', 'atk'); // 700
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Kröten-Magen WARTET gegen schlagbares Mini', handIds(E, 'A').indexOf('kroeten_magen') >= 0);
}
{
  // Kröten-Magen FEUERT auf unschlagbaren Kyūbi
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['kroeten_magen', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'gama', 'atk'); // 600 — Kyūbi unschlagbar
  putMonster(E, 'P', 0, 'naruto_kyuubi', 'atk');
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Kröten-Magen FEUERT auf unschlagbaren Kyūbi',
    handIds(E, 'A').indexOf('kroeten_magen') < 0 && E.state.players.P.m[0].lockUntil > E.state.turn);
}
{
  // Rasengan (Genin) WARTET, wenn selbst +800 kein Kill ist
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['rasengan_genin', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'naruto_genin', 'atk'); // 1500 + 800 = 2300 < 2500
  putMonster(E, 'P', 0, 'naruto_kyuubi', 'atk');
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Rasengan-Equip WARTET wenn kein Kill möglich', handIds(E, 'A').indexOf('rasengan_genin') >= 0);
}
{
  // Rasengan (Genin) FEUERT, wenn der Kill gegen den Kyūbi dadurch möglich wird
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['rasengan_genin', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'naruto_genin', 'atk'); // 1500 + Konoha-Aura 300 = 1800
  putMonster(E, 'A', 1, 'konohamaru_rivale', 'atk');
  putMonster(E, 'P', 0, 'naruto_kyuubi', 'atk'); // 2500 — 1800+800=2600 schlägt ihn!
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Rasengan-Equip FEUERT für den Kyūbi-Kill', handIds(E, 'A').indexOf('rasengan_genin') < 0);
}

/* ========== 3) Fallen-Disziplin ========== */
console.log('== Fallen-Disziplin ==');
{
  // Kawarimi-Trick bleibt bei harmlosen Angriffen zu
  const d = mk(['konohamaru_rivale', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  E.state.players.A.st[0] = { uid: 990, id: 'kawarimi_trick', faceDown: true, setTurn: 1 };
  putMonster(E, 'A', 0, 'naruto_genin', 'atk'); // Konoha da → Falle wäre scharf
  E.state.turn = 2;
  E.summon('P', 0, 1, {}); // Rivale auf Zone 1
  E.state.phase = 'battle';
  E.declareAttack('P', 1, 0); // 700 vs Genin 1500 — Selbstmord, keine Drohung
  const z = NT.AI.respondTrap(E, 'A', 7);
  t('Kawarimi-Trick bleibt bei harmlosen Angriffen zu', z === null);
  if (E.state.window) E.respond(null);
}
{
  // Kawarimi-Trick rettet bei echtem Verlust
  const d = mk(['gamabunta_koenig', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  E.state.players.A.st[0] = { uid: 991, id: 'kawarimi_trick', faceDown: true, setTurn: 1 };
  putMonster(E, 'A', 0, 'naruto_genin', 'atk'); // 1500 — Bunta (2400) zerstört sie sonst
  putMonster(E, 'P', 1, 'gamabunta_koenig', 'atk');
  E.state.turn = 2;
  E.state.players.P.normalSummoned = true;
  E.state.phase = 'battle';
  E.declareAttack('P', 1, 0);
  const z = NT.AI.respondTrap(E, 'A', 7);
  t('Kawarimi-Trick rettet eigenen Ninja', z === 0);
  if (E.state.window) E.respond(null);
}
{
  // Schattentäuschung/Hartschaum zündet erst ab mittlerer Beschwörung
  const d = mk(['naruto_schueler', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  E.state.players.A.st[0] = { uid: 992, id: 'hartschaum', faceDown: true, setTurn: 1 };
  E.state.turn = 2;
  E.summon('P', 0, 0, {}); // Schüler 1300 < 1500 → zu billig
  const z = NT.AI.respondTrap(E, 'A', 7);
  t('Hartschaum bleibt bei Mini-Beschwörung zu', z === null);
  if (E.state.window) E.respond(null);
}

/* ========== 4) Theme-Decks: Lethal, Formation, Kyūbi, Kröten ========== */
console.log('== Theme-Decks (KI) ==');
{
  // Lethal wird genommen (Genin + Konoha-Aura = 1800 direkt)
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'naruto_genin', 'atk');
  putMonster(E, 'A', 1, 'konohamaru_rivale', 'atk'); // Aura: Genin 1800
  E.state.players.P.lp = 1500;
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Lethal wird genommen (Sieg)', E.state.winner === 'A');
}
{
  // Formation holt die stärkere Option aus der Hand
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['team7_formation', 'konohamaru_rivale', 'naruto_genin', FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Formation: Genin normal + Rivale per Formation (oder umgekehrt), beide auf dem Feld',
    E.state.players.A.m.some((x) => x && x.id === 'naruto_genin') &&
    E.state.players.A.m.some((x) => x && x.id === 'konohamaru_rivale') &&
    handIds(E, 'A').indexOf('team7_formation') < 0);
}
{
  // Kyūbi-Zerstörungs-Effekt der KI: kleines Ziel weg, großes bleibt
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'naruto_kyuubi', 'atk');
  putMonster(E, 'P', 0, 'gamakichi_krieger', 'atk'); // 1500 — gültiges Ziel
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Kyūbi-Effekt zerstört das ≤2000-Ziel', !E.state.players.P.m[0]);
}
{
  // Kyūbi-Effekt bleibt aus, wenn kein Ziel klein genug ist
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'naruto_kyuubi', 'atk');
  putMonster(E, 'P', 0, 'gamabunta_koenig', 'atk'); // 2400 > 2000
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Kyūbi-Effekt WARTET bei zu hohem Ziel (kein Effekt-Einsatz)',
    !E.state.players.A.m[0] || E.state.players.A.m[0].fxUsedTurn !== E.state.turn);
}
{
  // Sumpf der Unterwelt wird ausgespielt, sobald der Gegner Ninja hat
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['yomi_numa', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'konohamaru_rivale', 'atk');
  putMonster(E, 'P', 0, 'naruto_kyuubi', 'atk');
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('KI spielt den Sumpf aus', E.state.players.A.st.some((s) => s && !s.faceDown && s.id === 'yomi_numa'));
}
{
  // Kröten-König wirft das stärkste gegnerische Ninja zurück (Kosten: 1 Handkarte)
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'gamabunta_koenig', 'atk');
  putMonster(E, 'P', 0, 'naruto_kyuubi', 'atk');
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Bunta-Effekt: Kyūbi zurück auf die Hand',
    !E.state.players.P.m[0] && handIds(E, 'P').indexOf('naruto_kyuubi') >= 0);
}
{
  // Kröten-Ruf holt eine Kröte aus der Hand
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['kroeten_ruf', 'gama', 'gamakichi_krieger', FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Kröten-Ruf holt eine Kröte aus der Hand (Krieger normal + Gama per Ruf)',
    E.state.players.A.m.some((x) => x && x.id === 'gamakichi_krieger') &&
    E.state.players.A.m.some((x) => x && x.id === 'gama') &&
    handIds(E, 'A').indexOf('kroeten_ruf') < 0);
}
{
  // Zwei Kröten auf dem Feld + König auf der Hand → Tribut-Beschwörung
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['gamabunta_koenig', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'gama', 'atk');
  putMonster(E, 'A', 1, 'gamakichi_krieger', 'atk');
  putMonster(E, 'P', 0, 'konohamaru_rivale', 'atk');
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Bunta per 2 Kröten-Tribut beschworen',
    E.state.players.A.m.some((x) => x && x.id === 'gamabunta_koenig') &&
    !E.state.players.A.m.some((x) => x && x.id === 'gama'));
}

/* ========== 5) Iruka-Deck (Akademie) ========== */
console.log('== Iruka-Deck (Akademie) ==');
{
  // Bunshin-Jutsu: KI beschwört den Taunt-Doppelgänger
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['bunshin_jutsu', 'mizuki', FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('KI beschwört den Bunshin-Doppelgänger',
    E.state.players.A.m.some((x) => x && x.id === 'bunshin_token'));
}
{
  // Shuriken FEUERT auf unschlagbaren Kyūbi / WARTET gegen schlagbares Mini
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['shuriken_wurf', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'gamakichi_krieger', 'atk'); // 1500 — Kyūbi unschlagbar
  putMonster(E, 'P', 0, 'naruto_kyuubi', 'atk'); // 2500
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Shuriken FEUERT auf unschlagbaren Kyūbi',
    handIds(E, 'A').indexOf('shuriken_wurf') < 0 && E.effAtk('P', 0) <= 1900);

  const d2 = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['shuriken_wurf', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E2 = game(d2.deckP, d2.deckA);
  putMonster(E2, 'A', 0, 'gamakichi_krieger', 'atk'); // 1500 — Rivale schlagbar
  putMonster(E2, 'P', 0, 'konohamaru_rivale', 'atk'); // 700
  passTurn(E2);
  runAiTurn(E2, 'A', 7);
  t('Shuriken WARTET gegen schlagbares Mini', handIds(E2, 'A').indexOf('shuriken_wurf') >= 0);
}
{
  // Klassenclown-Boost kippt den Kill — auch auf Stufe 1 (Iruka spielt basic)
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'schueler_naruto', 'atk'); // 800 vs 1000
  putMonster(E, 'P', 0, 'akademie_schueler', 'atk'); // 1000
  passTurn(E);
  runAiTurn(E, 'A', 1);
  t('Klassenclown-Boost (basic): Kill kippt — Füller weg, Naruto lebt',
    !E.state.players.P.m[0] && !!E.state.players.A.m[0]);
}
{
  // Kawarimi: KI rettet ihren Ninja bei echtem Verlust zurück auf die Hand
  const d = mk(['gamabunta_koenig', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    [FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  E.state.players.A.st[0] = { uid: 993, id: 'kawarimi_klassik', faceDown: true, setTurn: 1 };
  putMonster(E, 'A', 0, 'naruto_genin', 'atk'); // 1500 — Bunta (2400) zerstört sie sonst
  putMonster(E, 'P', 1, 'gamabunta_koenig', 'atk');
  E.state.turn = 2;
  E.state.players.P.normalSummoned = true;
  E.state.phase = 'battle';
  E.declareAttack('P', 1, 0);
  const z = NT.AI.respondTrap(E, 'A', 7);
  t('Kawarimi-Rettung FEUERT bei echtem Verlust', z === 0);
  if (E.state.window) { E.respond(z); }
  t('Kawarimi: Genin lebt auf der Hand weiter',
    !E.state.players.A.m[0] && handIds(E, 'A').indexOf('naruto_genin') >= 0);
}
{
  // Henge: KI tauscht die Werte, wenn das die Threat wendet (Sakura 600/1000+Aura)
  const d = mk([FILL, FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL],
    ['henge_jutsu', FILL, FILL, FILL], [FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL, FILL]);
  const E = game(d.deckP, d.deckA);
  putMonster(E, 'A', 0, 'schuelerin_sakura', 'atk'); // 600/1000
  putMonster(E, 'P', 0, 'konohamaru_rivale', 'atk'); // 700 — 1000 nach Tausch schlägt ihn
  passTurn(E);
  runAiTurn(E, 'A', 7);
  t('Henge: KI tauscht Sakuras Werte für den Kill',
    handIds(E, 'A').indexOf('henge_jutsu') < 0 && !E.state.players.P.m[0]);
}

console.log('');
if (fails) { console.error('FEHLER: ' + fails + ' von ' + count + ' Tests fehlgeschlagen.'); process.exit(1); }
console.log('Alle ' + count + ' KI-Verhaltens-Tests bestanden.');
