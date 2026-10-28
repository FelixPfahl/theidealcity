# Android-Matrix: verschiedene Geräte, Browser-Kennungen, Dunkelmodus, große Anzeige, Funkloch.
# Engine ist überall Chromium (Chrome, Samsung Internet, Android-WebView der Claude-App sind Chromium-basiert).
import json, sys, random, pathlib
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).resolve().parent
html = (here.parent / "app" / "morgenrunde.html").read_text(encoding="utf-8")
quiz = json.loads((here.parent / "hefte" / "2026-10-29.json").read_text(encoding="utf-8"))
page_html = "<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1,viewport-fit=cover'><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>" + html + "</body></html>"
mock = """(() => {
  const FIX = new Date('2026-10-29T06:35:00+01:00').getTime();
  const RD = Date; class FD extends RD { constructor(...a){ if(!a.length) super(FIX); else super(...a);} static now(){return FIX;} } window.Date = FD;
  const docs = new Map(Object.entries(%s)); const ls = new Set();
  const clone = o => JSON.parse(JSON.stringify(o));
  const snap = (id,d) => ({id, exists: d!==undefined, data: () => d===undefined?undefined:clone(d), metadata:{fromCache:false,hasPendingWrites:false}});
  function q(col, f){ const o = { where:(a,b,c)=>q(col,f.concat([[a,b,c]])), orderBy:()=>o, limit:()=>o, get: async()=>run(),
      onSnapshot(n){ const l={fire:()=>n(run())}; ls.add(l); setTimeout(l.fire,5); return ()=>ls.delete(l);} };
    function run(){ const out=[]; for(const [p,d] of [...docs.entries()].sort()){ const s=p.split('/'); if(s.slice(0,-1).join('/')!==col) continue;
      if(f.every(([a,b,c])=> b==='>='? d[a]>=c : b==='=='? d[a]===c : true)) out.push(snap(s[s.length-1],d)); }
      return {docs:out,size:out.length,empty:!out.length,docChanges:()=>[],metadata:{}}; }
    return o; }
  const db = { collection:(p)=>q(p,[]), doc:(p)=>({
    async set(d){ await new Promise(r=>setTimeout(r,3)); if(!navigator.onLine) throw {code:'unavailable',message:'offline'}; docs.set(p, clone(d)); for(const l of ls) setTimeout(l.fire,0); },
    async get(){ return snap(p, docs.get(p)); },
    onSnapshot(n){ const l={fire:()=>n(snap(p.split('/').pop(), docs.get(p)))}; ls.add(l); setTimeout(l.fire,5); return ()=>ls.delete(l); } }) };
  window.__docs = docs; window.claude = { use: async (n) => n==='db' ? db : null };
})();""" % json.dumps({"quizzes/2026-10-29": quiz})

UA = {
 "Chrome": None,
 "Samsung Internet": "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
 "Claude-App (WebView)": "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36",
 "Firefox-Kennung": "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
}
CASES = [
 ("Pixel 7", "Claude-App (WebView)", "light", {}),
 ("Pixel 7", "Chrome", "dark", {}),
 ("Pixel 5", "Chrome", "light", {}),
 ("Galaxy S24", "Samsung Internet", "light", {}),
 ("Galaxy S24", "Samsung Internet", "dark", {}),
 ("Galaxy A55", "Chrome", "light", {}),
 ("Galaxy S8", "Chrome", "light", {"offline": True}),
 ("Galaxy Z Fold 7 Cover", "Claude-App (WebView)", "dark", {}),
 ("Galaxy Z Fold 7", "Chrome", "light", {}),
 ("Galaxy Tab S9", "Firefox-Kennung", "light", {}),
 ("Galaxy S24 landscape", "Claude-App (WebView)", "light", {}),
 ("Galaxy S24", "Claude-App (WebView)", "light", {"width": 320, "note": "große Anzeige (320 px)"}),
]

def check(page, label, probs):
    w = page.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")
    if w[0] > w[1] + 1: probs.append(f"{label}: seitliches Scrollen {w[0]} > {w[1]}")
    out = page.evaluate("""() => [...document.querySelectorAll('#app *')].filter(e => { const r=e.getBoundingClientRect(); return r.width>0 && (r.right>innerWidth+1 || r.left<-1); }).map(e=>e.className||e.tagName).slice(0,4)""")
    if out: probs.append(f"{label}: ragt raus {out}")
    small = page.evaluate("""() => [...document.querySelectorAll('.opt,.btn,.check')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).map(e=>e.className).slice(0,3)""")
    if small: probs.append(f"{label}: Tippfläche unter 44 px {small}")

results = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for dev, br, scheme, extra in CASES:
        probs = []; d = dict(p.devices[dev]); d.pop("default_browser_type", None)
        if UA[br]: d["user_agent"] = UA[br]
        if extra.get("width"): d["viewport"] = {"width": extra["width"], "height": 700}; d["device_scale_factor"] = 3.375
        ctx = b.new_context(**d, color_scheme=scheme, locale="de-DE", timezone_id="Europe/Berlin")
        page = ctx.new_page()
        page.on("pageerror", lambda e: probs.append(f"Skriptfehler: {e}"))
        page.on("console", lambda m: probs.append(f"Konsole {m.type}: {m.text}") if m.type == "error" and "ERR_FAILED" not in m.text else None)
        page.route("**/*", lambda r: r.fulfill(status=200, content_type="text/html", body=page_html) if r.request.url.startswith("https://app.test") else r.abort())
        page.add_init_script(mock)
        label = f"{dev} · {br} · {scheme}" + (f" · {extra['note']}" if extra.get("note") else "") + (" · Funkloch" if extra.get("offline") else "")
        try:
            page.goto("https://app.test/"); page.wait_for_selector("#start", timeout=6000); check(page, label + " Titel", probs)
            page.tap("#start"); rnd = random.Random(dev)
            for i in range(20):
                page.wait_for_selector(".opt")
                if extra.get("offline") and i == 5: ctx.set_offline(True)
                if extra.get("offline") and i == 9:
                    st = page.text_content("#savestate") or ""
                    if not st.startswith("Offline"): probs.append(f"{label}: kein Offline-Hinweis ({st})")
                    ctx.set_offline(False); page.wait_for_timeout(300)
                opts = page.query_selector_all(".opt"); opts[rnd.randrange(len(opts))].tap(); page.wait_for_selector(".reveal")
                if i in (0, 12): check(page, f"{label} Frage {i+1}", probs)
                nb = page.query_selector("#next").bounding_box(); vh = page.viewport_size["height"]
                if nb["y"] + nb["height"] > vh + 1: probs.append(f"{label} Frage {i+1}: Weiter-Knopf außerhalb des Bildschirms")
                page.tap("#next")
            page.wait_for_selector("#bossReveal"); check(page, label + " Boss", probs); page.tap("#bossReveal")
            page.tap(".check[data-pt='1']"); page.tap("#bossDone"); page.wait_for_selector(".big"); page.wait_for_timeout(1500)
            check(page, label + " Auswertung", probs)
            res = page.evaluate("() => window.__docs.get('results/2026-10-29')")
            if not res or not res.get("finished") or len(res.get("answers", {})) != 20: probs.append(f"{label}: Ergebnis unvollständig gespeichert ({len((res or {}).get('answers',{}))} Antworten)")
            for v in ("#toWeek",):
                page.tap(v); page.wait_for_timeout(100); check(page, label + " Woche", probs)
            page.tap("text=Zum Titel"); page.tap("#toAlbum"); page.wait_for_timeout(100); check(page, label + " Album", probs)
            page.tap("text=Zum Titel"); page.tap("#toBadges"); page.wait_for_timeout(100); check(page, label + " Abzeichen", probs)
        except Exception as e:
            probs.append(f"{label}: Abbruch {str(e).splitlines()[0]}")
        ctx.close()
        results.append({"fall": label, "ok": not probs, "probleme": probs})
        print(("OK    " if not probs else "FEHLER") + "  " + label + ("" if not probs else "\n        " + "\n        ".join(probs)), flush=True)
    b.close()
(here / "android_log.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{sum(r['ok'] for r in results)} von {len(results)} Fällen fehlerfrei")
