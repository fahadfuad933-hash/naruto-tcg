/* Baut test/reveal.gen.html: prüft, ob bei Jutsu-Aktivierung das
   Enthüllungs-Overlay (#reveal) mit der Karte erscheint.
   Gegner-Deck = 20x Ninja-Info-Karte (KI spielt Zieh-Jutsu sofort). */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');

const test = `
<script>
// deterministisches Spieler-Deck: 20x Naruto-Genin (jede Handkarte beschwörbar)
localStorage.setItem('ntcg_save_v1', JSON.stringify({ decks: [{ name: 'Probe', cards: Array(20).fill('naruto_genin') }], activeDeck: 0 }));
window.__errors = [];
window.onerror = function (msg, src, line) { window.__errors.push(msg + ' @' + (src||'').split('/').pop() + ':' + line); };
<\/script>
<script src="../js/data.js"></script>
<script src="../js/engine.js"></script>
<script src="../js/ai.js"></script>
<script src="../js/audio.js"></script>
<script src="../js/music.js"></script>
<script src="../js/story.js"></script>
<script src="../js/duel.js"></script>
<script src="../js/map.js"></script>
<script src="../js/main.js"></script>
<script>
window.addEventListener('load', function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));
  let sawReveal = false, caption = '', cardName = '', reveals = 0;
  function finish() {
    const res = document.createElement('div');
    res.id = 'probe-result';
    res.textContent = 'REVEAL|' + (sawReveal ? 'OK' : 'FAIL') +
      '|caption=' + caption + '|card=' + cardName + '|reveals=' + reveals +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  setTimeout(function () {
    try {
      // Duell gegen KI mit 20x Sumpf der Unterwelt (Dauer-Karte, wird sofort ausgespielt)
      NTCG.Duel.start({ id: 'iruka', name: 'Probe', avatar: '🌑', reward: { cards: [], text: '' }, deck: Array(20).fill('yomi_numa') });
      // eigenen Zug durchklicken (H1 → Kampf → H2 → Ende)
      // erst ein eigenes Ninja beschwören (sonst spielt die KI den Sumpf nicht aus)
      let clicks = 0, summoned = false, handIdx = 0;
      const clickIv = setInterval(function () {
        if (clicks >= 4) { clearInterval(clickIv); return; }
        if (!summoned) {
          // durch die Hand klicken, bis eine beschwörbare Karte gefunden ist
          const cards = $$('#hand .hand-card');
          if (!cards.length) return;
          const sheet = $('#sheet');
          if (sheet.classList.contains('hidden')) { cards[handIdx % cards.length].click(); return; }
          const summon = $$('#sheet-actions button').find((b) => b.textContent.indexOf('Beschwören') >= 0 && !b.disabled);
          if (summon) { summon.click(); summoned = true; }
          else { handIdx++; const close = $('#sheet-close'); if (close) close.click(); }
          return;
        }
        const btn = $('#phase-btn');
        if (btn && !btn.disabled) { btn.click(); clicks++; }
      }, 250);
      // auf Enthüllungs-Overlay pollen
      const poll = setInterval(function () {
        if (!$('#reveal').classList.contains('hidden') && $('#reveal-card').children.length) {
          sawReveal = true; reveals++;
          caption = $('#reveal-caption').textContent;
          const n = $('#reveal-card .b-name');
          if (n) cardName = n.textContent;
        }
      }, 80);
      setTimeout(function () {
    clearInterval(poll);
    try {
      const du = document.querySelector('#scr-duel');
      const hand = document.querySelectorAll('#hand .hand-card').length;
      const pMon = document.querySelectorAll('#my-mon .slot .card').length;
      const aST = document.querySelectorAll('#opp-st .slot .card').length;
      const ph = document.querySelector('#phase-btn') ? document.querySelector('#phase-btn').textContent : '?';
      window.__errors.push('DBG summoned=' + summoned + ' clicks=' + clicks + ' duelAktiv=' + (du && du.classList.contains('active')) +
        ' hand=' + hand + ' pMon=' + pMon + ' aST=' + aST + ' phaseBtn=' + ph);
    } catch (e) { window.__errors.push('DBGEX ' + e.message); }
    finish();
  }, 20000);
    } catch (e) {
      window.__errors.push('probe: ' + e.message);
      finish();
    }
  }, 800);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>reveal-probe</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'revealdbg.gen.html'), out);
console.log('reveal.gen.html gebaut (' + out.length + ' Bytes)');
