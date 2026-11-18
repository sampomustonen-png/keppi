// ---------- löydöt, kokoelmat ja haasteet ----------
function showBook() {
  $("bookCnt").textContent = store.book.length + " / " + TOTAL + " tavaraa löydetty · kokoelmia " + store.fams.length + " / " + D.FAMILIES.length + " valmiina.";
  ["abc", "val", "fam"].forEach(function (m) { $("sort-" + m).classList.toggle("on", bookMode === m); });
  var items = store.book.map(function (id) { return D.BY_ID[id]; }).filter(Boolean);
  var html = "";
  if (bookMode === "fam") html = famHTML();
  else if (!items.length) html = '<p class="empty">Et ole vielä löytänyt mitään.</p>';
  else if (bookMode === "abc") {
    items.sort(function (a, b) { var x = fiKey(a.name), y = fiKey(b.name); return x < y ? -1 : x > y ? 1 : 0; });
    var cur = "";
    items.forEach(function (it) {
      var L = it.name.charAt(0).toUpperCase().replace("Ñ", "N");
      if (L !== cur) { cur = L; html += "<h3><span>" + esc(L) + "</span></h3>"; }
      html += rowHTML(it);
    });
  } else {
    items.sort(function (a, b) { return a.v - b.v; });
    var ct = -1;
    items.forEach(function (it) {
      if (it.tier !== ct) {
        ct = it.tier;
        var n = items.filter(function (x) { return x.tier === ct; }).length, all = D.ITEMS.filter(function (x) { return x.tier === ct; }).length;
        html += "<h3><span>" + (ct + 1) + ". " + esc(D.TIERS[ct].name) + "</span><span>" + n + " / " + all + "</span></h3>";
      }
      html += rowHTML(it);
    });
  }
  $("bookBody").innerHTML = html;
  sheet("bookSheet", true);
  $("bookSheet").scrollTop = 0;
}
function rowHTML(it) {
  var nw = s && s.ui && s.ui.newIds.indexOf(it.id) >= 0;
  return '<div class="row' + (nw ? " new" : "") + '">' + baseIc(it) + '<span class="nm">' + esc(it.name) + '</span><span class="vl">' + fmt(it.v, it.id) + "</span></div>";
}
function famHTML() {
  var list = D.FAMILIES.slice().sort(function (a, b) {
    var da = store.fams.indexOf(a.id) >= 0, db = store.fams.indexOf(b.id) >= 0;
    if (da !== db) return da ? -1 : 1;
    return famCount(b.id) / b.items.length - famCount(a.id) / a.items.length;
  });
  return '<p class="fam-help">Löydä kokoelman kaikki tavarat, niin niistä saa pysyvästi ' + Math.round((E.CFG.famBonus - 1) * 100) + NBSP + "% parempia tarjouksia. Tasoilla 4–5 etu on " + Math.round((E.LEVELS[5].famBonus - 1) * 100) + NBSP + "%, päivän vuodessa sitä ei ole.</p>" +
    list.map(function (f) {
      var n = famCount(f.id), done = store.fams.indexOf(f.id) >= 0;
      return '<div class="fam' + (done ? " done" : "") + '"><div class="fam-h"><span class="nm">' + esc(f.name) + '</span><span class="vl">' + (done ? "Valmis · etu käytössä" : n + " / " + f.items.length) + '</span></div><div class="fam-i">' +
        f.items.map(function (id) { var it = D.BY_ID[id]; return known[id] ? '<span class="fi" title="' + esc(it.name) + '">' + icoOf(it) + "</span>" : '<span class="fi q" aria-label="Löytämättä">?</span>'; }).join("") + "</div></div>";
    }).join("");
}

// ---------- haasteet ----------
// tarkistetaan vaihtojen jälkeen (kesken vuoden) ja vuoden lopussa (end = true)
var CHALLENGES = [
  { id: "kaikki", name: "Kaiken omistaja", desc: "Omista kaikki missä tahansa pelimuodossa.", end: function (x) { return x.won; } },
  { id: "ilman-paketteja", name: "Ilman arpaonnea", desc: "Omista kaikki avaamatta yhtään pakettia.", end: function (x) { return x.won && x.s.st.pkg === 0; } },
  { id: "ilman-reppua", name: "Yksin eteenpäin", desc: "Omista kaikki ottamatta mitään esiin repusta.", end: function (x) { return x.won && x.s.st.swaps === 0 && x.s.st.merges === 0; } },
  { id: "kaksisataa", name: "Kaksisataa päivää", desc: "Omista kaikki vuodessa alle 200 päivässä.", end: function (x) { return x.won && x.s.mode === "vuosi" && x.s.day < 200; } },
  { id: "salama", name: "Salamavuosi", desc: "Omista kaikki pikavuodessa tai päivän vuodessa alle 75 päivässä.", end: function (x) { return x.won && x.s.mode !== "vuosi" && x.s.day < 75; } },
  { id: "taso4", name: "Kova vuosi selätetty", desc: "Omista kaikki tasolla 4.", end: function (x) { return x.won && x.s.mode === "vuosi" && x.s.level >= 4; } },
  { id: "taso5", name: "Mahdoton mahdolliseksi", desc: "Omista kaikki tasolla 5.", end: function (x) { return x.won && x.s.mode === "vuosi" && x.s.level >= 5; } },
  { id: "jattiloikka", name: "Jättiloikka", desc: "Tee vaihto, jossa arvo vähintään viisinkertaistuu.", now: function (x) { return x.s.st.maxR >= 5; } },
  { id: "onnenpaketti", name: "Onnenpaketti", desc: "Avaa paketti, joka vähintään tuplaa arvon.", now: function (x) { return x.s.st.pkgBest >= 2; } },
  { id: "kysynta", name: "Kysynnän aalto", desc: "Vaihda kysyttyä tavaraa 15 kertaa saman vuoden aikana.", now: function (x) { return x.s.st.hot >= 15; } },
  { id: "yhdistaja", name: "Kaksi yhteen", desc: "Yhdistä käden ja repun tavara 5 kertaa saman vuoden aikana.", now: function (x) { return x.s.st.merges >= 5; } },
  { id: "keraily", name: "Keräilijä", desc: "Täydennä 5 kokoelmaa.", now: function () { return store.fams.length >= 5; } },
  { id: "loydot", name: "Löytöretkeilijä", desc: "Löydä 500 eri tavaraa.", now: function () { return store.book.length >= 500; } },
  { id: "putki", name: "Viikon putki", desc: "Pelaa päivän vuosi seitsemänä päivänä peräkkäin.", now: function () { return (store.daily.bestStreak || 0) >= 7; } }
];
function checkChallenges(end, won) {
  var got = [];
  CHALLENGES.forEach(function (c) {
    if (store.ach[c.id]) return;
    var x = { s: s, won: !!won };
    if ((c.now && s && c.now(x)) || (end && c.end && s && c.end(x))) { store.ach[c.id] = Date.now(); got.push(c); }
  });
  if (got.length && !end) { got.forEach(function (c) { note("Haaste suoritettu: <b>" + esc(c.name) + "</b>", 3400); }); SFX.done(); }
  return got;
}
function showChallenges() {
  var n = CHALLENGES.filter(function (c) { return store.ach[c.id]; }).length;
  $("challengeBody").innerHTML = '<p class="cnt">' + n + " / " + CHALLENGES.length + " suoritettu</p>" + CHALLENGES.map(function (c) {
    var ok = !!store.ach[c.id];
    return '<div class="ch' + (ok ? " ok" : "") + '"><span class="mk" aria-hidden="true">' + (ok ? "✓" : "") + '</span><span class="tx"><b>' + esc(c.name) + "</b><small>" + esc(c.desc) + "</small></span></div>";
  }).join("");
  sheet("challengeSheet", true);
}
