/* Baut test/measure.gen.html: misst Layout-Breiten der Mid-Bar */
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
  setTimeout(() => {
    document.getElementById('scr-title').click();
    document.getElementById('btn-duel').click();
    document.querySelector('.opp-card:not(.locked)').click();
    setTimeout(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return s + ':MISSING'; const b = e.getBoundingClientRect(); return s + ' x=' + Math.round(b.left) + ' w=' + Math.round(b.width) + ' right=' + Math.round(b.right); };
      const lines = [
        'innerWidth=' + window.innerWidth,
        'cardW=' + getComputedStyle(document.documentElement).getPropertyValue('--card-w'),
        'handW=' + getComputedStyle(document.documentElement).getPropertyValue('--hand-w'),
        r('#duel-field'), r('#board-scene'), r('#board-3d'), r('#mid-bar'), r('#phase-chips'), r('#duel-log'), r('#phase-btn'),
        r('#hand-row'), r('.duel-topbar'), r('.duel-playerbar'), r('#opp-fan'),
      ];
      const d = document.createElement('div');
      d.id = 'measure';
      d.textContent = 'MEASURE|' + lines.join(' | ');
      document.body.appendChild(d);
    }, 1500);
  }, 400);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>measure</title>\n</head>\n<body>\n' + body + auto + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'measure.gen.html'), out);
console.log('measure.gen.html gebaut');
