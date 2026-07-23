/* Baut test/board.gen.html: prüft das ygopro-Upgrade —
   Seiten-Rails mit Deck-/Friedhofs-/Verbannt-Stapel (+Modale), Aktivierbar-Glow
   (Hand + gesetzte Jutsu), Zieh-Animation, Angriffs-Pfeil + VS-Gegenüberstellung,
   Boss-Arena (Klasse + --bossimg + leave-Cleanup).
   Ausgabe: BOARD|OK/FAIL|... */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const bodyRaw = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');

const test = `
<script>
window.__errors = [];
window.onerror = function (msg, src, line) { window.__errors.push(msg + ' @' + (src||'').split('/').pop() + ':' + line); };
// Deterministisches Deck: Engine dealt vom Ende → Testkarten (genin/schattenspiel) ans ENDE.
// Gültig (≤3 Kopien je Karte), Sammlung deckt alles ab.
const probeDeck = [
  'naruto_schueler', 'naruto_schueler', 'naruto_schueler',
  'konohamaru_rivale', 'konohamaru_rivale', 'konohamaru_rivale',
  'akademie_schueler', 'akademie_schueler', 'akademie_schueler',
  'iruka_waechter', 'iruka_waechter', 'iruka_waechter',
  'kawarimi_trick', 'kawarimi_trick',
  'naruto_genin', 'naruto_genin', 'naruto_genin',
  'schattenspiel', 'schattenspiel', 'schattenspiel',
];
localStorage.setItem('ntcg_save_v1', JSON.stringify({
  playerName: 'Kaze', sound: false, music: false,
  story: { introDone: true, flags: {}, progress: 1 }, wins: {},
  collection: { naruto_schueler: 3, konohamaru_rivale: 3, akademie_schueler: 3, iruka_waechter: 3, kawarimi_trick: 2, naruto_genin: 3, schattenspiel: 3 },
  decks: [{ name: 'Probe', cards: probeDeck }], activeDeck: 0
}));
<\/script>
<script src="../js/data.js"></script>
<script src="../js/engine.js"></script>
<script src="../js/ai.js"></script>
<script src="../js/audio.js"></script>
<script src="../js/music.js"></script>
<script src="../js/story.js"></script>
<script src="../js/duel.js"></script>
<script src="../js/map.js"></script>
<script src="../js/shop.js"></script>
<script src="../js/main.js"></script>
<script>
window.addEventListener('load', function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));
  const steps = [];
  const ok = (name, cond) => steps.push((cond ? 'OK' : 'FAIL') + ' ' + name);
  let sawVs = false, sawArrow = false, sawDraw = false;
  const poll = setInterval(function () {
    const vs = $('#duel-vs');
    if (vs && !vs.classList.contains('hidden')) sawVs = true;
    if (document.querySelector('.fx-arrow')) sawArrow = true;
    if (document.querySelector('.fx-drawcard')) sawDraw = true;
  }, 50);
  function finish() {
    clearInterval(poll);
    const res = document.createElement('div');
    res.id = 'probe-result';
    const fails = steps.filter((s) => s.indexOf('FAIL') === 0).length;
    res.textContent = 'BOARD|' + (fails || window.__errors.length ? 'FAIL' : 'OK') + '|' + steps.join(' , ') +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  const handCardByName = (t) => $$('#hand .hand-card').find((el) => el.textContent.indexOf(t) >= 0);
  const sheetBtn = (t) => $$('#sheet-actions button').find((b) => b.textContent.indexOf(t) >= 0 && !b.disabled);
  const myMonCard = () => $('.slot[data-side="P"][data-type="m"] .card');
  const foeMonCard = () => $('.slot[data-side="A"][data-type="m"] .card');

  setTimeout(function () {
    try {
      Math.random = () => 0.999999; // kein Shuffle → Starthand = Deck-Anfang
      const origCreate = NTCG.Engine.create;
      NTCG.Engine.create = function (cfg) { const E = origCreate(cfg); window.__E = E; return E; };
      NTCG.Duel.start({ id: 'probe', name: 'Probe-Ninja', avatar: '🎓', difficulty: 2, deck: Array(20).fill('akademie_schueler') });
    } catch (e) { window.__errors.push('start: ' + e.message); }
  }, 800);

  setTimeout(function () {
    try {
      // Rails liegen NEBEN der gekippten Matte (in #board-scene, nicht in #board-3d)
      ok('Rail Gegner in #board-scene', $('#rail-opp') && $('#rail-opp').parentElement.id === 'board-scene');
      ok('Rail Spieler in #board-scene', $('#rail-my') && $('#rail-my').parentElement.id === 'board-scene');
      ok('Piles hängen in den Rails', !!($('#rail-opp #opp-deckpile') && $('#rail-opp #opp-gypile') && $('#rail-opp #opp-banpile') &&
        $('#rail-my #my-deckpile') && $('#rail-my #my-gypile') && $('#rail-my #my-banpile')));
      ok('Keine Piles mehr auf der Matte', !$('#board-3d .pile'));
      ok('Rail-Reihenfolge: Verbannt → Friedhof → Deck', (function () {
        const kids = $$('#rail-my .pile');
        return kids.length === 3 && kids[0].id === 'my-banpile' && kids[1].id === 'my-gypile' && kids[2].id === 'my-deckpile';
      })());
      const dn = $('#my-deckpile .pile-n'), on = $('#opp-deckpile .pile-n');
      ok('Deck-Stapel: 16 nach Starthand [ist:' + (dn && dn.textContent) + ']', dn && dn.textContent === '16');
      ok('Gegner-Deck-Stapel: 16 [ist:' + (on && on.textContent) + ']', on && on.textContent === '16');
      ok('Friedhof leer (Platzhalter)', !!$('#my-gypile .pile-empty'));
      ok('Verbannt leer (🚫-Platzhalter)', !!$('#my-banpile .pile-empty') && $('#my-banpile .pile-empty').textContent.indexOf('🚫') >= 0);
      ok('VS-Overlay initial versteckt', $('#duel-vs').classList.contains('hidden'));
      ok('Hand: spielbare Karte leuchtet (playable)', $$('#hand .hand-card.playable').length >= 1);
      steps.push('HAND[' + $$('#hand .hand-card').map((el) => el.textContent.replace(/[0-9]/g, '')).join('|') + ']');
      // Naruto beschwören
      handCardByName('Naruto – Genin').click();
      sheetBtn('Beschwören').click();
      // Schattenspiel setzen
      setTimeout(function () {
        try {
          handCardByName('Schattenspiel').click();
          sheetBtn('Setzen').click();
        } catch (e) { window.__errors.push('set: ' + e.message); }
      }, 500);
    } catch (e) { window.__errors.push('t1: ' + e.message); }
  }, 2000);

  // Warten auf Bedingung (Poll), dann weiter
  const waitFor = (cond, fn, tries) => {
    let n = tries || 80;
    const iv = setInterval(function () {
      if (cond()) { clearInterval(iv); fn(); }
      else if (--n <= 0) { clearInterval(iv); window.__errors.push('waitFor-Timeout'); }
    }, 200);
  };
  const btnLabel = () => { const b = $('#phase-btn'); return b && !b.disabled ? b.textContent : ''; };

  setTimeout(function () {
    try {
      ok('Genin beschworen', !!myMonCard());
      ok('Gesetzte Jutsu leuchtet (can-act)', $$('.slot[data-side="P"][data-type="st"] .card.can-act').length >= 1);
      // Zug 1 beenden: main1 → main2 → Ende → Gegnerzug
      waitFor(() => btnLabel().indexOf('Hauptphase 2') >= 0, function () {
        $('#phase-btn').click(); // main1 → main2 (Zug 1 ohne Kampfphase)
        waitFor(() => btnLabel().indexOf('Zug beenden') >= 0, function () {
          $('#phase-btn').click(); // main2 → Ende → Gegnerzug beginnt
          // Zug 3 (2. Spielerzug): jetzt gibt es eine Kampfphase
          waitFor(() => btnLabel().indexOf('Kampfphase') >= 0, function () {
            try {
              ok('Gegner-Ninja da (Zug 3)', !!foeMonCard());
              $('#phase-btn').click(); // main1 → Kampfphase
              waitFor(() => btnLabel().indexOf('Hauptphase 2') >= 0, function () {
                try {
                  myMonCard().click(); // Monster-Sheet öffnen
                  waitFor(() => !!sheetBtn('Angreifen'), function () {
                    try {
                      sheetBtn('Angreifen').click(); // Ziel-Modus
                      waitFor(() => !!foeMonCard(), function () {
                        try { foeMonCard().click(); } catch (e) { window.__errors.push('ziel: ' + e.message); }
                      });
                    } catch (e) { window.__errors.push('atk: ' + e.message); }
                  });
                } catch (e) { window.__errors.push('atk-open: ' + e.message); }
              });
            } catch (e) { window.__errors.push('t3: ' + e.message); }
          });
        });
      });
    } catch (e) { window.__errors.push('t2: ' + e.message); }
  }, 5600);

  setTimeout(function () {
    try {
      ok('VS-Gegenüberstellung gezeigt', sawVs);
      ok('Angriffs-Pfeil gezeigt', sawArrow);
      ok('Zieh-Animation gesehen', sawDraw);
      const gyN = $('#opp-gypile .pile-n');
      ok('Gegner-Friedhof gefüllt [ist:' + (gyN ? gyN.textContent : 'leer') + ']', gyN && parseInt(gyN.textContent, 10) >= 1);
      // Friedhofs-Modal (Gegner): Kartenliste
      $('#opp-gypile').click();
      const cells = $$('#modal-body .gy-cell');
      ok('GY-Modal: Karten gelistet', !$('#modal').classList.contains('hidden') && cells.length >= 1);
      ok('GY-Modal: zeigt Akademie-Schüler', $('#modal-body').textContent.indexOf('Akademie-Schüler') >= 0);
      $('#modal-body .gy-close').click();
      // Friedhofs-Modal (eigen, leer)
      $('#my-gypile').click();
      ok('GY-Modal eigen (leer) öffnet', !$('#modal').classList.contains('hidden') && $('#modal-body').textContent.indexOf('Friedhof') >= 0);
      $('#modal-body .gy-close').click();
      // Verbannt-Modal (eigen, leer)
      $('#my-banpile').click();
      ok('Ban-Modal eigen (leer) öffnet', !$('#modal').classList.contains('hidden') && $('#modal-body').textContent.indexOf('erbannt') >= 0);
      $('#modal-body .gy-close').click();
    } catch (e) { window.__errors.push('t5: ' + e.message); }
  }, 24000);

  // Boss-Arena: Klasse auf Screen + Matte, --bossimg gesetzt, Shop-Theme verdrängt; leave() räumt auf
  setTimeout(function () {
    try {
      NTCG.Duel.start({ id: 'zabuza_story', name: 'Zabuza', avatar: '🗡️', difficulty: 7, boss: true, deck: Array(20).fill('akademie_schueler') });
      const bd = $('#board-3d'), scr = $('#scr-duel');
      ok('Boss-Arena: Klasse auf Matte', bd.classList.contains('boss-zabuza'));
      ok('Boss-Arena: Klasse auf Screen', scr.classList.contains('boss-zabuza'));
      ok('Boss-Arena: --bossimg gesetzt', scr.style.getPropertyValue('--bossimg').indexOf('33-bruecke') >= 0);
      ok('Boss-Arena: kein Shop-Theme', bd.className.indexOf('theme-') < 0);
      NTCG.Duel.leave();
      ok('Boss-Arena: leave räumt Klassen ab', !bd.classList.contains('boss-zabuza') && !scr.classList.contains('boss-zabuza'));
    } catch (e) { window.__errors.push('boss: ' + e.message); }
  }, 25500);

  setTimeout(finish, 27500);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>board-probe</title>\n</head>\n<body>\n' + bodyRaw + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'board.gen.html'), out);
console.log('board.gen.html gebaut (' + out.length + ' Bytes)');
