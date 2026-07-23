/* ============================================================
   Lädt Kartenbilder aus dem Naruto-Fandom-Wiki (MediaWiki-API)
   nach assets/cards/raw/<id>.<ext> und schreibt report.json.
   Aufruf: node tools/fetchcards.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RAW = path.join(ROOT, 'assets', 'cards', 'raw');
const API = 'https://naruto.fandom.com/api.php';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NarutoTCG-CardFetcher/1.0';

// Karten-ID → Wiki-Seitentitel (Kandidaten, erster Treffer mit Bild gewinnt)
const MAP = {
  naruto: ['Naruto Uzumaki'],
  sasuke: ['Sasuke Uchiha'],
  sakura: ['Sakura Haruno'],
  shikamaru: ['Shikamaru Nara'],
  choji: ['Chōji Akimichi'],
  ino: ['Ino Yamanaka'],
  kiba: ['Kiba Inuzuka'],
  hinata: ['Hinata Hyūga'],
  shino: ['Shino Aburame'],
  lee: ['Rock Lee'],
  neji: ['Neji Hyūga'],
  tenten: ['Tenten'],
  iruka: ['Iruka Umino'],
  konohamaru: ['Konohamaru Sarutobi'],
  anko: ['Anko Mitarashi'],
  haku: ['Haku'],
  oto_ninja: ['Dosu Kinuta', 'Team Dosu'],
  kakashi: ['Kakashi Hatake'],
  guy: ['Might Guy'],
  asuma: ['Asuma Sarutobi'],
  kurenai: ['Kurenai Yūhi'],
  zabuza: ['Zabuza Momochi'],
  gaara: ['Gaara'],
  temari: ['Temari'],
  kankuro: ['Kankurō'],
  kabuto: ['Kabuto Yakushi'],
  jiraiya: ['Jiraiya'],
  tsunade: ['Tsunade'],
  orochimaru: ['Orochimaru'],
  itachi: ['Itachi Uchiha'],
  kisame: ['Kisame Hoshigaki'],
  minato: ['Minato Namikaze'],
  naruto_sennin: ['Sage Mode'],
  gamabunta: ['Gamabunta'],
  hiruzen: ['Hiruzen Sarutobi'],
  pain: ['Nagato', 'Six Paths of Pain'],
  manda: ['Manda'],
  kage_token: ['Shadow Clone Technique'],
  katon: ['Fire Release: Great Fireball Technique'],
  shuriken: ['Shuriken', 'Demon Wind Shuriken'],
  heilung: ['Mystical Palm Technique'],
  kagebunshin: ['Multiple Shadow Clone Technique', 'Shadow Clone Technique'],
  kuchiyose: ['Summoning Technique'],
  info: ['Bingo Book'],
  hachimon: ['Eight Gates'],
  genjutsu_nebel: ['Hiding in Mist Technique'],
  suiton: ['Water Release: Water Dragon Bullet Technique'],
  erdriss: ['Earth Release: Earth-Style Wall', 'Earth Release'],
  amaterasu: ['Amaterasu'],
  shinra: ['Shinra Tensei'],
  rasengan: ['Rasengan'],
  chidori: ['Chidori'],
  kyuubi: ['Kurama'],
  kubikiri: ['Kubikiribōchō'],
  samehada: ['Samehada'],
  chakra_klinge: ['Chakra Blade'],
  edo_tensei: ['Summoning: Impure World Reincarnation'],
  kuchiyose_vertrag: ['Contract Seal'],
  kamui: ['Kamui'],
  shunshin: ['Body Flicker Technique'],
  souzou: ['Strength of a Hundred Seal'],
  suna_arashi: ['Sand Storm', 'Sandstorm'],
  konoha_senpuu: ['Leaf Whirlwind'],
  genjutsu_kyo: ['Demonic Illusion: False Surroundings Technique'],
  chakura_kyuin: ['Chakra Absorption Technique'],
  sunahen: ['Sand Drizzle'],
  kuchidome: ['Reverse Summoning Technique'],
  papierbombe: ['Explosive Tag'],
  kawarimi: ['Body Replacement Technique'],
  drahtseil: ['Wire Strings'],
  kagemane: ['Shadow Imitation Technique'],
  spiegel: ['Demonic Illusion: Mirror Heaven and Earth Change'],
  versiegelung: ['Five Elements Seal'],
  fuin_gyaku: ['Five Elements Unseal'],
  kidomaru: ['Kidōmaru'],
  sakon: ['Sakon and Ukon'],
  suigetsu: ['Suigetsu Hōzuki'],
  sai: ['Sai'],
  jirobo: ['Jirōbō'],
  kimimaro: ['Kimimaro'],
  yamato: ['Yamato'],
  konan: ['Konan'],
  hidan: ['Hidan'],
  deidara: ['Deidara'],
  danzo: ['Danzō Shimura'],
  kakuzu: ['Kakuzu'],
  sasori: ['Sasori'],
  karin: ['Karin'],
  schriftrolle: ['Scroll of Seals'],
  icha_icha: ['Icha Icha'],
  wille_feuer: ['Will of Fire'],
  sasuke_susanoo: ['Susanoo'],
  hashirama: ['Hashirama Senju'],
  rinnegan: ['Rinnegan'],
  rasenshuriken: ['Wind Release: Rasenshuriken'],
  gamakichi: ['Gamakichi'],
  gamaken: ['Gamaken'],
  pakkun: ['Pakkun'],
  kuroari: ['Black Ant'],
  shinigami_maske: ['Shinigami Mask'],
  shintenshin: ['Mind Body Switch Technique'],
  mondschatten: ['Tsukuyomi'],
  rauch_klon: ['Smoke Bomb'],
  hachimon_kai: ['Eight Gates Released Formation', 'Eight Gates'],
  gama: ['Gama'],
  yomi_numa: ['Swamp of the Underworld'],
  hartschaum: ['Needle Jizō'],
  iruka_lehrer: ['Iruka Umino'],
  schueler_naruto: ['Naruto Uzumaki'],
  schuelerin_sakura: ['Sakura Haruno'],
  mizuki: ['Mizuki'],
  bunshin_jutsu: ['Clone Technique'],
  shuriken_wurf: ['Demon Wind Shuriken', 'Fūma Shuriken'],
  akademie_unterricht: ['Ninja Academy'],
  henge_jutsu: ['Transformation Technique'],
  kawarimi_klassik: ['Body Replacement Technique'],
  teuchi_ramen: ['Teuchi'],
  ayame_service: ['Ayame'],
  ichiraku_ramen: ['Ramen Ichiraku'],
  sasuke_genin: ['Sasuke Uchiha'],
  sasuke_fluchmal: ['Cursed Seal of Heaven', 'Sasuke Uchiha'],
  goukakyuu: ['Fire Release: Great Fireball Technique'],
  chidori: ['Chidori'],
  sharingan_blick: ['Sharingan'],
  shuriken_kage: ['Shuriken Shadow Clone Technique'],
  gaara_wueste: ['Gaara'],
  temari_wind: ['Temari'],
  kankuro_marionette: ['Kankurō'],
  sand_sarg: ['Sand Binding Coffin'],
  sandsturm: ['Sandstorm', 'Sand Storm'],
  sand_welle: ['Quicksand Waterfall Flow'],
  kakashi_jonin: ['Kakashi Hatake'],
  raikiri_jutsu: ['Lightning Cutter'],
  pakkun_ninken: ['Pakkun'],
  ninken_rudel: ['Ninken'],
  suiton_drache: ['Water Release: Water Dragon Bullet Technique'],
  manda: ['Manda'],
  orochimaru_sannin: ['Orochimaru'],
  edo_tensei_jutsu: ['Summoning: Impure World Reincarnation'],
  schlangenhaut: ['Orochimaru-Style Body Replacement Technique'],
  itachi_genjutsu: ['Itachi Uchiha'],
  itachi_mangekyou: ['Mangekyō Sharingan'],
  amaterasu: ['Amaterasu'],
  tsukuyomi: ['Tsukuyomi'],
  susanoo_schild: ['Susanoo'],
  karasu_bote: ['Itachi Uchiha'],
  hartes_training: ['Rock Lee'],
  eisen_faust: ['Strong Fist'],
  dojo_disziplin: ['Ninja Academy'],
  katon_itachi: ['Fire Release: Great Fireball Technique'],
  karasu_nebel: ['Scattering Thousand Crows Technique'],
  hachimon_kai: ['Eight Gates Released Formation', 'Eight Gates'],
  shunshin: ['Body Flicker Technique'],
  konoha_wirbel: ['Leaf Whirlwind'],
  rock_lee: ['Rock Lee'],
  tenten_waffen: ['Tenten'],
  might_guy: ['Might Guy'],
  might_guy_sensei: ['Might Guy'],
  lees_training: ['Rock Lee'],
  shisui_uchiha: ['Shisui Uchiha'],
  sasuke_akademie: ['Sasuke Uchiha'],
  baki_suna: ['Baki'],
  matsuri_suna: ['Matsuri'],
  anko_prueferin: ['Anko Mitarashi'],
  shikamaru_stratege: ['Shikamaru Nara'],
  shikadai_nara: ['Shikadai Nara', 'Shikadai'],
  zaku_oto: ['Zaku Abumi'],
  kabuto_assistent: ['Kabuto Yakushi'],
  kotetsu_jonin: ['Kotetsu Hagane'],
  genma_jonin: ['Genma Shiranui'],
  shikaku_taktiker: ['Shikaku Nara'],
  asuma_jonin: ['Asuma Sarutobi'],
  kisame_hoshigaki: ['Kisame Hoshigaki'],
  kibaku_fuda: ['Explosive Tag'],
  suiken: ['Drunken Fist'],
  kage_buyou: ['Shadow of the Dancing Leaf'],
  kagemane_jutsu: ['Shadow Imitation Technique'],
  suna_yoroi: ['Armor of Sand'],
  gouken: ['Strong Fist'],
  choji_stammgast: ['Chōji Akimichi'],
  sand_falle: ['Sand Drizzle'],
  /* Zeitreise-Bogen (Kapitel 5–9, 2026-07) */
  mizuki_verraeter: ['Mizuki'],
  fujin_raijin: ['Fūjin and Raijin', 'Fūjin'],
  fuuma_shuriken: ['Fūma Shuriken', 'Demon Wind Shuriken'],
  schriftrolle_siegelung: ['Scroll of Seals'],
  haku_eisnadel: ['Haku', 'Senbon'],
  haku_spiegel: ['Demonic Mirroring Ice Crystals', 'Haku'],
  zabuza_momo: ['Zabuza Momochi'],
  daemon_brueder: ['Demon Brothers'],
  mizu_token: ['Water Clone Technique'],
  mizu_bunshin: ['Water Clone Technique'],
  senbon_sturm: ['Senbon'],
  kirigakure_jutsu: ['Hiding in Mist Technique'],
  makyou_hyoushou: ['Demonic Mirroring Ice Crystals'],
  eis_fesseln: ['Ice Release', 'Haku'],
  gefrorene_falle: ['Haku'],
  zabuza_daemon: ['Zabuza Momochi'],
  haku_klinge: ['Haku'],
  oinin_jaeger: ['Hunter-nin', 'Oinin'],
  kubikiribouchou: ['Kubikiribōchō'],
  suiro_jutsu: ['Water Prison Technique'],
  lautloses_toeten: ['Silent Killing'],
  yamata_no_jutsu: ['Eight Branches Technique'],
  fluchmal_kraft: ['Cursed Seal of Heaven'],
  kusa_nagi: ['Sword of Kusanagi (Orochimaru)', 'Sword of Kusanagi'],
  shukaku: ['Shukaku'],
  sabaku_sousou: ['Sand Waterfall Funeral'],
  sand_token: ['Sand Clone'],
  sand_klon: ['Sand Clone'],
  kisame_samehada: ['Kisame Hoshigaki'],
  samehada: ['Samehada'],
  kotoamatsukami: ['Kotoamatsukami'],
  itachi_susanoo: ['Susanoo'],
  jirobo: ['Jirōbō'],
  kidomaru: ['Kidōmaru'],
  tayuya: ['Tayuya'],
  doki_token: ['Doki'],
  sakon_ukon: ['Sakon and Ukon'],
  kimimaro_kaguya: ['Kimimaro'],
  spinnennetz: ['Spider Sticky Gold', 'Spider Web Unrolling'],
  floeten_melodie: ['Demonic Flute: Phantom Sound Chains', 'Demonic Flute'],
  knochen_tanz: ['Dance of the Camellia', 'Ten-Finger Drilling Bullets'],
  fingers_kugeln: ['Ten-Finger Drilling Bullets'],
  fluchmal_stufe2: ['Cursed Seal of Heaven'],
  schall_barriere: ['Dosu Kinuta'],
  pain_tendo: ['Deva Path', 'Six Paths of Pain'],
  chikushodo: ['Animal Path'],
  jumbo_hund_token: ['Giant Multi-Headed Dog'],
  ningendo: ['Human Path (character)', 'Human Path'],
  shurado: ['Asura Path (character)', 'Asura Path'],
  gakido: ['Preta Path (character)', 'Preta Path'],
  jigokudo: ['Naraka Path (character)', 'Naraka Path'],
  shinra_tensei: ['Shinra Tensei'],
  chibaku_tensei: ['Chibaku Tensei'],
  papier_sturm: ['Konan'],
  regen_der_erkenntnis: ['Rain Tiger at Will Technique'],
  chou_shinra: ['Shinra Tensei'],
  madara_uchiha: ['Madara Uchiha'],
  obito_kamui: ['Obito Uchiha', 'Kamui'],
  zetsu: ['Zetsu', 'White Zetsu'],
  weisser_zetsu: ['White Zetsu', 'White Zetsu Army'],
  gokka_mekkyaku: ['Fire Release: Great Fire Destruction', 'Fire Release: Great Fire Majestic Technique'],
  tengai_shinsei: ['Tengai Shinsei'],
  mugen_tsukuyomi: ['Infinite Tsukuyomi'],
  kamui_jutsu: ['Kamui'],
  gedo_rinne_tensei: ['Outer Path: Samsara of Heavenly Life Technique'],
  rinnegan_blick: ['Rinnegan'],
  uchiwa_ruckstoss: ['Uchiha Return', 'Gunbai'],
  mokuton_falle: ['Wood Release: Great Forest Technique', 'Wood Release'],
  susanoo_gard: ['Susanoo'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findImage(titles) {
  const url = API + '?action=query&format=json&redirects=1&prop=pageimages' +
    '&piprop=original|thumbnail&pithumbsize=640&titles=' +
    encodeURIComponent(titles.join('|'));
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('API ' + res.status);
  const json = await res.json();
  const pages = (json.query && json.query.pages) || {};
  for (const k of Object.keys(pages)) {
    const p = pages[k];
    const src = (p.thumbnail && p.thumbnail.source) || (p.pageimage && p.original && p.original.source);
    if (src) return { src, title: p.title };
  }
  return null;
}

async function download(url, outFile) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('IMG ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 4000) throw new Error('zu klein (' + buf.length + ' B) — vermutlich Platzhalter');
  fs.writeFileSync(outFile, buf);
  return buf.length;
}

(async () => {
  fs.mkdirSync(RAW, { recursive: true });
  const report = { found: {}, missing: [] };
  // Optionaler CLI-Filter: node tools/fetchcards.js id1 id2 … → nur diese IDs laden
  const filter = process.argv.slice(2);
  const ids = filter.length ? filter.filter((id) => MAP[id]) : Object.keys(MAP);
  if (filter.length && ids.length !== filter.length)
    console.log('unbekannte IDs ignoriert:', filter.filter((id) => !MAP[id]).join(', '));
  let done = 0;
  for (const id of ids) {
    try {
      const hit = await findImage(MAP[id]);
      if (!hit) { report.missing.push(id); console.log('MISS  ' + id); continue; }
      const ext = (path.extname(new URL(hit.src).pathname) || '.jpg').toLowerCase();
      const out = path.join(RAW, id + ext);
      const bytes = await download(hit.src, out);
      report.found[id] = { title: hit.title, file: path.basename(out), bytes };
      console.log('OK    ' + id + '  ← ' + hit.title + '  (' + Math.round(bytes / 1024) + ' KB)');
    } catch (e) {
      report.missing.push(id);
      console.log('FAIL  ' + id + '  ' + e.message);
    }
    done++;
    if (done % 10 === 0) console.log('--- ' + done + '/' + ids.length);
    await sleep(140);
  }
  fs.writeFileSync(path.join(ROOT, 'assets', 'cards', 'report.json'), JSON.stringify(report, null, 2));
  console.log('FERTIG: ' + Object.keys(report.found).length + ' gefunden, ' + report.missing.length + ' fehlen.');
  console.log('MISSING: ' + report.missing.join(', '));
})().catch((e) => { console.error(e); process.exit(1); });
