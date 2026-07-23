/* Balancing-Werkzeug: Winrate eines Spieler-Decks gegen NPC-Decks (KI vs KI,
   beide Seiten mit einstellbarer difficulty). Aufruf:
   node test/balance.js [Spiele=100]
   Szenarien unten; Ausgabe = Siegquote des Spieler-Decks in %. */
'use strict';
require('../js/data.js');
require('../js/engine.js');
require('../js/ai.js');
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

function playGame(seed, deckP, deckA, diffP, diffA) {
  const E = NT.Engine.create({ deckP, deckA, rng: mulberry32(seed) });
  E.start();
  let guard = 0;
  const serve = (w) => {
    const d = w.side === 'P' ? diffP : diffA;
    if (w.kind === 'discard') E.respondDiscard(NT.AI.chooseDiscard(E, w.side));
    else if (w.kind === 'pick') E.respondPick(NT.AI.respondPick(E, w.side));
    else if (w.kind === 'hand') E.respondHand(NT.AI.respondHand(E, w.side, d));
    else E.respond(NT.AI.respondTrap(E, w.side, d));
  };
  while (!E.state.winner && guard < 4000) {
    guard++;
    const st = E.state;
    if (st.window) { serve(st.window); continue; }
    const side = st.active;
    const gen = NT.AI.turn(E, side, side === 'P' ? diffP : diffA);
    let r = gen.next();
    while (!r.done) {
      while (E.state.window && !E.state.winner) serve(E.state.window);
      if (E.state.winner) break;
      r = gen.next();
    }
    if (!E.state.window && !E.state.winner && E.state.active === side && E.state.phase !== 'main1') {
      try { E.advance(); } catch (e) { /* bereits weiter */ }
    }
  }
  return E.state.winner;
}

/* „Mid"-Spieler-Deck (früher Fortschritt: Starter + Akademie/Genji-Farm, ohne UR) */
const MID = [
  'naruto_schueler', 'naruto_schueler', 'konohamaru_rivale', 'konohamaru_rivale', 'naruto_genin',
  'naruto_genin', 'iruka_waechter', 'iruka_lehrer', 'schueler_naruto', 'mizuki', 'might_guy',
  'team7_formation', 'rasengan_genin', 'akademie_unterricht', 'shuriken_wurf', 'hartes_training',
  'kawarimi_trick', 'kawarimi_trick', 'schattentaeuschung', 'beschuetzer_koerper',
];

/* „Gefarmtes" Spieler-Deck (Mitte des Spielfortschritts: Konoha + Kröten gemischt) */
const FARMED = [
  'naruto_genin', 'naruto_genin', 'naruto_schueler', 'naruto_schueler', 'iruka_waechter',
  'gamakichi_krieger', 'gamakichi_krieger', 'jiraiya_eremit', 'gamaken_waechter', 'gama',
  'naruto_kyuubi', 'gamabunta_koenig',
  'team7_formation', 'kroeten_ruf', 'rasengan_genin', 'rasengan_eremit', 'yomi_numa',
  'schattenspiel', 'schatten_bindung', 'kroeten_magen',
  'kawarimi_trick', 'kroeten_schild', 'hartschaum',
];

/* „Endgame"-Spieler-Deck (beide Themes voll ausgebaut) */
const LATE = [
  'naruto_schueler', 'naruto_schueler', 'naruto_schueler', 'jiraiya_eremit', 'jiraiya_eremit',
  'gamakichi_krieger', 'gamakichi_krieger', 'naruto_genin', 'naruto_genin', 'gamaken_waechter',
  'naruto_kyuubi', 'gamabunta_koenig',
  'team7_formation', 'team7_formation', 'kroeten_ruf', 'rasengan_genin', 'rasengan_eremit',
  'yomi_numa', 'schattenspiel', 'kroeten_magen',
  'schattentaeuschung', 'hartschaum', 'kawarimi_trick', 'kroeten_schild',
];

/* „Zeitreise"-Spieler-Deck (LATE + Beute der Shinobi-Ära: Zabuza, Susanoo, Chase-Jutsus) */
const END = [
  'naruto_schueler', 'naruto_schueler', 'naruto_schueler', 'jiraiya_eremit', 'jiraiya_eremit',
  'gamakichi_krieger', 'gamakichi_krieger', 'naruto_genin', 'naruto_genin', 'zabuza_daemon',
  'naruto_kyuubi', 'itachi_susanoo',
  'team7_formation', 'team7_formation', 'kroeten_ruf', 'rasengan_genin', 'amaterasu', 'shinra_tensei',
  'yomi_numa', 'schattenspiel', 'kotoamatsukami',
  'schattentaeuschung', 'hartschaum', 'chou_shinra',
];

/* Szenarien: [Label, Spieler-Deck, NPC-id] — difficulty kommt aus dem NPC, Spieler spielt genius (5) */
const SCENARIOS = [
  ['Spiegelung (Soll ~50 %)', FARMED, null],
  ['Starter vs Iruka (Übung)', NT.STARTER_DECK, 'iruka'],
  ['Starter vs Iruka (Story)', NT.STARTER_DECK, 'iruka_story'],
  ['Starter vs Kotei', NT.STARTER_DECK, 'ramen_kotei'],
  ['Starter vs Sasuke', NT.STARTER_DECK, 'sasuke'],
  ['Starter vs Gaara', NT.STARTER_DECK, 'gaara'],
  ['Starter vs Kakashi', NT.STARTER_DECK, 'kakashi'],
  ['Starter vs Genji (1. Farm)', NT.STARTER_DECK, 'genin_trainer'],
  ['Starter vs Kurogane (Wall)', NT.STARTER_DECK, 'kurogane'],
  ['Mid vs Aya', MID, 'chunin_trainer'],
  ['Mid vs Shizuka', MID, 'kagaa_shizuka'],
  ['Mid vs Orochimaru', MID, 'orochimaru'],
  ['Gefarmt vs Aya', FARMED, 'chunin_trainer'],
  ['Gefarmt vs Shizuka', FARMED, 'kagaa_shizuka'],
  ['Gefarmt vs Daigo', FARMED, 'jonin_trainer'],
  ['Gefarmt vs Orochimaru', FARMED, 'orochimaru'],
  ['Gefarmt vs Itachi', FARMED, 'itachi'],
  ['Gefarmt vs Kurogane', FARMED, 'kurogane'],
  ['Gefarmt vs Raiga', FARMED, 'kagaa_raiga'],
  ['Gefarmt vs Kagā', FARMED, 'kagaa_kagaa'],
  ['Starter vs Kagā (Wall-Check)', NT.STARTER_DECK, 'kagaa_kagaa'],
  ['Endgame vs Wächter (K4)', LATE, 'echo_waechter'],
  ['Endgame vs Stimme (K4)', LATE, 'riss_stimme'],
  ['Endgame vs Echo-Finale (K4)', LATE, 'echo_spiegel'],
  ['Gefarmt vs Echo (Wall-Check)', FARMED, 'echo_spiegel'],
  ['Endgame vs Mizuki (K5)', LATE, 'mizuki_story'],
  ['Endgame vs Haku (K6)', LATE, 'haku_story'],
  ['Endgame vs Zabuza (K6)', LATE, 'zabuza_story'],
  ['Endgame vs Orochimaru (K7)', LATE, 'orochimaru_story'],
  ['Endgame vs Gaara (K7)', LATE, 'gaara_story'],
  ['Endgame vs Itachi (K8)', LATE, 'itachi_story'],
  ['Endgame vs Kimimaro (K8)', LATE, 'kimimaro_story'],
  ['Endgame vs Pain (K9)', LATE, 'pain_story'],
  ['Endgame vs Madara (K9)', LATE, 'madara_story'],
  ['Zeitreise vs Pain (END)', END, 'pain_story'],
  ['Zeitreise vs Madara (END)', END, 'madara_story'],
];

const N = parseInt(process.argv[2] || '100', 10);
const opps = NT.OPPONENTS.concat(NT.STORY_OPPS);
for (const [label, pdeck, oid] of SCENARIOS) {
  const o = oid ? opps.find((x) => x.id === oid) : null;
  const adeck = o ? o.deck : FARMED;
  const adiff = o ? o.difficulty : 5;
  let w = 0, errors = 0;
  for (let i = 0; i < N; i++) {
    try {
      if (playGame(5000 + i, pdeck, adeck, 5, adiff) === 'P') w++;
    } catch (e) { errors++; if (errors <= 2) console.error('  ✗ Absturz: ' + e.message); }
  }
  console.log(label.padEnd(30) + ' → ' + w + ' %' + (errors ? ' (' + errors + ' Abstürze!)' : ''));
}
