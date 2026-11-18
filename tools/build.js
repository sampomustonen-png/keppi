// Rakentaa pelin yhdeksi tiedostoksi: dist/index.html (+ kuvakkeet ja manifest Pages-julkaisua varten).
// Käyttö: node tools/build.js
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const r = (f) => fs.readFileSync(path.join(ROOT, "src", f), "utf8");
const slug = (s) => s.toLowerCase().replace(/[äå]/g, "a").replace(/ö/g, "o").replace(/ñ/g, "n").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// --- kuvat: omat piirrokset (art/items/*.txt, art/ui.txt, art/mods.txt, art/app.txt) ---
const ART = require("../art/draw.js");
ART.loadDir(fs, path.join(ROOT, "art", "items"));
const out = {}, missing = [], errors = [];
const compact = (svg) => svg.replace(/(\d)\.0(?=\D)/g, "$1").replace(/\s+\/>/g, "/>");
const drawInto = (key, src, label) => { try { out[key] = compact(ART.draw(src)); } catch (e) { errors.push((label || key) + ": " + e.message); } };
r("items.txt").split("\n").forEach((ln) => {
  ln = ln.trim(); if (!ln || ln[0] === "#") return;
  const id = slug(ln.split("|")[0]); const src = ART.SOURCES[id];
  if (!src) missing.push(id); else drawInto(id, src);
});
const keyed = (file) => fs.readFileSync(path.join(ROOT, "art", file), "utf8").split("\n").filter((ln) => ln.trim() && ln[0] !== "#").map((ln) => { const i = ln.indexOf("|"); return [ln.slice(0, i), ln.slice(i + 1)]; });
keyed("ui.txt").forEach(([k, src]) => drawInto(k, src, "ui " + k));
keyed("mods.txt").forEach(([k, src]) => drawInto(k, src, "muunnin " + k));
const APP = {}; keyed("app.txt").forEach(([k, src]) => { try { APP[k] = compact(ART.draw(src)); } catch (e) { errors.push("app " + k + ": " + e.message); } });

// --- sivu ---
const svgDoc = (body) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + body + "</svg>";
const svgUri = (body) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgDoc(body));
// Arimo (SIL Open Font License 1.1, The Arimo Project Authors) upotetaan varafontiksi laitteille, joilla ei ole Arialia.
const font = (w) => "@font-face{font-family:Arimo;font-style:normal;font-weight:" + w + ";font-display:swap;src:url(data:font/woff2;base64," + fs.readFileSync(path.join(ROOT, "src", "fonts", "arimo-latin-" + w + "-normal.woff2")).toString("base64") + ") format('woff2');}";
const FONTS = "/* Arimo: SIL Open Font License 1.1, Copyright 2020 The Arimo Project Authors (https://github.com/googlefonts/arimo) */\n" + font(400) + font(700) + "\n";
const UI = fs.readdirSync(path.join(ROOT, "src", "ui")).filter((f) => f.endsWith(".js")).sort().map((f) => "// ===== " + f + " =====\n" + r("ui/" + f)).join("\n");
let html = r("template.html");
html = html.replace("<!--LOGO-->", '<img src="' + svgUri(APP.logo || "").replace(/"/g, "&quot;") + '" alt="" width="132" height="132">');
const parts = {
  "/*ITEMS*/": "var ITEMS_TXT = " + JSON.stringify(r("items.txt")) + ";\nvar FAMILIES_TXT = " + JSON.stringify(r("families.txt")) + ";\nvar ICONS_ALL = " + JSON.stringify(out) + ";",
  "/*CSS*/": FONTS + r("style.css"), "/*DATA*/": r("data.js"), "/*ENGINE*/": r("engine.js"), "/*UI*/": "(function () {\n" + UI + "\n})();"
};
for (const k in parts) html = html.split(k).join(parts[k].replace(/<\/script/gi, "<\\/script"));
const DIST = path.join(ROOT, "dist");
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, "index.html"), html);
// --- sovelluskuvake ja manifest (kotinäytölle lisättäessä) ---
if (APP.appicon) fs.writeFileSync(path.join(DIST, "icon.svg"), svgDoc(APP.appicon));
["icon-192.png", "icon-512.png", "apple-touch-icon.png"].forEach((f) => { const p = path.join(ROOT, "art", "app", f); if (fs.existsSync(p)) fs.copyFileSync(p, path.join(DIST, f)); });
fs.writeFileSync(path.join(DIST, "manifest.webmanifest"), JSON.stringify({
  name: "Kepistä kaikkeen", short_name: "Kepistä", lang: "fi", start_url: ".", display: "standalone", background_color: "#ece5d6", theme_color: "#ece5d6",
  icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }, { src: "icon-512.png", sizes: "512x512", type: "image/png" }, { src: "icon.svg", sizes: "any", type: "image/svg+xml" }]
}, null, 2));
try { fs.unlinkSync(path.join(DIST, "icons.json")); } catch (e) {}
console.log("index.html " + (html.length / 1024).toFixed(0) + " kt, " + Object.keys(out).length + " kuvaa, puuttuu: " + (missing.join(" ") || "ei mitään") + (errors.length ? " VIRHEET: " + errors.join("; ") : ""));
if (missing.length || errors.length) process.exitCode = 1;
module.exports = { missing, errors };
