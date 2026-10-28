"""Rendert alle Folien einer Präsentation als PNG (zum Ansehen).
Aufruf: python3 -I werkzeuge/rendern.py <datei.atelier.json> <ausgabeordner> [fontordner_archivo] [fontordner_jost]"""
import sys, os, json, base64
from playwright.sync_api import sync_playwright
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
css = ""
if len(sys.argv) > 3 and sys.argv[3]:
    f = os.path.join(sys.argv[3], "archivo-latin-wdth-normal.woff2")
    css += "@font-face{font-family:'Archivo';font-weight:100 900;font-stretch:62%% 125%%;src:url(data:font/woff2;base64,%s) format('woff2')}" % base64.b64encode(open(f, "rb").read()).decode()
if len(sys.argv) > 4 and sys.argv[4]:
    for w in ("400", "500", "700", "800"):
        f = os.path.join(sys.argv[4], "jost-latin-%s-normal.woff2" % w)
        css += "@font-face{font-family:'Jost';font-weight:%s;src:url(data:font/woff2;base64,%s) format('woff2')}" % (w, base64.b64encode(open(f, "rb").read()).decode())
p = json.load(open(src, encoding="utf-8"))
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={"width": 2560, "height": 1440})
    pg.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=css))
    pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    pg.goto("file://" + os.path.join(root, "index.html")); pg.wait_for_timeout(500)
    pg.evaluate("p => { window.__p = p; }", p)
    warn = pg.evaluate("check(window.__p).map(w => (w.info ? '  Anmerkung: ' : '  Hinweis: ') + w.text)")
    for i in range(len(p["slides"])):
        pg.evaluate("i => { document.body.style.margin = 0; document.body.innerHTML = slideHTML(window.__p, i, false); }", i)
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(150)
        pg.screenshot(path=os.path.join(out, "folie_%02d.png" % (i + 1)))
    b.close()
print("\n".join(warn) if warn else "  keine Hinweise")
