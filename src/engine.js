// Kepistä kaikkeen – pelimoottori v5 (ei DOM-riippuvuuksia)
// Joka päivä jokaiselle omistetulle tavaralle arvotaan kolme vaihtoehtoa.
// Kysyntä (kaksi tagia) nostaa sopivien tavaroiden tarjouksia muutaman päivän; seuraava kysyntä näkyy ennusteena.
// Vaihtoehto voi olla tavallinen, pari (kaksi tavaraa), paketti (arvo selviää vasta vaihdossa)
// tai "kaksi yhteen" (kädessä oleva + repun tavara yhteen isompaan). Epävarman tarjouksen arvo on arvio,
// joka selviää vasta vaihdossa. Pelimuodot: vuosi (5 vaikeustasoa), pikavuosi ja päivän vuosi (kaikille sama siemen).
var Engine = (function (D) {
  var CFG = {
    alts: 3,
    demand1: 1.6, demand2: 2.0,
    // vaihtojen keskimääräinen suunta portaittain (viritetty simuloimalla, ks. tune.js)
    mu: [-0.071, -0.271, -0.285, -0.269, -0.504, -0.536, -0.567, -0.543, -0.576, -0.524, -0.449, -0.413, -0.405, -0.307, -0.216, -0.397, -0.587, -0.563, -0.563],
    sigma: 0.27,
    pairChance: 0.2, pkgChance: 0.12, pkgSigma: 0.75, pkgEV: 1.0,
    mergeChance: 0.28, mergeBonus: 1.12,
    lateralChance: 0.85,
    trendMin: 4, trendMax: 7, trendPrefer: 2.5,
    market: 1.3, news: 1.2, newsLen: 4,
    packSize: 2,
    // epävarma tarjous: suurempi hajonta, sama keskiarvo kuin tavallisella (estBonus tasaa lognormaalin keskiarvon)
    estChance: 0.22, estSigma: 0.5, estBonus: -0.09,
    // täysi kokoelma: kokoelman tavaroista saa paremmat tarjoukset
    famBonus: 1.1,
    // pikavuoden nopeampi eteneminen (viritetty simuloimalla, ks. tools/sim/tune.js --pika)
    muPika: [0.467, 0.156, 0.178, 0.221, -0.13, -0.15, -0.198, -0.178, -0.226, -0.14, 0.002, 0.059, 0.066, 0.221, 0.357, 0.156, -0.172, -0.081, -0.081]
  };
  // Vaikeustasot: päivät, tarjousten heikennys, pilaantumisaika, ennuste
  var LEVELS = [
    null,
    { name: "Tavallinen vuosi", days: 365, muAdj: 0.04, spoil: 7, forecast: true },
    { name: "Kiireinen vuosi", days: 300, muAdj: 0, spoil: 7, forecast: true },
    { name: "Helle", days: 290, muAdj: -0.036, spoil: 4, forecast: true },
    { name: "Kova vuosi", days: 280, muAdj: -0.05, spoil: 4, forecast: true, famBonus: 1.04 },
    { name: "Mahdoton vuosi", days: 260, muAdj: -0.05, spoil: 4, forecast: false, famBonus: 1.04 }
  ];
  // Pikavuosi ja päivän vuosi: 100 päivää, nopeampi tahti
  var PIKA = { name: "Pikavuosi", days: 100, muAdj: 0, spoil: 3, forecast: true, pika: true, trendMin: 2, trendMax: 4 };
  var MODES = { vuosi: "Vuosi", pika: "Pikavuosi", paiva: "Päivän vuosi" };
  var SEASONS = ["Kevät", "Kesä", "Syksy", "Talvi"];
  var KEEP_CASE = { "Saturnus": 1, "Etelämanner": 1, "Linnunrata": 1, "Internet": 1 };
  var MOD_BY_ID = {};
  D.MODS.forEach(function (m) { MOD_BY_ID[m.id] = m; });
  Object.keys(D.SPECIAL_MODS).forEach(function (k) { MOD_BY_ID[k] = D.SPECIAL_MODS[k]; });
  var FINAL = D.BY_ID["kaikki"];
  var NO_TREND = { tuore: 1, kaikki: 1 };

  // --- satunnaisuus (tila tallentuu) ---
  function rand(s) {
    var t = s.r = (s.r + 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function gauss(s) {
    var u = Math.max(rand(s), 1e-9), v = rand(s);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function pickW(s, arr, wf) {
    var tot = 0, ws = arr.map(function (a) { var w = wf(a); tot += w; return w; });
    var x = rand(s) * tot;
    for (var i = 0; i < arr.length; i++) { x -= ws[i]; if (x <= 0) return arr[i]; }
    return arr[arr.length - 1];
  }

  // --- esineet ---
  function base(inst) { return D.BY_ID[inst.id]; }
  function mod(inst) { return inst.mod ? MOD_BY_ID[inst.mod] : null; }
  function tags(inst) {
    var t = base(inst).tags.slice(), m = mod(inst);
    if (m) m.add.forEach(function (a) { if (t.indexOf(a) < 0) t.push(a); });
    return t;
  }
  function lowerName(n) { return KEEP_CASE[n] || /^[A-ZÅÄÖ][A-ZÅÄÖ-]/.test(n) ? n : n.charAt(0).toLowerCase() + n.slice(1); }
  function name(inst) {
    var b = base(inst), m = mod(inst);
    return m ? (b.pl ? m.pl : m.name) + " " + lowerName(b.name) : b.name;
  }
  // kuvan ulkoasu: värisävy (f), koko (s) ja piirrettyjen kerrosten tunnisteet (k)
  function look(inst) {
    var b = base(inst), m = mod(inst), f = [], sc = 1, ks = [];
    [b.look, m && m.look].forEach(function (k) {
      var L = k && D.LOOKS[k]; if (!L) return;
      if (L.f) f.push(L.f); if (L.s) sc = L.s; ks.push(k);
    });
    return { f: f.join(" "), s: sc, k: ks };
  }
  function level(s) { return s.mode === "pika" || s.mode === "paiva" ? PIKA : LEVELS[s.level || 1]; }
  function freshLeft(s, inst) {
    if (base(inst).tags.indexOf("tuore") < 0 || inst.mod === "pilaantunut") return null;
    return Math.max(0, level(s).spoil - (s.day - inst.got));
  }
  function newInst(s, id, modId, v) { return { uid: s.uidN++, id: id, mod: modId || null, v: v, got: s.day }; }

  function genItem(s, V, prefer, exclude) {
    var lnV = Math.log(V), allowFinal = V >= FINAL.v * 0.4, cands = [];
    D.ITEMS.forEach(function (it) {
      if (it === FINAL && !allowFinal) return;
      if (exclude && it.id === exclude) return;
      var d = lnV - Math.log(it.v);
      if (Math.abs(d) <= 1.1) cands.push({ it: it, d: d });
    });
    if (!cands.length) {
      var best = null;
      D.ITEMS.forEach(function (it) {
        if (it === FINAL && !allowFinal) return;
        var d = lnV - Math.log(it.v);
        if (!best || Math.abs(d) < Math.abs(best.d)) best = { it: it, d: d };
      });
      cands = [best];
    }
    prefer = prefer || [];
    var c = pickW(s, cands, function (c) {
      var w = Math.exp(-c.d * c.d / (2 * 0.5 * 0.5));
      if (c.it.tags.some(function (t) { return prefer.indexOf(t) >= 0; })) w *= CFG.trendPrefer;
      return w;
    });
    var it = c.it;
    if (it === FINAL) return newInst(s, it.id, null, Math.max(V, it.v));
    var opts = [{ m: null, w: 6, lm: 0 }];
    D.MODS.forEach(function (m) {
      if (m.maxT != null && it.tier > m.maxT) return;
      if (m.minT != null && it.tier < m.minT) return;
      if (m.onList && !it.tags.some(function (t) { return m.onList.indexOf(t) >= 0; })) return;
      opts.push({ m: m, w: m.w, lm: Math.log(m.mult) });
    });
    var o = pickW(s, opts, function (o) { var dd = o.lm - c.d; return o.w * Math.exp(-dd * dd / (2 * 0.3 * 0.3)); });
    return newInst(s, it.id, o.m ? o.m.id : null, V);
  }

  // --- tila ---
  function allItems(s) { return [s.hand].concat(s.pack.filter(Boolean)); }
  function maxValue(s) { return allItems(s).reduce(function (a, b) { return Math.max(a, b.v); }, 0); }
  function freeSlot(s) { return s.pack.indexOf(null); }
  function hits(list, inst) { var t = tags(inst); return list.filter(function (x) { return t.indexOf(x) >= 0; }).length; }
  function demandHits(s, inst) { return s.trend ? hits(s.trend.tags, inst) : 0; }
  function nextHits(s, inst) { return s.next && level(s).forecast ? hits(s.next.tags, inst) : 0; }
  function demandMult(s, inst) {
    var h = demandHits(s, inst);
    return h === 0 ? 1 : (h === 1 ? CFG.demand1 : CFG.demand2);
  }
  function muAt(s, v) { var lv = level(s); return (lv.pika ? CFG.muPika : CFG.mu)[D.tierOf(v)] + lv.muAdj; }
  // kokoelmaetu kertautuu vaihdosta toiseen, joten vaikeimmilla tasoilla se on pienempi
  function famBonus(s) { return (s && level(s).famBonus) || CFG.famBonus; }
  function famMult(s, inst) { var f = D.FAM_OF[inst.id]; return f && s.fam && s.fam[f] ? famBonus(s) : 1; }

  function pickTrend(s, avoid) {
    var t = D.tierOf(maxValue(s)), counts = {};
    D.ITEMS.forEach(function (it) {
      if (it.tier < t - 1 || it.tier > t + 2) return;
      it.tags.forEach(function (g) { if (!NO_TREND[g] && (!avoid || avoid.indexOf(g) < 0)) counts[g] = (counts[g] || 0) + 1; });
    });
    var keys = Object.keys(counts), picked = [];
    while (picked.length < 2 && keys.length) {
      var k = pickW(s, keys, function (k) { return counts[k]; });
      picked.push(k); keys.splice(keys.indexOf(k), 1);
    }
    var lv = level(s), lo = lv.trendMin || CFG.trendMin, hi = lv.trendMax || CFG.trendMax;
    return { tags: picked, left: lo + Math.floor(rand(s) * (hi - lo + 1)) };
  }

  function makeAlts(s, inst) {
    var v = inst.v, dm = demandMult(s, inst);
    var mu = muAt(s, v);
    var mult = s.dayMult * dm * famMult(s, inst);
    var partner = null;
    if (inst === s.hand) {
      var others = s.pack.filter(Boolean);
      if (others.length && rand(s) < CFG.mergeChance) partner = others[Math.floor(rand(s) * others.length)];
    }
    var slots = [];
    for (var k = 0; k < CFG.alts; k++) slots.push("n");
    var pick = function () { var free = []; slots.forEach(function (t, i) { if (t === "n") free.push(i); }); return free.length ? free[Math.floor(rand(s) * free.length)] : -1; };
    if (freeSlot(s) >= 0 && rand(s) < CFG.pairChance) { var a = pick(); if (a >= 0) slots[a] = "pair"; }
    if (s.day > 5 && rand(s) < CFG.pkgChance) { var b = pick(); if (b >= 0) slots[b] = "pkg"; }
    if (partner) { var c = pick(); if (c >= 0) slots[c] = "merge"; }
    var prefer = s.trend ? s.trend.tags : [];
    var nextPrefer = s.next && level(s).forecast ? s.next.tags : prefer;
    var alts = slots.map(function (type) {
      var V = v * mult * Math.exp(mu + CFG.sigma * gauss(s));
      if (type === "pkg") {
        // odotusarvo noin oman tavaran arvo, mutta hajonta suuri: voi tuplata tai puolittaa
        var pm = Math.log(CFG.pkgEV) - CFG.pkgSigma * CFG.pkgSigma / 2;
        return { items: [genItem(s, v * mult * Math.exp(pm + CFG.pkgSigma * gauss(s)), null, inst.id)], pkg: true };
      }
      if (type === "pair") {
        var tot = V * 1.1, split = 0.55 + rand(s) * 0.15;
        return { items: [genItem(s, tot * split, prefer, inst.id), genItem(s, tot * (1 - split), nextPrefer, inst.id)] };
      }
      if (type === "merge") {
        var mv = (v * dm + partner.v * demandMult(s, partner)) * s.dayMult * Math.exp(muAt(s, v + partner.v) + CFG.sigma * gauss(s)) * CFG.mergeBonus;
        return { items: [genItem(s, mv, prefer, inst.id)], use: partner.uid };
      }
      if (rand(s) < CFG.estChance) {
        var EV = v * mult * Math.exp(mu + CFG.estBonus + CFG.estSigma * gauss(s));
        return { items: [genItem(s, EV, rand(s) < 0.5 ? prefer : null, inst.id)], est: true };
      }
      return { items: [genItem(s, V, rand(s) < 0.5 ? prefer : null, inst.id)] };
    });
    // sivuttaisvaihto: jos mikään ei ole lähes yhtä arvokas, yksi vaihtoehto muutetaan tasaveroiseksi
    var bestR = Math.max.apply(null, alts.map(function (a) { return a.pkg ? 0 : altTotal(a) / (v + (a.use ? partner.v : 0)); }));
    if (bestR < 0.95 && rand(s) < CFG.lateralChance) {
      var idx = -1;
      alts.forEach(function (a, i) { if (idx < 0 && !a.pkg && !a.use && !a.est && a.items.length === 1) idx = i; });
      if (idx >= 0) {
        var lv = v * Math.min(1.07, Math.max(0.95, Math.exp(0.04 * gauss(s))));
        alts[idx] = { items: [genItem(s, lv, rand(s) < 0.5 ? prefer : nextPrefer, inst.id)], lateral: true };
      }
    }
    return alts;
  }
  function altTotal(a) { return a.items.reduce(function (x, y) { return x + y.v; }, 0); }

  function seasonOf(s, day) { return Math.min(3, Math.floor((day - 1) / (s.days / 4))); }

  // opts: { mode: "vuosi" | "pika" | "paiva", fam: { kokoelma-id: 1 } }
  function newGame(seed, lvl, opts) {
    opts = opts || {};
    seed = (seed == null ? Math.floor(Math.random() * 2147483647) : seed) | 0;
    lvl = Math.max(1, Math.min(LEVELS.length - 1, lvl || 1));
    var mode = MODES[opts.mode] ? opts.mode : "vuosi";
    var s = {
      ver: 5, seed: seed, r: seed, mode: mode, level: mode === "vuosi" ? lvl : 1, day: 0, days: 0, uidN: 1,
      hand: null, pack: [], offers: {}, trend: null, next: null, event: null, dayMult: 1, famous: false,
      chain: [], trades: 0, best: null, seen: [], newsLeft: 0, over: false, won: false,
      season: 0, seasonLog: [], seasonStart: null,
      fam: mode === "paiva" ? {} : (opts.fam || {}),
      st: { pkg: 0, merges: 0, swaps: 0, hot: 0, maxR: 0, pkgBest: 0 }
    };
    s.days = level(s).days;
    for (var i = 0; i < CFG.packSize; i++) s.pack.push(null);
    s.hand = newInst(s, "keppi", null, D.BY_ID["keppi"].v);
    s.seen.push("keppi");
    s.best = { id: "keppi", mod: null, v: s.hand.v };
    s.chain.push(["keppi"]);
    s.seasonStart = { day: 1, v: s.hand.v, trades: 0, seen: 1, id: "keppi" };
    var news = nextDay(s);
    return { s: s, news: news };
  }

  function nextDay(s) {
    var news = [];
    if (s.day >= s.days) { closeSeason(s, news); s.over = true; s.offers = {}; return news; }
    s.day++;
    var se = seasonOf(s, s.day);
    if (se !== s.season) { closeSeason(s, news); s.season = se; }
    allItems(s).forEach(function (it) {
      if (freshLeft(s, it) === 0) {
        it.mod = "pilaantunut"; it.v *= D.SPECIAL_MODS.pilaantunut.mult;
        news.push({ k: "spoil", item: it });
      }
    });
    if (!s.trend) { s.trend = pickTrend(s); s.next = pickTrend(s, s.trend.tags); }
    else if (s.trend.left <= 1) {
      s.trend = s.next || pickTrend(s);
      s.next = pickTrend(s, s.trend.tags);
      if (s.day > 1) news.push({ k: "trend" });
    } else s.trend.left--;
    var mv = maxValue(s);
    s.event = null; s.dayMult = 1; s.famous = false;
    var r = rand(s);
    if (r < 0.07 && s.day > 1) {
      var it = genItem(s, mv * (0.15 + 0.45 * rand(s)), s.next ? s.next.tags : s.trend.tags);
      var fs = freeSlot(s);
      if (fs >= 0) { s.pack[fs] = it; addSeen(s, it); s.event = { k: "find", item: it }; }
      else s.event = { k: "findFull", item: it };
    } else if (r < 0.13 && s.day > 3) {
      s.dayMult *= CFG.market; s.event = { k: "market" };
    } else if (r < 0.16 && s.trades >= 8 && s.day >= 20 && s.newsLeft === 0) {
      s.newsLeft = CFG.newsLen; s.event = { k: "news" };
    }
    if (s.newsLeft > 0) { s.dayMult *= CFG.news; s.newsLeft--; s.famous = true; }
    s.offers = {};
    // käsi viimeisenä, jotta "kaksi yhteen" näkee repun
    s.pack.forEach(function (p) { if (p) s.offers[p.uid] = makeAlts(s, p); });
    s.offers[s.hand.uid] = makeAlts(s, s.hand);
    return news;
  }

  function closeSeason(s, news) {
    if (!s.seasonStart || s.seasonLog.length > s.season) return;
    var own = allItems(s).slice().sort(function (a, b) { return b.v - a.v; })[0];
    var rec = { season: s.season, name: SEASONS[s.season], fromId: s.seasonStart.id, fromV: s.seasonStart.v, toId: own.id, toMod: own.mod, toV: own.v,
      trades: s.trades - s.seasonStart.trades, found: s.seen.length - s.seasonStart.seen };
    s.seasonLog.push(rec);
    s.seasonStart = { day: s.day, v: own.v, trades: s.trades, seen: s.seen.length, id: own.id };
    if (!s.won) news.push({ k: "season", rec: rec });
  }

  function addSeen(s, inst) { if (s.seen.indexOf(inst.id) < 0) s.seen.push(inst.id); }
  function alts(s) { return s.offers[s.hand.uid] || []; }
  function partnerOf(s, a) {
    if (!a || !a.use) return null;
    for (var i = 0; i < s.pack.length; i++) if (s.pack[i] && s.pack[i].uid === a.use) return s.pack[i];
    return null;
  }
  // mitä vaihdossa annetaan pois (käsi + mahdollinen repun tavara)
  function givenValue(s, a) { var p = partnerOf(s, a); return s.hand.v + (p ? p.v : 0); }

  function swap(s, slot) {
    var p = s.pack[slot];
    if (!p || s.over) return false;
    s.pack[slot] = s.hand; s.hand = p;
    s.st.swaps++;
    return true;
  }
  // vanhan tallennuksen täydennys uuteen muotoon
  function migrate(s) {
    if (!s) return s;
    if (!s.mode) s.mode = "vuosi";
    if (!s.fam) s.fam = {};
    if (!s.st) s.st = { pkg: 0, merges: 0, swaps: 0, hot: 0, maxR: 0, pkgBest: 0 };
    s.ver = 5;
    return s;
  }
  // kokoelmaedut voivat päivittyä kesken vuoden (ei päivän vuodessa)
  function setFam(s, fam) { if (s.mode !== "paiva") s.fam = fam || {}; }
  function discard(s, slot) {
    if (!s.pack[slot] || s.over) return false;
    var it = s.pack[slot];
    s.pack[slot] = null;
    delete s.offers[it.uid];
    Object.keys(s.offers).forEach(function (k) { s.offers[k].forEach(function (a) { if (a.use === it.uid) a.gone = true; }); });
    return true;
  }

  function choose(s, idx) {
    var a = alts(s)[idx];
    if (!a || a.gone || s.over) return null;
    if (a.use && !partnerOf(s, a)) return null;
    var gave = s.hand, got = a.items, used = partnerOf(s, a);
    var givenV = gave.v + (used ? used.v : 0), ratio = altTotal(a) / givenV;
    if (a.pkg) { s.st.pkg++; s.st.pkgBest = Math.max(s.st.pkgBest, ratio); }
    if (used) s.st.merges++;
    if (demandHits(s, gave) > 0) s.st.hot++;
    s.st.maxR = Math.max(s.st.maxR, ratio);
    if (used) s.pack[s.pack.indexOf(used)] = null;
    got.forEach(function (x) { x.got = s.day; });
    s.hand = got[0];
    if (got[1]) { var fs = freeSlot(s); if (fs >= 0) s.pack[fs] = got[1]; }
    var res = { gave: gave, used: used, got: got, pkg: !!a.pkg, est: !!a.est, ratio: ratio, won: false, fresh: [] };
    s.trades++;
    s.chain.push(got.map(function (x) { return x.id; }));
    got.forEach(function (x) { if (s.seen.indexOf(x.id) < 0) res.fresh.push(x); addSeen(s, x); });
    allItems(s).forEach(function (x) { if (x.v > s.best.v) s.best = { id: x.id, mod: x.mod, v: x.v }; });
    if (got.some(function (x) { return x.id === "kaikki"; })) {
      s.won = true; closeSeason(s, []); s.over = true; s.offers = {}; res.won = true;
      return res;
    }
    res.news = nextDay(s);
    return res;
  }

  function skip(s) {
    if (s.over) return null;
    return { news: nextDay(s) };
  }

  function summary(s) {
    var own = allItems(s).slice().sort(function (a, b) { return b.v - a.v; })[0];
    var t = D.tierOf(own.v);
    return { own: own, tier: t, title: D.TIERS[t].title };
  }

  return {
    CFG: CFG, LEVELS: LEVELS, PIKA: PIKA, MODES: MODES, SEASONS: SEASONS, newGame: newGame, choose: choose, skip: skip, swap: swap, discard: discard,
    migrate: migrate, setFam: setFam, famMult: famMult, famBonus: famBonus, demandMult: demandMult,
    alts: alts, altTotal: altTotal, partnerOf: partnerOf, givenValue: givenValue, name: name, lowerName: lowerName, look: look, tags: tags, base: base,
    freshLeft: freshLeft, maxValue: maxValue, allItems: allItems, summary: summary, seasonOf: seasonOf, level: level,
    demandHits: demandHits, nextHits: nextHits
  };
})(typeof DATA !== "undefined" ? DATA : require("./data.js"));
if (typeof module !== "undefined") module.exports = Engine;
