/* Baut test/defpos.gen.html: beschwört ein Ninja, wechselt es in die
   Verteidigungsposition (defup) und prüft die Darstellung:
   - Karte liegt FLACH quer (kein matrix3d / kein rotateX mehr)
   - Innerelemente werden NICHT einzeln zurückgedreht (c-name transform:none)
   - Bounding-Rect ragt nicht chaotisch über den Slot hinaus
   Ausgabe: DEFPOS|OK|<messwerte> / DEFPOS|FAIL|<grund> */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');

const test = `
<script>
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
<script src="../js/shop.js"></script>
<script src="../js/main.js"></script>
<script>
window.addEventListener('load', function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));
  let steps = 0, state = 'summon', phaseClicks = 0;
  function finish(status, info) {
    clearInterval(poll);
    const res = document.createElement('div');
    res.id = 'probe-result';
    res.textContent = 'DEFPOS|' + status + '|' + (info || '') +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  function measure() {
    const card = $('.slot[data-side="P"][data-type="m"] .card.def');
    if (!card) return finish('FAIL', 'keine .def-Karte nach Positionswechsel');
    const cs = getComputedStyle(card);
    const name = card.querySelector('.c-name');
    const nameTf = name ? getComputedStyle(name).transform : 'n/a';
    const art = card.querySelector('.c-art img') || card.querySelector('.c-art .c-emoji');
    const artTf = art ? getComputedStyle(art).transform : 'n/a';
    const slot = card.parentElement.getBoundingClientRect();
    const cb = card.getBoundingClientRect();
    const overhangX = Math.max(0, slot.left - cb.left, cb.right - slot.right);
    const flat = cs.transform.indexOf('matrix3d') === -1; // 2D-Matrix = flach, kein rotateX
    const noCounter = nameTf === 'none' && artTf === 'none';
    const fits = overhangX <= slot.width * 0.16;
    finish((flat && noCounter && fits) ? 'OK' : 'FAIL',
      'tf=' + cs.transform.slice(0, 36) +
      ' nameTf=' + nameTf.slice(0, 20) + ' artTf=' + artTf.slice(0, 20) +
      ' slot=[w' + Math.round(slot.width) + ' h' + Math.round(slot.height) + ']' +
      ' card=[w' + Math.round(cb.width) + ' h' + Math.round(cb.height) + ']' +
      ' overhangX=' + Math.round(overhangX) +
      ' flat=' + flat + ' noCounter=' + noCounter + ' fits=' + fits);
  }
  const poll = setInterval(function () {
    try {
      if (++steps > 300) return finish('TIMEOUT', 'state=' + state + ' phase=' + (($('#board-phase') || {}).textContent));
      const sheet = $('#sheet');
      if (!sheet.classList.contains('hidden')) {
        const btns = $$('#sheet-actions button');
        if (state === 'changepos') {
          const def = btns.find((b) => b.textContent.indexOf('In Verteidigung') >= 0 && !b.disabled);
          if (def) { state = 'measure'; def.click(); return; }
          return finish('FAIL', 'kein „In Verteidigung" im Sheet: ' + btns.map((b) => b.textContent.trim().slice(0, 14)).join('~'));
        }
        const summon = btns.find((b) => b.textContent.indexOf('Beschwören') >= 0 && b.textContent.indexOf('Verdeckt') < 0 && !b.disabled);
        if (summon) { summon.click(); state = 'endturn'; return; }
        $('#sheet-close').click(); return;
      }
      if (state === 'measure') return measure();
      const btn = $('#phase-btn');
      if (!btn || btn.disabled) return; // KI-Zug / Fenster
      const chip = document.querySelector('#phase-chips span.on');
      const ph = chip ? chip.dataset.ph : '';
      if (state === 'summon' && ph === 'main1') {
        const hand = $('#hand .hand-card.playable');
        if (hand) { hand.click(); return; }
        return finish('FAIL', 'keine spielbare Handkarte');
      }
      if (state === 'endturn') {
        if (phaseClicks >= 2 && ph === 'main1') { // wieder unser Zug (Runde 3)
          const mon = $('.slot[data-side="P"][data-type="m"] .card');
          if (!mon) return finish('FAIL', 'eigenes Ninja verschwunden');
          state = 'changepos'; mon.click(); return;
        }
        if (ph === 'main1' || ph === 'main2' || ph === 'battle') { phaseClicks++; btn.click(); return; }
        return;
      }
    } catch (e) { finish('EXCEPTION', e.message); }
  }, 200);
  setTimeout(function () {
    NTCG.Store.getDeck = function () { return Array(20).fill('naruto_genin'); };
    NTCG.Duel.start({ id: 'probe', name: 'Probe', avatar: '🌑', difficulty: 1,
      reward: { cards: [], text: '' },
      deck: Array(12).fill('akademie_schueler').concat(Array(8).fill('kroeten_schild')) });
  }, 600);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>defpos</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'defpos.gen.html'), out);
console.log('defpos.gen.html gebaut (' + out.length + ' Bytes)');
