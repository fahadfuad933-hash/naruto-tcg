/* Baut test/shot.gen.html: navigiert automatisch ins Duell und spielt 1-2 Aktionen,
   damit ein Screenshot das echte Spielfeld zeigt. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');

const auto = `
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
  setTimeout(() => {
    $('#scr-title').click();
    $('#btn-duel').click();
    document.querySelector('.opp-card:not(.locked)').click();
    setTimeout(() => {
      // erste spielbare Handkarte beschwören/aktivieren
      const playable = document.querySelector('#hand .hand-card.playable');
      if (playable) {
        playable.click();
        const btn = document.querySelector('#sheet-actions .btn.btn-primary');
        if (btn) btn.click(); else $('#sheet-close').click();
      }
      const ro = document.getElementById('rotate-hint');
      if (ro) ro.classList.add('dismissed');
    }, 1200);
  }, 400);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>shot</title>\n</head>\n<body>\n' + body + auto + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'shot.gen.html'), out);
console.log('shot.gen.html gebaut');
