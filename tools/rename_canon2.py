# -*- coding: utf-8 -*-
# Setzt name/desc der umbenannten Kanon-Karten zeilenbasiert (Schritt 2).
import io

p = 'js/data.js'
lines = io.open(p, encoding='utf-8').read().split('\n')

META = {
  'choji_stammgast': ('Chōji – Stammgast', 'Sein Stammplatz bei Ichiraku ist heilig. Wer ihm die letzte Schüssel wegnimmt, bezahlt dafür.'),
  'rock_lee': ('Rock Lee', 'Ein Genin ohne Talent für Ninjutsu — dafür mit eisernem Fleiß. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.'),
  'tenten_waffen': ('Tenten – Waffen-Ninja', 'Meisterin der Waffen-Schriftrollen. Wenn diese Karte durch KAMPF zerstört wird: Beschwöre 1 „Might Guy" aus deinem Deck.'),
  'might_guy': ('Might Guy', 'Konohas Grünes Ungeheuer! Erhält +300 ANG, solange ein anderer Taijutsu-Ninja offen auf deiner Feldseite liegt.'),
  'might_guy_sensei': ('Might Guy – Sensei', 'Kann in jeder Kampfphase zweimal angreifen. „Die Flamme der Jugend brennt ewig!"'),
  'lees_training': ('Lees Training', 'Ziehe 1 Karte pro eigenem Ninja (max. 2). „500 Kniebeugen — fangen wir an!"'),
  'gouken': ('Gōken – Starke Faust', '1 deiner Ninja kann in diesem Zug zweimal angreifen.'),
  'suiken': ('Suiken – Betrunkene Faust', 'FALLE: Annulliere einen Angriff und beende die Kampfphase.'),
  'kage_buyou': ('Kage Buyō', 'FALLE: Wenn der Gegner angreift: Der Angreifer verliert dauerhaft 400 ANG.'),
  'sasuke_akademie': ('Sasuke – Akademie', 'Jahrgangsbester der Akademie. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.'),
  'shisui_uchiha': ('Shisui – Uchiha-Talent', '„Shisui der Teleportation" — das größte Talent des Uchiha-Clans.'),
  'baki_suna': ('Baki – Suna-Jonin', 'Jonin aus Sunagakure und Mentor der Sand-Geschwister.'),
  'matsuri_suna': ('Matsuri – Sand-Schülerin', 'Gaaras treueste Schülerin. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.'),
  'suna_yoroi': ('Suna no Yoroi', '1 deiner Ninja ist in diesem Zug vor Effekt-Zerstörung geschützt.'),
  'sharingan_kopie': ('Sharingan – Kopie-Jutsu', 'Nimm 1 Ninja der Stufe 4 oder niedriger aus deinem Deck auf die Hand.'),
  'sharingan_konter': ('Sharingan – Konter', 'FALLE: Wenn der Gegner ein Jutsu aktiviert: Annulliere es.'),
  'shikadai_nara': ('Shikadai – Nara-Stratege', 'Wenn diese Karte NORMAL beschworen wird: Nimm 1 FALLENKARTE aus deinem Deck auf die Hand.'),
  'anko_prueferin': ('Anko – Prüferin', 'Die Prüferin der Chūnin-Auswahl liebt Fallen aller Art. Wenn diese Karte beschworen wird: Füge dem Gegner 300 Schaden zu.'),
  'shikamaru_stratege': ('Shikamaru – Stratege', 'FLIP: Ziehe 1 Karte. „Wie lästig … aber ich habe einen Plan."'),
  'kagemane_jutsu': ('Kagemane no Jutsu', '1 gegnerisches Ninja kann 2 Züge lang weder angreifen noch seine Effekte nutzen.'),
  'kibaku_fuda': ('Kibaku Fuda – Explosions-Tag', 'FALLE: Wenn der Gegner angreift: Zerstöre den Angreifer.'),
  'chakra_reflexion': ('Chakra-Reflexion', 'FALLE: Annulliere einen Angriff; der Gegner erhält Schaden in Höhe der ANG seines Angreifers.'),
  'wasserspiegel': ('Wasserspiegel', 'FALLE: Wenn der Gegner angreift: Zerstöre alle seine Ninja in Angriffsposition.'),
  'zaku_oto': ('Zaku – Schall-Schütze', 'Kämpft mit Schallkanonen in den Armen. Durchdringung.'),
  'kabuto_assistent': ('Kabuto – Assistent', 'Orochimarus rechte Hand. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.'),
  'kotetsu_jonin': ('Kotetsu – Jonin', 'Wachtmeister von Konoha, unzertrennlich von Izumo.'),
  'genma_jonin': ('Genma – Veteran', 'Tokubetsu-Jonin mit Senbon im Mund und vielen Missionen hinter sich.'),
  'shikaku_taktiker': ('Shikaku – Taktiker', 'Oberbefehlshaber der Konoha-Streitkräfte. Alle deine offenen Ninja erhalten +200 ANG.'),
  'asuma_jonin': ('Asuma – Jonin-Kommandant', 'Ehemaliger Wächter-Ninja der Zwölf. Durchdringung. Alle deine offenen Ninja erhalten +200 ANG.'),
  'kisame_hoshigaki': ('Kisame – Hoshigaki', 'Das Ungeheuer des Nebels, Itachis Partner. Wenn diese Karte NORMAL beschworen wird: Nimm 1 Jutsukarte aus deinem Deck auf die Hand.'),
}

import re
done = 0
for i, ln in enumerate(lines):
    m = re.match(r"    ([a-z0-9_]+): \{ kind:'", ln)
    if not m or m.group(1) not in META:
        continue
    cid = m.group(1)
    name, desc = META[cid]
    for j in range(i, min(i + 4, len(lines))):
        lines[j] = re.sub(r"name:'[^']*'", "name:'" + name + "'", lines[j], count=1)
        lines[j] = re.sub(r"desc:'[^']*'", "desc:'" + desc + "'", lines[j], count=1)
    done += 1
io.open(p, 'w', encoding='utf-8', newline='').write('\n'.join(lines))
print('aktualisiert:', done, '/', len(META))
