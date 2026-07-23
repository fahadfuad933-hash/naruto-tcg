/* ============================================================
   Scannt assets/cards/*.jpg und schreibt das NT.CARD_IMG-Manifest
   in js/data.js (zwischen GENERATED:CARDIMG-Markern).
   Aufruf: node tools/cardimgmanifest.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CARDS_DIR = path.join(ROOT, 'assets', 'cards');
const DATA = path.join(ROOT, 'js', 'data.js');

const ids = fs.readdirSync(CARDS_DIR)
  .filter((f) => f.endsWith('.jpg'))
  .map((f) => path.basename(f, '.jpg'))
  .sort();

const entries = ids.map((id) => "'" + id + "':'assets/cards/" + id + ".jpg'").join(', ');
const block = '/* GENERATED:CARDIMG — wird von tools/cardimgmanifest.js verwaltet (Kartenbilder) */\n' +
  '  NT.CARD_IMG = { ' + entries + ' };\n' +
  '  /* :CARDIMG */';

let src = fs.readFileSync(DATA, 'utf8');
const re = /\/\* GENERATED:CARDIMG[\s\S]*?\/\* :CARDIMG \*\//;
if (!re.test(src)) {
  console.error('Marker nicht gefunden in js/data.js');
  process.exit(1);
}
src = src.replace(re, block);
fs.writeFileSync(DATA, src);
console.log('Manifest aktualisiert: ' + ids.length + ' Bilder.');
