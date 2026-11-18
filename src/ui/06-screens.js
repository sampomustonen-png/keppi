// ---------- aloitus, uusi peli, jatkaminen ja loppu ----------
var MODE_INFO = {
  vuosi: "365 päivää. Avaa vaikeammat vuodet omistamalla kaikki.",
  pika: "100 päivää ja nopeampi tahti. Sopii lyhyeen peli­hetkeen.",
  paiva: "Sama 100 päivän vuosi kaikille tänään. Vertaa tulosta kavereihin ja pidä putki yllä."
};
function newRun(mode) {
  mode = typeof mode === "string" ? mode : (s && s.mode) || store.mode || "vuosi";
  var today = dateStr(), seed = mode === "paiva" ? dailySeed(today) : null;
  s = E.newGame(seed, store.level || 1, { mode: mode, fam: famMap() }).s;
  if (mode === "paiva") s.date = today;
  s.ui = { top: 0, newIds: [], arm: null };
  store.mode = mode;
  syncBook();
  ["startSheet", "endSheet", "menuSheet", "seasonSheet", "challengeSheet", "transferSheet"].forEach(function (id) { sheet(id, false); });
  $("notes").innerHTML = "";
  queue = []; modal = false; busy = false;
  render("enter");
  persist();
}
function resume(save) {
  s = E.migrate(save);
  if (!s.ui) s.ui = { top: D.tierOf(E.maxValue(s)), newIds: [], arm: null };
  E.setFam(s, famMap());
  store.mode = s.mode;
  sheet("startSheet", false);
  render("enter");
}
function levelInfo(L) {
  var lv = E.LEVELS[L];
  return "<b>" + lv.name + "</b> · " + lv.days + " päivää · ruoka pilaantuu " + lv.spoil + " päivässä · " + (lv.forecast ? "ennuste näkyy" : "ei ennustetta") +
    (store.best[L] ? " · ennätys " + store.best[L] + " päivää" : "");
}
function validSave(m) {
  var sv = store.saves[m];
  if (!sv || sv.over) return null;
  if (m === "paiva" && sv.date !== dateStr()) return null;
  return sv;
}
function showStart() {
  applyTier(0);
  var m = store.mode, today = dateStr(), res = store.daily.results[today];
  $("modeSeg").innerHTML = MODE_IDS.map(function (id) { return '<button data-mode="' + id + '" class="' + (id === m ? "on" : "") + '" aria-pressed="' + (id === m) + '">' + E.MODES[id] + "</button>"; }).join("");
  var info = MODE_INFO[m];
  if (m === "vuosi" && (store.unlocked || 1) > 1) info = (store.unlocked || 1) >= 5 ? "Valitse vaikeustaso. Vaikeammissa vuosissa on vähemmän päiviä ja tiukemmat kaupat." : "Avaa vaikeammat vuodet omistamalla kaikki.";
  var lb = '<p class="mode-info">' + info + "</p>";
  if (m === "vuosi") {
    if ((store.unlocked || 1) > 1) {
      lb += '<div class="levels" role="radiogroup" aria-label="Vaikeustaso">';
      for (var L = 1; L <= 5; L++) {
        var open = L <= store.unlocked;
        lb += '<button role="radio" aria-checked="' + (L === store.level) + '" data-level="' + L + '" class="' + (L === store.level ? "on" : "") + '"' + (open ? "" : " disabled") + ">" + L + "<small>" + (open ? (store.best[L] ? store.best[L] + " pv" : "taso") : "lukittu") + "</small></button>";
      }
      lb += '</div><p class="level-info" id="levelInfo">' + levelInfo(store.level) + "</p>";
    }
  } else if (m === "pika") {
    lb += '<p class="level-info">' + (store.best.pika ? "Ennätys: kaikki " + store.best.pika + " päivässä." : "Ei vielä ennätystä.") + "</p>";
  } else {
    var st = store.daily;
    lb += '<p class="level-info"><b>' + dateFi(today) + "</b>" + (res ? " · tänään: " + (res.won ? "kaikki " + res.day + " päivässä" : "porras " + res.tier + " / 19") : "") +
      " · putki " + (st.last === today || st.last === prevDate(today) ? st.streak : 0) + " " + plural(st.streak, "päivä", "päivää") + (st.bestStreak ? " (paras " + st.bestStreak + ")" : "") + "</p>";
  }
  $("levelBox").innerHTML = lb;
  var sv = validSave(m), b = "";
  if (sv) {
    b += '<button class="pill main" id="btnResume">Jatka<small>päivä ' + sv.day + " / " + sv.days + "</small></button>";
    b += '<button class="pill" id="btnNew">' + (m === "paiva" ? "Aloita alusta" : "Uusi peli") + "</button>";
  } else b += '<button class="pill main" id="btnNew">' + (m === "paiva" && res ? "Pelaa uudelleen<small>tulos on jo tallessa</small>" : "Aloita" + (m === "vuosi" && store.level > 1 ? "<small>taso " + store.level + "</small>" : "")) + "</button>";
  b += '<div class="btn-row"><button class="pill" id="btnBook2">Löydöt<small>' + store.book.length + " / " + TOTAL + '</small></button><button class="pill" id="btnCh2">Haasteet<small>' + Object.keys(store.ach).length + " / " + CHALLENGES.length + "</small></button></div>";
  $("startBtns").innerHTML = b;
  var fine = "Peli tallentuu tähän selaimeen. Valikosta voit siirtää sen toiseen laitteeseen.";
  if (store.runs) fine = "Pelattuja vuosia " + store.runs + (store.wins ? ", kaiken omistit " + store.wins + " kertaa" : "") + ". " + fine;
  $("startFine").textContent = fine;
  $("rulesBox").open = !store.runs;
  sheet("startSheet", true);
  if ($("btnResume")) $("btnResume").onclick = function () { resume(sv); };
  $("btnNew").onclick = function () { newRun(m); };
  $("btnBook2").onclick = showBook;
  $("btnCh2").onclick = showChallenges;
}

function recordDaily(sm) {
  var d = store.daily, ds = s.date;
  if (!ds || d.results[ds]) return false;
  d.results[ds] = { won: s.won, day: s.day, tier: sm.tier + 1, trades: s.trades };
  if (d.last === ds) {} else if (d.last && d.last === prevDate(ds)) d.streak = (d.streak || 0) + 1; else d.streak = 1;
  d.last = ds; d.bestStreak = Math.max(d.bestStreak || 0, d.streak);
  return true;
}
function showEnd() {
  var sm = E.summary(s), own = sm.own, L = s.level || 1, extra = "";
  store.runs++;
  if (s.mode === "paiva" && recordDaily(sm)) extra += '<p class="unlock">Päivän tulos tallennettu · putki ' + store.daily.streak + " " + plural(store.daily.streak, "päivä", "päivää") + ".</p>";
  if (s.won) {
    store.wins++;
    if (s.mode === "vuosi") {
      if (!store.best[L] || s.day < store.best[L]) { store.best[L] = s.day; extra += '<p class="unlock">Uusi ennätys tasolla ' + L + ".</p>"; }
      if (L === (store.unlocked || 1) && L < 5) { store.unlocked = L + 1; store.level = L + 1; extra += '<p class="unlock">Avasit tason ' + (L + 1) + ": " + esc(E.LEVELS[L + 1].name) + ".</p>"; }
    } else if (s.mode === "pika" && (!store.best.pika || s.day < store.best.pika)) { store.best.pika = s.day; extra += '<p class="unlock">Uusi pikavuoden ennätys.</p>'; }
  }
  checkFams(true);
  var ach = checkChallenges(true, s.won);
  if (ach.length) extra += '<div class="ach-new">' + ach.map(function (c) { return "<span>✓ " + esc(c.name) + "</span>"; }).join("") + "</div>";
  var html = "<h2>" + (s.won ? "Omistat kaiken." : (s.mode === "vuosi" ? "Vuosi" : s.mode === "paiva" ? "Päivän vuosi" : "Pikavuosi") + " on kulunut.") + "</h2>" +
    '<p class="sub">' + esc(modeName(s)) + ". " + (s.won ? "Kepistä kaikkeen " + s.day + " päivässä." : "Aloitit kepillä. Nyt sinulla on tämä.") + "</p>" + extra +
    '<div class="hero"><div class="plate">' + itemIc(own) + '</div><span class="nm">' + esc(E.name(own)) + '</span><span class="vl">' + fmt(own.v, own.id) + "</span></div>" +
    '<p class="title">Arvonimi: <b>' + esc(sm.title) + "</b></p>" +
    '<div class="stats"><div class="stat"><small>Vaihtoja</small><b>' + s.trades + '</b></div><div class="stat"><small>Porras</small><b>' + (sm.tier + 1) + ' / 19</b></div><div class="stat"><small>Uusia löytöjä</small><b>' + s.ui.newIds.length + "</b></div></div>" +
    '<div class="chain">' + s.chain.map(function (c) { return c.map(function (id) { return '<span class="ic" style="display:inline-block;width:1em;vertical-align:-3px">' + icoOf(D.BY_ID[id]) + "</span>"; }).join(""); }).join("<i>›</i>") + "</div>" +
    '<div class="btns"><button class="pill main" id="btnShare">Jaa tulos kuvana</button><button class="pill" id="btnCopy">Kopioi tulos tekstinä</button>' +
    (s.mode !== "paiva" ? '<button class="pill" id="btnAgain">' + (s.mode === "pika" ? "Uusi pikavuosi" : "Uusi vuosi" + (store.level > 1 ? "<small>taso " + store.level + "</small>" : "")) + "</button>" : "") +
    '<div class="btn-row"><button class="pill" id="btnBook3">Löydöt</button><button class="pill" id="btnHome">Alkuun</button></div></div>';
  $("endBody").innerHTML = html;
  if (s.won) applyTier(18);
  sheet("seasonSheet", false); queue = []; modal = false; $("moment").classList.remove("show");
  sheet("endSheet", true);
  $("endSheet").scrollTop = 0;
  if (s.won) { SFX.tier(); burst(140); }
  var ended = s;
  if ($("btnAgain")) $("btnAgain").onclick = function () { newRun(ended.mode); };
  $("btnBook3").onclick = showBook;
  $("btnHome").onclick = function () { sheet("endSheet", false); s = null; showStart(); };
  $("btnCopy").onclick = function () { copyText(this, shareText(ended)); };
  $("btnShare").onclick = function () { shareImage(this, ended); };
  persist();
  store.saves[ended.mode] = null;
  persist();
}
