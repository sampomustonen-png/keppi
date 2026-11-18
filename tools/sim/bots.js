// Simulaatiobotit
const D = require("../../src/data.js");
const E = require("../../src/engine.js");
// opts: knows(s,x) -> bool, trend, pack, takePkg, noise, forecast
// Epävarman tarjouksen arvoa ei näe: botti arvioi sen tavaran perusarvosta ja muuntimesta, kuten pelaaja löydöistä.
const MOD_MULT = {}; D.MODS.forEach((m) => (MOD_MULT[m.id] = m.mult));
const guess = (x) => D.BY_ID[x.id].v * (x.mod && MOD_MULT[x.mod] ? MOD_MULT[x.mod] : 1);
function mkBot(o) {
  const knows = o.knows || (() => true), noise = o.noise ?? 0.45;
  return function (s) {
    const seenV = (x) => (knows(s, x) ? x.v : (x._pv ??= x.v * Math.exp(noise * 1.7 * (Math.random() * 2 - 1))));
    const adj = (x) => seenV(x) * (o.trend && E.demandHits(s, x) > 0 && s.trend.left >= 2 ? 1.25 : 1) * (o.forecast && E.nextHits(s, x) > 0 ? 1.12 : 1);
    const mainV = E.maxValue(s);
    if (o.pack) s.pack.forEach((p, i) => { if (p && p.v < 0.02 * mainV) E.discard(s, i); });
    let best = null;
    const items = o.pack ? E.allItems(s) : [s.hand];
    items.forEach((it) => {
      const left = E.freshLeft(s, it);
      (s.offers[it.uid] || []).forEach((a, idx) => {
        if (a.gone) return;
        if (a.use && (!o.pack || it !== s.hand)) return;
        let val;
        if (a.pkg) { if (!o.takePkg) return; val = it.v * 1.05; }
        else if (a.est) val = a.items.reduce((t, x) => t + adj(x) * guess(x) / x.v, 0);
        else val = a.items.reduce((t, x) => t + adj(x), 0);
        const partner = a.use ? E.partnerOf(s, a) : null;
        if (a.use && !partner) return;
        const give = (o.trend || o.forecast ? adj(it) : it.v) + (partner ? adj(partner) : 0);
        let gain = (val - give) / mainV;
        if (left !== null && left <= 1 && val > 0.5 * it.v) gain += it.v / mainV;
        if (!best || gain > best.gain) best = { it, idx, gain };
      });
    });
    if (best && best.gain > (o.pack ? 0.03 : 0)) {
      const slot = s.pack.findIndex((p) => p && p.uid === best.it.uid);
      if (slot >= 0) E.swap(s, slot);
      return E.choose(s, best.idx);
    }
    return E.skip(s);
  };
}
function run(bot, opts = {}) {
  const { s } = E.newGame(opts.seed ?? Math.floor(Math.random() * 1e9), opts.level || 1, { mode: opts.mode, fam: opts.fam });
  const tierDay = {};
  let guard = 0;
  while (!s.over && guard++ < 2000) {
    const t = D.tierOf(E.maxValue(s));
    if (tierDay[t] == null) tierDay[t] = s.day;
    if (opts.onDay) opts.onDay(s);
    bot(s);
  }
  if (opts.known) s.seen.forEach((id) => opts.known.add(id));
  return { won: s.won, day: s.day, tier: E.summary(s).tier, tierDay, trades: s.trades, s };
}
const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(p * (b.length - 1))] : NaN; };
module.exports = { mkBot, run, q };
