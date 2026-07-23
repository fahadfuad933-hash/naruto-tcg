/* Simulationstest: Daten validieren + komplette KI-vs-KI-Duelle.
   Aufruf: node test/sim.js [AnzahlSpiele] */
'use strict';
require('../js/data.js');
require('../js/engine.js');
require('../js/ai.js');
require('../js/shop.js');
const NT = globalThis.NTCG;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 1) Daten-Validierung ---------- */
let errors = 0;
const err = (m) => { errors++; console.error('  ✗ ' + m); };

console.log('== Daten-Validierung ==');
const allDecks = [['Starter', NT.STARTER_DECK]];
for (const o of NT.OPPONENTS) allDecks.push([o.name, o.deck]);
for (const o of NT.STORY_OPPS) allDecks.push(['Story:' + o.name, o.deck]);
for (const [name, deck] of allDecks) {
  const v = NT.validateDeck(deck, null);
  if (!v.ok) err(name + ': ' + v.msg);
  for (const id of deck) if (!NT.CARDS[id]) err(name + ': unbekannte Karte ' + id);
}
const sv = NT.validateDeck(NT.STARTER_DECK, NT.BASE_COLLECTION);
if (!sv.ok) err('Starterdeck nicht durch Sammlung gedeckt: ' + sv.msg);
for (const o of NT.OPPONENTS.concat(NT.STORY_OPPS)) {
  // Farm-Pool: einzigartige Karten des Gegner-Decks, gruppiert nach Rarität
  const pool = NT.farmPool(o);
  let n = 0;
  for (const r of ['N', 'R', 'SR', 'UR']) {
    n += pool[r].length;
    for (const id of pool[r]) if (NT.CARDS[id].rarity !== r) err(o.name + ': Pool-Karte ' + id + ' hat falsche Rarität');
  }
  if (!n) err(o.name + ': leerer Farm-Pool');
  if (!pool.N.length) err(o.name + ': kein N im Farm-Pool (kein garantierter Drop)');
}
// Shop: Stock deterministisch + ohne K4-Chase, Pack-Pools gültig, Pack-Inhalte korrekt
{
  const s1 = NT.Shop.stock(123456), s2 = NT.Shop.stock(123456), s3 = NT.Shop.stock(123457);
  if (JSON.stringify(s1) !== JSON.stringify(s2)) err('Shop-Stock nicht deterministisch');
  if (JSON.stringify(s1) === JSON.stringify(s3)) err('Shop-Stock rotiert nicht');
  if (s1.length !== 7 || !s1[6].deal) err('Shop-Stock: 6 Slots + Sonderangebot erwartet');
  for (const slot of s1) {
    if (!NT.CARDS[slot.id] || NT.CARDS[slot.id].token) err('Shop-Stock: ungültige Karte ' + slot.id);
    if (NT.Shop.EXCLUDED[slot.id]) err('Shop-Stock: K4-Chase im Angebot ' + slot.id);
    if (!(slot.price > 0)) err('Shop-Stock: ungültiger Preis');
  }
  for (const pid in NT.Shop.PACKS) {
    const p = NT.Shop.PACKS[pid];
    if (p.pool) for (const id of p.pool) {
      if (!NT.CARDS[id]) err('Pack ' + pid + ': unbekannte Karte ' + id);
      else if (NT.Shop.EXCLUDED[id]) err('Pack ' + pid + ': K4-Chase im Pool ' + id);
    }
    for (const probe of [0.01, 0.5, 0.99]) {
      const ids = NT.Shop.openPack(pid, () => probe);
      if (ids.length !== p.n) err('Pack ' + pid + ': falsche Kartenanzahl (' + ids.length + ')');
      for (const id of ids) if (!NT.CARDS[id] || NT.CARDS[id].token || NT.Shop.EXCLUDED[id]) err('Pack ' + pid + ': ungültige Karte ' + id);
    }
  }
  for (const t of NT.Shop.THEMES) if (!(t.price >= 0) || !t.id) err('Shop-Theme ungültig: ' + t.id);
}
// Farm-Pools: jede Rarität muss Karten haben
for (const r of ['N', 'R', 'SR']) {
  let n = 0;
  for (const id in NT.CARDS) if (!NT.CARDS[id].token && NT.CARDS[id].rarity === r) n++;
  if (!n) err('Keine Karten der Rarität ' + r + ' für Farm-Belohnungen');
}
console.log(errors === 0 ? '  ✓ Alle Decks gültig (' + Object.keys(NT.CARDS).length + ' Karten)' : '  ' + errors + ' Fehler');

/* ---------- 2) KI-vs-KI-Duelle ---------- */
function playGame(seed, deckP, deckA) {
  const E = NT.Engine.create({ deckP, deckA, rng: mulberry32(seed) });
  E.start();
  let guard = 0;
  while (!E.state.winner && guard < 4000) {
    guard++;
    const st = E.state;
    if (st.window) {
      if (st.window.kind === 'discard') {
        E.respondDiscard(NT.AI.chooseDiscard(E, st.window.side));
      } else if (st.window.kind === 'pick') {
        E.respondPick(NT.AI.respondPick(E, st.window.side));
      } else if (st.window.kind === 'hand') {
        E.respondHand(NT.AI.respondHand(E, st.window.side, 5));
      } else {
        E.respond(NT.AI.respondTrap(E, st.window.side, 5));
      }
      continue;
    }
    const side = st.active;
    const gen = NT.AI.turn(E, side, 5);
    let r = gen.next();
    while (!r.done) {
      while (E.state.window && !E.state.winner) {
        const w = E.state.window;
        if (w.kind === 'discard') E.respondDiscard(NT.AI.chooseDiscard(E, w.side));
        else if (w.kind === 'pick') E.respondPick(NT.AI.respondPick(E, w.side));
        else if (w.kind === 'hand') E.respondHand(NT.AI.respondHand(E, w.side, 5));
        else E.respond(NT.AI.respondTrap(E, w.side, 5));
      }
      if (E.state.winner) break;
      r = gen.next();
    }
    // Sicherheit: falls der Generator ohne Phasenwechsel endet
    if (!E.state.window && !E.state.winner && E.state.active === side && E.state.phase !== 'main1') {
      try { E.advance(); } catch (e) { /* bereits weiter */ }
    }
  }
  return { winner: E.state.winner, reason: E.state.winReason, turns: E.state.turn, guard };
}

console.log('== Duelle (KI vs KI) ==');
const N = parseInt(process.argv[2] || '60', 10);
let pWins = 0, aWins = 0, draws = 0, totalTurns = 0;
const reasons = {};
const decks = NT.OPPONENTS.map((o) => o.deck);
for (let i = 0; i < N; i++) {
  const dP = decks[i % decks.length];
  const dA = decks[(i * 3 + 1) % decks.length];
  try {
    const r = playGame(1000 + i, dP, dA);
    totalTurns += r.turns;
    if (r.winner === 'P') pWins++;
    else if (r.winner === 'A') aWins++;
    else { draws++; console.log('  ⚠ Spiel ' + i + ' ohne Sieger nach ' + r.turns + ' Zügen (guard=' + r.guard + ')'); }
    reasons[r.reason] = (reasons[r.reason] || 0) + 1;
  } catch (e) {
    errors++;
    console.error('  ✗ Spiel ' + i + ' abgestürzt: ' + e.message);
    console.error(e.stack.split('\n').slice(0, 4).join('\n'));
  }
}
console.log('  Siege P: ' + pWins + ' | Siege A: ' + aWins + ' | Offen: ' + draws);
console.log('  Ø Züge: ' + (totalTurns / N).toFixed(1) + ' | Siegbedingungen: ' + JSON.stringify(reasons));

if (errors > 0) { console.error('\nFEHLER: ' + errors); process.exit(1); }
console.log('\nAlle Tests bestanden.');
