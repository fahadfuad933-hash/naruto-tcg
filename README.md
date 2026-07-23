# 🍥 NARUTO TGC — Chakra-Duell

Ein komplettes Naruto-Kartenspiel im Stil von **Yu-Gi-Oh! Duel Links** (Speed-Duel-Regeln),
optimiert für Smartphones. Reine Web-App — keine Installation, kein Internet nötig.

## ▶️ Starten

**Am PC:** `index.html` doppelklicken (öffnet sich im Browser).

**Auf dem Smartphone** — drei Wege:

1. **OneDrive:** Der Ordner liegt in OneDrive → am Handy in der OneDrive-App
   `index.html` öffnen → im Browser starten.
2. **Lokales WLAN:** Am PC im Ordner `npx serve .` (oder `python -m http.server 8000`)
   ausführen → am Handy `http://<PC-IP>:8000` öffnen (gleiches WLAN).
3. Dateien per USB/Cloud aufs Handy kopieren und `index.html` im Browser öffnen.

Tipp: Im Handy-Browser „Zum Startbildschirm hinzufügen" → fühlt sich an wie eine App.

## 🎮 Spielregeln (wie Duel Links)

- **8000 LP**, Deck aus 20–30 Karten, Starthand 4 Karten.
- Zug: Ziehen → Hauptphase 1 → **Kampfphase** → Hauptphase 2 → Ende.
- **1 Normalbeschwörung** pro Zug: Stufe 1–4 frei, Stufe 5–6 = 1 Tribut, Stufe 7+ = 2 Tribute.
- 3 Ninja-Zonen, 3 Jutsu/Fallen-Zonen pro Seite.
- Fallen müssen 1 Zug gesetzt liegen, bevor sie auslösen.
- **Elementvorteil** im Kampf: +300 ANG (Feuer>Wind>Blitz>Erde>Wasser>Feuer, Licht↔Finsternis).
- **6 Übungsgegner** (Iruka → … → Itachi) mit steigendem Schwierigkeitsgrad.
- **Story-Modus „Echo der Shinobi"** (Stadt-Map, Kapitel 1–4 komplett):
  Aufnahmeprüfung → Ramen-Gai → Trainingsfelder → Arena → Kagā-Turm → Hokage-Turm (Finale).
  Farm-Kämpfe an jeder Station für Karten aller Raritäten (N → UR).
- Eigener **Deck-Editor** (mehrere Decks, Auto-Fill, Filter & Suche),
  **Erfolge** mit Karten-Belohnungen, **Statistik**, **Spielstand-Backup** (Export/Import).
  Fortschritt wird lokal gespeichert (localStorage).

## 🃏 Inhalt

- **95 Karten**: Ninja (Naruto, Sasuke, Kakashi, Itachi, die Sannin, Hashirama …), Jutsu
  (Rasengan, Chidori, Kuchiyose, Shinra Tensei, Rinnegan, Rasen-Shuriken …) und
  Fallen (Papierbombe, Kawarimi, Fūin Gyaku …).
- Karteneffekte, Tributbeschwörung, Flip-Effekte, Ausrüstungen, Schnell-Jutsu im Kampf,
  Durchdringungsschaden, KI mit Fallen-Timing in 3 Stufen (basic/smart/genius).
- Komplett generierte Bilder & Musik (Anime-Stil), Talk-Porträts in Dialogen.

## 🛠️ Technik / Tests

Vanilla HTML/CSS/JS, keine Abhängigkeiten, läuft offline (`file://` tauglich).
Als **PWA** installierbar (Service Worker cached alles), wenn über einen Server ausgeliefert.

```
node test/sim.js 300      # Engine-Test: 300 KI-vs-KI-Duelle
node test/fx.js           # 61 Effekt-Unit-Tests
node test/ai.js           # KI-Verhaltens-Tests
node test/balance.js 100  # Winrate-Messung Spieler vs NPCs
node test/domcheck.js     # HTML/JS-ID-Abgleich
node test/mksmoke.js      # baut Browser-Rauchtest (smoke.gen.html)
# + Headless-Proben: mkstory mkmap mkreveal mkwin mklog mkhit mkdeck mkstats
```
