// Kepistä kaikkeen – pelin sisältö
// Esineet tulevat tiedostosta items.txt (nimi|emoji|arvo|tagit|oma kuvaefekti).
var DATA = (function () {
  var TXT = (typeof ITEMS_TXT !== "undefined") ? ITEMS_TXT : require("fs").readFileSync(__dirname + "/items.txt", "utf8");
  var FAM_TXT = (typeof FAMILIES_TXT !== "undefined") ? FAMILIES_TXT : require("fs").readFileSync(__dirname + "/families.txt", "utf8");

  // Portaat: alaraja €, nimi, arvonimi, taustasävy, tumma pohja?
  var TIERS = [
    { min: 0, name: "Maasta löydetyt", title: "Kepinkantaja", bg: "#ece5d6" },
    { min: 0.5, name: "Pikkutavarat", title: "Taskunpohjien tyhjentäjä", bg: "#ebe5cf" },
    { min: 3, name: "Arkiesineet", title: "Kirpputorikauppias", bg: "#e6e6cd" },
    { min: 15, name: "Lelut ja työkalut", title: "Torikauppias", bg: "#dfe6d0" },
    { min: 80, name: "Harrastukset", title: "Harrastaja", bg: "#d7e5d5" },
    { min: 400, name: "Isot hankinnat", title: "Hankkija", bg: "#d2e4dc" },
    { min: 2000, name: "Menopelit ja eläimet", title: "Menijä", bg: "#cfe2e2" },
    { min: 10000, name: "Autot", title: "Autoilija", bg: "#d0dde8" },
    { min: 60000, name: "Veneet ja mökit", title: "Mökkeilijä", bg: "#d4d9ec" },
    { min: 300000, name: "Talot", title: "Talonomistaja", bg: "#dad6ec" },
    { min: 2e6, name: "Linnat ja kartanot", title: "Kartanonherra", bg: "#e1d4e9" },
    { min: 2e7, name: "Yritykset", title: "Suurpomo", bg: "#e8d3e0" },
    { min: 3e8, name: "Saaret ja vuoret", title: "Saaren omistaja", bg: "#d8cde0" },
    { min: 5e9, name: "Kaupungit", title: "Pormestari", bg: "#c4c3dc" },
    { min: 2e11, name: "Valtiot", title: "Valtionpäämies", bg: "#aeb0d2", },
    { min: 2e13, name: "Taivaankappaleet", title: "Planeettojen omistaja", bg: "#474d78", dark: true },
    { min: 8e14, name: "Tähdet", title: "Tähtien omistaja", bg: "#2f3159", dark: true },
    { min: 7e15, name: "Galaksit", title: "Galaksien valtias", bg: "#1e1c40", dark: true },
    { min: 1e17, name: "Kaikki", title: "Kaiken omistaja", bg: "#100e25", dark: true }
  ];

  var TAGS = {
    "luonto": "Luonto", "puu": "Puu", "ruoka": "Ruoka", "herkku": "Herkut", "juoma": "Juomat",
    "lelu": "Lelut", "urheilu": "Urheilu", "vaate": "Vaatteet", "käsityö": "Käsityöt", "koti": "Kodin tavarat",
    "työkalu": "Työkalut", "metalli": "Metalli", "tekniikka": "Tekniikka", "musiikki": "Musiikki", "taide": "Taide",
    "kirja": "Kirjat ja paperit", "eläin": "Eläimet", "vesi": "Vesi", "kulkuneuvo": "Kulkuneuvot", "kiinteistö": "Kiinteistöt",
    "yritys": "Yritykset", "avaruus": "Avaruus", "valta": "Valta", "taika": "Taika", "ulkoilu": "Ulkoilu",
    "tiede": "Tiede", "koru": "Korut", "juhla": "Juhlat", "raha": "Raha", "maatila": "Maatila",
    "kulta": "Kulta", "antiikki": "Antiikki", "kirottu": "Kirotut", "julkkis": "Nimikirjoitukset",
    "harvinainen": "Harvinaisuudet", "kuninkaallinen": "Kuninkaallinen"
  };

  // Kuvaefektit: hillitty värisävy (CSS-suodin) ja koko. Piirretyt yksityiskohdat ovat tiedostossa art/mods.txt.
  var LOOKS = {
    gold: { f: "sepia(1) saturate(3.2) hue-rotate(-8deg) brightness(1.05)" },
    silver: { f: "grayscale(1) brightness(1.12) contrast(1.1)" },
    worn: { f: "saturate(.6) contrast(.92)" },
    fresh: {},
    rust: { f: "sepia(.55) saturate(1.4) hue-rotate(-15deg) brightness(.88)" },
    shiny: {},
    antique: { f: "sepia(.75) contrast(.95)" },
    signed: {},
    rare: {},
    handmade: {},
    rot: { f: "sepia(.4) brightness(.82) saturate(.8)" },
    cursed: { f: "saturate(.75) brightness(.85)" },
    giant: { s: 1.3 },
    tiny: { s: 0.6 },
    ghost: { f: "grayscale(.6) brightness(1.1) opacity(.6)" },
    royal: {},
    diamond: {},
    legend: {},
    black: { f: "brightness(.38) contrast(1.25) saturate(.6)" },
    faded: { f: "grayscale(.6) brightness(1.25) contrast(.75)" },
    neon: { f: "saturate(2) brightness(1.08)" },
    crystal: { f: "hue-rotate(180deg) saturate(1.4) brightness(1.18) opacity(.85)" },
    frozen: { f: "hue-rotate(170deg) saturate(.5) brightness(1.15)" },
    burnt: { f: "brightness(.5) sepia(.5) contrast(1.15)" },
    cosmic: {},
    spoiled: { f: "hue-rotate(60deg) saturate(.55) brightness(.85)" }
  };

  var OBJ = "lelu vaate koti kirja urheilu kulkuneuvo musiikki työkalu tekniikka";
  var MODS = [
    { id: "kulunut", name: "Kulunut", pl: "Kuluneet", mult: 0.7, add: [], on: OBJ, w: 1.3, look: "worn" },
    { id: "uusi", name: "Uudenveroinen", pl: "Uudenveroiset", mult: 1.35, add: [], on: OBJ, w: 1.3, look: "fresh" },
    { id: "ruosteinen", name: "Ruosteinen", pl: "Ruosteiset", mult: 0.5, add: [], on: "metalli kulkuneuvo työkalu", w: 0.9, look: "rust" },
    { id: "kiiltava", name: "Kiiltävä", pl: "Kiiltävät", mult: 1.25, add: [], on: "metalli koru kulkuneuvo", w: 0.9, look: "shiny" },
    { id: "kultainen", name: "Kultainen", pl: "Kultaiset", mult: 4, add: ["kulta"], on: "*", maxT: 9, w: 0.55, look: "gold" },
    { id: "hopeinen", name: "Hopeinen", pl: "Hopeiset", mult: 2, add: [], on: "metalli koru lelu koti työkalu kulkuneuvo musiikki urheilu", maxT: 10, w: 0.6, look: "silver" },
    { id: "antiikkinen", name: "Antiikkinen", pl: "Antiikkiset", mult: 2.5, add: ["antiikki"], on: "koti musiikki työkalu kirja taide koru kulkuneuvo metalli lelu", w: 0.8, look: "antique" },
    { id: "signeerattu", name: "Signeerattu", pl: "Signeeratut", mult: 3, add: ["julkkis"], on: "kirja musiikki urheilu lelu taide vaate", w: 0.6, look: "signed" },
    { id: "harvinainen", name: "Harvinainen", pl: "Harvinaiset", mult: 2, add: ["harvinainen"], on: "*", w: 0.7, look: "rare" },
    { id: "kasintehty", name: "Käsintehty", pl: "Käsintehdyt", mult: 1.6, add: ["käsityö"], on: "lelu vaate koti herkku musiikki puu käsityö", w: 0.9, look: "handmade" },
    { id: "lahonnut", name: "Lahonnut", pl: "Lahonneet", mult: 0.5, add: [], on: "puu", w: 0.8, look: "rot" },
    { id: "kirottu", name: "Kirottu", pl: "Kirotut", mult: 0.45, add: ["kirottu"], on: "*", maxT: 15, w: 0.45, look: "cursed" },
    { id: "jattimainen", name: "Jättimäinen", pl: "Jättimäiset", mult: 2.2, add: [], on: "*", maxT: 6, w: 0.6, look: "giant" },
    { id: "pikkuruinen", name: "Pikkuruinen", pl: "Pikkuruiset", mult: 0.55, add: [], on: "*", w: 0.7, look: "tiny" },
    { id: "kummitteleva", name: "Kummitteleva", pl: "Kummittelevat", mult: 0.75, add: ["kirottu"], on: "kiinteistö koti antiikki", w: 0.7, look: "ghost" },
    { id: "kuninkaallinen", name: "Kuninkaallinen", pl: "Kuninkaalliset", mult: 3, add: ["kuninkaallinen"], on: "*", minT: 5, w: 0.45, look: "royal" },
    { id: "timanttinen", name: "Timanttinen", pl: "Timanttiset", mult: 5, add: ["koru", "harvinainen"], on: "koru kulkuneuvo lelu koti", maxT: 12, w: 0.3, look: "diamond" },
    { id: "legendaarinen", name: "Legendaarinen", pl: "Legendaariset", mult: 6, add: ["harvinainen", "antiikki"], on: "*", w: 0.15, look: "legend" },
    { id: "musta", name: "Musta", pl: "Mustat", mult: 1.1, add: [], on: "vaate kulkuneuvo tekniikka koti lelu musiikki metalli", w: 0.6, look: "black" },
    { id: "haalistunut", name: "Haalistunut", pl: "Haalistuneet", mult: 0.7, add: [], on: "vaate taide kirja lelu koti", w: 0.7, look: "faded" },
    { id: "neon", name: "Neonvärinen", pl: "Neonväriset", mult: 1.2, add: [], on: "lelu vaate kulkuneuvo tekniikka urheilu herkku", w: 0.6, look: "neon" },
    { id: "kristallinen", name: "Kristallinen", pl: "Kristalliset", mult: 3.5, add: ["harvinainen"], on: "koti koru lelu taika musiikki taide", maxT: 12, w: 0.35, look: "crystal" },
    { id: "jaatynyt", name: "Jäätynyt", pl: "Jäätyneet", mult: 0.8, add: [], on: "ruoka vesi luonto herkku juoma", w: 0.6, look: "frozen" },
    { id: "palanut", name: "Palanut", pl: "Palaneet", mult: 0.4, add: [], on: "puu ruoka kirja vaate koti herkku", w: 0.5, look: "burnt" },
    { id: "kosminen", name: "Kosminen", pl: "Kosmiset", mult: 2.5, add: ["avaruus"], on: "*", minT: 12, w: 0.5, look: "cosmic" }
  ];
  var SPECIAL_MODS = {
    pilaantunut: { id: "pilaantunut", name: "Pilaantunut", pl: "Pilaantuneet", mult: 0.15, add: [], look: "spoiled" }
  };

  function tierOf(v) {
    for (var i = TIERS.length - 1; i >= 0; i--) if (v >= TIERS[i].min * 0.999) return i;
    return 0;
  }
  function slug(s) {
    return s.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/å/g, "a").replace(/ñ/g, "n").replace(/[^a-z0-9]+/g, "-");
  }

  var ITEMS = [];
  TXT.split("\n").forEach(function (ln) {
    ln = ln.trim();
    if (!ln || ln.charAt(0) === "#") return;
    var p = ln.split("|");
    var tags = p[3].split(" ");
    var pl = tags.indexOf("pl") >= 0;
    tags = tags.filter(function (t) { return t !== "pl"; });
    var v = parseFloat(p[2]);
    ITEMS.push({ id: slug(p[0]), name: p[0], e: p[1], v: v, tags: tags, pl: pl, look: p[4] || null, tier: tierOf(v) });
  });
  ITEMS.sort(function (a, b) { return a.v - b.v; });
  ITEMS.forEach(function (it, i) { it.idx = i; });
  var BY_ID = {};
  ITEMS.forEach(function (it) { BY_ID[it.id] = it; });
  MODS.forEach(function (m) { m.onList = m.on === "*" ? null : m.on.split(" "); });

  // Kokoelmat (families.txt): täysi kokoelma antaa pysyvän edun sen tavaroiden vaihtoihin
  var FAMILIES = [], FAM_OF = {}, FAM_ERRORS = [];
  FAM_TXT.split("\n").forEach(function (ln) {
    ln = ln.trim();
    if (!ln || ln.charAt(0) === "#") return;
    var p = ln.split("|"), f = { id: slug(p[0]), name: p[0], items: [] };
    p[1].trim().split(/\s+/).forEach(function (id) {
      if (!BY_ID[id]) { FAM_ERRORS.push(f.name + ": " + id); return; }
      if (FAM_OF[id]) { FAM_ERRORS.push(f.name + ": " + id + " on jo kokoelmassa " + FAM_OF[id]); return; }
      FAM_OF[id] = f.id; f.items.push(id);
    });
    f.items.sort(function (a, b) { return BY_ID[a].v - BY_ID[b].v; });
    FAMILIES.push(f);
  });
  var FAM_BY_ID = {};
  FAMILIES.forEach(function (f) { FAM_BY_ID[f.id] = f; });

  return { ITEMS: ITEMS, BY_ID: BY_ID, TIERS: TIERS, TAGS: TAGS, LOOKS: LOOKS, MODS: MODS, SPECIAL_MODS: SPECIAL_MODS, tierOf: tierOf,
    FAMILIES: FAMILIES, FAM_OF: FAM_OF, FAM_BY_ID: FAM_BY_ID, FAM_ERRORS: FAM_ERRORS };
})();
if (typeof module !== "undefined") module.exports = DATA;
