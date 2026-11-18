// Pelimoottori: toistettavuus, pelimuodot, tallennusten yhteensopivuus
const test = require("node:test");
const assert = require("node:assert");
const D = require("../src/data.js");
const E = require("../src/engine.js");

// yksinkertainen, deterministinen pelitapa: paras tunnettu tarjous, muuten ohitus
function play(s, days) {
  for (let i = 0; i < days && !s.over; i++) {
    const alts = E.alts(s);
    let best = -1, bestR = 1.02;
    alts.forEach((a, k) => { if (a.gone || a.pkg) return; const r = E.altTotal(a) / E.givenValue(s, a); if (r > bestR) { bestR = r; best = k; } });
    if (best >= 0) E.choose(s, best); else E.skip(s);
  }
  return s;
}

test("sama siemen ja samat valinnat tuottavat saman pelin", () => {
  const a = play(E.newGame(12345, 1).s, 120), b = play(E.newGame(12345, 1).s, 120);
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
  const c = play(E.newGame(12346, 1).s, 120);
  assert.notStrictEqual(JSON.stringify(a), JSON.stringify(c));
});

test("päivän vuosi: sama siemen antaa kaikille samat ensimmäiset tarjoukset", () => {
  const x = E.newGame(-987654, 1, { mode: "paiva" }).s, y = E.newGame(-987654, 3, { mode: "paiva", fam: { kamerat: 1 } }).s;
  assert.strictEqual(x.days, 100);
  assert.deepStrictEqual(y.fam, {}, "kokoelmaedut eivät ole käytössä päivän vuodessa");
  assert.deepStrictEqual(E.alts(x).map((a) => a.items.map((i) => i.id)), E.alts(y).map((a) => a.items.map((i) => i.id)));
});

test("pelimuodot: vuosi tasoittain, pikavuosi 100 päivää", () => {
  for (let L = 1; L <= 5; L++) assert.strictEqual(E.newGame(1, L).s.days, E.LEVELS[L].days);
  const p = E.newGame(1, 4, { mode: "pika" }).s;
  assert.strictEqual(p.days, 100); assert.strictEqual(p.mode, "pika"); assert.strictEqual(p.level, 1);
});

test("vuosi päättyy viimeisen päivän jälkeen", () => {
  const s = E.newGame(7, 1, { mode: "pika" }).s;
  let g = 0; while (!s.over && g++ < 500) E.skip(s);
  assert.ok(s.over); assert.strictEqual(s.day, 100);
});

test("vanha tallennus (versio 4) täydentyy ja peli jatkuu", () => {
  const s = play(E.newGame(99, 2).s, 30);
  const old = JSON.parse(JSON.stringify(s));
  delete old.mode; delete old.st; delete old.fam; old.ver = 4;
  const m = E.migrate(old);
  assert.strictEqual(m.ver, 5); assert.strictEqual(m.mode, "vuosi"); assert.ok(m.st && m.fam);
  assert.doesNotThrow(() => play(m, 20));
});

test("kokoelmaetu parantaa tarjouksia vain kokoelman tavaroille", () => {
  const s = E.newGame(5, 1).s;
  s.hand = { uid: 999, id: "kamera", mod: null, v: 800, got: 1 };
  assert.strictEqual(E.famMult(s, s.hand), 1);
  E.setFam(s, { kamerat: 1 });
  assert.strictEqual(E.famMult(s, s.hand), E.CFG.famBonus);
  s.hand.id = "kitara";
  assert.strictEqual(E.famMult(s, s.hand), 1);
  const hard = E.newGame(5, 5).s; hard.hand = { uid: 998, id: "kamera", mod: null, v: 800, got: 1 }; E.setFam(hard, { kamerat: 1 });
  assert.ok(E.famMult(hard, hard.hand) > 1 && E.famMult(hard, hard.hand) < E.CFG.famBonus, "vaikeimmilla tasoilla etu on pienempi");
});

test("tarjouksissa esiintyy epävarmoja, paketteja ja pareja", () => {
  const s = E.newGame(2024, 1).s, kinds = { est: 0, pkg: 0, pair: 0 };
  for (let i = 0; i < 200 && !s.over; i++) {
    E.alts(s).forEach((a) => { if (a.est) kinds.est++; if (a.pkg) kinds.pkg++; if (a.items.length > 1) kinds.pair++; });
    E.skip(s);
  }
  assert.ok(kinds.est > 20 && kinds.pkg > 5 && kinds.pair > 5, JSON.stringify(kinds));
});

test("vaihto kirjaa tilastot haasteita varten", () => {
  const s = play(E.newGame(31337, 1).s, 80);
  assert.ok(s.trades > 0);
  assert.ok(s.st.maxR > 1);
  ["pkg", "merges", "swaps", "hot"].forEach((k) => assert.ok(typeof s.st[k] === "number"));
});
