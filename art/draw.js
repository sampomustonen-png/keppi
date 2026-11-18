// Kepistä kaikkeen – oma piirtokieli kuvakkeille (64×64)
// Muodot erotetaan puolipisteellä. Värit paletista (kaksi kirjainta) tai #hex, läpinäkyvyys /NN (prosenttia).
//   c cx cy r F            ympyrä
//   e cx cy rx ry F        ellipsi
//   r x y w h F [säde]     suorakaide
//   p F d...               täytetty polku
//   s F leveys d...        viiva (pyöreät päät)
//   o cx cy r F leveys     rengas
//   g kulma cx cy  ...  /g kierretty ryhmä
//   t dx dy [skaala] ... /g siirretty ryhmä
//   sd F leveys viiva,väli d... katkoviiva
//   q F S leveys d...      täytetty polku ääriviivalla
// Alkuun "!" = ei varjoa maassa.
var PAL = {
  bk: "#2b2a28", dk: "#4a4f55", gy: "#9aa0a6", lt: "#d9dde0", wh: "#f7f5f0",
  br: "#9b6a43", db: "#6e4a2e", lb: "#c79a6b", sn: "#e8d3a8", cr: "#f3e6c8",
  rd: "#e0544b", dr: "#b13d36", pk: "#f29bb0", mg: "#c94f8c",
  or: "#f39a3d", yl: "#f6c945", gd: "#e3b23c", ok: "#b9862b",
  gn: "#5bb06a", dg: "#3e8a50", lg: "#a6d67f", ol: "#8a9a3a",
  tl: "#3fb3a6", sk: "#8cc8f0", bl: "#4f8fd8", nv: "#2f4a7a",
  pu: "#8b6cc9", lv: "#c3b0ea", mt: "#d0d6dc"
};
function col(t) {
  var a = null, i = t.indexOf("/");
  if (i > 0) { a = +t.slice(i + 1) / 100; t = t.slice(0, i); }
  var c = PAL[t] || t;
  return a == null ? 'fill="' + c + '"' : 'fill="' + c + '" fill-opacity="' + a + '"';
}
function stroke(t, w) {
  var a = null, i = t.indexOf("/");
  if (i > 0) { a = +t.slice(i + 1) / 100; t = t.slice(0, i); }
  var c = PAL[t] || t;
  return 'fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (a == null ? "" : ' stroke-opacity="' + a + '"');
}

// ---------- makrot: @nimi(a,b,...) laajenee muodoiksi ----------
function f1(x) { return Math.round(x * 10) / 10; }
var MACROS = {
  // pyöreä esine varjostuksella: väri, tumma, säde, keskipiste
  orb: function (c, d, R, cx, cy) { R = +(R || 18); cx = +(cx || 32); cy = +(cy || 36);
    return "c " + cx + " " + cy + " " + R + " " + d + "; c " + f1(cx - R * 0.08) + " " + f1(cy - R * 0.08) + " " + f1(R * 0.92) + " " + c + "; e " + f1(cx - R * 0.38) + " " + f1(cy - R * 0.4) + " " + f1(R * 0.15) + " " + f1(R * 0.25) + " wh/50"; },
  fruit: function (c, d, leaf, stem) { leaf = leaf || "gn"; stem = stem || "db";
    return "p " + c + " M32 20 c-8 -6 -22 -3 -22 12 c0 14 10 24 18 24 c2 0 3 -1 4 -1 c1 0 2 1 4 1 c8 0 18 -10 18 -24 c0 -15 -14 -18 -22 -12z; p " + d + "/40 M36 56 c8 0 14 -10 14 -24 c0 -6 -2 -10 -6 -12 c3 12 -2 30 -8 36z; s " + stem + " 3 M32 21 c0 -5 1 -9 4 -12; p " + leaf + " M35 13 c4 -6 11 -6 14 -4 c-3 5 -9 7 -14 4z; e 21 30 3 5 wh/55"; },
  book: function (c, d, mark) { return "r 14 10 36 46 " + c + " 3; r 46 13 4 40 cr 1; r 14 10 8 46 " + d + " 3; r 27 20 16 4 " + (mark || "wh/70") + " 1; r 27 27 10 3 wh/50 1"; },
  star: function (c, R, cx, cy, r2) { R = +(R || 20); cx = +(cx || 32); cy = +(cy || 33); r2 = +(r2 || 0.45);
    var d = ""; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * r2 : R; d += (i ? "L" : "M") + f1(cx + Math.cos(a) * rr) + " " + f1(cy + Math.sin(a) * rr) + " "; }
    return "p " + c + " " + d + "z"; },
  spark: function (c, cx, cy, R) { R = +(R || 4); cx = +cx; cy = +cy;
    return "p " + c + " M" + cx + " " + f1(cy - R) + " Q" + cx + " " + cy + " " + f1(cx + R) + " " + cy + " Q" + cx + " " + cy + " " + cx + " " + f1(cy + R) + " Q" + cx + " " + cy + " " + f1(cx - R) + " " + cy + " Q" + cx + " " + cy + " " + cx + " " + f1(cy - R) + "z"; },
  gem: function (c, d) { return "p " + c + " M14 26 l8 -10 h20 l8 10 l-18 26z; p " + d + "/45 M32 52 l18 -26 h-12z; p wh/45 M22 16 l4 10 h-12z; p wh/30 M26 26 l6 -10 l6 10z"; },
  flower: function (p, ctr, cy) { cy = +(cy || 24); var out = "s gn 3 M32 " + (cy + 6) + " V56; p gn M32 46 c-6 -6 -14 -4 -16 0 c6 3 12 3 16 0z; p dg M32 42 c6 -6 14 -4 16 0 c-6 3 -12 3 -16 0z";
    for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; out += "; c " + f1(32 + Math.cos(a) * 9) + " " + f1(cy + Math.sin(a) * 9) + " 7 " + p; }
    return out + "; c 32 " + cy + " 6 " + ctr; },
  tree: function (lf, dl, tr) { tr = tr || "br"; return "r 29 36 6 19 " + tr + " 2; c 32 28 15 " + dl + "; c 30 25 13 " + lf + "; c 22 33 7 " + lf + "; c 41 31 8 " + lf + "; e 26 21 3 4 wh/30"; },
  mountain: function (c, d, snow) { return "p " + c + " M4 55 L26 14 L40 32 L46 24 L60 55z; p " + d + "/45 M26 14 L36 55 H60 L46 24 L40 32z; p " + (snow || "wh") + " M26 14 l6 11 l-3 -1 l-3 3 l-3 -3 l-3 1z"; },
  bldg: function (x, y, w, h, c, wc) { x = +x; y = +y; w = +w; h = +h; var out = "r " + x + " " + y + " " + w + " " + h + " " + c;
    for (var yy = y + 4; yy < y + h - 4; yy += 6) for (var xx = x + 3; xx + 2.4 <= x + w - 2; xx += 5) out += "; r " + xx + " " + yy + " 2.4 3 " + (wc || "yl");
    return out; },
  car: function (c, d, win) { win = win || "sk"; return "p " + c + " M6 40 c0 -6 3 -9 8 -10 l8 -1 l8 -9 c2 -2 4 -3 7 -3 h10 c3 0 5 1 7 4 l5 8 c5 1 9 4 9 9 v4 c0 2 -1 3 -3 3 h-48 c-2 0 -3 -1 -3 -3z; p " + d + "/45 M6 42 h52 v2 c0 2 -1 3 -3 3 h-46 c-2 0 -3 -1 -3 -3z; p " + win + " M24 29 l6 -7 h8 v7z; p " + win + " M41 22 h3 c1 0 2 1 3 2 l3 5 h-9z; c 18 47 6 bk; c 18 47 2.5 gy; c 46 47 6 bk; c 46 47 2.5 gy; r 54 35 4 3 yl 1"; },
  bus: function (c, d) { return "r 5 20 54 28 " + c + " 5; r 5 40 54 6 " + d + " 2; r 9 24 9 9 sk 1; r 20 24 9 9 sk 1; r 31 24 9 9 sk 1; r 42 24 13 9 sk 1; c 17 48 5 bk; c 47 48 5 bk; c 17 48 2 gy; c 47 48 2 gy; r 55 36 3 3 yl 1"; },
  truck: function (c, d, box) { return "r 4 18 36 28 " + (box || "wh") + " 2; r 4 40 36 4 lt; r 40 26 18 20 " + c + " 3; p sk M44 29 h8 l3 7 h-11z; r 40 42 18 4 " + d + "; c 15 47 5.5 bk; c 15 47 2 gy; c 48 47 5.5 bk; c 48 47 2 gy"; },
  boat: function (c, d, cab) { return "!p sk/70 M2 54 c8 -3 16 3 24 0 c8 -3 16 3 24 0 c4 -1 8 0 12 1 v7 h-60z; r 20 30 22 12 " + (cab || "wh") + " 3; r 23 33 5 4 sk 1; r 31 33 5 4 sk 1; p " + c + " M6 42 h52 l-7 11 h-38z; p " + d + " M9 47 h46 l-4 6 h-38z"; },
  head: function (face, dark, ear, muzzle) { muzzle = muzzle || face; var e = "";
    if (ear === "round") e = "c 18 19 7 " + face + "; c 46 19 7 " + face + "; c 18 19 3.5 " + dark;  if (ear === "round") e += "; c 46 19 3.5 " + dark;
    if (ear === "point") e = "p " + face + " M15 28 L17 7 L31 18z; p " + face + " M49 28 L47 7 L33 18z; p " + dark + " M19 23 L20 12 L27 18z; p " + dark + " M45 23 L44 12 L37 18z";
    if (ear === "floppy") e = "p " + dark + " M21 19 c-9 0 -13 9 -11 20 c1 4 6 4 8 0z; p " + dark + " M43 19 c9 0 13 9 11 20 c-1 4 -6 4 -8 0z";
    if (ear === "long") e = "e 24 11 4.5 13 " + face + "; e 40 11 4.5 13 " + face + "; e 24 12 2 10 pk; e 40 12 2 10 pk";
    if (ear === "side") e = "e 13 27 7 3.5 " + face + "; e 51 27 7 3.5 " + face;
    return (e ? e + "; " : "") + "e 32 34 18 17 " + face + "; p " + dark + "/30 M40 49 c6 -3 10 -9 10 -15 c0 -5 -2 -9 -5 -12 c2 10 -1 21 -5 27z; e 32 41 9 7 " + muzzle + "; e 32 38 3.5 2.5 bk; s bk 1.2 M32 40 v2 M28.5 43 c1.5 1 5.5 1 7 0; c 25 31 2.3 bk; c 39 31 2.3 bk; c 25.8 30.2 0.8 wh; c 39.8 30.2 0.8 wh"; },
  bird: function (c, d, beak, legs) { return "s " + (legs || "or") + " 2 M28 48 v7 M34 48 v7; p " + c + " M10 40 c4 -10 14 -14 24 -12 c6 -6 16 -6 20 2 c2 4 0 8 -4 10 c-4 12 -24 16 -36 6 c-2 -2 -4 -4 -4 -6z; p " + d + " M22 38 c6 -4 14 -4 20 2 c-6 6 -14 6 -20 -2z; p " + beak + " M54 30 l7 3 l-7 3z; c 46 30 2 bk; c 46.6 29.4 0.7 wh"; },
  bug: function (c, d, spots) { return "s bk 1.5 M22 36 l-8 -4 M22 42 l-9 2 M24 48 l-6 6 M42 36 l8 -4 M42 42 l9 2 M40 48 l6 6; e 32 42 14 13 " + c + "; s " + d + " 1.5 M32 30 v25; c 32 27 7 bk; s bk 1.2 M29 21 l-4 -7 M35 21 l4 -7" + (spots ? "; c 25 40 2.5 bk; c 39 40 2.5 bk; c 27 49 2 bk; c 37 49 2 bk" : ""); },
  fish: function (c, d, light) { return "p " + d + " M47 33 l11 -9 c-1 6 -1 12 0 18z; p " + c + " M8 34 c6 -10 18 -14 30 -10 c5 2 9 5 11 9 c-2 4 -6 7 -11 9 c-12 4 -24 0 -30 -8z; p " + (light || "wh/40") + " M12 37 c8 5 20 6 32 2 c-10 1 -22 0 -32 -2z; p " + d + " M28 25 l6 -7 l5 7z; s " + d + " 1.5 M21 27 c2 3 2 8 0 11; c 15 31 2.4 wh; c 15 31 1.2 bk"; },
  bottle: function (c, label, cap) { return "r 24 24 16 32 " + c + " 5; r 28 12 8 14 " + c + " 2; r 27 8 10 5 " + (cap || "rd") + " 1; r 24 34 16 12 " + label + " 1; r 27 26 2.5 26 wh/40 1"; },
  can: function (c, d, band) { return "r 20 16 24 38 " + c + " 3; e 32 16 12 3 lt; e 32 54 12 3 " + d + "; r 20 26 24 16 " + (band || "wh") + "; r 23 18 3 34 wh/35 1"; },
  bowl: function (c, d, food) { return "e 32 33 22 6 " + food + "; p " + c + " M10 33 h44 c0 12 -10 21 -22 21 c-12 0 -22 -9 -22 -21z; p " + d + "/45 M40 53 c8 -3 14 -11 14 -20 h-5 c0 9 -4 16 -9 20z; r 26 53 12 3 " + d + " 1"; },
  plate: function (food) { return "e 32 46 25 8 lt; e 32 45 20 6 wh"; },
  mug: function (c, d) { return "o 47 34 6 " + c + " 4; p " + c + " M14 22 h32 v18 c0 8 -6 14 -14 14 h-4 c-8 0 -14 -6 -14 -14z; p " + d + "/40 M36 54 c6 -1 10 -7 10 -14 v-18 h-4 v18 c0 7 -2 12 -6 14z; e 30 22 16 3 db"; },
  shirt: function (c, d) { return "p " + c + " M22 12 l-14 8 l5 12 l7 -3 v26 h24 v-26 l7 3 l5 -12 l-14 -8 c-2 4 -6 6 -10 6 c-4 0 -8 -2 -10 -6z; p " + d + "/40 M36 55 h8 v-26 l7 3 l2 -4 l-9 -2z; p " + d + " M26 13 c2 3 4 4 6 4 c2 0 4 -1 6 -4 c-2 1 -4 1 -6 1 c-2 0 -4 0 -6 -1z"; },
  shoe: function (c, d, sole) { return "p " + c + " M8 46 c0 -4 2 -8 4 -10 l6 -14 h12 l2 8 c6 2 14 4 20 6 c4 1 6 4 6 8 v2 h-50z; p " + (sole || "wh") + " M8 46 h50 v4 c0 2 -1 3 -3 3 h-44 c-2 0 -3 -1 -3 -3z; s " + d + " 2 M24 26 l6 2 M23 30 l7 2 M22 34 l8 2"; },
  box: function (c, d, t) { return "p " + (t || c) + " M10 22 L32 12 L54 22 L32 32z; p " + c + " M10 22 L32 32 V56 L10 46z; p " + d + " M54 22 L32 32 V56 L54 46z"; },
  planet: function (c, d, ring) { var o = "!@orb(" + c + "," + d + ",18,32,32)"; return ring ? "!e 32 32 28 8 " + ring + "/80; " + o.slice(1) + "; p " + ring + " M6 31 c2 4 14 8 26 8 c12 0 24 -4 26 -8 c0 3 -12 9 -26 9 c-14 0 -26 -6 -26 -9z" : o; },
  card: function (c, d) { return "r 16 10 32 44 " + c + " 4; o 32 32 10 " + d + " 2"; },
  house: function (wall, roof, trim) { trim = trim || "wh"; return "r 14 30 36 24 " + wall + "; p " + roof + " M8 32 L32 12 L56 32z; p bk/20 M8 32 L32 12 L32 16 L12 33z; r 14 30 3 24 " + trim + "; r 47 30 3 24 " + trim + "; r 28 40 8 14 br 1; r 19 37 7 7 sk 1; r 39 37 7 7 sk 1"; },
  cloud: function (c, o) { o = o || "#b9c3cb"; return "c 22 34 11 " + o + "; c 36 28 14 " + o + "; c 47 36 10 " + o + "; r 11 35 46 14 " + o + " 7; c 22 34 9.6 " + c + "; c 36 28 12.6 " + c + "; c 47 36 8.6 " + c + "; r 12.4 36 43.2 11.6 " + c + " 5.8"; },
  train: function (c, d, stripe) { return "s dk 1.5 M0 53 H64; r 4 16 56 30 " + c + " 6; r 4 34 56 4 " + (stripe || d) + "; r 8 20 9 10 sk 1; r 20 20 9 10 sk 1; r 32 20 9 10 sk 1; r 44 20 12 10 sk 1; r 4 42 56 4 " + d + " 2; c 14 49 4 dk; c 22 49 4 dk; c 42 49 4 dk; c 50 49 4 dk"; },
  water: function () { return "!p sk/70 M2 52 c8 -3 16 3 24 0 c8 -3 16 3 24 0 c4 -1 8 0 12 1 v7 h-60z"; },
  moon: function (c, cx, cy, R, bg) { return "c " + cx + " " + cy + " " + R + " " + c + "; c " + f1(+cx + R * 0.45) + " " + f1(+cy - R * 0.25) + " " + f1(R * 0.85) + " " + bg; },
  bag: function (c, d) { return "o 32 22 8 " + d + " 3; p " + c + " M12 26 h40 l-3 28 h-34z; p " + d + "/40 M42 26 h10 l-3 28 h-10z"; }
};
var SOURCES = {};
MACROS.use = function (id) { if (!SOURCES[id]) throw new Error("use: tuntematon " + id); return SOURCES[id].trim(); };
function loadDir(fs, dir) {
  fs.readdirSync(dir).filter(function (f) { return /\.txt$/.test(f); }).sort().forEach(function (f) {
    fs.readFileSync(dir + "/" + f, "utf8").split("\n").forEach(function (l) {
      if (!l.trim() || l.charAt(0) === "#") return; var i = l.indexOf("|"); SOURCES[l.slice(0, i).trim()] = l.slice(i + 1);
    });
  });
  return SOURCES;
}
function expand(src) {
  for (var k = 0; k < 8 && src.indexOf("@") >= 0; k++)
    src = src.replace(/@(\w+)\(([^)]*)\)/g, function (m, n, args) {
      if (!MACROS[n]) throw new Error("Tuntematon makro " + n);
      return MACROS[n].apply(null, args.split(",").map(function (x) { return x.trim(); }));
    });
  return src;
}

function draw(src) {
  var shadow = true;
  src = expand(src.trim());
  src = src.replace(/;\s*!/g, '; ');
  if (src.charAt(0) === "!") { shadow = false; src = src.slice(1); }
  var out = shadow ? '<ellipse cx="32" cy="57" rx="19" ry="3.2" fill="#000" fill-opacity=".1"/>' : "";
  src.split(";").forEach(function (part) {
    part = part.trim(); if (!part) return;
    var a = part.split(/\s+/), k = a[0];
    if (k === "c") out += '<circle cx="' + a[1] + '" cy="' + a[2] + '" r="' + a[3] + '" ' + col(a[4]) + "/>";
    else if (k === "e") out += '<ellipse cx="' + a[1] + '" cy="' + a[2] + '" rx="' + a[3] + '" ry="' + a[4] + '" ' + col(a[5]) + "/>";
    else if (k === "r") out += '<rect x="' + a[1] + '" y="' + a[2] + '" width="' + a[3] + '" height="' + a[4] + '" ' + col(a[5]) + (a[6] ? ' rx="' + a[6] + '"' : "") + "/>";
    else if (k === "p") out += '<path d="' + a.slice(2).join(" ") + '" ' + col(a[1]) + "/>";
    else if (k === "s") out += '<path d="' + a.slice(3).join(" ") + '" ' + stroke(a[1], a[2]) + "/>";
    else if (k === "sd") out += '<path d="' + a.slice(4).join(" ") + '" ' + stroke(a[1], a[2]) + ' stroke-dasharray="' + a[3] + '"/>';
    else if (k === "o") out += '<circle cx="' + a[1] + '" cy="' + a[2] + '" r="' + a[3] + '" ' + stroke(a[4], a[5]) + "/>";
    else if (k === "g") out += '<g transform="rotate(' + a[1] + " " + a[2] + " " + a[3] + ')">';
    else if (k === "t") out += '<g transform="translate(' + a[1] + " " + a[2] + ")" + (a[3] ? " scale(" + a[3] + ")" : "") + '">';
    else if (k === "q") { var st = stroke(a[2], a[3]).replace(/^fill="none" /, ""); out += '<path d="' + a.slice(4).join(" ") + '" ' + col(a[1]) + " " + st + "/>"; }
    else if (k === "/g") out += "</g>";
    else throw new Error("Tuntematon komento: " + part);
  });
  return out;
}
if (typeof module !== "undefined") module.exports = { draw: draw, PAL: PAL, expand: expand, loadDir: loadDir, SOURCES: SOURCES };
