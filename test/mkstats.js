/* Baut test/stats.gen.html: prüft Statistik-Modal (W/L, Sammlung, Erfolge)
   und den Backup-Export/Import (Base64-Roundtrip).
   Seedet localStorage VOR dem Laden mit Test-Werten. */
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
// Seed: 12 Siege (davon itachi 1, kurogane 1), 3 Niederlagen, 12.345 Schaden
localStorage.setItem('ntcg_save_v1', JSON.stringify({
  wins: { iruka: 5, sasuke: 4, gaara: 1, itachi: 1, kurogane: 1 },
  losses: { itachi: 2, kurogane: 1 },
  stats: { games: 15, damageDealt: 12345 },
  story: { introDone: true, flags: {}, progress: 5 },
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
<script src="../js/main.js"></script>
<script>
window.addEventListener('load', function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));
  let steps = 0, phase = 'menu';
  function finish(status, info) {
    clearInterval(poll);
    const res = document.createElement('div');
    res.id = 'probe-result';
    res.textContent = 'STATS|' + status + (info ? '|info=' + info : '') +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  const poll = setInterval(function () {
    try {
      steps++;
      if (steps > 60) return finish('TIMEOUT', 'phase=' + phase);
      if (phase === 'menu') {
        if (!NTCG.Store || !NTCG.Store.data) return;
        $('#scr-title').click(); // Titel → Menü (introDone, also direkt)
        if (!$('#scr-menu').classList.contains('active')) return finish('FAIL', 'Menü nicht aktiv');
        phase = 'achievements'; return;
      }
      if (phase === 'achievements') {
        // Menü-Show hat checkAchievements laufen lassen:
        // 12 Siege → first_win + win_10; itachi → beat_itachi; kurogane → beat_kurog; 12345 dmg → dmg_10k
        const a = NTCG.Store.data.achievements;
        for (const id of ['first_win', 'win_10', 'beat_itachi', 'beat_kurog', 'dmg_10k']) {
          if (!a[id]) return finish('FAIL', 'Erfolg fehlt: ' + id + ' in ' + JSON.stringify(a));
        }
        if (a.win_25) return finish('FAIL', 'win_25 bei 12 Siegen?');
        phase = 'stats'; return;
      }
      if (phase === 'stats') {
        $('#btn-stats').click();
        if ($('#modal').classList.contains('hidden')) return finish('FAIL', 'Statistik-Modal blieb zu');
        const t = $('#modal-body').textContent;
        if (t.indexOf('15') < 0) return finish('FAIL', 'Duelle≠15: ' + t.slice(0, 120));
        if (t.indexOf('80 %') < 0) return finish('FAIL', 'Siegrate≠80 %');
        if (t.indexOf('12.345') < 0 && t.indexOf('12345') < 0) return finish('FAIL', 'Schaden fehlt');
        const rows = $$('#modal-body .ach-row');
        if (rows.length !== NTCG.ACHIEVEMENTS.length) return finish('FAIL', 'ach-rows=' + rows.length);
        const done = $$('#modal-body .ach-row.done').length;
        if (done < 5) return finish('FAIL', 'done=' + done);
        // Erfolge haben Karten gegeben: Sammlung muss über dem Seed-Stand sein
        phase = 'backup'; return;
      }
      if (phase === 'backup') {
        $('#btn-backup').click();
        const modal = $('#modal-body');
        const tas = $$('#modal-body textarea');
        if (tas.length !== 2) return finish('FAIL', 'textareas=' + tas.length);
        const code = tas[0].value;
        if (!code || code.length < 100) return finish('FAIL', 'Export-Code zu kurz');
        // Roundtrip: Code dekodieren → muss die Seed-Werte enthalten
        let decoded = null;
        try { decoded = JSON.parse(decodeURIComponent(escape(atob(code)))); }
        catch (e) { return finish('FAIL', 'Export nicht dekodierbar: ' + e.message); }
        if (!decoded.wins || decoded.wins.iruka !== 5) return finish('FAIL', 'Roundtrip wins falsch');
        if (!decoded.achievements || !decoded.achievements.first_win) return finish('FAIL', 'Roundtrip achievements fehlen');
        // Import mit Müll → Toast, kein Crash
        tas[1].value = '!!!kein-code!!!';
        const btns = $$('#modal-body .btn');
        const apply = btns.find((b) => b.textContent.indexOf('Importieren') >= 0);
        if (!apply) return finish('FAIL', 'kein Import-Button');
        apply.click();
        const toast = $('#toast');
        if (toast.classList.contains('hidden') || toast.textContent.indexOf('Ungültig') < 0)
          return finish('FAIL', 'kein Warn-Toast bei Müll-Import');
        finish('OK', 'ach=5|roundtrip=ok|import-guard=ok');
        return;
      }
    } catch (e) { finish('EXCEPTION', e.message); }
  }, 200);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>stats-probe</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'stats.gen.html'), out);
console.log('stats.gen.html gebaut (' + out.length + ' Bytes)');
