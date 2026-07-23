/* Baut test/map.gen.html: testet die Stadt-Map — Stationen/Freischaltung,
   Kapitel-Kette (Szenen → Duelle), Farm-Kämpfe, Arena-Gate, Musik-Einstellungen.
   Ausgabe: MAP|OK/FAIL|... */
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
// Spielstand vorbereiten: Intro gesehen, Fortschritt 1
localStorage.setItem('ntcg_save_v1', JSON.stringify({
  playerName: 'Kaze', story: { introDone: true, flags: {}, progress: 1 }, wins: {}, sound: false, music: false
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
  const $$ = (s) => document.querySelectorAll(s);
  const steps = [];
  const ok = (name, cond) => steps.push((cond ? 'OK' : 'FAIL') + ' ' + name);
  const bgImgs = () => ($('#story-bg-a').style.backgroundImage + $('#story-bg-b').style.backgroundImage);
  // STATIONS-Reihenfolge: 0 Akademie, 1 Ramen, 2 Training, 3 Arena, 4 Hokage, 5 Kagaa
  const station = (i) => $$('.map-station')[i];
  const encTexts = () => Array.from($$('.map-enc')).map((b) => b.textContent).join(' | ');
  const obj = () => $('#map-objective').textContent;
  function surrenderBack() { // Duell aufgeben und zur Karte
    $('#btn-surrender').click();
    const yes = Array.from($('#modal-body').querySelectorAll('button')).find((b) => b.textContent.indexOf('Ja') >= 0);
    yes.click();
    setTimeout(function () {
      const back = Array.from($('#modal-body').querySelectorAll('button')).find((b) => b.textContent.indexOf('Karte') >= 0);
      back.click();
    }, 900);
  }
  function finish() {
    const res = document.createElement('div');
    res.id = 'map-result';
    const fails = steps.filter((s) => s.indexOf('FAIL') === 0).length;
    res.textContent = 'MAP|' + (fails || window.__errors.length ? 'FAIL' : 'OK') + '|' + steps.join(' , ') +
      '|errors=' + (window.__errors.length ? window.__errors.join(' ;; ') : 'none');
    document.body.appendChild(res);
  }
  setTimeout(function () {
    try {
      $('#scr-title').click();
      ok('Menue aktiv', $('#scr-menu').classList.contains('active'));
      ok('Track-Button: Chakra Clash', $('#btn-duelmusic').textContent.indexOf('Chakra Clash') >= 0);
      $('#btn-duelmusic').click();
      ok('Trackwechsel: Ninja-Anthem', $('#btn-duelmusic').textContent.indexOf('Ninja-Anthem') >= 0);
      ok('duelTrack gespeichert', (JSON.parse(localStorage.getItem('ntcg_save_v1')).duelTrack === 'duel2'));
      $('#btn-musicvol').click();
      ok('Lautstaerke 50%', $('#btn-musicvol').textContent.indexOf('50') >= 0);
      $('#btn-map').click();
      ok('Map aktiv', $('#scr-map').classList.contains('active'));
      ok('7 Stationen', $$('.map-station').length === 7);
      ok('Objective: Akademie', obj().indexOf('Akademie') >= 0);
      ok('Akademie pulsiert', station(0).classList.contains('pulse'));
      ok('Training gesperrt', station(2).classList.contains('locked'));
      ok('Arena gesperrt (Gate 4)', station(3).classList.contains('locked'));
    } catch (e) { window.__errors.push('t1: ' + e.message); }
  }, 900);
  setTimeout(function () {
    try {
      station(0).click();
      ok('Kapitel 1 im Panel', encTexts().indexOf('Aufnahmeprüfung') >= 0);
      $$('.map-enc')[0].click();
      ok('K1-Szene: Akademie-Bild', bgImgs().indexOf('09-akademie') >= 0);
      $('#story-skip').click();
      ok('Duell vs Iruka', $('#scr-duel').classList.contains('active') && $('#opp-name').textContent.indexOf('Iruka') >= 0);
      surrenderBack();
    } catch (e) { window.__errors.push('t2: ' + e.message); }
  }, 1800);
  setTimeout(function () {
    try {
      ok('Map nach Niederlage', $('#scr-map').classList.contains('active'));
      ok('Fortschritt bleibt', obj().indexOf('Akademie') >= 0);
      // Sieg gegen Iruka simulieren -> Fortschritt 2
      NTCG.Store.recordWin('iruka_story', { chidori: 1 });
      NTCG.Map.show();
      ok('Objective: Ramen', obj().indexOf('Ramen') >= 0);
      ok('Ramen offen', !station(1).classList.contains('locked'));
      ok('Training offen', !station(2).classList.contains('locked'));
      ok('Arena weiterhin gesperrt', station(3).classList.contains('locked'));
    } catch (e) { window.__errors.push('t3: ' + e.message); }
  }, 4200);
  setTimeout(function () {
    try {
      station(2).click(); // Trainingsfelder: nur Genji-Farm (Aya-Kapitel braucht Fortschritt 3)
      ok('Farm: Genji sichtbar', encTexts().indexOf('Genji') >= 0);
      ok('Aya noch nicht da', encTexts().indexOf('Aya') < 0);
      $('#map-panel-close').click();
      station(1).click(); // Ramen: Kapitel 2
      ok('Kapitel 2 im Panel', encTexts().indexOf('Raufbold') >= 0);
      $$('.map-enc')[0].click();
      ok('K2-Szene: Ramen-Bild', bgImgs().indexOf('14-ramen') >= 0);
      $('#story-skip').click();
      ok('Duell vs Kotei', $('#opp-name').textContent.indexOf('Kotei') >= 0);
      surrenderBack();
    } catch (e) { window.__errors.push('t4: ' + e.message); }
  }, 5200);
  setTimeout(function () {
    try {
      NTCG.Store.recordWin('ramen_kotei', { choji: 1 });
      NTCG.Map.show();
      ok('Objective: Aya', obj().indexOf('Aya') >= 0);
      station(2).click();
      ok('Kapitel 3 (Aya) im Panel', encTexts().indexOf('Prüfungskampf') >= 0);
      ok('Farm Genji weiter da', encTexts().indexOf('Genji') >= 0);
      $$('.map-enc')[0].click(); // Kapitel-Eintrag steht oben
      ok('K3-Szene: Trainings-Bild', bgImgs().indexOf('13-trainingsfelder') >= 0);
      $('#story-skip').click();
      ok('Duell vs Aya', $('#opp-name').textContent.indexOf('Aya') >= 0);
      surrenderBack();
    } catch (e) { window.__errors.push('t5: ' + e.message); }
  }, 7800);
  setTimeout(function () {
    try {
      NTCG.Store.recordWin('chunin_trainer', { lee: 1 });
      NTCG.Map.show();
      ok('Objective: Kurogane', obj().indexOf('Kurogane') >= 0);
      ok('Arena jetzt offen', !station(3).classList.contains('locked'));
      station(3).click();
      ok('Boss-Kapitel im Panel', encTexts().indexOf('Champion') >= 0);
      ok('Farm Daigo frei (Aya-Sieg)', (function(){ station(2).click(); return encTexts().indexOf('Daigo') >= 0; })());
      $('#map-panel-close').click();
    } catch (e) { window.__errors.push('t6: ' + e.message); }
  }, 10400);
  setTimeout(function () {
    try {
      // Kurogane-Sieg -> Kapitel 3: Kagā-Turm frei
      NTCG.Store.recordWin('kurogane', { pain: 1 });
      NTCG.Map.show();
      ok('Objective: Shizuka', obj().indexOf('Shizuka') >= 0);
      ok('Kagā-Turm offen (Gate 5)', !station(5).classList.contains('locked'));
      ok('Hokage gesperrt (Gate 8)', station(4).classList.contains('locked'));
      station(5).click();
      ok('K3-Kapitel im Panel', encTexts().indexOf('Kagā-Turm') >= 0);
      $$('.map-enc')[0].click();
      ok('K3-Szene: Turm-Bild', bgImgs().indexOf('16-kagaa-turm') >= 0);
      $('#scr-story').click(); // Typewriter Zeile 1 (Erzähler) fertig
      $('#scr-story').click(); // weiter zu Kaito-Zeile
      ok('Talk-Porträt gesetzt', $('#story-face-img').src.indexOf('talk-kaito') >= 0);
      $('#story-skip').click();
      ok('Duell vs Shizuka', $('#opp-name').textContent.indexOf('Shizuka') >= 0);
      surrenderBack();
    } catch (e) { window.__errors.push('t7: ' + e.message); }
  }, 11600);
  setTimeout(function () {
    try {
      NTCG.Store.recordWin('kagaa_shizuka', { kamui: 1 });
      NTCG.Map.show();
      ok('Objective: Raiga', obj().indexOf('Raiga') >= 0);
      station(5).click();
      ok('K3-Archiv-Kapitel im Panel', encTexts().indexOf('Echo-Archiv') >= 0);
      ok('Farm: Shizuka-Rematch', encTexts().indexOf('Shizuka') >= 0 && encTexts().indexOf('Deck-Beute') >= 0);
      NTCG.Store.recordWin('kagaa_raiga', { kisame: 1 });
      NTCG.Map.show();
      ok('Objective: Direktor', obj().indexOf('Direktor') >= 0);
      NTCG.Store.recordWin('kagaa_kagaa', { jiraiya: 1 });
      NTCG.Map.show();
      ok('Objective: Riss zurück (K4)', obj().indexOf('Riss ist zurück') >= 0);
      ok('Hokage offen (Gate 8)', !station(4).classList.contains('locked'));
      station(5).click();
      ok('Farm: Kagā-Rematch (UR)', encTexts().indexOf('UR-Beute') >= 0);
      $('#map-panel-close').click();
    } catch (e) { window.__errors.push('t8: ' + e.message); }
  }, 14200);
  setTimeout(function () {
    try {
      // Kapitel 4: Hokage-Turm → Wächter → Stimme → Dunkles Echo
      station(4).click();
      ok('K4-Kapitel im Panel', encTexts().indexOf('Ruf des Steins') >= 0);
      $$('.map-enc')[0].click();
      ok('K4-Szene: Turm-Bild', bgImgs().indexOf('20-hokage-turm') >= 0);
      $('#story-skip').click();
      ok('Duell vs Monolith', $('#opp-name').textContent.indexOf('Monolith') >= 0);
      surrenderBack();
    } catch (e) { window.__errors.push('t9: ' + e.message); }
  }, 16800);
  setTimeout(function () {
    try {
      NTCG.Store.recordWin('echo_waechter', { sasuke_susanoo: 1 });
      NTCG.Map.show();
      ok('Objective: Stimme', obj().indexOf('Stimme des Risses') >= 0);
      station(4).click();
      ok('K4-Stimmen-Kapitel im Panel', encTexts().indexOf('Die Stimmen') >= 0);
      ok('Farm: Wächter-Rematch', encTexts().indexOf('Monolith') >= 0);
      NTCG.Store.recordWin('riss_stimme', { hashirama: 1 });
      NTCG.Map.show();
      ok('Objective: FINALE', obj().indexOf('FINALE') >= 0);
      NTCG.Store.recordWin('echo_spiegel', { rinnegan: 1 });
      NTCG.Map.show();
      ok('Objective: Prophezeiung erfüllt', obj().indexOf('Prophezeiung ist erfüllt') >= 0);
      station(4).click();
      ok('Farm: Echo-Rematch (UR)', encTexts().indexOf('Dunkle Echo') >= 0 && encTexts().indexOf('UR-Beute') >= 0);
    } catch (e) { window.__errors.push('t10: ' + e.message); }
  }, 19400);
  setTimeout(function () {
    try {
      // Weltwechsel: Shinobi-Ära nach Echo-Sieg freigeschaltet
      ok('Welt-Button: Shinobi-Ära', $('#map-world').textContent.indexOf('Shinobi-Ära') >= 0);
      $('#map-world').click();
      ok('Zeitreise-Intro startet', $('#scr-story').classList.contains('active'));
      ok('Intro-Slide 1 (Frieden)', bgImgs().indexOf('23-epilog') >= 0);
      $('#story-skip').click(); // Slides → Ankunft-Dialog
      ok('Ankunft: Konoha der Vergangenheit', bgImgs().indexOf('32-konoha-past') >= 0);
      $('#story-skip').click(); // Dialog fertig → Map
    } catch (e) { window.__errors.push('t11: ' + e.message); }
  }, 21600);
  setTimeout(function () {
    try {
      ok('Map aktiv (Vergangenheit)', $('#scr-map').classList.contains('active'));
      ok('Welt past gespeichert', JSON.parse(localStorage.getItem('ntcg_save_v1')).world === 'past');
      ok('Objective: Schriftrolle', obj().indexOf('Schriftrolle') >= 0);
      ok('7 Stationen (Vergangenheit)', $$('.map-station').length === 7);
      ok('Akademie pulsiert (Vergangenheit)', station(0).classList.contains('pulse'));
      ok('Brücke gesperrt (Gate 2)', station(1).classList.contains('locked'));
      ok('Map-Hintergrund Welt 2', $('#map-inner').classList.contains('world-past'));
      station(0).click();
      ok('Kapitel 5 im Panel', encTexts().indexOf('Schriftrolle') >= 0);
      $$('.map-enc')[0].click();
      ok('K5-Szene: Mizuki-Nacht', bgImgs().indexOf('38-mizuki-nacht') >= 0);
      $('#story-skip').click();
      ok('Duell vs Mizuki', $('#opp-name').textContent.indexOf('Mizuki') >= 0);
      surrenderBack();
    } catch (e) { window.__errors.push('t12: ' + e.message); }
  }, 22800);
  setTimeout(function () {
    try {
      NTCG.Store.recordWin('mizuki_story', { shukaku: 1 });
      NTCG.Map.show();
      ok('Objective: Brücke', obj().indexOf('Brücke') >= 0);
      ok('Brücke jetzt offen', !station(1).classList.contains('locked'));
      station(1).click();
      ok('Kapitel 6 im Panel', encTexts().indexOf('Spiegel aus Eis') >= 0);
      $('#map-panel-close').click();
      station(0).click();
      ok('Farm: Mizuki-Rematch', encTexts().indexOf('Mizuki') >= 0 && encTexts().indexOf('Beute') >= 0);
      $('#map-panel-close').click();
      $('#map-world').click(); // zurück nach Neo-Konoha
      ok('Zurück in Neo-Konoha', obj().indexOf('Prophezeiung ist erfüllt') >= 0 && !$('#map-inner').classList.contains('world-past'));
      ok('Welt-Button wieder: Shinobi-Ära', $('#map-world').textContent.indexOf('Shinobi-Ära') >= 0);
    } catch (e) { window.__errors.push('t13: ' + e.message); }
  }, 25200);
  setTimeout(finish, 26600);
});
<\/script>`;

const out = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="stylesheet" href="../css/style.css">\n<title>map-probe</title>\n</head>\n<body>\n' + body + test + '\n</body>\n</html>';
fs.writeFileSync(path.join(__dirname, 'map.gen.html'), out);
console.log('map.gen.html gebaut (' + out.length + ' Bytes)');
