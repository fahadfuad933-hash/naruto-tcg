/* ============================================================
   NARUTO TGC — Kartenladen (Shop-Logik, DOM-frei)
   Währung: Ryo (💰). Auszahlung pro Duell in duel.js (checkWin).
   Das Kartenangebot rotiert stündlich — deterministisch aus dem
   Stunden-Seed, d. h. gleiche Stunde = gleiches Angebot (auch nach
   Reload). K4-Chase-Karten bleiben story-exklusiv.
   ============================================================ */
(function (g) {
  const NT = (g.NTCG = g.NTCG || {});

  /* Karten, die NIE im Shop oder in Packs auftauchen (Chase/Story-Beute) */
  const EXCLUDED = {
    // Zeitreise-Boss-URs (2026-07): nur als Beute der Shinobi-Ära-Gegner
    mizuki_verraeter: 1, zabuza_daemon: 1, yamata_no_jutsu: 1, shukaku: 1,
    itachi_susanoo: 1, kotoamatsukami: 1, kimimaro_kaguya: 1,
    pain_tendo: 1, shinra_tensei: 1, madara_uchiha: 1, tengai_shinsei: 1,
  };

  /* Preise in Ryo: Kauf-Basis / Verkauf (fix, ~25 % des Kaufs) */
  const BUY = { N: 40, R: 150, SR: 650, UR: 2600 };
  const SELL = { N: 10, R: 40, SR: 160, UR: 650 };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Kartenpools pro Rarität (ohne Tokens, ohne Shop-Excludes), lazy gecacht */
  let POOLS = null;
  function poolOf(rarity) {
    if (!POOLS) {
      POOLS = { N: [], R: [], SR: [], UR: [] };
      for (const id in NT.CARDS) {
        const c = NT.CARDS[id];
        if (c.token || EXCLUDED[id]) continue;
        POOLS[c.rarity].push(id);
      }
    }
    // Fallback bei leeren Raritäts-Stufen (kleiner Pool): eine Stufe tiefer suchen
    if (POOLS[rarity].length) return POOLS[rarity];
    const order = ['UR', 'SR', 'R', 'N'];
    for (let i = order.indexOf(rarity) + 1; i < 4; i++) if (POOLS[order[i]].length) return POOLS[order[i]];
    return POOLS.N;
  }

  function rollTable(rng, table) { // table: [[wert, gewicht], …] Summe = 100
    let roll = rng() * 100;
    for (const [v, w] of table) { if (roll < w) return v; roll -= w; }
    return table[table.length - 1][0];
  }

  const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);

  /* ---------- Stündliches Angebot: 6 Slots + 1 Sonderangebot (-30 %) ----------
     Slots: N 40 % · R 35 % · SR 18 % · UR 7 % (UR = „sehr gut, sehr teuer").
     Sonderangebot: R 50 / SR 35 / UR 15, Preis × 0.7. */
  function stock(hourIdx) {
    const rng = mulberry32((hourIdx >>> 0) ^ 0x5eed);
    const seen = {};
    const out = [];
    for (let i = 0; i < 7; i++) {
      const deal = i === 6;
      const rarity = deal
        ? rollTable(rng, [['R', 50], ['SR', 35], ['UR', 15]])
        : rollTable(rng, [['N', 40], ['R', 35], ['SR', 18], ['UR', 7]]);
      const pool = poolOf(rarity);
      let id, guard = 0;
      do { id = pool[Math.floor(rng() * pool.length)]; } while (seen[id] && ++guard < 40);
      seen[id] = 1;
      let price = round5(BUY[rarity] * (0.85 + rng() * 0.4));
      if (deal) price = round5(price * 0.7);
      out.push({ id, rarity, price, deal });
    }
    return out;
  }

  function sellPrice(id) { return SELL[NT.CARDS[id].rarity]; }

  /* ---------- Booster & Themen-Packs (eigene Erfindung neben dem Angebot) ---------- */
  const PACKS = {
    chakra: {
      name: 'Chakra-Booster', icon: '📦', price: 300, n: 5,
      desc: '5 Zufallskarten aus dem gesamten Pool — die letzte ist mindestens R!',
    },
    frosch: {
      name: 'Frosch-Pack', icon: '🐸', price: 600, n: 4,
      desc: '4 Karten rund um Jiraiya & die Kröten (erhöhte SR/UR-Chance).',
      pool: ['gama', 'gamakichi_krieger', 'gamaken_waechter', 'gamabunta_koenig', 'jiraiya_eremit',
             'kroeten_ruf', 'rasengan_eremit', 'yomi_numa', 'kroeten_magen', 'kroeten_schild', 'hartschaum'],
    },
    kage: {
      name: 'Konoha-Pack', icon: '🍥', price: 900, n: 4,
      desc: '4 Karten rund um Team 7 & Konoha (erhöhte SR/UR-Chance).',
      pool: ['naruto_schueler', 'konohamaru_rivale', 'naruto_genin', 'iruka_waechter', 'naruto_kyuubi',
             'team7_formation', 'rasengan_genin', 'schattenspiel', 'schatten_bindung', 'kawarimi_trick', 'schattentaeuschung'],
    },
  };

  function openPack(packId, rng) {
    const p = PACKS[packId];
    const r = rng || Math.random;
    const ids = [];
    if (p.pool) { // Themen-Pack: Rarität würfeln (N 15/R 45/SR 30/UR 10), dann Pool ∩ Rarität
      const byRar = { N: [], R: [], SR: [], UR: [] };
      for (const id of p.pool) byRar[NT.CARDS[id].rarity].push(id);
      const seen = {};
      for (let i = 0; i < p.n; i++) {
        const rar = rollTable(r, [['N', 15], ['R', 45], ['SR', 30], ['UR', 10]]);
        let pool = byRar[rar].filter((x) => !seen[x]);
        if (!pool.length) pool = p.pool.filter((x) => !seen[x]);
        const id = pool[Math.floor(r() * pool.length)];
        seen[id] = 1;
        ids.push(id);
      }
    } else { // Chakra-Booster: N 55/R 30/SR 12/UR 3 — letzte Karte garantiert R+ (R 70/SR 22/UR 8)
      for (let i = 0; i < p.n; i++) {
        const rar = i === p.n - 1
          ? rollTable(r, [['R', 70], ['SR', 22], ['UR', 8]])
          : rollTable(r, [['N', 55], ['R', 30], ['SR', 12], ['UR', 3]]);
        const pool = poolOf(rar);
        ids.push(pool[Math.floor(r() * pool.length)]);
      }
    }
    return ids;
  }

  /* ---------- Arena-Themes (Feld-Designs; Darstellung in css/style.css) ---------- */
  const THEMES = [
    { id: 'standard', name: 'Standard-Arena', icon: '🏟️', price: 0, desc: 'Die klassische Chakra-Arena.' },
    { id: 'nacht', name: 'Sternennacht', icon: '🌌', price: 400, desc: 'Tiefblauer Himmel über Neo-Konoha.' },
    { id: 'wueste', name: 'Wüstensand', icon: '🏜️', price: 500, desc: 'Gaaras Heimat — Sand und gleißendes Licht.' },
    { id: 'blutmond', name: 'Blutmond', icon: '🌕', price: 700, desc: 'Roter Mond — Uchiha-Stimmung.' },
    { id: 'amaterasu', name: 'Amaterasu', icon: '⚫', price: 1500, desc: 'Schwarze Flammen. Sehr selten, sehr teuer.' },
  ];

  NT.Shop = { EXCLUDED, BUY, SELL, stock, sellPrice, PACKS, openPack, THEMES };
})(typeof window !== 'undefined' ? window : globalThis);
