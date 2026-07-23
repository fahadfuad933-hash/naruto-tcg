/* Baut test/win.gen.html: spielt ein komplettes Duell bis zum Sieg durch
   (Spieler-Deck 20x Rock Lee, KI-Deck 20x Ino) und prüft, ob das
   Sieges-Modal erscheint. Fehler werden mitprotokolliert. */
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
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));
  let steps = 0, sawDying = false;
  const tried = new Set();
  function finish(status, info) {
    clearInterval(poll);
    const res = document.createElement('div');
    res.id = 'probe-result';
    const modalVisible = !$('#modal').classList.contains('hidden');
    res.textContent = 'WIN|' + status +
      '|lp=' + $('#opp-lptext').textContent +
      '|dying=' + sawDying +
      '|modal=' + (modalVisible ? $('#modal-body').textContent.slice(0, 60) : 'hidden') +
      (info ? '|info=' + info : '') +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  const poll = setInterval(function () {
    try {
      if (document.querySelector('.card-dying')) sawDying = true;
      steps++;
      if (steps > 300) return finish('TIMEOUT', 'phase=' + ($('#board-phase') || {}).textContent);
      const modal = $('#modal');
      if (!modal.classList.contains('hidden')) {
        const t = modal.textContent;
        if (t.indexOf('SIEG') >= 0) {
          // Ryo-Auszahlung muss im Ergebnis-Modal stehen und im Save landen
          if (t.indexOf('Ryo') < 0) return finish('FAIL', 'keine Ryo-Auszahlung im Sieg-Modal');
          if (!(NTCG.Store.data.ryo > 0)) return finish('FAIL', 'Ryo nicht im Save: ' + NTCG.Store.data.ryo);
          // Erst-Sieg muss den Erfolg "Erster Sieg" freischalten (Box im Ergebnis-Modal)
          const ach = modal.querySelector('.ach-box');
          if (!ach) return finish('FAIL', 'keine Erfolgs-Box im Sieg-Modal');
          if (ach.textContent.indexOf('Erster Sieg') < 0) return finish('FAIL', 'Erfolg falsch: ' + ach.textContent.slice(0, 80));
          if (!NTCG.Store.data.achievements.first_win) return finish('FAIL', 'first_win nicht im Save');
          return finish('OK-SIEG', 'ach=first_win');
        }
        if (t.indexOf('NIEDERLAGE') >= 0) return finish('OK-LOSE');
        return; // anderes Modal: abwarten
      }
      const sheet = $('#sheet');
      if (!sheet.classList.contains('hidden')) {
        const btns = $$('#sheet-actions button');
        const summon = btns.find((b) => b.textContent.indexOf('Beschwören') >= 0 && !b.disabled);
        const attack = btns.find((b) => b.textContent.indexOf('Angreifen') >= 0 && !b.disabled);
        if (summon) { summon.click(); return; }
        if (attack) { attack.click(); return; }
        $('#sheet-close').click(); return;
      }
      const banner = $('#sel-banner');
      if (!banner.classList.contains('hidden')) {
        const ok = $('#sel-ok');
        if (!ok.classList.contains('hidden') && !ok.disabled) { ok.click(); return; }
        const target = document.querySelector('.slot.hl-attack .card');
        if (target) { target.click(); return; }
        $('#sel-cancel').click(); return;
      }
      const btn = $('#phase-btn');
      if (btn.disabled) return; // KI-Zug / Fenster
      const chip = document.querySelector('#phase-chips span.on');
      const ph = chip ? chip.dataset.ph : '';
      if (ph === 'main1') {
        const hand = document.querySelector('#hand .hand-card.playable');
        const mons = $$('.slot[data-side="P"][data-type="m"] .card').length;
        if (hand && mons < 3) { hand.click(); return; }
        tried.clear(); btn.click(); return;
      }
      if (ph === 'battle') {
        const slots = $$('.slot[data-side="P"][data-type="m"]');
        const s = slots.find((sl) => sl.querySelector('.card') && !tried.has(sl.dataset.zone));
        if (s) { tried.add(s.dataset.zone); s.querySelector('.card').click(); return; }
        btn.click(); return;
      }
      if (ph === 'main2' || ph === 'end') { btn.click(); return; }
    } catch (e) { finish('EXCEPTION', e.message); }
  }, 150);
  setTimeout(function () {
    NTCG.Store.getDeck = function () { return Array(20).fill('naruto_genin'); };
    NTCG.Duel.start({ id: 'probe', name: 'Probe', avatar: '🌑', difficulty: 2,
      reward: { cards: [], text: '' },
      deck: Array(12).fill('gama').concat(Array(8).fill('kroeten_schild')) }); // Fallen → Fenster-Pfad beim tödlichen Treffer
  }, 600);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>win-probe</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'win.gen.html'), out);
console.log('win.gen.html gebaut (' + out.length + ' Bytes)');
