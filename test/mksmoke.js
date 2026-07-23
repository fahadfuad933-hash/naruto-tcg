/* Baut test/smoke.gen.html: echter index.html-Body + Testskript (file://-tauglich) */
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
  const steps = [];
  const ok = (name, cond) => steps.push((cond ? 'OK' : 'FAIL') + ' ' + name);
  function finish() {
    try {
      ok('Zaehler vorhanden', document.getElementById('opp-hand').textContent !== '');
    } catch (e) { window.__errors.push('finish: ' + e.message); }
    const res = document.createElement('div');
    res.id = 'smoke-result';
    res.textContent = 'SMOKE|' + (window.__errors.length ? 'ERRORS=' + window.__errors.join(' ;; ') : 'CLEAN') + '|' + steps.join(' , ');
    document.body.appendChild(res);
  }
  setTimeout(() => {
    try {
      ok('Titel sichtbar', $('#scr-title').classList.contains('active'));
      $('#scr-title').click();
      if ($('#scr-story').classList.contains('active')) {
        ok('Story startet beim ersten Start', true);
        $('#story-skip').click();
        ok('Namenseingabe erscheint', !$('#story-namebox').classList.contains('hidden'));
        $('#story-name-input').value = 'Test';
        $('#story-name-ok').click();
        $('#story-skip').click();
      }
      ok('Map sichtbar nach Intro', $('#scr-map').classList.contains('active'));
      $('#map-back').click();
      ok('Menue sichtbar', $('#scr-menu').classList.contains('active'));
      $('#btn-duel').click();
      ok('Gegnerwahl sichtbar', $('#scr-select').classList.contains('active'));
      const first = document.querySelector('.opp-card:not(.locked)');
      ok('Erster Gegner frei', !!first);
      first.click();
      ok('Duell aktiv', $('#scr-duel').classList.contains('active'));
      ok('Gegnername gesetzt', $('#opp-name').textContent.length > 2);
      ok('Hand hat 4 Karten', document.querySelectorAll('#hand .hand-card').length === 4);
      ok('Monsterzonen 3+3', document.querySelectorAll('#my-mon .slot').length === 3 && document.querySelectorAll('#opp-mon .slot').length === 3);
      ok('LP 8000', $('#my-lptext').textContent === '8000');
      const hc = document.querySelector('#hand .hand-card');
      if (hc) hc.click();
      ok('Sheet offen', !$('#sheet').classList.contains('hidden'));
      $('#sheet-close').click();
      ok('Sheet zu', $('#sheet').classList.contains('hidden'));
      $('#phase-btn').click();
      $('#phase-btn').click();
      setTimeout(finish, 6000);
    } catch (e) {
      window.__errors.push('test: ' + e.message);
      finish();
    }
  }, 800);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>smoke</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'smoke.gen.html'), out);
console.log('smoke.gen.html gebaut (' + out.length + ' Bytes)');
