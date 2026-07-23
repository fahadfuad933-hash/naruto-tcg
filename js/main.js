/* ============================================================
   NARUTO TGC — Menüs, Speicherung, Deck-Editor
   ============================================================ */
(function (g) {
  const NT = g.NTCG;
  const $ = (s) => document.querySelector(s);

  /* ================= Speicher (localStorage) ================= */
  const Store = {
    KEY: 'ntcg_save_v1',
    data: null,
    load() {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) {}
      if (!d || typeof d !== 'object') d = {};
      this.data = {
        wins: d.wins && typeof d.wins === 'object' ? d.wins : {},
        losses: d.losses && typeof d.losses === 'object' ? d.losses : {},
        stats: d.stats && typeof d.stats === 'object'
          ? Object.assign({ games: 0, damageDealt: 0 }, d.stats)
          : { games: 0, damageDealt: 0 },
        achievements: d.achievements && typeof d.achievements === 'object' ? d.achievements : {},
        collection: d.collection && typeof d.collection === 'object' ? d.collection : Object.assign({}, NT.BASE_COLLECTION),
        sound: d.sound !== false,
        music: d.music !== false,
        musicVol: typeof d.musicVol === 'number' ? d.musicVol : 0.3,
        duelTrack: typeof d.duelTrack === 'string' ? d.duelTrack : 'duel',
        animSpeed: typeof d.animSpeed === 'number' && [1, 2, 3].indexOf(d.animSpeed) >= 0 ? d.animSpeed : 1,
        handSort: d.handSort !== false,
        playerName: typeof d.playerName === 'string' ? d.playerName : '',
        // Währung & Kartenladen
        ryo: typeof d.ryo === 'number' ? d.ryo : 100,
        themes: Array.isArray(d.themes) && d.themes.length ? d.themes : ['standard'],
        theme: typeof d.theme === 'string' ? d.theme : 'standard',
        shopBought: d.shopBought && typeof d.shopBought === 'object' && Array.isArray(d.shopBought.slots)
          ? d.shopBought : { hour: -1, slots: [] },
        story: d.story && typeof d.story === 'object'
          ? Object.assign({ introDone: false, flags: {}, progress: 0, progressPast: 0 }, d.story)
          : { introDone: false, flags: {}, progress: 0, progressPast: 0 },
        // Aktive Map-Welt: 'neo' (Neo-Konoha) oder 'past' (Shinobi-Ära, Zeitreise)
        world: d.world === 'past' ? 'past' : 'neo',
        // Mehrere benannte Decks (Migration: altes Einzel-Deck wird Deck 1)
        decks: Array.isArray(d.decks) && d.decks.length
          ? d.decks.filter((x) => x && Array.isArray(x.cards)).map((x) => ({ name: String(x.name || 'Deck'), cards: x.cards.slice() }))
          : [{ name: 'Mein Deck', cards: Array.isArray(d.deck) ? d.deck.slice() : NT.STARTER_DECK.slice() }],
        activeDeck: typeof d.activeDeck === 'number' ? d.activeDeck : 0,
      };
      if (!this.data.decks.length) this.data.decks = [{ name: 'Mein Deck', cards: NT.STARTER_DECK.slice() }];
      if (this.data.activeDeck < 0 || this.data.activeDeck >= this.data.decks.length) this.data.activeDeck = 0;
      // Migration nach Kartenpool-Neustart: unbekannte Karten-IDs aus Sammlung & Decks entfernen
      for (const id in this.data.collection) {
        if (!NT.CARDS[id]) delete this.data.collection[id];
      }
      for (const dk of this.data.decks) {
        dk.cards = dk.cards.filter((id) => NT.CARDS[id]);
        if (dk.cards.length < 20) dk.cards = NT.STARTER_DECK.slice(); // ungültig → Starter-Fallback
      }
      // Neue Basis-Karten nachträglich ergänzen (Updates)
      for (const id in NT.BASE_COLLECTION) {
        if (!(id in this.data.collection)) this.data.collection[id] = NT.BASE_COLLECTION[id];
      }
      this.save();
    },
    save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {} },
    collection() { return this.data.collection; },
    wins(id) { return this.data.wins[id] || 0; },
    totalWins() { return Object.values(this.data.wins).reduce((a, b) => a + b, 0); },
    recordWin(oppId, rewardCards) {
      const firstWin = !this.data.wins[oppId];
      this.data.wins[oppId] = (this.data.wins[oppId] || 0) + 1;
      this.data.stats.games++;
      if (rewardCards) {
        for (const id in rewardCards) {
          this.data.collection[id] = (this.data.collection[id] || 0) + rewardCards[id];
        }
      }
      this.save();
      return { firstWin };
    },
    recordLoss(oppId) {
      this.data.losses[oppId] = (this.data.losses[oppId] || 0) + 1;
      this.data.stats.games++;
      this.save();
    },
    // kein save() pro Treffer — das Duell-Ende (recordWin/recordLoss) speichert mit
    recordDamage(n) { this.data.stats.damageDealt += Math.max(0, n | 0); },
    /* ---------- Währung (Ryo) ---------- */
    addRyo(n) { this.data.ryo = Math.max(0, Math.round(this.data.ryo + n)); }, // ohne save() — Aufrufer speichert
    spendRyo(n) {
      if (this.data.ryo < n) return false;
      this.data.ryo -= n;
      this.save();
      return true;
    },
    addCards(ids) { // ohne save() — Aufrufer speichert
      for (const id of ids) this.data.collection[id] = (this.data.collection[id] || 0) + 1;
    },
    totalLosses() { return Object.values(this.data.losses).reduce((a, b) => a + b, 0); },
    uniqueCards() {
      let n = 0;
      for (const id in this.data.collection) if (this.data.collection[id] > 0 && NT.CARDS[id]) n++;
      return n;
    },
    /* ---------- Erfolge: prüft alle, schaltet neue frei, gibt Belohnungskarten ---------- */
    checkAchievements() {
      const s = {
        wins: this.totalWins(), losses: this.totalLosses(), games: this.data.stats.games,
        damage: this.data.stats.damageDealt, uniqueCards: this.uniqueCards(),
        oppWins: (id) => this.wins(id),
      };
      const unlocked = [];
      for (const a of (NT.ACHIEVEMENTS || [])) {
        if (this.data.achievements[a.id]) continue;
        let ok = false;
        try { ok = a.check(s); } catch (e) {}
        if (!ok) continue;
        this.data.achievements[a.id] = true;
        const cardId = NT.randomCard(a.rarity);
        this.data.collection[cardId] = (this.data.collection[cardId] || 0) + 1;
        unlocked.push({ ach: a, cardId });
      }
      if (unlocked.length) this.save();
      return unlocked;
    },
    getDeck() {
      const deck = this.data.decks[this.data.activeDeck];
      const v = NT.validateDeck(deck.cards, this.data.collection);
      // NICHT mutieren: ungültige (halb fertige) Decks bleiben gespeichert,
      // das Duell bekommt nur für diesen Start das Starter-Deck
      return v.ok ? deck.cards.slice() : NT.STARTER_DECK.slice();
    },
    getDeckRaw() { // für den Editor: unvalidiert (halb fertige Decks bleiben erhalten)
      return this.data.decks[this.data.activeDeck].cards.slice();
    },
    saveDeck(ids) { this.data.decks[this.data.activeDeck].cards = ids.slice(); this.save(); },
    /* ---------- Mehrere Decks ---------- */
    decksList() { return this.data.decks.map((d, i) => ({ name: d.name, count: d.cards.length, active: i === this.data.activeDeck })); },
    activeDeckName() { return this.data.decks[this.data.activeDeck].name; },
    setActiveDeck(i) {
      if (i < 0 || i >= this.data.decks.length) return;
      this.data.activeDeck = i;
      this.save();
    },
    createDeck(name, cards) {
      this.data.decks.push({ name: (name || '').trim() || 'Deck ' + (this.data.decks.length + 1), cards: cards.slice() });
      this.data.activeDeck = this.data.decks.length - 1;
      this.save();
      return this.data.activeDeck;
    },
    deleteDeck(i) {
      if (this.data.decks.length <= 1 || i < 0 || i >= this.data.decks.length) return false;
      this.data.decks.splice(i, 1);
      if (this.data.activeDeck >= this.data.decks.length) this.data.activeDeck = this.data.decks.length - 1;
      this.save();
      return true;
    },
    sound() { return this.data.sound; },
    setSound(v) { this.data.sound = !!v; this.save(); NT.Audio.setEnabled(v); },
    music() { return this.data.music; },
    setMusic(v) { this.data.music = !!v; this.save(); if (NT.Music) NT.Music.setEnabled(v); },
    getName() { return this.data.playerName || ''; },
  };
  NT.Store = Store;

  /* ================= Navigation ================= */
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    if (id === 'scr-menu') {
      $('#menu-wins').textContent = 'Siege: ' + Store.totalWins();
      // Erfolge auch außerhalb von Duellen nachziehen (z. B. Sammlungs-Erfolge durch Story-Belohnungen)
      const newAch = Store.checkAchievements();
      if (newAch.length && NT.Duel) {
        NT.Duel.toast('🏆 ' + newAch.map((x) => x.ach.name).join(', ') + ' freigeschaltet!');
      }
      if (NT.Music) NT.Music.play('menu');
    }
  }

  function oppUnlocked(i) {
    if (i === 0) return true;
    return Store.wins(NT.OPPONENTS[i - 1].id) >= 1;
  }

  function showSelect() {
    const list = $('#opp-list');
    list.innerHTML = '';
    NT.OPPONENTS.forEach((o, i) => {
      const unlocked = oppUnlocked(i);
      const card = document.createElement('div');
      card.className = 'opp-card' + (unlocked ? '' : ' locked');
      const stars = '★'.repeat(o.difficulty) + '☆'.repeat(6 - o.difficulty);
      card.innerHTML =
        '<div class="opp-avatar">' + (unlocked ? NT.avatarHtml(o.avatar, NT.OPP_AVATAR_IMG[o.id]) : '🔒') + '</div>' +
        '<div class="opp-info">' +
          '<div class="opp-name">' + o.name + '</div>' +
          '<div class="opp-title">' + o.title + '</div>' +
          (unlocked ? '<div class="opp-flavor">' + o.flavor + '</div>' : '<div class="opp-flavor">Besiege zuerst ' + NT.OPPONENTS[i - 1].name + '!</div>') +
          (unlocked ? '<div class="opp-reward">🎁 Beute: ' + NT.farmHighlight(o) + ' …</div>' : '') +
        '</div>' +
        '<div class="opp-right"><div class="opp-stars">' + stars + '</div><div class="opp-wins">Siege: ' + Store.wins(o.id) + '</div></div>';
      if (unlocked) {
        card.onclick = () => {
          NT.Audio.unlock(); NT.Audio.play('click');
          NT.Duel.start(o);
        };
      }
      list.appendChild(card);
    });
    show('scr-select');
  }

  /* ================= Kartenladen (Shop) ================= */
  const hourIdx = () => Math.floor(Date.now() / 3600000);
  let shopTimer = null;

  function showShop() {
    renderShop();
    show('scr-shop');
    clearInterval(shopTimer);
    shopTimer = setInterval(() => {
      if (!$('#scr-shop').classList.contains('active')) { clearInterval(shopTimer); return; }
      shopCountdown();
    }, 1000);
  }

  function shopCountdown() {
    const now = new Date();
    const m = 59 - now.getMinutes(), s = 59 - now.getSeconds();
    $('#shop-countdown').textContent = '🃏 Neues Angebot in ' + m + ':' + ('0' + s).slice(-2) + ' min · 🎁 Duell-Beute: Karten des Gegners';
  }

  function renderShop() {
    $('#shop-ryo').textContent = '💰 ' + Store.data.ryo;
    shopCountdown();
    const h = hourIdx();
    if (Store.data.shopBought.hour !== h) Store.data.shopBought = { hour: h, slots: [] };
    /* --- Angebot (stündlich) --- */
    const sg = $('#shop-stock');
    sg.innerHTML = '';
    NT.Shop.stock(h).forEach((slot, i) => {
      const sold = !!Store.data.shopBought.slots[i];
      const wrap = document.createElement('div');
      wrap.className = 'shop-slot' + (sold ? ' sold' : '');
      const cw = document.createElement('div');
      cw.className = 'g-card';
      cw.appendChild(NT.CardView.mini(slot.id));
      wrap.appendChild(cw);
      if (slot.deal) {
        const tag = document.createElement('div');
        tag.className = 'shop-deal-tag';
        tag.textContent = '−30 %';
        wrap.appendChild(tag);
      }
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      btn.textContent = sold ? 'Verkauft' : '💰 ' + slot.price;
      btn.disabled = sold || Store.data.ryo < slot.price;
      btn.onclick = () => {
        if (!Store.spendRyo(slot.price)) { NT.Duel.toast('💰 Nicht genug Ryo — Duelle geben Ryo!'); return; }
        Store.data.shopBought.slots[i] = 1;
        Store.addCards([slot.id]);
        Store.save();
        NT.Audio.play('buff');
        NT.Duel.toast('🃏 ' + NT.CARDS[slot.id].name + ' gekauft!');
        renderShop();
      };
      wrap.appendChild(btn);
      if (NT.attachLongPress) NT.attachLongPress(cw, () => NT.CardView.show(slot.id));
      sg.appendChild(wrap);
    });
    /* --- Booster & Packs --- */
    const pg = $('#shop-packs');
    pg.innerHTML = '';
    for (const pid in NT.Shop.PACKS) {
      const p = NT.Shop.PACKS[pid];
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = '<span class="sr-icon">' + p.icon + '</span>' +
        '<span class="sr-info"><b>' + p.name + '</b><small>' + p.desc + '</small></span>';
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      btn.textContent = '💰 ' + p.price;
      btn.disabled = Store.data.ryo < p.price;
      btn.onclick = () => openPack(pid);
      row.appendChild(btn);
      pg.appendChild(row);
    }
    /* --- Arena-Themes --- */
    const tg = $('#shop-themes');
    tg.innerHTML = '';
    for (const t of NT.Shop.THEMES) {
      const owned = Store.data.themes.indexOf(t.id) >= 0;
      const active = Store.data.theme === t.id;
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = '<span class="sr-swatch swatch-' + t.id + '"></span>' +
        '<span class="sr-info"><b>' + t.icon + ' ' + t.name + '</b><small>' + t.desc + '</small></span>';
      const btn = document.createElement('button');
      btn.className = 'shop-buy' + (active ? ' active-theme' : '');
      if (active) {
        btn.textContent = '✓ Aktiv';
        btn.disabled = true;
      } else if (owned) {
        btn.textContent = 'Aktivieren';
        btn.onclick = () => { Store.data.theme = t.id; Store.save(); NT.Audio.play('click'); renderShop(); };
      } else {
        btn.textContent = '💰 ' + t.price;
        btn.disabled = Store.data.ryo < t.price;
        btn.onclick = () => {
          if (!Store.spendRyo(t.price)) { NT.Duel.toast('💰 Nicht genug Ryo!'); return; }
          Store.data.themes.push(t.id);
          Store.data.theme = t.id;
          Store.save();
          NT.Audio.play('buff');
          NT.Duel.toast('🎨 Theme „' + t.name + '" aktiviert!');
          renderShop();
        };
      }
      row.appendChild(btn);
      tg.appendChild(row);
    }
    /* --- Verkaufen (nur doppelte, mind. 1 bleibt immer erhalten) --- */
    const vg = $('#shop-sell');
    vg.innerHTML = '';
    const sellable = Object.keys(Store.data.collection)
      .filter((id) => Store.data.collection[id] > 1 && NT.CARDS[id])
      .sort((a, b) => NT.Shop.sellPrice(b) - NT.Shop.sellPrice(a));
    if (!sellable.length) {
      vg.innerHTML = '<p style="grid-column:1/-1;color:var(--muted);font-size:12px;margin:4px">Keine doppelten Karten — jede Karte bleibt mind. 1× erhalten.</p>';
    }
    for (const id of sellable) {
      const wrap = document.createElement('div');
      wrap.className = 'shop-slot';
      const cw = document.createElement('div');
      cw.className = 'g-card';
      cw.appendChild(NT.CardView.mini(id));
      const badge = document.createElement('div');
      badge.className = 'own-count';
      badge.textContent = '×' + Store.data.collection[id];
      cw.appendChild(badge);
      wrap.appendChild(cw);
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      btn.textContent = '+💰 ' + NT.Shop.sellPrice(id);
      btn.onclick = () => {
        Store.data.collection[id]--;
        Store.addRyo(NT.Shop.sellPrice(id));
        Store.save();
        NT.Audio.play('click');
        NT.Duel.toast('💰 +' + NT.Shop.sellPrice(id) + ' Ryo für ' + NT.CARDS[id].name);
        renderShop();
      };
      wrap.appendChild(btn);
      if (NT.attachLongPress) NT.attachLongPress(cw, () => NT.CardView.show(id));
      vg.appendChild(wrap);
    }
  }

  function openPack(pid) {
    const p = NT.Shop.PACKS[pid];
    if (!Store.spendRyo(p.price)) { NT.Duel.toast('💰 Nicht genug Ryo — Duelle geben Ryo!'); return; }
    const ids = NT.Shop.openPack(pid);
    Store.addCards(ids);
    Store.save();
    NT.Audio.play('win');
    const body = $('#modal-body');
    body.innerHTML = '<h3 style="margin:4px 0 2px">' + p.icon + ' ' + p.name + '</h3>' +
      '<div class="pack-open-grid"></div>';
    const grid = body.querySelector('.pack-open-grid');
    for (const id of ids) {
      const cw = document.createElement('div');
      cw.className = 'g-card';
      cw.appendChild(NT.CardView.mini(id));
      grid.appendChild(cw);
    }
    const close = document.createElement('button');
    close.className = 'btn btn-primary';
    close.textContent = 'Ins Inventar!';
    close.onclick = () => { closeUiModal(); renderShop(); };
    body.appendChild(close);
    openUiModal();
  }

  NT.ShopUI = { show: showShop };

  /* ================= Deck-Editor ================= */
  let editDeck = [];
  let editorTab = 'collection';
  const deckFilter = { q: '', kind: '', attr: '', rarity: '', sort: 'default' };

  function countIn(deck, id) { return deck.filter((x) => x === id).length; }

  function renderEditor() {
    const coll = Store.collection();
    $('#deck-count').textContent = editDeck.length + '/30 (min. 20)';
    $('#deck-name').textContent = Store.activeDeckName();
    const v = NT.validateDeck(editDeck, coll);
    const msg = $('#deck-msg');
    msg.textContent = v.ok ? '✓ Deck ist gültig' : v.msg;
    msg.className = v.ok ? 'ok' : '';
    $('#tab-collection').classList.toggle('active', editorTab === 'collection');
    $('#tab-current').classList.toggle('active', editorTab === 'current');
    $('#collection-grid').classList.toggle('hidden', editorTab !== 'collection');
    $('#deck-list').classList.toggle('hidden', editorTab !== 'current');
    $('#deck-filters').classList.toggle('hidden', editorTab !== 'collection');

    if (editorTab === 'collection') {
      const grid = $('#collection-grid');
      grid.innerHTML = '';
      const q = deckFilter.q.trim().toLowerCase();
      const ids = Object.keys(coll).filter((id) => {
        if (!(coll[id] > 0) || !NT.CARDS[id]) return false;
        const c = NT.CARDS[id];
        if (deckFilter.kind && c.kind !== deckFilter.kind) return false;
        if (deckFilter.attr && c.attr !== deckFilter.attr) return false;
        if (deckFilter.rarity && c.rarity !== deckFilter.rarity) return false;
        if (q && c.name.toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      const RAR_RANK = { N: 0, R: 1, SR: 2, UR: 3 };
      ids.sort((a, b) => {
        const ca = NT.CARDS[a], cb = NT.CARDS[b];
        switch (deckFilter.sort) {
          case 'atk': return (cb.atk || 0) - (ca.atk || 0) || ca.name.localeCompare(cb.name);
          case 'level': return (cb.level || 0) - (ca.level || 0) || (cb.atk || 0) - (ca.atk || 0);
          case 'name': return ca.name.localeCompare(cb.name, 'de');
          case 'rarity': return RAR_RANK[cb.rarity] - RAR_RANK[ca.rarity] || (cb.atk || 0) - (ca.atk || 0);
          default: {
            const ka = { ninja: 0, jutsu: 1, falle: 2 }[ca.kind], kb = { ninja: 0, jutsu: 1, falle: 2 }[cb.kind];
            if (ka !== kb) return ka - kb;
            return (cb.level || 0) - (ca.level || 0) || cb.atk - ca.atk || a.localeCompare(b);
          }
        }
      });
      if (!ids.length) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted)">Keine Karten gefunden — Filter zurücksetzen?</p>';
      }
      for (const id of ids) {
        const inDeck = countIn(editDeck, id);
        const maxAdd = Math.min(3, coll[id]);
        const canAdd = editDeck.length < 30 && inDeck < maxAdd;
        const wrap = document.createElement('div');
        wrap.className = 'g-card' + (canAdd ? '' : ' disabled');
        wrap.appendChild(NT.CardView.mini(id));
        const badge = document.createElement('div');
        badge.className = 'own-count' + (inDeck > 0 ? ' in-deck' : '');
        badge.textContent = inDeck > 0 ? inDeck + '/' + coll[id] : '×' + coll[id];
        wrap.appendChild(badge);
        if (NT.attachLongPress) NT.attachLongPress(wrap, () => NT.CardView.show(id)); // Long-Press: Karte groß
        wrap.onclick = () => {
          if (!canAdd) return;
          editDeck.push(id);
          NT.Audio.play('click');
          renderEditor();
        };
        grid.appendChild(wrap);
      }
    } else {
      const grid = $('#deck-list');
      grid.innerHTML = '';
      editDeck.forEach((id, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'g-card';
        wrap.appendChild(NT.CardView.mini(id));
        if (NT.attachLongPress) NT.attachLongPress(wrap, () => NT.CardView.show(id)); // Long-Press: Karte groß
        wrap.onclick = () => {
          editDeck.splice(i, 1);
          NT.Audio.play('click');
          renderEditor();
        };
        grid.appendChild(wrap);
      });
      if (!editDeck.length) grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted)">Deck ist leer.</p>';
    }
  }

  /* ================= Auto-Fill: baut das stärkste Deck aus der Sammlung ================= */
  function buildAutoDeck(coll) {
    const fxNinja = (c) => {
      let v = 0;
      for (const ef of (c.effects || [])) {
        if (ef.t === 'destroy_strongest_on_summon') v += 500;
        else if (ef.t === 'destroy_weakest_on_summon') v += 380;
        else if (ef.t === 'destroy_st_on_summon') v += 250 * (ef.n || 1);
        else if (ef.t === 'dmg_on_summon') v += (ef.v || 0) * 0.6;
        else if (ef.t === 'draw_on_summon' || ef.t === 'flip_draw') v += 250 * (ef.n || 1);
        else if (ef.t === 'token') v += 280;
        else if (ef.t === 'summon_from' || ef.t === 'per_turn_summon') v += 400;
        else if (ef.t === 'double_attack') v += c.atk * 0.35;
        else if (ef.t === 'weaken_on_summon') v += (ef.v || 0) * 0.7;
        else if (ef.t === 'boost_self_on_summon') v += (ef.v || 0) * 0.7;
        else if (ef.t === 'boost_all_on_summon') v += (ef.v || 0);
        else if (ef.t === 'heal_on_summon') v += (ef.v || 0) * 0.3;
        else if (ef.t === 'aura_atk' || ef.t === 'aura_def') v += 220;
        else if (ef.t === 'piercing') v += 120;
        else if (ef.t.indexOf('on_destroy') === 0) v += 150;
      }
      return v;
    };
    const scoreNinja = (id) => { const c = NT.CARDS[id]; return c.atk + c.def * 0.3 + fxNinja(c); };
    const scoreST = (id) => {
      const ef = NT.CARDS[id].effect || {};
      switch (ef.t) {
        case 'destroy_all_enemy': return 700;
        case 'destroy_any_monster': return 500;
        case 'control': return 500;
        case 'revive': return 450;
        case 'negate_spell': return 400;
        case 'draw_per_monster': return 380;
        case 'destroy_attacker': return 360;
        case 'search': return 350;
        case 'destroy_monster_max': return 350;
        case 'negate_and_lock': return 350;
        case 'destroy_summoned_min_level': return 350;
        case 'negate_and_heal': return 340;
        case 'draw_discard': return 320;
        case 'destroy_st': return 300;
        case 'drain': return 300;
        case 'token': return 300;
        case 'sp_summon_hand': return 300;
        case 'bounce': return 300;
        case 'negate_attack': return 300;
        case 'draw': return 250 * (ef.n || 1) + (ef.heal ? ef.heal * 0.2 : 0);
        case 'grant_double_attack': return 260;
        case 'weaken_all': return 260;
        case 'destroy_defense_monster': return 260;
        case 'direct_attack': return 220;
        case 'weaken_attacker': return 210;
        case 'protect': return 200;
        case 'bounce_own': return 160;
        case 'pos_change': return 160;
        case 'dmg': return (ef.v || 0) * 0.5;
        case 'boost_temp': return (ef.v || 0) * 0.45 + (ef.piercing ? 60 : 0);
        case 'boost_perm': return (ef.v || 0) * 0.45;
        case 'equip': return (ef.atk || 0) * 0.45 + (ef.piercing ? 60 : 0);
        case 'heal': return (ef.v || 0) * 0.25;
        case 'mill': return 90;
        default: return 100;
      }
    };
    const owned = [];
    for (const id in coll) {
      if (!NT.CARDS[id] || NT.CARDS[id].token || coll[id] <= 0) continue;
      for (let k = 0; k < Math.min(3, coll[id]); k++) owned.push(id);
    }
    const ninjas = owned.filter((id) => NT.CARDS[id].kind === 'ninja').sort((a, b) => scoreNinja(b) - scoreNinja(a));
    const spts = owned.filter((id) => NT.CARDS[id].kind !== 'ninja').sort((a, b) => scoreST(b) - scoreST(a));
    const deck = [];
    let low = 0, mid = 0, high = 0;
    // Kurve wie bei den starken NPC-Decks: ~11 kleine Ninja, 4 mittlere, max 2 Bosse
    for (const id of ninjas) {
      const c = NT.CARDS[id];
      if (c.level <= 4 && low < 11) { deck.push(id); low++; }
      else if (c.level <= 6 && mid < 4) { deck.push(id); mid++; }
      else if (c.level >= 7 && high < 2 && scoreNinja(id) >= 3000) { deck.push(id); high++; }
    }
    let stCount = 0;
    for (const id of spts) { if (stCount < 8) { deck.push(id); stCount++; } }
    // Fallback: Kategorien zu knapp → mit Restbesten auf min. 20 auffüllen
    // (Duplikate erlaubt — der Pool hat evtl. nicht genug einzigartige Karten)
    for (const id of ninjas.concat(spts)) {
      if (deck.length >= 20) break;
      const have = deck.filter((x) => x === id).length;
      if (have < Math.min(3, coll[id] || 0)) deck.push(id);
    }
    return deck.length >= 20 ? deck : null;
  }

  /* ---------- Editor-Modals (nutzen das globale #modal) ---------- */
  function openUiModal() { $('#modal').classList.remove('hidden'); }
  function closeUiModal() { $('#modal').classList.add('hidden'); }

  function showDeckList() {
    const body = $('#modal-body');
    body.innerHTML = '<h3>📂 Meine Decks</h3>';
    const list = Store.decksList();
    list.forEach((d, i) => {
      const row = document.createElement('div');
      row.className = 'deck-row' + (d.active ? ' active' : '');
      row.innerHTML = '<span class="deck-row-name">' + d.name + '</span>' +
        '<span class="deck-row-count">' + d.count + ' Karten' + (d.active ? ' · aktiv' : '') + '</span>';
      row.onclick = () => {
        Store.setActiveDeck(i);
        editDeck = Store.getDeckRaw();
        closeUiModal();
        renderEditor();
        NT.Audio.play('click');
      };
      const del = document.createElement('button');
      del.className = 'btn btn-mini deck-row-del';
      del.textContent = '🗑';
      del.disabled = list.length <= 1;
      del.title = list.length <= 1 ? 'Das letzte Deck kann nicht gelöscht werden' : 'Deck löschen';
      del.onclick = (e) => {
        e.stopPropagation();
        Store.deleteDeck(i);
        editDeck = Store.getDeckRaw();
        closeUiModal();
        renderEditor();
        NT.Audio.play('click');
        NT.Duel.toast('🗑 Deck gelöscht.');
      };
      row.appendChild(del);
      body.appendChild(row);
    });
    const close = document.createElement('button');
    close.className = 'btn btn-primary';
    close.textContent = 'Schließen';
    close.onclick = closeUiModal;
    body.appendChild(close);
    openUiModal();
  }

  function showNewDeck() {
    const body = $('#modal-body');
    body.innerHTML = '<h3>✨ Neues Deck</h3>' +
      '<p class="log-hint">Auto-Fill baut sofort ein spielstarkes Deck aus deiner Sammlung (Kurve: ~11 kleine Ninja, 4 Bosse, 8 Jutsu/Fallen — inkl. Synergien wie Ziehen, Entfernung, Konter).</p>';
    const input = document.createElement('input');
    input.id = 'newdeck-name';
    input.maxLength = 18;
    input.placeholder = 'Deck-Name (z. B. Sturm-Deck)';
    input.autocomplete = 'off';
    body.appendChild(input);
    const auto = document.createElement('button');
    auto.className = 'btn btn-primary';
    auto.textContent = '⚡ Mit Auto-Fill erstellen';
    auto.onclick = () => {
      const deck = buildAutoDeck(Store.collection());
      if (!deck) { NT.Duel.toast('Sammlung zu klein für Auto-Fill (min. 20 Karten nötig).'); return; }
      Store.createDeck(input.value, deck);
      editDeck = Store.getDeckRaw();
      editorTab = 'current';
      closeUiModal();
      renderEditor();
      NT.Audio.play('buff');
      NT.Duel.toast('✨ „' + Store.activeDeckName() + '" erstellt (' + deck.length + ' Karten)!');
    };
    body.appendChild(auto);
    const empty = document.createElement('button');
    empty.className = 'btn';
    empty.textContent = 'Leeres Deck erstellen';
    empty.onclick = () => {
      Store.createDeck(input.value, []);
      editDeck = [];
      editorTab = 'collection';
      closeUiModal();
      renderEditor();
      NT.Audio.play('click');
      NT.Duel.toast('✨ „' + Store.activeDeckName() + '" erstellt — jetzt füllen!');
    };
    body.appendChild(empty);
    const cancel = document.createElement('button');
    cancel.className = 'btn';
    cancel.textContent = 'Abbrechen';
    cancel.onclick = closeUiModal;
    body.appendChild(cancel);
    openUiModal();
  }

  /* ================= Statistik & Erfolge ================= */
  function showStats() {
    const d = Store.data;
    const wins = Store.totalWins(), losses = Store.totalLosses();
    const games = wins + losses;
    const rate = games ? Math.round((wins / games) * 100) : 0;
    const body = $('#modal-body');
    body.innerHTML = '<h3>📊 Statistik</h3>' +
      '<div class="stat-grid">' +
        '<div class="stat-cell"><div class="stat-num">' + games + '</div><div class="stat-lbl">Duelle</div></div>' +
        '<div class="stat-cell"><div class="stat-num">' + wins + '</div><div class="stat-lbl">Siege</div></div>' +
        '<div class="stat-cell"><div class="stat-num">' + losses + '</div><div class="stat-lbl">Niederlagen</div></div>' +
        '<div class="stat-cell"><div class="stat-num">' + rate + ' %</div><div class="stat-lbl">Siegrate</div></div>' +
        '<div class="stat-cell"><div class="stat-num">' + (d.stats.damageDealt || 0).toLocaleString('de-DE') + '</div><div class="stat-lbl">Schaden gesamt</div></div>' +
        '<div class="stat-cell"><div class="stat-num">' + Store.uniqueCards() + '/' + NT.totalCards() + '</div><div class="stat-lbl">Sammlung</div></div>' +
      '</div>' +
      '<h3 class="ach-head">🏆 Erfolge (' + Object.keys(d.achievements).length + '/' + NT.ACHIEVEMENTS.length + ')</h3>';
    const list = document.createElement('div');
    list.className = 'ach-list';
    for (const a of NT.ACHIEVEMENTS) {
      const got = !!d.achievements[a.id];
      const row = document.createElement('div');
      row.className = 'ach-row' + (got ? ' done' : '');
      row.innerHTML = '<span class="ach-icon">' + (got ? '🏆' : '🔒') + '</span>' +
        '<span class="ach-text"><b>' + a.name + '</b><br>' + a.desc + '</span>' +
        '<span class="ach-rar rar-tag-' + a.rarity + '">' + a.rarity + '</span>';
      list.appendChild(row);
    }
    body.appendChild(list);
    const close = document.createElement('button');
    close.className = 'btn btn-primary';
    close.textContent = 'Schließen';
    close.onclick = closeUiModal;
    body.appendChild(close);
    openUiModal();
  }

  /* ================= Backup: Spielstand exportieren / importieren ================= */
  function encodeSave() {
    const json = JSON.stringify(Store.data);
    return btoa(unescape(encodeURIComponent(json))); // UTF-8-sicher
  }
  function decodeSave(code) {
    const json = decodeURIComponent(escape(atob(code.trim())));
    const d = JSON.parse(json);
    if (!d || typeof d !== 'object' || typeof d.collection !== 'object') throw new Error('bad');
    return json;
  }
  function showBackup() {
    const body = $('#modal-body');
    body.innerHTML = '<h3>💾 Spielstand-Backup</h3>' +
      '<p class="log-hint">Sichere deinen Fortschritt als Code (z. B. fürs Handy). Beim Import wird der aktuelle Stand <b>überschrieben</b>!</p>';
    const cols = document.createElement('div');
    cols.className = 'backup-cols';
    // Export-Box
    const boxEx = document.createElement('div');
    boxEx.className = 'backup-box';
    boxEx.innerHTML = '<h4>📤 Export</h4>';
    const taEx = document.createElement('textarea');
    taEx.rows = 4; taEx.readOnly = true; taEx.value = encodeSave();
    const btnCopy = document.createElement('button');
    btnCopy.className = 'btn'; btnCopy.textContent = '📋 Kopieren';
    btnCopy.onclick = () => {
      taEx.focus(); taEx.select();
      const done = () => NT.Duel.toast('📋 Code kopiert!');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(taEx.value).then(done, done);
      else { try { document.execCommand('copy'); } catch (e) {} done(); }
    };
    boxEx.appendChild(taEx); boxEx.appendChild(btnCopy);
    // Import-Box
    const boxIm = document.createElement('div');
    boxIm.className = 'backup-box';
    boxIm.innerHTML = '<h4>📥 Import</h4>';
    const taIm = document.createElement('textarea');
    taIm.rows = 4; taIm.placeholder = 'Code hier einfügen…';
    const btnApply = document.createElement('button');
    btnApply.className = 'btn btn-primary'; btnApply.textContent = 'Importieren';
    btnApply.onclick = () => {
      let json = null;
      try { json = decodeSave(taIm.value); }
      catch (e) { NT.Duel.toast('⚠️ Ungültiger Code — nichts importiert.'); return; }
      if (!confirm('Aktuellen Spielstand wirklich überschreiben?')) return;
      try { localStorage.setItem(Store.KEY, json); } catch (e) {}
      location.reload();
    };
    boxIm.appendChild(taIm); boxIm.appendChild(btnApply);
    cols.appendChild(boxEx); cols.appendChild(boxIm);
    body.appendChild(cols);
    const close = document.createElement('button');
    close.className = 'btn';
    close.textContent = 'Schließen';
    close.onclick = closeUiModal;
    body.appendChild(close);
    openUiModal();
  }

  /* ================= Blätter-Hintergrund ================= */
  function startLeaves() {
    const box = $('#bg-leaves');
    const emojis = ['🍃', '🍥', '🍂'];
    setInterval(() => {
      if (box.childElementCount > 14) return;
      const l = document.createElement('span');
      l.className = 'leaf';
      l.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      l.style.left = Math.random() * 100 + 'vw';
      l.style.fontSize = 14 + Math.random() * 18 + 'px';
      l.style.animationDuration = 7 + Math.random() * 8 + 's';
      l.style.opacity = 0.25 + Math.random() * 0.35;
      box.appendChild(l);
      setTimeout(() => l.remove(), 16000);
    }, 1800);
  }

  /* ================= Init ================= */
  NT.Main = { show, showSelect };

  document.addEventListener('DOMContentLoaded', () => {
    Store.load();
    NT.Audio.setEnabled(Store.sound());

    $('#scr-title').addEventListener('click', () => {
      NT.Audio.unlock(); NT.Audio.play('click');
      // Erster Start: Story-Kette (Intro → Name → Kaito) vor der Stadt-Map
      if (NT.Story && NT.Story.needsIntro()) NT.Story.startIntro(() => (NT.Map ? NT.Map.show() : show('scr-menu')));
      else show('scr-menu');
    });
    $('#btn-map').addEventListener('click', () => { NT.Audio.play('click'); if (NT.Map) NT.Map.show(); });
    $('#btn-story').addEventListener('click', () => {
      NT.Audio.play('click');
      NT.Story.playIntro(() => show('scr-menu'));
    });
    $('#btn-duel').addEventListener('click', () => { NT.Audio.play('click'); showSelect(); });
    $('#btn-deck').addEventListener('click', () => {
      NT.Audio.play('click');
      editDeck = Store.getDeckRaw();
      editorTab = 'collection';
      renderEditor();
      show('scr-deck');
    });
    $('#btn-help').addEventListener('click', () => { NT.Audio.play('click'); show('scr-help'); });
    $('#btn-sound').addEventListener('click', () => {
      const v = !Store.sound();
      Store.setSound(v);
      $('#btn-sound').textContent = v ? '🔊 Ton: An' : '🔇 Ton: Aus';
      NT.Audio.play('click');
    });
    $('#btn-sound').textContent = Store.sound() ? '🔊 Ton: An' : '🔇 Ton: Aus';
    $('#btn-music').addEventListener('click', () => {
      const v = !Store.music();
      Store.setMusic(v);
      $('#btn-music').textContent = v ? '🎵 Musik: An' : '🎵 Musik: Aus';
      if (v && NT.Music) NT.Music.play('menu');
      NT.Audio.play('click');
    });
    $('#btn-music').textContent = Store.music() ? '🎵 Musik: An' : '🎵 Musik: Aus';
    if (NT.Music) NT.Music.setEnabled(Store.music());

    // Musik-Einstellungen: Duell-Track + Lautstärke
    const DUEL_TRACKS = [
      { id: 'duel', name: 'Chakra Clash (intensiv)' },
      { id: 'duel2', name: 'Ninja-Anthem (rockig)' },
      { id: 'duel3', name: 'Fokus-Beat (ruhig)' },
      { id: 'duel4', name: 'Neon-Drive (synthwave)' },
    ];
    const VOL_STEPS = [0.15, 0.3, 0.5, 0.75];
    const trackLabel = () => '🎶 ' + (DUEL_TRACKS.find((t) => t.id === Store.data.duelTrack) || DUEL_TRACKS[0]).name.split(' (')[0];
    const volLabel = () => '🔉 ' + Math.round(Store.data.musicVol * 100) + ' %';
    $('#btn-duelmusic').textContent = trackLabel();
    $('#btn-musicvol').textContent = volLabel();
    if (NT.Music) NT.Music.setVolume(Store.data.musicVol);
    $('#btn-duelmusic').addEventListener('click', () => {
      const i = DUEL_TRACKS.findIndex((t) => t.id === Store.data.duelTrack);
      Store.data.duelTrack = DUEL_TRACKS[(i + 1) % DUEL_TRACKS.length].id;
      Store.save();
      $('#btn-duelmusic').textContent = trackLabel();
      NT.Audio.play('click');
      NT.Duel.toast('🎶 Duell-Musik: ' + DUEL_TRACKS[(i + 1) % DUEL_TRACKS.length].name);
    });
    $('#btn-musicvol').addEventListener('click', () => {
      let i = VOL_STEPS.findIndex((v) => Math.abs(v - Store.data.musicVol) < 0.01);
      i = (i + 1) % VOL_STEPS.length;
      Store.data.musicVol = VOL_STEPS[i];
      Store.save();
      if (NT.Music) NT.Music.setVolume(VOL_STEPS[i]);
      $('#btn-musicvol').textContent = volLabel();
      NT.Audio.play('click');
    });
    $('#btn-stats').addEventListener('click', () => { NT.Audio.play('click'); Store.checkAchievements(); showStats(); });
    $('#btn-backup').addEventListener('click', () => { NT.Audio.play('click'); showBackup(); });
    $('#shop-back').addEventListener('click', () => { NT.Audio.play('click'); clearInterval(shopTimer); NT.Map.show(); });

    document.querySelectorAll('[data-back]').forEach((b) => {
      b.addEventListener('click', () => { NT.Audio.play('click'); show(b.dataset.back); });
    });

    // Deck-Editor
    $('#tab-collection').addEventListener('click', () => { editorTab = 'collection'; renderEditor(); });
    $('#tab-current').addEventListener('click', () => { editorTab = 'current'; renderEditor(); });
    // Filter (Sammlung-Tab)
    $('#filter-search').addEventListener('input', (e) => { deckFilter.q = e.target.value; renderEditor(); });
    $('#filter-kind').addEventListener('change', (e) => { deckFilter.kind = e.target.value; renderEditor(); });
    $('#filter-attr').addEventListener('change', (e) => { deckFilter.attr = e.target.value; renderEditor(); });
    $('#filter-rarity').addEventListener('change', (e) => { deckFilter.rarity = e.target.value; renderEditor(); });
    $('#filter-sort').addEventListener('change', (e) => { deckFilter.sort = e.target.value; renderEditor(); });
    $('#deck-switch').addEventListener('click', () => { NT.Audio.play('click'); showDeckList(); });
    $('#deck-new').addEventListener('click', () => { NT.Audio.play('click'); showNewDeck(); });
    $('#deck-autofill').addEventListener('click', () => {
      const deck = buildAutoDeck(Store.collection());
      if (!deck) { NT.Duel.toast('Sammlung zu klein für Auto-Fill (min. 20 Karten nötig).'); return; }
      editDeck = deck;
      editorTab = 'current';
      renderEditor();
      NT.Audio.play('buff');
      NT.Duel.toast('⚡ Auto-Fill eingefügt — prüfen & 💾 speichern!');
    });
    $('#deck-save').addEventListener('click', () => {
      const v = NT.validateDeck(editDeck, Store.collection());
      if (!v.ok) { NT.Duel.toast(v.msg); return; }
      Store.saveDeck(editDeck);
      NT.Audio.play('buff');
      NT.Duel.toast('✓ Deck gespeichert!');
    });
    $('#deck-reset').addEventListener('click', () => {
      editDeck = NT.STARTER_DECK.slice();
      renderEditor();
      NT.Duel.toast('Starter-Deck geladen.');
    });

    // Kein Kontextmenü bei langem Drücken (Mobile)
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    startLeaves();
    show('scr-title');
    // PWA: Service Worker nur über http(s) registrieren (file:// bleibt Fallback ohne)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
