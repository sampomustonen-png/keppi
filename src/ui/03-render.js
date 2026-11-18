// ---------- piirto ----------
function applyTier(t) {
  var T = D.TIERS[t], ink = T.dark ? "#f3efe6" : "#27241f", st = document.body.style;
  st.setProperty("--bg", T.bg);
  document.body.classList.toggle("dark", !!T.dark);
  st.setProperty("--mute", ensure(hex(mix(rgb(T.bg), rgb(ink), 0.5)), T.bg, 4.6, ink));
  st.setProperty("--accent", ensure(T.dark ? "#f2a14a" : "#d47a22", T.bg, 3.2, ink));
  st.setProperty("--good", ensure(T.dark ? "#8fd3a0" : "#3a7a4e", T.bg, 4.6, ink));
  st.setProperty("--bad", ensure(T.dark ? "#f09a88" : "#ad4b3a", T.bg, 4.6, ink));
  var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute("content", T.bg);
}
function famCount(fid) { return D.FAM_BY_ID[fid].items.filter(function (id) { return known[id]; }).length; }
// vaihtoehdon tärkein ominaisuus omalle rivilleen
function traitOf(a) {
  for (var i = 0; i < a.items.length; i++) {
    var x = a.items[i], f = D.FAM_OF[x.id];
    if (f && store.fams.indexOf(f) < 0 && !known[x.id]) {
      var F = D.FAM_BY_ID[f], n = famCount(f);
      return { c: "good", t: (n + 1 === F.items.length ? "Täydentää kokoelman: " : "Kokoelmaan: ") + F.name + " " + n + "/" + F.items.length };
    }
  }
  if (a.items.some(function (x) { return E.demandHits(s, x) > 0; })) return { c: "acc", t: "Kysytty nyt" };
  if (a.items.some(function (x) { return E.nextHits(s, x) > 0; })) return { c: "acc", t: "Kysytty pian" };
  if (a.items.some(function (x) { return E.base(x).tags.indexOf("tuore") >= 0; })) return { c: "bad", t: "Pilaantuva" };
  if (s.mode !== "paiva" && a.items.some(function (x) { var f = D.FAM_OF[x.id]; return f && store.fams.indexOf(f) >= 0; })) return { c: "good", t: "Kokoelmaetu" };
  return null;
}

function render(anim) {
  var t = D.tierOf(E.maxValue(s)), lv = E.level(s);
  applyTier(t);
  $("day").innerHTML = '<span class="season">' + '<span class="ic">' + ico(SEASON_IC[s.season]) + "</span>" + E.SEASONS[s.season] + "</span>Päivä <b>" + s.day + "</b> / " + s.days;
  $("day").classList.toggle("late", s.days - s.day < (lv.pika ? 10 : 30));
  var lad = ""; for (var i = 0; i <= 18; i++) lad += '<i class="' + (i <= t ? "on" : "") + '"></i>';
  $("ladder").innerHTML = lad;
  $("tierName").textContent = D.TIERS[t].name;
  $("tierNum").textContent = (s.mode === "paiva" ? "Päivän vuosi · " : s.mode === "pika" ? "Pikavuosi · " : s.level > 1 ? "Taso " + s.level + " · " : "") + (t + 1) + " / 19";
  $("bookN").textContent = store.book.length;

  // vaihtoketju
  var tail = s.chain.slice(-14);
  $("trail").innerHTML = tail.map(function (c, i) {
    return (i ? "<i>›</i>" : "") + '<span class="tk' + (i === tail.length - 1 && anim === "enter" ? " last" : "") + '">' + c.map(function (id) { return '<span class="ic">' + icoOf(D.BY_ID[id]) + "</span>"; }).join("") + "</span>";
  }).join("");

  // keskus: oma tavara ja sen hinta
  var h = s.hand, left = E.freshLeft(s, h), hh = E.demandHits(s, h), ch = s.ui.chg && s.ui.chg.uid === h.uid ? s.ui.chg : null;
  var chd = ch ? delta(ch.r) : null, fb = E.famMult(s, h) > 1;
  $("center").innerHTML = '<div class="me' + (anim === "swap" ? " appear" : "") + (hh ? " hot" : E.nextHits(s, h) ? " soon" : "") + '" id="me"><div class="plate">' + itemIc(h) + '</div><div class="meta"><div class="nm">' + esc(E.name(h)) + "</div>" +
    '<div class="price"><span class="lbl">Arvo</span><span class="amt">' + fmt(h.v, h.id) + "</span>" +
    (chd ? '<span class="chg ' + chd.c + (ch.fresh ? " pop" : "") + '" title="Viime vaihdon tulos">' + (chd.c === "up" ? "▲" : chd.c === "down" ? "▼" : "") + NBSP + chd.t.replace(/^[+−]/, "") + "</span>" : "") + "</div>" +
    (hh ? '<div class="hotline">Kysytty nyt: tarjoukset +' + Math.round((E.demandMult(s, h) - 1) * 100) + NBSP + "%</div>" : "") +
    (fb ? '<div class="famline">Kokoelmaetu: tarjoukset +' + Math.round((E.famBonus(s) - 1) * 100) + NBSP + "%</div>" : "") +
    (left !== null ? '<div class="fr' + (left > 2 ? " ok" : "") + '">Pilaantuu ' + left + NBSP + "päivässä</div>" : "") + "</div></div>";
  if (ch) ch.fresh = false;

  // vaihtoehdot
  $("alts").innerHTML = E.alts(s).map(function (a, i) {
    var cls = "alt", ic, nm, dl, sub = "", badge = "";
    if (a.gone) return '<div class="alt void"><div class="plate"><span class="ic">' + ico("🎁") + '</span></div><span class="nm">Ei enää saatavilla</span></div>';
    if (a.pkg) {
      ic = '<span class="ic">' + ico("🎁") + "</span>"; nm = "Paketti"; dl = '<span class="dl unk">Sisältö ?</span>';
    } else {
      if (a.items.some(function (x) { return E.demandHits(s, x) > 0; })) cls += " hot";
      else if (a.items.some(function (x) { return E.nextHits(s, x) > 0; })) cls += " soon";
      var unknown = a.items.some(function (x) { return !known[x.id]; });
      ic = a.items.length > 1
        ? '<span class="ic pair">' + a.items.map(function (x) { return "<span>" + layIc(x) + "</span>"; }).join("") + "</span>"
        : itemIc(a.items[0]);
      nm = a.items.map(function (x) { return esc(E.name(x)); }).join(" + ");
      var partner = E.partnerOf(s, a), r = E.altTotal(a) / E.givenValue(s, a);
      if (partner) { badge = '<span class="merge" title="Mukaan menee myös repun tavara">' + itemIc(partner) + "</span>"; sub = '<span class="sub">Mukaan: ' + esc(E.name(partner)) + "</span>"; }
      else { var tr = traitOf(a); if (tr) sub = '<span class="sub tr ' + tr.c + '">' + esc(tr.t) + "</span>"; }
      // uuden tavaran arvo ei näy; epävarman tarjouksen arvo selviää vasta vaihdossa
      if (unknown) dl = '<span class="dl unk"><b>Uusi</b> · arvo ?</span>';
      else if (a.est) dl = '<span class="dl unk">Arvo ?</span>';
      else { var d = delta(r); dl = '<span class="dl ' + d.c + '">' + d.t + "</span>"; }
    }
    if (anim === "enter" || anim === "swap" || anim === "skip") cls += " appear";
    var aria = a.pkg ? "Vaihda pakettiin, sisältö tuntematon" : "Vaihda: " + a.items.map(function (x) { return E.name(x); }).join(" ja ") + (E.partnerOf(s, a) ? ", mukaan menee myös " + E.name(E.partnerOf(s, a)) : "");
    aria += ". " + $tmp(dl) + (sub ? ". " + $tmp(sub) : "");
    return '<button class="' + cls + '" data-alt="' + i + '" style="animation-delay:' + (i * 60) + 'ms" aria-label="' + esc(aria) + '">' +
      '<div class="plate">' + ic + badge + '</div><span class="nm">' + nm + "</span>" + sub + dl + "</button>";
  }).join("");

  // kysyntä ja ennuste
  if (s.trend) {
    var tg = function (list) { return list.map(function (g) { return esc(D.TAGS[g] || g); }).join("</b>, <b>"); };
    $("demand").innerHTML = '<span class="ring"></span>Kysyntä: <b>' + tg(s.trend.tags) + "</b> · vielä " + s.trend.left + NBSP + plural(s.trend.left, "päivä", "päivää") +
      (lv.forecast && s.next ? '<span class="next"><span class="ring dash"></span>Seuraavaksi: <b>' + tg(s.next.tags) + "</b></span>" : "");
  }

  // reppu
  $("pack").innerHTML = s.pack.map(function (p, i) {
    if (!p) return '<div class="slot empty"><div class="plate"></div><span class="nm">Reppu</span><span class="vl">tyhjä</span></div>';
    var armed = s.ui.arm === i, lf = E.freshLeft(s, p);
    var mark = E.demandHits(s, p) > 0 ? " hot" : (E.nextHits(s, p) > 0 ? " soon" : "");
    return '<div class="slotw' + mark + (armed ? " armed" : "") + '"><button class="slot" data-slot="' + i + '" aria-label="Ota esiin: ' + esc(E.name(p)) + ", arvo " + fmt(p.v, p.id) + '"><div class="plate">' + itemIc(p) + '</div><span class="nm">' + esc(E.name(p)) +
      '</span><span class="vl">' + fmt(p.v, p.id) + (lf !== null ? " · " + lf + NBSP + "pv" : "") + "</span></button>" +
      '<button class="drop' + (armed ? " armed" : "") + '" data-drop="' + i + '" aria-label="Heitä pois: ' + esc(E.name(p)) + '">' + (armed ? "Heitä pois?" : "✕") + "</button></div>";
  }).join("");

  eventNote();
}
// html-katkelman teksti ruudunlukijaa varten
function $tmp(html) { var d = document.createElement("div"); d.innerHTML = html; return d.textContent; }
