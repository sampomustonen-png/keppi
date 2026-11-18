// ---------- perusta: tallennus ja apurit ----------
// Käyttöliittymä on jaettu osiin (src/ui/*.js). Rakennusvaihe liittää ne yhdeksi funktioksi,
// joten osat jakavat samat muuttujat (D, E, s, store ...).
var D = DATA, E = Engine;
var LS = "kepista-kaikkeen.v2";
var SAVE_VER = 5;
var NBSP = " ";
var TOTAL = D.ITEMS.length;
var MODE_IDS = ["vuosi", "pika", "paiva"];
var store = load();
var known = {};
rebuildKnown();
var s = null;
var busy = false;
var bookMode = "abc";

function defaults() {
  return {
    saves: { vuosi: null, pika: null, paiva: null }, book: [], fams: [], ach: {}, sound: true, runs: 0, wins: 0,
    unlocked: 1, level: 1, mode: "vuosi", best: {}, daily: { last: null, streak: 0, bestStreak: 0, results: {} }, updatedAt: 0
  };
}
function load() {
  var d = defaults();
  try {
    var x = JSON.parse(localStorage.getItem(LS));
    if (x && typeof x === "object") for (var k in x) d[k] = x[k];
  } catch (e) {}
  return normalize(d);
}
// täydentää puuttuvat kentät ja siirtää vanhan tallennusmuodon uuteen
function normalize(d) {
  var def = defaults();
  for (var k in def) if (d[k] == null) d[k] = def[k];
  if (d.save) { if (!d.saves.vuosi && d.save.ver >= 4) d.saves.vuosi = E.migrate(d.save); delete d.save; }
  MODE_IDS.forEach(function (m) {
    var sv = d.saves[m];
    if (sv && (sv.over || !(sv.ver >= 4) || !sv.hand)) d.saves[m] = null;
    else if (sv) E.migrate(sv);
  });
  d.book = (d.book || []).filter(function (id) { return D.BY_ID[id]; });
  d.fams = (d.fams || []).filter(function (id) { return D.FAM_BY_ID[id]; });
  if (MODE_IDS.indexOf(d.mode) < 0) d.mode = "vuosi";
  if (!d.daily.results) d.daily.results = {};
  if (d.bestDays && !d.best[1]) d.best[1] = d.bestDays;
  return d;
}
function rebuildKnown() { known = {}; store.book.forEach(function (id) { known[id] = 1; }); }
function persist() {
  if (s) store.saves[s.mode] = s.over ? null : s;
  store.updatedAt = Date.now();
  try { localStorage.setItem(LS, JSON.stringify(store)); } catch (e) {}
}
function famMap() { var m = {}; store.fams.forEach(function (id) { m[id] = 1; }); return m; }

// ---------- apurit ----------
function $(id) { return document.getElementById(id); }
function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function group(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP); }
function sig(x, d) { if (x <= 0) return 0; var p = Math.pow(10, Math.floor(Math.log10(x)) - (d - 1)); return Math.round(x / p) * p; }
function dec1(x) { return (Math.round(x * 10) / 10).toFixed(1).replace(".", ",").replace(/,0$/, ""); }
function fmt(v, id) {
  if (id === "kaikki") return "kaikki";
  if (v < 1) return (Math.round(v * 100) / 100).toFixed(2).replace(".", ",") + NBSP + "€";
  if (v < 10) return dec1(v) + NBSP + "€";
  if (v < 1e6) return group(v < 100 ? Math.round(v) : sig(v, 2)) + NBSP + "€";
  var units = [[1e15, "biljardia"], [1e12, "bilj."], [1e9, "mrd."], [1e6, "milj."]];
  for (var i = 0; i < units.length; i++) if (v >= units[i][0]) {
    var x = v / units[i][0];
    return (x < 10 ? dec1(x) : group(sig(x, 2))) + NBSP + units[i][1] + NBSP + "€";
  }
}
function delta(r) {
  if (r >= 1000) return { t: "×1000+", c: "up" };
  if (r >= 10) return { t: "×" + Math.round(r), c: "up" };
  var p = Math.round((r - 1) * 100);
  if (p > 0) return { t: "+" + p + NBSP + "%", c: "up" };
  if (p < 0) return { t: "−" + Math.abs(p) + NBSP + "%", c: "down" };
  return { t: "±0" + NBSP + "%", c: "" };
}
var ALPHA = "abcdefghijklmnopqrstuvwxyzåäö";
function fiKey(name) {
  var k = "", t = name.toLowerCase().replace(/ñ/g, "n").replace(/é/g, "e");
  for (var i = 0; i < t.length; i++) {
    var c = t.charAt(i), a = ALPHA.indexOf(c);
    if (a >= 0) k += String.fromCharCode(100 + a);
    else if (c >= "0" && c <= "9") k += String.fromCharCode(60 + (+c));
    else k += String.fromCharCode(40);
  }
  return k;
}
function plural(n, one, many) { return n === 1 ? one : many; }
function dateStr(d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function dateFi(ds) { var p = ds.split("-"); return +p[2] + "." + +p[1] + "." + p[0]; }
function prevDate(ds) { var p = ds.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2] - 1); return dateStr(d); }
// päivän vuoden siemen: sama kaikille samana päivänä
function dailySeed(ds) { var h = 2166136261; ds = "kepista:" + ds; for (var i = 0; i < ds.length; i++) { h ^= ds.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }
function modeName(sv) { return sv.mode === "paiva" ? "Päivän vuosi " + dateFi(sv.date) : sv.mode === "pika" ? "Pikavuosi" : (sv.level > 1 ? "Vuosi, taso " + sv.level : "Vuosi"); }

// ---------- värit ja kontrasti ----------
function rgb(h) { h = h.replace("#", ""); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
function hex(c) { return "#" + c.map(function (x) { return ("0" + Math.round(Math.max(0, Math.min(255, x))).toString(16)).slice(-2); }).join(""); }
function lum(c) { return c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (a, v, i) { return a + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function mix(a, b, k) { return a.map(function (x, i) { return x + (b[i] - x) * k; }); }
function ensure(col, bg, target, toward) {
  var c = rgb(col), B = rgb(bg), T = rgb(toward);
  for (var k = 0; k <= 1.0001; k += 0.04) { var m = mix(c, T, k); if (contrast(m, B) >= target) return hex(m); }
  return hex(T);
}
