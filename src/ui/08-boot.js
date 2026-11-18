// ---------- kytkennät ----------
$("alts").addEventListener("click", function (e) {
  var b = e.target.closest("[data-alt]"); if (b) onChoose(+b.getAttribute("data-alt"));
});
$("pack").addEventListener("click", function (e) {
  var d = e.target.closest("[data-drop]"); if (d) { onDrop(+d.getAttribute("data-drop")); return; }
  var b = e.target.closest("[data-slot]"); if (b) onSwap(+b.getAttribute("data-slot"));
});
$("btnSkip").onclick = onSkip;
$("btnBook").onclick = showBook;
$("btnBookClose").onclick = function () { sheet("bookSheet", false); };
["abc", "val", "fam"].forEach(function (m) { $("sort-" + m).onclick = function () { bookMode = m; showBook(); }; });
$("modeSeg").onclick = function (e) {
  var b = e.target.closest("[data-mode]"); if (!b) return;
  store.mode = b.getAttribute("data-mode"); persist(); showStart();
};
$("levelBox").onclick = function (e) {
  var b = e.target.closest("[data-level]"); if (!b || b.disabled) return;
  store.level = +b.getAttribute("data-level"); persist(); showStart();
};
$("btnMenu").onclick = function () { $("confirm").classList.remove("show"); updSound(); sheet("menuSheet", true); };
$("btnMenuClose").onclick = function () { sheet("menuSheet", false); };
function updSound() { $("btnSound").textContent = "Äänet: " + (store.sound ? "päällä" : "pois"); }
$("btnSound").onclick = function () { store.sound = !store.sound; updSound(); persist(); if (store.sound) SFX.pick(); };
$("btnRules").onclick = function () { sheet("menuSheet", false); persist(); s = null; showStart(); };
$("btnCh").onclick = function () { sheet("menuSheet", false); showChallenges(); };
$("btnChClose").onclick = function () { sheet("challengeSheet", false); };
$("btnTransfer").onclick = showTransfer;
$("btnTrClose").onclick = function () { sheet("transferSheet", false); };
$("btnExport").onclick = function () {
  var btn = this;
  encodeStore().then(function (code) {
    $("transferIn").value = code;
    copyText(btn, code);
    $("transferMsg").textContent = "Koodi on kopioitu. Liitä se toisessa laitteessa tähän kenttään ja paina Lataa koodi.";
  });
};
$("btnImport").onclick = function () {
  decodeStore($("transferIn").value).then(function (r) {
    var n = mergeStore(r);
    s = null; persist();
    $("transferMsg").textContent = "Peli siirretty. Koodissa oli " + n + " löytöä.";
    setTimeout(function () { sheet("transferSheet", false); showStart(); }, 900);
  }).catch(function (e) { $("transferMsg").textContent = (e && e.message) || "Koodin lataus ei onnistunut."; });
};
$("btnRestart").onclick = function () { $("confirm").classList.add("show"); };
$("btnCancel").onclick = function () { $("confirm").classList.remove("show"); };
$("btnConfirm").onclick = function () { newRun(s ? s.mode : store.mode); };
document.addEventListener("keydown", function (e) {
  if (document.querySelector(".sheet.show") || !s) return;
  if ($("moment").classList.contains("show")) { if (e.key === "Enter" || e.key === " " || e.key === "Escape") $("moment").click(); return; }
  if (e.key === "1" || e.key === "2" || e.key === "3") onChoose(+e.key - 1);
  else if (e.key === " " || e.key === "ArrowRight") { e.preventDefault(); onSkip(); }
});

// ---------- käynnistys ----------
(function start() {
  if (store.book.length) checkFams(true);
  persist();
  showStart();
})();
