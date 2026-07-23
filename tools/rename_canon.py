# -*- coding: utf-8 -*-
# Benennt generische OC-Fueller der neuen NPC-Decks in Naruto-Kanon-Karten um.
# Nur data.js: Karten-Keys (inkl. aller Vorkommen in Decklisten), name, desc.
import io, sys

p = 'js/data.js'
s = io.open(p, encoding='utf-8').read()

# old_id -> (new_id, name, desc, attr_override|None)
REN = [
  # Kotei
  ('ramen_raufbold', ('choji_stammgast', 'Chōji – Stammgast',
    'Sein Stammplatz bei Ichiraku ist heilig. Wer ihm die letzte Schüssel wegnimmt, bezahlt dafür.', 'erde')),
  # Genji -> Taijutsu (Lee/Guy/Tenten)
  ('dojo_schueler', ('rock_lee', 'Rock Lee',
    'Ein Genin ohne Talent für Ninjutsu — dafür mit eisernem Fleiß. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.', None)),
  ('trainings_partner', ('tenten_waffen', 'Tenten – Waffen-Ninja',
    'Meisterin der Waffen-Schriftrollen. Wenn diese Karte durch KAMPF zerstört wird: Beschwöre 1 „Might Guy" aus deinem Deck.', None)),
  ('genji_kaempfer', ('might_guy', 'Might Guy',
    'Konohas Grünes Ungeheuer! Erhält +300 ANG, solange ein anderer Taijutsu-Ninja offen auf deiner Feldseite liegt.', None)),
  ('genji_meister', ('might_guy_sensei', 'Might Guy – Sensei',
    'Kann in jeder Kampfphase zweimal angreifen. „Die Flamme der Jugend brennt ewig!"', None)),
  ('dojo_disziplin', ('lees_training', 'Lees Training',
    'Ziehe 1 Karte pro eigenem Ninja (max. 2). „500 Kniebeugen — fangen wir an!"', None)),
  ('eisen_faust', ('gouken', 'Gōken – Starke Faust',
    '1 deiner Ninja kann in diesem Zug zweimal angreifen.', None)),
  ('ausweichrolle', ('suiken', 'Suiken – Betrunkene Faust',
    'FALLE: Annulliere einen Angriff und beende die Kampfphase.', None)),
  ('konterschlag', ('kage_buyou', 'Kage Buyō',
    'FALLE: Wenn der Gegner angreift: Der Angreifer verliert dauerhaft 400 ANG.', None)),
  # Sasuke
  ('uchiha_schueler', ('sasuke_akademie', 'Sasuke – Akademie',
    'Jahrgangsbester der Akademie. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.', None)),
  ('katon_werfer', ('shisui_uchiha', 'Shisui – Uchiha-Talent',
    '„Shisui der Teleportation" — das größte Talent des Uchiha-Clans.', None)),
  # Gaara
  ('suna_shinobi', ('baki_suna', 'Baki – Suna-Jonin',
    'Jonin aus Sunagakure und Mentor der Sand-Geschwister.', None)),
  ('sand_spaeher', ('matsuri_suna', 'Matsuri – Sand-Schülerin',
    'Gaaras treueste Schülerin. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.', None)),
  ('ruestung_sand', ('suna_yoroi', 'Suna no Yoroi',
    '1 deiner Ninja ist in diesem Zug vor Effekt-Zerstörung geschützt.', None)),
  # Kakashi
  ('kopier_archiv', ('sharingan_kopie', 'Sharingan – Kopie-Jutsu',
    'Nimm 1 Ninja der Stufe 4 oder niedriger aus deinem Deck auf die Hand.', None)),
  ('kopie_konter', ('sharingan_konter', 'Sharingan – Konter',
    'FALLE: Wenn der Gegner ein Jutsu aktiviert: Annulliere es.', None)),
  # Aya -> Kanon-Fallen/Waffen
  ('fallen_azubi', ('shikadai_nara', 'Shikadai – Nara-Stratege',
    'Wenn diese Karte NORMAL beschworen wird: Nimm 1 FALLENKARTE aus deinem Deck auf die Hand.', None)),
  ('spreng_steller', ('anko_prueferin', 'Anko – Prüferin',
    'Die Prüferin der Chūnin-Auswahl liebt Fallen aller Art. Wenn diese Karte beschworen wird: Füge dem Gegner 300 Schaden zu.', None)),
  ('draht_makler', ('shikamaru_stratege', 'Shikamaru – Stratege',
    'FLIP: Ziehe 1 Karte. „Wie lästig … aber ich habe einen Plan."', None)),
  ('drahtnetz', ('kagemane_jutsu', 'Kagemane no Jutsu',
    '1 gegnerisches Ninja kann 2 Züge lang weder angreifen noch seine Effekte nutzen.', None)),
  ('sprengfalle', ('kibaku_fuda', 'Kibaku Fuda – Explosions-Tag',
    'FALLE: Wenn der Gegner angreift: Zerstöre den Angreifer.', None)),
  ('chakra_rohr', ('chakra_reflexion', 'Chakra-Reflexion',
    'FALLE: Annulliere einen Angriff; der Gegner erhält Schaden in Höhe der ANG seines Angreifers.', None)),
  ('reflexions_falle', ('wasserspiegel', 'Wasserspiegel',
    'FALLE: Wenn der Gegner angreift: Zerstöre alle seine Ninja in Angriffsposition.', None)),
  # Orochimaru
  ('hebi_schuetze', ('zaku_oto', 'Zaku – Schall-Schütze',
    'Kämpft mit Schallkanonen in den Armen. Durchdringung.', None)),
  ('schlangen_beschwoerer', ('kabuto_assistent', 'Kabuto – Assistent',
    'Orochimarus rechte Hand. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.', None)),
  # Daigo -> Kanon-Jonin
  ('jonin_rekrut', ('kotetsu_jonin', 'Kotetsu – Jonin',
    'Wachtmeister von Konoha, unzertrennlich von Izumo.', None)),
  ('jonin_veteran', ('genma_jonin', 'Genma – Veteran',
    'Tokubetsu-Jonin mit Senbon im Mund und vielen Missionen hinter sich.', None)),
  ('daigo_taktiker', ('shikaku_taktiker', 'Shikaku – Taktiker',
    'Oberbefehlshaber der Konoha-Streitkräfte. Alle deine offenen Ninja erhalten +200 ANG.', None)),
  ('daigo_kommandant', ('asuma_jonin', 'Asuma – Jonin-Kommandant',
    'Ehemaliger Wächter-Ninja der Zwölf. Durchdringung. Alle deine offenen Ninja erhalten +200 ANG.', None)),
  # Itachi
  ('akatsuki_spion', ('kisame_hoshigaki', 'Kisame – Hoshigaki',
    'Das Ungeheuer des Nebels, Itachis Partner. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.', None)),
]

fails = 0
for old, (new, name, desc, attr) in REN:
    if old not in s:
        print('ID fehlt:', old); fails += 1; continue
    s = s.replace("'" + old + "'", "'" + new + "'")          # Decklisten
    s = s.replace("    " + old + ":", "    " + new + ":")    # Karten-Key
    s = s.replace("id:'" + old + "'", "id:'" + new + "'")    # Kette (on_battle_destroy_summon)
    # name/desc innerhalb der Karten-Definition ersetzen (zeilenbasiert)
    import re
    blk = re.compile(r"(" + new + r": \{ kind:'ninja', name:')[^']*(',[^}]*?desc:')[^']*(' \})")
    s, n1 = blk.subn(lambda m: m.group(1) + name + m.group(2) + desc + m.group(3), s, count=1)
    if not n1:
        blk2 = re.compile(r"(" + new + r": \{ kind:'ninja', name:')[^']*(',.*\n.*desc:')[^']*(' \})")
        s, n1 = blk2.subn(lambda m: m.group(1) + name + m.group(2) + desc + m.group(3), s, count=1)
    if attr:
        blk3 = re.compile(r"(" + new + r": \{ kind:'ninja', name:'[^']*', level:\d+, atk:\d+, def:\d+, attr:')[a-z]+(')")
        s, _ = blk3.subn(lambda m: m.group(1) + attr + m.group(2), s, count=1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('fertig, fails =', fails)
