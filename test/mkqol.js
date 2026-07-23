/* Baut test/qol.gen.html: prüft die Duell-QoL-Features —
   Hand-Sortierung (Toggle + Index-Mapping), Schadens-Vorschau (atk-preview),
   Tempo-Schalter (1×→2×→3×→1×) und Haptics (navigator.vibrate).
   Ausgabe: QOL|OK/FAIL|... */
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
localStorage.setItem('ntcg_save_v1', JSON.stringify({
  playerName: 'Kaze', story: { introDone: true, flags: {}, progress: 1 }, wins: {}, music: false
}));
window.__buzz = [];
navigator.vibrate = function (p) { window.__buzz.push(p); return true; };
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
  let steps = 0, phase = 'start-sort';
  let sortOrder = null;
  const VARIETY = ['naruto_genin','naruto_schueler','konohamaru_rivale','iruka_waechter','gama','gamakichi_krieger',
                   'gamaken_waechter','jiraiya_eremit','naruto_kyuubi','gamabunta_koenig','team7_formation','rasengan_genin',
                   'kroeten_ruf','rasengan_eremit','yomi_numa','schattenspiel','schatten_bindung','kroeten_magen',
                   'kawarimi_trick','hartschaum'];
  const OPP = () => ({ id: 'probe_qol', name: 'Probe-QoL', avatar: '🌑', difficulty: 2,
    reward: { cards: {}, text: '' }, deck: Array(20).fill('gamakichi_krieger') });
  const byName = {};
  function finish(status, info) {
    clearInterval(poll);
    const res = document.createElement('div');
    res.id = 'probe-result';
    res.textContent = 'QOL|' + status + (info ? '|info=' + info : '') +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  function handNames() {
    return $$('#hand .hand-card .c-name').map((el) => el.textContent);
  }
  function sortOK(names) { // unabhängige Kopie der Sortier-Logik (Typ→Stufe↓→ANG↓→Name)
    const KA = { ninja: 0, jutsu: 1, falle: 2 };
    const ids = names.map((n) => byName[n]);
    if (ids.some((id) => !id)) return false;
    const sorted = ids.slice().sort((a, b) => {
      const ca = NTCG.CARDS[a], cb = NTCG.CARDS[b];
      if (KA[ca.kind] !== KA[cb.kind]) return KA[ca.kind] - KA[cb.kind];
      return (cb.level || 0) - (ca.level || 0) || (cb.atk || 0) - (ca.atk || 0) || ca.name.localeCompare(cb.name, 'de');
    });
    return ids.join() === sorted.join();
  }
  function surrenderBack() {
    $('#btn-surrender').click();
    const yes = Array.from($('#modal-body').querySelectorAll('button')).find((b) => b.textContent.indexOf('Ja') >= 0);
    yes.click();
    setTimeout(function () {
      const back = Array.from($('#modal-body').querySelectorAll('button')).find((b) => b.textContent.indexOf('Gegnerwahl') >= 0);
      if (back) back.click();
    }, 1200);
  }
  const poll = setInterval(function () {
    try {
      steps++;
      window.__phase = phase;
      if (steps > 250) {
        const vlogTxt = $('#vlog') ? $('#vlog').textContent.slice(0, 300) : '?';
        const lpTxt = $('#opp-lptext') ? $('#opp-lptext').textContent : '?';
        return finish('TIMEOUT', 'phase=' + phase + '|lp=' + lpTxt + '|vlog=' + vlogTxt.replace(/\s+/g, ' '));
      }
      if (phase === 'start-sort') {
        if (!NTCG.Store || !NTCG.Store.data) return;
        for (const id in NTCG.CARDS) byName[NTCG.CARDS[id].name] = id;
        NTCG.Store.getDeck = function () { return VARIETY.slice(); };
        NTCG.Duel.start(OPP());
        phase = 'sorted1'; return;
      }
      if (phase === 'sorted1') {
        const names = handNames();
        if (names.length !== 4) return; // Hand noch nicht da
        if (!sortOK(names)) return finish('FAIL', 'Hand nicht sortiert: ' + names.join(','));
        sortOrder = names.join('|');
        phase = 'sortoff'; return;
      }
      if (phase === 'sortoff') {
        $('#btn-handsort').click();
        const names = handNames();
        const sameSet = names.slice().sort().join('|') === sortOrder.split('|').sort().join('|');
        if (!sameSet) return finish('FAIL', 'Sort aus: andere Karten?! ' + names.join(','));
        if ($('#btn-handsort').style.opacity !== '0.45') return finish('FAIL', 'Sort-Button-Opacity: ' + $('#btn-handsort').style.opacity);
        phase = 'sorton'; return;
      }
      if (phase === 'sorton') {
        $('#btn-handsort').click();
        const names = handNames();
        if (names.join('|') !== sortOrder) return finish('FAIL', 'Re-Sort weicht ab: ' + names.join(',') + ' vs ' + sortOrder);
        // Index-Mapping: 2. Karte antippen → Sheet zeigt genau diese Karte
        const target = $$('#hand .hand-card')[1];
        const expect = target.querySelector('.c-name').textContent;
        target.click();
        const sheetName = ($('#sheet-card .b-name') || {}).textContent;
        if (sheetName !== expect) return finish('FAIL', 'Index-Mapping: Sheet=' + sheetName + ' erwartet=' + expect);
        $('#sheet-close').click();
        phase = 'leave'; return;
      }
      if (phase === 'leave') {
        surrenderBack();
        phase = 'wait-select'; return;
      }
      if (phase === 'wait-select') {
        if (!$('#scr-duel').classList.contains('active')) {
          NTCG.Store.getDeck = function () { return Array(20).fill('naruto_genin'); };
          NTCG.Duel.start(OPP());
          phase = 'summon';
        }
        return;
      }
      if (phase === 'summon') {
        const hand = $$('#hand .hand-card');
        if (!hand.length) return;
        if ($('#phase-btn').disabled) return;
        hand[0].click();
        const btns = $$('#sheet-actions button');
        const summon = btns.find((b) => b.textContent.indexOf('Beschwören') >= 0 && !b.disabled);
        if (!summon) return finish('FAIL', 'kein Beschwören-Button');
        summon.click();
        $('#phase-btn').click(); // → H2
        phase = 'endturn'; return;
      }
      if (phase === 'endturn') {
        if ($('#phase-btn').disabled) return; // KI denkt
        const lbl = $('#phase-btn').textContent;
        if (lbl.indexOf('beenden') >= 0 || lbl.indexOf('Hauptphase') >= 0) { $('#phase-btn').click(); return; }
        phase = 'battle'; return;
      }
      if (phase === 'battle') {
        if ($('#phase-btn').disabled) return;
        const lbl = $('#phase-btn').textContent;
        if (lbl.indexOf('Kampfphase') >= 0) { $('#phase-btn').click(); return; } // erst in die Kampfphase
        // jetzt: Kampfphase aktiv (Button = 'Hauptphase 2 ➡️')
        const my = $$('.slot[data-side="P"][data-type="m"] .card')[0];
        if (!my) return finish('FAIL', 'kein eigener Ninja');
        my.click();
        const atk = $$('#sheet-actions button').find((b) => b.textContent.indexOf('Angreifen') >= 0 && !b.disabled);
        if (!atk) return finish('FAIL', 'kein Angreifen-Button (Phase=' + lbl + ')');
        atk.click();
        phase = 'preview'; return;
      }
      if (phase === 'preview') {
        if ($('#sel-banner').classList.contains('hidden')) return;
        const pvs = $$('.atk-preview');
        if (!pvs.length) return finish('FAIL', 'keine atk-preview-Badges');
        const good = pvs.filter((b) => b.classList.contains('good') && b.textContent.indexOf('+500') >= 0);
        const mid = pvs.filter((b) => b.classList.contains('mid'));
        if (!good.length && !mid.length) return finish('FAIL', 'Preview falsch: ' + pvs.map((b) => b.textContent + '/' + b.className).join(','));
        phase = 'hit'; return;
      }
      if (phase === 'hit') {
        const t = document.querySelector('.slot.hl-attack .card');
        if (!t) return finish('FAIL', 'kein Ziel markiert');
        const slot = t.closest('.slot');
        t.click();
        setTimeout(() => {
          const toastTxt = $('#toast').classList.contains('hidden') ? '' : $('#toast').textContent;
          if (toastTxt) return finish('FAIL', 'Engine-Fehler beim Angriff: ' + toastTxt);
          if (!$('#sel-banner').classList.contains('hidden')) {
            finish('FAIL', 'Klick wirkungslos: side=' + slot.dataset.side + ' zone=' + slot.dataset.zone +
              ' onclick=' + (t.onclick ? 'da' : 'FEHLT'));
          }
        }, 600);
        phase = 'verify'; return;
      }
      if (phase === 'verify') {
        const lpEl = $('#opp-lptext');
        const lp = parseInt(lpEl.dataset.v !== undefined ? lpEl.dataset.v : lpEl.textContent, 10); // dataset.v = Zielwert (rAF-Rolle läuft headless evtl. nicht)
        if (isNaN(lp)) return;
        // Gleichstand 1500 vs 1500: beide zerstört, kein LP-Schaden — aber Zerstörungs-Buzz
        const vlogTxt = ($('#vlog') || {}).textContent || '';
        if (vlogTxt.indexOf('zerstört') < 0) return; // Trade noch nicht passiert
        if (lp !== 8000) return finish('FAIL', 'Gegner-LP=' + lp + ' (erwartet 8000: Gleichstand ohne Schaden)');
        if (window.__buzz.indexOf(20) < 0) return finish('FAIL', 'kein vibrate(20): ' + JSON.stringify(window.__buzz));
        phase = 'speed'; return;
      }
      if (phase === 'speed') {
        const b = $('#btn-speed');
        if (b.textContent.indexOf('1×') < 0) return finish('FAIL', 'Speed initial: ' + b.textContent);
        b.click();
        if (b.textContent.indexOf('2×') < 0 || NTCG.Store.data.animSpeed !== 2) return finish('FAIL', 'Speed 2×: ' + b.textContent);
        b.click();
        if (b.textContent.indexOf('3×') < 0 || NTCG.Store.data.animSpeed !== 3) return finish('FAIL', 'Speed 3×: ' + b.textContent);
        b.click();
        if (b.textContent.indexOf('1×') < 0 || NTCG.Store.data.animSpeed !== 1) return finish('FAIL', 'Speed zurück: ' + b.textContent);
        finish('OK', 'sort+index+preview+buzz+speed');
        return;
      }
    } catch (e) { finish('EXCEPTION', e.message); }
  }, 200);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>qol-probe</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'qol.gen.html'), out);
console.log('qol.gen.html gebaut (' + out.length + ' Bytes)');
