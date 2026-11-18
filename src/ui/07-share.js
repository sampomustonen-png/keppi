// ---------- tuloksen jakaminen ----------
function shareText(sv) {
  var sm = E.summary(sv);
  var body = sv.won ? "Omistin kaiken " + sv.day + " päivässä (" + sv.trades + " vaihtoa)." : "Porras " + (sm.tier + 1) + " / 19, arvonimi " + sm.title + ".";
  var url = /^https?:/.test(location.protocol) ? "\n" + location.href.split("#")[0] : "";
  return "Kepistä kaikkeen · " + modeName(sv) + "\n" + body + url;
}
function copyText(btn, text) {
  var done = function (ok) { btn.textContent = ok ? "Kopioitu" : "Kopiointi ei onnistunut"; };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); }); return; }
  } catch (e) {}
  done(fallbackCopy(text));
}
function fallbackCopy(text) {
  var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
  ta.remove(); return ok;
}
function loadImg(key) {
  return new Promise(function (res) {
    var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); };
    im.src = ICONS[key] ? icoSrc(key) : "";
  });
}
// valitsee ketjusta enintään n tasaisesti jakautunutta askelta (ensimmäinen ja viimeinen mukana)
function milestones(chain, n) {
  if (chain.length <= n) return chain.map(function (c) { return c[0]; });
  var out = [];
  for (var i = 0; i < n; i++) out.push(chain[Math.round(i * (chain.length - 1) / (n - 1))][0]);
  return out;
}
function shareImage(btn, sv) {
  var sm = E.summary(sv), own = sm.own, T = D.TIERS[sv.won ? 18 : sm.tier], dark = !!T.dark;
  var ink = dark ? "#f3efe6" : "#27241f", mute = hex(mix(rgb(T.bg), rgb(ink), 0.55)), plate = dark ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.6)";
  var steps = milestones(sv.chain, 10), L = E.look(own);
  var keys = [own.id].concat(steps);
  L.k.forEach(function (k) { keys.push("~" + k + "<", "~" + k + ">"); });
  btn.textContent = "Tehdään kuvaa…";
  Promise.all(keys.map(loadImg)).then(function (imgs) {
    var img = {}; keys.forEach(function (k, i) { img[k] = imgs[i]; });
    var W = 1080, H = 1350, cv = document.createElement("canvas"), c = cv.getContext("2d");
    cv.width = W; cv.height = H;
    var F = "Arial, Arimo, Helvetica, sans-serif";
    c.fillStyle = T.bg; c.fillRect(0, 0, W, H);
    c.textAlign = "center"; c.fillStyle = mute; c.font = "bold 40px " + F;
    c.fillText("KEPISTÄ KAIKKEEN", W / 2, 110);
    c.font = "34px " + F; c.fillText(modeName(sv), W / 2, 165);
    c.fillStyle = ink; c.font = "bold 92px " + F;
    c.fillText(sv.won ? "Omistin kaiken" : "Porras " + (sm.tier + 1) + " / 19", W / 2, 300);
    c.font = "bold 52px " + F;
    c.fillText(sv.won ? sv.day + " päivässä" : sm.title, W / 2, 380);
    c.fillStyle = plate; c.beginPath(); c.arc(W / 2, 680, 235, 0, 6.2832); c.fill();
    var sz = 330 * (L.s || 1), x0 = W / 2 - sz / 2, y0 = 680 - sz / 2;
    L.k.forEach(function (k) { if (img["~" + k + "<"]) c.drawImage(img["~" + k + "<"], x0, y0, sz, sz); });
    if (img[own.id]) { try { if (L.f) c.filter = L.f; } catch (e) {} c.drawImage(img[own.id], x0, y0, sz, sz); try { c.filter = "none"; } catch (e) {} }
    L.k.forEach(function (k) { if (img["~" + k + ">"]) c.drawImage(img["~" + k + ">"], x0, y0, sz, sz); });
    c.fillStyle = ink; c.font = "bold 50px " + F; c.fillText(E.name(own), W / 2, 990);
    c.fillStyle = mute; c.font = "40px " + F; c.fillText(fmt(own.v, own.id), W / 2, 1048);
    var n = steps.length, gap = 92, sx = W / 2 - (n - 1) * gap / 2;
    steps.forEach(function (id, i) {
      if (i) { c.fillStyle = mute; c.font = "28px " + F; c.fillText("›", sx + (i - 0.5) * gap, 1170); }
      if (img[id]) c.drawImage(img[id], sx + i * gap - 34, 1126, 68, 68);
    });
    c.fillStyle = mute; c.font = "32px " + F;
    c.fillText("Vaihtoja " + sv.trades + " · uusia löytöjä " + ((sv.ui && sv.ui.newIds.length) || 0), W / 2, 1275);
    cv.toBlob(function (blob) {
      if (!blob) { btn.textContent = "Kuvan teko ei onnistunut"; return; }
      var file = null;
      try { file = new File([blob], "kepista-kaikkeen.png", { type: "image/png" }); } catch (e) {}
      var save = function () { saveFile(blob, "kepista-kaikkeen.png").then(function (ok) { btn.textContent = ok ? "Kuva tallennettu" : "Jaa tulos kuvana"; }); };
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], text: shareText(sv) }).then(function () { btn.textContent = "Jaettu"; }, function (e) {
          if (e && e.name === "AbortError") btn.textContent = "Jaa tulos kuvana"; else save();
        });
        return;
      }
      save();
    }, "image/png");
  });
}
// Tallentaa tiedoston: Clauden artefaktinäkymässä sen oman tallennuksen kautta, muualla tavallisena latauksena.
// Palauttaa lupauksen, joka ratkeaa arvoon true, jos tiedosto annettiin tallennettavaksi.
function saveFile(blob, name) {
  var host = window.claude && typeof window.claude.use === "function" ? window.claude.use("downloads").catch(function () { return null; }) : Promise.resolve(null);
  return host.then(function (dl) {
    if (dl) return dl.save({ filename: name, data: blob }).then(function () { return true; }, function (e) {
      if (e && (e.code === "declined" || e.code === "rate_limited")) return false;
      return linkSave(blob, name);
    });
    return linkSave(blob, name);
  });
}
function linkSave(blob, name) {
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  return true;
}

// ---------- pelin siirto toiseen laitteeseen ----------
function b64(bytes) { var s2 = ""; for (var i = 0; i < bytes.length; i += 32768) s2 += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)); return btoa(s2); }
function unb64(t) { var bin = atob(t), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
function streamBytes(bytes, Stream) { return new Response(new Blob([bytes]).stream().pipeThrough(new Stream("gzip"))).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
function encodeStore() {
  var bytes = new TextEncoder().encode(JSON.stringify(store));
  if (window.CompressionStream) return streamBytes(bytes, CompressionStream).then(function (z) { return "KK1." + b64(z); });
  return Promise.resolve("KK0." + b64(bytes));
}
function decodeStore(code) {
  code = (code || "").replace(/\s+/g, "");
  var kind = code.slice(0, 4), body = code.slice(4);
  try {
    if (kind === "KK0.") return Promise.resolve(JSON.parse(new TextDecoder().decode(unb64(body))));
    if (kind === "KK1.") {
      if (!window.DecompressionStream) return Promise.reject(new Error("Tämä selain ei osaa purkaa koodia."));
      return streamBytes(unb64(body), DecompressionStream).then(function (b) { return JSON.parse(new TextDecoder().decode(b)); });
    }
  } catch (e) { return Promise.reject(new Error("Koodi on rikki.")); }
  return Promise.reject(new Error("Tämä ei ole siirtokoodi."));
}
// yhdistää tuodun pelin nykyiseen: löydöt, haasteet ja ennätykset yhteen, tuodut keskeneräiset vuodet tilalle
function mergeStore(r) {
  if (!r || typeof r !== "object" || !Array.isArray(r.book)) throw new Error("Koodista puuttuu pelin tieto.");
  r = normalize(r);
  r.book.forEach(function (id) { if (!known[id]) { store.book.push(id); known[id] = 1; } });
  Object.keys(r.ach).forEach(function (k) { if (!store.ach[k]) store.ach[k] = r.ach[k]; });
  store.runs = Math.max(store.runs, r.runs); store.wins = Math.max(store.wins, r.wins);
  store.unlocked = Math.max(store.unlocked, r.unlocked);
  Object.keys(r.best).forEach(function (k) { if (!store.best[k] || r.best[k] < store.best[k]) store.best[k] = r.best[k]; });
  var d = store.daily, rd = r.daily;
  Object.keys(rd.results).forEach(function (k) { if (!d.results[k]) d.results[k] = rd.results[k]; });
  if (rd.last && (!d.last || rd.last > d.last)) { d.last = rd.last; d.streak = rd.streak; }
  d.bestStreak = Math.max(d.bestStreak || 0, rd.bestStreak || 0);
  MODE_IDS.forEach(function (m) { if (r.saves[m]) store.saves[m] = r.saves[m]; });
  checkFams(true);
  return r.book.length;
}
function showTransfer() {
  $("transferIn").value = ""; $("transferMsg").textContent = "";
  sheet("menuSheet", false); sheet("transferSheet", true);
}
