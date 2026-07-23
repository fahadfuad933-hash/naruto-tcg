/* Baut test/hit.gen.html: prüft, ob die sichtbare (über den Slot hinausragende)
   Oberkante einer Feldkarte wirklich der Karte (nicht dem Slot/leerem Raum) gehört. */
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
<script src="../js/main.js"></script>
<script>
window.addEventListener('load', function () {
  const $ = (s) => document.querySelector(s);
  let steps = 0;
  function finish(status, info) {
    clearInterval(poll);
    const res = document.createElement('div');
    res.id = 'probe-result';
    res.textContent = 'HIT|' + status + (info ? '|' + info : '') +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  const poll = setInterval(function () {
    try {
      steps++;
      if (steps > 80) return finish('TIMEOUT');
      if (!$('#scr-duel').classList.contains('active')) return;
      const sheet = $('#sheet');
      if (!sheet.classList.contains('hidden')) {
        const btns = Array.prototype.slice.call(sheet.querySelectorAll('#sheet-actions button'));
        const summon = btns.find((b) => b.textContent.indexOf('Beschwören') >= 0 && !b.disabled);
        if (summon) { summon.click(); return; }
        $('#sheet-close').click(); return;
      }
      const card = document.querySelector('.slot[data-side="P"][data-type="m"] .card:not(.facedown)');
      if (!card) {
        const hand = document.querySelector('#hand .hand-card.playable');
        if (hand) hand.click();
        return;
      }
      // Karte liegt vor: Punkte an der Oberkante + Mitte + Unterkante prüfen
      const r = card.getBoundingClientRect();
      const out = [];
      [2, r.height * 0.25, r.height * 0.5, r.height * 0.9].forEach((dy) => {
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + dy);
        const hit = el && (el === card || card.contains(el));
        const slot = el && el.closest ? el.closest('.slot') : null;
        out.push('y' + Math.round(dy) + '=' + (hit ? 'CARD' : slot ? 'slot:' + slot.dataset.side + slot.dataset.type + slot.dataset.zone : el ? el.tagName + '.' + el.className : 'null'));
      });
      // Klick-Test an der Oberkante: öffnet das Ninja-Sheet?
      const before = $('#sheet').classList.contains('hidden');
      card.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + 2 }));
      const opened = !$('#sheet').classList.contains('hidden');
      finish(opened ? 'OK' : 'FAIL', out.join(' ') + ' sheetBefore=' + before + ' opened=' + opened);
    } catch (e) { finish('EXCEPTION', e.message); }
  }, 200);
  setTimeout(function () {
    NTCG.Store.getDeck = function () { return Array(20).fill('naruto_genin'); };
    NTCG.Duel.start({ id: 'probe', name: 'Probe', avatar: '🌑', difficulty: 2,
      reward: { cards: [], text: '' }, deck: Array(20).fill('akademie_schueler') });
  }, 600);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>hit-probe</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'hit.gen.html'), out);
console.log('hit.gen.html gebaut (' + out.length + ' Bytes)');
