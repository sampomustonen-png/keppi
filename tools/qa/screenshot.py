# README-kuva: aloitus, pelinäkymä ja löydöt rinnakkain → docs/screenshot.png
# node tools/qa/gen_states.js && python3 tools/qa/screenshot.py
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CHROME, URL, OUT, states, store_for, set_store
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
async def main():
    S = states()
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg = await ctx.new_page(); await pg.goto(URL); await pg.wait_for_timeout(300)
        ids = await pg.evaluate("DATA.ITEMS.map(x=>x.id)"); fams = await pg.evaluate("DATA.FAMILIES.map(x=>x.id)")
        outs = []
        await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(600)
        f = os.path.join(OUT, "rd_start.png"); await pg.screenshot(path=f); outs.append(f)
        st = json.loads(json.dumps([x for x in S if x["name"].startswith("vuosi22")][6]["s"]))
        st["ui"] = {"top": 18, "newIds": [], "arm": None, "chg": {"r": 1.18, "uid": st["hand"]["uid"]}}
        await set_store(pg, store_for(st, ids[: len(ids) // 2], fams[:8]))
        await pg.reload(); await pg.wait_for_selector("#btnResume"); await pg.click("#btnResume"); await pg.wait_for_timeout(900)
        f = os.path.join(OUT, "rd_game.png"); await pg.screenshot(path=f); outs.append(f)
        await pg.click("#btnBook"); await pg.click("#sort-fam"); await pg.wait_for_timeout(500)
        f = os.path.join(OUT, "rd_book.png"); await pg.screenshot(path=f); outs.append(f)
        await b.close()
    from PIL import Image
    ims = [Image.open(f).convert("RGB") for f in outs]; ims = [i.resize((i.width // 2, i.height // 2), Image.LANCZOS) for i in ims]
    gap = 24; W = sum(i.width for i in ims) + gap * (len(ims) + 1); H = max(i.height for i in ims) + 2 * gap
    o = Image.new("RGB", (W, H), "#e9e4da"); x = gap
    for i in ims: o.paste(i, (x, gap)); x += i.width + gap
    os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
    o.save(os.path.join(ROOT, "docs", "screenshot.png"), optimize=True); print("docs/screenshot.png", o.size)
asyncio.run(main())
