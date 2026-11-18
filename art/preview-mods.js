// Esikatselu muuntimien piirretyille kerroksille: node art/preview-mods.js mods.html
const fs = require("fs"); const path = require("path");
const { draw, loadDir } = require("./draw.js"); loadDir(fs, path.join(__dirname, "items"));
const D = require("../src/data.js");
const mods = {}; fs.readFileSync(path.join(__dirname, "mods.txt"), "utf8").split("\n").filter((l) => l.trim() && l[0] !== "#").forEach((l) => { const i = l.indexOf("|"); mods[l.slice(0, i)] = l.slice(i + 1); });
const uri = (src) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + draw(src) + "</svg>");
const items = ["kitara", "auto", "omena", "linna"];
let cells = "";
D.MODS.concat([D.SPECIAL_MODS.pilaantunut]).forEach((m) => {
  const L = D.LOOKS[m.look] || {};
  items.forEach((id) => {
    const lay = (k, cls) => (mods[k] ? `<img class="${cls}" src="${uri(mods[k])}">` : "");
    cells += `<div class="cell"><div class="plate"><span class="lay" style="${L.s ? "transform:scale(" + L.s + ")" : ""}">${lay("~" + m.look + "<", "l")}<img style="filter:${L.f || "none"}" src="${uri(fs.readFileSync ? require("./draw.js").SOURCES[id] : "")}">${lay("~" + m.look + ">", "l")}</span></div><span>${m.name} ${D.BY_ID[id].name.toLowerCase()}</span></div>`;
  });
});
fs.writeFileSync(process.argv[2] || "mods.html", `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#ece5d6;font:600 13px Arial;color:#27241f;padding:20px}.g{display:grid;grid-template-columns:repeat(8,1fr);gap:14px 8px}.cell{display:grid;justify-items:center;gap:4px;text-align:center}.plate{width:96px;height:96px;border-radius:50%;background:rgba(255,255,255,.55);display:grid;place-items:center}.lay{position:relative;width:64px;height:64px;display:inline-block}.lay img{width:64px;height:64px;position:absolute;inset:0}</style><div class=g>${cells}</div>`);
console.log("ok");
