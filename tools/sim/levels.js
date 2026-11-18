const D = require("../../src/data.js"); const E = require("../../src/engine.js"); const { mkBot, run, q } = require("./bots.js");
const N = +process.argv[2] || 200;
function rep(label, bot, opts = {}) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(run(bot, opts));
  const w = rs.filter((r) => r.won);
  console.log(`${label.padEnd(44)} voittaa ${String(Math.round(100 * w.length / N)).padStart(3)} %  voittopäivä p50 ${String(q(w.map((r) => r.day), .5)).padStart(4)}  loppuporras p25/p50 ${q(rs.map((r) => r.tier + 1), .25)}/${q(rs.map((r) => r.tier + 1), .5)}  vaihtoja ${q(rs.map((r) => r.trades), .5)}`);
  return rs;
}
const lvl = +process.argv[3] || 0;
if (!lvl) {
  rep("Taitava (kysyntä+reppu+ennuste)", mkBot({ trend: true, pack: true, forecast: true }));
  rep("Taitava ilman ennustetta", mkBot({ trend: true, pack: true }));
  rep("Kysyntä, ei reppua", mkBot({ trend: true, pack: false }));
  rep("Ahne (vain paras prosentti)", mkBot({}));
  rep("Ahne + ottaa aina paketin", mkBot({ takePkg: true }));
  const unk = (s, x) => s.seen.indexOf(x.id) >= 0;
  rep("1. kierros: taitava", mkBot({ trend: true, pack: true, forecast: true, knows: unk }));
  rep("1. kierros: ahne", mkBot({ knows: unk }));
} else {
  for (let L = 1; L <= 5; L++) rep(`Taso ${L} ${E.LEVELS[L].name}: taitava`, mkBot({ trend: true, pack: true, forecast: true }), { level: L });
  for (let L = 1; L <= 5; L++) rep(`Taso ${L}: kysyntä ilman reppua`, mkBot({ trend: true, pack: false }), { level: L });
}
