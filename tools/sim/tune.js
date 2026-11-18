// Virittää portaittaisen mu-taulukon niin, että aika portaalla on lähellä tavoitetta
const D = require("../../src/data.js"); const E = require("../../src/engine.js"); const { mkBot, run, q } = require("./bots.js");
// käyttö: node tune.js [n] [kierroksia] [--pika]
const PIKA = process.argv.includes("--pika");
const N = +process.argv[2] || 200, IT = +process.argv[3] || 8;
const MU = PIKA ? E.CFG.muPika : E.CFG.mu;
const target = Array.from({ length: 18 }, (_, t) => (PIKA ? (t < 4 ? 2.5 : 4.4) : (t < 4 ? 8 : 15)));
const bot = mkBot({ trend: true, pack: true, forecast: true });
for (let it = 0; it < IT; it++) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(run(bot, PIKA ? { mode: "pika" } : {}));
  const days = [];
  for (let t = 0; t < 18; t++) {
    const ds = rs.filter((r) => r.tierDay[t] != null && r.tierDay[t + 1] != null).map((r) => r.tierDay[t + 1] - r.tierDay[t]);
    days.push(ds.length > N * 0.3 ? q(ds, 0.5) : 40);
  }
  const wins = rs.filter((r) => r.won).length / N;
  console.log(`kierros ${it}: voitto ${(wins * 100).toFixed(0)} %, p50 ${q(rs.filter(r=>r.won).map((r) => r.day), .5)} | päivät: ${days.join(" ")}`);
  for (let t = 0; t < 18; t++) MU[t] = Math.max(-0.9, Math.min(0.6, MU[t] + 0.08 * Math.log(Math.max(1, days[t]) / target[t])));
  MU[18] = MU[17];
}
console.log((PIKA ? "muPika" : "mu") + ": [" + MU.map((x) => x.toFixed(3)).join(", ") + "]");
