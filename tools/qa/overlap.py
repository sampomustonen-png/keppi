# Asettelutarkistus: etsii tekstejä, jotka menevät kuvan tai toisen tekstin päälle tai näytön reunan yli.
# node tools/qa/gen_states.js && python3 tools/qa/overlap.py [leveys ...]
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CHROME, URL, OUT, states, store_for, set_store
from playwright.async_api import async_playwright
ALL = states()
TODAY_JS = "(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()"
STATES = ALL[::2] + [x for x in ALL if x['name'].startswith('pisimmat') and x not in ALL[::2]]
CHECK_JS = r"""
(label) => {
  const vis = (el) => { const dt = el.closest('details'); if (dt && !dt.open && !el.closest('summary')) return false; for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false; } return true; };
  const root = document.querySelector('.moment.show') || [...document.querySelectorAll('.sheet.show')].pop() || document.getElementById('app');
  const vw = document.documentElement.clientWidth;
  const T = [], I = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.trim(); if (!t) continue;
    const el = n.parentElement; if (!vis(el) || el.closest('.em')) continue;
    let clip = { l: -1e9, r: 1e9, t: -1e9, b: 1e9 };
    for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e);
      if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const q = e.getBoundingClientRect(); clip = { l: Math.max(clip.l, q.left), r: Math.min(clip.r, q.right), t: Math.max(clip.t, q.top), b: Math.min(clip.b, q.bottom) }; } }
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const r0 of rg.getClientRects()) { if (r0.width < 1 || r0.height < 1) continue;
      const sh = r0.height * 0.16;
      const r = { l: Math.max(r0.left, clip.l), r: Math.min(r0.right, clip.r), t: Math.max(r0.top + sh, clip.t), b: Math.min(r0.bottom - sh, clip.b) };
      if (r.r - r.l < 1 || r.b - r.t < 1) continue;
      r.el = el; r.txt = t.slice(0, 28); T.push(r); }
  }
  const clipOf = (el) => { let c = { l: -1e9, r: 1e9, t: -1e9, b: 1e9 };
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e);
      if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const q = e.getBoundingClientRect(); c = { l: Math.max(c.l, q.left), r: Math.min(c.r, q.right), t: Math.max(c.t, q.top), b: Math.min(c.b, q.bottom) }; } }
    return c; };
  root.querySelectorAll('img.ico, .em').forEach((el) => { if (!vis(el)) return; const r = el.getBoundingClientRect(); if (r.width < 2) return;
    // kuvan oma tyhjä reuna pois: piirrokset käyttävät 64-ruudusta noin keskimmäiset 85 %
    const m = r.width * 0.07, c = clipOf(el);
    const q = { l: Math.max(r.left + m, c.l), r: Math.min(r.right - m, c.r), t: Math.max(r.top + m, c.t), b: Math.min(r.bottom - m, c.b), el };
    if (q.r - q.l > 1 && q.b - q.t > 1) I.push(q); });
  const ov = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
  const out = [];
  for (let i = 0; i < T.length; i++) {
    const a = T[i];
    if (a.l < -0.5 || a.r > vw + 0.5) out.push('reunan yli: "' + a.txt + '"');
    if (a.el.closest('.plate')) out.push('teksti lautasella: "' + a.txt + '"');
    for (let j = i + 1; j < T.length; j++) { const b = T[j]; if (a.el === b.el && a.txt === b.txt) continue; if (ov(a, b)) out.push('teksti tekstin päällä: "' + a.txt + '" / "' + b.txt + '"'); }
    for (const b of I) if (ov(a, b)) out.push('teksti kuvan päällä: "' + a.txt + '"');
  }
  // tekstiä leikattu piiloon (ei rivinrajausta lasketa virheeksi, raportoidaan erikseen)
  root.querySelectorAll('*').forEach((el) => { if (!vis(el) || !el.childNodes.length) return; const cs = getComputedStyle(el);
    if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 1 && el.textContent.trim() && !el.closest('.trail')) out.push('leikattu: "' + el.textContent.trim().slice(0, 28) + '"'); });
  return [...new Set(out)];
}
"""
async def main():
    vps = [(320,568),(360,640),(375,667),(390,844),(414,736),(430,932),(768,1024),(1280,720)]
    if len(sys.argv) > 1: vps = [v for v in vps if str(v[0]) in sys.argv[1:]]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        total = 0; seen = {}
        for vw, vh in vps:
            ctx = await b.new_context(viewport={"width":vw,"height":vh}, device_scale_factor=1)
            pg = await ctx.new_page()
            errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(300)
            ids = await pg.evaluate("DATA.ITEMS.map(x=>x.id)")
            fams = await pg.evaluate("DATA.FAMILIES.map(x=>x.id)")
            for known in (True, False):
                for st in STATES:
                    s = st["s"]; s["ui"] = {"top": 18, "newIds": [], "arm": None}
                    if st["name"].startswith("pisimmat"): s["ui"]["arm"] = 1; s["ui"]["chg"] = {"r": 1.37, "uid": s["hand"]["uid"]}
                    if s.get("mode") == "paiva": s["date"] = await pg.evaluate(TODAY_JS)
                    await set_store(pg, store_for(s, ids if known else [], fams if known else []))
                    await pg.reload(); await pg.wait_for_selector("#btnResume", timeout=5000)
                    await pg.wait_for_timeout(250)
                    if st is STATES[0] and known: 
                        r = await pg.evaluate(CHECK_JS, "start")
                        for x in r: seen.setdefault(x, []).append(f"{vw}x{vh} aloitus")
                    await pg.click("#btnResume"); await pg.wait_for_timeout(700)
                    r = await pg.evaluate(CHECK_JS, st["name"])
                    for x in r: seen.setdefault(x, []).append(f"{vw}x{vh} {st['name']}{'' if known else ' (tuntemattomat)'}")
                    total += 1
                    if st["name"] == "pisimmat-nimet-kallis" and known:
                        await pg.screenshot(path=os.path.join(OUT, f"qa_{vw}x{vh}.png"), full_page=True)
            for e in errs[:3]: seen.setdefault("JS-virhe: " + e[:80], []).append(f"{vw}x{vh}")
            await ctx.close()
        await b.close()
    print("tarkistettuja näkymiä", total, "· ongelmia", len(seen))
    for k, v in sorted(seen.items(), key=lambda kv: -len(kv[1]))[:40]:
        print(f"{len(v):4d}  {k}   esim. {v[0]}")
if __name__ == "__main__":
    asyncio.run(main())
