# Browserdurchgang in echtem Chromium: Handybreite, hell und dunkel, ganzer Durchlauf.
# Aufruf: python3 -I browser.py <seed> [shots]
import json, sys, random, pathlib
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).resolve().parent
html = (here.parent / "app" / "morgenrunde.html").read_text(encoding="utf-8")
quiz = json.loads((here.parent / "hefte" / "2026-10-29.json").read_text(encoding="utf-8"))
seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
shots = len(sys.argv) > 2
rnd = random.Random(seed)

page_html = "<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1,viewport-fit=cover'><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>" + html + "</body></html>"

mock = """
(() => {
  const FIX = new Date('2026-10-29T06:35:00+01:00').getTime();
  const RD = Date; class FD extends RD { constructor(...a){ if(!a.length) super(FIX); else super(...a);} static now(){return FIX;} } window.Date = FD;
  const docs = new Map(Object.entries(%s));
  const ls = new Set();
  const clone = o => JSON.parse(JSON.stringify(o));
  const snap = (id,d) => ({id, exists: d!==undefined, data: () => d===undefined?undefined:clone(d), metadata:{fromCache:false,hasPendingWrites:false}});
  function q(col, f){ const o = { where:(a,b,c)=>q(col,f.concat([[a,b,c]])), orderBy:()=>o, limit:()=>o,
      get: async()=>run(), onSnapshot(n){ const l={fire:()=>n(run())}; ls.add(l); setTimeout(l.fire,5); return ()=>ls.delete(l);} };
    function run(){ const out=[]; for(const [p,d] of [...docs.entries()].sort()){ const s=p.split('/'); if(s.slice(0,-1).join('/')!==col) continue;
      if(f.every(([a,b,c])=> b==='>='? d[a]>=c : b==='=='? d[a]===c : true)) out.push(snap(s[s.length-1],d)); }
      return {docs:out,size:out.length,empty:!out.length,docChanges:()=>[],metadata:{}}; }
    return o; }
  const db = { collection:(p)=>q(p,[]), doc:(p)=>({ async set(d){ await new Promise(r=>setTimeout(r,3)); docs.set(p, clone(d)); window.__writes=(window.__writes||0)+1; for(const l of ls) setTimeout(l.fire,0); }, async get(){ return snap(p, docs.get(p)); }, onSnapshot(n){ const l={fire:()=>n(snap(p.split('/').pop(), docs.get(p)))}; ls.add(l); setTimeout(l.fire,5); return ()=>ls.delete(l); } }) };
  window.__docs = docs;
  window.claude = { use: async (n) => n==='db' ? db : null };
})();
""" % json.dumps({"quizzes/2026-10-29": quiz})

problems = []

def overflow_check(page, label):
    w = page.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")
    if w[0] > w[1] + 1:
        problems.append(f"{label}: horizontal overflow {w[0]} > {w[1]}")
    clipped = page.evaluate("""() => [...document.querySelectorAll('#app *')].filter(e => {
        const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
      }).map(e => e.className || e.tagName).slice(0,5)""")
    if clipped:
        problems.append(f"{label}: Element ragt aus dem Bild: {clipped}")

with sync_playwright() as p:
    b = p.chromium.launch()
    UA = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
    for scheme, vw, vh in [("light", 360, 780), ("dark", 412, 915)]:
        ctx = b.new_context(viewport={"width": vw, "height": vh}, device_scale_factor=2.625, color_scheme=scheme, is_mobile=True, has_touch=True, user_agent=UA)
        page = ctx.new_page()
        page.on("console", lambda m: problems.append(f"console {m.type}: {m.text}") if m.type in ("error", "warning") and "ERR_FAILED" not in m.text else None)
        page.on("pageerror", lambda e: problems.append(f"pageerror: {e}"))
        page.route("**/*", lambda r: r.fulfill(status=200, content_type="text/html", body=page_html) if r.request.url.startswith("https://app.test") else r.abort())
        page.add_init_script(mock)
        page.goto("https://app.test/")
        page.wait_for_selector("#start", timeout=5000)
        # Kontrast der Akzentfarbe gegen Grund (WCAG grob)
        overflow_check(page, f"{scheme} Titel")
        if shots: page.screenshot(path=str(here / f"shot_{scheme}_1_titel.png"), full_page=True)
        page.click("#start")
        for i in range(20):
            page.wait_for_selector(".opt")
            overflow_check(page, f"{scheme} Frage {i+1}")
            opts = page.query_selector_all(".opt")
            correct_idx = None
            target = opts[rnd.randrange(len(opts))]
            target.tap()
            page.wait_for_selector(".reveal")
            if shots and i in (0, 10) and scheme == "light": page.screenshot(path=str(here / f"shot_{scheme}_2_frage{i+1}.png"), full_page=True)
            page.click("#next")
        page.wait_for_selector("#bossReveal")
        overflow_check(page, f"{scheme} Boss")
        if shots: page.screenshot(path=str(here / f"shot_{scheme}_3_boss.png"), full_page=True)
        page.click("#bossReveal")
        for c in page.query_selector_all(".check")[:3]:
            pass
        page.click(".check[data-pt='0']"); page.click(".check[data-pt='2']")
        overflow_check(page, f"{scheme} Boss offen")
        page.click("#bossDone")
        page.wait_for_selector(".big")
        page.wait_for_timeout(100)
        overflow_check(page, f"{scheme} Auswertung")
        if shots: page.screenshot(path=str(here / f"shot_{scheme}_4_auswertung.png"), full_page=True)
        res = page.evaluate("() => window.__docs.get('results/2026-10-29')")
        if not res or not res.get("finished") or len(res.get("answers", {})) != 20 or res.get("boss") != [0, 2]:
            problems.append(f"{scheme}: Ergebnis nicht korrekt gespeichert: {json.dumps(res)[:200]}")
        page.click("#toWeek"); page.wait_for_selector(".week"); overflow_check(page, f"{scheme} Woche")
        if shots: page.screenshot(path=str(here / f"shot_{scheme}_5_woche.png"), full_page=True)
        page.click("text=Zum Titel"); page.wait_for_selector("#toAlbum"); page.click("#toAlbum"); page.wait_for_selector(".card"); overflow_check(page, f"{scheme} Album")
        if shots: page.screenshot(path=str(here / f"shot_{scheme}_6_album.png"), full_page=True)
        page.click("text=Zum Titel"); page.wait_for_selector("#toBadges"); page.click("#toBadges"); page.wait_for_selector(".badge"); overflow_check(page, f"{scheme} Abzeichen")
        if shots: page.screenshot(path=str(here / f"shot_{scheme}_7_abzeichen.png"), full_page=True)
        svgok = page.evaluate("() => { const p=document.querySelector('.rank'); return !!p; }")
        # Farbe: Hintergrund des Body muss gesetzt sein
        bg = page.evaluate("() => getComputedStyle(document.body).backgroundColor")
        if bg in ("rgba(0, 0, 0, 0)", "transparent"): problems.append(f"{scheme}: Body ohne Hintergrund")
        fonts = page.evaluate("() => getComputedStyle(document.querySelector('.mast')).fontFamily")
        ctx.close()
    b.close()

print(json.dumps({"seed": seed, "ok": not problems, "problems": problems}))
