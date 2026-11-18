// ---------- kuvat ----------
// Kaikki kuvat on piirretty tätä peliä varten (art/) ja ne tulevat sivun mukana (ICONS_ALL).
// Avain on esineen tunniste, käyttöliittymän emoji tai muuntimen kerros (~kultainen< taakse, ~kultainen> eteen).
var ICONS = typeof ICONS_ALL !== "undefined" ? ICONS_ALL : {}, URI = {};
var SEASON_IC = ["🌱", "☀️", "🍂", "❄️"];
function norm(e) { return e.replace(/️/g, ""); }
function icoSrc(k) {
  if (!URI[k]) URI[k] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + ICONS[k] + "</svg>");
  return URI[k];
}
function ico(k, fb) {
  k = norm(k);
  if (ICONS[k]) return '<img class="ico" src="' + icoSrc(k) + '" alt="" draggable="false">';
  return '<span class="em">' + (fb || k) + "</span>";
}
function icoOf(it) { return ico(it.id, it.e); }
// esine kerroksineen: muuntimen piirretyt yksityiskohdat taakse ja eteen, värisävy suodattimella
function layIc(inst) {
  var b = E.base(inst), L = E.look(inst), back = "", front = "";
  L.k.forEach(function (k) {
    if (ICONS["~" + k + "<"]) back += '<span class="bk">' + ico("~" + k + "<") + "</span>";
    if (ICONS["~" + k + ">"]) front += '<span class="fr">' + ico("~" + k + ">") + "</span>";
  });
  return '<span class="lay"' + (L.s !== 1 ? ' style="transform:scale(' + L.s + ')"' : "") + ">" + back +
    '<span class="base"' + (L.f ? ' style="filter:' + L.f + '"' : "") + ">" + icoOf(b) + "</span>" + front + "</span>";
}
function itemIc(inst, cls) { return '<span class="ic ' + (cls || "") + '">' + layIc(inst) + "</span>"; }
function baseIc(it) { return '<span class="ic">' + icoOf(it) + "</span>"; }

// ---------- ääni ----------
var ac = null;
function tone(freqs, dur, type, vol) {
  if (!store.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    var t0 = ac.currentTime;
    freqs.forEach(function (f, i) {
      var o = ac.createOscillator(), g = ac.createGain(), t = t0 + i * dur * 0.55;
      o.type = type || "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.03);
    });
  } catch (e) {}
}
var SFX = {
  pick: function () { tone([587, 880], 0.16, "sine", 0.08); },
  skip: function () { tone([392], 0.12, "sine", 0.04); },
  tier: function () { tone([523, 659, 784, 1047], 0.2, "sine", 0.07); },
  rattle: function () { tone([220, 247, 220, 247], 0.08, "triangle", 0.04); },
  pkg: function (good) { tone(good ? [659, 988, 1319] : [330, 262], 0.16, "sine", 0.07); },
  season: function () { tone([392, 523, 659], 0.22, "sine", 0.06); },
  done: function () { tone([784, 988, 1175, 1568], 0.18, "sine", 0.06); }
};
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- juhlahetken hiukkaset ----------
function burst(n) {
  if (REDUCED) return;
  var cv = $("burst"), ctx = cv.getContext("2d"), W = cv.width = innerWidth * devicePixelRatio, H = cv.height = innerHeight * devicePixelRatio;
  cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
  var cs = getComputedStyle(document.body), cols = [cs.getPropertyValue("--accent"), cs.getPropertyValue("--good"), "#f2c14e"];
  var ps = []; for (var i = 0; i < (n || 70); i++) ps.push({ x: W / 2, y: H * 0.42, vx: (Math.random() - 0.5) * 18 * devicePixelRatio, vy: (-Math.random() * 16 - 4) * devicePixelRatio, r: (2 + Math.random() * 4) * devicePixelRatio, c: cols[i % 3].trim(), a: 1 });
  var t0 = performance.now();
  (function step(t) {
    ctx.clearRect(0, 0, W, H);
    var alive = false;
    ps.forEach(function (p) {
      p.vy += 0.55 * devicePixelRatio; p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.a = Math.max(0, 1 - (t - t0) / 1800);
      if (p.a > 0 && p.y < H) alive = true;
      ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    });
    if (alive) requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
  })(t0);
}

// ---------- ilmoitukset ----------
function note(html, ms) {
  var el = document.createElement("div");
  el.className = "note hl";
  el.innerHTML = html;
  $("notes").appendChild(el);
  var all = $("notes").querySelectorAll(".hl");
  if (all.length > 2) all[0].remove();
  setTimeout(function () { el.classList.add("out"); setTimeout(function () { el.remove(); }, 420); }, ms || 2800);
}
function eventNote() {
  var old = $("notes").querySelector(".ev"); if (old) old.remove();
  var ev = s.event, t = "";
  if (ev && ev.k === "find") t = "Löysit maasta: " + esc(E.name(ev.item)) + ". Se on nyt repussa.";
  else if (ev && ev.k === "findFull") t = "Löysit maasta: " + esc(E.name(ev.item)) + ", mutta reppu oli täynnä.";
  else if (ev && ev.k === "market") t = "Markkinapäivä: tarjoukset ovat tänään 30" + NBSP + "% parempia.";
  else if (ev && ev.k === "news") t = "Lehti kirjoitti vaihtoketjustasi. Tarjoukset paranevat muutamaksi päiväksi.";
  else if (s.famous) t = "Olet puheenaihe, joten tarjoukset ovat tavallista parempia.";
  if (!t) return;
  var el = document.createElement("div");
  el.className = "note ev"; el.innerHTML = t;
  $("notes").insertBefore(el, $("notes").firstChild);
}

// ---------- hetkijono (porras, vuodenaika, kokoelma) ----------
var queue = [], modal = false;
function enqueue(fn) { queue.push(fn); runQueue(); }
function runQueue() {
  if (modal || !queue.length) return;
  modal = true; busy = true;
  queue.shift()(function () { modal = false; busy = false; runQueue(); });
}
function cardMoment(html, sfx) {
  enqueue(function (done) {
    var m = $("moment");
    m.innerHTML = '<div class="card">' + html + "</div>";
    m.classList.add("show");
    (sfx || SFX.tier)(); buzz([15, 40, 15]); burst(60);
    var closed = false;
    var close = function () { if (closed) return; closed = true; m.classList.remove("show"); m.onclick = null; done(); };
    m.onclick = close;
    setTimeout(close, 2600);
  });
}
function tierMoment(t) {
  cardMoment('<div class="k">Porras ' + (t + 1) + " / 19</div><h3>" + esc(D.TIERS[t].name) + '</h3><div class="plate">' + itemIc(s.hand) + "</div><p>Uusi arvonimi: <b>" + esc(D.TIERS[t].title) + "</b></p>");
}
function famMoment(f) {
  var ic = f.items.slice(-4).map(function (id) { return '<span class="mini">' + icoOf(D.BY_ID[id]) + "</span>"; }).join("");
  cardMoment('<div class="k">Kokoelma valmis</div><h3>' + esc(f.name) + '</h3><div class="minis">' + ic + "</div><p>Kokoelman tavaroista saa nyt <b>" + Math.round((E.famBonus(s) - 1) * 100) + NBSP + "% parempia</b> tarjouksia." + (s && s.mode === "paiva" ? " Etu ei ole käytössä päivän vuodessa." : "") + "</p>", SFX.done);
}
function seasonMoment(rec) {
  enqueue(function (done) {
    var from = { id: rec.fromId, mod: null, v: rec.fromV }, to = { id: rec.toId, mod: rec.toMod, v: rec.toV };
    var nextName = E.SEASONS[rec.season + 1] || "";
    var r = rec.toV / rec.fromV;
    $("seasonBody").innerHTML = "<h2>" + esc(rec.name) + " päättyi.</h2>" +
      '<p class="sub">' + (r >= 1 ? "Tavarasi arvo kasvoi " + (r >= 10 ? Math.round(r) + "-kertaiseksi" : delta(r).t) + "." : "Tavarasi arvo laski " + delta(r).t.replace("−", "") + ".") + "</p>" +
      '<div class="arrow"><div class="col"><div class="plate">' + itemIc(from) + '</div><span class="nm">' + esc(E.name(from)) + '</span><span class="vl">' + fmt(from.v, from.id) + '</span></div><span class="to">→</span>' +
      '<div class="col"><div class="plate">' + itemIc(to) + '</div><span class="nm">' + esc(E.name(to)) + '</span><span class="vl">' + fmt(to.v, to.id) + "</span></div></div>" +
      '<div class="stats"><div class="stat"><small>Vaihtoja</small><b>' + rec.trades + '</b></div><div class="stat"><small>Uusia löytöjä</small><b>' + rec.found + '</b></div><div class="stat"><small>Porras</small><b>' + (D.tierOf(rec.toV) + 1) + " / 19</b></div></div>" +
      '<div class="btns"><button class="pill main" id="btnSeason">Jatka: ' + esc(nextName) + "</button></div>";
    sheet("seasonSheet", true);
    SFX.season();
    $("btnSeason").onclick = function () { sheet("seasonSheet", false); done(); };
  });
}
function sheet(id, on) {
  $(id).classList.toggle("show", on);
  document.body.classList.toggle("locked", !!document.querySelector(".sheet.show"));
}
