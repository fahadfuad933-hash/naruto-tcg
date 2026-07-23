/* ============================================================
   NARUTO TGC — Kartendatenbank, Gegner, Decks
   Speed-Duel-Regeln im Stil von Yu-Gi-Oh! Duel Links
   ============================================================ */
(function (g) {
  const NT = (g.NTCG = g.NTCG || {});

  /* ---------- Chakra-Naturen (Attribute) ---------- */
  NT.ATTRS = {
    feuer:      { name: 'Feuer',      icon: '🔥', color: '#e53e3e' },
    wasser:     { name: 'Wasser',     icon: '💧', color: '#3182ce' },
    wind:       { name: 'Wind',       icon: '🍃', color: '#38a169' },
    erde:       { name: 'Erde',       icon: '🪨', color: '#a06832' },
    blitz:      { name: 'Blitz',      icon: '⚡', color: '#d69e2e' },
    licht:      { name: 'Licht',      icon: '☀️', color: '#ecc94b' },
    finsternis: { name: 'Finsternis', icon: '🌑', color: '#805ad5' },
  };

  /* Chakra-Vorteil im Kampf: Schlüssel schlägt Wert → Angreifer +NT.ATTR_BONUS ANG.
     (Naruto-Kanon: Feuer>Wind>Blitz>Erde>Wasser>Feuer; Licht/Finsternis kontern sich) */
  NT.ATTR_BEATS = {
    feuer: 'wind', wind: 'blitz', blitz: 'erde', erde: 'wasser', wasser: 'feuer',
    licht: 'finsternis', finsternis: 'licht',
  };
  NT.ATTR_BONUS = 300;

  /* Anzeigenamen der Stämme (für Tribut-/Fehlermeldungen, Karten-Texte) */
  NT.TRIBE_NAMES = {
    konoha: 'Konoha-Ninja', kroete: 'Kröten', akademie: 'Akademie-Ninja', ramen: 'Ramen-Ninja',
    taijutsu: 'Taijutsu-Ninja', uchiha: 'Uchiha-Ninja', suna: 'Suna-Ninja', kopier: 'Kopier-Ninja',
    fallensteller: 'Fallensteller-Ninja', oto: 'Oto-Ninja', jonin: 'Jonin', akatsuki: 'Akatsuki-Ninja',
    kagaa: 'Kagā-Ninja', echo: 'Echo-Ninja', kiri: 'Kiri-Ninja',
  };

  NT.RARITY = {
    N:  { name: 'N',  label: 'Normal',       color: '#9aa5b1' },
    R:  { name: 'R',  label: 'Rare',         color: '#4aa3ff' },
    SR: { name: 'SR', label: 'Super Rare',   color: '#c06df0' },
    UR: { name: 'UR', label: 'Ultra Rare',   color: '#ffb02e' },
  };

  /* ---------- Karten ----------
     kind: 'ninja' | 'jutsu' | 'falle'
     ninja: level, atk, def, attr, effect {t:...} | null
     jutsu: sub: 'normal' | 'schnell' | 'equip', effect {t:...}
     falle: trigger: 'attack' | 'summon', effect {t:...}
  ------------------------------------------------------------ */
  const CARDS = {
    /* ===== TOKEN ===== */
    kage_token:  { kind:'ninja', name:'Schattendoppelgänger', level:1, atk:1000, def:1000, attr:'wind', emoji:'🍥', rarity:'N',
                   token:true, effect:null, desc:'Ein Doppelgänger aus reinem Chakra.' },

    /* ===== Füller (vanilla, Tests/Platzhalter) ===== */
    akademie_schueler: { kind:'ninja', name:'Akademie-Schüler', level:2, atk:1000, def:1000, attr:'erde', emoji:'🎓', rarity:'N', tribe:'akademie',
                   effect:null, desc:'Ein Fleißiger aus der Ninja-Akademie — ohne besondere Jutsus.' },

    /* ===== STARTER-THEME: Team 7 / Konoha (tribe 'konoha') ===== */
    naruto_schueler: { kind:'ninja', name:'Naruto – Akademie-Schüler', level:3, atk:1300, def:800, attr:'wind', emoji:'🍥', rarity:'R', tribe:'konoha',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    konohamaru_rivale: { kind:'ninja', name:'Konohamaru – Kleiner Rivale', level:2, atk:700, def:700, attr:'feuer', emoji:'🧒', rarity:'N', tribe:'konoha',
                   effect:{ t:'on_battle_destroy_summon', id:'naruto_genin' },
                   desc:'Wenn diese Karte durch KAMPF zerstört wird: Beschwöre 1 „Naruto – Genin" aus deinem Deck.' },
    naruto_genin: { kind:'ninja', name:'Naruto – Genin', level:4, atk:1500, def:1100, attr:'wind', emoji:'🍥', rarity:'R', tribe:'konoha',
                   effect:{ t:'aura_self_tribe', v:300, tribe:'konoha' },
                   desc:'Erhält +300 ANG, solange ein anderer Konoha-Ninja offen auf deiner Feldseite liegt.' },
    iruka_waechter: { kind:'ninja', name:'Iruka – Wachsamer Lehrer', level:4, atk:800, def:2200, attr:'wasser', emoji:'📚', rarity:'R', tribe:'konoha',
                   effects:[ { t:'no_direct' }, { t:'attack_redirect' } ],
                   desc:'Kann nicht direkt angreifen. Einmal pro Zug: Lenke das Ziel eines gegnerischen Angriffs auf diese Karte um.' },
    naruto_kyuubi: { kind:'ninja', name:'Naruto – Kyūbi-Modus', level:7, atk:2500, def:2000, attr:'finsternis', emoji:'🦊', rarity:'UR', tribe:'konoha', tribeTribute:'konoha',
                   effect:{ t:'destroy_weak_per_turn', maxAtk:2000 },
                   desc:'Tribut-Beschwörung: Erfordert 2 KONOHA-Ninja als Tribut. Einmal pro Zug: Wirf 1 Handkarte ab, um 1 gegnerisches Ninja mit höchstens 2000 ANG zu zerstören.' },
    team7_formation: { kind:'jutsu', sub:'normal', name:'Team 7 – Formation', emoji:'🤝', rarity:'SR',
                   effect:{ t:'sp_summon_hand_tribe', tribe:'konoha', drawIf:'naruto' },
                   desc:'Beschwöre 1 Konoha-Ninja aus deiner Hand als Spezialbeschwörung. Kontrollierst du einen Naruto: Ziehe 1 Karte.' },
    rasengan_genin: { kind:'jutsu', sub:'equip', name:'Rasengan (Genin)', emoji:'🌀', rarity:'R',
                   effect:{ t:'equip', atk:800, tribeId:'naruto_genin', burnOnKill:400 },
                   desc:'Ausrüstung nur für „Naruto – Genin": +800 ANG. Zerstört er ein Ninja durch Kampf: 400 Schaden für den Gegner.' },
    schattenspiel: { kind:'jutsu', sub:'dauer', name:'Schattenspiel', emoji:'🌫️', rarity:'SR',
                   effect:{ t:'cont_weaken_all', v:200, coinNegate:1 },
                   desc:'DAUER-KARTE: Alle gegnerischen Ninja verlieren 200 ANG/VERT. Greift eines an: Münzwurf — bei Kopf wird der Angriff abgebrochen.' },
    schatten_bindung: { kind:'jutsu', sub:'normal', name:'Schatten-Bindung', emoji:'🌑', rarity:'SR',
                   effect:{ t:'lock_monster', turns:2 },
                   desc:'1 gegnerisches Ninja kann 2 Züge lang weder angreifen noch seine Effekte nutzen.' },
    kawarimi_trick: { kind:'falle', trigger:'attack', name:'Kawarimi-Trick', emoji:'🪵', rarity:'N',
                   effect:{ t:'negate_attack_tribe', tribe:'konoha' },
                   desc:'FALLE: Wenn der Gegner angreift und du einen Konoha-Ninja kontrollierst: Annulliere den Angriff.' },
    schattentaeuschung: { kind:'falle', trigger:'summon', name:'Schattentäuschung', emoji:'🎭', rarity:'SR',
                   effect:{ t:'weaken_summoned', v:500, dmg:300 },
                   desc:'FALLE: Wenn der Gegner ein Ninja beschwört: Es verliert dauerhaft 500 ANG und der Gegner erhält 300 Schaden.' },

    /* ===== Kurogane Boss-Deck: Jiraiya & die Kröten (tribe 'kroete') ===== */
    jiraiya_eremit: { kind:'ninja', name:'Jiraiya – Der Reise-Eremit', level:3, atk:1200, def:1000, attr:'feuer', emoji:'🐸', rarity:'R',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    gama:        { kind:'ninja', name:'Gama – Kleine Kröte', level:2, atk:600, def:800, attr:'wasser', emoji:'🐸', rarity:'N', tribe:'kroete',
                   effect:{ t:'on_battle_destroy_summon', id:'gamakichi_krieger' },
                   desc:'Wenn diese Karte durch KAMPF zerstört wird: Beschwöre 1 „Gamakichi – Tapferer Nachwuchs" aus deinem Deck.' },
    gamakichi_krieger: { kind:'ninja', name:'Gamakichi – Tapferer Nachwuchs', level:4, atk:1500, def:1200, attr:'wasser', emoji:'🐸', rarity:'R', tribe:'kroete',
                   effect:{ t:'aura_self_tribe', v:300, tribe:'kroete', idPrefix:'jiraiya' },
                   desc:'Erhält +300 ANG, solange ein anderer Jiraiya oder eine andere Kröte offen auf deiner Feldseite liegt.' },
    gamaken_waechter: { kind:'ninja', name:'Gamaken – Der Ungeschickte Beschwörer', level:4, atk:800, def:2200, attr:'wasser', emoji:'🐸', rarity:'R', tribe:'kroete',
                   effects:[ { t:'no_direct' }, { t:'attack_redirect' } ],
                   desc:'Kann nicht direkt angreifen. Einmal pro Zug: Lenke das Ziel eines gegnerischen Angriffs auf diese Karte um.' },
    gamabunta_koenig: { kind:'ninja', name:'Gamabunta – Kröten-König', level:7, atk:2400, def:2000, attr:'feuer', emoji:'🐸', rarity:'SR', tribe:'kroete', tribeTribute:'kroete',
                   effect:{ t:'bounce_enemy_per_turn' },
                   desc:'Tribut-Beschwörung: Erfordert 2 KRÖTEN als Tribut. Einmal pro Zug: Wirf 1 Handkarte ab, um 1 gegnerisches Ninja auf die Hand zurückzugeben.' },
    kroeten_ruf: { kind:'jutsu', sub:'normal', name:'Kuchiyose no Jutsu: Kröten-Ruf', emoji:'🐸', rarity:'SR',
                   effect:{ t:'sp_summon_hand_tribe', tribe:'kroete', drawIf:'jiraiya' },
                   desc:'Beschwöre 1 Kröte aus deiner Hand als Spezialbeschwörung. Kontrollierst du einen Jiraiya: Ziehe 1 Karte.' },
    rasengan_eremit: { kind:'jutsu', sub:'equip', name:'Rasengan (Eremit)', emoji:'🌀', rarity:'R',
                   effect:{ t:'equip', atk:800, tribeId:'jiraiya_eremit', burnOnKill:400 },
                   desc:'Ausrüstung nur für „Jiraiya – Der Reise-Eremit": +800 ANG. Zerstört er ein Ninja durch Kampf: 400 Schaden für den Gegner.' },
    yomi_numa:   { kind:'jutsu', sub:'dauer', name:'Sumpf der Unterwelt (Yomi Numa)', emoji:'🕳️', rarity:'SR',
                   effect:{ t:'cont_weaken_all', v:300, coinNegate:1 },
                   desc:'DAUER-KARTE: Alle gegnerischen Ninja verlieren 300 ANG/VERT. Greift eines an: Münzwurf — bei Kopf wird der Angriff abgebrochen.' },
    kroeten_magen: { kind:'jutsu', sub:'normal', name:'Ninjutsu-Rolle: Kröten-Magen', emoji:'📜', rarity:'SR',
                   effect:{ t:'lock_monster', turns:2 },
                   desc:'1 gegnerisches Ninja kann 2 Züge lang weder angreifen noch seine Effekte nutzen.' },
    kroeten_schild: { kind:'falle', trigger:'attack', name:'Kröten-Schild', emoji:'🛡️', rarity:'N',
                   effect:{ t:'negate_attack_tribe', tribe:'kroete', idPrefix:'jiraiya' },
                   desc:'FALLE: Wenn der Gegner angreift und du eine Kröte oder einen Jiraiya kontrollierst: Annulliere den Angriff.' },
    hartschaum:  { kind:'falle', trigger:'summon', name:'Kunst des Hartschaum-Haars (Ranjishioryū)', emoji:'🦁', rarity:'SR',
                   effect:{ t:'weaken_summoned', v:500, dmg:300 },
                   desc:'FALLE: Wenn der Gegner ein Ninja beschwört: Es verliert dauerhaft 500 ANG und der Gegner erhält 300 Schaden.' },

    /* ===== Iruka-Deck: Akademie & Grundlagen (tribe 'akademie') ===== */
    iruka_lehrer: { kind:'ninja', name:'Iruka – Leidenschaftlicher Lehrer', level:4, atk:1300, def:1400, attr:'wasser', emoji:'🎓', rarity:'SR', tribe:'akademie',
                   effects:[ { t:'aura_tribe', tribe:'akademie', atk:300, def:300 }, { t:'ally_summon_draw', tribe:'akademie', n:1 } ],
                   desc:'Alle anderen Akademie-Ninja auf deiner Feldseite erhalten +300 ANG/VERT. Wird ein Akademie-Ninja beschworen: Ziehe 1 Karte.' },
    schueler_naruto: { kind:'ninja', name:'Naruto – Klassenclown', level:2, atk:800, def:500, attr:'wind', emoji:'🍥', rarity:'N', tribe:'akademie',
                   effect:{ t:'boost_self_per_turn', v:600 },
                   desc:'Einmal pro Zug: Wirf 1 Handkarte ab — diese Karte erhält bis Zugende +600 ANG.' },
    schuelerin_sakura: { kind:'ninja', name:'Sakura – Akademie-Strategin', level:2, atk:600, def:1000, attr:'erde', emoji:'🌸', rarity:'R', tribe:'akademie',
                   effect:{ t:'def_boost_ally_on_summon', v:400 },
                   desc:'Wenn diese Karte beschworen wird: Dein verbündetes Ninja mit der niedrigsten VERT erhält dauerhaft +400 VERT.' },
    mizuki:        { kind:'ninja', name:'Mizuki – Manipulativer Chūnin', level:4, atk:1600, def:900, attr:'finsternis', emoji:'🎭', rarity:'R', tribe:'akademie',
                   effect:{ t:'summon_sick_if', idPrefix:'iruka_lehrer' },
                   desc:'Kann in dem Zug, in dem er beschworen wurde, nicht angreifen, solange du „Iruka – Leidenschaftlicher Lehrer" kontrollierst. (Seine Zweifel bremsen ihn.)' },
    bunshin_token: { kind:'ninja', name:'Bunshin-Doppelgänger', level:1, atk:0, def:0, attr:'wind', emoji:'👤', rarity:'N',
                   token:true, effect:{ t:'taunt' },
                   desc:'Ein trügerisches Abbild. Gegnerische Ninja müssen zuerst diese Karte angreifen.' },
    bunshin_jutsu: { kind:'jutsu', sub:'normal', name:'Doppelgänger-Jutsu (Bunshin)', emoji:'👥', rarity:'R',
                   effect:{ t:'token', id:'bunshin_token', n:1 },
                   desc:'Beschwöre 1 „Bunshin-Doppelgänger" (0/0). Gegnerische Ninja müssen zuerst den Doppelgänger angreifen.' },
    shuriken_wurf: { kind:'jutsu', sub:'normal', name:'Großes Shuriken-Werfen', emoji:'🎯', rarity:'N',
                   effect:{ t:'weaken_monster', v:600, vIf:{ idPrefix:'iruka_lehrer', v:900 } },
                   desc:'1 gegnerisches Ninja verliert dauerhaft 600 ANG. Kontrollierst du „Iruka – Leidenschaftlicher Lehrer": stattdessen 900.' },
    akademie_unterricht: { kind:'jutsu', sub:'normal', name:'Akademie-Unterricht', emoji:'📖', rarity:'R',
                   effect:{ t:'search', tribe:'akademie' },
                   desc:'Nimm 1 Akademie-Ninja aus deinem Deck auf die Hand.' },
    henge_jutsu:   { kind:'jutsu', sub:'normal', name:'Verwandlungs-Jutsu (Henge)', emoji:'🪞', rarity:'N',
                   effect:{ t:'swap_stats' },
                   desc:'Tausche bis zum Ende des Zugs die ANG und VERT eines deiner Ninja.' },
    kawarimi_klassik: { kind:'falle', trigger:'attack', name:'Tausch-Jutsu (Kawarimi)', emoji:'🍃', rarity:'N',
                   effect:{ t:'negate_and_bounce_target' },
                   desc:'FALLE: Wenn dein Ninja angegriffen wird: Annulliere den Angriff und gib das angegriffene Ninja auf deine Hand zurück.' },
    beschuetzer_koerper: { kind:'falle', trigger:'attack', name:'Beschützender Körper', emoji:'🤲', rarity:'R',
                   effect:{ t:'negate_attack_tribe', tribe:'akademie', weakenPrefix:'iruka_lehrer', weakenV:200 },
                   desc:'FALLE: Wenn der Gegner angreift und du einen Akademie-Ninja kontrollierst: Annulliere den Angriff. Dein „Iruka – Leidenschaftlicher Lehrer" verliert dabei 200 ANG.' },

    /* ===== Kotei-Deck: Ichiraku-Ramen (tribe 'ramen') — Einstiegs-Spaß ===== */
    teuchi_ramen: { kind:'ninja', name:'Teuchi – Ramen-Meister', level:4, atk:1200, def:1000, attr:'erde', emoji:'🍜', rarity:'R', tribe:'ramen',
                   effect:{ t:'heal_on_summon', v:500 },
                   desc:'Wenn diese Karte beschworen wird: Stelle 500 LP wieder her.' },
    ayame_service: { kind:'ninja', name:'Ayame – Freundliche Bedienung', level:2, atk:700, def:600, attr:'feuer', emoji:'🍥', rarity:'N', tribe:'ramen',
                   effect:{ t:'draw_on_summon', n:1 },
                   desc:'Wenn diese Karte beschworen wird: Ziehe 1 Karte.' },
    choji_stammgast: { kind:'ninja', name:'Chōji – Stammgast', level:3, atk:1400, def:700, attr:'erde', emoji:'🥊', rarity:'N', tribe:'ramen',
                   effect:null, desc:'Sein Stammplatz bei Ichiraku ist heilig. Wer ihm die letzte Schüssel wegnimmt, bezahlt dafür.' },
    kotei_boss:  { kind:'ninja', name:'Kotei – Ramen-Champion', level:5, atk:1900, def:1200, attr:'feuer', emoji:'🍜', rarity:'SR', tribe:'ramen',
                   effect:{ t:'boost_self_on_summon', v:300 },
                   desc:'Wenn diese Karte beschworen wird: Sie erhält dauerhaft +300 ANG.' },
    ichiraku_ramen: { kind:'jutsu', sub:'schnell', name:'Ichiraku-Ramen', emoji:'🍜', rarity:'R',
                   effect:{ t:'boost_temp', v:500, heal:300 },
                   desc:'SCHNELL: 1 deiner Ninja erhält +500 ANG bis Zugende. Stelle 300 LP wieder her.' },
    scharfe_suppe: { kind:'jutsu', sub:'normal', name:'Extra scharfe Suppe', emoji:'🌶️', rarity:'N',
                   effect:{ t:'dmg', v:400 },
                   desc:'Füge dem Gegner 400 Schaden zu.' },
    grosse_portion: { kind:'jutsu', sub:'normal', name:'Große Portion', emoji:'🥣', rarity:'R',
                   effect:{ t:'draw', n:1, heal:500 },
                   desc:'Ziehe 1 Karte und stelle 500 LP wieder her.' },
    endloser_nachschlag: { kind:'jutsu', sub:'normal', name:'Endloser Nachschlag', emoji:'♾️', rarity:'R',
                   effect:{ t:'draw_per_monster', cap:2 },
                   desc:'Ziehe 1 Karte pro eigenem Ninja (max. 2).' },
    verdauungspause: { kind:'falle', trigger:'attack', name:'Verdauungspause', emoji:'😴', rarity:'N',
                   effect:{ t:'negate_attack' },
                   desc:'FALLE: Annulliere einen Angriff und beende die Kampfphase.' },
    scharfes_comeback: { kind:'falle', trigger:'attack', name:'Scharfes Comeback', emoji:'🌶️', rarity:'R',
                   effect:{ t:'weaken_attacker', v:500 },
                   desc:'FALLE: Wenn der Gegner angreift: Der Angreifer verliert dauerhaft 500 ANG.' },

    /* ===== Genji-Deck: Dojo & Taijutsu (tribe 'taijutsu') ===== */
    rock_lee: { kind:'ninja', name:'Rock Lee', level:2, atk:800, def:600, attr:'erde', emoji:'🥋', rarity:'N', tribe:'taijutsu',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Ein Genin ohne Talent für Ninjutsu — dafür mit eisernem Fleiß. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    tenten_waffen: { kind:'ninja', name:'Tenten – Waffen-Ninja', level:2, atk:600, def:700, attr:'erde', emoji:'🤼', rarity:'N', tribe:'taijutsu',
                   effect:{ t:'on_battle_destroy_summon', id:'might_guy' },
                   desc:'Meisterin der Waffen-Schriftrollen. Wenn diese Karte durch KAMPF zerstört wird: Beschwöre 1 „Might Guy" aus deinem Deck.' },
    might_guy: { kind:'ninja', name:'Might Guy', level:4, atk:1500, def:1000, attr:'erde', emoji:'🥊', rarity:'R', tribe:'taijutsu',
                   effect:{ t:'aura_self_tribe', v:300, tribe:'taijutsu' },
                   desc:'Konohas Grünes Ungeheuer! Erhält +300 ANG, solange ein anderer Taijutsu-Ninja offen auf deiner Feldseite liegt.' },
    might_guy_sensei: { kind:'ninja', name:'Might Guy – Sensei', level:5, atk:2000, def:1300, attr:'erde', emoji:'🥋', rarity:'SR', tribe:'taijutsu',
                   effect:{ t:'double_attack' },
                   desc:'Kann in jeder Kampfphase zweimal angreifen. „Die Flamme der Jugend brennt ewig!"' },
    hartes_training: { kind:'jutsu', sub:'normal', name:'Hartes Training', emoji:'💪', rarity:'R',
                   effect:{ t:'boost_perm', v:400, costLP:300 },
                   desc:'Zahle 300 LP: 1 deiner Ninja erhält dauerhaft +400 ANG.' },
    konoha_senpuu: { kind:'jutsu', sub:'schnell', name:'Konoha-Senpū', emoji:'🌀', rarity:'R',
                   effect:{ t:'boost_temp', v:500, piercing:true },
                   desc:'SCHNELL: 1 deiner Ninja erhält +500 ANG und Durchdringung bis Zugende.' },
    lees_training: { kind:'jutsu', sub:'normal', name:'Lees Training', emoji:'🏯', rarity:'R',
                   effect:{ t:'draw_per_monster', cap:2 },
                   desc:'Ziehe 1 Karte pro eigenem Ninja (max. 2). „500 Kniebeugen — fangen wir an!"' },
    gouken: { kind:'jutsu', sub:'normal', name:'Gōken – Starke Faust', emoji:'👊', rarity:'SR',
                   effect:{ t:'grant_double_attack' },
                   desc:'1 deiner Ninja kann in diesem Zug zweimal angreifen.' },
    suiken: { kind:'falle', trigger:'attack', name:'Suiken – Betrunkene Faust', emoji:'🤸', rarity:'N',
                   effect:{ t:'negate_attack' },
                   desc:'FALLE: Annulliere einen Angriff und beende die Kampfphase.' },
    kage_buyou: { kind:'falle', trigger:'attack', name:'Kage Buyō', emoji:'👊', rarity:'N',
                   effect:{ t:'weaken_attacker', v:400 },
                   desc:'FALLE: Wenn der Gegner angreift: Der Angreifer verliert dauerhaft 400 ANG.' },

    /* ===== Sasuke-Deck: Uchiha-Ehrgeiz (tribe 'uchiha') ===== */
    sasuke_akademie: { kind:'ninja', name:'Sasuke – Akademie', level:2, atk:900, def:600, attr:'feuer', emoji:'🦅', rarity:'N', tribe:'uchiha',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Jahrgangsbester der Akademie. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    shisui_uchiha: { kind:'ninja', name:'Shisui – Uchiha-Talent', level:3, atk:1300, def:700, attr:'feuer', emoji:'🔥', rarity:'N', tribe:'uchiha',
                   effect:null, desc:'„Shisui der Teleportation" — das größte Talent des Uchiha-Clans.' },
    sasuke_genin: { kind:'ninja', name:'Sasuke – Genin', level:4, atk:1500, def:1000, attr:'feuer', emoji:'⚡', rarity:'R', tribe:'uchiha',
                   effect:{ t:'dmg_on_summon', v:300 },
                   desc:'Wenn diese Karte beschworen wird: Füge dem Gegner 300 Schaden zu (Katon!).' },
    sasuke_fluchmal: { kind:'ninja', name:'Sasuke – Fluchmal', level:6, atk:2200, def:1400, attr:'finsternis', emoji:'⚡', rarity:'SR', tribe:'uchiha',
                   effects:[ { t:'piercing' }, { t:'boost_self_on_summon', v:200 } ],
                   desc:'Durchdringung. Wenn diese Karte beschworen wird: Sie erhält dauerhaft +200 ANG.' },
    goukakyuu:   { kind:'jutsu', sub:'normal', name:'Katon: Gōkakyū no Jutsu', emoji:'🔥', rarity:'R',
                   effect:{ t:'dmg', v:600 },
                   desc:'Füge dem Gegner 600 Schaden zu.' },
    chidori:     { kind:'jutsu', sub:'equip', name:'Chidori', emoji:'⚡', rarity:'SR',
                   effect:{ t:'equip', atk:700, piercing:true, tribeId:'sasuke_genin' },
                   desc:'Ausrüstung nur für „Sasuke – Genin": +700 ANG und Durchdringung.' },
    sharingan_blick: { kind:'jutsu', sub:'normal', name:'Sharingan-Blick', emoji:'👁️', rarity:'R',
                   effect:{ t:'lock_monster', turns:2 },
                   desc:'1 gegnerisches Ninja kann 2 Züge lang weder angreifen noch seine Effekte nutzen.' },
    shuriken_kage: { kind:'jutsu', sub:'normal', name:'Shuriken Kage Bunshin', emoji:'🌀', rarity:'N',
                   effect:{ t:'weaken_monster', v:500 },
                   desc:'1 gegnerisches Ninja verliert dauerhaft 500 ANG.' },
    uchiha_kawarimi: { kind:'falle', trigger:'attack', name:'Kawarimi des Uchiha', emoji:'🍃', rarity:'N',
                   effect:{ t:'negate_attack_tribe', tribe:'uchiha' },
                   desc:'FALLE: Wenn der Gegner angreift und du einen Uchiha-Ninja kontrollierst: Annulliere den Angriff.' },
    feuer_versteck: { kind:'falle', trigger:'summon', name:'Feuer-Versteck', emoji:'🔥', rarity:'R',
                   effect:{ t:'weaken_summoned', v:400, dmg:300 },
                   desc:'FALLE: Wenn der Gegner ein Ninja beschwört: Es verliert dauerhaft 400 ANG und der Gegner erhält 300 Schaden.' },

    /* ===== Gaara-Deck: Absolute Verteidigung (tribe 'suna') ===== */
    baki_suna: { kind:'ninja', name:'Baki – Suna-Jonin', level:2, atk:900, def:1200, attr:'erde', emoji:'🏜️', rarity:'N', tribe:'suna',
                   effect:null, desc:'Jonin aus Sunagakure und Mentor der Sand-Geschwister.' },
    matsuri_suna: { kind:'ninja', name:'Matsuri – Sand-Schülerin', level:3, atk:1100, def:900, attr:'wind', emoji:'🌪️', rarity:'N', tribe:'suna',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Gaaras treueste Schülerin. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    kankuro_marionette: { kind:'ninja', name:'Kankurō – Marionetten-Meister', level:4, atk:1500, def:1300, attr:'erde', emoji:'🎎', rarity:'R', tribe:'suna',
                   effect:{ t:'aura_self_tribe', v:300, tribe:'suna' },
                   desc:'Erhält +300 ANG, solange ein anderer Suna-Ninja offen auf deiner Feldseite liegt.' },
    temari_wind: { kind:'ninja', name:'Temari – Fächer-Sturm', level:4, atk:1600, def:1000, attr:'wind', emoji:'🌬️', rarity:'R', tribe:'suna',
                   effect:{ t:'weaken_on_summon', v:300 },
                   desc:'Wenn diese Karte beschworen wird: Das stärkste gegnerische Ninja verliert dauerhaft 300 ANG.' },
    gaara_wueste: { kind:'ninja', name:'Gaara – Sand-Verteidigung', level:5, atk:1800, def:2500, attr:'erde', emoji:'🏜️', rarity:'SR', tribe:'suna',
                   effects:[ { t:'no_direct' }, { t:'attack_redirect' } ],
                   desc:'Kann nicht direkt angreifen. Einmal pro Zug: Lenke das Ziel eines gegnerischen Angriffs auf diese Karte um.' },
    sand_sarg:   { kind:'jutsu', sub:'normal', name:'Sand-Sarg', emoji:'⚱️', rarity:'R',
                   effect:{ t:'lock_monster', turns:2 },
                   desc:'1 gegnerisches Ninja kann 2 Züge lang weder angreifen noch seine Effekte nutzen.' },
    sandsturm:   { kind:'jutsu', sub:'normal', name:'Sandsturm', emoji:'🌪️', rarity:'R',
                   effect:{ t:'weaken_all', v:300 },
                   desc:'Alle gegnerischen Ninja verlieren dauerhaft 300 ANG.' },
    sand_welle:  { kind:'jutsu', sub:'normal', name:'Sand-Welle', emoji:'🌊', rarity:'N',
                   effect:{ t:'pos_change' },
                   desc:'Bringe 1 gegnerisches Ninja in Verteidigungsposition.' },
    suna_yoroi: { kind:'jutsu', sub:'normal', name:'Suna no Yoroi', emoji:'🛡️', rarity:'R',
                   effect:{ t:'protect' },
                   desc:'1 deiner Ninja ist in diesem Zug vor Effekt-Zerstörung geschützt.' },
    sand_mauer:  { kind:'falle', trigger:'attack', name:'Sand-Mauer', emoji:'🧱', rarity:'N',
                   effect:{ t:'negate_attack' },
                   desc:'FALLE: Annulliere einen Angriff und beende die Kampfphase.' },
    sand_falle:  { kind:'falle', trigger:'attack', name:'Sand-Falle', emoji:'🕳️', rarity:'N',
                   effect:{ t:'weaken_attacker', v:400 },
                   desc:'FALLE: Wenn der Gegner angreift: Der Angreifer verliert dauerhaft 400 ANG.' },

    /* ===== Kakashi-Deck: Der Kopier-Ninja (tribe 'kopier') ===== */
    pakkun_ninken: { kind:'ninja', name:'Pakkun – Ninken-Spürhund', level:2, atk:600, def:600, attr:'erde', emoji:'🐕', rarity:'N', tribe:'kopier',
                   effect:{ t:'on_battle_destroy_summon', id:'kakashi_jonin' },
                   desc:'Wenn diese Karte durch KAMPF zerstört wird: Beschwöre 1 „Kakashi – Jonin" aus deinem Deck.' },
    ninken_rudel: { kind:'ninja', name:'Ninken-Rudel', level:3, atk:1300, def:900, attr:'erde', emoji:'🐺', rarity:'N', tribe:'kopier',
                   effect:{ t:'token', n:1 },
                   desc:'Wenn diese Karte beschworen wird: Beschwöre 1 „Schattendoppelgänger".' },
    kakashi_jonin: { kind:'ninja', name:'Kakashi – Jonin', level:4, atk:1600, def:1200, attr:'blitz', emoji:'📕', rarity:'R', tribe:'kopier',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    kakashi_raikiri: { kind:'ninja', name:'Kakashi – Raikiri', level:5, atk:2200, def:1400, attr:'blitz', emoji:'⚡', rarity:'SR', tribe:'kopier',
                   effect:{ t:'piercing' },
                   desc:'Durchdringung: Überschüssiger Kampfschaden trifft die LP.' },
    raikiri_jutsu: { kind:'jutsu', sub:'equip', name:'Raikiri', emoji:'⚡', rarity:'SR',
                   effect:{ t:'equip', atk:800, piercing:true, tribeId:'kakashi_raikiri' },
                   desc:'Ausrüstung nur für „Kakashi – Raikiri": +800 ANG und Durchdringung.' },
    suiton_drache: { kind:'jutsu', sub:'normal', name:'Suiton: Wasserdrache', emoji:'🐉', rarity:'R',
                   effect:{ t:'destroy_monster_max', maxAtk:1900 },
                   desc:'Zerstöre 1 gegnerisches Ninja mit höchstens 1900 ANG.' },
    erdriss:     { kind:'jutsu', sub:'normal', name:'Erdriss', emoji:'🌋', rarity:'R',
                   effect:{ t:'flip_down' },
                   desc:'Lege 1 offenes Ninja verdeckt (Tokens ausgenommen).' },
    sharingan_kopie: { kind:'jutsu', sub:'normal', name:'Sharingan – Kopie-Jutsu', emoji:'📖', rarity:'R',
                   effect:{ t:'search', maxLevel:4 },
                   desc:'Nimm 1 Ninja der Stufe 4 oder niedriger aus deinem Deck auf die Hand.' },
    sharingan_konter: { kind:'falle', trigger:'jutsu', name:'Sharingan – Konter', emoji:'🪞', rarity:'SR',
                   effect:{ t:'negate_spell' },
                   desc:'FALLE: Wenn der Gegner ein Jutsu aktiviert: Annulliere es.' },
    ninken_falle: { kind:'falle', trigger:'attack', name:'Ninken-Hinterhalt', emoji:'🐾', rarity:'N',
                   effect:{ t:'negate_and_bounce_target' },
                   desc:'FALLE: Wenn dein Ninja angegriffen wird: Annulliere den Angriff und gib das angegriffene Ninja auf deine Hand zurück.' },

    /* ===== Aya-Deck: Fallen-Expertin (tribe 'fallensteller') — 10/3/7 ===== */
    shikadai_nara: { kind:'ninja', name:'Shikadai – Nara-Stratege', level:2, atk:800, def:700, attr:'erde', emoji:'🪤', rarity:'N', tribe:'fallensteller',
                   effect:{ t:'on_normal_search_jutsu', kind2:'falle' },
                   desc:'Wenn diese Karte NORMAL beschworen wird: Nimm 1 FALLENKARTE aus deinem Deck auf die Hand.' },
    anko_prueferin: { kind:'ninja', name:'Anko – Prüferin', level:3, atk:1400, def:800, attr:'feuer', emoji:'💣', rarity:'N', tribe:'fallensteller',
                   effect:{ t:'dmg_on_summon', v:300 },
                   desc:'Die Prüferin der Chūnin-Auswahl liebt Fallen aller Art. Wenn diese Karte beschworen wird: Füge dem Gegner 300 Schaden zu.' },
    shikamaru_stratege: { kind:'ninja', name:'Shikamaru – Stratege', level:4, atk:1400, def:1200, attr:'wind', emoji:'🕸️', rarity:'R', tribe:'fallensteller',
                   effect:{ t:'flip_draw', n:1 },
                   desc:'FLIP: Ziehe 1 Karte. „Wie lästig … aber ich habe einen Plan."' },
    aya_meisterin: { kind:'ninja', name:'Aya – Fallen-Meisterin', level:5, atk:2100, def:1500, attr:'wind', emoji:'🎯', rarity:'SR', tribe:'fallensteller',
                   effect:{ t:'destroy_st_on_summon', n:1 },
                   desc:'Wenn diese Karte beschworen wird: Zerstöre 1 gegnerische Jutsu- oder Fallenkarte.' },
    kagemane_jutsu:   { kind:'jutsu', sub:'normal', name:'Kagemane no Jutsu', emoji:'🕸️', rarity:'R',
                   effect:{ t:'lock_monster', turns:2 },
                   desc:'1 gegnerisches Ninja kann 2 Züge lang weder angreifen noch seine Effekte nutzen.' },
    entschaerfen: { kind:'jutsu', sub:'normal', name:'Entschärfen', emoji:'✂️', rarity:'R',
                   effect:{ t:'destroy_st' },
                   desc:'Zerstöre 1 gegnerische Jutsu- oder Fallenkarte.' },
    kibaku_fuda: { kind:'falle', trigger:'attack', name:'Kibaku Fuda – Explosions-Tag', emoji:'💥', rarity:'R',
                   effect:{ t:'destroy_attacker' },
                   desc:'FALLE: Wenn der Gegner angreift: Zerstöre den Angreifer.' },
    chakra_reflexion: { kind:'falle', trigger:'attack', name:'Chakra-Reflexion', emoji:'🌀', rarity:'SR',
                   effect:{ t:'magic_cylinder' },
                   desc:'FALLE: Annulliere einen Angriff; der Gegner erhält Schaden in Höhe der ANG seines Angreifers.' },
    wasserspiegel: { kind:'falle', trigger:'attack', name:'Wasserspiegel', emoji:'🪞', rarity:'SR',
                   effect:{ t:'mirror_force' },
                   desc:'FALLE: Wenn der Gegner angreift: Zerstöre alle seine Ninja in Angriffsposition.' },
    kunai_hagel: { kind:'falle', trigger:'attack', name:'Kunai-Hagel', emoji:'🗡️', rarity:'N',
                   effect:{ t:'weaken_attacker', v:400 },
                   desc:'FALLE: Wenn der Gegner angreift: Der Angreifer verliert dauerhaft 400 ANG.' },
    ketten_fesseln: { kind:'falle', trigger:'attack', name:'Ketten-Fesseln', emoji:'⛓️', rarity:'R',
                   effect:{ t:'negate_and_lock' },
                   desc:'FALLE: Annulliere einen Angriff; der Angreifer kann 2 Züge lang nicht angreifen.' },

    /* ===== Orochimaru-Deck: Schlangen von Oto (tribe 'oto') ===== */
    schlangen_token: { kind:'ninja', name:'Schlangen-Brut', level:1, atk:300, def:300, attr:'finsternis', emoji:'🐍', rarity:'N',
                   token:true, effect:null, desc:'Eine junge Schlange aus Orochimarus Brut.' },
    oto_ninja:   { kind:'ninja', name:'Oto-Ninja', level:2, atk:800, def:600, attr:'finsternis', emoji:'🎵', rarity:'N', tribe:'oto',
                   effect:{ t:'on_battle_destroy_summon', id:'zaku_oto' },
                   desc:'Wenn diese Karte durch KAMPF zerstört wird: Beschwöre 1 „Zaku – Schall-Schütze" aus deinem Deck.' },
    zaku_oto: { kind:'ninja', name:'Zaku – Schall-Schütze', level:3, atk:1400, def:700, attr:'finsternis', emoji:'🐍', rarity:'N', tribe:'oto',
                   effect:{ t:'piercing' },
                   desc:'Kämpft mit Schallkanonen in den Armen. Durchdringung.' },
    kabuto_assistent: { kind:'ninja', name:'Kabuto – Assistent', level:4, atk:1600, def:1100, attr:'finsternis', emoji:'🐍', rarity:'R', tribe:'oto',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Orochimarus rechte Hand. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    manda:       { kind:'ninja', name:'Manda – Riesenschlange', level:6, atk:2200, def:1800, attr:'finsternis', emoji:'🐍', rarity:'SR', tribe:'oto',
                   effect:{ t:'destroy_weakest_on_summon' },
                   desc:'Wenn diese Karte beschworen wird: Zerstöre das schwächste gegnerische Ninja.' },
    orochimaru_sannin: { kind:'ninja', name:'Orochimaru – Sannin', level:7, atk:2500, def:1900, attr:'finsternis', emoji:'🐍', rarity:'UR', tribe:'oto', tribeTribute:'oto',
                   effect:{ t:'per_turn_summon', from:'token', id:'schlangen_token' },
                   desc:'Tribut-Beschwörung: Erfordert 2 OTO-Ninja als Tribut. Einmal pro Zug (Zugbeginn): Beschwöre 1 „Schlangen-Brut".' },
    edo_tensei_jutsu: { kind:'jutsu', sub:'normal', name:'Edo Tensei', emoji:'⚰️', rarity:'SR',
                   effect:{ t:'revive' },
                   desc:'Beschwöre 1 Ninja aus deinem Friedhof als Spezialbeschwörung.' },
    schlangenbiss: { kind:'jutsu', sub:'normal', name:'Schlangenbiss', emoji:'🦷', rarity:'R',
                   effect:{ t:'drain' },
                   desc:'Halbiere die ANG des stärksten gegnerischen Ninja als Schaden und heile dich um denselben Wert.' },
    schlangenhaut: { kind:'jutsu', sub:'normal', name:'Schlangenhaut', emoji:'🐍', rarity:'R',
                   effect:{ t:'protect' },
                   desc:'1 deiner Ninja ist in diesem Zug vor Effekt-Zerstörung geschützt.' },
    weisse_schlange: { kind:'jutsu', sub:'normal', name:'Weiße Schlange', emoji:'🤍', rarity:'R',
                   effect:{ t:'search', tribe:'oto' },
                   desc:'Nimm 1 Oto-Ninja aus deinem Deck auf die Hand.' },
    schlangengrube: { kind:'falle', trigger:'attack', name:'Schlangengrube', emoji:'🕳️', rarity:'R',
                   effect:{ t:'destroy_attacker' },
                   desc:'FALLE: Wenn der Gegner angreift: Zerstöre den Angreifer.' },
    mandas_zorn: { kind:'falle', trigger:'summon', name:'Mandas Zorn', emoji:'🐍', rarity:'R',
                   effect:{ t:'weaken_summoned', v:500, dmg:300 },
                   desc:'FALLE: Wenn der Gegner ein Ninja beschwört: Es verliert dauerhaft 500 ANG und der Gegner erhält 300 Schaden.' },

    /* ===== Daigo-Deck: Jonin-Elite (tribe 'jonin') ===== */
    kotetsu_jonin: { kind:'ninja', name:'Kotetsu – Jonin', level:3, atk:1500, def:900, attr:'feuer', emoji:'🔥', rarity:'N', tribe:'jonin',
                   effect:null, desc:'Wachtmeister von Konoha, unzertrennlich von Izumo.' },
    genma_jonin: { kind:'ninja', name:'Genma – Veteran', level:4, atk:1800, def:1200, attr:'erde', emoji:'⚔️', rarity:'R', tribe:'jonin',
                   effect:null, desc:'Tokubetsu-Jonin mit Senbon im Mund und vielen Missionen hinter sich.' },
    shikaku_taktiker: { kind:'ninja', name:'Shikaku – Taktiker', level:4, atk:1500, def:1300, attr:'feuer', emoji:'🔥', rarity:'R', tribe:'jonin',
                   effect:{ t:'aura_atk', v:200 },
                   desc:'Oberbefehlshaber der Konoha-Streitkräfte. Alle deine offenen Ninja erhalten +200 ANG.' },
    asuma_jonin: { kind:'ninja', name:'Asuma – Jonin-Kommandant', level:6, atk:2400, def:1600, attr:'feuer', emoji:'🔥', rarity:'SR', tribe:'jonin',
                   effects:[ { t:'piercing' }, { t:'aura_atk', v:200 } ],
                   desc:'Ehemaliger Wächter-Ninja der Zwölf. Durchdringung. Alle deine offenen Ninja erhalten +200 ANG.' },
    hachimon_kai: { kind:'jutsu', sub:'normal', name:'Hachimon Tonkō – Tor-Öffnung', emoji:'🚪', rarity:'SR',
                   effect:{ t:'limiter' },
                   desc:'Verdopple die ANG eines deiner Ninja bis Zugende. Am Zugende wird es zerstört.' },
    konoha_wirbel: { kind:'jutsu', sub:'normal', name:'Konoha-Wirbel', emoji:'🌪️', rarity:'R',
                   effect:{ t:'destroy_defense_monster' },
                   desc:'Zerstöre 1 gegnerisches Ninja in Verteidigungsposition.' },
    shunshin:    { kind:'jutsu', sub:'normal', name:'Shunshin no Jutsu', emoji:'💨', rarity:'R',
                   effect:{ t:'direct_attack' },
                   desc:'1 deiner Ninja darf in diesem Zug direkt angreifen.' },
    kunai_sturm: { kind:'jutsu', sub:'normal', name:'Kunai-Sturm', emoji:'🗡️', rarity:'R',
                   effect:{ t:'weaken_all', v:300 },
                   desc:'Alle gegnerischen Ninja verlieren dauerhaft 300 ANG.' },
    jonin_reflex: { kind:'falle', trigger:'attack', name:'Jonin-Reflexe', emoji:'⚡', rarity:'N',
                   effect:{ t:'negate_attack' },
                   desc:'FALLE: Annulliere einen Angriff und beende die Kampfphase.' },
    kunai_falle: { kind:'falle', trigger:'summon', name:'Kunai-Falle', emoji:'🗡️', rarity:'R',
                   effect:{ t:'weaken_summoned', v:400, dmg:300 },
                   desc:'FALLE: Wenn der Gegner ein Ninja beschwört: Es verliert dauerhaft 400 ANG und der Gegner erhält 300 Schaden.' },

    /* ===== Itachi-Deck: Genjutsu & Schwarzes Feuer (tribe 'akatsuki') — BOSS ===== */
    kisame_hoshigaki: { kind:'ninja', name:'Kisame – Hoshigaki', level:2, atk:900, def:700, attr:'finsternis', emoji:'🎴', rarity:'N', tribe:'akatsuki',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Das Ungeheuer des Nebels, Itachis Partner. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    karasu_bote: { kind:'ninja', name:'Karasu – Krähenbote', level:3, atk:1200, def:800, attr:'finsternis', emoji:'🐦', rarity:'N', tribe:'akatsuki',
                   effect:{ t:'token', n:1 },
                   desc:'Wenn diese Karte beschworen wird: Beschwöre 1 „Schattendoppelgänger" (Krähenform).' },
    itachi_genjutsu: { kind:'ninja', name:'Itachi – Genjutsu-Blick', level:4, atk:1600, def:1200, attr:'finsternis', emoji:'🌑', rarity:'R', tribe:'akatsuki',
                   effect:{ t:'weaken_on_summon', v:400 },
                   desc:'Wenn diese Karte beschworen wird: Das stärkste gegnerische Ninja verliert dauerhaft 400 ANG.' },
    susanoo_schild: { kind:'ninja', name:'Susanoo – Schild', level:4, atk:800, def:2200, attr:'feuer', emoji:'🛡️', rarity:'R', tribe:'akatsuki',
                   effects:[ { t:'no_direct' }, { t:'attack_redirect' } ],
                   desc:'Kann nicht direkt angreifen. Einmal pro Zug: Lenke das Ziel eines gegnerischen Angriffs auf diese Karte um.' },
    itachi_mangekyou: { kind:'ninja', name:'Itachi – Mangekyō Sharingan', level:7, atk:2500, def:2000, attr:'feuer', emoji:'🌑', rarity:'UR', tribe:'akatsuki',
                   effects:[ { t:'destroy_strongest_on_summon' }, { t:'dmg_on_summon', v:500 } ],
                   desc:'Wenn diese Karte beschworen wird: Zerstöre das stärkste gegnerische Ninja und füge dem Gegner 500 Schaden zu.' },
    amaterasu:   { kind:'jutsu', sub:'normal', name:'Amaterasu – Schwarze Flamme', emoji:'🔥', rarity:'SR',
                   effect:{ t:'destroy_any_monster', dmg:500 },
                   desc:'Zerstöre 1 gegnerisches Ninja und füge dem Gegner 500 Schaden zu.' },
    tsukuyomi:   { kind:'jutsu', sub:'normal', name:'Tsukuyomi', emoji:'🌙', rarity:'SR',
                   effect:{ t:'lock_monster', turns:3 },
                   desc:'1 gegnerisches Ninja kann 3 Züge lang weder angreifen noch seine Effekte nutzen.' },
    katon_itachi: { kind:'jutsu', sub:'normal', name:'Katon: Großer Feuerball', emoji:'🔥', rarity:'R',
                   effect:{ t:'dmg', v:700 },
                   desc:'Füge dem Gegner 700 Schaden zu.' },
    karasu_nebel: { kind:'jutsu', sub:'normal', name:'Krähen-Nebel', emoji:'🌫️', rarity:'R',
                   effect:{ t:'attack_lock', turns:2 },
                   desc:'Der Gegner kann 2 Züge lang nicht angreifen; seine verdeckten Ninja werden aufgedeckt.' },
    genjutsu_spiegel: { kind:'falle', trigger:'attack', name:'Genjutsu-Spiegel', emoji:'🪞', rarity:'SR',
                   effect:{ t:'magic_cylinder' },
                   desc:'FALLE: Annulliere einen Angriff; der Gegner erhält Schaden in Höhe der ANG seines Angreifers.' },
    karasu_taeuschung: { kind:'falle', trigger:'attack', name:'Krähen-Täuschung', emoji:'🐦', rarity:'N',
                   effect:{ t:'negate_attack_tribe', tribe:'akatsuki' },
                   desc:'FALLE: Wenn der Gegner angreift und du einen Akatsuki-Ninja kontrollierst: Annulliere den Angriff.' },

    /* ===== Shizuka-Deck: Corp-Protokoll (tribe 'kagaa') ===== */
    kagaa_wache: { kind:'ninja', name:'Kagā-Wache', level:3, atk:1400, def:1000, attr:'blitz', emoji:'🛂', rarity:'N', tribe:'kagaa',
                   effect:null, desc:'Standardisierte Wache der Kagā-Corp, Dienstgrad C.' },
    kagaa_techniker: { kind:'ninja', name:'Kagā-Techniker', level:2, atk:800, def:800, attr:'blitz', emoji:'🔧', rarity:'N', tribe:'kagaa',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    kagaa_analyst: { kind:'ninja', name:'Kagā-Analyst', level:4, atk:1500, def:1200, attr:'wasser', emoji:'📊', rarity:'R', tribe:'kagaa',
                   effect:{ t:'draw_on_summon', n:1 },
                   desc:'Wenn diese Karte beschworen wird: Ziehe 1 Karte.' },
    shizuka_protokoll: { kind:'ninja', name:'Shizuka – Protokoll-Offizier', level:4, atk:1500, def:1400, attr:'blitz', emoji:'🛂', rarity:'R', tribe:'kagaa',
                   effect:{ t:'aura_def', v:300 },
                   desc:'Alle deine offenen Ninja erhalten +300 VERT.' },
    shizuka_kommandantin: { kind:'ninja', name:'Shizuka – Kommandantin', level:6, atk:2100, def:1900, attr:'blitz', emoji:'🛂', rarity:'SR', tribe:'kagaa',
                   effect:{ t:'destroy_st_on_summon', n:1 },
                   desc:'Wenn diese Karte beschworen wird: Zerstöre 1 gegnerische Jutsu- oder Fallenkarte.' },
    corp_ruestung: { kind:'jutsu', sub:'equip', name:'Kagā-Chakra-Rüstung', emoji:'🦾', rarity:'R',
                   effect:{ t:'equip', atk:600 },
                   desc:'Ausrüstung: Das ausgerüstete Ninja erhält +600 ANG.' },
    daten_analyse: { kind:'jutsu', sub:'normal', name:'Daten-Analyse', emoji:'📈', rarity:'R',
                   effect:{ t:'draw_discard', draw:2, discard:1 },
                   desc:'Ziehe 2 Karten, dann wirf 1 Karte ab.' },
    system_scan: { kind:'jutsu', sub:'normal', name:'System-Scan', emoji:'🔍', rarity:'R',
                   effect:{ t:'destroy_st' },
                   desc:'Zerstöre 1 gegnerische Jutsu- oder Fallenkarte.' },
    neukalibrierung: { kind:'jutsu', sub:'normal', name:'Neukalibrierung', emoji:'♻️', rarity:'N',
                   effect:{ t:'recycle' },
                   desc:'Mische 1 Karte aus deinem Friedhof ins Deck zurück.' },
    corp_sperrung: { kind:'falle', trigger:'attack', name:'Corp-Sperrung', emoji:'🚧', rarity:'N',
                   effect:{ t:'negate_attack' },
                   desc:'FALLE: Annulliere einen Angriff und beende die Kampfphase.' },
    abwehr_protokoll: { kind:'falle', trigger:'attack', name:'Abwehr-Protokoll', emoji:'📋', rarity:'R',
                   effect:{ t:'weaken_attacker', v:500 },
                   desc:'FALLE: Wenn der Gegner angreift: Der Angreifer verliert dauerhaft 500 ANG.' },

    /* ===== Raiga-Deck: Turm-Sicherheit (tribe 'kagaa') — Verteidigung/Kontrolle ===== */
    kagaa_schildwache: { kind:'ninja', name:'Kagā-Schildwache', level:3, atk:1000, def:1600, attr:'erde', emoji:'🛡️', rarity:'N', tribe:'kagaa',
                   effect:null, desc:'Erste Linie des Turms. Rührt sich nicht.' },
    raiga_scout: { kind:'ninja', name:'Raiga – Scout', level:3, atk:1200, def:1000, attr:'wasser', emoji:'🛡️', rarity:'R', tribe:'kagaa',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    kagaa_bollwerk: { kind:'ninja', name:'Kagā-Bollwerk', level:4, atk:900, def:2200, attr:'erde', emoji:'🏢', rarity:'R', tribe:'kagaa',
                   effects:[ { t:'no_direct' }, { t:'attack_redirect' } ],
                   desc:'Kann nicht direkt angreifen. Einmal pro Zug: Lenke das Ziel eines gegnerischen Angriffs auf diese Karte um.' },
    raiga_veteran: { kind:'ninja', name:'Raiga – Sicherheitschef', level:5, atk:2100, def:1700, attr:'wasser', emoji:'🛡️', rarity:'SR', tribe:'kagaa',
                   effect:{ t:'weaken_on_summon', v:500 },
                   desc:'Wenn diese Karte beschworen wird: Das stärkste gegnerische Ninja verliert dauerhaft 500 ANG.' },
    raiga_boss:  { kind:'ninja', name:'Raiga – Letzte Bastion', level:7, atk:2700, def:2200, attr:'erde', emoji:'🛡️', rarity:'UR', tribe:'kagaa',
                   effect:{ t:'battle_immune' },
                   desc:'Kann durch Kampf nicht zerstört werden.' },
    zugriff_verweigert: { kind:'jutsu', sub:'normal', name:'Zugriff verweigert', emoji:'🚫', rarity:'R',
                   effect:{ t:'bounce' },
                   desc:'Gib 1 gegnerisches Ninja auf die Hand des Gegners zurück.' },
    sicherheits_sperre: { kind:'jutsu', sub:'normal', name:'Sicherheits-Sperre', emoji:'🔒', rarity:'R',
                   effect:{ t:'attack_lock', turns:2 },
                   desc:'Der Gegner kann 2 Züge lang nicht angreifen; seine verdeckten Ninja werden aufgedeckt.' },
    festnahme:   { kind:'jutsu', sub:'normal', name:'Festnahme', emoji:'⛓️', rarity:'SR',
                   effect:{ t:'control' },
                   desc:'Übernimm bis Zugende die Kontrolle über 1 gegnerisches Ninja.' },
    tower_shield: { kind:'jutsu', sub:'normal', name:'Tower-Shield', emoji:'🔰', rarity:'N',
                   effect:{ t:'protect' },
                   desc:'1 deiner Ninja ist in diesem Zug vor Effekt-Zerstörung geschützt.' },
    system_breach: { kind:'jutsu', sub:'normal', name:'System-Breach', emoji:'💻', rarity:'R',
                   effect:{ t:'destroy_st' },
                   desc:'Zerstöre 1 gegnerische Jutsu- oder Fallenkarte.' },
    corp_falle:  { kind:'falle', trigger:'attack', name:'Corp-Verbannung', emoji:'🌌', rarity:'SR',
                   effect:{ t:'banish_attacker' },
                   desc:'FALLE: Wenn der Gegner angreift: Verbanne den Angreifer.' },
    eisener_vorhang: { kind:'falle', trigger:'attack', name:'Eiserner Vorhang', emoji:'🚪', rarity:'N',
                   effect:{ t:'negate_attack' },
                   desc:'FALLE: Annulliere einen Angriff und beende die Kampfphase.' },

    /* ===== Kagā-Deck: Echo-Archiv (tribe 'kagaa') — BOSS, UR-Sammlung ===== */
    archiv_kurator: { kind:'ninja', name:'Archiv-Kurator', level:3, atk:1400, def:1000, attr:'licht', emoji:'🏢', rarity:'R', tribe:'kagaa',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    archiv_wache: { kind:'ninja', name:'Archiv-Wache', level:3, atk:1400, def:1200, attr:'licht', emoji:'🏢', rarity:'N', tribe:'kagaa',
                   effect:null, desc:'Bewacht Relikte, deren Namen niemand mehr kennt.' },
    kagaa_direktor: { kind:'ninja', name:'Kagā – Direktor', level:5, atk:2100, def:1600, attr:'licht', emoji:'🏢', rarity:'SR', tribe:'kagaa',
                   effect:{ t:'summon_from', maxLevel:4 },
                   desc:'Wenn diese Karte beschworen wird: Beschwöre 1 Ninja der Stufe 4 oder niedriger aus deinem Deck.' },
    echo_relikt: { kind:'ninja', name:'Echo-Relikt', level:6, atk:2200, def:1800, attr:'finsternis', emoji:'🗿', rarity:'SR', tribe:'kagaa',
                   effect:{ t:'dd_both' },
                   desc:'Nach einem Kampf, an dem diese Karte beteiligt war: Verbanne beide beteiligten Ninja.' },
    kagaa_boss:  { kind:'ninja', name:'Direktor Kagā – Echo-Hüter', level:6, atk:2500, def:2000, attr:'licht', emoji:'🏢', rarity:'UR', tribe:'kagaa',
                   effects:[ { t:'destroy_strongest_on_summon' }, { t:'draw_on_summon', n:1 } ],
                   desc:'Wenn diese Karte beschworen wird: Zerstöre das stärkste gegnerische Ninja und ziehe 1 Karte.' },
    archiv_zugriff: { kind:'jutsu', sub:'normal', name:'Archiv-Zugriff', emoji:'🗄️', rarity:'R',
                   effect:{ t:'search', tribe:'kagaa' },
                   desc:'Nimm 1 Kagā-Ninja aus deinem Deck auf die Hand.' },
    verbotenes_relikt: { kind:'jutsu', sub:'normal', name:'Verbotenes Relikt', emoji:'☠️', rarity:'SR',
                   effect:{ t:'banish_monster' },
                   desc:'Verbanne 1 gegnerisches Ninja.' },
    zeit_siegel: { kind:'jutsu', sub:'normal', name:'Zeit-Siegel', emoji:'⏳', rarity:'R',
                   effect:{ t:'recycle' },
                   desc:'Mische 1 Karte aus deinem Friedhof ins Deck zurück.' },
    archiv_duplikat: { kind:'jutsu', sub:'normal', name:'Archiv-Duplikat', emoji:'📑', rarity:'R',
                   effect:{ t:'token', n:1 },
                   desc:'Beschwöre 1 „Schattendoppelgänger" (Archiv-Kopie).' },
    echo_resonanz: { kind:'jutsu', sub:'normal', name:'Echo-Resonanz', emoji:'📡', rarity:'SR',
                   effect:{ t:'destroy_all_st_enemy' },
                   desc:'Zerstöre alle gegnerischen Jutsu- und Fallenkarten.' },
    archiv_siegel: { kind:'falle', trigger:'summon', name:'Archiv-Siegel', emoji:'🔏', rarity:'SR',
                   effect:{ t:'banish_summoned_min_atk', minAtk:1800 },
                   desc:'FALLE: Wenn der Gegner ein Ninja mit 1800 oder mehr ANG beschwört: Verbanne es.' },
    kagaa_autoritaet: { kind:'falle', trigger:'attack', name:'Kagā-Autorität', emoji:'👑', rarity:'N',
                   effect:{ t:'negate_attack' },
                   desc:'FALLE: Annulliere einen Angriff und beende die Kampfphase.' },

    /* ===== Monolith-Deck: Echo-Wächter (tribe 'echo') — Defensive mit Biss ===== */
    monolith_splitter: { kind:'ninja', name:'Monolith-Splitter', level:2, atk:500, def:1800, attr:'erde', emoji:'🗿', rarity:'N', tribe:'echo',
                   effect:null, desc:'Abgebrochen vom großen Stein — und trotzdem unbeweglich.' },
    echo_waechter_klein: { kind:'ninja', name:'Echo-Wächter', level:3, atk:1300, def:1400, attr:'wasser', emoji:'🗿', rarity:'N', tribe:'echo',
                   effect:null, desc:'Er bewacht den Riss, seit es Zeit gibt.' },
    stein_waechter: { kind:'ninja', name:'Stein-Wächter', level:4, atk:800, def:2300, attr:'erde', emoji:'🗿', rarity:'R', tribe:'echo',
                   effects:[ { t:'no_direct' }, { t:'attack_redirect' } ],
                   desc:'Kann nicht direkt angreifen. Einmal pro Zug: Lenke das Ziel eines gegnerischen Angriffs auf diese Karte um.' },
    echo_rufer: { kind:'ninja', name:'Echo-Rufer', level:4, atk:1400, def:1200, attr:'finsternis', emoji:'🌌', rarity:'R', tribe:'echo',
                   effect:{ t:'token', n:1 },
                   desc:'Wenn diese Karte beschworen wird: Beschwöre 1 „Schattendoppelgänger" (Echo-Fragment).' },
    monolith_koloss: { kind:'ninja', name:'Monolith-Koloss', level:7, atk:2500, def:2500, attr:'erde', emoji:'🗿', rarity:'UR', tribe:'echo', tribeTribute:'echo',
                   effect:{ t:'battle_immune' },
                   desc:'Tribut-Beschwörung: Erfordert 2 ECHO-Ninja als Tribut. Kann durch Kampf nicht zerstört werden.' },
    steinhaut:   { kind:'jutsu', sub:'normal', name:'Steinhaut', emoji:'🪨', rarity:'R',
                   effect:{ t:'boost_perm', v:500, costLP:300 },
                   desc:'Zahle 300 LP: 1 deiner Ninja erhält dauerhaft +500 ANG.' },
    erdbeben:    { kind:'jutsu', sub:'normal', name:'Erdbeben', emoji:'🌋', rarity:'R',
                   effect:{ t:'weaken_all', v:400 },
                   desc:'Alle gegnerischen Ninja verlieren dauerhaft 400 ANG.' },
    versteinerung: { kind:'jutsu', sub:'normal', name:'Versteinerung', emoji:'🗿', rarity:'N',
                   effect:{ t:'flip_down' },
                   desc:'Lege 1 offenes Ninja verdeckt (Tokens ausgenommen).' },
    steinschlag: { kind:'jutsu', sub:'normal', name:'Steinschlag', emoji:'🪨', rarity:'N',
                   effect:{ t:'destroy_st' },
                   desc:'Zerstöre 1 gegnerische Jutsu- oder Fallenkarte.' },
    monolith_erwachen: { kind:'jutsu', sub:'normal', name:'Monolith-Erwachen', emoji:'⛰️', rarity:'SR',
                   effect:{ t:'revive' },
                   desc:'Beschwöre 1 Ninja aus deinem Friedhof als Spezialbeschwörung.' },
    steinmauer:  { kind:'falle', trigger:'attack', name:'Steinmauer', emoji:'🧱', rarity:'N',
                   effect:{ t:'negate_attack' },
                   desc:'FALLE: Annulliere einen Angriff und beende die Kampfphase.' },
    felssturz:   { kind:'falle', trigger:'attack', name:'Felssturz', emoji:'🪨', rarity:'R',
                   effect:{ t:'weaken_attacker', v:600 },
                   desc:'FALLE: Wenn der Gegner angreift: Der Angreifer verliert dauerhaft 600 ANG.' },

    /* ===== Stimmen-Deck: Chor zweier Zeiten (tribe 'echo') — Finsternis/Kontrolle ===== */
    echo_fluesterer: { kind:'ninja', name:'Echo-Flüsterer', level:2, atk:1100, def:700, attr:'finsternis', emoji:'🌌', rarity:'N', tribe:'echo',
                   effect:{ t:'reaper_discard' },
                   desc:'Fügt diese Karte dem Gegner direkten Kampfschaden zu: Der Gegner wirf 1 zufällige Handkarte ab.' },
    stimmen_chor: { kind:'ninja', name:'Stimmen-Chor', level:3, atk:1300, def:1000, attr:'finsternis', emoji:'🎭', rarity:'R', tribe:'echo',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    riss_fragment: { kind:'ninja', name:'Riss-Fragment', level:4, atk:1500, def:1300, attr:'finsternis', emoji:'🌑', rarity:'R', tribe:'echo',
                   effect:{ t:'dmg_on_summon', v:400 },
                   desc:'Wenn diese Karte beschworen wird: Füge dem Gegner 400 Schaden zu.' },
    zeit_echo:   { kind:'ninja', name:'Zeit-Echo', level:5, atk:1900, def:1600, attr:'finsternis', emoji:'⏳', rarity:'SR', tribe:'echo',
                   effect:{ t:'dd_both' },
                   desc:'Nach einem Kampf, an dem diese Karte beteiligt war: Verbanne beide beteiligten Ninja.' },
    stimme_boss: { kind:'ninja', name:'Die Stimme des Risses', level:6, atk:2400, def:2100, attr:'finsternis', emoji:'🌌', rarity:'UR', tribe:'echo',
                   effects:[ { t:'destroy_strongest_on_summon' }, { t:'weaken_on_summon', v:300 } ],
                   desc:'Wenn diese Karte beschworen wird: Zerstöre das stärkste gegnerische Ninja; das nächststärkere verliert 300 ANG.' },
    stimme_der_zeit: { kind:'jutsu', sub:'normal', name:'Stimme der Zeit', emoji:'🕰️', rarity:'SR',
                   effect:{ t:'control' },
                   desc:'Übernimm bis Zugende die Kontrolle über 1 gegnerisches Ninja.' },
    riss_welle:  { kind:'jutsu', sub:'normal', name:'Riss-Welle', emoji:'🌊', rarity:'R',
                   effect:{ t:'mill', n:3 },
                   desc:'Der Gegner legt die obersten 3 Karten seines Decks auf den Friedhof.' },
    zeit_sprung: { kind:'jutsu', sub:'normal', name:'Zeit-Sprung', emoji:'⌛', rarity:'R',
                   effect:{ t:'bounce_all_st' },
                   desc:'Gib alle Jutsu- und Fallenkarten auf die Hände ihrer Besitzer zurück.' },
    riss_duplikat: { kind:'jutsu', sub:'normal', name:'Riss-Duplikat', emoji:'🪞', rarity:'R',
                   effect:{ t:'token', n:1 },
                   desc:'Beschwöre 1 „Schattendoppelgänger" (Riss-Fragment).' },
    dunkle_prophezeiung: { kind:'jutsu', sub:'normal', name:'Dunkle Prophezeiung', emoji:'🔮', rarity:'R',
                   effect:{ t:'draw', n:2 },
                   desc:'Ziehe 2 Karten.' },
    zeit_riss: { kind:'jutsu', sub:'normal', name:'Zeit-Riss', emoji:'⏳', rarity:'R',
                   effect:{ t:'destroy_st' },
                   desc:'Zerstöre 1 gegnerische Jutsu- oder Fallenkarte.' },
    echo_falle:  { kind:'falle', trigger:'attack', name:'Echo-Falle', emoji:'🌀', rarity:'SR',
                   effect:{ t:'magic_cylinder' },
                   desc:'FALLE: Annulliere einen Angriff; der Gegner erhält Schaden in Höhe der ANG seines Angreifers.' },
    zeit_blase:  { kind:'falle', trigger:'attack', name:'Zeit-Blase', emoji:'🫧', rarity:'R',
                   effect:{ t:'negate_and_lock' },
                   desc:'FALLE: Annulliere einen Angriff; der Angreifer kann 2 Züge lang nicht angreifen.' },

    /* ===== Echo-Spiegel-Deck: Das Dunkle Echo (tribe 'echo') — FINALBOSS ===== */
    echo_schattendoppel: { kind:'ninja', name:'Echo: Schattendouble', level:3, atk:1300, def:1000, attr:'finsternis', emoji:'🌑', rarity:'N', tribe:'echo',
                   effect:null, desc:'Dein Abbild, wie es begann — nur ohne Zweifel.' },
    dunkler_genin: { kind:'ninja', name:'Echo: Dunkler Genin', level:4, atk:1500, def:1200, attr:'finsternis', emoji:'🍥', rarity:'R', tribe:'echo',
                   effect:{ t:'aura_self_tribe', v:300, tribe:'echo' },
                   desc:'Erhält +300 ANG, solange ein anderer Echo-Ninja offen auf deiner Feldseite liegt.' },
    spiegel_waechter: { kind:'ninja', name:'Echo: Spiegel-Wächter', level:4, atk:900, def:2300, attr:'finsternis', emoji:'🪞', rarity:'R', tribe:'echo',
                   effects:[ { t:'no_direct' }, { t:'attack_redirect' } ],
                   desc:'Kann nicht direkt angreifen. Einmal pro Zug: Lenke das Ziel eines gegnerischen Angriffs auf diese Karte um.' },
    echo_naruto: { kind:'ninja', name:'Echo: Naruto des Risses', level:6, atk:2000, def:1700, attr:'finsternis', emoji:'🦊', rarity:'SR', tribe:'echo',
                   effect:{ t:'double_attack' },
                   desc:'Kann in jeder Kampfphase zweimal angreifen.' },
    echo_spiegel_boss: { kind:'ninja', name:'Das Dunkle Echo', level:7, atk:2400, def:2200, attr:'finsternis', emoji:'🌑', rarity:'UR', tribe:'echo', tribeTribute:'echo',
                   effect:{ t:'destroy_weak_per_turn', maxAtk:2000 },
                   desc:'Tribut-Beschwörung: Erfordert 2 ECHO-Ninja als Tribut. Einmal pro Zug: Wirf 1 Handkarte ab, um 1 gegnerisches Ninja mit höchstens 2000 ANG zu zerstören.' },
    spiegel_technik: { kind:'jutsu', sub:'normal', name:'Spiegel-Technik', emoji:'🪞', rarity:'R',
                   effect:{ t:'search', tribe:'echo' },
                   desc:'Nimm 1 Echo-Ninja aus deinem Deck auf die Hand.' },
    dunkles_rasengan: { kind:'jutsu', sub:'equip', name:'Dunkles Rasengan', emoji:'🌀', rarity:'SR',
                   effect:{ t:'equip', atk:700, tribeId:'echo_naruto' },
                   desc:'Ausrüstung nur für „Echo: Naruto des Risses": +700 ANG.' },
    riss_oeffnung: { kind:'jutsu', sub:'normal', name:'Riss-Öffnung', emoji:'🌌', rarity:'UR',
                   effect:{ t:'destroy_all_enemy', costLP:1500 },
                   desc:'Zahle 1500 LP: Zerstöre alle gegnerischen Ninja.' },
    zeit_falte:  { kind:'jutsu', sub:'normal', name:'Zeit-Falte', emoji:'🕳️', rarity:'R',
                   effect:{ t:'attack_lock', turns:2 },
                   desc:'Der Gegner kann 2 Züge lang nicht angreifen; seine verdeckten Ninja werden aufgedeckt.' },
    spiegel_reflexion: { kind:'falle', trigger:'attack', name:'Spiegel-Reflexion', emoji:'🪞', rarity:'SR',
                   effect:{ t:'mirror_force' },
                   desc:'FALLE: Wenn der Gegner angreift: Zerstöre alle seine Ninja in Angriffsposition.' },
    dunkler_zylinder: { kind:'falle', trigger:'attack', name:'Dunkler Zylinder', emoji:'🌀', rarity:'SR',
                   effect:{ t:'magic_cylinder' },
                   desc:'FALLE: Annulliere einen Angriff; der Gegner erhält Schaden in Höhe der ANG seines Angreifers.' },

    /* ============================================================
       ZEITREISE-BOGEN „Die Shinobi-Ära" (neue Map, nach Kapitel 4)
       Alles Kanon-Karten (Naruto-Charaktere/Techniken), Kapitel 5–9.
       ============================================================ */

    /* ===== Mizuki-Deck: Die Schriftrolle der Siegelung (tribe 'akademie') ===== */
    mizuki_verraeter: { kind:'ninja', name:'Mizuki – Verräter von Konoha', level:6, atk:2300, def:1600, attr:'finsternis', emoji:'🎭', rarity:'UR', tribe:'akademie',
                   effect:{ t:'destroy_weak_per_turn', maxAtk:2000 },
                   desc:'Einmal pro Zug: Wirf 1 Handkarte ab, um 1 gegnerisches Ninja mit höchstens 2000 ANG zu zerstören. Die gestohlene Schriftrolle machte ihn stärker — nicht weiser.' },
    fujin_raijin: { kind:'ninja', name:'Fūjin & Raijin – Dumme Brüder', level:4, atk:1700, def:500, attr:'erde', emoji:'🍚', rarity:'N',
                   effect:null, desc:'Die legendären dummen Brüder — unersättlich und unaufhaltsam, wenn Mizuki sie mit Essen lockt.' },
    fuuma_shuriken: { kind:'jutsu', sub:'equip', name:'Fūma-Shuriken', emoji:'🌀', rarity:'R',
                   effect:{ t:'equip', atk:700, tribeId:'mizuki' },
                   desc:'Ausrüstung nur für „Mizuki – Manipulativer Chūnin": +700 ANG. Das Riesen-Shuriken, das einst Irukas Rücken zeichnete.' },
    schriftrolle_siegelung: { kind:'jutsu', sub:'normal', name:'Schriftrolle der Siegelung', emoji:'📜', rarity:'SR',
                   effect:{ t:'draw', n:2 },
                   desc:'Ziehe 2 Karten. Verbotenes Wissen aus dem Verschlussraum des Hokage.' },

    /* ===== Haku-Deck: Eis & Spiegel (tribe 'kiri') ===== */
    haku_eisnadel: { kind:'ninja', name:'Haku – Eis-Nadeln', level:4, atk:1400, def:1500, attr:'wasser', emoji:'🧊', rarity:'R', tribe:'kiri',
                   effect:{ t:'weaken_on_summon', v:300 },
                   desc:'Wenn diese Karte beschworen wird: Das stärkste gegnerische Ninja verliert dauerhaft 300 ANG (Senbon-Treffer).' },
    haku_spiegel: { kind:'ninja', name:'Haku – Spiegel-Tänzer', level:5, atk:1900, def:1500, attr:'wasser', emoji:'🪞', rarity:'SR', tribe:'kiri',
                   effect:{ t:'double_attack' },
                   desc:'Kann in jeder Kampfphase zweimal angreifen — Haku springt zwischen den Eis-Spiegeln hin und her.' },
    zabuza_momo: { kind:'ninja', name:'Zabuza Momochi', level:5, atk:2000, def:1200, attr:'wasser', emoji:'🗡️', rarity:'R', tribe:'kiri',
                   effect:{ t:'aura_self_tribe', v:300, tribe:'kiri' },
                   desc:'Erhält +300 ANG, solange ein anderer Kiri-Ninja offen auf deiner Feldseite liegt.' },
    daemon_brueder: { kind:'ninja', name:'Gōzu & Meizu – Dämonen-Brüder', level:3, atk:1300, def:900, attr:'wasser', emoji:'👥', rarity:'N', tribe:'kiri',
                   effect:null, desc:'Zwei giftige Klauen-Ketten, ein Plan: Zuerst der Wagen, dann der Brückenbauer.' },
    mizu_token:  { kind:'ninja', name:'Wasser-Doppelgänger', level:1, atk:500, def:500, attr:'wasser', emoji:'💧', rarity:'N',
                   token:true, effect:null, desc:'Ein Klon aus Wasser — zerspringt bei Gelegenheit.' },
    mizu_bunshin: { kind:'jutsu', sub:'normal', name:'Mizu Bunshin no Jutsu', emoji:'💧', rarity:'R',
                   effect:{ t:'token', id:'mizu_token', n:2 },
                   desc:'Beschwöre 2 „Wasser-Doppelgänger" (500/500).' },
    senbon_sturm: { kind:'jutsu', sub:'normal', name:'Senbon-Sturm', emoji:'🪡', rarity:'R',
                   effect:{ t:'weaken_monster', v:500 },
                   desc:'1 gegnerisches Ninja verliert dauerhaft 500 ANG.' },
    kirigakure_jutsu: { kind:'jutsu', sub:'dauer', name:'Kirigakure no Jutsu', emoji:'🌫️', rarity:'SR',
                   effect:{ t:'cont_weaken_all', v:200, coinNegate:1 },
                   desc:'DAUER-KARTE: Alle gegnerischen Ninja verlieren 200 ANG/VERT. Greift eines an: Münzwurf — bei Kopf wird der Angriff abgebrochen (Nebel-Versteck).' },
    makyou_hyoushou: { kind:'falle', trigger:'attack', name:'Makyō Hyōshō – Eis-Spiegel', emoji:'🧊', rarity:'SR',
                   effect:{ t:'negate_and_bounce_target' },
                   desc:'FALLE: Wenn dein Ninja angegriffen wird: Annulliere den Angriff und gib das angegriffene Ninja auf deine Hand zurück (die Spiegel leiten ab).' },
    eis_fesseln: { kind:'falle', trigger:'attack', name:'Eis-Fesseln', emoji:'❄️', rarity:'R',
                   effect:{ t:'negate_and_lock' },
                   desc:'FALLE: Annulliere einen Angriff; der Angreifer kann 2 Züge lang nicht angreifen.' },
    gefrorene_falle: { kind:'falle', trigger:'attack', name:'Gefrorene Falle', emoji:'🥶', rarity:'N',
                   effect:{ t:'negate_attack' },
                   desc:'FALLE: Annulliere einen Angriff und beende die Kampfphase.' },

    /* ===== Zabuza-Deck: Lautloses Töten (tribe 'kiri') — BOSS ===== */
    zabuza_daemon: { kind:'ninja', name:'Zabuza – Lautloser Tod', level:7, atk:2500, def:2000, attr:'wasser', emoji:'🗡️', rarity:'UR', tribe:'kiri', tribeTribute:'kiri',
                   effects:[ { t:'destroy_weakest_on_summon' }, { t:'double_attack' } ],
                   desc:'Tribut-Beschwörung: Erfordert 2 KIRI-Ninja als Tribut. Wenn beschworen: Zerstöre das schwächste gegnerische Ninja. Kann in jeder Kampfphase zweimal angreifen (lautloses Töten).' },
    haku_klinge: { kind:'ninja', name:'Haku – Zabuzas Werkzeug', level:4, atk:1500, def:1300, attr:'wasser', emoji:'🧊', rarity:'R', tribe:'kiri',
                   effect:{ t:'on_battle_destroy_summon', id:'zabuza_daemon' },
                   desc:'Wenn diese Karte durch KAMPF zerstört wird: Beschwöre 1 „Zabuza – Lautloser Tod" aus deinem Deck. (Haku stellt sich schützend vor Zabuza.)' },
    oinin_jaeger: { kind:'ninja', name:'Oinin – Jäger-Ninja', level:4, atk:1400, def:1100, attr:'wasser', emoji:'🎭', rarity:'N', tribe:'kiri',
                   effect:{ t:'on_normal_search_jutsu' },
                   desc:'Kiri-Jäger auf der Spur abtrünniger Ninja. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.' },
    kubikiribouchou: { kind:'jutsu', sub:'equip', name:'Kubikiribōchō', emoji:'🗡️', rarity:'SR',
                   effect:{ t:'equip', atk:800, piercing:true, tribeId:'zabuza_daemon' },
                   desc:'Ausrüstung nur für „Zabuza – Lautloser Tod": +800 ANG und Durchdringung. Die Enthauptungsklinge, die sich aus Blut regeneriert.' },
    suiro_jutsu: { kind:'jutsu', sub:'normal', name:'Suirō no Jutsu – Wassergefängnis', emoji:'🌊', rarity:'R',
                   effect:{ t:'lock_monster', turns:2 },
                   desc:'1 gegnerisches Ninja kann 2 Züge lang weder angreifen noch seine Effekte nutzen.' },
    lautloses_toeten: { kind:'falle', trigger:'attack', name:'Lautloses Töten', emoji:'🔪', rarity:'SR',
                   effect:{ t:'destroy_attacker' },
                   desc:'FALLE: Wenn der Gegner angreift: Zerstöre den Angreifer — lautlos, aus dem Nebel.' },

    /* ===== Orochimaru (verstärkt): Schatten über der Prüfung (tribe 'oto') ===== */
    yamata_no_jutsu: { kind:'ninja', name:'Yamata no Jutsu', level:7, atk:2400, def:1800, attr:'finsternis', emoji:'🐍', rarity:'UR', tribe:'oto',
                   effect:{ t:'self_revive' },
                   desc:'Zugbeginn im Friedhof (einmal pro Zug, freie Zone nötig): Beschwöre diese Karte erneut — Orochimaru kehrt immer zurück.' },
    fluchmal_kraft: { kind:'jutsu', sub:'normal', name:'Fluchmal-Kraft', emoji:'🐍', rarity:'SR',
                   effect:{ t:'boost_perm', v:600, costLP:500 },
                   desc:'Zahle 500 LP: 1 deiner Ninja erhält dauerhaft +600 ANG. Orochimarus Mal verlangt seinen Preis.' },
    kusa_nagi: { kind:'jutsu', sub:'normal', name:'Kusanagi-Klinge', emoji:'⚔️', rarity:'R',
                   effect:{ t:'destroy_monster_max', maxAtk:2000 },
                   desc:'Zerstöre 1 gegnerisches Ninja mit höchstens 2000 ANG. Die Klinge aus dem Schlangenleib durchbohrt alles.' },

    /* ===== Gaara (verstärkt): Sturm auf Konoha (tribe 'suna') — BOSS ===== */
    shukaku:     { kind:'ninja', name:'Shukaku – Der Einschwänzige', level:7, atk:2600, def:2200, attr:'erde', emoji:'🦝', rarity:'UR', tribe:'suna', tribeTribute:'suna',
                   effects:[ { t:'destroy_strongest_on_summon' }, { t:'dmg_on_summon', v:500 } ],
                   desc:'Tribut-Beschwörung: Erfordert 2 SUNA-Ninja als Tribut. Wenn beschworen: Zerstöre das stärkste gegnerische Ninja und füge dem Gegner 500 Schaden zu (Renkūdan!).' },
    sabaku_sousou: { kind:'jutsu', sub:'normal', name:'Sabaku Sōsō – Sand-Begräbnis', emoji:'⚱️', rarity:'SR',
                   effect:{ t:'destroy_any_monster', dmg:500 },
                   desc:'Zerstöre 1 gegnerisches Ninja und füge dem Gegner 500 Schaden zu.' },
    sand_token:  { kind:'ninja', name:'Sand-Klon', level:1, atk:300, def:1500, attr:'erde', emoji:'🏜️', rarity:'N',
                   token:true, effect:{ t:'taunt' },
                   desc:'Ein Klon aus Sand. Gegnerische Ninja müssen zuerst diese Karte angreifen.' },
    sand_klon:   { kind:'jutsu', sub:'normal', name:'Sand-Klon-Jutsu', emoji:'🏜️', rarity:'R',
                   effect:{ t:'token', id:'sand_token', n:1 },
                   desc:'Beschwöre 1 „Sand-Klon" (300/1500). Gegnerische Ninja müssen zuerst ihn angreifen.' },

    /* ===== Itachi (verstärkt): Akatsuki in Konoha (tribe 'akatsuki') — BOSS ===== */
    kisame_samehada: { kind:'ninja', name:'Kisame – Samehada-Klinge', level:5, atk:2100, def:1400, attr:'wasser', emoji:'🦈', rarity:'SR', tribe:'akatsuki',
                   effects:[ { t:'piercing' }, { t:'weaken_on_summon', v:300 } ],
                   desc:'Durchdringung. Wenn diese Karte beschworen wird: Das stärkste gegnerische Ninja verliert dauerhaft 300 ANG (Samehada frisst Chakra).' },
    samehada:    { kind:'jutsu', sub:'equip', name:'Samehada', emoji:'🦈', rarity:'SR',
                   effect:{ t:'equip', atk:700, tribeId:'kisame_samehada' },
                   desc:'Ausrüstung nur für „Kisame – Samehada-Klinge": +700 ANG. Die lebendige Klinge liebt Chakra — und Kisame.' },
    kotoamatsukami: { kind:'jutsu', sub:'normal', name:'Kotoamatsukami', emoji:'👁️', rarity:'UR',
                   effect:{ t:'control' },
                   desc:'Übernimm bis Zugende die Kontrolle über 1 gegnerisches Ninja. Shisuis Auge gebietet über jeden Willen.' },
    itachi_susanoo: { kind:'ninja', name:'Itachi – Susanoo', level:7, atk:2600, def:2200, attr:'feuer', emoji:'🛡️', rarity:'UR', tribe:'akatsuki',
                   effect:{ t:'battle_immune' },
                   desc:'Kann durch Kampf nicht zerstört werden. Yata-Spiegel und Totsuka-Klinge — die unbesiegbare Waffe.' },

    /* ===== Kimimaro-Deck: Der Viererklang (tribe 'oto') — BOSS ===== */
    jirobo:      { kind:'ninja', name:'Jirōbō – Faust des Südens', level:3, atk:1200, def:1600, attr:'erde', emoji:'🟤', rarity:'N', tribe:'oto',
                   effect:null, desc:'Stärkster Körper des Viererklangs — hebt Felsen wie Fußbälle.' },
    kidomaru:    { kind:'ninja', name:'Kidōmaru – Spinne des Ostens', level:4, atk:1500, def:1100, attr:'finsternis', emoji:'🕷️', rarity:'R', tribe:'oto',
                   effect:{ t:'piercing' },
                   desc:'Durchdringung. Seine goldenen Pfeile verfehlen ihr Ziel nie.' },
    tayuya:      { kind:'ninja', name:'Tayuya – Flöte des Nordens', level:3, atk:1300, def:900, attr:'finsternis', emoji:'🎵', rarity:'R', tribe:'oto',
                   effect:{ t:'token', id:'doki_token', n:1 },
                   desc:'Wenn diese Karte beschworen wird: Beschwöre 1 „Doki" (800/800).' },
    doki_token:  { kind:'ninja', name:'Doki – Flöten-Dämon', level:1, atk:800, def:800, attr:'finsternis', emoji:'👹', rarity:'N',
                   token:true, effect:null, desc:'Ein wütender Dämon, gerufen von Tayuyas Melodie.' },
    sakon_ukon:  { kind:'ninja', name:'Sakon & Ukon – Zwillings-Tor', level:4, atk:1600, def:1200, attr:'finsternis', emoji:'👯', rarity:'R', tribe:'oto',
                   effect:{ t:'double_attack' },
                   desc:'Kann in jeder Kampfphase zweimal angreifen — zwei Körper, ein Wille.' },
    kimimaro_kaguya: { kind:'ninja', name:'Kimimaro – Letzter Kaguya', level:6, atk:2400, def:1900, attr:'erde', emoji:'🦴', rarity:'UR', tribe:'oto',
                   effects:[ { t:'piercing' }, { t:'battle_immune' } ],
                   desc:'Durchdringung. Kann durch Kampf nicht zerstört werden (Knochenhärte). Der Krieger, für den Orochimaru weinte.' },
    spinnennetz: { kind:'jutsu', sub:'normal', name:'Kumonendo – Spinnen-Klebezahn', emoji:'🕸️', rarity:'R',
                   effect:{ t:'lock_monster', turns:2 },
                   desc:'1 gegnerisches Ninja kann 2 Züge lang weder angreifen noch seine Effekte nutzen.' },
    floeten_melodie: { kind:'jutsu', sub:'normal', name:'Dämonen-Flöte: Phantom-Melodie', emoji:'🎶', rarity:'R',
                   effect:{ t:'weaken_all', v:300 },
                   desc:'Alle gegnerischen Ninja verlieren dauerhaft 300 ANG.' },
    knochen_tanz: { kind:'jutsu', sub:'normal', name:'Teshi Sendan – Knochen-Tanz', emoji:'🦴', rarity:'SR',
                   effect:{ t:'grant_double_attack' },
                   desc:'1 deiner Ninja kann in diesem Zug zweimal angreifen.' },
    fingers_kugeln: { kind:'jutsu', sub:'normal', name:'Tsubaki no Mai – Finger-Kugeln', emoji:'🎯', rarity:'N',
                   effect:{ t:'dmg', v:400 },
                   desc:'Füge dem Gegner 400 Schaden zu.' },
    fluchmal_stufe2: { kind:'falle', trigger:'attack', name:'Fluchmal Stufe 2', emoji:'🐍', rarity:'SR',
                   effect:{ t:'weaken_attacker', v:600 },
                   desc:'FALLE: Wenn der Gegner angreift: Der Angreifer verliert dauerhaft 600 ANG.' },
    schall_barriere: { kind:'falle', trigger:'attack', name:'Schall-Barriere', emoji:'🔊', rarity:'N',
                   effect:{ t:'negate_attack' },
                   desc:'FALLE: Annulliere einen Angriff und beende die Kampfphase.' },

    /* ===== Pain-Deck: Die Sechs Pfade (tribe 'akatsuki') — BOSS ===== */
    pain_tendo:  { kind:'ninja', name:'Pain – Tendō', level:7, atk:2600, def:2000, attr:'licht', emoji:'👁️', rarity:'UR', tribe:'akatsuki', tribeTribute:'akatsuki',
                   effect:{ t:'destroy_weak_per_turn', maxAtk:2200 },
                   desc:'Tribut-Beschwörung: Erfordert 2 AKATSUKI-Ninja als Tribut. Einmal pro Zug: Wirf 1 Handkarte ab, um 1 gegnerisches Ninja mit höchstens 2200 ANG zu zerstören (Shinra Tensei).' },
    chikushodo:  { kind:'ninja', name:'Chikushōdō – Tier-Pfad', level:4, atk:1500, def:1200, attr:'erde', emoji:'🐕', rarity:'R', tribe:'akatsuki',
                   effect:{ t:'token', id:'jumbo_hund_token', n:1 },
                   desc:'Wenn diese Karte beschworen wird: Beschwöre 1 „Riesen-Hund" (800/800).' },
    jumbo_hund_token: { kind:'ninja', name:'Riesen-Hund', level:1, atk:800, def:800, attr:'erde', emoji:'🐕', rarity:'N',
                   token:true, effect:null, desc:'Kuchiyose des Tier-Pfads — teilt sich bei jedem Schlag.' },
    ningendo:    { kind:'ninja', name:'Ningendō – Menschen-Pfad', level:4, atk:1400, def:1300, attr:'finsternis', emoji:'👤', rarity:'R', tribe:'akatsuki',
                   effect:{ t:'reaper_discard' },
                   desc:'Fügt diese Karte dem Gegner direkten Kampfschaden zu: Der Gegner wirft 1 zufällige Handkarte ab (Seelen-Riss).' },
    shurado:     { kind:'ninja', name:'Shuradō – Asura-Pfad', level:4, atk:1600, def:1100, attr:'finsternis', emoji:'🚀', rarity:'R', tribe:'akatsuki',
                   effect:{ t:'piercing' },
                   desc:'Durchdringung. Raketen-Fäuste aus dem Reich der Kriegsdämonen.' },
    gakido:      { kind:'ninja', name:'Gakidō – Hunger-Pfad', level:4, atk:1000, def:1800, attr:'erde', emoji:'🛡️', rarity:'N', tribe:'akatsuki',
                   effects:[ { t:'no_direct' }, { t:'attack_redirect' } ],
                   desc:'Kann nicht direkt angreifen. Einmal pro Zug: Lenke das Ziel eines gegnerischen Angriffs auf diese Karte um (Fūjutsu Kyūin absorbiert alles).' },
    jigokudo:    { kind:'ninja', name:'Jigokudō – Naraka-Pfad', level:5, atk:2000, def:1500, attr:'finsternis', emoji:'⚖️', rarity:'SR', tribe:'akatsuki',
                   effect:{ t:'self_revive' },
                   desc:'Zugbeginn im Friedhof (freie Zone nötig): Beschwöre diese Karte erneut — der König der Hölle richtet wieder auf.' },
    shinra_tensei: { kind:'jutsu', sub:'normal', name:'Shinra Tensei', emoji:'💥', rarity:'UR',
                   effect:{ t:'destroy_all_enemy', costLP:1500 },
                   desc:'Zahle 1500 LP: Zerstöre alle gegnerischen Ninja (Allmächtiger Stoß).' },
    chibaku_tensei: { kind:'jutsu', sub:'normal', name:'Chibaku Tensei', emoji:'🌑', rarity:'SR',
                   effect:{ t:'attack_lock', turns:3 },
                   desc:'Der Gegner kann 3 Züge lang nicht angreifen; seine verdeckten Ninja werden aufgedeckt.' },
    papier_sturm: { kind:'jutsu', sub:'normal', name:'Papier-Sturm', emoji:'📄', rarity:'R',
                   effect:{ t:'weaken_all', v:300 },
                   desc:'Alle gegnerischen Ninja verlieren dauerhaft 300 ANG (Konans Papierklingen).' },
    regen_der_erkenntnis: { kind:'jutsu', sub:'normal', name:'Regen der Erkenntnis', emoji:'🌧️', rarity:'R',
                   effect:{ t:'search', tribe:'akatsuki' },
                   desc:'Nimm 1 Akatsuki-Ninja aus deinem Deck auf die Hand.' },
    chou_shinra: { kind:'falle', trigger:'attack', name:'Chō Shinra Tensei', emoji:'💫', rarity:'SR',
                   effect:{ t:'magic_cylinder' },
                   desc:'FALLE: Annulliere einen Angriff; der Gegner erhält Schaden in Höhe der ANG seines Angreifers (größter Stoß zurück).' },

    /* ===== Madara-Deck: Das Auge am Himmel (tribe 'uchiha') — FINALBOSS ===== */
    madara_uchiha: { kind:'ninja', name:'Madara Uchiha – Legende', level:7, atk:2700, def:2100, attr:'feuer', emoji:'👁️', rarity:'UR', tribe:'uchiha',
                   effects:[ { t:'destroy_strongest_on_summon' }, { t:'dmg_on_summon', v:500 } ],
                   desc:'Wenn diese Karte beschworen wird: Zerstöre das stärkste gegnerische Ninja und füge dem Gegner 500 Schaden zu. „Kämpfst du auch im Tanz?"' },
    obito_kamui: { kind:'ninja', name:'Obito – Kamui', level:6, atk:2200, def:1500, attr:'finsternis', emoji:'🌀', rarity:'SR', tribe:'uchiha',
                   effect:{ t:'dd_both' },
                   desc:'Nach einem Kampf, an dem diese Karte beteiligt war: Verbanne beide beteiligten Ninja in die Kamui-Dimension.' },
    zetsu:       { kind:'ninja', name:'Zetsu – Spion der Akatsuki', level:3, atk:900, def:1300, attr:'erde', emoji:'🌿', rarity:'N', tribe:'uchiha',
                   effect:{ t:'draw_on_summon', n:1 },
                   desc:'Wenn diese Karte beschworen wird: Ziehe 1 Karte (Sporen-Netzwerk).' },
    weisser_zetsu: { kind:'ninja', name:'Weißer Zetsu – Armee-Klon', level:4, atk:1500, def:1000, attr:'erde', emoji:'🌱', rarity:'N', tribe:'uchiha',
                   effect:null, desc:'Einer von hunderttausend. Und hunderttausend sind wie einer.' },
    gokka_mekkyaku: { kind:'jutsu', sub:'normal', name:'Katon: Gōka Mekkyaku', emoji:'🔥', rarity:'SR',
                   effect:{ t:'destroy_any_monster', dmg:500 },
                   desc:'Zerstöre 1 gegnerisches Ninja und füge dem Gegner 500 Schaden zu. Ein Feuermeer, das nur ein Uchiha entfacht.' },
    tengai_shinsei: { kind:'jutsu', sub:'normal', name:'Tengai Shinsei', emoji:'☄️', rarity:'UR',
                   effect:{ t:'destroy_all_enemy', costLP:2000 },
                   desc:'Zahle 2000 LP: Zerstöre alle gegnerischen Ninja. „Was tust du gegen den ZWEITEN Meteor?"' },
    mugen_tsukuyomi: { kind:'jutsu', sub:'normal', name:'Mugen Tsukuyomi', emoji:'🌕', rarity:'SR',
                   effect:{ t:'attack_lock', turns:3 },
                   desc:'Der Gegner kann 3 Züge lang nicht angreifen; seine verdeckten Ninja werden aufgedeckt. Der Mond hat ein Auge.' },
    kamui_jutsu: { kind:'jutsu', sub:'normal', name:'Kamui – Dimensionstor', emoji:'🌀', rarity:'R',
                   effect:{ t:'banish_monster' },
                   desc:'Verbanne 1 gegnerisches Ninja.' },
    gedo_rinne_tensei: { kind:'jutsu', sub:'normal', name:'Gedō Rinne Tensei', emoji:'⚰️', rarity:'SR',
                   effect:{ t:'revive' },
                   desc:'Beschwöre 1 Ninja aus deinem Friedhof als Spezialbeschwörung.' },
    rinnegan_blick: { kind:'jutsu', sub:'normal', name:'Rinnegan-Blick', emoji:'👁️', rarity:'R',
                   effect:{ t:'search', tribe:'uchiha' },
                   desc:'Nimm 1 Uchiha-Ninja aus deinem Deck auf die Hand.' },
    uchiwa_ruckstoss: { kind:'falle', trigger:'attack', name:'Uchiwa-Rückstoß', emoji:'🪭', rarity:'SR',
                   effect:{ t:'magic_cylinder' },
                   desc:'FALLE: Annulliere einen Angriff; der Gegner erhält Schaden in Höhe der ANG seines Angreifers (Uchiha-Reflexion).' },
    susanoo_gard: { kind:'falle', trigger:'attack', name:'Susanoo-Garde', emoji:'🛡️', rarity:'SR',
                   effect:{ t:'mirror_force' },
                   desc:'FALLE: Wenn der Gegner angreift: Zerstöre alle seine Ninja in Angriffsposition (der Yata-Spiegel schlägt alles zurück).' },
    mokuton_falle: { kind:'falle', trigger:'attack', name:'Mokuton: Ranken-Kerker', emoji:'🌳', rarity:'R',
                   effect:{ t:'negate_and_lock' },
                   desc:'FALLE: Annulliere einen Angriff; der Angreifer kann 2 Züge lang nicht angreifen.' },
  };

  NT.CARDS = CARDS;

  /* ---------- Starter-Deck: Theme „Team 7 / Konoha" (20 Karten, Powerlevel = Kurogane) ---------- */
  NT.STARTER_DECK = [
    'naruto_schueler','naruto_schueler','naruto_schueler','konohamaru_rivale','konohamaru_rivale','konohamaru_rivale',
    'naruto_genin','naruto_genin','iruka_waechter','naruto_kyuubi',
    'team7_formation','team7_formation','rasengan_genin','rasengan_genin','schattenspiel','schatten_bindung',
    'kawarimi_trick','kawarimi_trick','schattentaeuschung','schattentaeuschung',
  ];

  /* ---------- Irukas Akademie-Deck (20 Karten, kuratiert 2026-07) ----------
     Unterrichts-Thema: Iruka stärkt/schützt die Schüler (Aura + Sakura-VERT),
     Klassenclown mit Abwurf-Boost, Mizuki mit Zweifel-Bremse, Bunshin-Taunt,
     Kawarimi-Rettung. Kein Tribut-Ninja — bewusst sanfter Einstiegs-Boss. */
  NT.IRUKA_DECK = [
    'iruka_lehrer','iruka_lehrer','iruka_lehrer','schueler_naruto','schueler_naruto','schueler_naruto',
    'schuelerin_sakura','schuelerin_sakura','mizuki','mizuki',
    'bunshin_jutsu','bunshin_jutsu','shuriken_wurf','shuriken_wurf','akademie_unterricht','henge_jutsu',
    'kawarimi_klassik','kawarimi_klassik','beschuetzer_koerper','beschuetzer_koerper',
  ];

  /* ---------- Kuratierte NPC-Decks (je 20 Karten, 2026-07) ---------- */
  NT.KOTEI_DECK = [ // Ichiraku/Raufbold — Einstiegs-Spaß (diff 1)
    'teuchi_ramen','teuchi_ramen','teuchi_ramen','ayame_service','ayame_service','ayame_service',
    'choji_stammgast','choji_stammgast','choji_stammgast','kotei_boss',
    'ichiraku_ramen','ichiraku_ramen','scharfe_suppe','scharfe_suppe','grosse_portion','endloser_nachschlag',
    'verdauungspause','verdauungspause','scharfes_comeback','scharfes_comeback',
  ];
  NT.GENJI_DECK = [ // Dojo/Taijutsu — Grundlagen & Doppelangriff (diff 2)
    'rock_lee','rock_lee','rock_lee','tenten_waffen','tenten_waffen','tenten_waffen',
    'might_guy','might_guy','might_guy_sensei','might_guy_sensei',
    'hartes_training','hartes_training','konoha_senpuu','konoha_senpuu','lees_training','gouken',
    'suiken','suiken','kage_buyou','kage_buyou',
  ];
  NT.SASUKE_DECK = [ // Uchiha-Ehrgeiz — Burn + Piercing (diff 2)
    'sasuke_akademie','sasuke_akademie','sasuke_akademie','shisui_uchiha','shisui_uchiha','shisui_uchiha',
    'sasuke_genin','sasuke_genin','sasuke_fluchmal','sasuke_fluchmal',
    'goukakyuu','goukakyuu','chidori','chidori','sharingan_blick','shuriken_kage',
    'uchiha_kawarimi','uchiha_kawarimi','feuer_versteck','feuer_versteck',
  ];
  NT.GAARA_DECK = [ // Absolute Verteidigung — Walls & Lockdown (diff 3)
    'baki_suna','baki_suna','matsuri_suna','matsuri_suna','matsuri_suna',
    'kankuro_marionette','temari_wind','temari_wind','gaara_wueste','gaara_wueste',
    'sand_sarg','sand_sarg','sandsturm','sandsturm','sand_welle','suna_yoroi',
    'sand_mauer','sand_mauer','sand_falle','sand_falle',
  ];
  NT.KAKASHI_DECK = [ // Kopier-Ninja — Konter & Chidori (diff 4)
    'pakkun_ninken','pakkun_ninken','pakkun_ninken','ninken_rudel','ninken_rudel','ninken_rudel',
    'kakashi_jonin','kakashi_jonin','kakashi_raikiri','kakashi_raikiri',
    'raikiri_jutsu','raikiri_jutsu','suiton_drache','suiton_drache','erdriss','sharingan_kopie',
    'sharingan_konter','sharingan_konter','ninken_falle','ninken_falle',
  ];
  NT.AYA_DECK = [ // Fallen-Expertin — 10 Ninja / 3 Jutsu / 7 Fallen (diff 4)
    'shikadai_nara','shikadai_nara','shikadai_nara','anko_prueferin','anko_prueferin','anko_prueferin',
    'shikamaru_stratege','shikamaru_stratege','aya_meisterin','aya_meisterin',
    'kagemane_jutsu','kagemane_jutsu','entschaerfen',
    'kibaku_fuda','kibaku_fuda','chakra_reflexion','wasserspiegel','kunai_hagel','kunai_hagel','ketten_fesseln',
  ];
  NT.OROCHIMARU_DECK = [ // Schlangen von Oto — Kette, Edo Tensei, Brut (diff 5)
    'oto_ninja','oto_ninja','oto_ninja','zaku_oto','zaku_oto','zaku_oto',
    'kabuto_assistent','kabuto_assistent','manda','orochimaru_sannin',
    'edo_tensei_jutsu','edo_tensei_jutsu','schlangenbiss','schlangenbiss','schlangenhaut','weisse_schlange',
    'schlangengrube','schlangengrube','mandas_zorn','mandas_zorn',
  ];
  NT.DAIGO_DECK = [ // Jonin-Elite — Beatdown mit Aura (diff 6)
    'kotetsu_jonin','kotetsu_jonin','kotetsu_jonin','genma_jonin','genma_jonin','genma_jonin',
    'shikaku_taktiker','shikaku_taktiker','asuma_jonin','asuma_jonin',
    'hachimon_kai','konoha_wirbel','konoha_wirbel','shunshin','shunshin','kunai_sturm',
    'jonin_reflex','jonin_reflex','kunai_falle','kunai_falle',
  ];
  NT.ITACHI_DECK = [ // Genjutsu & Schwarzes Feuer — BOSS (diff 6)
    'kisame_hoshigaki','kisame_hoshigaki','kisame_hoshigaki','karasu_bote','karasu_bote','karasu_bote',
    'itachi_genjutsu','itachi_genjutsu','susanoo_schild','itachi_mangekyou',
    'amaterasu','amaterasu','tsukuyomi','tsukuyomi','katon_itachi','karasu_nebel',
    'genjutsu_spiegel','genjutsu_spiegel','karasu_taeuschung','karasu_taeuschung',
  ];
  NT.SHIZUKA_DECK = [ // Corp-Protokoll — Kartenvorteil & Rüstung (diff 5)
    'kagaa_wache','kagaa_wache','kagaa_wache','kagaa_techniker','kagaa_techniker','kagaa_techniker',
    'kagaa_analyst','shizuka_protokoll','shizuka_protokoll','shizuka_kommandantin',
    'corp_ruestung','corp_ruestung','daten_analyse','daten_analyse','system_scan','neukalibrierung',
    'corp_sperrung','corp_sperrung','abwehr_protokoll','abwehr_protokoll',
  ];
  NT.RAIGA_DECK = [ // Turm-Sicherheit — Verteidigung/Kontrolle (diff 7)
    'kagaa_schildwache','kagaa_schildwache','kagaa_schildwache','raiga_scout','raiga_scout','raiga_scout',
    'kagaa_bollwerk','kagaa_bollwerk','raiga_veteran','raiga_boss',
    'zugriff_verweigert','zugriff_verweigert','sicherheits_sperre','system_breach','festnahme','festnahme',
    'corp_falle','corp_falle','eisener_vorhang','eisener_vorhang',
  ];
  NT.KAGAA_DECK = [ // Echo-Archiv — UR-Sammlung, BOSS (diff 8)
    'archiv_kurator','archiv_kurator','archiv_kurator','archiv_wache','archiv_wache','archiv_wache',
    'kagaa_direktor','kagaa_direktor','echo_relikt','kagaa_boss',
    'archiv_zugriff','verbotenes_relikt','verbotenes_relikt','echo_resonanz','archiv_duplikat','archiv_duplikat',
    'archiv_siegel','archiv_siegel','kagaa_autoritaet','kagaa_autoritaet',
  ];
  NT.WAECHTER_DECK = [ // Monolith — Defensive mit Biss (K4, diff 7)
    'monolith_splitter','monolith_splitter','monolith_splitter','echo_waechter_klein','echo_waechter_klein',
    'stein_waechter','stein_waechter','echo_rufer','echo_rufer','monolith_koloss',
    'steinhaut','steinhaut','erdbeben','erdbeben','steinschlag','monolith_erwachen',
    'steinmauer','steinmauer','felssturz','felssturz',
  ];
  NT.STIMME_DECK = [ // Chor zweier Zeiten — Finsternis/Kontrolle (K4, diff 8)
    'echo_fluesterer','echo_fluesterer','echo_fluesterer','stimmen_chor','stimmen_chor','stimmen_chor',
    'riss_fragment','riss_fragment','zeit_echo','stimme_boss',
    'stimme_der_zeit','stimme_der_zeit','zeit_riss','dunkle_prophezeiung','riss_duplikat','riss_duplikat',
    'echo_falle','echo_falle','zeit_blase','zeit_blase',
  ];
  NT.SPIEGEL_DECK = [ // Das Dunkle Echo — dunkles Spiegelbild, FINALBOSS (K4, diff 9)
    'echo_schattendoppel','echo_schattendoppel','echo_schattendoppel','dunkler_genin','dunkler_genin','dunkler_genin',
    'spiegel_waechter','spiegel_waechter','echo_naruto','echo_spiegel_boss',
    'spiegel_technik','spiegel_technik','dunkles_rasengan','dunkles_rasengan','riss_oeffnung','zeit_falte',
    'spiegel_reflexion','spiegel_reflexion','dunkler_zylinder','dunkler_zylinder',
  ];

  /* ---------- Zeitreise-Decks „Die Shinobi-Ära" (neue Map, je 20 Karten, 2026-07) ---------- */
  NT.MIZUKI_DECK = [ // Die Schriftrolle der Siegelung — Verrat & dumme Brüder (diff 7)
    'mizuki','mizuki','mizuki','fujin_raijin','fujin_raijin','fujin_raijin',
    'akademie_schueler','akademie_schueler','mizuki_verraeter','mizuki_verraeter',
    'bunshin_jutsu','bunshin_jutsu','fuuma_shuriken','fuuma_shuriken','schriftrolle_siegelung','schriftrolle_siegelung','henge_jutsu',
    'kawarimi_klassik','kawarimi_klassik','kawarimi_klassik',
  ];
  NT.HAKU_DECK = [ // Eis & Spiegel — Senbon, Klon-Schwarm, Umleitung (diff 7)
    'haku_eisnadel','haku_eisnadel','haku_eisnadel','daemon_brueder','daemon_brueder','daemon_brueder',
    'haku_spiegel','haku_spiegel','zabuza_momo','zabuza_momo',
    'mizu_bunshin','mizu_bunshin','senbon_sturm','senbon_sturm','kirigakure_jutsu','suiton_drache',
    'makyou_hyoushou','makyou_hyoushou','eis_fesseln','gefrorene_falle',
  ];
  NT.ZABUZA_DECK = [ // Lautloses Töten — Kiri-Schwarm, Haku ruft den Dämon (diff 8, BOSS)
    'daemon_brueder','daemon_brueder','daemon_brueder','oinin_jaeger','oinin_jaeger','oinin_jaeger',
    'haku_klinge','haku_klinge','zabuza_daemon','zabuza_daemon',
    'kubikiribouchou','kubikiribouchou','suiro_jutsu','suiro_jutsu','mizu_bunshin','mizu_bunshin',
    'lautloses_toeten','lautloses_toeten','gefrorene_falle','gefrorene_falle',
  ];
  NT.OROCHIMARU_K7_DECK = [ // Schatten über der Prüfung — Edo, Fluchmal, Yamata (diff 8)
    'oto_ninja','oto_ninja','oto_ninja','zaku_oto','zaku_oto','zaku_oto',
    'kabuto_assistent','kabuto_assistent','kabuto_assistent','manda','orochimaru_sannin','yamata_no_jutsu',
    'edo_tensei_jutsu','fluchmal_kraft','fluchmal_kraft','weisse_schlange','weisse_schlange','kusa_nagi',
    'schlangengrube','schlangengrube',
  ];
  NT.GAARA_K7_DECK = [ // Sturm auf Konoha — Sand-Wall bis Shukaku erwacht (diff 8, BOSS)
    'baki_suna','baki_suna','matsuri_suna','matsuri_suna','kankuro_marionette','kankuro_marionette',
    'temari_wind','temari_wind','gaara_wueste','gaara_wueste','shukaku','shukaku',
    'sand_sarg','sand_sarg','sabaku_sousou','sabaku_sousou','sand_klon','sandsturm',
    'sand_mauer','sand_mauer',
  ];
  NT.ITACHI_K8_DECK = [ // Akatsuki in Konoha — Genjutsu, Samehada, Susanoo (diff 9, BOSS)
    'kisame_hoshigaki','kisame_hoshigaki','kisame_hoshigaki','karasu_bote','karasu_bote','karasu_bote',
    'itachi_genjutsu','itachi_genjutsu','kisame_samehada','kisame_samehada','itachi_mangekyou','itachi_susanoo',
    'amaterasu','tsukuyomi','tsukuyomi','kotoamatsukami','karasu_nebel',
    'genjutsu_spiegel','genjutsu_spiegel','karasu_taeuschung',
  ];
  NT.KIMIMARO_DECK = [ // Der Viererklang — Schwarm + Kimimaro als unsterblicher Rammbock (diff 9, BOSS)
    'jirobo','jirobo','tayuya','tayuya','tayuya',
    'kidomaru','kidomaru','sakon_ukon','sakon_ukon','kimimaro_kaguya','kimimaro_kaguya',
    'spinnennetz','spinnennetz','floeten_melodie','knochen_tanz','knochen_tanz',
    'fluchmal_stufe2','fluchmal_stufe2','fluchmal_stufe2','schall_barriere',
  ];
  NT.PAIN_DECK = [ // Die Sechs Pfade — Rinnegan-Schwarm, Tendō als Richter (diff 9, BOSS)
    'gakido','gakido','ningendo','ningendo','ningendo','shurado',
    'shurado','shurado','chikushodo','chikushodo','jigokudo','pain_tendo','pain_tendo',
    'shinra_tensei','chibaku_tensei','chibaku_tensei','papier_sturm','regen_der_erkenntnis',
    'chou_shinra','chou_shinra',
  ];
  NT.MADARA_DECK = [ // Das Auge am Himmel — Uchiha-Apokalypse (diff 10, FINALBOSS)
    'zetsu','zetsu','zetsu','weisser_zetsu','weisser_zetsu','weisser_zetsu',
    'obito_kamui','obito_kamui','madara_uchiha','madara_uchiha',
    'gokka_mekkyaku','gokka_mekkyaku','tengai_shinsei','tengai_shinsei','kamui_jutsu','gedo_rinne_tensei',
    'uchiwa_ruckstoss','uchiwa_ruckstoss','susanoo_gard','susanoo_gard',
  ];

  /* ---------- Basis-Sammlung: genau das Starter-Deck (Thema Konoha) ---------- */
  NT.BASE_COLLECTION = (function () {
    const base = {};
    for (const id of NT.STARTER_DECK) base[id] = (base[id] || 0) + 1;
    return base;
  })();

  /* ---------- Gegner (Stufen-System wie in Duel Links) ----------
     Drops: Sieg rollt pro Rarität 1 Karte aus dem gegnerischen Deck
     (NT.farmPool) — N 100 % · R 50 % · SR 5 % · UR 2 %, beim Erst-Sieg
     erhöht (R 80 % · SR 30 % · UR 10 %). Bosse spielen Themen-Decks
     mit Synergien; ihre Karten sind der Farm-Pool. */
  NT.OPPONENTS = [
    {
      id:'iruka', name:'Iruka Sensei', avatar:'📚', title:'Akademie-Training', difficulty:1,
      flavor:'„Zeig mir, was du in der Akademie gelernt hast!"',
      deck: NT.IRUKA_DECK.slice(), // kuratiert: Akademie & Grundlagen
    },
    {
      id:'sasuke', name:'Sasuke Uchiha', avatar:'⚡', title:'Uchiha-Ehrgeiz', difficulty:2,
      flavor:'„Ich werde stärker — egal, was es kostet."',
      deck: NT.SASUKE_DECK.slice(),
    },
    {
      id:'gaara', name:'Gaara des Sandes', avatar:'🏜️', title:'Sand-Verteidigung', difficulty:3,
      flavor:'„Mein Sand ist meine absolute Verteidigung."',
      deck: NT.GAARA_DECK.slice(),
    },
    {
      id:'kakashi', name:'Kakashi Hatake', avatar:'📕', title:'Der Kopier-Ninja', difficulty:4,
      flavor:'„In der Ninja-Welt zählt Teamarbeit mehr als Regeln."',
      deck: NT.KAKASHI_DECK.slice(),
    },
    {
      id:'orochimaru', name:'Orochimaru', avatar:'🐍', title:'Der Schlangen-Beschwörer', difficulty:5,
      flavor:'„Ich will alle Jutsus dieser Welt besitzen …"',
      // Thema Schlangen/Oto: Oto-Nest (Manda→Oto-Ninja, Orochimaru per_turn) + Edo Tensei
      deck: NT.OROCHIMARU_DECK.slice(),
    },
    {
      id:'itachi', name:'Itachi Uchiha', avatar:'🌑', title:'Akatsuki-Boss', difficulty:6, boss:true,
      flavor:'„Du hast nicht genug Hass. Komm wieder, wenn du stärker bist."',
      // Thema Genjutsu/Feuer: Uchiha-Flamme (Sasuke, Katon, Amaterasu) + Akatsuki-Elite
      deck: NT.ITACHI_DECK.slice(),
    },
  ];

  /* ---------- Story-NPCs (Map-Stationen; Farm-Trainer skalieren über difficulty) ---------- */
  NT.STORY_OPPS = [
    {
      id:'iruka_story', name:'Meister Iruka', avatar:'🎓', title:'Aufnahmeprüfung', difficulty:2,
      flavor:'„Zeig mir, dass du dein Deck fühlst — nicht nur spielst."',
      deck: NT.IRUKA_DECK.slice(), // kuratiert: Akademie & Grundlagen
    },
    {
      id:'genin_trainer', name:'Trainer Genji', avatar:'🥋', title:'Genin-Training', difficulty:2, farm:true,
      flavor:'„Grundlagen, Grundlagen, Grundlagen!"',
      deck: NT.GENJI_DECK.slice(),
    },
    {
      id:'chunin_trainer', name:'Trainerin Aya', avatar:'🎯', title:'Chunin-Training', difficulty:4, farm:true,
      flavor:'„Gegen mich lernst du, Fallen zu fürchten."', unlockAfter:'genin_trainer',
      deck: NT.AYA_DECK.slice(),
    },
    {
      id:'jonin_trainer', name:'Meister Daigo', avatar:'🔥', title:'Jonin-Training', difficulty:6, farm:true,
      flavor:'„Zeig mir ein Duell, das man den Jonin erzählen kann."', unlockAfter:'chunin_trainer',
      deck: NT.DAIGO_DECK.slice(),
    },
    {
      id:'ramen_kotei', name:'Kotei (Ramen-Raufbold)', avatar:'🍜', title:'Ramen-Duell', difficulty:1, farm:true,
      flavor:'„Wer zuletzt bestellt, zahlt! Duell darum!"',
      deck: NT.KOTEI_DECK.slice(),
    },
    {
      id:'kurogane', name:'Kurogane', avatar:'🐸', title:'Arena-Champion der Kagā-Corp', difficulty:7, farm:true, boss:true,
      flavor:'„Meine vertrauten Geister kennen keine Gnade. Dein Deck schon?"',
      // Kuratiertes Jiraiya/Kröten-Boss-Deck (20 Karten): Eremit sucht Jutsus,
      // Gama→Gamakichi-Kette, Gamaken als Umleitungs-Wall, Sumpf drückt die Werte,
      // Finish: 2 Kröten → Gamabunta-König (Hand-Bounce statt Zerstörung).
      deck:[ 'jiraiya_eremit','jiraiya_eremit','jiraiya_eremit','gama','gama','gama',
             'gamakichi_krieger','gamakichi_krieger','gamaken_waechter','gamabunta_koenig',
             'kroeten_ruf','kroeten_ruf','rasengan_eremit','rasengan_eremit','yomi_numa','kroeten_magen',
             'kroeten_schild','kroeten_schild','hartschaum','hartschaum' ],
    },
    /* ---------- Kapitel 3: Kagā-Turm ---------- */
    {
      id:'kagaa_shizuka', name:'Shizuka', avatar:'🛂', title:'Eignungsprüfung der Corp', difficulty:5, farm:true,
      flavor:'„Protokoll ist Protokoll. Auch für Champions."',
      deck: NT.SHIZUKA_DECK.slice(),
    },
    {
      id:'kagaa_raiga', name:'Sicherheitschef Raiga', avatar:'🛡️', title:'Turm-Sicherheit', difficulty:7, farm:true,
      flavor:'„Ich bin nicht Shizuka. Erhebe dein Deck!"',
      // Thema Verteidigung/Kontrolle mit Biss: Elite-Körper + Sand-Wall + Fallen-Deckung
      deck: NT.RAIGA_DECK.slice(),
    },
    {
      id:'kagaa_kagaa', name:'Direktor Kagā', avatar:'🏢', title:'Herr des Echo-Archivs', difficulty:8, farm:true, boss:true,
      flavor:'„Zwanzig Jahre habe ich auf diesen Riss gewartet."',
      // Thema Echo-Archiv: die stärksten Relikte der Corp (UR-Sammlung)
      deck: NT.KAGAA_DECK.slice(),
    },

    /* ---------- Kapitel 4 (Hokage-Turm, Finale) ---------- */
    {
      id:'echo_waechter', name:'Monolith', avatar:'🗿', title:'Echo-Wächter des Hokage-Turms', difficulty:7, farm:true,
      flavor:'„NUR WER MICH BEZWINGT, BETRITTT DEN TURM."',
      // Defensiv-Wall (Erde/Wasser) mit Biss: 11 kleine, 4 Ein-Tribut, 2 Zwei-Tribut
      deck: NT.WAECHTER_DECK.slice(),
    },
    {
      id:'riss_stimme', name:'Die Stimme des Risses', avatar:'🌌', title:'Chor zweier Zeiten', difficulty:8, farm:true,
      flavor:'„WIR SIND DIE KARTEN, DIE DU SPIELTEST."',
      // Finsternis/Kontrolle: 11 kleine, 4 Ein-Tribut, 3 Zwei-Tribut
      deck: NT.STIMME_DECK.slice(),
    },
    {
      id:'echo_spiegel', name:'Das Dunkle Echo', avatar:'🌑', title:'Der Riss in deiner Gestalt', difficulty:9, farm:true, boss:true,
      flavor:'„Ich bin jede Karte, die du je gespielt hast."',
      // Spiegel-Deck (UR-lastig wie Kagā, plus die neuen Karten): 11 kleine, 4 Ein-Tribut, 3 Zwei-Tribut
      deck: NT.SPIEGEL_DECK.slice(),
    },

    /* ---------- Kapitel 5–9: Zeitreise „Die Shinobi-Ära" (neue Map, Kanon-Gegner) ---------- */
    {
      id:'mizuki_story', name:'Mizuki', avatar:'🎭', title:'Verräter der Akademie', difficulty:7, farm:true,
      flavor:'„Die Schriftrolle gehört MIR — und deine komischen Karten gleich dazu!"',
      deck: NT.MIZUKI_DECK.slice(),
    },
    {
      id:'haku_story', name:'Haku', avatar:'🧊', title:'Eis-Spiegel der Wellen', difficulty:7, farm:true,
      flavor:'„Ich bin nur ein Werkzeug. Aber ein Werkzeug, das dich aufhalten wird."',
      deck: NT.HAKU_DECK.slice(),
    },
    {
      id:'zabuza_story', name:'Zabuza Momochi', avatar:'🗡️', title:'Dämon des verborgenen Nebels', difficulty:8, farm:true, boss:true,
      flavor:'„Lautlos. Aus dem Nebel. Das ist der letzte Ton, den du hörst."',
      deck: NT.ZABUZA_DECK.slice(),
    },
    {
      id:'orochimaru_story', name:'Orochimaru', avatar:'🐍', title:'Schatten über der Prüfung', difficulty:8, farm:true,
      flavor:'„Kukuku … aus welcher Zeit du auch kommst — dein Körper interessiert mich."',
      deck: NT.OROCHIMARU_K7_DECK.slice(),
    },
    {
      id:'gaara_story', name:'Gaara – Shukakus Zorn', avatar:'🏜️', title:'Sturm auf Konoha', difficulty:8, farm:true, boss:true,
      flavor:'„Existiere ich, um zu töten? Dann beweise du mir das Gegenteil."',
      deck: NT.GAARA_K7_DECK.slice(),
    },
    {
      id:'itachi_story', name:'Itachi & Kisame', avatar:'🌑', title:'Akatsuki in Konoha', difficulty:9, farm:true, boss:true,
      flavor:'„Du bist stark. Aber du schaust nicht in meine Augen — oder doch?"',
      deck: NT.ITACHI_K8_DECK.slice(),
    },
    {
      id:'kimimaro_story', name:'Kimimaro & der Viererklang', avatar:'🦴', title:'Der Klang fünfter Gräber', difficulty:9, farm:true, boss:true,
      flavor:'„Mein Körper lebt für Lord Orochimaru. Gegen dich."',
      deck: NT.KIMIMARO_DECK.slice(),
    },
    {
      id:'pain_story', name:'Pain', avatar:'👁️', title:'Die Sechs Pfade', difficulty:9, farm:true, boss:true,
      flavor:'„Schmerz lehrt die Welt. Spüre ihn. Lerne ihn. Fürchte ihn."',
      deck: NT.PAIN_DECK.slice(),
    },
    {
      id:'madara_story', name:'Madara Uchiha', avatar:'🔥', title:'Das Auge am Himmel', difficulty:10, farm:true, boss:true,
      flavor:'„Dieser Mond trägt mein Auge. Deine Zeitreise war MEIN Plan, kleiner Duellant."',
      deck: NT.MADARA_DECK.slice(),
    },
  ];

  /* ---------- Farm-Pool: einzigartige Karten des gegnerischen Decks nach Rarität ----------
     Grundlage der Drops: ein Sieg rollt pro vorhandener Stufe 1 Karte
     (Raten in duel.js checkWin: N 100 % · R 50 % · SR 5 % · UR 2 %,
     Erst-Sieg: R 80 % · SR 30 % · UR 10 %). DOM-frei (Node-Tests). */
  NT.farmPool = function (opp) {
    const pool = { N: [], R: [], SR: [], UR: [] };
    const seen = {};
    for (const id of opp.deck) {
      if (seen[id]) continue;
      seen[id] = 1;
      const c = CARDS[id];
      if (!c || c.token) continue;
      pool[c.rarity].push(id);
    }
    return pool;
  };

  /* Bis zu 3 begehrteste Karten des Pools (UR>SR>R) als Anzeige-Text */
  NT.farmHighlight = function (opp) {
    const pool = NT.farmPool(opp);
    const top = pool.UR.concat(pool.SR, pool.R).slice(0, 3);
    return top.map((id) => CARDS[id].name).join(' · ');
  };

  /* ---------- Zufallskarte einer Rarität (Erfolgs-Belohnungen) ---------- */
  NT.randomCard = function (rarity) {
    const pool = [];
    for (const id in CARDS) if (!CARDS[id].token && CARDS[id].rarity === rarity) pool.push(id);
    return pool[Math.floor(Math.random() * pool.length)];
  };

  /* Gesamtzahl sammelbarer Karten (ohne Tokens) */
  NT.totalCards = function () {
    let n = 0;
    for (const id in CARDS) if (!CARDS[id].token) n++;
    return n;
  };

  /* ---------- Erfolge (Achievements) ----------
     check(s) mit s = { wins, losses, games, damage, uniqueCards, oppWins(id) }.
     rarity = Rarität der Zufalls-Belohnungskarte. DOM-frei (Node-Tests). */
  NT.ACHIEVEMENTS = [
    { id:'first_win',   name:'Erster Sieg',        desc:'Gewinne dein erstes Duell.',            rarity:'R',  check:(s)=>s.wins >= 1 },
    { id:'win_10',      name:'Dauerbrenner',       desc:'Gewinne 10 Duelle.',                    rarity:'R',  check:(s)=>s.wins >= 10 },
    { id:'win_25',      name:'Duell-Veteran',      desc:'Gewinne 25 Duelle.',                    rarity:'SR', check:(s)=>s.wins >= 25 },
    { id:'win_50',      name:'Duell-Legende',      desc:'Gewinne 50 Duelle.',                    rarity:'UR', check:(s)=>s.wins >= 50 },
    { id:'beat_itachi', name:'Akatsuki-Bezwinger', desc:'Besiege Itachi Uchiha.',                rarity:'SR', check:(s)=>s.oppWins('itachi') >= 1 },
    { id:'beat_kurog',  name:'Arena-Champion',     desc:'Besiege Kurogane in der Arena.',        rarity:'SR', check:(s)=>s.oppWins('kurogane') >= 1 },
    { id:'beat_kagaa',  name:'Echo-Bezwinger',     desc:'Besiege Direktor Kagā.',                rarity:'UR', check:(s)=>s.oppWins('kagaa_kagaa') >= 1 },
    { id:'beat_echo',   name:'Erfüllte Prophezeiung', desc:'Besiege das Dunkle Echo und schließe den Riss.', rarity:'UR', check:(s)=>s.oppWins('echo_spiegel') >= 1 },
    { id:'beat_zabuza', name:'Nebel-Bezwinger',    desc:'Besiege Zabuza Momochi im Land der Wellen.',      rarity:'SR', check:(s)=>s.oppWins('zabuza_story') >= 1 },
    { id:'beat_pain',   name:'Rinnegan-Bezwinger', desc:'Besiege Pain und rette Konoha.',                  rarity:'UR', check:(s)=>s.oppWins('pain_story') >= 1 },
    { id:'beat_madara', name:'Hüter zweier Zeiten', desc:'Besiege Madara Uchiha und beende das Mugen Tsukuyomi.', rarity:'UR', check:(s)=>s.oppWins('madara_story') >= 1 },
    { id:'dmg_10k',     name:'Chakra-Schlag',      desc:'Füge insgesamt 10.000 Schaden zu.',     rarity:'R',  check:(s)=>s.damage >= 10000 },
    { id:'dmg_50k',     name:'Verwüstung',         desc:'Füge insgesamt 50.000 Schaden zu.',     rarity:'SR', check:(s)=>s.damage >= 50000 },
    { id:'coll_60',     name:'Sammler',            desc:'Besitze 60 verschiedene Karten.',       rarity:'R',  check:(s)=>s.uniqueCards >= 60 },
    { id:'coll_75',     name:'Großsammler',        desc:'Besitze 75 verschiedene Karten.',       rarity:'SR', check:(s)=>s.uniqueCards >= 75 },
    { id:'coll_all',    name:'Karten-Meister',     desc:'Besitze jede Karte mindestens 1×.',     rarity:'UR', check:(s)=>s.uniqueCards >= NT.totalCards() },
  ];

  /* ---------- Hilfsfunktionen ---------- */
  NT.cardOf = function (id) { return CARDS[id]; };
  NT.isNinja = function (id) { return CARDS[id] && CARDS[id].kind === 'ninja'; };

  NT.validateDeck = function (deckIds, collection) {
    if (!Array.isArray(deckIds)) return { ok:false, msg:'Kein Deck vorhanden.' };
    if (deckIds.length < 20) return { ok:false, msg:'Deck braucht mindestens 20 Karten (' + deckIds.length + '/20).' };
    if (deckIds.length > 30) return { ok:false, msg:'Deck darf höchstens 30 Karten haben (' + deckIds.length + '/30).' };
    const counts = {};
    for (const id of deckIds) {
      if (!CARDS[id] || CARDS[id].token) return { ok:false, msg:'Unbekannte Karte: ' + id };
      counts[id] = (counts[id] || 0) + 1;
      if (counts[id] > 3) return { ok:false, msg:'Max. 3× „' + CARDS[id].name + '" pro Deck.' };
      if (collection && counts[id] > (collection[id] || 0))
        return { ok:false, msg:'„' + CARDS[id].name + '" nicht oft genug in der Sammlung.' };
    }
    return { ok:true };
  };

  NT.deckSize = { min: 20, max: 30 };
  NT.START_LP = 8000; // Start-LP beider Duellanten (Speed-Duel)

  /* ---------- UI-Bilder (assets/ui/, per Gemini generiert) ---------- */
  NT.OPP_AVATAR_IMG = {
    iruka:'assets/ui/av-iruka.jpg', sasuke:'assets/ui/av-sasuke.jpg', gaara:'assets/ui/av-gaara.jpg',
    kakashi:'assets/ui/av-kakashi.jpg', orochimaru:'assets/ui/av-orochimaru.jpg', itachi:'assets/ui/av-itachi.jpg',
    iruka_story:'assets/ui/av-iruka.jpg', genin_trainer:'assets/ui/av-genji.jpg',
    chunin_trainer:'assets/ui/av-aya.jpg', jonin_trainer:'assets/ui/av-daigo.jpg',
    ramen_kotei:'assets/ui/av-kotei.jpg', kurogane:'assets/ui/av-kurogane.jpg',
    kagaa_shizuka:'assets/story/talk-shizuka.jpg', kagaa_raiga:'assets/story/talk-raiga.jpg',
    kagaa_kagaa:'assets/story/talk-kagaa.jpg',
    echo_waechter:'assets/story/talk-monolith.jpg', riss_stimme:'assets/story/talk-stimme.jpg',
    echo_spiegel:'assets/story/talk-echo.jpg',
    mizuki_story:'assets/cards/mizuki_verraeter.jpg', haku_story:'assets/cards/haku_spiegel.jpg',
    zabuza_story:'assets/cards/zabuza_daemon.jpg', orochimaru_story:'assets/cards/orochimaru_sannin.jpg',
    gaara_story:'assets/cards/shukaku.jpg', itachi_story:'assets/cards/itachi_mangekyou.jpg',
    kimimaro_story:'assets/cards/kimimaro_kaguya.jpg', pain_story:'assets/cards/pain_tendo.jpg',
    madara_story:'assets/cards/madara_uchiha.jpg'
  };
  NT.PLAYER_AVATAR_IMG = 'assets/ui/av-player.jpg';

  /* Avatar-Markup: Emoji unten als Fallback, Bild deckt es ab, sobald es lädt */
  NT.avatarHtml = function (emoji, imgSrc) {
    if (!imgSrc) return emoji;
    return '<span class="av-wrap">' + emoji +
      '<img src="' + imgSrc + '" alt="" draggable="false" onerror="this.remove()"></span>';
  };

  /* GENERATED:CARDIMG — wird von tools/cardimgmanifest.js verwaltet (Kartenbilder) */
  NT.CARD_IMG = { 'abwehr_protokoll':'assets/cards/abwehr_protokoll.jpg', 'akademie_schueler':'assets/cards/akademie_schueler.jpg', 'akademie_unterricht':'assets/cards/akademie_unterricht.jpg', 'amaterasu':'assets/cards/amaterasu.jpg', 'anko_prueferin':'assets/cards/anko_prueferin.jpg', 'archiv_duplikat':'assets/cards/archiv_duplikat.jpg', 'archiv_kurator':'assets/cards/archiv_kurator.jpg', 'archiv_siegel':'assets/cards/archiv_siegel.jpg', 'archiv_wache':'assets/cards/archiv_wache.jpg', 'archiv_zugriff':'assets/cards/archiv_zugriff.jpg', 'asuma_jonin':'assets/cards/asuma_jonin.jpg', 'aya_meisterin':'assets/cards/aya_meisterin.jpg', 'ayame_service':'assets/cards/ayame_service.jpg', 'baki_suna':'assets/cards/baki_suna.jpg', 'beschuetzer_koerper':'assets/cards/beschuetzer_koerper.jpg', 'bunshin_jutsu':'assets/cards/bunshin_jutsu.jpg', 'bunshin_token':'assets/cards/bunshin_token.jpg', 'chakra_reflexion':'assets/cards/chakra_reflexion.jpg', 'chibaku_tensei':'assets/cards/chibaku_tensei.jpg', 'chidori':'assets/cards/chidori.jpg', 'chikushodo':'assets/cards/chikushodo.jpg', 'choji_stammgast':'assets/cards/choji_stammgast.jpg', 'chou_shinra':'assets/cards/chou_shinra.jpg', 'corp_falle':'assets/cards/corp_falle.jpg', 'corp_ruestung':'assets/cards/corp_ruestung.jpg', 'corp_sperrung':'assets/cards/corp_sperrung.jpg', 'daemon_brueder':'assets/cards/daemon_brueder.jpg', 'daten_analyse':'assets/cards/daten_analyse.jpg', 'doki_token':'assets/cards/doki_token.jpg', 'dunkle_prophezeiung':'assets/cards/dunkle_prophezeiung.jpg', 'dunkler_genin':'assets/cards/dunkler_genin.jpg', 'dunkler_zylinder':'assets/cards/dunkler_zylinder.jpg', 'dunkles_rasengan':'assets/cards/dunkles_rasengan.jpg', 'echo_falle':'assets/cards/echo_falle.jpg', 'echo_fluesterer':'assets/cards/echo_fluesterer.jpg', 'echo_naruto':'assets/cards/echo_naruto.jpg', 'echo_relikt':'assets/cards/echo_relikt.jpg', 'echo_resonanz':'assets/cards/echo_resonanz.jpg', 'echo_rufer':'assets/cards/echo_rufer.jpg', 'echo_schattendoppel':'assets/cards/echo_schattendoppel.jpg', 'echo_spiegel_boss':'assets/cards/echo_spiegel_boss.jpg', 'echo_waechter_klein':'assets/cards/echo_waechter_klein.jpg', 'edo_tensei_jutsu':'assets/cards/edo_tensei_jutsu.jpg', 'eis_fesseln':'assets/cards/eis_fesseln.jpg', 'eisener_vorhang':'assets/cards/eisener_vorhang.jpg', 'endloser_nachschlag':'assets/cards/endloser_nachschlag.jpg', 'entschaerfen':'assets/cards/entschaerfen.jpg', 'erdbeben':'assets/cards/erdbeben.jpg', 'erdriss':'assets/cards/erdriss.jpg', 'felssturz':'assets/cards/felssturz.jpg', 'festnahme':'assets/cards/festnahme.jpg', 'feuer_versteck':'assets/cards/feuer_versteck.jpg', 'fingers_kugeln':'assets/cards/fingers_kugeln.jpg', 'floeten_melodie':'assets/cards/floeten_melodie.jpg', 'fluchmal_kraft':'assets/cards/fluchmal_kraft.jpg', 'fluchmal_stufe2':'assets/cards/fluchmal_stufe2.jpg', 'fujin_raijin':'assets/cards/fujin_raijin.jpg', 'fuuma_shuriken':'assets/cards/fuuma_shuriken.jpg', 'gaara_wueste':'assets/cards/gaara_wueste.jpg', 'gakido':'assets/cards/gakido.jpg', 'gama':'assets/cards/gama.jpg', 'gamabunta_koenig':'assets/cards/gamabunta_koenig.jpg', 'gamaken_waechter':'assets/cards/gamaken_waechter.jpg', 'gamakichi_krieger':'assets/cards/gamakichi_krieger.jpg', 'gedo_rinne_tensei':'assets/cards/gedo_rinne_tensei.jpg', 'gefrorene_falle':'assets/cards/gefrorene_falle.jpg', 'genjutsu_spiegel':'assets/cards/genjutsu_spiegel.jpg', 'genma_jonin':'assets/cards/genma_jonin.jpg', 'gokka_mekkyaku':'assets/cards/gokka_mekkyaku.jpg', 'goukakyuu':'assets/cards/goukakyuu.jpg', 'gouken':'assets/cards/gouken.jpg', 'grosse_portion':'assets/cards/grosse_portion.jpg', 'hachimon_kai':'assets/cards/hachimon_kai.jpg', 'haku_eisnadel':'assets/cards/haku_eisnadel.jpg', 'haku_klinge':'assets/cards/haku_klinge.jpg', 'haku_spiegel':'assets/cards/haku_spiegel.jpg', 'hartes_training':'assets/cards/hartes_training.jpg', 'hartschaum':'assets/cards/hartschaum.jpg', 'henge_jutsu':'assets/cards/henge_jutsu.jpg', 'ichiraku_ramen':'assets/cards/ichiraku_ramen.jpg', 'iruka_lehrer':'assets/cards/iruka_lehrer.jpg', 'iruka_waechter':'assets/cards/iruka_waechter.jpg', 'itachi_genjutsu':'assets/cards/itachi_genjutsu.jpg', 'itachi_mangekyou':'assets/cards/itachi_mangekyou.jpg', 'itachi_susanoo':'assets/cards/itachi_susanoo.jpg', 'jigokudo':'assets/cards/jigokudo.jpg', 'jiraiya_eremit':'assets/cards/jiraiya_eremit.jpg', 'jirobo':'assets/cards/jirobo.jpg', 'jonin_reflex':'assets/cards/jonin_reflex.jpg', 'jumbo_hund_token':'assets/cards/jumbo_hund_token.jpg', 'kabuto_assistent':'assets/cards/kabuto_assistent.jpg', 'kagaa_analyst':'assets/cards/kagaa_analyst.jpg', 'kagaa_autoritaet':'assets/cards/kagaa_autoritaet.jpg', 'kagaa_bollwerk':'assets/cards/kagaa_bollwerk.jpg', 'kagaa_boss':'assets/cards/kagaa_boss.jpg', 'kagaa_direktor':'assets/cards/kagaa_direktor.jpg', 'kagaa_schildwache':'assets/cards/kagaa_schildwache.jpg', 'kagaa_techniker':'assets/cards/kagaa_techniker.jpg', 'kagaa_wache':'assets/cards/kagaa_wache.jpg', 'kage_buyou':'assets/cards/kage_buyou.jpg', 'kage_token':'assets/cards/kage_token.jpg', 'kagemane_jutsu':'assets/cards/kagemane_jutsu.jpg', 'kakashi_jonin':'assets/cards/kakashi_jonin.jpg', 'kakashi_raikiri':'assets/cards/kakashi_raikiri.jpg', 'kamui_jutsu':'assets/cards/kamui_jutsu.jpg', 'kankuro_marionette':'assets/cards/kankuro_marionette.jpg', 'karasu_bote':'assets/cards/karasu_bote.jpg', 'karasu_nebel':'assets/cards/karasu_nebel.jpg', 'karasu_taeuschung':'assets/cards/karasu_taeuschung.jpg', 'katon_itachi':'assets/cards/katon_itachi.jpg', 'kawarimi_klassik':'assets/cards/kawarimi_klassik.jpg', 'kawarimi_trick':'assets/cards/kawarimi_trick.jpg', 'ketten_fesseln':'assets/cards/ketten_fesseln.jpg', 'kibaku_fuda':'assets/cards/kibaku_fuda.jpg', 'kidomaru':'assets/cards/kidomaru.jpg', 'kimimaro_kaguya':'assets/cards/kimimaro_kaguya.jpg', 'kirigakure_jutsu':'assets/cards/kirigakure_jutsu.jpg', 'kisame_hoshigaki':'assets/cards/kisame_hoshigaki.jpg', 'kisame_samehada':'assets/cards/kisame_samehada.jpg', 'knochen_tanz':'assets/cards/knochen_tanz.jpg', 'konoha_senpuu':'assets/cards/konoha_senpuu.jpg', 'konoha_wirbel':'assets/cards/konoha_wirbel.jpg', 'konohamaru_rivale':'assets/cards/konohamaru_rivale.jpg', 'kotei_boss':'assets/cards/kotei_boss.jpg', 'kotetsu_jonin':'assets/cards/kotetsu_jonin.jpg', 'kotoamatsukami':'assets/cards/kotoamatsukami.jpg', 'kroeten_magen':'assets/cards/kroeten_magen.jpg', 'kroeten_ruf':'assets/cards/kroeten_ruf.jpg', 'kroeten_schild':'assets/cards/kroeten_schild.jpg', 'kubikiribouchou':'assets/cards/kubikiribouchou.jpg', 'kunai_falle':'assets/cards/kunai_falle.jpg', 'kunai_hagel':'assets/cards/kunai_hagel.jpg', 'kunai_sturm':'assets/cards/kunai_sturm.jpg', 'kusa_nagi':'assets/cards/kusa_nagi.jpg', 'lautloses_toeten':'assets/cards/lautloses_toeten.jpg', 'lees_training':'assets/cards/lees_training.jpg', 'madara_uchiha':'assets/cards/madara_uchiha.jpg', 'makyou_hyoushou':'assets/cards/makyou_hyoushou.jpg', 'manda':'assets/cards/manda.jpg', 'mandas_zorn':'assets/cards/mandas_zorn.jpg', 'matsuri_suna':'assets/cards/matsuri_suna.jpg', 'might_guy':'assets/cards/might_guy.jpg', 'might_guy_sensei':'assets/cards/might_guy_sensei.jpg', 'mizu_bunshin':'assets/cards/mizu_bunshin.jpg', 'mizu_token':'assets/cards/mizu_token.jpg', 'mizuki':'assets/cards/mizuki.jpg', 'mizuki_verraeter':'assets/cards/mizuki_verraeter.jpg', 'mokuton_falle':'assets/cards/mokuton_falle.jpg', 'monolith_erwachen':'assets/cards/monolith_erwachen.jpg', 'monolith_koloss':'assets/cards/monolith_koloss.jpg', 'monolith_splitter':'assets/cards/monolith_splitter.jpg', 'mugen_tsukuyomi':'assets/cards/mugen_tsukuyomi.jpg', 'naruto_genin':'assets/cards/naruto_genin.jpg', 'naruto_kyuubi':'assets/cards/naruto_kyuubi.jpg', 'naruto_schueler':'assets/cards/naruto_schueler.jpg', 'neukalibrierung':'assets/cards/neukalibrierung.jpg', 'ningendo':'assets/cards/ningendo.jpg', 'ninken_falle':'assets/cards/ninken_falle.jpg', 'ninken_rudel':'assets/cards/ninken_rudel.jpg', 'obito_kamui':'assets/cards/obito_kamui.jpg', 'oinin_jaeger':'assets/cards/oinin_jaeger.jpg', 'orochimaru_sannin':'assets/cards/orochimaru_sannin.jpg', 'oto_ninja':'assets/cards/oto_ninja.jpg', 'pain_tendo':'assets/cards/pain_tendo.jpg', 'pakkun_ninken':'assets/cards/pakkun_ninken.jpg', 'papier_sturm':'assets/cards/papier_sturm.jpg', 'raiga_boss':'assets/cards/raiga_boss.jpg', 'raiga_scout':'assets/cards/raiga_scout.jpg', 'raiga_veteran':'assets/cards/raiga_veteran.jpg', 'raikiri_jutsu':'assets/cards/raikiri_jutsu.jpg', 'rasengan_eremit':'assets/cards/rasengan_eremit.jpg', 'rasengan_genin':'assets/cards/rasengan_genin.jpg', 'regen_der_erkenntnis':'assets/cards/regen_der_erkenntnis.jpg', 'rinnegan_blick':'assets/cards/rinnegan_blick.jpg', 'riss_duplikat':'assets/cards/riss_duplikat.jpg', 'riss_fragment':'assets/cards/riss_fragment.jpg', 'riss_oeffnung':'assets/cards/riss_oeffnung.jpg', 'riss_welle':'assets/cards/riss_welle.jpg', 'rock_lee':'assets/cards/rock_lee.jpg', 'sabaku_sousou':'assets/cards/sabaku_sousou.jpg', 'sakon_ukon':'assets/cards/sakon_ukon.jpg', 'samehada':'assets/cards/samehada.jpg', 'sand_falle':'assets/cards/sand_falle.jpg', 'sand_klon':'assets/cards/sand_klon.jpg', 'sand_mauer':'assets/cards/sand_mauer.jpg', 'sand_sarg':'assets/cards/sand_sarg.jpg', 'sand_token':'assets/cards/sand_token.jpg', 'sand_welle':'assets/cards/sand_welle.jpg', 'sandsturm':'assets/cards/sandsturm.jpg', 'sasuke_akademie':'assets/cards/sasuke_akademie.jpg', 'sasuke_fluchmal':'assets/cards/sasuke_fluchmal.jpg', 'sasuke_genin':'assets/cards/sasuke_genin.jpg', 'schall_barriere':'assets/cards/schall_barriere.jpg', 'scharfe_suppe':'assets/cards/scharfe_suppe.jpg', 'scharfes_comeback':'assets/cards/scharfes_comeback.jpg', 'schatten_bindung':'assets/cards/schatten_bindung.jpg', 'schattenspiel':'assets/cards/schattenspiel.jpg', 'schattentaeuschung':'assets/cards/schattentaeuschung.jpg', 'schlangen_token':'assets/cards/schlangen_token.jpg', 'schlangenbiss':'assets/cards/schlangenbiss.jpg', 'schlangengrube':'assets/cards/schlangengrube.jpg', 'schlangenhaut':'assets/cards/schlangenhaut.jpg', 'schriftrolle_siegelung':'assets/cards/schriftrolle_siegelung.jpg', 'schueler_naruto':'assets/cards/schueler_naruto.jpg', 'schuelerin_sakura':'assets/cards/schuelerin_sakura.jpg', 'senbon_sturm':'assets/cards/senbon_sturm.jpg', 'sharingan_blick':'assets/cards/sharingan_blick.jpg', 'sharingan_konter':'assets/cards/sharingan_konter.jpg', 'sharingan_kopie':'assets/cards/sharingan_kopie.jpg', 'shikadai_nara':'assets/cards/shikadai_nara.jpg', 'shikaku_taktiker':'assets/cards/shikaku_taktiker.jpg', 'shikamaru_stratege':'assets/cards/shikamaru_stratege.jpg', 'shinra_tensei':'assets/cards/shinra_tensei.jpg', 'shisui_uchiha':'assets/cards/shisui_uchiha.jpg', 'shizuka_kommandantin':'assets/cards/shizuka_kommandantin.jpg', 'shizuka_protokoll':'assets/cards/shizuka_protokoll.jpg', 'shukaku':'assets/cards/shukaku.jpg', 'shunshin':'assets/cards/shunshin.jpg', 'shurado':'assets/cards/shurado.jpg', 'shuriken_kage':'assets/cards/shuriken_kage.jpg', 'shuriken_wurf':'assets/cards/shuriken_wurf.jpg', 'sicherheits_sperre':'assets/cards/sicherheits_sperre.jpg', 'spiegel_reflexion':'assets/cards/spiegel_reflexion.jpg', 'spiegel_technik':'assets/cards/spiegel_technik.jpg', 'spiegel_waechter':'assets/cards/spiegel_waechter.jpg', 'spinnennetz':'assets/cards/spinnennetz.jpg', 'stein_waechter':'assets/cards/stein_waechter.jpg', 'steinhaut':'assets/cards/steinhaut.jpg', 'steinmauer':'assets/cards/steinmauer.jpg', 'steinschlag':'assets/cards/steinschlag.jpg', 'stimme_boss':'assets/cards/stimme_boss.jpg', 'stimme_der_zeit':'assets/cards/stimme_der_zeit.jpg', 'stimmen_chor':'assets/cards/stimmen_chor.jpg', 'suiken':'assets/cards/suiken.jpg', 'suiro_jutsu':'assets/cards/suiro_jutsu.jpg', 'suiton_drache':'assets/cards/suiton_drache.jpg', 'suna_yoroi':'assets/cards/suna_yoroi.jpg', 'susanoo_gard':'assets/cards/susanoo_gard.jpg', 'susanoo_schild':'assets/cards/susanoo_schild.jpg', 'system_breach':'assets/cards/system_breach.jpg', 'system_scan':'assets/cards/system_scan.jpg', 'tayuya':'assets/cards/tayuya.jpg', 'team7_formation':'assets/cards/team7_formation.jpg', 'temari_wind':'assets/cards/temari_wind.jpg', 'tengai_shinsei':'assets/cards/tengai_shinsei.jpg', 'tenten_waffen':'assets/cards/tenten_waffen.jpg', 'teuchi_ramen':'assets/cards/teuchi_ramen.jpg', 'tower_shield':'assets/cards/tower_shield.jpg', 'tsukuyomi':'assets/cards/tsukuyomi.jpg', 'uchiha_kawarimi':'assets/cards/uchiha_kawarimi.jpg', 'uchiwa_ruckstoss':'assets/cards/uchiwa_ruckstoss.jpg', 'verbotenes_relikt':'assets/cards/verbotenes_relikt.jpg', 'verdauungspause':'assets/cards/verdauungspause.jpg', 'versteinerung':'assets/cards/versteinerung.jpg', 'wasserspiegel':'assets/cards/wasserspiegel.jpg', 'weisse_schlange':'assets/cards/weisse_schlange.jpg', 'weisser_zetsu':'assets/cards/weisser_zetsu.jpg', 'yamata_no_jutsu':'assets/cards/yamata_no_jutsu.jpg', 'yomi_numa':'assets/cards/yomi_numa.jpg', 'zabuza_daemon':'assets/cards/zabuza_daemon.jpg', 'zabuza_momo':'assets/cards/zabuza_momo.jpg', 'zaku_oto':'assets/cards/zaku_oto.jpg', 'zeit_blase':'assets/cards/zeit_blase.jpg', 'zeit_echo':'assets/cards/zeit_echo.jpg', 'zeit_falte':'assets/cards/zeit_falte.jpg', 'zeit_riss':'assets/cards/zeit_riss.jpg', 'zeit_siegel':'assets/cards/zeit_siegel.jpg', 'zeit_sprung':'assets/cards/zeit_sprung.jpg', 'zetsu':'assets/cards/zetsu.jpg', 'zugriff_verweigert':'assets/cards/zugriff_verweigert.jpg' };
  /* :CARDIMG */
})(typeof window !== 'undefined' ? window : globalThis);
