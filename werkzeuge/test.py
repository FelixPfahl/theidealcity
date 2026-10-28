"""Browser-Test der Folien-App: Editor, Bilder, Rückgängig, Speichern, PDF, Vorführen, Kopplung, Fernbedienung.
Aufruf: python3 -I werkzeuge/test.py <bilderordner> [ausgabeordner]"""
import json, os, sys, threading, queue, functools, http.server, subprocess, shutil, tempfile, time
from playwright.sync_api import sync_playwright
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, "testausgabe")
os.makedirs(OUT, exist_ok=True)
res = []
def ok(c, t): res.append((bool(c), t)); print(("OK    " if c else "FEHLER ") + t, flush=True)

# --- Nachbau von ntfy ---
subs, posted = {}, []
class N(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def cors(self): self.send_header("Access-Control-Allow-Origin", "*")
    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.send_header("Access-Control-Allow-Methods", "GET,POST"); self.send_header("Access-Control-Allow-Headers", "*"); self.end_headers()
    def do_GET(self):
        if self.path == "/v1/health":
            self.send_response(200); self.cors(); self.end_headers(); self.wfile.write(b'{"healthy":true}'); return
        if self.path.endswith("/sse"):
            topic = self.path.split("/")[1]; q = queue.Queue(); subs.setdefault(topic, []).append(q)
            self.send_response(200); self.cors(); self.send_header("Content-Type", "text/event-stream"); self.end_headers()
            self.wfile.write(b'event: open\ndata: {"event":"open"}\n\n'); self.wfile.flush()
            try:
                while True:
                    m = q.get(); self.wfile.write(("data: " + json.dumps({"event": "message", "message": m}) + "\n\n").encode()); self.wfile.flush()
            except Exception: pass
    def do_POST(self):
        topic = self.path.split("/")[1]; n = int(self.headers.get("Content-Length", 0)); body = self.rfile.read(n).decode()
        posted.append((topic, body))
        for q in subs.get(topic, []): q.put(body)
        self.send_response(200); self.cors(); self.end_headers(); self.wfile.write(b"{}")
ns = http.server.ThreadingHTTPServer(("127.0.0.1", 0), N); threading.Thread(target=ns.serve_forever, daemon=True).start()
NT = "http://127.0.0.1:%d" % ns.server_address[1]

# --- App und Tagesdaten ---
tmp = tempfile.mkdtemp()
shutil.copy(os.path.join(root, "index.html"), tmp)
heute = json.load(open("/home/claude/pult-repo/daten/heute.json", encoding="utf-8"))
json.dump(heute, open(os.path.join(tmp, "heute.json"), "w"))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=tmp)); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:%d/index.html?ntfy=%s&daten=%s" % (srv.server_address[1], NT, "http://127.0.0.1:%d/heute.json" % srv.server_address[1])
CLOCK = """(()=>{const R=Date;const base=new R(2026,9,29,8,23,0).getTime();const st=R.now();
class D extends R{constructor(...a){if(a.length)super(...a);else super(base+(R.now()-st));}static now(){return base+(R.now()-st);}}window.Date=D;})();"""
example = os.path.join(root, "beispiele", "07_Screen_Weihnachtskarte_2_von_2.atelier.json")
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, accept_downloads=True)
    ctx.add_init_script(CLOCK)
    FD = os.environ.get("JOST")
    if FD:
        import base64
        css = "".join("@font-face{font-family:'Jost';font-style:%s;font-weight:%s;src:url(data:font/woff2;base64,%s) format('woff2')}" % (st, w, base64.b64encode(open(os.path.join(FD, "jost-latin-%s-%s.woff2" % (w, st)), "rb").read()).decode()) for w, st in (("400","normal"),("500","normal"),("700","normal"),("800","normal"),("400","italic")))
        ctx.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=css))
    else:
        ctx.route("**/fonts.googleapis.com/**", lambda r: r.abort())
    ctx.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" and "ERR_FAILED" not in m.text and "Failed to load resource" not in m.text else None)
    pg.goto(BASE); pg.wait_for_timeout(1200)
    ok(pg.locator("#lessons .card").count() == 3, "Start: drei Stunden aus den Pult-Daten")
    ok("Verbindung bereit" in pg.inner_text("#netState"), "Start: Kopplungsdienst erreichbar")
    pg.screenshot(path=os.path.join(OUT, "01_start.png"))
    # Öffnen
    pg.evaluate("window.showOpenFilePicker = undefined; window.showSaveFilePicker = undefined;")
    pg.set_input_files("#pickJson", example); pg.wait_for_timeout(800)
    ok(pg.is_visible("#editor") and pg.locator(".thumb").count() == 14, "Editor: Beispiel mit 14 Folien geöffnet")
    warn0 = pg.evaluate("check(pres).filter(w=>!w.info).map(w=>w.text)")
    ok(all("Bild fehlt" in w for w in warn0), "Prüfung: nur fehlende Bilder gemeldet " + str(warn0))
    pg.screenshot(path=os.path.join(OUT, "02_editor.png"))
    # Bild per Datei
    pg.click('.thumb[data-ti="2"]'); pg.wait_for_timeout(200)
    pg.click('#stageBox [data-img="bild"]'); pg.wait_for_timeout(200)
    pg.set_input_files("#pickImg", os.path.join(IMG, "horsley_weihnachtskarte_1843.jpg")); pg.wait_for_timeout(900)
    src = pg.evaluate("pres.slides[2].bild.src || ''")
    ok(src.startswith("data:image/jpeg"), "Bild: eingebettet als Daten")
    ok(pg.evaluate("pres.slides[2].bild.kuenstler") == "John Callcott Horsley", "Bild: vorhandene Bildangaben bleiben")
    for i in (3, 4):
        pg.evaluate(f"pres.slides[{i}].bild.src = pres.slides[2].bild.src");
    pg.evaluate("changed()"); pg.wait_for_timeout(300)
    warn1 = pg.evaluate("check(pres).filter(w=>!w.info).map(w=>w.text)")
    ok(warn1 == [], "Prüfung: nach den Bildern keine Hinweise " + str(warn1))
    # Text direkt auf der Folie
    pg.click('.thumb[data-ti="0"]'); pg.wait_for_timeout(200)
    h1 = pg.locator('#stageBox [data-f="thema"]'); h1.click(); pg.keyboard.press("End"); pg.keyboard.type(" (neu)"); pg.wait_for_timeout(200)
    pg.locator("#canvasWrap").click(position={"x": 5, "y": 5}); pg.wait_for_timeout(500)
    ok(pg.evaluate("pres.slides[0].thema") == "Die Karte entsteht (neu)", "Text: direkt auf der Folie geändert")
    ok("(neu)" in pg.inner_text('.thumb[data-ti="0"] .mini'), "Text: Vorschau links nachgezogen")
    pg.wait_for_timeout(500)
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(300)
    ok(pg.evaluate("pres.slides[0].thema") == "Die Karte entsteht", "Rückgängig: Text zurück")
    pg.keyboard.press("Control+y"); pg.wait_for_timeout(300)
    ok(pg.evaluate("pres.slides[0].thema") == "Die Karte entsteht (neu)", "Wiederholen: Text wieder da")
    # Liste im Arbeitsauftrag
    pg.click('.thumb[data-ti="6"]'); pg.wait_for_timeout(200)
    st = pg.locator('#stageBox [data-f="schritte"]'); st.click(); pg.keyboard.press("Control+End"); pg.keyboard.press("Enter"); pg.keyboard.type("Neuer Schritt"); pg.wait_for_timeout(200)
    pg.locator("#canvasWrap").click(position={"x": 5, "y": 5}); pg.wait_for_timeout(400)
    ok(pg.evaluate("pres.slides[6].schritte.split('\\n').length") == 6 and pg.locator("#stageBox ol li").count() == 6, "Liste: neuer Schritt als sechster Punkt")
    ok("8.10 bis 8.20 Uhr · Partnerarbeit · 10 Minuten" in pg.inner_text("#stageBox .line"), "Arbeitsauftrag: Zeile mit Uhrzeit, Sozialform, Dauer")
    # Folien hinzufügen, verschieben, löschen
    pg.click("#addBtn"); pg.click('[data-add="bewertung"]'); pg.wait_for_timeout(300)
    ok(pg.locator(".thumb").count() == 15, "Folie: hinzugefügt")
    ok(any("Bewertung" in w for w in pg.evaluate("check(pres).filter(w=>!w.info).map(w=>w.text)")), "Prüfung: Bewertung in Klasse 7 wird gemeldet")
    pg.click('#side [data-side="folie"]'); pg.click('[data-act="up"]'); pg.wait_for_timeout(200)
    ok(pg.evaluate("pres.slides[6].type") == "bewertung", "Folie: nach oben verschoben")
    pg.click('[data-act="del"]'); pg.wait_for_timeout(300)
    ok(pg.locator(".thumb").count() == 14 and pg.evaluate("pres.slides.filter(s=>s.type==='bewertung').length") == 0, "Folie: gelöscht")
    # Phasen
    pg.click('#side [data-side="stunde"]'); pg.wait_for_timeout(200)
    pg.fill('[data-pf="2.d"]', "15"); pg.wait_for_timeout(300)
    ok(any("ergeben 95 Minuten" in w for w in pg.evaluate("check(pres).map(w=>w.text)")), "Phasen: Summe wird geprüft")
    ok("8.25" in pg.inner_text(".ptable"), "Phasen: Zeiten rechnen sich neu")
    pg.fill('[data-pf="2.d"]', "10"); pg.wait_for_timeout(300)
    pg.click('#side [data-side="pruefung"]'); pg.wait_for_timeout(200)
    pg.screenshot(path=os.path.join(OUT, "03_pruefung.png"))
    # Speichern (ohne Dateidialog: Herunterladen)
    with pg.expect_download() as dl:
        pg.click("#eSave")
    d = dl.value; path = os.path.join(OUT, d.suggested_filename); d.save_as(path)
    saved = json.load(open(path, encoding="utf-8"))
    ok(d.suggested_filename.startswith("07_Screen_Weihnachtskarte") and saved["slides"][0]["thema"].endswith("(neu)"), "Speichern: Datei " + d.suggested_filename)
    # PDF
    pg.evaluate("window.print = () => {}"); pg.click("#ePdf"); pg.wait_for_timeout(800)
    pg.emulate_media(media="print")
    pdfp = os.path.join(OUT, "folien.pdf"); pg.pdf(path=pdfp, prefer_css_page_size=True, print_background=True)
    pg.emulate_media(media="screen")
    info = subprocess.run(["pdfinfo", pdfp], capture_output=True, text=True).stdout
    pages = int([l for l in info.splitlines() if l.startswith("Pages")][0].split()[-1])
    ok(pages == 14, "PDF: 14 Seiten (%d)" % pages)
    subprocess.run(["pdftoppm", "-r", "18", "-png", pdfp, os.path.join(OUT, "pdf")])
    # Alle Folientypen ansehen: Screenshots aus dem Editor
    for i in range(14):
        pg.click(f'.thumb[data-ti="{i}"]'); pg.wait_for_timeout(120)
        pg.locator("#stageBox").screenshot(path=os.path.join(OUT, "folie_%02d.png" % (i + 1)))
    # Vorführen mit Kopplung
    posted.clear()
    pg.click('.thumb[data-ti="0"]'); pg.click("#eShow"); pg.wait_for_timeout(600)
    ok(pg.is_visible("#show"), "Vorführen: läuft")
    for _ in range(7): pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(120)
    pg.wait_for_timeout(500)
    ok(pg.evaluate("page") == 7 and pg.evaluate("phaseIdx") == 3, "Vorführen: Folie 8 ist Phase 4 (Karte beginnen)")
    ok(pg.is_visible("#corner") and "Einzelarbeit" in pg.inner_text("#corner") and "8.43" in pg.inner_text("#corner"), "Vorführen: Ecken-Uhr mit Verzug " + pg.inner_text("#corner").replace("\n", " | "))
    msgs = [json.loads(m) for t, m in posted if not t.endswith("-fern")]
    ok(msgs and msgs[-1]["phase"] == "8:20" and msgs[-1]["lesson"] == "8:00" and msgs[-1]["date"] == "2026-10-29", "Kopplung: Pult bekommt Phase 8:20 " + (str(msgs[-1]) if msgs else ""))
    pg.screenshot(path=os.path.join(OUT, "04_vorfuehren.png"))
    code = pg.evaluate("CODE")
    import urllib.request
    urllib.request.urlopen(urllib.request.Request(NT + "/atelier-pult-" + code + "-fern", data=json.dumps({"v": 1, "cmd": "next", "at": pg.evaluate("Date.now()") + 25*60000}).encode(), method="POST")).read()
    pg.wait_for_timeout(800)
    ok(pg.evaluate("page") == 8, "Fernbedienung: Folie weiter vom Handy")
    pg.keyboard.press("t"); pg.wait_for_timeout(200); ok(pg.is_visible("#big"), "Vorführen: großer Timer"); pg.keyboard.press("t")
    pg.keyboard.press("b"); pg.wait_for_timeout(200); ok(pg.is_visible("#black"), "Vorführen: Schwarzbild"); pg.keyboard.press("b")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
    ok(pg.is_visible("#editor"), "Vorführen: Esc zurück in den Editor")
    # Start: Zuordnung über Datum und Uhrzeit
    pg.click("#eBack"); pg.wait_for_timeout(800)
    card = pg.locator("#lessons .card").first
    ok("Präsentation:" in card.inner_text() and card.locator("[data-play]").is_enabled(), "Start: 7a bekommt die Präsentation automatisch")
    pg.click('[data-tab="praes"]'); pg.wait_for_timeout(300)
    ok(pg.locator("#recent .card").count() >= 1, "Präsentationen: Liste im Browser")
    pg.click('[data-tab="koppeln"]'); pg.click("#qrbtn"); pg.wait_for_timeout(300)
    ok(pg.is_visible("#qr svg"), "Koppeln: QR-Code"); pg.click("#qr")
    # Neu anlegen
    pg.click("#btnNew"); pg.wait_for_timeout(400)
    ok(pg.locator(".thumb").count() == 3, "Neu: Gerüst mit Titel, Ablauf, Quellen")
    pg.screenshot(path=os.path.join(OUT, "05_neu.png"))
    # Neu laden: Kopie im Browser bleibt
    pg.goto(BASE); pg.wait_for_timeout(1000); pg.click('[data-tab="praes"]'); pg.wait_for_timeout(300)
    ok(pg.locator("#recent .card").count() >= 2, "Neu laden: Präsentationen noch da")
    b.close()
ok(not errs, "Skriptfehler: " + ("keine" if not errs else " | ".join(errs[:5])))
bad = [t for c, t in res if not c]
print("FEHLER:", bad if bad else "keine")
