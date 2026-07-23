/* Baut test/deck.gen.html: prüft den Deck-Editor —
   Auto-Fill (gültiges Deck), Neues Deck mit Name, Deckwechsel,
   und den Sheet-Fix (NT.CardView.show muss AUCH im Editor sichtbar sein). */
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
  let steps = 0, phase = 'open';
  function finish(status, info) {
    clearInterval(poll);
    const res = document.createElement('div');
    res.id = 'probe-result';
    res.textContent = 'DECK|' + status + (info ? '|info=' + info : '') +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  const poll = setInterval(function () {
    try {
      steps++;
      if (steps > 60) return finish('TIMEOUT', 'phase=' + phase);
      if (phase === 'open') {
        if (!NTCG.Store || !NTCG.Store.data) return; // Store noch nicht geladen
        $('#btn-deck').click();
        if (!$('#scr-deck').classList.contains('active')) return finish('FAIL', 'Editor nicht aktiv');
        phase = 'autofill'; return;
      }
      if (phase === 'autofill') {
        $('#deck-autofill').click();
        const n = parseInt($('#deck-count').textContent, 10);
        const ok = $('#deck-msg').classList.contains('ok');
        if (!(n >= 20 && n <= 30)) return finish('FAIL', 'Auto-Fill Größe: ' + $('#deck-count').textContent);
        if (!ok) return finish('FAIL', 'Auto-Fill ungültig: ' + $('#deck-msg').textContent);
        $('#deck-save').click();
        phase = 'newdeck'; return;
      }
      if (phase === 'newdeck') {
        $('#deck-new').click();
        if ($('#modal').classList.contains('hidden')) return finish('FAIL', 'Neu-Modal blieb zu');
        $('#newdeck-name').value = 'Testdeck';
        const btn = $$('#modal-body .btn').find((b) => b.textContent.indexOf('Auto-Fill') >= 0);
        if (!btn) return finish('FAIL', 'kein Auto-Fill-Button im Modal');
        btn.click();
        const list = NTCG.Store.decksList();
        if (list.length !== 2) return finish('FAIL', 'decks=' + list.length);
        if (!list[1].active || list[1].name !== 'Testdeck') return finish('FAIL', 'aktiv=' + JSON.stringify(list));
        phase = 'switch'; return;
      }
      if (phase === 'switch') {
        $('#deck-switch').click();
        if ($('#modal').classList.contains('hidden')) return finish('FAIL', 'Wechsel-Modal blieb zu');
        const rows = $$('#modal-body .deck-row');
        if (rows.length !== 2) return finish('FAIL', 'deck-rows=' + rows.length);
        rows[0].click(); // zurück auf Deck 1
        if (NTCG.Store.activeDeckName() === 'Testdeck') return finish('FAIL', 'Wechsel fehlgeschlagen');
        phase = 'sheet'; return;
      }
      if (phase === 'sheet') {
        NTCG.CardView.show('naruto_genin');
        const vis = !$('#sheet').classList.contains('hidden') && !!document.querySelector('#sheet .big-card');
        if (!vis) return finish('FAIL', 'Sheet im Editor unsichtbar (Overlay-Bug?)');
        if (!$('#scr-deck').classList.contains('active')) return finish('FAIL', 'Editor nicht mehr aktiv');
        $('#sheet-close').click();
        phase = 'filter'; return;
      }
      if (phase === 'filter') {
        // zurück in den Sammlung-Tab (Auto-Fill hatte auf "Mein Deck" gewechselt)
        $('#tab-collection').click();
        // Filterleiste sichtbar im Sammlung-Tab?
        if ($('#deck-filters').classList.contains('hidden')) return finish('FAIL', 'Filterleiste versteckt');
        const total = $$('#collection-grid .g-card').length;
        // Suche: "naruto" → nur Naruto-Karten
        $('#filter-search').value = 'naruto';
        $('#filter-search').dispatchEvent(new Event('input'));
        const hits = $$('#collection-grid .g-card');
        if (!hits.length || hits.length >= total) return finish('FAIL', 'Suche: ' + hits.length + '/' + total);
        const names = hits.map((w) => w.querySelector('.c-name').textContent.toLowerCase());
        if (!names.every((n) => n.indexOf('naruto') >= 0)) return finish('FAIL', 'Suche falsch: ' + names.join(','));
        $('#filter-search').value = '';
        $('#filter-search').dispatchEvent(new Event('input'));
        // Typ-Filter: falle → alle Karten Fallen (kein .c-stats)
        $('#filter-kind').value = 'falle';
        $('#filter-kind').dispatchEvent(new Event('change'));
        const traps = $$('#collection-grid .g-card');
        if (!traps.length) return finish('FAIL', 'Typ falle: 0 Karten');
        if (traps.some((w) => w.querySelector('.c-stats'))) return finish('FAIL', 'Typ falle zeigt Ninja');
        // Rarität: N → alle .rar-N
        $('#filter-kind').value = '';
        $('#filter-kind').dispatchEvent(new Event('change'));
        $('#filter-rarity').value = 'N';
        $('#filter-rarity').dispatchEvent(new Event('change'));
        const ns = $$('#collection-grid .g-card .card');
        if (!ns.length || ns.some((el) => !el.classList.contains('rar-N'))) return finish('FAIL', 'Rarität N falsch');
        $('#filter-rarity').value = '';
        $('#filter-rarity').dispatchEvent(new Event('change'));
        // Sort ANG: erste Karte hat höchsten ANG
        $('#filter-sort').value = 'atk';
        $('#filter-sort').dispatchEvent(new Event('change'));
        const atks = $$('#collection-grid .g-card .c-atk').map((el) => parseInt(el.textContent, 10));
        for (let i = 1; i < atks.length; i++) if (atks[i] > atks[i - 1]) return finish('FAIL', 'Sort ANG: ' + atks.join(','));
        $('#filter-sort').value = 'default';
        $('#filter-sort').dispatchEvent(new Event('change'));
        finish('OK', 'autoFillOk|decks=2|sheetSichtbar|filter=' + total + '→' + hits.length);
        return;
      }
    } catch (e) { finish('EXCEPTION', e.message); }
  }, 200);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>deck-probe</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'deck.gen.html'), out);
console.log('deck.gen.html gebaut (' + out.length + ' Bytes)');
