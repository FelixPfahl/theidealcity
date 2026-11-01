"""Folien-Datei für mehrere Tage bauen (Atelier Folien am Notebook).

Aufruf: python3 -I werkzeuge/folien_woche.py daten/vorschau.json folien/Atelier_Folien_aktuell.html

- Vorlage: werkzeuge/folien_vorlage.html (Folien-Datei vom 30.10.2026 mit pdf.js, Kopplung, Kamera, Klassenlisten).
- Tage und Phasen kommen aus der Pult-Vorschau (daten/vorschau.json, Klartext oder vorher entschlüsselt).
- Die Datei wählt selbst den heutigen Tag oder, wenn heute keiner dabei ist, den nächsten (Vorschau ohne Selbststart).
- PowerPoint (Josef, 01.11.2026): Im Programm Atelier Folien läuft jede Stunde als .pptx in PowerPoint, das Programm
  legt Uhr, Timer, Schwarzbild, Kamera und Klassenlisten als durchsichtige Ebene darüber. Das PDF bleibt Rückfall.
"""
import json, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__))
VORLAGE = os.path.join(HIER, "folien_vorlage.html")


def ersetze(s, alt, neu, anzahl=1):
    n = s.count(alt)
    if n != anzahl:
        raise SystemExit(f"Vorlage passt nicht ({n}x statt {anzahl}x): {alt[:80]!r}")
    return s.replace(alt, neu)


def stunde(i):
    deck = None
    for m in i.get("mitnehmen", []) or []:
        t = re.search(r"\b(\d{1,2}a?|AG|Q?1[1-3])_Screen_[A-Za-z0-9_äöüÄÖÜß-]+", str(m))
        if t:
            deck = re.sub(r"_neu$", "", t.group(0))
            break
    phasen = []
    for p in i.get("phases", []):
        puffer = p[5] if len(p) > 5 and isinstance(p[5], (int, float)) else 0
        phasen.append([p[0], int(p[1]), p[2], p[3], int(puffer)])
    return {"id": str(i["id"]), "label": str(i.get("klasse") or i["id"]), "titel": i.get("titel", ""),
            "start": i["start"], "end": i["end"], "deck": deck, "phases": phasen}


def js_stunde(L):
    pdf = "/^" + re.escape(L["deck"]).replace("/", r"\/") + "/i" if L["deck"] else "null"
    return ("{id:" + json.dumps(L["id"]) + ", label:" + json.dumps(L["label"], ensure_ascii=False)
            + ", titel:" + json.dumps(L["titel"], ensure_ascii=False) + ", start:" + json.dumps(L["start"])
            + ", end:" + json.dumps(L["end"]) + ", pdf:" + pdf
            + ", phases:" + json.dumps(L["phases"], ensure_ascii=False) + ", pageMap:null}")


def bauen(vorschau, ziel):
    v = json.load(open(vorschau, encoding="utf-8"))
    tage = {}
    for datum, tag in sorted(v["tage"].items()):
        ls = [stunde(i) for i in tag.get("items", []) if i.get("type") == "lesson" and i.get("phases")]
        if ls:
            tage[datum] = ls
    if not tage:
        raise SystemExit("keine Stunden in der Vorschau")
    s = open(VORLAGE, encoding="utf-8").read()

    # eingebettete PDFs der Vorlage entfernen (PDFs kommen aus Drive)
    s = re.sub(r'<script type="application/octet-stream" id="pdf-[^"]*"[^>]*>.*?</script>\s*', "", s, flags=re.S)

    # Tage statt eines Tages
    tage_js = "{\n" + ",\n".join(json.dumps(d) + ": [\n " + ",\n ".join(js_stunde(L) for L in ls) + "\n]" for d, ls in tage.items()) + "\n}"
    letzter = max(tage)
    s = ersetze(s, 'const DATE = "2026-10-30";', f'''/* const DATE = "{letzter}" (Dateiname im Programm) */
const TAGE = {tage_js};
const HEUTE_ISO = (() => {{ const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }})();
const DATE = (() => {{ const ks = Object.keys(TAGE).sort(), q = (location.hash.match(/tag=(\\d{{4}}-\\d{{2}}-\\d{{2}})/) || [])[1]; if (q && TAGE[q]) return q; return ks.find(k => k >= HEUTE_ISO) || ks[ks.length - 1]; }})();
const VORSCHAU = DATE !== HEUTE_ISO;''')
    a = s.index("const LESSONS = [")
    b = s.index("];", a) + 2
    s = s[:a] + "const LESSONS = TAGE[DATE];" + s[b:]
    s = ersetze(s, "/* ===== Daten des Tages (aus dem Memo Donnerstag 29.10.2026) ===== */",
                "/* ===== Daten der Tage (aus der Pult-Vorschau, gebaut mit werkzeuge/folien_woche.py) ===== */")

    # Testzeit überlebt den Wechsel ins PowerPoint-Fenster
    s = ersetze(s, "let simOff = 0;", 'let simOff = (() => { try { const o = JSON.parse(localStorage.getItem("folien-sim") || "null"); return o && Date.now() - o.at < 4 * 3600e3 ? Number(o.off) || 0 : 0; } catch(e){ return 0; } })();')
    s = ersetze(s, "  simOff = Number(off) || 0;\n", '  simOff = Number(off) || 0;\n  try { localStorage.setItem("folien-sim", JSON.stringify({off: simOff, at: Date.now()})); } catch(e){}\n')
    s = ersetze(s, "  if (!current || current.id !== L.id) openLesson(L.id);\n", "  if (!current || current.id !== L.id){ openLesson(L.id); if (!current || current.id !== L.id) return; }\n")

    # Vorschau: kein Selbststart, Hinweis im Ruhebild
    s = ersetze(s, "  const next = LESSONS.find(L => m < toMin(L.end));\n  const n = $(\"#ruheNext\"), f = $(\"#ruheFehlt\");",
                "  const next = LESSONS.find(L => m < toMin(L.end));\n  const n = $(\"#ruheNext\"), f = $(\"#ruheFehlt\");\n  if (VORSCHAU){ const L0 = LESSONS[0]; n.innerHTML = `<b>Vorschau ${esc2(tagLabel(DATE))}</b><br>${fmt(toMin(L0.start))} ${esc2(L0.label)}: ${esc2(L0.titel)}<br><span style=\"color:#8b91a0;font-size:.8em\">${LESSONS.length} Stunden · Tag oben in den Einstellungen wählbar</span>`; f.textContent = \"\"; return; }")
    s = ersetze(s, "  if (inMin <= 10 && count(next) && autoOpened !== next.id){", "  if (!PPT_ID && inMin <= 10 && (count(next) || pptInfo[next.id]) && autoOpened !== next.id){")
    s = ersetze(s, '  f.textContent = count(next) ? "" : "Für diese Stunde fehlt noch das PDF (Einstellungen unten rechts).";',
                '  f.textContent = (count(next) || pptInfo[next.id]) ? "" : "Für diese Stunde fehlt noch die Präsentation (PowerPoint oder PDF).";')

    # Startseite: Tage wählbar, Stand je Stunde mit PowerPoint
    s = ersetze(s, '''    const ready = L.html ? `<span class="st ok">${L.html.length} Folien bereit</span>` : (docs[L.id] ? `<span class="st ok">${docs[L.id].pdf.numPages} Folien aus ${docs[L.id].name}</span>` : `<span class="st warn">PDF fehlt</span>`);''',
                '''    const ready = L.html ? `<span class="st ok">${L.html.length} Folien bereit</span>` : pptInfo[L.id] ? `<span class="st ok">PowerPoint: ${esc2(pptInfo[L.id].name)}${docs[L.id] ? " · PDF als Rückfall" : ""}</span>` : (docs[L.id] ? `<span class="st ok">${docs[L.id].pdf.numPages} Folien aus ${docs[L.id].name}</span>` : `<span class="st warn">${L.pdf ? "Präsentation fehlt" : "keine Präsentation"}</span>`);''')
    s = ersetze(s, '  }).join("");\n  const n = LESSONS.filter(L => L.pdf && docs[L.id]).length;',
                '  }).join("");\n  $("#lessons").insertAdjacentHTML("afterbegin", tageHtml());\n  const n = LESSONS.filter(L => L.pdf && docs[L.id]).length;')
    s = ersetze(s, '''  $("#pdfstate").textContent = n === 2 ? "Beide PDFs geladen." : n === 1 ? "Ein PDF geladen, eins fehlt noch." : "Noch keine PDFs geladen.";
  $("#pdfstate").className = n === 2 ? "ok" : "warn";''',
                '''  const np = LESSONS.filter(L => pptInfo[L.id]).length, alle = LESSONS.filter(L => L.pdf).length;
  $("#pdfstate").textContent = (np ? np + " von " + alle + " als PowerPoint, " : "") + n + " von " + alle + " PDFs geladen.";
  $("#pdfstate").className = (np === alle || n === alle) ? "ok" : "warn";''')
    s = ersetze(s, '$("#lessons").addEventListener("click", e => { const b = e.target.closest(".lesson"); if (b) openLesson(b.dataset.l); });',
                '$("#lessons").addEventListener("click", e => { const t = e.target.closest("[data-tag]"); if (t){ location.hash = "tag=" + t.dataset.tag; location.reload(); return; } const b = e.target.closest(".lesson"); if (b) openLesson(b.dataset.l); });')

    # Folienzahl und Phase je Folie auch aus PowerPoint
    s = ersetze(s, "function count(L){ return L.html ? L.html.length : (docs[L.id] ? docs[L.id].pdf.numPages : 0); }",
                "function count(L){ if (PPT_ID && pptDoc[L.id]) return pptDoc[L.id].count; return L.html ? L.html.length : (docs[L.id] ? docs[L.id].pdf.numPages : 0); }")
    s = ersetze(s, "function phaseOfPage(L, p){ return L.html ? L.html[p][0] : (docs[L.id] ? docs[L.id].map[p] : 0); }",
                "function phaseOfPage(L, p){ if (PPT_ID && pptDoc[L.id]) return pptDoc[L.id].map[p] || 0; return L.html ? L.html[p][0] : (docs[L.id] ? docs[L.id].map[p] : 0); }")

    # Stunde öffnen: im Programm zuerst PowerPoint
    s = ersetze(s, '''function openLesson(id){
  const L = LESSONS.find(x => x.id === id);
  if (!count(L)){ toast("Für die " + L.label + " fehlt noch das PDF."); return; }''',
                '''function openLesson(id){
  const L = LESSONS.find(x => x.id === id);
  if (!L) return;
  if (D_ && D_.pptStart && pptInfo[id] && !pptAus[id] && (!PPT_ID || id !== PPT_ID)){ save(); toast("PowerPoint startet …"); D_.pptStart(id, pptInfo[id].path); return; }
  if (!count(L)){ toast("Für die " + L.label + " fehlt noch die Präsentation."); return; }''')

    # Vorführen: Folie zeigt PowerPoint, die Datei nur die Ebene
    s = ersetze(s, '''async function show(){
  const L = current;
  if (L.html){''', '''async function show(){
  const L = current;
  if (PPT_ID && pptDoc[L.id]){
    $("#cv").style.display = "none"; $("#html-slide").style.display = "none";
    if (pptSoll !== page){ pptSoll = page; D_.ppt("goto", page + 1).then(pptApply); }
    tick(); return;
  }
  if (L.html){''')
    s = ersetze(s, '''function go(dir){
  if (!current) return;''', '''function go(dir){
  if (!current) return;
  if (PPT_ID && pptDoc[current.id]){ D_.ppt(dir > 0 ? "next" : "prev").then(pptApply); return; }''')
    s = ersetze(s, '''function toStart(){
  closeNav(); closeGrid();''', '''function toStart(){
  closeNav(); closeGrid();
  if (PPT_ID){ save(); D_.pptEnd(); return; }''')
    s = ersetze(s, '''async function openGrid(){
  if (!current) return;''', '''async function openGrid(){
  if (!current) return;
  if (PPT_ID && pptDoc[current.id] && !(docs[current.id] && docs[current.id].pdf.numPages === count(current))){ toast("Die Übersicht braucht das passende PDF (gleiche Folienzahl)."); return; }''')

    # Ebene über PowerPoint nie ins HTML-Vollbild (das Fenster deckt den Bildschirm schon ab, Durchsicht bleibt)
    s = ersetze(s, "function goFull(){ try {", "function goFull(){ if (PPT_ID) return; try {")

    # Stundenleiste: Stunden mit PowerPoint sind wählbar
    s = ersetze(s, "    const n = count(L);\n    return `<button class=\"ls", "    const n = count(L) || (pptInfo[L.id] ? 1 : 0);\n    return `<button class=\"ls")
    s = ersetze(s, '${n ? n + " Folien" : "PDF fehlt"}', '${count(L) ? count(L) + " Folien" : pptInfo[L.id] ? "PowerPoint" : "Präsentation fehlt"}')

    # PowerPoint-Teil
    s = ersetze(s, "/* ===== Startseite ===== */", r'''/* ===== PowerPoint im Programm Atelier Folien (Josef, 01.11.2026) =====
   Die Stunde läuft als .pptx in PowerPoint; diese Datei liegt als durchsichtige Ebene darüber (Uhr, Timer, Schwarzbild,
   Kamera, Klassenlisten, Kopplung). PowerPoint führt: Welche Folie gerade läuft, liest die Ebene alle 0,7 Sekunden.
   Klappt PowerPoint nicht, geht es mit dem PDF weiter. */
const D_ = window.atelierDesktop || null;
const hashWert = k => { const m = location.hash.match(new RegExp("[#&]" + k + "=([^&]+)")); return m ? decodeURIComponent(m[1]) : null; };
const PPT_ID = D_ && D_.ppt ? hashWert("ppt") : null;
const PDF_ID = hashWert("pdf");
const pptInfo = {}, pptDoc = {}, pptAus = {};
if (PDF_ID) pptAus[PDF_ID] = true;
let pptSoll = -1, pptLief = false, pptBusy = false, pptEndet = false;
if (PPT_ID) document.documentElement.classList.add("ppt");
const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
function tagLabel(iso){ const d = new Date(iso + "T12:00:00"); return WT[d.getDay()] + " " + iso.slice(8, 10) + "." + iso.slice(5, 7) + "."; }
function tageHtml(){ const ks = Object.keys(TAGE).sort(); if (ks.length < 2 && !VORSCHAU) return ""; return `<div class="tage">${ks.map(k => `<button class="tag${k === DATE ? " cur" : ""}" data-tag="${k}">${tagLabel(k)}${k === HEUTE_ISO ? " · heute" : ""}</button>`).join("")}</div>`; }
async function pptSuchen(){
  if (!D_ || !D_.pptFind) return;
  for (const L of LESSONS) if (L.pdf && !pptInfo[L.id]){ try { const r = await D_.pptFind(L.pdf.source); if (r) pptInfo[L.id] = r; } catch(e){} }
  renderStart();
}
function mapTexte(L, texte){
  const starts = L.phases.map(p => p[0].replace(":", "."));
  const map = []; let last = 0;
  for (const roh of texte){
    const text = String(roh || "").replace(/(\d{1,2})[:.](\d{2})/g, "$1.$2");
    const hits = starts.map((s, k) => new RegExp("(^|[^\\d])" + s.replace(".", "\\.") + "(?!\\d)").test(text) ? k : -1).filter(k => k >= 0);
    const found = hits.length && hits.length <= 2 ? hits[0] : -1;
    if (found >= 0 && found >= last) last = found;
    map.push(found >= 0 ? found : last);
  }
  return map;
}
function pptApply(s){
  if (!s || !s.ok || !current || !pptDoc[current.id]) return;
  if (!s.laeuft){ if (pptLief) pptEnde(); return; }
  pptLief = true;
  const n = count(current);
  if ((s.folie || 1) > n) return;   /* schwarze Schlussfolie von PowerPoint */
  const p = Math.max(0, (s.folie || 1) - 1);
  pptSoll = p;
  if (p !== page){ page = p; advanceTo(page); save(); zoomReset(); tick(); }
}
async function pptPoll(){ if (pptBusy || pptEndet || !current) return; pptBusy = true; try { pptApply(await D_.ppt("state")); } catch(e){} pptBusy = false; }
function pptEnde(pdfStatt){ if (pptEndet) return; pptEndet = true; save(); D_.pptEnd(pdfStatt || ""); }
function pptFehler(L, r){ toast("PowerPoint klappt nicht" + (r && r.fehler ? " (" + String(r.fehler).slice(0, 80) + ")" : "") + ". Weiter mit dem PDF."); setTimeout(() => pptEnde(L.id), 2500); }
/* Maus: über leeren Stellen geht der Klick an PowerPoint (z. B. Video starten), über Uhr, Leiste und Fenstern an die Ebene */
function mausSetup(){
  let durch = true;
  document.addEventListener("mousemove", e => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const frei = !el || el === document.documentElement || el === document.body || el.id === "stage" || el.id === "cv" || el.id === "html-slide";
    if (frei !== durch){ durch = frei; try { D_.maus(frei); } catch(err){} }
  });
}
async function pptLos(){
  const L = LESSONS.find(x => x.id === PPT_ID);
  if (!L){ pptEnde(); return; }
  toast("PowerPoint öffnet " + L.label + " …");
  const r = await D_.pptOpen();
  if (!r || !r.ok || !r.anzahl){ pptFehler(L, r); return; }
  pptDoc[L.id] = {count: r.anzahl, name: r.name, map: mapTexte(L, Array.isArray(r.texte) ? r.texte : [r.texte])};
  const st = lessonState(L), start = Math.min(st.page || 0, r.anzahl - 1);
  const s = await D_.ppt("show", start + 1);
  if (!s || !s.ok || !s.laeuft){ pptFehler(L, s); return; }
  pptSoll = start; st.page = start; saveSt(L, st);
  openLesson(L.id);
  pptApply(s);
  setInterval(pptPoll, 700);
  mausSetup();
}

/* ===== Startseite ===== */''')

    # Start: im PowerPoint-Fenster zuerst PowerPoint, danach PDFs (Übersicht, Folienbild)
    s = ersetze(s, "renderStart(); loadSaved(); checkNet(); initTopic().then(connectFern);",
                "if (PPT_ID){ pptLos().then(() => loadSaved()).then(pptSuchen); } else { renderStart(); loadSaved().then(pptSuchen).then(() => { if (PDF_ID && LESSONS.some(L => L.id === PDF_ID)) openLesson(PDF_ID); }); } checkNet(); initTopic().then(connectFern);")

    # Stil: im PowerPoint-Fenster durchsichtig; Tage-Leiste auf der Startseite
    s = ersetze(s, "</style>", '''html.ppt,html.ppt body,html.ppt #stage{background:transparent!important}
html.ppt #cv,html.ppt #html-slide,html.ppt #start{display:none!important}
html.ppt body.strip #stage{bottom:0}
.tage{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
.tage .tag{font:inherit;font-size:15px;background:transparent;color:var(--fg);border:1px solid var(--line);border-radius:999px;padding:8px 14px;cursor:pointer}
.tage .tag.cur{background:var(--fg);color:#000}
</style>''', 1)

    # Hilfetext der Vorlage (7a und 8 vom 30.10.)
    s = ersetze(s, "So geht es: Die PDFs für 7a und 8 stecken schon in dieser Datei. Eine Stunde anklicken. Andere PDFs kannst du oben auswählen (gelten bis zum Neuladen).",
                "So geht es: Eine Stunde anklicken. Im Programm Atelier Folien läuft sie als PowerPoint (Datei aus 00_Schule_heute, dem Klassenordner oder 00_dateien_für_den_schultag), Uhr und Timer liegen darüber; ohne PowerPoint kommt das PDF. Andere PDFs kannst du oben auswählen (gelten bis zum Neuladen).")

    open(ziel, "w", encoding="utf-8").write(s)
    print("gebaut:", ziel, "Tage:", ", ".join(f"{d} ({len(ls)})" for d, ls in tage.items()))
    for d, ls in tage.items():
        for L in ls:
            print("  ", d, L["id"], L["start"], L["deck"] or "(keine Präsentation)")


if __name__ == "__main__":
    bauen(sys.argv[1], sys.argv[2])
