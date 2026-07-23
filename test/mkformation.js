/* Baut test/formation.gen.html: prüft zwei UI-Bugs —
   1) Team 7 – Formation (sp_summon_hand_tribe): nach Aktivieren muss das
      Hand-Auswahl-Modal die Konoha-Ninja anbieten und beschwören können
   2) Dauer-Karten (schattenspiel) zeigen auf der ST-Zone das ♾️-Icon, nicht "undefined"
   Ausgabe: FORM|OK / FORM|FAIL|<grund> */
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
  let steps = 0, phase = 'activate-formation';
  function finish(status, info) {
    clearInterval(poll);
    const res = document.createElement('div');
    res.id = 'probe-result';
    res.textContent = 'FORM|' + status + '|' + (info || '') +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  const poll = setInterval(function () {
    try {
      if (++steps > 120) return finish('TIMEOUT', 'phase=' + phase);
      if (phase === 'activate-formation') {
        // Formation in der Hand finden (Index 1 oder 3, siehe Deck unten)
        const cards = $$('#hand .hand-card');
        if (!cards.length) return;
        const idx = cards.findIndex((el) => (el.querySelector('.c-name') || {}).textContent.indexOf('Formation') >= 0);
        if (idx < 0) return finish('FAIL', 'keine Formation auf der Starthand');
        cards[idx].click();
        const act = $$('#sheet-actions button').find((b) => b.textContent.indexOf('Aktivieren') >= 0 && !b.disabled);
        if (!act) return finish('FAIL', 'Aktivieren deaktiviert');
        act.click();
        phase = 'pick';
        return;
      }
      if (phase === 'pick') {
        if ($('#modal').classList.contains('hidden')) return;
        const btns = $$('#modal-body .trap-choice');
        if (!btns.length) return finish('FAIL', 'Auswahl-Modal ohne Ninja-Optionen');
        const nonKonoha = btns.filter((b) => b.textContent.indexOf('Konoha') < 0 && b.textContent.indexOf('Naruto') < 0 && b.textContent.indexOf('Iruka') < 0);
        if (nonKonoha.length) return finish('FAIL', 'Nicht-Konoha im Angebot: ' + nonKonoha[0].textContent);
        btns[0].click();
        phase = 'check-summon';
        return;
      }
      if (phase === 'check-summon') {
        const mon = $$('.slot[data-side="P"][data-type="m"] .card').length;
        if (!mon) return; // Engine arbeitet noch
        phase = 'activate-dauer';
        return;
      }
      if (phase === 'activate-dauer') {
        const cards = $$('#hand .hand-card');
        const idx = cards.findIndex((el) => (el.querySelector('.c-name') || {}).textContent.indexOf('Schattenspiel') >= 0);
        if (idx < 0) return finish('FAIL', 'kein Schattenspiel mehr auf der Hand');
        cards[idx].click();
        const act = $$('#sheet-actions button').find((b) => b.textContent.indexOf('Aktivieren') >= 0 && !b.disabled);
        if (!act) return finish('FAIL', 'Schattenspiel-Aktivieren deaktiviert');
        act.click();
        phase = 'check-icon';
        return;
      }
      if (phase === 'check-icon') {
        const stCard = document.querySelector('.slot[data-side="P"][data-type="st"] .card');
        if (!stCard) return;
        const html2 = stCard.innerHTML;
        if (html2.indexOf('undefined') >= 0) return finish('FAIL', 'ST-Karte zeigt „undefined"');
        if (html2.indexOf('♾️') < 0) return finish('FAIL', 'kein ♾️-Icon auf der Dauer-Karte');
        const summoned = $$('.slot[data-side="P"][data-type="m"] .card').length >= 1;
        if (!summoned) return finish('FAIL', 'Formation hat nichts beschworen');
        finish('OK', 'formation-modal+dauer-icon');
        return;
      }
    } catch (e) { finish('EXCEPTION', e.message); }
  }, 250);
  setTimeout(function () {
    Math.random = () => 0.999999; // identisches Shuffle → Hand = Deck-Ende
    NTCG.Store.getDeck = function () {
      return Array(16).fill('naruto_genin').concat(['team7_formation', 'naruto_genin', 'schattenspiel', 'naruto_genin']);
    };
    NTCG.Duel.start({ id: 'probe', name: 'Probe', avatar: '🌑', difficulty: 1,
      reward: { cards: [], text: '' }, deck: Array(20).fill('akademie_schueler') });
  }, 600);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>formation</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'formation.gen.html'), out);
console.log('formation.gen.html gebaut (' + out.length + ' Bytes)');
