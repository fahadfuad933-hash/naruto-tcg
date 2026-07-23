/* Baut test/debug.gen.html: startet ein Duell und misst Layout-Rechtecke (Diagnose) */
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
      const cs = getComputedStyle(document.documentElement);
      const r = (s) => {
        const e = document.querySelector(s);
        if (!e) return s + ':MISSING';
        const b = e.getBoundingClientRect();
        return s + ' [x=' + Math.round(b.left) + ' y=' + Math.round(b.top) + ' w=' + Math.round(b.width) + ' h=' + Math.round(b.height) + ']';
      };
      const hc = document.querySelector('#hand .hand-card');
      const cardEl = document.querySelector('#hand .hand-card .card');
      const lines = [
        'W=' + window.innerWidth + ' H=' + window.innerHeight,
        '--card-w=' + cs.getPropertyValue('--card-w').trim(),
        '--hand-w=' + cs.getPropertyValue('--hand-w').trim(),
        r('#duel-field'), r('#board-scene'), r('#board-3d'),
        r('#hand-row'), r('#hand'),
        hc ? 'hand-card [x=' + Math.round(hc.getBoundingClientRect().left) + ' y=' + Math.round(hc.getBoundingClientRect().top) + ' w=' + Math.round(hc.getBoundingClientRect().width) + ' h=' + Math.round(hc.getBoundingClientRect().height) + ']' : 'hand-card:KEINE',
        r('.slot[data-side="P"][data-type="st"][data-zone="1"]'),
        r('.slot[data-side="A"][data-type="st"][data-zone="1"]'),
        r('#board-phase'),
        r('#duel-log'), r('#mid-bar'), r('.duel-playerbar'),
        'fieldH=' + document.getElementById('duel-field').clientHeight,
      ];
      if (cardEl) {
        const cc = getComputedStyle(cardEl);
        const an = cardEl.getAnimations ? cardEl.getAnimations()[0] : null;
        lines.push('CARD op=' + cc.opacity + ' anim=' + cc.animationName + '/' + (an ? an.playState : '-') +
          ' bg=[' + cc.backgroundImage.slice(0, 110) + '] tf=[' + cc.transform.slice(0, 70) + ']');
      }
      const d = document.createElement('div');
      d.id = 'debug-out';
      d.textContent = 'DEBUG|' + lines.join(' | ');
      document.body.appendChild(d);
    }, 1500);
  }, 400);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>debug</title>\n</head>\n<body>\n' + body + auto + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'debug.gen.html'), out);
console.log('debug.gen.html gebaut');
