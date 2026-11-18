// Tuottaa testitiloja asettelutarkistukseen: oikeita pelitilanteita kaikista pelimuodoista + pahimpia nimiyhdistelmiä.
// node tools/qa/gen_states.js  →  tools/qa/out/states.json
const fs = require("fs"), path = require("path");
const D = require("../../src/data.js"), E = require("../../src/engine.js"), { mkBot } = require("../sim/bots.js");
const out = [];
const clone = (x) => JSON.parse(JSON.stringify(x));
const allFam = {}; D.FAMILIES.forEach((f) => (allFam[f.id] = 1));
for (const [seed, lvl, mode] of [[11, 1, "vuosi"], [22, 3, "vuosi"], [33, 5, "vuosi"], [44, 1, "pika"], [55, 1, "paiva"]]) {
  const { s } = E.newGame(seed, lvl, { mode, fam: mode === "paiva" ? {} : seed === 22 ? allFam : {} });
  const bot = mkBot({ trend: true, pack: true, forecast: true });
  let g = 0;
  while (!s.over && g++ < 400) {
    if (s.day % (mode === "vuosi" ? 23 : 11) === 3) out.push({ name: `${mode}${seed}-pv${s.day}`, s: clone(s) });
    bot(s);
  }
}
// pahin tapaus: pisimmät nimet ja muuntimet
const byLen = D.ITEMS.slice().sort((a, b) => b.name.length - a.name.length);
const longMod = D.MODS.slice().sort((a, b) => b.name.length - a.name.length)[0].id;
const base = clone(out[Math.floor(out.length / 3)].s);
let uid = 90000;
const inst = (it, mod, v) => ({ uid: uid++, id: it.id, mod: mod || null, v: v || it.v, got: base.day });
function stress(name, hi) {
  const s = clone(base);
  const pool = hi ? byLen.filter((x) => x.v > 1e9) : byLen;
  s.hand = inst(pool[0], longMod, pool[0].v);
  s.pack = [inst(pool[1], longMod), inst(pool[2], "kuninkaallinen")];
  s.offers = {};
  s.offers[s.hand.uid] = [
    { items: [inst(pool[3], longMod), inst(pool[4], "kristallinen")] },
    { items: [inst(pool[5], "kuninkaallinen")], est: true },
    { items: [inst(pool[6], longMod)], pkg: true },
  ];
  s.pack.forEach((p) => { s.offers[p.uid] = [{ items: [inst(pool[7])] }, { items: [inst(pool[8])], est: true }, { items: [inst(pool[9])], use: s.hand.uid }]; });
  s.event = { k: "news" };
  s.trend = { tags: ["kulkuneuvo", "kiinteistö", "tekniikka"].filter((t) => D.TAGS[t]), left: 3 };
  s.next = { tags: ["avaruus", "kuninkaallinen", "musiikki"].filter((t) => D.TAGS[t]) };
  s.fam = allFam;
  out.push({ name: name, s });
}
stress("pisimmat-nimet", false);
stress("pisimmat-nimet-kallis", true);
fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "out", "states.json"), JSON.stringify(out));
console.log(out.length, "tilaa");
