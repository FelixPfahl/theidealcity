"""Browsertest für Pult. Aufruf: python3 -I werkzeuge/test.py  (braucht playwright mit chromium)"""
import json, os, shutil, sys, tempfile, threading, functools, http.server
from playwright.sync_api import sync_playwright
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = os.environ.get("ATELIER_SCHLUESSEL", "")
heute = json.load(open(os.path.join(root, "daten", "klar", "heute.json"), encoding="utf-8"))
Y, M, D = map(int, heute["date"].split("-"))
tmp = tempfile.mkdtemp()
shutil.copy(os.path.join(root, "index.html"), tmp)
os.makedirs(os.path.join(tmp, "daten"))
shutil.copy(os.path.join(root, "daten", "heute.json"), os.path.join(tmp, "daten"))
morgen = dict(heute, label="Testmorgen")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import geheim
json.dump(geheim.seal(morgen, KEY) if KEY else morgen, open(os.path.join(tmp, "daten", "morgen.json"), "w"))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = functools.partial(Q, directory=tmp)
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = "http://127.0.0.1:%d/index.html" % srv.server_address[1]
lessons = [i for i in heute["items"] if i["type"] == "lesson"]
def mins(t): h, m = map(int, t.split(":")); return h*60+m
times = set()
for l in lessons:
    s, e = mins(l["start"]), mins(l["end"])
    times |= {s-20, s+1, (s+e)//2, e-2}
times.add(mins(lessons[-1]["end"]) + 30)
fails, errs = [], []
def clock(d, m):
    return f"""(()=>{{const R=Date;const base=new R({Y},{M-1},{d},{m//60},{m%60},0).getTime();const st=R.now();
    class X extends R{{constructor(...a){{if(a.length)super(...a);else super(base+(R.now()-st));}} static now(){{return base+(R.now()-st);}}}}window.Date=X;}})();"""
with sync_playwright() as p:
    b = p.chromium.launch()
    def page(d, m, block_data=False):
        ctx = b.new_context(viewport={"width": 390, "height": 844})
        ctx.add_init_script(clock(d, m))
        ctx.add_init_script("try{localStorage.setItem('atelier-schluessel', %s)}catch(e){}" % json.dumps(geheim.norm(KEY)))
        if block_data: ctx.route("**/daten/*", lambda r: r.abort())
        ctx.route("https://fonts.*/**", lambda r: r.abort())
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(400)
        return ctx, pg
    for m in sorted(times):
        ctx, pg = page(D, m)
        txt = pg.inner_text("#leiste") + " | " + pg.inner_text("#view")
        for v in ("tag", "spick", "notiz", "jetzt"):
            pg.click(f'.nav button[data-v="{v}"]'); pg.wait_for_timeout(30)
            if pg.evaluate("document.documentElement.scrollWidth") > 390: fails.append(f"{m//60}.{m%60:02d} Überlauf in {v}")
        if pg.locator('[data-act="weiter"]').count():
            before = pg.inner_text("#lph")
            pg.click('[data-act="plus"]'); pg.click('[data-act="weiter"]'); pg.wait_for_timeout(50)
            if pg.inner_text("#lph") == before: fails.append(f"{m//60}.{m%60:02d} Weiter springt nicht")
            pg.click('[data-act="undo"]'); pg.click('[data-act="undo"]')
        print(f"{m//60}.{m%60:02d}", txt.replace("\n"," ")[:90])
        ctx.close()
    ctx, pg = page(D, mins(lessons[0]["start"]) + 1, block_data=True)
    if "Noch keine Daten" in pg.inner_text("#leiste"): fails.append("Offline: eingebettete Daten greifen nicht")
    ctx.close()
    ctx, pg = page(D + 1, 9*60)
    if "Noch keine Daten" not in pg.inner_text("#leiste"): fails.append("Folgetag ohne Daten wird nicht erkannt")
    ctx.close()
    ctx, pg = page(D, 7*60)
    pg.click('.nav button[data-v="tag"]'); pg.click('[data-day="morgen"]'); pg.wait_for_timeout(50)
    if "testmorgen" not in pg.inner_text("#view").lower(): fails.append("Morgen-Ansicht zeigt morgen.json nicht")
    pg.click('.nav button[data-v="notiz"]'); pg.fill("#nText", "Test"); pg.wait_for_timeout(600); pg.reload(); pg.wait_for_timeout(400)
    pg.click('.nav button[data-v="notiz"]')
    if pg.input_value("#nText") != "Test": fails.append("Notiz wird nicht gespeichert")
    ctx.close()
    b.close()
srv.shutdown()
print("FEHLER:", fails + errs if fails or errs else "keine")
sys.exit(1 if fails or errs else 0)
