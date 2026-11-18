# Nopea savutesti: aloitus, pelimuodot, muutama päivä, löydöt, haasteet, siirto. python3 tools/qa/smoke.py [url]
import asyncio, os, sys
from playwright.async_api import async_playwright
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CHROME, OUT, URL as BASE_URL
URL = sys.argv[1] if len(sys.argv) > 1 else BASE_URL
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": 390, "height": 844})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        await pg.screenshot(path=os.path.join(OUT, "sm_start.png"))
        for mode in ["pika", "paiva", "vuosi"]:
            await pg.click(f'[data-mode="{mode}"]'); await pg.wait_for_timeout(150)
        await pg.click('[data-mode="paiva"]'); await pg.click("#btnNew"); await pg.wait_for_timeout(600)
        for i in range(12):
            if await pg.is_visible(".moment.show"): await pg.click(".moment.show"); await pg.wait_for_timeout(300)
            if await pg.is_visible("#seasonSheet.show"): await pg.click("#btnSeason"); await pg.wait_for_timeout(300)
            alts = await pg.query_selector_all(".alt:not(.void)")
            if alts: await alts[i % len(alts)].click()
            await pg.wait_for_timeout(1300)
        await pg.screenshot(path=os.path.join(OUT, "sm_game.png"))
        await pg.click("#btnBook"); await pg.click("#sort-fam"); await pg.wait_for_timeout(300); await pg.screenshot(path=os.path.join(OUT, "sm_fam.png"))
        await pg.click("#btnBookClose"); await pg.click("#btnMenu"); await pg.click("#btnCh"); await pg.wait_for_timeout(200); await pg.screenshot(path=os.path.join(OUT, "sm_ch.png"))
        await pg.click("#btnChClose"); await pg.click("#btnMenu"); await pg.click("#btnTransfer"); await pg.click("#btnExport"); await pg.wait_for_timeout(500)
        code = await pg.input_value("#transferIn"); print("siirtokoodi", code[:12], len(code))
        await pg.click("#btnImport"); await pg.wait_for_timeout(400); print("tuonti:", await pg.inner_text("#transferMsg"))
        print("virheet:", errs[:5])
        await b.close()
asyncio.run(main())
