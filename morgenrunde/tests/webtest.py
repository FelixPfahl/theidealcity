# Test der öffentlichen Webversion: echter Webserver, Android-Geräte, Speichern im Browser, Neuladen, Funkloch.
# Aufruf: python3 -I webtest.py <ordner-mit-web/>
import json, sys, random, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

root = sys.argv[1]
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Q, directory=root)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{port}/index.html"
FIX = "() => { const F=new Date('2026-10-29T06:35:00+01:00').getTime(); const R=Date; class D extends R{constructor(...a){ if(!a.length) super(F); else super(...a);} static now(){return F;}} window.Date=D; }"
CASES = [("Pixel 7", "light"), ("Galaxy S24", "dark"), ("Galaxy S8", "light"), ("Galaxy Z Fold 7 Cover", "dark"),
 ("Desktop Chrome", "light"), ("Desktop Chrome HiDPI", "dark"), ("Desktop Firefox", "light"), ("Desktop Edge", "light")]
UA_SAMSUNG = "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36"
out = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for dev, scheme in CASES:
        probs = []; d = dict(p.devices[dev]); d.pop("default_browser_type", None)
        if dev == "Galaxy S24": d["user_agent"] = UA_SAMSUNG
        kb = dev.startswith("Desktop")
        if dev == "Desktop Chrome HiDPI": d["viewport"] = {"width": 1920, "height": 1080}
        ctx = b.new_context(**d, color_scheme=scheme, locale="de-DE", timezone_id="Europe/Berlin")
        ctx.add_init_script("(" + FIX + ")()")
        page = ctx.new_page()
        page.on("pageerror", lambda e: probs.append(f"Skriptfehler: {e}"))
        page.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
        try:
            page.goto(URL); page.wait_for_selector("#start", timeout=8000)
            (page.keyboard.press("Enter") if kb else page.tap("#start")); rnd = random.Random(dev)
            for i in range(20):
                page.wait_for_selector(".opt")
                if i == 10:  # Neuladen mitten im Heft
                    page.reload(); page.wait_for_selector("#start", timeout=8000)
                    if (page.text_content("#start") or "") != "Weiterlesen": probs.append("nach Neuladen kein Weiterlesen")
                    (page.keyboard.press("Enter") if kb else page.tap("#start")); page.wait_for_selector(".opt")
                if kb:
                    page.keyboard.press(str(rnd.randrange(4) + 1)); page.wait_for_selector(".reveal"); page.keyboard.press("Enter")
                else:
                    opts = page.query_selector_all(".opt"); opts[rnd.randrange(len(opts))].tap(); page.wait_for_selector(".reveal"); page.tap("#next")
            page.wait_for_selector("#bossReveal")
            if kb: page.keyboard.press("Enter"); page.wait_for_selector(".check"); page.keyboard.press("1"); page.keyboard.press("Enter")
            else: page.tap("#bossReveal"); page.tap(".check[data-pt='0']"); page.tap("#bossDone")
            page.wait_for_selector(".big")
            w = page.evaluate("() => [document.documentElement.scrollWidth, innerWidth]")
            if w[0] > w[1] + 1: probs.append(f"seitliches Scrollen {w}")
            st = page.evaluate("() => JSON.parse(localStorage.getItem('morgenrunde-web-v1')||'{}')")
            r = st.get("results/2026-10-29", {})
            if not r.get("finished") or len(r.get("answers", {})) != 20: probs.append("Ergebnis nicht im Browser gespeichert")
            if not st.get("meta/profile", {}).get("totalPoints") and r.get("points"): probs.append("Profil fehlt")
            # Funkloch: Seite ohne Netz neu laden, Heft muss aus dem Zwischenspeicher kommen
            page.route("**/hefte/**", lambda r: r.abort())
            page.reload(); page.wait_for_selector("#start", timeout=8000)
            if (page.text_content("#start") or "") != "Heft ansehen": probs.append("offline: Heft nicht aus dem Zwischenspeicher")
        except Exception as e:
            probs.append("Abbruch " + str(e).splitlines()[0])
        ctx.close(); out.append((dev, scheme, probs))
        print(("OK    " if not probs else "FEHLER") + f"  {dev} · {scheme}" + ("" if not probs else "\n        " + "\n        ".join(probs)), flush=True)
    b.close()
srv.shutdown()
print(f"{sum(1 for o in out if not o[2])} von {len(out)} Webfällen fehlerfrei")
