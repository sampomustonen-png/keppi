// ---------- pelin kulku ----------
function syncBook() {
  s.seen.forEach(function (id) {
    if (!known[id]) { store.book.push(id); known[id] = 1; if (s.ui.newIds.indexOf(id) < 0) s.ui.newIds.push(id); }
  });
}
// uudet valmiit kokoelmat: etu heti käyttöön (paitsi päivän vuodessa) ja juhlahetki
function checkFams(quiet) {
  var fresh = D.FAMILIES.filter(function (f) { return store.fams.indexOf(f.id) < 0 && f.items.every(function (id) { return known[id]; }); });
  fresh.forEach(function (f) { store.fams.push(f.id); if (!quiet) famMoment(f); });
  if (s) E.setFam(s, famMap());
  return fresh;
}

function after(res) {
  var wasKnown = {};
  if (res && res.got) res.got.forEach(function (x) { wasKnown[x.id] = !!known[x.id]; });
  syncBook();
  var freshNow = (res && res.got || []).filter(function (x) { return !wasKnown[x.id]; });
  if (freshNow.length && !(res && res.pkg)) {
    note("Uusi löytö: " + esc(E.name(freshNow[0])) + " (" + fmt(freshNow[0].v, freshNow[0].id) + ")" + (freshNow.length > 1 ? " ja " + esc(E.name(freshNow[1])) : ""), 2600);
  }
  var seasonRecs = [];
  (res && res.news || []).forEach(function (n) {
    if (n.k === "spoil") note(esc(E.base(n.item).name) + " pilaantui.", 3200);
    if (n.k === "trend") note("Kysyntä vaihtui: " + s.trend.tags.map(function (g) { return D.TAGS[g] || g; }).join(" ja ") + ".", 3200);
    if (n.k === "season") seasonRecs.push(n.rec);
  });
  var t = D.tierOf(E.maxValue(s));
  if (t > s.ui.top) { s.ui.top = t; if (!s.over) tierMoment(t); }
  if (!s.over) { checkFams(); seasonRecs.forEach(seasonMoment); checkChallenges(false); }
  persist();
}

function onChoose(i) {
  if (busy || !s || s.over) return;
  var a = E.alts(s)[i];
  if (!a || a.gone) return;
  busy = true; s.ui.arm = null;
  SFX.pick(); buzz(12);
  var chosen = $("alts").querySelector('[data-alt="' + i + '"]');
  $("alts").querySelectorAll(".alt").forEach(function (n) { if (n !== chosen) n.classList.add("gone"); });
  var mePlate = $("center").querySelector(".plate"), cp = chosen && chosen.querySelector(".plate");
  $("center").querySelector(".meta").classList.add("gone");
  if (mePlate) { mePlate.style.transition = "opacity .25s ease"; mePlate.style.opacity = "0"; }
  if (cp && mePlate) {
    var ra = cp.getBoundingClientRect(), rb = mePlate.getBoundingClientRect();
    chosen.classList.remove("appear");
    chosen.querySelectorAll(".nm,.dl,.sub,.merge").forEach(function (n) { n.classList.add("gone"); });
    cp.classList.add("flying");
    requestAnimationFrame(function () {
      cp.style.transform = "translate(" + (rb.left + rb.width / 2 - ra.left - ra.width / 2) + "px," + (rb.top + rb.height / 2 - ra.top - ra.height / 2) + "px) scale(" + (rb.width / ra.width) + ")";
    });
  }
  var res = E.choose(s, i);
  if (!res) { busy = false; render(); return; }
  var ratio = res.ratio, reveal = res.pkg || res.est;
  var finish = function () {
    busy = false;
    after(res);
    if (s.over) { showEnd(); return; }
    s.ui.chg = { r: ratio, uid: s.hand.uid, fresh: true };
    render("enter");
    if (reveal) { $("center").querySelector(".plate").classList.add("reveal"); SFX.pkg(ratio >= 1); }
  };
  setTimeout(function () {
    if (!res.pkg) { finish(); return; }
    // paketin avaus
    $("center").innerHTML = '<div class="me"><div class="plate"><span class="ic shake">' + ico("🎁") + '</span></div><div class="meta"><div class="nm">Avataan…</div></div></div>';
    $("alts").innerHTML = "";
    SFX.rattle();
    setTimeout(finish, 650);
  }, 450);
}
function onSkip() {
  if (busy || !s || s.over) return;
  busy = true; s.ui.arm = null;
  SFX.skip();
  $("alts").querySelectorAll(".alt").forEach(function (n) { n.classList.add("gone"); });
  var res = E.skip(s);
  s.ui.chg = null;
  setTimeout(function () {
    busy = false;
    after(res);
    if (s.over) { showEnd(); return; }
    render("skip");
  }, 260);
}
function onSwap(i) {
  if (busy || !s || s.over) return;
  s.ui.arm = null;
  if (E.swap(s, i)) { render("swap"); persist(); }
}
function onDrop(i) {
  if (busy || !s || s.over) return;
  if (s.ui.arm !== i) { s.ui.arm = i; render(); return; }
  var it = s.pack[i]; s.ui.arm = null;
  if (E.discard(s, i)) { note("Heitit pois: " + esc(E.name(it)) + "."); render(); persist(); }
}
