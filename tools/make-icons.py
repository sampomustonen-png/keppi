# Piirtää sovelluskuvakkeen PNG-koot (art/app/) kuvasta dist/icon.svg. Aja rakennuksen jälkeen: python3 tools/make-icons.py
import asyncio, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.environ.get("CHROME") or ("/usr/bin/google-chrome" if os.path.exists("/usr/bin/google-chrome") else None)
async def main():
    svg = open(os.path.join(ROOT, "dist", "icon.svg")).read()
    os.makedirs(os.path.join(ROOT, "art", "app"), exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for name, size in [("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)]:
            pg = await b.new_page(viewport={"width": size, "height": size})
            await pg.set_content('<html><body style="margin:0;background:#ece5d6">' + svg.replace("<svg ", '<svg width="%d" height="%d" ' % (size, size)) + "</body></html>")
            await pg.screenshot(path=os.path.join(ROOT, "art", "app", name), omit_background=False)
            await pg.close()
        await b.close()
asyncio.run(main())
