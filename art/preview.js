const fs = require("fs"); const { draw, loadDir } = require("./draw.js"); loadDir(fs, __dirname + "/items");
const D = require("../src/data.js");
const file = process.argv[2] || "sample.txt", out = process.argv[3] || "preview.html", cols = +process.argv[4] || 6;
const rows = fs.readFileSync(file, "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => { const i = l.indexOf("|"); return [l.slice(0, i), l.slice(i + 1)]; });
let cells = "", errs = [];
rows.forEach(([id, src]) => {
  let svg;
  try { svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + draw(src) + "</svg>"; } catch (e) { errs.push(id + ": " + e.message); return; }
  const it = D.BY_ID[id]; if (!it) errs.push("tuntematon id " + id);
  cells += `<div class="cell"><div class="plate"><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"></div><span>${it ? it.name : id}</span></div>`;
});
fs.writeFileSync(out, `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#ece5d6;font:600 14px system-ui;color:#27241f;padding:24px}.g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:18px 12px}.cell{display:grid;justify-items:center;gap:6px;text-align:center}.plate{width:104px;height:104px;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);display:grid;place-items:center}.plate img{width:72px;height:72px}</style><div class=g>${cells}</div>`);
console.log(rows.length, "kuvaa", errs.length ? "VIRHEET: " + errs.join("; ") : "ok");
