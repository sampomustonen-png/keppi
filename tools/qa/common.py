# Yhteiset asetukset selaintesteille. Peli tarjoillaan paikallisesti: npm run serve (tai QA_URL=...).
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)
CHROME = os.environ.get("CHROME") or ("/usr/bin/google-chrome" if os.path.exists("/usr/bin/google-chrome") else None)
URL = os.environ.get("QA_URL", "http://127.0.0.1:8765/index.html")
LS = "kepista-kaikkeen.v2"
def states():
    p = os.path.join(OUT, "states.json")
    if not os.path.exists(p): raise SystemExit("aja ensin: node tools/qa/gen_states.js")
    return json.load(open(p))
def store_for(s, ids, fams=None, **kw):
    st = {"saves": {"vuosi": None, "pika": None, "paiva": None}, "book": ids, "fams": fams or [], "ach": {}, "sound": False,
          "runs": 3, "wins": 1, "unlocked": 5, "level": s.get("level", 1), "mode": s.get("mode", "vuosi"), "best": {},
          "daily": {"last": None, "streak": 2, "bestStreak": 4, "results": {}}, "updatedAt": 0}
    st["saves"][st["mode"]] = s
    st.update(kw)
    return st
async def set_store(pg, store):
    await pg.evaluate("([k, x]) => localStorage.setItem(k, x)", [LS, json.dumps(store)])
