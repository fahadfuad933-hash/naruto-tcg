# NARUTO TGC — Story-Modus „Echo der Shinobi" (Konzept & Umsetzungsplan)

## 1. Die Story

**Prämisse:** Jahr 2143. Die Ninja-Dörfer der alten Welt sind seit tausend Jahren Legende.
Aus ihrer Asche wuchs **Neo-Konoha** — eine Megacity aus Glas, Neon und Chakra-Technik.
Die Shinobi von einst leben als **Geister in den Chakra-Karten** weiter: Duellanten der
Zukunft rufen Naruto, Sasuke & Co. als holografische Kampf-Projektionen aufs Feld.
Auf dem verwitterten Hokage-Stein steht eine **Prophezeiung**:

> *„Wenn der Stern der alten Ära fällt, erwacht in der Stadt aus Licht ein Duellant,
> in dem die Chakra-Ströme beider Zeiten fließen. Er allein kann den Riss zwischen
> den Welten schließen — oder das Echo für immer verstummen lassen."*

Der Spieler ist dieser Duellant (Name frei wählbar). Mentor-Figur: **Meister Iruka**
(Akademie-Lehrer — passt zu Gegner Nr. 1 im Spiel). Bester Freund: **Kaito**.

### Sequenz-Ablauf

**S0 — Intro (6 Bilder, je 1–2 Zeilen Text, Typewriter, skippbar pro Szene)**

| # | Bild | Text (Einblendung) |
|---|------|--------------------|
| 1 | Neo-Konoha bei Nacht | „Das Jahr 2143. Aus der Asche der alten Ninja-Dörfer wuchs Neo-Konoha — eine Stadt aus Glas, Licht und Chakra." |
| 2 | Zwei Zukunfts-Duellanten auf einer Sky-Arena | „Die Shinobi von einst sind Legende. Ihr Wille lebt weiter — in den Chakra-Karten der Duellanten." |
| 3 | Geister-Clash: Rasengan vs. Chidori als Hologramme | „Wer die Karten führt, ruft die Geister der Vergangenheit — Rasengan gegen Chidori, wie vor tausend Jahren." |
| 4 | Hokage-Stein mit glühenden Runen, fallender Stern | „Doch der alte Stein trägt eine Prophezeiung: ‚Wenn der Stern der alten Ära fällt, erwacht ein Duellant, in dem beide Zeiten fließen.'" |
| 5 | Riss am Himmel zwischen den Epochen | „In jener Nacht riss der Himmel auf. Die Grenze zwischen den Epochen begann zu bröckeln." |
| 6 | Glühende Karte über einer Hand im dunklen Zimmer | „Und irgendwo in der Stadt aus Licht … öffnet jemand die Augen." |

**S1 — Namensgebung:** Text „Wie lautet dein Name, Duellant?" + Eingabefeld (2–12 Zeichen,
Vorschlag: „Kaze"). Wird in `NT.Store` als `playerName` gespeichert und überall im Spiel
statt „Du" verwendet (Duell-HUD, Dialoge).

**S2 — Kaito ruft (Dialog-Szene, Kaito groß im Querformat, Typewriter, Tap = weiter, Auswahlen)**

> **Kaito:** „{name}! ENDLICH wach! Weißt du, wie spät es ist?"
> **Kaito:** „Die Aufnahmeprüfung der Akademie beginnt in zwanzig Minuten!"

- **Wahl 1:**
  - „Wie bitte?! Ich bin sofort fertig!" → Kaito: „Das sagst du jeden Morgen. Haha! Hier, dein Deck — ich hab's eingepackt." *(Flag: `gift=true`, `kaito+1`)*
  - „Entspann dich. Ein Duellant kommt nie zu spät." → Kaito: „Kakashi-Nachmache, huh? Dann beeil dich wenigstens." *(Flag: `kaito±0`)*
  - „Noch fünf Minuten …" → Kaito: „FÜNF MINUTEN?! Ich zähle bis drei. EINS …" *(Flag: `kaito-1`)*

> **Kaito:** „Heute bekommst du dein erstes echtes Chakra-Deck der Akademie. Meister Iruka wartet im Prüfungssaal."

- **Wahl 2:**
  - „Ich bin bereit. Iruka wird staunen." → Kaito: „Selbstbewusst! Gefällt mir."
  - „Und wenn ich versage?" → Kaito: „Dann üben wir bis morgen früh. Zusammen. Deal?"
  - „Erst Ramen, dann Prüfung." → Kaito: „Danach bist du tot. Wörtlich. Lauf!"

> **Kaito:** „Ach so — {name}. Die ganze Stadt redet über die Prophezeiung. Deine Hand …
> sie hat geglüht, während du geschlafen hast. Denk drüber nach, aber erst NACH der Prüfung!"

→ Erstes Objective: **„Geh zur Akademie"** (Übergang zur Map, kommt später).

**Flag-Wirkung (bewusst minimal):** `kaito`-Wert ändert spätere Dialogzeilen (freundlich/
neutral/genervt), `gift=true` kann später 1 Bonus-Karte geben. Kein Story-Fork.

---

## 2. Umsetzungsplan (passt zur Codebase: Vanilla JS, Screens in index.html)

1. **Assets:** Ordner `assets/story/` — Bilder als JPG, Querformat ~1536×1024, je < 200 KB.
   Fallback: fehlt ein Bild, rendert der Player einen CSS-Verlauf + Titel (Entwicklung
   blockiert nicht, bis die Bilder fertig sind).
2. **`js/story.js` (neu, IIFE `NT.Story`):** Szenen als Daten-Array
   (`{id, img, lines:[{speaker, text}], choices:[{label, reply, setFlag, goto}]}`),
   Player mit Typewriter (30 Zeichen/s), Tap = Zeile sofort komplett / nächste Zeile,
   Skip-Button = ganze Sequenz überspringen, Antwort-Buttons setzen Flags via `NT.Store`.
3. **`index.html`:** ein generischer Screen `#scr-story` (Vollbild-Layer, Letterbox-Balken,
   Subtitle-Box, Choice-Buttons, Skip-Button, Namens-Input) — deckt S0–S2 ab.
4. **`css/style.css`:** Story-Styles (Cinematic-Bars, Fade zwischen Bildern, Tipp-Cursor,
   Choice-Pills). Querformat zuerst, Portrait = Letterbox.
5. **`js/main.js`:** Boot-Kette beim ersten Start: `save.story.introDone` falsch →
   S0 → S1 → S2 → `introDone=true` → Menü. Zusätzlich Menü-Button „Story" zum erneut Ansehen.
   `NT.Store` erweitern: `playerName`, `story:{introDone, flags, progress}` —
   Defaults beim Laden nachrüsten (bestehender Spielstand `ntcg_save_v1` bleibt kompatibel).
6. **`js/music.js` (neu, `NT.Music.play(track)`):** Tracks `intro|dialog|duel|menu|sieg`.
   Variante A (empfohlen für den Anfang): prozedurale WebAudio-Loops (offline, 0 MB,
   nutzt bestehende audio.js-Infrastruktur). Variante B: MP3s aus Suno in
   `assets/music/` + `<audio loop>` — API bleibt gleich.
7. **Tests:** domcheck erfasst neue IDs automatisch; Story-Flow per `mkreveal`-Muster
   (`.gen.html` + Headless-Chrome) testbar.

**Map (UMGESETZT):** Screen `#scr-map` mit Bild `10-map.jpg` als Vollbild-Hintergrund,
Stationen als pulsierende Marker (Prozent-Koordinaten in `STATIONS`, js/map.js).
`story.progress` steuert Freischaltung und Objective-Banner. Details in Abschnitt 6.

---

## 3. Bild-Prompts (für ChatGPT / GPT-4o, MAPPA-Stil)

**Dateinamen** (so speichern, als JPG in `assets/story/`): `01-neo-konoha.jpg`,
`02-duellanten.jpg`, `03-geister-clash.jpg`, `04-prophezeiung.jpg`, `05-riss.jpg`,
`06-karte.jpg`, `07-aufwachen.jpg`, `08-kaito.jpg`, `09-akademie.jpg`, `10-map.jpg`.
Charakterbögen liegen als `ref-protagonist.png` / `ref-kaito.png` im selben Ordner.

**Wichtig für Konsistenz:** Zuerst Prompt 0a/0b (Charakterbögen) erzeugen, dann in demselben
Chat bei jeder Szene schreiben: „derselbe Junge/dasselbe Mädchen wie im vorherigen Bild".
Stil-Anker an jeden Prompt anhängen:

> Stil: moderner MAPPA-Anime-Look (wie Jujutsu Kaisen): cineastische Beleuchtung,
> dynamische Perspektive, detaillierte Hintergründe, leichtes Filmkorn, kräftige
> Neonfarben auf tiefem Nachtblau, cel-shaded Charaktere. Querformat (wide shot).

**0a — Charakterbogen Spieler:**
„Anime-Charakterbogen eines 15-jährigen Duellanten, geschlechtsneutral lesbar: kurze
dunkle Haare mit einer einzelnen leuchtend orangen Strähne, schmale neonbesetzte Jacke
über einem Hoodie mit Spiral-Emblem, am Unterarm ein Holster für Karten. Drei Ansichten
(Front, Seite, Portrait), neutraler Hintergrund. MAPPA-Anime-Stil, clean lineart."

**0b — Charakterbogen Kaito (bester Freund):**
„Anime-Charakterbogen eines frechen 15-jährigen Jungen: blonde Stachelhaare, Schutzbrille
auf der Stirn, oversized Neon-Jacke, Hoverboard unter dem Arm, breites Grinsen.
Drei Ansichten, neutraler Hintergrund, MAPPA-Anime-Stil."

**1 — Neo-Konoha:** „Futuristische japanische Megacity bei Nacht: Wolkenkratzer mit
holografischen Kanji-Reklamen, fliegende Laternen, eine riesige Version des Hokage-Felsens
als leuchtende Projektion am Himmel, Regen + Neonreflexe. Kein Mensch im Fokus, wide
establishing shot. MAPPA-Stil."

**2 — Duellanten der Zukunft:** „Zwei Duellanten in neonbesetzten Jacken stehen sich auf
einer Sky-Arena über der Stadt gegenüber, Karten in den Händen, zwischen ihnen entfaltet
sich ein holografisches Spielfeld aus Licht. Dynamische Low-Angle-Perspektive, Regen,
Spannung. MAPPA-Stil."

**3 — Geister-Clash:** „Über der Arena: zwei riesige, halbtransparente Chakra-Geister —
ein Ninja in Orange mit wirbelnder blauer Energiekugel (Rasengan) gegen einen Ninja in
Blau mit blitzender Hand (Chidori), Aufprall in der Bildmitte, Lichtexplosion. Episch,
motion blur, MAPPA-Stil."

**4 — Prophezeiung:** „Uralter bröckelnder Steinmonolith in einem ruhigen Tempelhof,
eingeritzte Runen glühen orange, am Nachthimmel über der Stadt fällt ein einzelner
greller Stern. Mystisch, stille Spannung, Volumenlicht. MAPPA-Stil."

**5 — Der Riss:** „Der Nachthimmel über der Megacity reißt wie Glas auf: durch den
leuchtenden Spalt sieht man eine alte Ninja-Welt (Wälder, Holz-Dächer, Vollmond), auf
der Stadtseite Neon und Flugvehikel. Zwei Silhouettengruppen stehen sich gegenüber.
Surreal, gewaltig, MAPPA-Stil."

**6 — Die Karte:** „Nahaufnahme in einem dunklen Zimmer: eine einzelne Spielkarte schwebt
über der geöffneten Hand eines Jugendlichen, die Karte glüht orange-blau, Spiral-Symbol
sichtbar, Staubpartikel im Lichtkegel. Intim, magisch, MAPPA-Stil."

**7 — Aufwachen:** „Kleines futuristisches Apartment am Morgen: der Junge (Charakterbogen!)
richtet sich verschlafen im Futon auf, Morgenlicht durch Jalousien, Hologramm-Wecker
blinkt rot, Karten-Deck auf dem Nachttisch, vor dem Fenster die Neon-Stadt bei Tag.
Warm-kühl Kontrast, MAPPA-Stil."

**8 — Kaito ruft (Dialog-Hintergrund, wichtigste Szene):** „Kaito (Charakterbogen!) schwebt
mit seinem Hoverboard vor dem offenen Fenster des Apartments, ruft herein, eine Hand als
Sprachrohr am Mund, Grinsen, Morgensonne hinter ihm, Stadt im Hintergrund. Kaito groß im
rechten Bilddrittel, links Platz für Untertitel-Box. MAPPA-Stil, Querformat."

**9 — Akademie:** „Die Chakra-Akademie von Neo-Konoha: Mischung aus alter japanischer
Tempelarchitektur und Glas-Stahl-Turm, Spiral-Emblem über dem Tor, Schüler mit
Karten-Holstern laufen die Treppe hoch, Tageslicht. MAPPA-Stil."

**10 — Map-Hintergrund (später):** „Stilisierte Vogelperspektive-Karte von Neo-Konoha als
Anime-Illustration: markante Orte (Akademie, Ramen-Gasse, Trainingsfeld, Arena,
Hokage-Turm, der Riss am Himmel) als kleine detaillierte Landmarken, dezente Wege
dazwischen, leicht abgedunkelte Ränder. MAPPA-Stil, clean genug für UI-Icons darüber."

---

## 4. Musik (GENERIERT per ElevenLabs-MCP, liegt in `assets/music/`)

Vier Loop-Tracks (MP3 128 kbps, instrumental) — erzeugt mit `generate_music` (music_v1),
Prompts jeweils „…instrumental, seamless loop, no vocals":

| Datei | Einsatz | Prompt-Kern |
|---|---|---|
| `intro.mp3` (75 s) | Intro-Slides | Cinematic anime opening, Taiko × Synthwave-Orchester, Shakuhachi, 95 BPM, episch-melancholisch |
| `menu.mp3` (90 s) | Dauer-Background (Menü, Map, Dialoge) | Ambient Synth-Pads, fernes Piano, japanischer Garten in der Dämmerung, 60 BPM |
| `duel.mp3` (90 s) | Duell-Standard (wählbar) | Drum & Bass × Rock, aggressive Taiko, Shakuhachi-Riff, 150 BPM |
| `duel2.mp3` (90 s) | Duell-Alternative (wählbar) | Melodischer Anime-Rock, Gitarre × Shamisen, heroisch, 120 BPM |
| `duel3.mp3` (90 s) | Duell-Alternative (wählbar) | Lo-fi Hip-Hop × Koto, ruhiger Fokus, 90 BPM |
| `duel4.mp3` (90 s) | Duell-Alternative (wählbar) | Synthwave × Shamisen-Plucks, Neon-Drive, 105 BPM |
| `boss.mp3` (90 s) | Boss-Duelle (`opp.boss === true`: Kurogane, Itachi) | Dunkles Boss-Thema, Kriegs-Taiko, verzerrter Synth-Bass, Chor-Stabs, 140 BPM |

`js/music.js` spielt fehlende Dateien still nicht ab; Wechsel mit kurzem Fade-out.
Neue/andere Tracks: `node ~/.kimi-code/mcp/elevenlabs-audio/server.js --music --prompt "…" --out assets/music/<name>.mp3 --length 90000`
(oder MCP-Tool `mcp__elevenlabs-audio__generate_music` in neuen Sessions). SFX-Tool `generate_sfx` ist vorbereitet — das Spiel nutzt aktuell noch WebAudio-Synth-SFX aus `js/audio.js`.

---

## 5. Offene Punkte / Entscheidungen

- Sprachausgabe gibt es nicht — Typewriter + kurze Zeilen (max. ~70 Zeichen) halten das Tempo.
- Protagonist bewusst namens-/optik-neutral (Charakterbogen), damit jeder eingegebene Name passt.
- Musik: MP3s per ElevenLabs-MCP generiert — `assets/music/{intro,menu,duel,boss}.mp3`
  liegen fertig im Projekt; `js/music.js` spielt sie, fehlende Dateien werden still übersprungen.

---

## 6. Kapitel 1 + Map-System (UMGESETZT)

### Progress-Leiter (`Store.data.story.progress`, aus Siegen abgeleitet)

| progress | Bedeutung | Objective-Banner |
|---|---|---|
| 0 | Intro noch nicht gesehen | (Titel) |
| 1 | Intro-Kette durch | „Geh zur Akademie — die Aufnahmeprüfung wartet!" |
| 2 | Kap. 1 (Iruka besiegt) | „Kaito wartet in der Ramen-Gai!" |
| 3 | Kotei besiegt | „Trainingsfelder: Bestehe Ayas Prüfungskampf!" |
| 4 | Aya besiegt | „Arena: Fordere Champion Kurogane heraus!" |
| 5 | Kurogane besiegt | „Der Kagā-Turm lädt dich ein — bestehe Shizukas Eignungsprüfung!" |
| 6 | Shizuka besiegt | „Kagā-Turm: Das Echo-Archiv — Sicherheitschef Raiga wartet!" |
| 7 | Raiga besiegt | „BOSS: Direktor Kagā an der Spitze — baue dein bestes Deck!" |
| 8 | Kagā besiegt | „Echo-Champion! Der Riss schläft … Kapitel 4 folgt bald …" |

### Stationen (js/map.js `STATIONS`)

| Station | Frei ab | Story (Kapitel) | Freie Kämpfe (Farm) |
|---|---|---|---|
| 🏫 Akademie | progress 1 | **Kap. 1** vs. Iruka (★2) | Iruka-Rematch (N) |
| 🍜 Ramen-Gai | progress 2 | **Kap. 2** vs. Kotei (★1) | Kotei-Rematch (N) |
| 🥋 Trainingsfelder | progress 2 | **Kap. 2** vs. Aya (★4, ab progress 3) | Genji ★2 (2×N) → Aya ★4 (2×R) → Daigo ★6 (1×SR), Leiter über Siege |
| 🏟️ Arena | progress 4 | **Kap. 2 BOSS** vs. Kurogane (★7) | Kurogane-Rematch (SR) |
| 🏢 Kagā-Turm | progress 5 | **Kap. 3** vs. Shizuka (★5) → Raiga (★7) → **BOSS Kagā (★8)** | Rematches aller drei (R/R/SR) |
| 🗼 Hokage-Turm | — | „Bald" (Kap. 4) | — |

**Prinzip:** Story-Duelle entstehen **in den Szenen** (Kapitel-Kette: Szene → Duell →
Siegesszene), die Map-Stationen zeigen das verfügbare Kapitel pulsierend an. Freie
Kämpfe dienen dem Farmen, wenn die Story gerade nichts Neues hergibt. Kurogane (★7,
UR-Deck) ist der erste „Wall": Aya schickt einen explizit zu Daigo (SR-Farm), bevor
die Arena freischaltet.

### Kapitel 1 — „Die Aufnahmeprüfung" (bis zum ersten Gegner)

**S3 — Ankunft (`k1_anreise`, Dialog, Bild `09-akademie.jpg`):**

> *(Erzähler):* Neo-Konoha, Akademie-Bezirk. Dein Herz klopft bis zum Hals.
> **Kaito:** Da wären wir! Der Prüfungssaal ist ganz oben. Und {name} … atmen nicht vergessen.
> **Iruka:** {name}. Pünktlich — das schätzt man an einem Duellanten. Ich bin Meister Iruka.
> **Iruka:** Die Prüfung ist ein Speed-Duell: 8000 LP, drei Zonen. Keine Tricks — nur du und dein Deck.

- **Wahl:**
  - „Ich bin bereit, Sensei." → **Iruka:** „Gut. Dann zeig mir, dass du dein Deck fühlst — nicht nur spielst." *(Flag `iruka+1`)*
  - „Und wenn ich verliere?" → **Iruka:** „Dann lernst du. Niederlagen sind der ehrlichste Sensei, {name}."
  - „Nur 8000 LP? Kurzes Duell." → **Kaito:** „Haha! Den Spruch zahlst du bar zurück, wenn du auf die Nase fliegst." *(Flag `kaito+1`)*

> **Iruka:** Nimm Platz. Mische dein Deck. Die Karten entscheiden — möge dein Chakra mit ihnen sprechen.
> *(Erzähler):* — Prüfungsduell: Besiege Meister Iruka! —

**Duell:** Meister Iruka (★2, eigenes Story-Deck `iruka_story`).
Erst-Sieg-Belohnung: **Schattendoppelgänger + Chidori**.

**S4 — Sieg (`k1_sieg`, Dialog, Bild `12-pruefung.jpg`):**

> **Iruka:** Genug — das Duell ist entschieden. Du bestehst, {name}. Herzlichen Glückwunsch.
> **Iruka:** Dein Chakra hat auf die Karten reagiert … so etwas steht nur in den alten Aufzeichnungen.
> **Kaito:** WAR DAS EIN FINISH! Okay — Trainingsfelder, sofort. Da warten richtige Gegner auf dich!
> **Iruka:** Trainiere fleißig. Und {name} — falls die Prophezeiung dich meint, wird Neo-Konoha es bald erfahren.
> *(Erzähler):* — Kapitel 1 abgeschlossen! Neue Stationen: Trainingsfelder · Ramen-Gai · Arena —

**Niederlage:** zurück zur Karte + Hinweis (Deck umbauen / erst üben). Kapitel ist wiederholbar.

### Kapitel 2 — „Der Champion der Arena" (UMGESETZT, js/story.js)

Drei Kapitel-Ketten, Duelle ergeben sich aus den Szenen:

1. **`k2_ramen` → Duell Kotei → `k2_ramen_sieg`** (Bild `14-ramen.jpg`): Kotei fordert
   den Frischling ums Rechnung-Zahlen heraus; Teuchi bemerkt das Glühen der Karten und
   erwähnt erstmals die Arena und die Kagā-Corp.
2. **`k2_training` → Duell Aya → `k2_training_sieg`** (Bild `13-trainingsfelder.jpg`):
   Aya glaubt „nicht an Überraschungen" und prüft den Spieler, bevor die Arena ihn lässt;
   nach dem Sieg warnt sie vor Kuroganes UR-Deck und schickt einen zu Meister Daigo (SR-Farm).
3. **`k2_arena` → BOSS-Duell Kurogane → `k2_arena_sieg`** (Bild `15-kurogane.jpg`):
   Arenaspektakel; Kurogane warnt nach seiner Niederlage: Die Corp sammelt Karten, die
   auf den Riss reagieren — Karten wie die des Spielers. Cliffhanger Richtung Kagā-Turm.

**Musik-Einstellungen (Hauptmenü, 2×2-Grid):** Ton an/aus, Musik an/aus, Duell-Track-Wahl
(`duel` „Chakra Clash" / `duel2` „Ninja-Anthem" / `duel3` „Fokus-Beat" / `duel4`
„Neon-Drive" — gespeichert als `Store.data.duelTrack`, Boss kämpft immer zu `boss`),
Lautstärke-Stufen 15/30/50/75 % (`Store.data.musicVol`, Default 30 %).

### Übungsmodus (Hauptmenü)

Der bisherige „Duell starten"-Pfad heißt jetzt **Übungsduell**: die 6 Hologramm-Gegner
(Iruka … Itachi) bleiben inkl. Freischalt-Kette und Erst-Sieg-Belohnung, aber
Wiederholungssiege geben nur noch **1 zufällige N-Karte** — die dicken Belohnungen
wandern in den Story-Modus.

### Neue Bilder (ALLE GENERIERT per Nano-Banana-2-MCP, liegen in `assets/story/`)

**11 — Prüfungssaal (`11-pruefungssaal.jpg`, EINGEBAUT in `k1_anreise`):** „Holografischer Duell-Tisch in einem
rundem Prüfungssaal der Akademie: Mischung aus Tempel-Holz und Glas, blaues
Spielfeld-Hologramm zwischen zwei leeren Spielerpositionen, Schüler-Silhouetten auf
Rängen, Scheinwerferkegel. Niemand im Fokus, wide shot. MAPPA-Stil."

**12 — Sieg gegen Iruka (`12-pruefung.jpg`, EINGEBAUT in `k1_sieg`, mit Referenzbögen generiert):** „Ein freundlicher Sensei um die 30
mit hohem Pferdeschwanz und Stirnband (futuristische Iruka-Anspielung: olivgrüne
Weste über Tech-Stoff) reicht dem Jungen (Charakterbogen!) über den holografischen
Duell-Tisch die Hand, holografische Karten verglühen als Lichtpartikel, warmes
Saal-Licht, Kaito jubelt unscharf im Hintergrund. MAPPA-Stil, Querformat."

**13 — Trainingsfelder (`13-trainingsfelder.jpg`, generiert — für Kapitel 2+):** „Weitläufige Trainingsfelder bei Tag: Holzpfähle,
Zielscheiben, Klettergerüste zwischen Beton und Grünflächen, junge Duellanten trainieren
mit Karten-Hologrammen, Skyline von Neo-Konoha im Hintergrund. MAPPA-Stil."

**14 — Ramen-Gai (`14-ramen.jpg`, generiert — für Kapitel 2+):** „Enge, warme Neon-Gasse bei Nacht: rote Laternen,
Dampf über einem kleinen Ramen-Stand, der Koch (kräftig, Stirntuch) winkt lachend,
holografische Speisekarte flackert. Gemütlich, MAPPA-Stil."

**15 — Arena-Champion Kurogane (`15-kurogane.jpg`, generiert — für Kapitel 2):** „Düsterer Champion auf einer
runden Neon-Arena: hochgewachsene Gestalt in schwarz-verchromter Rüstung mit
Kagā-Corp-Logo, halb Gesicht halb Visier, Karten-Fächer in der Hand, rote
Spotlight-Kegel, tosende Hologramm-Menge. Bedrohlich, MAPPA-Stil."

---

## 7. Kapitel 3 — „Der Kagā-Turm" (UMGESETZT)

Direkte Fortsetzung von Kuroganes Warnung: Die Corp lädt den neuen Champion ein.
Drei Kapitel-Ketten an einer Station (Kagā-Turm, frei ab progress 5):

1. **`k3_empfang` → Duell Shizuka (★5) → `k3_empfang_sieg`** (Bild `16-kagaa-turm.jpg`):
   Empfangsdame Shizuka verlangt eine „Eignungsprüfung". Erst-Sieg: **Kamui + Schöpfungs-Jutsu**.
2. **`k3_archiv` → Duell Raiga (★7) → `k3_archiv_sieg`** (Bild `17-echo-archiv.jpg`):
   Das Echo-Archiv (Karten in Containment-Zylindern); Direktor Kagā will die Karten
   kaufen, Spieler lehnt ab → Sicherheitschef Raiga greift an. Erst-Sieg: **Kisame + Samehada**.
3. **`k3_direktor` → BOSS Kagā (★8) → `k3_ende`** (Bilder `18-direktor.jpg`, `19-riss-ende.jpg`):
   Finales Angebot, dann Boss-Duell mit UR-Deck + 2× Konter-Falle (Fūin Gyaku) + Edo Tensei.
   Erst-Sieg: **Naruto (Sennin) + Jiraiya + Fūin Gyaku**. Ende: Der Riss beruhigt sich —
   Cliffhanger Richtung Kapitel 4 (Hokage-Turm bleibt „bald").

**Balancing (KI-vs-KI-Sims, Winrate gefarmtes Deck):** Shizuka ~60 % (machbar nach Kurogane),
Raiga ~37 % (Wall — Deck umbauen nötig), Kagā ~40–60 % je nach Deck (UR-Brics sterben,
durchdachte Decks gewinnen).

### Dialog-Upgrade: Sprecher-Porträts (UMGESETZT)

Dialogzeilen mit `who` zeigen ein Taillen-Porträt (`talk-<name>.jpg`, 2:3, 768 px hoch),
das den Spieler direkt ansieht — Element `#story-face` rechts unten, Fade/Slide beim
Sprecherwechsel, Erzählerzeilen blenden es aus. Mapping in story.js `TALK`
(Kaito/Iruka/Aya/Kotei/Teuchi/Kurogane/Shizuka/Raiga/Kagā). Generiert per
`tools/genk3.sh` (Prompts dort; Kaito/Kurogane/Iruka/Aya/Kotei mit Referenzbildern
für Konsistenz). Die drei neuen Gegner nutzen ihr Talk-Bild auch als Duell-Avatar
(`NT.OPP_AVATAR_IMG` → `assets/story/talk-*.jpg`).

**16 — Kagā-Turm (`16-kagaa-turm.jpg`):** „Schwarzer Glas-Wolkenkratzer der Corp bei Nacht,
Holo-Reklame, Flugvehikel-Lichtspuren, bedrohlich-elegant, Low-Angle."
**17 — Echo-Archiv (`17-echo-archiv.jpg`):** „Dunkle Halle, hunderte Karten in Glaszylindern
mit orangem Glühen, Catwalks, zwei Teenager-Silhouetten (Protagonist + Kaito als refs)."
**18 — Direktor (`18-direktor.jpg`):** „Chefetage mit Fensterfront über der Neon-Stadt,
Riss am Himmel, silberhaariger Direktor in schwarzem Anzug mit glühenden Silberlinien."
**19 — Riss-Ende (`19-riss-ende.jpg`):** „Der Riss über der Stadt beruhigt sich,
Karten-Partikel steigen auf, hoffnungsvoller Epilog."

### Bugfix nebenbei: sp_summon_hand Index-Shift

`activateSpell` entfernte das Jutsu aus der Hand, bevor `resolveSpell` den Ziel-Index
las — lag das Ziel hinter dem Jutsu, crashte/verzog sich `selectHandIdx` (betraf
Kuchiyose). Fix in engine.js (Index dekrementieren wenn `selectHandIdx > handIdx`),
Regressionstests in `test/fx.js` (45 Checks).

---

## 8. Kapitel 4 — „Der Riss erwacht" (UMGESETZT, Finale)

Wochen nach Kagās Fall reißt der Himmel erneut auf — größer als je zuvor. Der
Hokage-Turm (Station frei ab **progress 8**) leuchtet, das Tor öffnet sich.
Drei Kapitel-Ketten an einer Station:

1. **`k4_ruf` → Duell Monolith (★7) → `k4_waechter_sieg`** (Bild `20-hokage-turm.jpg`):
   Der Echo-Wächter aus Steinplatten (runen-glühend) prüft, ob der Spieler den Turm
   betreten darf. Defensiv-Deck (Erde/Wasser, Gaara/Sasori/Tsunade) mit Biss
   (Amaterasu/Katon). Erst-Sieg: **Sasuke (Susanoo) + Edo Tensei**.
2. **`k4_stimmen` → Duell Die Stimme des Risses (★8) → `k4_stimmen_sieg`** (Bild
   `21-riss-kammer.jpg`): Die Kammer der Prophezeiung — der Chor zweier Zeiten
   (Geist aus Karten und Nebel) verlangt den Beweis des Willens. Finsternis-/
   Kontroll-Deck, nutzt **Rinnegan**. Erst-Sieg: **Hashirama + Sasori**
   (sasori war vorher unerreichbar!).
3. **`k4_kern` → FINAL-BOSS Das Dunkle Echo (★9) → `k4_ende`** (Bilder
   `22-echo-kern.jpg`, `23-epilog.jpg`): Der Riss nimmt die Gestalt des Spielers an —
   das dunkle Spiegelbild kennt „jeden Trick". UR-Spiegel-Deck mit den neuen Karten
   (Sasuke (Susanoo), Rasen-Shuriken, Rinnegan). Erst-Sieg: **Rinnegan +
   Rasen-Shuriken + Fūin Gyaku**. Epilog: Der Riss schließt sich, die Prophezeiung
   ist erfüllt — „ENDE" + Hinweis aufs Sammeln/Farmen.

**Neue Karten (4, alle UR, nur existierende Effekttypen):** `sasuke_susanoo`
(St.8, 2900/2400, destroy_weakest+piercing), `hashirama` (St.8, 2800/2600,
token+aura_def 400), `rinnegan` (Jutsu, `control` — der Effekttyp existierte in
Engine & KI, war aber auf keiner Karte), `rasenshuriken` (Jutsu,
destroy_any+500). Kartenbilder: 3× Wiki (fetchcards-ID-Filter), rinnegan per
gemini-image-MCP (Wiki lieferte SVG-Platzhalter).

**Neue Bilder (per Nano-Banana-2-MCP, `assets/story/`):**
- `20-hokage-turm.jpg` (Pagode × Neon, Runen-Sockel, Riss darüber; refs Protagonist+Kaito)
- `21-riss-kammer.jpg` (schwebender Prophezeiungs-Stein über Lichtbecken; refs)
- `22-echo-kern.jpg` (Spiegel-Ebene im Riss, dunkler Zwilling auf Felsfragment; ref Protagonist)
- `23-epilog.jpg` (geschlossener Himmel im Morgengrauen, Karten-Partikel)
- Talk-Porträts: `talk-monolith.jpg` (Stein-Wächter), `talk-stimme.jpg`
  (Karten-Nebel-Chor), `talk-echo.jpg` (dunkler Zwilling des Protagonisten,
  generiert mit `ref-protagonist.png`). `TALK`-Map in story.js erweitert
  (Monolith / Stimme / Dunkles Echo); Duell-Avatare via `OPP_AVATAR_IMG`.

**Balancing (KI-vs-KI, Endgame-Deck `LATE` in test/balance.js):** Wächter ~66 %
(gate, kein Wall), Stimme ~59 %, Dunkles Echo ~38 % (Zielband 35–45 %,
vergleichbar mit Kagā bei höherer difficulty). `Gefarmt vs Echo` ~45 %.
**Fortschritt:** `effProgress()` 9=Monolith, 10=Stimme, 11=ENDE; Objective-Texte
bis „Die Prophezeiung ist erfüllt!". Erfolg `beat_echo` (UR) hinzugefügt
(13 Erfolge). Probe `test/mkmap.js` deckt die komplette K4-Kette ab.
