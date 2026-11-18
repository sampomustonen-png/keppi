// Vaikeustasojen regressio: taitava botti pelaa jokaisella tasolla. Rajat ovat väljiä, jotta satunnaisuus ei kaada testiä.
// Tarkempi mittaus: node tools/sim/levels.js 300 1 ja node tools/sim/modes.js 300
const test = require("node:test");
const assert = require("node:assert");
const { mkBot, run } = require("../tools/sim/bots.js");
const D = require("../src/data.js");
const ALL = {}; D.FAMILIES.forEach((f) => (ALL[f.id] = 1));
const N = +(process.env.BALANCE_N || 60);
const bot = mkBot({ trend: true, pack: true, forecast: true });
function rate(opts, seed0) { let w = 0; for (let i = 0; i < N; i++) if (run(bot, Object.assign({ seed: seed0 + i }, opts)).won) w++; return w / N; }

test("vaikeustasot pysyvät porrastettuina", () => {
  const r1 = rate({ level: 1 }, 1000), r3 = rate({ level: 3 }, 2000), r5 = rate({ level: 5 }, 3000), rp = rate({ mode: "pika" }, 4000);
  const msg = `taso 1 ${r1}, taso 3 ${r3}, taso 5 ${r5}, pikavuosi ${rp}`;
  assert.ok(r1 >= 0.9, msg);
  assert.ok(r3 >= 0.55 && r3 <= 0.99, msg);
  assert.ok(r5 >= 0.05 && r5 <= 0.6, msg);
  assert.ok(r5 < r3 && r3 <= r1, msg);
  assert.ok(rp >= 0.75, msg);
});

test("kaikki kokoelmat eivät tee vaikeimmasta tasosta helppoa", () => {
  const r = rate({ level: 5, fam: ALL }, 6000);
  assert.ok(r <= 0.6, "taso 5 kaikilla kokoelmilla " + r);
});
