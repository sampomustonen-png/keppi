# Pelaa oikeasti napautuksilla ja tarkistaa asettelun myös hetkissä (porras, kokoelma, vuodenaika), loppunäkymässä,
# löydöissä, haasteissa, siirrossa ja valikossa. node tools/qa/gen_states.js && python3 tools/qa/flow.py [leveys ...]
import asyncio, json, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CHROME, URL, OUT, states, store_for, set_store
from overlap import CHECK_JS, TODAY_JS
from playwright.async_api import async_playwright
random.seed(4)
STATES = states()
async def run_vp(b, vw, vh, seen):
    ctx = await b.new_context(viewport={"width": vw, "height": vh})
    pg = await ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto(URL); await pg.wait_for_timeout(300)
    ids = await pg.evaluate("DATA.ITEMS.map(x=>x.id)")
    fams = await pg.evaluate("DATA.FAMILIES.map(x=>x.id)")
    async def chk(where):
        for x in await pg.evaluate(CHECK_JS, where): seen.setdefault(x, []).append(f"{vw}x{vh} {where}")
    async def moments():
        for _ in range(6):
            if await pg.is_visible(".moment.show"):
                await chk("hetki"); await pg.click(".moment.show"); await pg.wait_for_timeout(350); continue
            if await pg.is_visible("#seasonSheet.show"):
                await chk("vuodenaika"); await pg.click("#btnSeason"); await pg.wait_for_timeout(350); continue
            break
    # aloitus jokaisessa pelimuodossa
    await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(300)
    await chk("aloitus, ensimmäinen kerta")
    for m in ["vuosi", "pika", "paiva"]:
        await pg.click(f'[data-mode="{m}"]'); await pg.wait_for_timeout(150); await chk("aloitus " + m)
    # keskeneräinen vuosi, osa kokoelmista valmiina
    for name, n in [("vuosi11", 3), ("pika44", 2)]:
        st = json.loads(json.dumps([x for x in STATES if x["name"].startswith(name)][n]["s"]))
        st["ui"] = {"top": 2, "newIds": [], "arm": None}
        await set_store(pg, store_for(st, ids[:400], fams[:6], best={"1": 200}))
        await pg.reload(); await pg.wait_for_selector("#btnResume"); await pg.wait_for_timeout(300)
        await chk("aloitus, jatka " + name)
        await pg.click("#btnResume"); await pg.wait_for_timeout(500)
        for day in range(22):
            await moments()
            if await pg.is_visible("#endSheet.show"): await chk("loppu"); break
            await chk("päivä " + name)
            alts = await pg.query_selector_all(".alt:not(.void)")
            k = random.random()
            if k < 0.12:
                await pg.click("#btnSkip")
            elif k < 0.2 and await pg.query_selector(".slot:not(.empty)"):
                await pg.click(".drop"); await pg.wait_for_timeout(150); await chk("heitä pois -vahvistus"); await pg.click(".slot:not(.empty)")
            elif alts:
                await random.choice(alts).click(); await pg.wait_for_timeout(260); await chk("vaihto käynnissä")
            await pg.wait_for_timeout(1300)
            await chk("vaihdon jälkeen")
    await moments()
    await pg.click("#btnBook"); await pg.wait_for_timeout(400); await chk("löydöt")
    for k in ["val", "fam"]:
        await pg.click(f"#sort-{k}"); await pg.wait_for_timeout(250); await chk("löydöt " + k)
    await pg.click("#btnBookClose"); await pg.click("#btnMenu"); await pg.wait_for_timeout(200); await chk("valikko")
    await pg.click("#btnCh"); await pg.wait_for_timeout(250); await chk("haasteet"); await pg.click("#btnChClose")
    await pg.click("#btnMenu"); await pg.click("#btnTransfer"); await pg.wait_for_timeout(200); await chk("siirto")
    await pg.click("#btnExport"); await pg.wait_for_timeout(500); await chk("siirto, koodi")
    await pg.click("#btnTrClose"); await pg.click("#btnMenu")
    await pg.click("#btnRestart"); await pg.wait_for_timeout(150); await chk("valikko vahvistus")
    await pg.click("#btnCancel"); await pg.click("#btnMenuClose")
    # loppu: viimeinen päivä, myös päivän vuosi
    for name in ["pisimmat-nimet-kallis", "paiva55"]:
        st2 = json.loads(json.dumps([x for x in STATES if x["name"].startswith(name)][-1]["s"]))
        st2["day"] = st2["days"]; st2["ui"] = {"top": 18, "newIds": [], "arm": None}
        if st2.get("mode") == "paiva": st2["date"] = await pg.evaluate(TODAY_JS)
        await set_store(pg, store_for(st2, ids[:400], fams[:6]))
        await pg.reload(); await pg.wait_for_selector("#btnResume"); await pg.click("#btnResume"); await pg.wait_for_timeout(400)
        await pg.click("#btnSkip"); await pg.wait_for_timeout(1500)
        for _ in range(4):
            await moments()
        if await pg.is_visible("#endSheet.show"):
            await chk("loppunäkymä " + name); await pg.screenshot(path=os.path.join(OUT, f"end_{vw}_{name}.png"), full_page=True)
        else: seen.setdefault("loppunäkymää ei avautunut", []).append(f"{vw}x{vh} {name}")
    if errs: seen.setdefault("JS-virhe: " + errs[0][:80], []).append(f"{vw}x{vh}")
    await ctx.close()
async def main():
    seen = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        vps = [(320, 568), (360, 640), (390, 844), (768, 1024)]
        if len(sys.argv) > 1: vps = [v for v in vps if str(v[0]) in sys.argv[1:]]
        for vw, vh in vps:
            await run_vp(b, vw, vh, seen)
        await b.close()
    print("ongelmia", len(seen))
    for k, v in sorted(seen.items(), key=lambda kv: -len(kv[1]))[:40]: print(f"{len(v):4d}  {k}   esim. {v[0]}")
asyncio.run(main())
