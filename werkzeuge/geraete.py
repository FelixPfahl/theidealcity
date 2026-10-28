"""Geräte-Test (Chrome-Emulation) für eine App im Ordner.
Aufruf: python3 -I werkzeuge/geraete.py <ordner> <startdatei> <name> [JJJJ-MM-TT HH:MM]"""
import sys, os, json, threading, functools, http.server
from playwright.sync_api import sync_playwright
root, start, name = sys.argv[1], sys.argv[2], sys.argv[3]
when = sys.argv[4] if len(sys.argv) > 4 else "2026-10-28 11:52"
d, t = when.split(); Y, M, D = map(int, d.split("-")); h, mi = map(int, t.split(":"))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = "http://127.0.0.1:%d/%s" % (srv.server_address[1], start)
CLOCK = f"""(()=>{{const R=Date;const base=new R({Y},{M-1},{D},{h},{mi},0).getTime();const st=R.now();
class X extends R{{constructor(...a){{if(a.length)super(...a);else super(base+(R.now()-st));}} static now(){{return base+(R.now()-st);}}}}window.Date=X;}})();"""
DEVICES = ["Pixel 7", "Pixel 7 landscape", "Galaxy S9+", "Galaxy S8", "iPhone SE", "iPhone 13", "iPhone 15 Pro Max", "iPad Mini", "Galaxy Tab S4"]
DESKTOPS = [("Desktop 1366x768", 1366, 768), ("Desktop 1920x1080", 1920, 1080), ("Fenster 1024x700", 1024, 700)]
fails = []
with sync_playwright() as p:
    b = p.chromium.launch()
    configs = [(n, dict(p.devices[n])) for n in DEVICES if n in p.devices]
    configs += [(n, {"viewport": {"width": w, "height": hh}}) for n, w, hh in DESKTOPS]
    for n, cfg in configs:
        cfg.pop("default_browser_type", None)
        ctx = b.new_context(**cfg)
        ctx.add_init_script(CLOCK)
        ctx.route("https://fonts.*/**", lambda r: r.abort())
        ctx.route("https://raw.githack.com/**", lambda r: r.abort())
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:120]))
        pg.goto(url); pg.wait_for_timeout(600)
        vw = pg.evaluate("innerWidth")
        sw = pg.evaluate("document.documentElement.scrollWidth")
        if sw > vw + 1: fails.append(f"{n}: seitlich {sw - vw}px zu breit")
        # sichtbare Buttons müssen groß genug zum Tippen sein (mind. 40px hoch)
        small = pg.evaluate("""[...document.querySelectorAll('button,a.tile')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&r.height&&r.height<40}).length""")
        if small and cfg.get("has_touch"): fails.append(f"{n}: {small} Tippflächen unter 40px")
        # abgeschnittener Text
        clipped = pg.evaluate("""[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+1&&getComputedStyle(e).position!=='fixed'}).length""")
        if clipped: fails.append(f"{n}: {clipped} Elemente ragen über den Rand")
        if name == "pult":
            for v in ("tag", "spick", "notiz", "jetzt"):
                pg.click(f'.nav button[data-v="{v}"]'); pg.wait_for_timeout(40)
                if pg.evaluate("document.documentElement.scrollWidth") > vw + 1: fails.append(f"{n}: Ansicht {v} zu breit")
            # Restzeit muss ohne Scrollen sichtbar sein
            r = pg.evaluate("(()=>{const e=document.querySelector('#cd');if(!e)return null;const r=e.getBoundingClientRect();return [r.top,r.bottom]})()")
            nav_top = pg.evaluate("document.querySelector('.nav').getBoundingClientRect().top")
            if r and r[1] > nav_top: fails.append(f"{n}: Restzeit erst nach Scrollen sichtbar")
            if not cfg.get("has_touch"):
                before = pg.inner_text(".ptitle"); pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(60)
                if pg.inner_text(".ptitle") == before: fails.append(f"{n}: Taste Weiter wirkt nicht")
                pg.keyboard.press("z"); pg.keyboard.press("2"); pg.wait_for_timeout(40)
                if not pg.locator('[data-day="morgen"]').count(): fails.append(f"{n}: Taste 2 öffnet Tag nicht")
        if os.path.exists(os.path.join(root, "manifest.json")):
            m = pg.evaluate("fetch('manifest.json').then(r=>r.json())")
            for ic in m["icons"]:
                st = pg.evaluate(f"fetch('{ic['src']}').then(r=>r.status)")
                if st != 200: fails.append(f"Icon fehlt: {ic['src']}")
        if errs: fails.append(f"{n}: Skriptfehler {errs[:2]}")
        pg.screenshot(path=f"/tmp/geraet_{name}_{n.replace(' ','_')}.png")
        print(f"{n:22} {vw}px ok" if not any(f.startswith(n) for f in fails) else f"{n:22} {vw}px PROBLEM")
        ctx.close()
    b.close()
srv.shutdown()
print("FEHLER:", sorted(set(fails)) if fails else "keine")
sys.exit(1 if fails else 0)
