/* ============================================================
   NARUTO TGC — Story-Modus „Echo der Shinobi"
   Szenen-Player: Bildfolgen mit Typewriter-Untertiteln,
   überspringbar, Namenseingabe, Dialog mit Antwort-Flags.
   ============================================================ */
(function (g) {
  const NT = g.NTCG;
  const $ = (s) => document.querySelector(s);
  const IMG = 'assets/story/';

  /* ================= Szenen-Daten ================= */
  const SCENES = {
    intro: {
      type: 'slides',
      slides: [
        { img: '01-neo-konoha.jpg', text: 'Das Jahr 2143. Aus der Asche der alten Ninja-Dörfer wuchs Neo-Konoha — eine Stadt aus Glas, Licht und Chakra.' },
        { img: '02-duellanten.jpg', text: 'Die Shinobi von einst sind Legende. Ihr Wille lebt weiter — in den Chakra-Karten der Duellanten.' },
        { img: '03-geister-clash.jpg', text: 'Wer die Karten führt, ruft die Geister der Vergangenheit — Rasengan gegen Chidori, wie vor tausend Jahren.' },
        { img: '04-prophezeiung.jpg', music: 'tension', text: 'Doch der alte Stein trägt eine Prophezeiung: „Wenn der Stern der alten Ära fällt, erwacht ein Duellant, in dem beide Zeiten fließen.“' },
        { img: '05-riss.jpg', music: 'tension', text: 'In jener Nacht riss der Himmel auf. Die Grenze zwischen den Epochen begann zu bröckeln.' },
        { img: '06-karte.jpg', music: 'tension', text: 'Und irgendwo in der Stadt aus Licht … öffnet jemand die Augen.' },
      ],
      next: 'name',
    },
    name: { type: 'name', img: '07-aufwachen.jpg', next: 'kaito' },
    kaito: {
      type: 'dialog',
      img: '08-kaito.jpg',
      script: [
        { who: 'Kaito', text: '{name}! ENDLICH wach! Weißt du, wie spät es ist?' },
        { who: 'Kaito', text: 'Die Aufnahmeprüfung der Akademie beginnt in zwanzig Minuten!' },
        { choices: [
          { label: '„Wie bitte?! Ich bin sofort fertig!"', reply: 'Das sagst du jeden Morgen. Haha! Hier, dein Deck — ich hab’s eingepackt.', flags: { kaito: 1, gift: true } },
          { label: '„Entspann dich. Ein Duellant kommt nie zu spät."', reply: 'Kakashi-Nachmache, huh? Dann beeil dich wenigstens.', flags: { kaito: 0 } },
          { label: '„Noch fünf Minuten …"', reply: 'FÜNF MINUTEN?! Ich zähle bis drei. EINS …', flags: { kaito: -1 } },
        ] },
        { who: 'Kaito', text: 'Heute bekommst du dein erstes echtes Chakra-Deck der Akademie. Meister Iruka wartet im Prüfungssaal.' },
        { choices: [
          { label: '„Ich bin bereit. Iruka wird staunen."', reply: 'Selbstbewusst! Gefällt mir.', flags: { kaito: 1 } },
          { label: '„Und wenn ich versage?"', reply: 'Dann üben wir bis morgen früh. Zusammen. Deal?', flags: {} },
          { label: '„Erst Ramen, dann Prüfung."', reply: 'Danach bist du tot. Wörtlich. Lauf!', flags: {} },
        ] },
        { who: 'Kaito', text: 'Ach so — {name}. Die ganze Stadt redet über die Prophezeiung. Deine Hand … sie hat geglüht, während du geschlafen hast.' },
        { who: 'Kaito', text: 'Aber denk erst NACH der Prüfung darüber nach. Also los — Akademie, oberster Stock!' },
        { who: '', text: '— Ziel: Erreiche rechtzeitig die Akademie! —' },
      ],
      next: null,
    },

    /* ================= Kapitel 1 — Die Aufnahmeprüfung ================= */
    k1_anreise: {
      type: 'dialog',
      img: '09-akademie.jpg',
      script: [
        { who: '', text: 'Neo-Konoha, Akademie-Bezirk. Dein Herz klopft bis zum Hals.' },
        { who: 'Kaito', text: 'Da wären wir! Der Prüfungssaal ist ganz oben. Und {name} … Atmen nicht vergessen.' },
        { who: 'Iruka', img: '11-pruefungssaal.jpg', text: '{name}. Pünktlich — das schätzt man an einem Duellanten. Ich bin Meister Iruka.' },
        { who: 'Iruka', text: 'Die Prüfung ist ein Speed-Duell: 8000 LP, drei Zonen. Keine Tricks — nur du und dein Deck.' },
        { choices: [
          { label: '„Ich bin bereit, Sensei."', replyWho: 'Iruka', reply: 'Gut. Dann zeig mir, dass du dein Deck FÜHLST — nicht nur spielst.', flags: { iruka: 1 } },
          { label: '„Und wenn ich verliere?"', replyWho: 'Iruka', reply: 'Dann lernst du. Niederlagen sind der ehrlichste Sensei, {name}.', flags: {} },
          { label: '„Nur 8000 LP? Kurzes Duell."', replyWho: 'Kaito', reply: 'Haha! Den Spruch zahlst du bar zurück, wenn du auf die Nase fliegst.', flags: { kaito: 1 } },
        ] },
        { who: 'Iruka', text: 'Nimm Platz. Mische dein Deck. Die Karten entscheiden — möge dein Chakra mit ihnen sprechen.' },
        { who: '', text: '— Prüfungsduell: Besiege Meister Iruka! —' },
      ],
      next: null,
    },
    k1_sieg: {
      type: 'dialog',
      img: '12-pruefung.jpg',
      script: [
        { who: 'Iruka', text: 'Genug — das Duell ist entschieden. Du bestehst, {name}. Herzlichen Glückwunsch.' },
        { who: 'Iruka', text: 'Dein Chakra hat auf die Karten reagiert … so etwas steht nur in den alten Aufzeichnungen.' },
        { who: 'Kaito', text: 'WAR DAS EIN FINISH! Okay — Trainingsfelder, sofort. Da warten richtige Gegner auf dich!' },
        { who: 'Iruka', text: 'Trainiere fleißig. Und {name} — falls die Prophezeiung dich meint, wird Neo-Konoha es bald erfahren.' },
        { who: '', text: '— Kapitel 1 abgeschlossen! Neu: Trainingsfelder · Ramen-Gai · Arena —' },
      ],
      next: null,
    },

    /* ================= Kapitel 2 — Der Champion der Arena ================= */
    k2_ramen: {
      type: 'dialog',
      img: '14-ramen.jpg',
      script: [
        { who: '', text: 'Ramen-Gai, Abenddämmerung. Der beste Trost nach einer Prüfung dampft in Schüsseln.' },
        { who: 'Kaito', text: 'Zwei Miso Deluxe, Teuchi! — {name}, seit deiner Prüfung redet die ganze Akademie über dich.' },
        { who: 'Kotei', text: 'He, Frischling! Du hast Iruka geschlagen? Ich, Kotei, bin der ungeschlagene Ramen-Champion dieser Gasse!' },
        { who: 'Teuchi', text: 'Kotei, du hast gestern gegen eine Mülltonne verloren …' },
        { who: 'Kotei', text: 'DIE HAT GEKÄMPFT WIE EIN JONIN! Egal — Frischling! Duell! Der Verlierer zahlt die Rechnung!' },
        { choices: [
          { label: '„Dein letztes Duell vor dem Zahlen."', replyWho: 'Kotei', reply: 'Große Klappe! Ich mag das. AUF GEHT’S!', flags: { kaito: 1 } },
          { label: '„Gewinnst du, zahl ich doppelt."', replyWho: 'Kotei', reply: 'HA! Ein Geschäftsmann! Gefällt mir — verlieren tut er trotzdem!', flags: {} },
          { label: '„Ich wollte nur Ramen …"', replyWho: 'Kaito', reply: 'Zu spät. Er beißt fest. Wie die Narutomaki.', flags: {} },
        ] },
        { who: '', text: '— Straßenduell: Besiege Kotei! —' },
      ],
      next: null,
    },
    k2_ramen_sieg: {
      type: 'dialog',
      img: '14-ramen.jpg',
      script: [
        { who: 'Kotei', text: 'Ugh … meine Ehre … mein Geldbeutel … Teuchi, schreib’s auf meinen Deckel.' },
        { who: 'Teuchi', text: 'Haha! Für dich geht’s aufs Haus, {name}. Sag mal — deine Karten haben vorhin kurz GEGLÜHT, oder?' },
        { who: 'Kaito', text: 'Bei Iruka haben sie auch geflackert. {name}, das ist kein Zufall mehr. Das ist die Prophezeiung.' },
        { who: 'Teuchi', text: 'Wollt ihr stärker werden? Die Arena. Champion Kurogane sucht Herausforderer für ein Turnier der Kagā-Corp.' },
        { who: '', text: '— Neu: Prüfungskampf auf den Trainingsfeldern! —' },
      ],
      next: null,
    },
    k2_training: {
      type: 'dialog',
      img: '13-trainingsfelder.jpg',
      script: [
        { who: '', text: 'Trainingsfelder, nächster Morgen. Trainerin Aya mustert dich wie eine Zielscheibe.' },
        { who: 'Aya', text: 'Du bist also der Neue, der Iruka überrascht hat. Ich bin Aya — und ich glaube nicht an Überraschungen.' },
        { who: 'Aya', text: 'Die Kagā-Corp öffnet die Arena für Herausforderer. Bevor du auch nur daran DENKST: Du kämpfst gegen MICH.' },
        { choices: [
          { label: '„Wenn ich gewinne, trainierst du mich?"', replyWho: 'Aya', reply: 'Mutig. Gewinn erst mal.', flags: {} },
          { label: '„Keine Angst vor Trainerinnen."', replyWho: 'Aya', reply: 'Gut. Angst wäre beim Verlieren auch nur unbequem.', flags: { kaito: 1 } },
          { label: '„Kann Kaito mitkämpfen?"', replyWho: 'Kaito', reply: 'HEY! Lass mich da raus!', flags: {} },
        ] },
        { who: 'Aya', text: 'Regeln wie immer: 8000 LP. Zeig mir, was die Prophezeiung in dir sieht.' },
        { who: '', text: '— Prüfungskampf: Besiege Trainerin Aya! —' },
      ],
      next: null,
    },
    k2_training_sieg: {
      type: 'dialog',
      img: '13-trainingsfelder.jpg',
      script: [
        { who: 'Aya', text: 'Genug. Du bestehst — und ich hasse Überraschungen immer noch. Aber die mochte ich.' },
        { who: 'Aya', text: 'Kurogane ist anders als alles, was du kennst. Seine vertrauten Geister rufen sich gegenseitig — Frösche, älter als dieser Turm. Trainiere bei Meister Daigo, BEVOR du ihn herausforderst.' },
        { who: 'Kaito', text: 'Daigo?! Der Jonin-Trainer?! … Wir kommen wieder, Aya. Danke!' },
        { who: '', text: '— Neu: Die Arena wartet! Tipp: Siegreiche Gegner droppen Karten aus ihrem eigenen Deck — beim ersten Sieg sind die Chancen am besten! —' },
      ],
      next: null,
    },
    k2_arena: {
      type: 'dialog',
      music: 'tension',
      img: '25-arena.jpg',
      script: [
        { who: '', text: 'Die Arena der Kagā-Corp. Hunderttausend Hologramm-Fans. Und in der Mitte: ER.' },
        { who: 'Kurogane', img: '15-kurogane.jpg', text: 'Ein neuer Herausforderer. Sag mir deinen Namen, damit die Arena ihn vergessen kann.' },
        { who: 'Kurogane', text: 'Ich bin Kurogane — Champion dieser Arena, Klinge der Kagā-Corp. Dein Chakra flackert … interessant.' },
        { choices: [
          { label: '„Dieses Flackern wird dich besiegen."', replyWho: 'Kurogane', reply: 'Ha. Komm.', flags: {} },
          { label: '„Warum kämpfst du für die Corp?"', replyWho: 'Kurogane', reply: 'Weil die Welt nur den Stärksten gehört. Beweise mir das Gegenteil.', flags: {} },
          { label: '„Die Prophezeiung kennt meinen Namen."', replyWho: 'Kurogane', reply: 'Prophezeiungen sind Karten, die Verlierer spielen.', flags: {} },
        ] },
        { who: 'Kurogane', text: 'Arena — erhebe das Duellfeld! {name}, zeig mir dein Echo!' },
        { who: '', text: '— BOSS-KAMPF: Besiege Champion Kurogane! —' },
      ],
      next: null,
    },
    k2_arena_sieg: {
      type: 'dialog',
      music: 'hope',
      img: '15-kurogane.jpg',
      script: [
        { who: 'Kurogane', text: '… Die Arena hat entschieden. Champion {name}. Nimm den Titel — und eine Warnung.' },
        { who: 'Kurogane', text: 'Die Kagā-Corp sammelt Karten, die auf den Riss reagieren. Karten wie DEINE. Sie werden kommen.' },
        { who: 'Kaito', text: '{name} … hat er gerade gedroht oder gewarnt? Bei dem hört sich beides gleich an!' },
        { who: 'Kurogane', text: 'Trainiere. Wenn der Turm ruft, musst du bereit sein. — Das Echo der Shinobi ist erwacht.' },
        { who: '', img: '25-arena.jpg', text: '— Kapitel 2 abgeschlossen! Du bist Arena-Champion! —' },
      ],
      next: null,
    },

    /* ================= Kapitel 3 — Der Kagā-Turm ================= */
    k3_empfang: {
      type: 'dialog',
      img: '16-kagaa-turm.jpg',
      script: [
        { who: '', text: 'Der Kagā-Turm — höchstes Gebäude von Neo-Konoha. Schwarzes Glas, das jeden Blitz schluckt.' },
        { who: 'Kaito', text: 'Okay, {name}. Die Corp lädt den neuen Arena-Champion PERSÖNLICH ein. Findest du das auch nur ein bisschen gruselig?' },
        { who: 'Shizuka', text: 'Willkommen im Kagā-Turm, Champion {name}. Ich bin Shizuka — Empfang, Sicherheit und … Vorauswahl.' },
        { who: 'Shizuka', text: 'Der Direktor erwartet dich. Aber das Protokoll verlangt eine Eignungsprüfung. Ein Duell. Hier und jetzt.' },
        { who: 'Kaito', text: 'Ein Duell als TÜRSTEHERIN?! {name}, die spinnen, die Corp — sag ihr das!' },
        { choices: [
          { label: '„Dann mal los. Prüf mich."', replyWho: 'Shizuka', reply: 'Direkt. Das wird dem Direktor gefallen … oder missfallen.', flags: {} },
          { label: '„Und wenn ich ablehne?"', replyWho: 'Shizuka', reply: 'Dann bleibt der Turm für immer verschlossen. Kurogane hätte das bedauert.', flags: {} },
          { label: '„Kaito, halt meine Jacke."', replyWho: 'Kaito', reply: 'DU KRIEGST KEINE JACKE ZURÜCK, WENN DU VERLIERT! … Viel Glück.', flags: { kaito: 1 } },
        ] },
        { who: 'Shizuka', text: 'Regeln kennt der Champion: 8000 LP. Zeig mir, dass Kuroganes Niederlage kein Betriebsunfall war.' },
        { who: '', text: '— Eignungsprüfung: Besiege Shizuka! —' },
      ],
      next: null,
    },
    k3_empfang_sieg: {
      type: 'dialog',
      img: '16-kagaa-turm.jpg',
      script: [
        { who: 'Shizuka', text: '… Prüfung bestanden. Ausgezeichnete Werte. Der Direktor wird zufrieden sein — oder alarmiert.' },
        { who: 'Kaito', text: 'Sag mal, lächelt die gerade STOLZ?! Corp-Leute sind echt kaputt, {name}.' },
        { who: 'Shizuka', text: 'Der Aufzug zur obersten Etage. Ab hier geht es allein weiter, {name} — dein Freund wartet in der Lobby.' },
        { who: 'Kaito', text: 'WAS?! {name}, ich lass dich nicht allein zu diesem Kagā-Typen! … Okay, doch. Aber nur, weil du stärker bist.' },
        { who: '', text: '— Die oberste Etage wartet: das Echo-Archiv. —' },
      ],
      next: null,
    },
    k3_archiv: {
      type: 'dialog',
      music: 'tension',
      img: '17-echo-archiv.jpg',
      script: [
        { who: '', text: 'Das Echo-Archiv. Hunderte Karten schweben in Glaszylindern — und JEDE glüht schwach, sobald du näher kommst.' },
        { who: 'Direktor Kagā', text: 'Faszinierend, nicht wahr? Karten, die auf den Riss reagieren. Relikte zweier Zeiten. Meine Sammlung.' },
        { who: 'Direktor Kagā', text: 'Ich bin Direktor Kagā. Diese Stadt steht auf Chakra — und das Chakra steht unter MEINEM Turm.' },
        { who: 'Direktor Kagā', text: 'Deine Karten glühen stärker als alle anderen, {name}. Darum: Verkauf sie mir. Preis ist egal. Oder …' },
        { choices: [
          { label: '„Meine Karten sind nicht zu verkaufen."', replyWho: 'Direktor Kagā', reply: 'Dann lerne, was der Turm mit Sturköpfen macht. Raiga!', flags: {} },
          { label: '„Was hat es mit dem Riss auf sich?"', replyWho: 'Direktor Kagā', reply: 'Wissen hat seinen Preis. Raiga — zeig ihm, wie hoch.', flags: {} },
          { label: '„Kurogane hat mich vor euch gewarnt."', replyWho: 'Direktor Kagā', reply: 'Kurogane war mein bestes Produkt. Bis du ihn beschädigt hast. Raiga!', flags: {} },
        ] },
        { who: 'Raiga', text: 'Direktor. — {name}. Ich bin Raiga, Sicherheitschef. Dein Widerstand endet hier. Kein Protokoll mehr.' },
        { who: 'Raiga', text: 'Ich habe gesehen, wie du Shizuka geschlagen hast. Ich bin nicht Shizuka. Erhebe dein Deck!' },
        { who: '', text: '— Sicherheitschef: Besiege Raiga! —' },
      ],
      next: null,
    },
    k3_archiv_sieg: {
      type: 'dialog',
      img: '17-echo-archiv.jpg',
      script: [
        { who: 'Raiga', text: '… Unmöglich. Meine Formation … direkt durchbrochen. Direktor — dieser Champion ist KEIN normaler Duellant.' },
        { who: 'Direktor Kagā', text: 'Genug, Raiga. Wenn Stahl versagt, spricht der Turm selbst. {name} — folge mir zum Duell-Podest.' },
        { who: 'Direktor Kagā', text: 'Das Archiv flüstert seit deiner Ankunft. Hörst du es? Die Karten … ERWARTEN etwas von dir.' },
        { who: '', text: '— BOSS: Direktor Kagā wartet am Podest! —' },
      ],
      next: null,
    },
    k3_direktor: {
      type: 'dialog',
      music: 'tension',
      img: '18-direktor.jpg',
      script: [
        { who: '', text: 'Oberste Etage. Hinter der Glasfront flackert der Riss am Himmel — und Kagās Deck liegt bereit.' },
        { who: 'Direktor Kagā', text: 'Ein letztes Angebot, {name}: Deine Karten gegen einen Platz an meiner Seite. Die Corp könnte dir gehören.' },
        { choices: [
          { label: '„Ich kämpfe für niemanden außer mir."', replyWho: 'Direktor Kagā', reply: 'Wie Kurogane einst. Ihr lernt es nie. — SEHR GUT. Dann mit voller Kraft!', flags: {} },
          { label: '„Für die Prophezeiung — und gegen dich."', replyWho: 'Direktor Kagā', reply: 'Prophezeiungen sind PR für Ahnungslose. Komm, Echo. Zeig dich!', flags: {} },
          { label: '„Nach dir, Direktor."', replyWho: 'Direktor Kagā', reply: 'Höflich bis zuletzt. Das wird deine Niederlage … erträglich machen.', flags: {} },
        ] },
        { who: 'Direktor Kagā', text: 'Ich habe zwanzig Jahre auf diesen Riss gewartet. Kein Kind mit glühenden Karten nimmt ihn mir!' },
        { who: '', text: '— BOSS-KAMPF: Besiege Direktor Kagā! —' },
      ],
      next: null,
    },
    k3_ende: {
      type: 'dialog',
      music: 'hope',
      img: '19-riss-ende.jpg',
      script: [
        { who: 'Direktor Kagā', text: '… Besiegt. Von einem Kind der Prophezeiung. Das Archiv … es beruhigt sich. Wegen DIR.' },
        { who: 'Direktor Kagā', text: 'Nimm deinen Titel, Echo-Champion. Aber hör gut zu: Der Riss schläft nur. Irgendwann wacht er wieder.' },
        { who: 'Kaito', img: '16-kagaa-turm.jpg', text: '{name}!! Da bist du ja! Ich hab vom Fenster aus alles gesehen — du warst UNGLAUBLICH!' },
        { who: 'Kaito', text: 'Die ganze Stadt redet schon: Der Champion, der den Turm bezwungen hat. NEO-KONOHA GEHÖRT DIR, {name}!' },
        { who: '', text: '— Kapitel 3 abgeschlossen! Der Riss schläft … vorerst. Kapitel 4 folgt bald. —' },
      ],
      next: null,
    },

    /* ================= Kapitel 4 — Der Riss erwacht (Finale) ================= */
    k4_ruf: {
      type: 'dialog',
      music: 'tension',
      img: '20-hokage-turm.jpg',
      script: [
        { who: '', text: 'Wochen nach dem Fall des Direktors. Der Himmel über Neo-Konoha REISST erneut auf — größer als je zuvor.' },
        { who: 'Kaito', text: '{name}! Der Riss — er ist zurück! Und der Hokage-Turm … der TURM LEUCHTET!' },
        { who: 'Iruka', text: 'Der Prophezeiungs-Stein im Turm glüht. Zum ersten Mal seit hundert Jahren öffnet sich das Tor. {name} — es ruft nach dir.' },
        { choices: [
          { label: '„Dann hören wir hin."', replyWho: 'Iruka', reply: 'Ruhig wie Wasser. Der Stein wird dich mögen.', flags: { iruka: 1 } },
          { label: '„Was, wenn ich nicht bereit bin?"', replyWho: 'Kaito', reply: 'Du hast KAGĀ geschlagen! Du bist so bereit, wie man nur sein kann!', flags: { kaito: 1 } },
          { label: '„Zeit, den Riss zu schließen."', replyWho: 'Iruka', reply: 'Die Prophezeiung in einem Satz. Geh — und pass auf dich auf.', flags: {} },
        ] },
        { who: '', text: 'Am Fuß des Turms lösen sich Steinplatten aus der Fassade und formen eine Gestalt — der WÄCHTER.' },
        { who: 'Monolith', img: '27-monolith.jpg', text: 'DUELLANT DER PROPHEZEIUNG. ICH BIN MONOLITH — ECHO DER ERSTEN WACHE. NUR WER MICH BEZWINGT, BETRITTT DEN TURM.' },
        { who: '', text: '— Prüfung des Turms: Besiege den Wächter Monolith! —' },
      ],
      next: null,
    },
    k4_waechter_sieg: {
      type: 'dialog',
      music: 'hope',
      img: '27-monolith.jpg',
      script: [
        { who: 'Monolith', text: '… ANERKANNT. DEIN CHAKRA ANTWORTET DEM STEIN. DER TURM GEHÖRT DIR, DUELLANT.' },
        { who: 'Kaito', text: 'Er verneigt sich! {name}, der steinerne Riese VERNEIGT sich vor dir!' },
        { who: 'Iruka', img: '20-hokage-turm.jpg', text: 'Oben wartet die Kammer der Prophezeiung. Und {name} — hör auf die Stimmen dort oben. Aber folge nur deiner eigenen.' },
        { who: '', text: '— Das Turmtor öffnet sich. Die Kammer der Prophezeiung wartet. —' },
      ],
      next: null,
    },
    k4_stimmen: {
      type: 'dialog',
      music: 'tension',
      img: '21-riss-kammer.jpg',
      script: [
        { who: '', text: 'Die Kammer der Prophezeiung. Der alte Stein schwebt über einem Becken aus Licht — und der Riss darüber FLÜSTERT mit tausend Stimmen.' },
        { who: 'Stimme', text: 'DU KAMST, ECHO-TRÄGER. WIR SIND DIE STIMMEN ZWEIER ZEITEN. WIR SIND DIE KARTEN, DIE DU SPIELTEST.' },
        { who: 'Kaito', text: 'Okay … das ist offiziell das Gruseligste, das ich je gehört hab. Und ich hab Kagā reden gehört!' },
        { who: 'Stimme', text: 'DER RISS LEBT, WEIL DIE ZEITEN NACHEINANDER RUFEN. WILLST DU IHN SCHLIESSEN — BEWEISE, DASS DEIN WILLE STÄRKER IST ALS UNSER CHOR.' },
        { choices: [
          { label: '„Mein Wille steht. Frag mein Deck."', replyWho: 'Stimme', reply: 'DANN ANTWORTE MIT TATEN, NICHT MIT WORTEN.', flags: {} },
          { label: '„Was passiert, wenn ich verliere?"', replyWho: 'Stimme', reply: 'DANN VERSTUMMT DAS ECHO — UND DEINE WELT MIT IHM.', flags: {} },
          { label: '„Kaito — Deck bereit?"', replyWho: 'Kaito', reply: 'Immer! … Okay, DU kämpfst. Ich feuere an. Laut.', flags: { kaito: 1 } },
        ] },
        { who: '', text: '— Besiege die Stimme des Risses! —' },
      ],
      next: null,
    },
    k4_stimmen_sieg: {
      type: 'dialog',
      img: '21-riss-kammer.jpg',
      script: [
        { who: 'Stimme', text: '… STÄRKE. ECHTE STÄRKE. DER CHOR WEICHT ZURÜCK — DOCH DER KERN DES RISSES … ER ZEIGT DIR DEIN EIGENES GESICHT.' },
        { who: '', text: 'Das Lichtbecken gerät in Wallung. Eine Gestalt steigt herauf — DEINE Gestalt.' },
        { who: 'Kaito', text: '{name} … das bist … DU?! Zwei von dir ist definitiv einer zu viel!' },
        { who: 'Kaito', text: 'Hör mir zu: Egal, was das Ding da unten ist — du bist stärker. Das ECHTE du. Immer.' },
        { who: '', text: '— Der Kern des Risses öffnet sich. Das FINALE wartet. —' },
      ],
      next: null,
    },
    k4_kern: {
      type: 'dialog',
      music: 'boss',
      img: '22-echo-kern.jpg',
      script: [
        { who: '', text: 'Das Herz des Risses. Ein Spiegel aus purem Chakra — und davor steht ER: dein dunkles Echo.' },
        { who: 'Dunkles Echo', text: 'Ich bin jede Karte, die du je gezogen hast. Jeder Sieg. Jede Angst. Du kannst den Riss nicht schließen, {name} — denn ICH BIN DER RISS.' },
        { choices: [
          { label: '„Dann schließe ich dich — mit mir."', replyWho: 'Dunkles Echo', reply: 'WORTE EINES STERBLICHEN. ZEIG MIR DEIN DECK.', flags: {} },
          { label: '„Du bist nicht ich. Nur ein Echo."', replyWho: 'Dunkles Echo', reply: 'UND DOCH KENNE ICH JEDEN DEINER TRICKS. JEDEN EINZELNEN.', flags: {} },
          { label: '„Für Neo-Konoha — und die alte Ära!"', replyWho: 'Dunkles Echo', reply: 'PATHETISCH. DIE ÄRA IST TOT. ICH BIN IHR LETZTER ATEMZUG.', flags: {} },
        ] },
        { who: 'Dunkles Echo', text: 'KOMM, DUELLANT DER PROPHEZEIUNG. EIN DUELL — UM BEIDE WELTEN.' },
        { who: '', text: '— FINAL-BOSS: Besiege das Dunkle Echo! —' },
      ],
      next: null,
    },
    k4_ende: {
      type: 'dialog',
      music: 'hope',
      img: '23-epilog.jpg',
      script: [
        { who: 'Dunkles Echo', text: '… BESIEGT. VON MIR SELBST. VIELLEICHT … WAR DIE PROPHEZEIUNG DOCH WAHR. SCHLIESS MICH, DUELLANT. UND DANKE — FÜR DAS DUELL.' },
        { who: '', text: 'Das Echo zerfällt zu Licht. Der Riss über Neo-Konoha schließt sich — leise, wie ein Buch nach dem letzten Kapitel.' },
        { who: 'Kaito', text: 'Es … es ist vorbei? ES IST VORBEI! {name}, DU HAST DEN HIMMEL REPARIERT!' },
        { who: 'Iruka', text: 'Die Prophezeiung ist erfüllt. Die Geister der alten Ära können ruhen — und ihre Karten bleiben bei dir. Als Erinnerung. Als Vermächtnis.' },
        { who: 'Kaito', text: 'Komm, Champion-von-allem! Erst Ramen bei Teuchi — und dann zeigen wir der Stadt, wer den Riss geschlossen hat!' },
        { who: '', text: '— ENDE: Die Prophezeiung ist erfüllt! Neo-Konoha bleibt: Sammle alle Karten, besiege jeden Gegner, werde zur Legende! —' },
      ],
      next: null,
    },

    /* ================= Kapitel 5–9: Zeitreise „Die Shinobi-Ära" ================= */
    z_intro: {
      type: 'slides',
      slides: [
        { img: '23-epilog.jpg', music: 'menu', text: 'Monate vergingen. Neo-Konoha feierte seinen Champion — und der Himmel blieb heil. Beinahe ZU heil.' },
        { img: '30-rinnegan-himmel.jpg', music: 'tension', text: 'Dann, in einer windstillen Nacht, TEILTE sich der Mond — ein gewaltiges Rinnegan-Auge starrte auf die Stadt herab.' },
        { img: '31-zeitsog.jpg', music: 'tension', text: 'Ein Sog aus Chakra riss {name} aus der Gegenwart — und Kaito, der sich krampfhaft an deinem Ärmel festhielt. Die Zeiten verschoben sich.' },
        { img: '32-konoha-past.jpg', music: 'tension', text: 'Aufprall: Staub, Holz, Papierlaternen. Kein Glas. Kein Neon. Konoha — wie vor tausend Jahren. Die Shinobi-Ära.' },
      ],
      next: 'z_ankunft',
    },
    z_ankunft: {
      type: 'dialog',
      img: '32-konoha-past.jpg',
      script: [
        { who: 'Kaito', text: '{name} … sag mir, dass du das auch siehst. Der Hokage-Felsen — mit VIER Köpfen. Das ist … das ORIGINAL?!' },
        { who: 'Kaito', text: 'Das Auge am Himmel hat uns durch die Zeit gerissen. Das hier ist DIE Vergangenheit — die Ära der echten Shinobi!' },
        { choices: [
          { label: '„Die Prophezeiung: Beide Zeiten fließen in mir."', reply: 'Dann sind wir hier richtig, Professor Zeitreise. Und jetzt?', flags: { kaito: 1 } },
          { label: '„Wo sind wir gelandet …"', reply: 'Konoha! DAS Konoha! Und hier wirken Jutsus ECHT — also Vorsicht, {name}!', flags: {} },
          { label: '„Kaito, du hättest loslassen sollen."', reply: 'UND DICH ALLEIN LASSEN?! Niemals! Außerdem: Wer hält sonst dein Deck fest?', flags: { kaito: 1 } },
        ] },
        { who: 'Kaito', text: 'Psst — da drüben! Die Akademie … und ALARM! Die Wachen rufen etwas von einer GESTOHLENEN SCHRIFTROLLE!' },
        { who: '', text: '— Ziel: Finde den Dieb der Schriftrolle der Siegelung! —' },
      ],
      next: null,
    },

    /* ---------- Kapitel 5: Die gestohlene Schriftrolle (Mizuki) ---------- */
    z_k5_akademie: {
      type: 'dialog',
      img: '38-mizuki-nacht.jpg',
      script: [
        { who: '', text: 'Akademie der alten Ära, Nacht. Zerrissene Banner — und ein Chūnin mit einer riesigen Schriftrolle auf dem Rücken.' },
        { who: 'Mizuki', text: 'Noch ein Nachtschwärmer? He he … Ich bin Mizuki — und diese Schriftrolle gehört jetzt MIR.' },
        { who: 'Mizuki', text: 'Moment … deine Karten. Sie GLÜHEN. Was bist du? Egal — niemand verrät Mizuki. NIEMAND!' },
        { choices: [
          { label: '„Die Schriftrolle bleibt in Konoha!"', replyWho: 'Mizuki', reply: 'Dann hol sie dir, Balg — meine Fūma-Shuriken hungern schon!', flags: {} },
          { label: '„Du verrätst dein eigenes Dorf?"', replyWho: 'Mizuki', reply: 'Das Dorf hat MICH zuerst verraten! Ich hole mir, was mir zusteht!', flags: {} },
          { label: '„Deine Aura … finster wie der Riss."', replyWho: 'Mizuki', reply: 'Riss? Was auch immer du bist — du ENDEST hier.', flags: { kaito: 1 } },
        ] },
        { who: '', text: '— Besiege Mizuki, den Verräter! —' },
      ],
      next: null,
    },
    z_k5_sieg: {
      type: 'dialog',
      img: '38-mizuki-nacht.jpg',
      script: [
        { who: 'Mizuki', text: 'Ugh … unmöglich … mein Plan … meine Schriftrolle …' },
        { who: 'Iruka', img: '32-konoha-past.jpg', text: 'Halt! — Oh. Die Schriftrolle … IHR habt Mizuki aufgehalten? Ich bin Iruka, Lehrer der Akademie. Ihr seid … nicht von hier, oder?' },
        { who: 'Kaito', text: 'Lange Geschichte, Sensei-Iruka-aus-der-Vergangenheit! Wir … wandern zwischen den Zeiten. Halb so wild!' },
        { who: 'Iruka', text: 'Das Dorf ist euch zu Dank verpflichtet. Doch seid gewarnt: Im Land der Wellen verschwinden Menschen — ein DÄMON soll im Nebel lauern.' },
        { who: '', text: '— Kapitel 5 abgeschlossen! Neu: Die Große Brücke im Land der Wellen —' },
      ],
      next: null,
    },

    /* ---------- Kapitel 6: Land der Wellen (Haku → Zabuza) ---------- */
    z_k6_bruecke: {
      type: 'dialog',
      music: 'tension',
      img: '33-bruecke.jpg',
      script: [
        { who: '', text: 'Die Große Brücke. Nebel kriecht über die Planken — und darin schweben EIS-SPIEGEL.' },
        { who: 'Haku', img: '40-haku-spiegel.jpg', text: 'Bleibt stehen. Ich bin Haku. Ich will euch nicht töten … aber ich darf euch nicht passieren lassen.' },
        { who: 'Haku', text: 'Eure Karten … sie tragen zwei Zeiten in sich. Wie ich zwei Gesichter trage. Versteht: Ich bin Zabuzas Werkzeug.' },
        { choices: [
          { label: '„Ein Werkzeug hat keine Träume — hast du welche?"', replyWho: 'Haku', reply: '… Ihr klingt wie ER. Trotzdem: Meine Spiegel lügen nie.', flags: {} },
          { label: '„Dann zwing mich durch deine Spiegel!"', replyWho: 'Haku', reply: 'Wie ihr wollt. Makyō Hyōshō — nehmt Platz im Eis.', flags: {} },
          { label: '„Wir wollen nur zum anderen Ufer."', replyWho: 'Haku', reply: 'Niemand passiert diese Brücke. Nicht heute. Nicht durch mich.', flags: { kaito: 1 } },
        ] },
        { who: '', text: '— Besiege Haku! —' },
      ],
      next: null,
    },
    z_k6_haku_sieg: {
      type: 'dialog',
      music: 'sad',
      img: '33-bruecke.jpg',
      script: [
        { who: 'Haku', text: '… Ihr wart stärker. Zabuza … verzeih mir. Euer Wille … ist echt …' },
        { who: 'Kaito', text: '{name} … der Nebel. Er wird DICHTER. Das war erst der Anfang, oder?' },
        { who: '', img: '41-zabuza-nebel.jpg', text: 'Das Wasser bebt. Eine riesige Klinge SURRT durch den Nebel und schlägt in den Brückenpfeiler.' },
        { who: 'Zabuza', music: 'tension', text: 'Haku … mein Werkzeug ist gebrochen. Also erledige ich das selbst. Kind — dein Blut färbt diesen Nebel rot.' },
        { who: '', text: '— Der Dämon wartet am Brückenende! —' },
      ],
      next: null,
    },
    z_k6_nebel: {
      type: 'dialog',
      music: 'tension',
      img: '41-zabuza-nebel.jpg',
      script: [
        { who: 'Zabuza', text: 'Zabuza Momochi. Dämon des verborgenen Nebels. Sag deinen Namen — damit ich ihn in mein Notizbuch schreiben kann.' },
        { choices: [
          { label: '„Schreib ihn groß — er landet in deiner Niederlagen-Liste."', replyWho: 'Zabuza', reply: 'HA! Den Humor nehm ich mit ins Grab — DEINS.', flags: { kaito: 1 } },
          { label: '„Haku war mehr als ein Werkzeug."', replyWho: 'Zabuza', reply: '… Halt die Klappe. Und kämpfe.', flags: {} },
          { label: '„Der Nebel schützt dich nicht vor mir."', replyWho: 'Zabuza', reply: 'Lautloses Töten. Du hörst mich kommen — wenn es längst zu spät ist.', flags: {} },
        ] },
        { who: '', text: '— BOSS: Besiege Zabuza Momochi! —' },
      ],
      next: null,
    },
    z_k6_sieg: {
      type: 'dialog',
      music: 'sad',
      img: '41-zabuza-nebel.jpg',
      script: [
        { who: 'Zabuza', text: 'Tch … besiegt … von einem Zeitreisenden. Haku … ich komme … zu dir …' },
        { who: '', img: '33-bruecke.jpg', text: 'Der Nebel reißt auf. Ein Konoha-Blatt wirbelt davon — und die Zeit selbst zieht euch weiter: zur Chūnin-Prüfung.' },
        { who: 'Kaito', text: 'Dieser Zeit-Zug hat keinen Bremshebel, {name}. Nächster Halt: Prüfungswald. Klingt ungemütlich. WIRD ungemütlich.' },
        { who: '', text: '— Kapitel 6 abgeschlossen! Neu: Der Prüfungswald —' },
      ],
      next: null,
    },

    /* ---------- Kapitel 7: Chūnin-Prüfung (Orochimaru → Gaara) ---------- */
    z_k7_wald: {
      type: 'dialog',
      music: 'tension',
      img: '34-pruefungswald.jpg',
      script: [
        { who: '', text: 'Der Wald des Todes. Bäume wie Türme, Schlangen dick wie Stämme — und eine Stimme aus dem Dunkel.' },
        { who: 'Orochimaru', img: '43-orochimaru-wald.jpg', text: 'Kukuku … ein Chakra aus ZWEI Zeiten. Wie … interessant. Ich BIN Orochimaru. Und ich will es sezieren.' },
        { who: 'Orochimaru', text: 'Zeig mir dein Deck, Zeitreisender. Wenn es mich enttäuscht, behalte ich deinen Körper als Andenken.' },
        { choices: [
          { label: '„Mein Körper bleibt meiner!"', replyWho: 'Orochimaru', reply: 'Kukuku … das sagen sie alle. Am Anfang.', flags: {} },
          { label: '„Die Schriftrolle reichte dir nicht, Schlange?"', replyWho: 'Orochimaru', reply: 'Mizuki war ein Werkzeug. Du aber … du bist ein Exemplar.', flags: {} },
          { label: '„Komm näher — meine Karten beißen."', replyWho: 'Orochimaru', reply: 'Oh? Dann beiße ich zurück. Mit Zähnen aus Edo Tensei.', flags: { kaito: 1 } },
        ] },
        { who: '', text: '— Besiege Orochimaru! —' },
      ],
      next: null,
    },
    z_k7_wald_sieg: {
      type: 'dialog',
      music: 'tension',
      img: '43-orochimaru-wald.jpg',
      script: [
        { who: 'Orochimaru', text: 'Kukuku … Schmerz … wie lange nicht mehr. Wir sehen uns wieder, Zeitreisender — die Zukunft gehört ohnehin MIR.' },
        { who: '', img: '44-gaara-sturm.jpg', text: 'Die Schlange verschwindet im Laub. Doch über Konoha bricht ein Sturm herein: SAND verstopft den Himmel.' },
        { who: 'Kaito', text: '{name} — die Prüfung eskaliert komplett! Da draußen verwandelt sich jemand in ein … MONSTER!' },
        { who: '', text: '— Der Sturm auf Konoha beginnt: Gaara wartet! —' },
      ],
      next: null,
    },
    z_k7_sturm: {
      type: 'dialog',
      music: 'tension',
      img: '44-gaara-sturm.jpg',
      script: [
        { who: 'Gaara', text: 'Schmerz ist der einzige Beweis, dass ich existiere. Wer bist du — und warum fürchtest du mich NICHT?' },
        { who: 'Gaara', text: 'Mein Sand verteidigt mich absolut. Und wenn das nicht reicht … erwacht ER. Shukaku HUNGERT.' },
        { choices: [
          { label: '„Du existierst — auch ohne zu töten, Gaara."', replyWho: 'Gaara', reply: '… Das sagte einmal ein anderes Kind. Zeig mir, ob es stimmt. KÄMPFE!', flags: {} },
          { label: '„Dann weckt mein Deck deinen Dämon zuerst!"', replyWho: 'Gaara', reply: 'Versuch es. Sabaku Kyū — sei mein Beweis.', flags: {} },
          { label: '„Ich kenne Einsamkeit. Sie endet heute."', replyWho: 'Gaara', reply: 'Einsamkeit endet NIE. Sie frisst nur leise weiter …', flags: { kaito: 1 } },
        ] },
        { who: '', text: '— BOSS: Besiege Gaara, bevor Shukaku ganz erwacht! —' },
      ],
      next: null,
    },
    z_k7_sturm_sieg: {
      type: 'dialog',
      music: 'sad',
      img: '44-gaara-sturm.jpg',
      script: [
        { who: 'Gaara', text: '… Geschlagen. Von jemandem, der für ANDERE kämpft. Vielleicht … ist Liebe wirklich stärker als Hass.' },
        { who: '', img: '45-itachi-tore.jpg', music: 'tension', text: 'Der Sand legt sich. Doch zwei schwarze Mäntel mit roten Wolken ziehen durch Konohas Gassen — die AKATSUKI.' },
        { who: 'Kaito', text: 'Rote Wolken, schwarze Mäntel — {name}, die sehen aus wie Endgegner. Wir gehen da trotzdem hin, oder? … Wir gehen da hin.' },
        { who: '', text: '— Kapitel 7 abgeschlossen! Neu: Die Konoha-Tore —' },
      ],
      next: null,
    },

    /* ---------- Kapitel 8: Akatsuki (Itachi → Kimimaro) ---------- */
    z_k8_tore: {
      type: 'dialog',
      music: 'tension',
      img: '45-itachi-tore.jpg',
      script: [
        { who: '', text: 'An den Toren von Konoha. Zwei Silhouetten: einer mit Sharingan, einer mit bandagierter Riesenklinge.' },
        { who: 'Itachi', text: '… Du bist nicht aus dieser Zeit. Dein Chakra verrät es. Ich bin Itachi Uchiha — das ist Kisame.' },
        { who: 'Kisame', text: 'He he … darf ich ihn behalten, Itachi? Samehada LIEBT exotisches Chakra!' },
        { choices: [
          { label: '„Euer Ziel ist Naruto — ich stehe im Weg."', replyWho: 'Itachi', reply: 'Dann tritt beiseite … oder versinke in meinem Tsukuyomi.', flags: {} },
          { label: '„Samehada gegen Karten — faires Duell!"', replyWho: 'Kisame', reply: 'HA! Der Kleine hat Mut! Itachi, ich mag ihn … zum Frühstück.', flags: {} },
          { label: '„Itachi — dein Geheimnis kenne ich."', replyWho: 'Itachi', reply: '… Dann weißt du auch: Du WILLST diesen Kampf nicht. Aber ich gebe ihn dir.', flags: { kaito: 1 } },
        ] },
        { who: '', text: '— BOSS: Besiege Itachi & Kisame! —' },
      ],
      next: null,
    },
    z_k8_tore_sieg: {
      type: 'dialog',
      img: '45-itachi-tore.jpg',
      script: [
        { who: 'Itachi', text: 'Genug. Rückzug, Kisame. … Zeitreisender: Die Akatsuki sammelt die Bijū. Das Auge über Amegakure … beobachtet dich schon.' },
        { who: 'Kisame', text: 'Puh — der Kleine war Arbeit! Beim nächsten Mal gibt es ihn filetiert, Itachi!' },
        { who: 'Kaito', text: '„Das Auge über Amegakure" — {name}, DAS ist das Auge vom Anfang! Das hat uns hierher gerissen!' },
        { who: '', img: '47-kimimaro-klang.jpg', text: 'Doch zuerst: Sasuke wurde entführt — und der Viererklang des Klangs versperrt jeden Weg.' },
      ],
      next: null,
    },
    z_k8_klang: {
      type: 'dialog',
      music: 'tension',
      img: '47-kimimaro-klang.jpg',
      script: [
        { who: '', text: 'Das Versteck des Klangs. Vier Figuren — und hinter ihnen, still wie ein Grab: Kimimaro.' },
        { who: 'Kimimaro', text: 'Lord Orochimarus Gefäß zieht vorbei. Wer aufhalten will, wird aufgehalten. Von mir. Endgültig.' },
        { who: 'Tayuya', text: 'Noch so ein Duell-Narr! Doki — reiß ihn in Stücke, aber hübsch im Takt!' },
        { choices: [
          { label: '„Kimimaro — dein Wille ist stärker als dein Körper. Beweis es mir!"', replyWho: 'Kimimaro', reply: 'Mein Wille IST Lord Orochimaru. Komm — und zerbrich an meinem Knochen.', flags: {} },
          { label: '„Vier gegen einen? Feige!"', replyWho: 'Kimimaro', reply: 'Wir nennen es effizient. Doch gegen dich kämpfe ICH allein — das verlange ich mir selbst.', flags: {} },
          { label: '„Der Viererklang endet hier."', replyWho: 'Tayuya', reply: 'HA! Die Melodie, die du gleich hörst, ist deine Todesmusik, Kleiner.', flags: { kaito: 1 } },
        ] },
        { who: '', text: '— BOSS: Besiege Kimimaro & den Viererklang! —' },
      ],
      next: null,
    },
    z_k8_klang_sieg: {
      type: 'dialog',
      music: 'sad',
      img: '47-kimimaro-klang.jpg',
      script: [
        { who: 'Kimimaro', text: 'Mein Körper … versagt … doch mein Wille gehört Lord Orochimaru … und der wird weiterleben …' },
        { who: '', img: '35-amegakure.jpg', music: 'tension', text: 'Der Klang verstummt. Am Horizont ragen Stahltürme in einen ewig weinenden Himmel — Amegakure. Und darüber: DAS AUGE.' },
        { who: 'Kaito', text: 'Da ist es wieder … das Rinnegan am Himmel. {name} — wer auch immer das ist: Er WARTET auf uns.' },
        { who: '', text: '— Kapitel 8 abgeschlossen! Neu: Amegakure, das Dorf im Regen —' },
      ],
      next: null,
    },

    /* ---------- Kapitel 9: Rinnegan (Pain → Madara) ---------- */
    z_k9_regen: {
      type: 'dialog',
      music: 'tension',
      img: '35-amegakure.jpg',
      script: [
        { who: '', text: 'Amegakure. Regen, der jedes Chakra spürt. Auf dem höchsten Turm: sechs Gestalten mit Rinnegan-Augen.' },
        { who: 'Pain', img: '48-pain-regen.jpg', text: 'Ich bin Pain. Gott dieses Dorfes. Dein Chakra trägt zwei Zeiten — gib es mir, und die Welt lernt Frieden durch Schmerz.' },
        { who: 'Pain', text: 'Du wurdest nicht zufällig hierher gerissen. Deine Ankunft diente einem Plan — größer als meiner. Doch zuerst: SPÜRE. SCHMERZ.' },
        { choices: [
          { label: '„Frieden durch Schmerz ist kein Frieden, Pain!"', replyWho: 'Pain', reply: 'Dann zeig mir deinen Frieden — mit Karten statt Worten.', flags: {} },
          { label: '„Wer hat mich hierher gerissen?"', replyWho: 'Pain', reply: 'Verliere, und die Antwort erübrigt sich. Überlebe … und du erkennst ihn am Mond.', flags: { kaito: 1 } },
          { label: '„Sechs gegen einen — wie immer in letzter Zeit."', replyWho: 'Pain', reply: 'Wir sind EINS. Ein Gott. Ein Wille. Shinra Tensei wartet.', flags: {} },
        ] },
        { who: '', text: '— BOSS: Besiege die Sechs Pfade von Pain! —' },
      ],
      next: null,
    },
    z_k9_regen_sieg: {
      type: 'dialog',
      music: 'sad',
      img: '48-pain-regen.jpg',
      script: [
        { who: 'Pain', text: '… Dein Wille … überdauerte den Schmerz. Vielleicht … bist du die Antwort, die Jiraiya-sensei suchte …' },
        { who: '', img: '37-roter-mond.jpg', text: 'Der Regen stockt — mitten in der Luft. Der Himmel über Amegakure reißt auf, und der MOND färbt sich blutrot. Ein Auge öffnet sich darin.' },
        { who: 'Madara', img: '49-madara-mond.jpg', music: 'tension', text: 'Pain war ein Bauer. DU warst der Zug. Komm, Zeitreisender — das Mugen Tsukuyomi braucht dein Chakra zweier Zeiten.' },
        { who: 'Kaito', text: '{name} … das ist er. Der uns hierher gerissen hat. Letztes Duell. FÜR ALLE ZEITEN!' },
        { who: '', text: '— Der Rote Mond steigt: Madara Uchiha wartet! —' },
      ],
      next: null,
    },
    z_k9_mond: {
      type: 'dialog',
      music: 'boss',
      img: '49-madara-mond.jpg',
      script: [
        { who: 'Madara', text: 'Madara Uchiha. Ich riss dich durch die Zeit — dein Zwei-Zeiten-Chakra ist der letzte Splitter für mein Mugen Tsukuyomi.' },
        { who: 'Madara', text: 'Schau zum Mond. Ein Auge, das alle Welt in ewige Träume hüllt. Widerstand? Dann TANZ für mich, Zeitreisender!' },
        { choices: [
          { label: '„Träume sind keine Wirklichkeit, Madara!"', replyWho: 'Madara', reply: 'Wirklichkeit ist, was der Stärkste träumt. BEGINNE DEINEN TANZ.', flags: {} },
          { label: '„Du hast mich unterschätzt — beide Zeiten stehen HINTER mir."', replyWho: 'Madara', reply: 'Dann zeig mir ihre Macht … und ich zeige dir meine.', flags: { kaito: 1 } },
          { label: '„Für Konoha — für ALLE Zeiten!"', replyWho: 'Madara', reply: 'Pathos. Wie Hashirama. Ich hasse es … und vermisse es. KÄMPFE!', flags: {} },
        ] },
        { who: '', text: '— FINAL-BOSS: Besiege Madara Uchiha — brich das Mugen Tsukuyomi! —' },
      ],
      next: null,
    },
    z_k9_ende: {
      type: 'dialog',
      music: 'hope',
      img: '49-madara-mond.jpg',
      script: [
        { who: 'Madara', text: 'Besiegt … von einem Kind zweier Zeiten. Das Auge … schließt sich … Vielleicht war der Traum … nie meiner …' },
        { who: '', img: '23-epilog.jpg', text: 'Der Mond bleicht aus. Das Mugen Tsukuyomi zerreißt wie dünnes Glas — und die Zeit selbst beginnt zu heilen.' },
        { who: 'Kaito', text: 'Er ist … WEG? Der Mond ist wieder NORMAL! {name} — DU HAST GERADE DIE ZEIT GESCHLAGEN!' },
        { who: 'Iruka', text: 'Zwei Zeiten fließen in dir — und beide sind jetzt sicher. Die Shinobi-Ära bleibt offen für dich, Champion. Komm wieder.' },
        { who: '', text: '— ENDE DER ZEITREISE: Wechsle jederzeit zwischen Neo-Konoha und der Shinobi-Ära — sammle die Chase-Karten der Legenden! —' },
      ],
      next: null,
    },
  };

  /* ================= Player-State ================= */
  const S = {
    scene: null,      // Szenen-Key
    idx: 0,           // Slide- / Skript-Index
    typing: false,
    typeTimer: null,
    fullText: '',
    replay: false,    // nur Intro-Slides (Menü-Replay)
    firstRun: false,  // Kette intro→name→kaito (setzt introDone)
    onDone: null,
  };

  const playerName = () => (NT.Store.data && NT.Store.data.playerName) || 'Duellant';
  const fill = (t) => t.replace(/\{name\}/g, playerName());

  /* ================= Sprecher-Porträts (reden „mit dir") ================= */
  const TALK = {
    Kaito: 'talk-kaito.jpg',
    Iruka: 'talk-iruka.jpg',
    Aya: 'talk-aya.jpg',
    Kotei: 'talk-kotei.jpg',
    Teuchi: 'talk-teuchi.jpg',
    Kurogane: 'talk-kurogane.jpg',
    Shizuka: 'talk-shizuka.jpg',
    Raiga: 'talk-raiga.jpg',
    'Direktor Kagā': 'talk-kagaa.jpg',
    'Kagā': 'talk-kagaa.jpg',
    Monolith: 'talk-monolith.jpg',
    Stimme: 'talk-stimme.jpg',
    'Dunkles Echo': 'talk-echo.jpg',
    /* Zeitreise-Bogen: Kanon-Sprecher nutzen ihre Kartenbilder (assets/cards/) */
    Mizuki: '../cards/mizuki_verraeter.jpg',
    Haku: '../cards/haku_spiegel.jpg',
    Zabuza: '../cards/zabuza_daemon.jpg',
    Orochimaru: '../cards/orochimaru_sannin.jpg',
    Gaara: '../cards/gaara_wueste.jpg',
    Itachi: '../cards/itachi_mangekyou.jpg',
    Kisame: '../cards/kisame_samehada.jpg',
    Kimimaro: '../cards/kimimaro_kaguya.jpg',
    Tayuya: '../cards/tayuya.jpg',
    Pain: '../cards/pain_tendo.jpg',
    Madara: '../cards/madara_uchiha.jpg',
  };
  let faceShown = '';
  function showFace(who) {
    const file = TALK[who] || '';
    const box = $('#story-face');
    if (!box) return;
    if (!file) { // Erzählerzeile → Porträt ausblenden
      if (faceShown) { box.classList.remove('on'); faceShown = ''; }
      return;
    }
    const img = $('#story-face-img');
    if (faceShown !== file) {
      faceShown = '';
      box.classList.remove('on');
      img.onload = () => { faceShown = file; box.classList.add('on'); };
      img.onerror = () => { faceShown = 'none'; }; // fehlende Datei → einfach kein Bild
      img.src = IMG + file;
      if (img.complete && img.naturalWidth) { faceShown = file; box.classList.add('on'); }
    } else if (faceShown !== 'none') {
      box.classList.add('on');
    }
  }
  function hideFace() {
    faceShown = '';
    const box = $('#story-face');
    if (box) box.classList.remove('on');
  }

  /* ================= Bilder (Crossfade + Fallback) ================= */
  let frontBg = null; // 'a' oder 'b'
  const preloaded = {};
  function preload(file) {
    if (preloaded[file]) return;
    const im = new Image();
    im.src = IMG + file;
    preloaded[file] = im;
  }
  function showImg(file) {
    preload(file);
    const im = preloaded[file];
    const next = frontBg === 'a' ? 'b' : 'a';
    const nextEl = $('#story-bg-' + next);
    nextEl.style.backgroundImage = 'url("' + IMG + file + '")';
    const apply = () => {
      nextEl.classList.add('on');
      if (frontBg) $('#story-bg-' + frontBg).classList.remove('on');
      frontBg = next;
    };
    if (im.complete && im.naturalWidth) apply();
    else {
      im.onload = apply;
      im.onerror = () => { // Fallback: Verlauf statt Bild
        nextEl.style.backgroundImage = 'linear-gradient(160deg, #1b2342, #0b0f1e)';
        apply();
      };
    }
  }

  /* ================= Typewriter ================= */
  function typeLine(text, who) {
    clearInterval(S.typeTimer);
    S.typing = true;
    S.fullText = text;
    showFace(who || '');
    const sub = $('#story-sub');
    sub.classList.remove('hidden');
    const whoEl = $('#story-who');
    whoEl.classList.toggle('hidden', !who);
    whoEl.textContent = who || '';
    const txt = $('#story-text');
    txt.textContent = '';
    $('#story-hint').classList.add('hidden');
    let i = 0;
    S.typeTimer = setInterval(() => {
      i += 1;
      txt.textContent = text.slice(0, i);
      if (i >= text.length) finishType();
    }, 26);
  }
  function finishType() {
    clearInterval(S.typeTimer);
    S.typeTimer = null;
    S.typing = false;
    $('#story-text').textContent = S.fullText;
    $('#story-hint').classList.remove('hidden');
  }

  /* ================= Ablauf ================= */
  function playScene(key) {
    S.scene = key;
    S.idx = 0;
    const sc = SCENES[key];
    hideFace();
    if (NT.Music) NT.Music.play(sc.music || (sc.type === 'slides' ? 'intro' : 'menu'));
    $('#story-skip').classList.toggle('hidden', sc.type === 'name');
    $('#story-namebox').classList.add('hidden');
    $('#story-choices').classList.add('hidden');
    if (sc.type === 'slides') showSlide();
    else if (sc.type === 'dialog') { showImg(sc.img); runScript(); }
    else if (sc.type === 'name') {
      showImg(sc.img);
      $('#story-sub').classList.add('hidden');
      const box = $('#story-namebox');
      box.classList.remove('hidden');
      const inp = $('#story-name-input');
      inp.value = NT.Store.data && NT.Store.data.playerName ? NT.Store.data.playerName : '';
      setTimeout(() => inp.focus(), 350);
    }
  }

  function showSlide() {
    const sc = SCENES[S.scene];
    const sl = sc.slides[S.idx];
    showImg(sl.img);
    if (sl.music && NT.Music) NT.Music.play(sl.music); // Stimmungswechsel pro Slide
    typeLine(sl.text, '');
  }

  function runScript() {
    const sc = SCENES[S.scene];
    const entry = sc.script[S.idx];
    if (!entry) return goto(sc.next);
    if (entry.choices) return showChoices(entry.choices);
    if (entry.img) showImg(entry.img); // Bildwechsel mitten im Dialog
    if (entry.music && NT.Music) NT.Music.play(entry.music); // Stimmungswechsel mitten im Dialog
    typeLine(fill(entry.text), entry.who || '');
  }

  function showChoices(list) {
    finishType();
    $('#story-sub').classList.add('hidden');
    const box = $('#story-choices');
    box.innerHTML = '';
    list.forEach((c) => {
      const b = document.createElement('button');
      b.className = 'story-choice';
      b.textContent = c.label;
      b.onclick = () => {
        NT.Audio.play('click');
        applyFlags(c.flags);
        box.classList.add('hidden');
        $('#story-sub').classList.remove('hidden');
        typeLine(fill(c.reply), c.replyWho || 'Kaito');
      };
      box.appendChild(b);
    });
    box.classList.remove('hidden');
  }

  function applyFlags(flags) {
    if (!flags || !NT.Store.data) return;
    const st = NT.Store.data.story;
    for (const k in flags) {
      if (k === 'kaito') st.flags.kaito = (st.flags.kaito || 0) + flags.kaito;
      else st.flags[k] = flags[k];
    }
    NT.Store.save();
  }

  function advance() {
    if (S.typing) return finishType();
    const sc = SCENES[S.scene];
    if (!sc) return;
    if (sc.type === 'slides') {
      S.idx += 1;
      if (S.idx < sc.slides.length) showSlide();
      else goto(sc.next);
    } else if (sc.type === 'dialog') {
      if (!$('#story-choices').classList.contains('hidden')) return; // Wahl offen
      S.idx += 1;
      runScript();
    }
  }

  function goto(key) {
    if (S.replay || !key) return finishChain();
    playScene(key);
  }

  function finishChain() {
    if (S.firstRun && NT.Store.data) {
      NT.Store.data.story.introDone = true;
      NT.Store.data.story.progress = Math.max(NT.Store.data.story.progress, 1);
      NT.Store.save();
    }
    const cb = S.onDone;
    S.onDone = null; S.firstRun = false; S.replay = false;
    if (cb) cb();
  }

  function skip() {
    NT.Audio.play('click');
    const sc = SCENES[S.scene];
    if (!sc || sc.type === 'name') return;
    clearInterval(S.typeTimer); S.typing = false;
    goto(sc.next);
  }

  function confirmName() {
    const inp = $('#story-name-input');
    let v = inp.value.trim().replace(/\s+/g, ' ');
    if (!v) v = 'Kaze';
    if (v.length < 2) {
      inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
      return;
    }
    NT.Store.data.playerName = v;
    NT.Store.save();
    NT.Audio.play('buff');
    goto(SCENES.name.next);
  }

  /* ================= API ================= */
  NT.Story = {
    needsIntro() { return !!(NT.Store.data && !NT.Store.data.story.introDone); },
    startIntro(onDone) {
      S.onDone = onDone || null; S.firstRun = true; S.replay = false;
      NT.Main.show('scr-story');
      playScene('intro');
    },
    playIntro(onDone) { // Replay aus dem Menü: nur die Bildfolge
      S.onDone = onDone || null; S.firstRun = false; S.replay = true;
      NT.Main.show('scr-story');
      playScene('intro');
    },
    play(key, onDone) { // generische Szenen-Kette (Map-Kapitel)
      S.onDone = onDone || null; S.firstRun = false; S.replay = false;
      NT.Main.show('scr-story');
      playScene(key);
    },
  };

  /* ================= DOM-Events ================= */
  document.addEventListener('DOMContentLoaded', () => {
    $('#scr-story').addEventListener('click', (e) => {
      if (e.target.closest('#story-choices, #story-namebox, #story-skip')) return;
      NT.Audio.play('click');
      advance();
    });
    $('#story-skip').addEventListener('click', skip);
    $('#story-name-ok').addEventListener('click', confirmName);
    $('#story-name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); confirmName(); }
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
