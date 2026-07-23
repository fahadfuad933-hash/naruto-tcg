/* Statischer Check: Alle im JS referenzierten DOM-IDs müssen im HTML existieren,
   und alle referenzierten Dateien müssen vorhanden sein. */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const htmlIds = new Set();
for (const m of html.matchAll(/id="([^"]+)"/g)) htmlIds.add(m[1]);

let errors = 0;
const err = (m) => { errors++; console.error('  ✗ ' + m); };

// 1) IDs aus JS
for (const f of ['js/duel.js', 'js/main.js']) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  const refs = new Set();
  for (const m of src.matchAll(/\$\(['"]#([a-z0-9-]+)['"]/gi)) refs.add(m[1]);
  for (const m of src.matchAll(/getElementById\(['"]([a-z0-9-]+)['"]/gi)) refs.add(m[1]);
  for (const m of src.matchAll(/querySelectorAll?\(['"]#([a-z0-9-]+)['"]/gi)) refs.add(m[1]);
  for (const r of refs) if (!htmlIds.has(r)) err(f + ': fehlende ID #' + r);
  console.log('  ' + f + ': ' + refs.size + ' ID-Referenzen geprüft');
}

// 2) Dynamisch genutzte IDs in duel.js (rows-Objekt)
const duelSrc = fs.readFileSync(path.join(root, 'js/duel.js'), 'utf8');
for (const id of ['opp-st', 'opp-mon', 'my-mon', 'my-st']) {
  if (!htmlIds.has(id)) err('index.html: Zonen-ID #' + id + ' fehlt');
}

// 3) Datei-Referenzen aus HTML
for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  const p = m[1];
  if (p.startsWith('data:') || p.startsWith('http')) continue;
  if (!fs.existsSync(path.join(root, p))) err('index.html referenziert fehlende Datei: ' + p);
}

// 4) data-back-Ziele müssen Screens sein
for (const m of html.matchAll(/data-back="([^"]+)"/g)) {
  if (!htmlIds.has(m[1])) err('data-back Ziel fehlt: ' + m[1]);
}

if (errors) { console.error('FEHLER: ' + errors); process.exit(1); }
console.log('DOM-Check bestanden. ' + htmlIds.size + ' IDs im HTML.');
