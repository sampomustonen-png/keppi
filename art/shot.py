import asyncio, os, sys
# Ottaa kuvakaappauksen esikatselusivusta: python3 art/shot.py sivu.html kuva.png [leveys]
CHROME = os.environ.get("CHROME") or ("/usr/bin/google-chrome" if os.path.exists("/usr/bin/google-chrome") else None)
from playwright.async_api import async_playwright
async def main(src, out, w):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        pg = await (await b.new_context(viewport={"width":w,"height":900}, device_scale_factor=1)).new_page()
        await pg.goto("file://"+os.path.abspath(src)); await pg.wait_for_timeout(300)
        await pg.screenshot(path=out, full_page=True)
        await b.close()
asyncio.run(main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv)>3 else 1400))
