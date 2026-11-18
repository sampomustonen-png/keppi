// Pelattavuusanalyysi: node analyze.js
const D = require("../../src/data.js");
const E = require("../../src/engine.js");
const N = +process.argv[2] || 300;
const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(p * (b.length - 1))] : NaN; };
const pct = (x) => (100 * x).toFixed(0) + " %";

// --- botit ---
function mkBot({ knows, trend = true, pack = true, takePkg = false, noise = 0.45 }) {
  return function (s) {
    const seenV = (x) => (knows(s, x) ? x.v : (x._pv ??= x.v * Math.exp(noise * 1.7 * (Math.random() * 2 - 1))));
    const adj = (x) => seenV(x) * (trend && E.demandHits(s, x) > 0 && s.trend.left >= 2 ? 1.25 : 1);
    const mainV = E.maxValue(s);
    if (pack) s.pack.forEach((p, i) => { if (p && p.v < 0.02 * mainV) E.discard(s, i); });
    let best = null;
    const items = pack ? E.allItems(s) : [s.hand];
    items.forEach((it) => {
      const left = E.freshLeft(s, it);
      (s.offers[it.uid] || []).forEach((a, idx) => {
        let val;
        if (a.pkg) { if (!takePkg) return; val = it.v * 1.25; }
        else val = a.items.reduce((t, x) => t + adj(x), 0);
        let gain = (val - (trend ? adj(it) : it.v)) / mainV;
        if (left !== null && left <= 1 && val > 0.5 * it.v) gain += it.v / mainV;
        if (!best || gain > best.gain) best = { it, idx, gain };
      });
    });
    if (best && best.gain > (pack ? 0.04 : 0)) {
      const slot = s.pack.findIndex((p) => p && p.uid === best.it.uid);
      if (slot >= 0) E.swap(s, slot);
      return E.choose(s, best.idx);
    }
    return E.skip(s);
  };
}

function run(bot, knownSet, stats) {
  const { s } = E.newGame(Math.floor(Math.random() * 1e9));
  const tierDay = {};
  let guard = 0;
  while (!s.over && guard++ < 2000) {
    const t = D.tierOf(E.maxValue(s));
    if (tierDay[t] == null) tierDay[t] = s.day;
    if (stats) {
      const as = E.alts(s), h = s.hand;
      const ratios = as.filter((a) => !a.pkg).map((a) => E.altTotal(a) / h.v).sort((a, b) => b - a);
      stats.days++;
      if (ratios.length && ratios[0] < 1) stats.noUp++;
      if (ratios.length >= 2 && ratios[0] >= 1) { stats.upDays++; if (ratios[0] / ratios[1] > 1.3) stats.obvious++; }
      if (as.some((a) => a.pkg)) {
        stats.pkgDays++;
        const p = as.find((a) => a.pkg);
        stats.pkgRatio.push(E.altTotal(p) / h.v);
        if (ratios.length) stats.bestNormal.push(ratios[0]);
      }
      if (as.some((a) => !a.pkg && a.items.some((x) => E.demandHits(s, x) > 0))) stats.hotDays++;
      if (as.some((a) => a.items.length > 1)) stats.pairDays++;
      as.forEach((a) => a.items.forEach((x) => {
        stats.alts++;
        if (knownSet && !knownSet.has(x.id) && s.seen.indexOf(x.id) < 0) stats.unknown[Math.min(3, Math.floor(s.day / 92))]++;
        stats.altsBy[Math.min(3, Math.floor(s.day / 92))]++;
        const t = D.tierOf(x.v); (stats.seenAt[t] ||= new Set()).add(x.id); stats.cnt[t] = (stats.cnt[t] || 0) + 1;
      }));
    }
    bot(s);
  }
  if (knownSet) s.seen.forEach((id) => knownSet.add(id));
  return { won: s.won, day: s.day, tier: E.summary(s).tier, tierDay, trades: s.trades };
}
function summarize(label, rs) {
  const w = rs.filter((r) => r.won);
  console.log(`${label}: voittaa ${pct(w.length / rs.length)}, voittopäivä p50 ${q(w.map((r) => r.day), .5) || "-"}, loppuporras p25/p50/p75 ${q(rs.map((r) => r.tier + 1), .25)}/${q(rs.map((r) => r.tier + 1), .5)}/${q(rs.map((r) => r.tier + 1), .75)}, vaihtoja p50 ${q(rs.map((r) => r.trades), .5)}`);
  return rs;
}
const all = () => true;

console.log("=== 1. Päätösten rakenne (kokenut pelaaja, päivää yhteensä) ===");
const st = { days: 0, noUp: 0, upDays: 0, obvious: 0, pkgDays: 0, pkgRatio: [], bestNormal: [], hotDays: 0, pairDays: 0, alts: 0, unknown: [0, 0, 0, 0], altsBy: [0, 0, 0, 0], seenAt: {}, cnt: {} };
const rs1 = []; for (let i = 0; i < N; i++) rs1.push(run(mkBot({ knows: all }), null, st));
summarize("Taitava kokenut", rs1);
console.log(`Päivät ilman yhtään parannusta: ${pct(st.noUp / st.days)}; kun parannus on tarjolla, selvä voittaja (>30 % parempi kuin toiseksi paras): ${pct(st.obvious / st.upDays)}`);
console.log(`Kysytty tavara tarjolla: ${pct(st.hotDays / st.days)} päivistä; pari tarjolla ${pct(st.pairDays / st.days)}; paketti ${pct(st.pkgDays / st.days)}`);
console.log(`Paketin arvo / oma tavara: p25 ${q(st.pkgRatio, .25).toFixed(2)}, p50 ${q(st.pkgRatio, .5).toFixed(2)}, ka ${(st.pkgRatio.reduce((a, b) => a + b, 0) / st.pkgRatio.length).toFixed(2)}; paras tavallinen samana päivänä p50 ${q(st.bestNormal, .5).toFixed(2)}, ka ${(st.bestNormal.reduce((a, b) => a + b, 0) / st.bestNormal.length).toFixed(2)}`);
const line = []; for (let t = 1; t <= 18; t++) { const ds = rs1.map((r) => r.tierDay[t]).filter((x) => x != null); line.push(`${t + 1}:${q(ds, .5)}`); }
console.log("Mediaanipäivä, jolloin porras saavutetaan: " + line.join(" "));
const rep = []; for (let t = 0; t <= 18; t++) if (st.cnt[t]) rep.push(`${t + 1}:${st.seenAt[t].size}/${D.ITEMS.filter((x) => x.tier === t).length} (${(st.cnt[t] / st.seenAt[t].size / N).toFixed(1)}×)`);
console.log("Portaittain: nähtyjä eri esineitä / kaikki (kuinka monta kertaa kukin näkyy per kierros): " + rep.join("  "));

console.log("\n=== 2. Paketti-strategia ===");
const rsA = []; for (let i = 0; i < N; i++) rsA.push(run(mkBot({ knows: all, trend: false, pack: false }), null));
summarize("Ahne kokenut", rsA);
const rsB = []; for (let i = 0; i < N; i++) rsB.push(run(mkBot({ knows: all, trend: false, pack: false, takePkg: true }), null));
summarize("Ahne kokenut + ottaa aina paketin", rsB);

console.log("\n=== 3. Kysynnän ja repun merkitys (kokenut) ===");
const rsC = []; for (let i = 0; i < N; i++) rsC.push(run(mkBot({ knows: all, trend: false, pack: true }), null));
summarize("Reppu käytössä, kysyntä ei", rsC);
const rsD = []; for (let i = 0; i < N; i++) rsD.push(run(mkBot({ knows: all, trend: true, pack: false }), null));
summarize("Kysyntä käytössä, reppu ei", rsD);

console.log("\n=== 4. Uusi pelaaja: tieto kasvaa kierros kierrokselta (keskiarvo 40 pelaajasta) ===");
const P = 40, R = 6;
const byRun = Array.from({ length: R }, () => ({ rs: [], unk: [0, 0, 0, 0], tot: [0, 0, 0, 0], known: [] }));
for (let p = 0; p < P; p++) {
  const known = new Set();
  for (let r = 0; r < R; r++) {
    const sst = { days: 0, noUp: 0, upDays: 0, obvious: 0, pkgDays: 0, pkgRatio: [], bestNormal: [], hotDays: 0, pairDays: 0, alts: 0, unknown: [0, 0, 0, 0], altsBy: [0, 0, 0, 0], seenAt: {}, cnt: {} };
    const snapshot = new Set(known);
    const bot = mkBot({ knows: (s, x) => snapshot.has(x.id) || s.seen.indexOf(x.id) >= 0, trend: true, pack: true });
    byRun[r].rs.push(run(bot, known, sst));
    for (let k = 0; k < 4; k++) { byRun[r].unk[k] += sst.unknown[k]; byRun[r].tot[k] += sst.altsBy[k]; }
    byRun[r].known.push(known.size);
  }
}
byRun.forEach((b, r) => {
  summarize(`Kierros ${r + 1}`, b.rs);
  console.log(`   tuntemattomia vaihtoehtoja päivät 1–92/93–184/185–276/277–365: ${b.unk.map((u, k) => pct(u / Math.max(1, b.tot[k]))).join(" / ")}; löydöt kierroksen jälkeen ~${Math.round(b.known.reduce((a, c) => a + c, 0) / P)} / ${D.ITEMS.length}`);
});
