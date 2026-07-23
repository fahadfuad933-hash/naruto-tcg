/* Baut test/story.gen.html: testet den kompletten Story-Ablauf beim ersten Start —
   Intro-Slides, Typewriter, Skip, Namenseingabe, Kaito-Dialog mit Antwort-Flags,
   Menü-Übergang und Intro-Replay. Ausgabe: STORY|OK/FAIL|... */
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
  const bgImgs = () => ($('#story-bg-a').style.backgroundImage + $('#story-bg-b').style.backgroundImage);
  const save = () => JSON.parse(localStorage.getItem('ntcg_save_v1') || '{}');
  function finish() {
    const res = document.createElement('div');
    res.id = 'story-result';
    const fails = steps.filter((s) => s.indexOf('FAIL') === 0).length;
    res.textContent = 'STORY|' + (fails || window.__errors.length ? 'FAIL' : 'OK') + '|' + steps.join(' , ') +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  let len1 = 0;
  setTimeout(function () {
    try {
      $('#scr-title').click();
      ok('Story-Screen aktiv', $('#scr-story').classList.contains('active'));
      ok('Bild 1 gesetzt', bgImgs().indexOf('01-neo-konoha') >= 0);
    } catch (e) { window.__errors.push('t1: ' + e.message); }
  }, 900);
  setTimeout(function () {
    try {
      len1 = $('#story-text').textContent.length;
      ok('Typewriter laeuft (wenig Text)', len1 > 0 && len1 < 60);
    } catch (e) { window.__errors.push('t2: ' + e.message); }
  }, 1600);
  setTimeout(function () {
    try {
      const len2 = $('#story-text').textContent.length;
      ok('Typewriter schreibt weiter', len2 > len1);
      $('#scr-story').click(); // Zeile sofort komplett
      ok('Tap komplettiert Zeile', $('#story-text').textContent.length > 100);
    } catch (e) { window.__errors.push('t3: ' + e.message); }
  }, 2600);
  setTimeout(function () {
    try {
      $('#scr-story').click(); // naechstes Bild
      ok('Bild 2 gesetzt', bgImgs().indexOf('02-duellanten') >= 0); // synchron nach Tap pruefen (404-Fallback in test/ wuerde es spaeter ueberschreiben)
    } catch (e) { window.__errors.push('t4: ' + e.message); }
  }, 2800);
  setTimeout(function () {
    try {
      $('#story-skip').click();
      ok('Namenseingabe sichtbar', !$('#story-namebox').classList.contains('hidden'));
      ok('Skip bei Name versteckt', $('#story-skip').classList.contains('hidden'));
      $('#story-name-input').value = 'Kaze';
      $('#story-name-ok').click();
      ok('Name gespeichert', save().playerName === 'Kaze');
      ok('Kaito-Szene: Bild', bgImgs().indexOf('08-kaito') >= 0); // synchron nach Szenenwechsel
    } catch (e) { window.__errors.push('t5: ' + e.message); }
  }, 4200);
  setTimeout(function () {
    try {
      ok('Sprecher = Kaito', $('#story-who').textContent === 'Kaito');
      ok('Name im Dialog', $('#story-text').textContent.slice(0, 4) === 'Kaze');
    } catch (e) { window.__errors.push('t6: ' + e.message); }
  }, 4600);
  setTimeout(function () {
    try {
      $('#scr-story').click(); // Zeile 1 komplett/weiter
      $('#scr-story').click(); // -> Zeile 2
    } catch (e) { window.__errors.push('t7: ' + e.message); }
  }, 6000);
  setTimeout(function () {
    try {
      $('#scr-story').click(); // komplett
      $('#scr-story').click(); // -> Auswahl
      const btns = document.querySelectorAll('#story-choices .story-choice');
      ok('3 Antworten sichtbar', btns.length === 3);
      btns[0].click(); // „Wie bitte?!" → gift + kaito+1
      const f = (save().story || {}).flags || {};
      ok('Flag gift=true', f.gift === true);
      ok('Flag kaito=1', f.kaito === 1);
    } catch (e) { window.__errors.push('t8: ' + e.message); }
  }, 7600);
  setTimeout(function () {
    try {
      $('#story-skip').click(); // Rest des Dialogs ueberspringen -> Stadt-Map
      ok('Map aktiv', $('#scr-map').classList.contains('active'));
      ok('introDone gespeichert', (save().story || {}).introDone === true);
      ok('Objective zeigt Akademie', $('#map-objective').textContent.indexOf('Akademie') >= 0);
      $('#map-back').click(); // -> Menue
      ok('Menue aktiv', $('#scr-menu').classList.contains('active'));
      $('#btn-story').click(); // Replay
      ok('Replay startet', $('#scr-story').classList.contains('active'));
      $('#story-skip').click();
      ok('Replay endet im Menue', $('#scr-menu').classList.contains('active'));
    } catch (e) { window.__errors.push('t9: ' + e.message); }
  }, 9200);
  setTimeout(finish, 10000);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>story-probe</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'story.gen.html'), out);
console.log('story.gen.html gebaut (' + out.length + ' Bytes)');
