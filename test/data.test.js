// Sisällön eheys: esineet, portaat, kokoelmat ja kuvat
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const D = require("../src/data.js");
const ART = require("../art/draw.js");

test("esineiden tunnisteet ovat yksilöllisiä ja arvot järkeviä", () => {
  const seen = new Set();
  D.ITEMS.forEach((it) => {
    assert.ok(!seen.has(it.id), "sama tunniste kahdesti: " + it.id);
    seen.add(it.id);
    assert.ok(it.v > 0 && isFinite(it.v), "arvo puuttuu: " + it.id);
    assert.ok(it.tags.length > 0, "tagit puuttuvat: " + it.id);
    it.tags.forEach((t) => assert.ok(D.TAGS[t] || t === "tuore" || (t === "kaikki" && it.id === "kaikki"), "tuntematon tagi " + t + " (" + it.id + ")"));
  });
  assert.ok(D.BY_ID.keppi && D.BY_ID.kaikki, "keppi ja kaikki löytyvät");
});

test("jokaisella portaalla on esineitä", () => {
  for (let t = 0; t < D.TIERS.length; t++) assert.ok(D.ITEMS.some((it) => it.tier === t), "porras " + (t + 1) + " on tyhjä");
});

test("kokoelmat viittaavat olemassa oleviin esineisiin", () => {
  assert.deepStrictEqual(D.FAM_ERRORS, []);
  D.FAMILIES.forEach((f) => assert.ok(f.items.length >= 3, "liian pieni kokoelma: " + f.name));
});

test("jokaisella esineellä, muuntimella ja käyttöliittymän kuvalla on piirros", () => {
  ART.loadDir(fs, path.join(__dirname, "..", "art", "items"));
  D.ITEMS.forEach((it) => {
    assert.ok(ART.SOURCES[it.id], "piirros puuttuu: " + it.id);
    assert.doesNotThrow(() => ART.draw(ART.SOURCES[it.id]), "piirros ei toimi: " + it.id);
  });
  ["mods.txt", "ui.txt", "app.txt"].forEach((f) => {
    fs.readFileSync(path.join(__dirname, "..", "art", f), "utf8").split("\n").filter((l) => l.trim() && l[0] !== "#").forEach((l) => {
      const i = l.indexOf("|");
      assert.doesNotThrow(() => ART.draw(l.slice(i + 1)), f + ": " + l.slice(0, i));
    });
  });
  Object.values(D.LOOKS).forEach((L) => assert.ok(!L.o, "vanha emojikerros jäljellä"));
});
