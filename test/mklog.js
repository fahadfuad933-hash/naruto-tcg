/* Baut test/log.gen.html: spielt ein paar Aktionen, öffnet das Kampflog-Modal
   per Klick auf #vlog und tippt einen Eintrag mit Karte an (→ Großansicht). */
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
  let steps = 0, phase = 'play';
  function finish(status, info) {
    clearInterval(poll);
    const res = document.createElement('div');
    res.id = 'probe-result';
    res.textContent = 'LOG|' + status + (info ? '|info=' + info : '') +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  const poll = setInterval(function () {
    try {
      steps++;
      if (steps > 120) return finish('TIMEOUT', 'phase=' + phase);
      if (phase === 'play') {
        if (!$('#scr-duel').classList.contains('active')) return; // Duell noch nicht gestartet
        // eine Karte beschwören, dann Zug beenden → es gibt Log-Einträge
        const sheet = $('#sheet');
        if (!sheet.classList.contains('hidden')) {
          const btns = Array.prototype.slice.call(sheet.querySelectorAll('#sheet-actions button'));
          const summon = btns.find((b) => b.textContent.indexOf('Beschwören') >= 0 && !b.disabled);
          if (summon) { summon.click(); return; }
          $('#sheet-close').click(); return;
        }
        const btn = $('#phase-btn');
        if (btn.disabled) return;
        const chip = document.querySelector('#phase-chips span.on');
        if (chip && chip.dataset.ph === 'main1') {
          const hand = document.querySelector('#hand .hand-card.playable');
          if (hand && !document.querySelector('.slot[data-side="P"][data-type="m"] .card')) { hand.click(); return; }
        }
        phase = 'openlog'; return;
      }
      if (phase === 'openlog') {
        $('#vlog').click();
        if ($('#modal').classList.contains('hidden')) return finish('FAIL', 'Log-Modal blieb zu');
        const rows = document.querySelectorAll('#modal .log-row');
        if (!rows.length) return finish('FAIL', 'keine log-row');
        const withCard = document.querySelector('#modal .log-row.has-card');
        if (!withCard) return finish('FAIL', 'keine log-row.has-card');
        withCard.click();
        phase = 'sheet'; return;
      }
      if (phase === 'sheet') {
        if (!$('#sheet').classList.contains('hidden') && document.querySelector('#sheet .big-card')) {
          const nm = document.querySelector('#sheet .big-card .b-name');
          finish('OK', 'rows=' + document.querySelectorAll('#modal .log-row').length + '|card=' + (nm ? nm.textContent : '?'));
        }
        return;
      }
    } catch (e) { finish('EXCEPTION', e.message); }
  }, 200);
  setTimeout(function () {
    NTCG.Store.getDeck = function () { return Array(20).fill('naruto_genin'); };
    NTCG.Duel.start({ id: 'probe', name: 'Probe', avatar: '🌑', difficulty: 2,
      reward: { cards: [], text: '' }, deck: Array(20).fill('akademie_schueler') });
  }, 600);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>log-probe</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'log.gen.html'), out);
console.log('log.gen.html gebaut (' + out.length + ' Bytes)');
