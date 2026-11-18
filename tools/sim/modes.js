// Pikavuoden ja kokoelmaetujen vaikutus: node modes.js [n]
const D = require("../../src/data.js"); const E = require("../../src/engine.js"); const { mkBot, run, q } = require("./bots.js");
const N = +process.argv[2] || 200;
const ALLFAM = {}; D.FAMILIES.forEach((f) => (ALLFAM[f.id] = 1));
function rep(label, bot, opts = {}) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(run(bot, opts));
  const w = rs.filter((r) => r.won);
  console.log(`${label.padEnd(40)} voittaa ${String(Math.round(100 * w.length / N)).padStart(3)} %  voittopäivä p50 ${String(q(w.map((r) => r.day), .5)).padStart(4)}  loppuporras p50 ${q(rs.map((r) => r.tier + 1), .5)}  vaihtoja ${q(rs.map((r) => r.trades), .5)}`);
}
const skilled = mkBot({ trend: true, pack: true, forecast: true }), simple = mkBot({ trend: true, pack: false });
rep("Pikavuosi: taitava", skilled, { mode: "pika" });
rep("Pikavuosi: kysyntä ilman reppua", simple, { mode: "pika" });
rep("Pikavuosi: ahne", mkBot({}), { mode: "pika" });
rep("Taso 4 ilman kokoelmia: taitava", skilled, { level: 4 });
rep("Taso 4 kaikki kokoelmat: taitava", skilled, { level: 4, fam: ALLFAM });
rep("Taso 5 ilman kokoelmia: taitava", skilled, { level: 5 });
rep("Taso 5 kaikki kokoelmat: taitava", skilled, { level: 5, fam: ALLFAM });
