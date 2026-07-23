/* Baut test/shop.gen.html: prüft den Kartenladen —
   stündliches Angebot (7 Slots + Deal), Kauf (Ryo↓, Slot VERKAUFT, Karte in Sammlung),
   Verkauf doppelter Karten, Pack-Öffnung (5 Karten im Modal), Theme-Kauf + Aktivierung,
   Countdown. Ausgabe: SHOP|OK/FAIL|... */
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
  playerName: 'Kaze', story: { introDone: true, flags: {}, progress: 1 }, wins: {}, music: false,
  ryo: 5000, collection: { konohamaru_rivale: 3, naruto_genin: 1, gamabunta_koenig: 1 }
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
<script src="../js/shop.js"></script>
<script src="../js/main.js"></script>
<script>
window.addEventListener('load', function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));
  function finish(status, info) {
    const res = document.createElement('div');
    res.id = 'probe-result';
    res.textContent = 'SHOP|' + status + '|info=' + (info || '') +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  setTimeout(() => {
    try {
      if (!NTCG.ShopUI) return finish('FAIL', 'kein ShopUI');
      NTCG.ShopUI.show();
      if (!$('#scr-shop').classList.contains('active')) return finish('FAIL', 'Shop-Screen nicht aktiv');
      // --- Angebot ---
      const slots = $$('#shop-stock .shop-slot');
      if (slots.length !== 7) return finish('FAIL', 'Slots=' + slots.length);
      if (!$('#shop-stock .shop-deal-tag')) return finish('FAIL', 'kein Sonderangebot-Tag');
      if ($('#shop-ryo').textContent.indexOf('5000') < 0) return finish('FAIL', 'Ryo-Anzeige: ' + $('#shop-ryo').textContent);
      if (!$('#shop-countdown').textContent.match(/Angebot in \\d+:\\d+/)) return finish('FAIL', 'Countdown: ' + $('#shop-countdown').textContent);
      // --- Kaufen ---
      const buy0 = slots[0].querySelector('.shop-buy');
      const price = parseInt(buy0.textContent.replace(/\\D+/g, ''), 10);
      if (!(price > 0)) return finish('FAIL', 'Preis unlesbar: ' + buy0.textContent);
      buy0.click();
      const ryoAfterBuy = NTCG.Store.data.ryo;
      if (ryoAfterBuy !== 5000 - price) return finish('FAIL', 'Ryo nach Kauf: ' + ryoAfterBuy + ' (erwartet ' + (5000 - price) + ')');
      if (!$$('#shop-stock .shop-slot')[0].classList.contains('sold')) return finish('FAIL', 'Slot nicht VERKAUFT');
      // --- Verkaufen ---
      const sellSlots = $$('#shop-sell .shop-slot');
      if (!sellSlots.length) return finish('FAIL', 'keine Verkaufs-Karten (konohamaru_rivale×3 geseeded)');
      const kono = sellSlots.find((w) => ((w.querySelector('.c-name') || {}).textContent || '').indexOf('Konohamaru') >= 0);
      if (!kono) return finish('FAIL', 'Konohamaru-Rivale nicht im Verkaufs-Grid');
      kono.querySelector('.shop-buy').click();
      if (NTCG.Store.data.collection.konohamaru_rivale !== 2) return finish('FAIL', 'Verkauf: konohamaru_rivale=' + NTCG.Store.data.collection.konohamaru_rivale);
      if (NTCG.Store.data.ryo !== ryoAfterBuy + 10) return finish('FAIL', 'Ryo nach Verkauf: ' + NTCG.Store.data.ryo);
      // --- Pack öffnen ---
      const before = Object.values(NTCG.Store.data.collection).reduce((a, b) => a + b, 0);
      const packBtns = $$('#shop-packs .shop-row .shop-buy');
      if (packBtns.length !== 3) return finish('FAIL', 'Pack-Zeilen=' + packBtns.length);
      packBtns[0].click(); // Chakra-Booster
      const opened = $$('#modal .pack-open-grid .g-card');
      if (opened.length !== 5) return finish('FAIL', 'Pack-Öffnung: ' + opened.length + ' Karten');
      const after = Object.values(NTCG.Store.data.collection).reduce((a, b) => a + b, 0);
      if (after !== before + 5) return finish('FAIL', 'Pack-Karten nicht in Sammlung: ' + before + '→' + after);
      $$('#modal-body .btn').find((b) => b.textContent.indexOf('Inventar') >= 0).click();
      if (!$('#modal').classList.contains('hidden')) return finish('FAIL', 'Pack-Modal blieb offen');
      // --- Theme kaufen + aktivieren ---
      const rows = $$('#shop-themes .shop-row');
      if (rows.length !== 5) return finish('FAIL', 'Theme-Zeilen=' + rows.length);
      const nacht = rows.find((r) => r.textContent.indexOf('Sternennacht') >= 0);
      nacht.querySelector('.shop-buy').click();
      if (NTCG.Store.data.theme !== 'nacht') return finish('FAIL', 'Theme nicht aktiv: ' + NTCG.Store.data.theme);
      if (NTCG.Store.data.themes.indexOf('nacht') < 0) return finish('FAIL', 'Theme nicht im Besitz');
      const nachtBtn = $$('#shop-themes .shop-row').find((r) => r.textContent.indexOf('Sternennacht') >= 0).querySelector('.shop-buy');
      if (nachtBtn.textContent.indexOf('Aktiv') < 0) return finish('FAIL', 'Theme-Button: ' + nachtBtn.textContent);
      finish('OK', 'angebot+kauf+verkauf+pack+theme');
    } catch (e) { finish('EXCEPTION', e.message); }
  }, 300);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>shop-probe</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'shop.gen.html'), out);
console.log('shop.gen.html gebaut (' + out.length + ' Bytes)');
