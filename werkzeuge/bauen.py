"""Baut index.html (Webversion) und artifact.html (Claude-Fassung) aus app.html und daten/*.json.
Aufruf im Zweig-Ordner: python3 -I werkzeuge/bauen.py"""
import json, os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = lambda *a: os.path.join(root, *a)
app = open(p("app.html"), encoding="utf-8").read()
# Klartext liegt nur lokal in daten/klar/ (nicht im Repo). Öffentlich gehen nur verschlüsselte Dateien raus.
# Schlüssel: Umgebungsvariable ATELIER_SCHLUESSEL (16 Zeichen). Übergangsweise wird Klartext aus daten/ übernommen.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geheim
KEY = os.environ.get("ATELIER_SCHLUESSEL", "")
KLAR = os.environ.get("ATELIER_KLAR") == "1"   # Übergang: Tagesdaten unverschlüsselt (keine Namen enthalten)
assert KLAR or len(geheim.norm(KEY)) == 16, "ATELIER_SCHLUESSEL fehlt oder hat nicht 16 Zeichen"
siegel = (lambda d: d) if KLAR else (lambda d: geheim.seal(d, KEY))
os.makedirs(p("daten", "klar"), exist_ok=True)
def lade(name):
    k, o = p("daten", "klar", name), p("daten", name)
    if os.path.exists(o):
        d = json.load(open(o, encoding="utf-8"))
        if "items" in d and (not os.path.exists(k) or json.load(open(k, encoding="utf-8")).get("date", "") <= d.get("date", "")):
            json.dump(d, open(k, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return json.load(open(k, encoding="utf-8")) if os.path.exists(k) else None
heute = lade("heute.json")
morgen = lade("morgen.json")
assert heute, "keine Tagesdaten (daten/klar/heute.json)"
# Pflichtfelder prüfen
for k in ("date", "label", "items"):
    assert k in heute, "heute.json: Feld fehlt: " + k
for it in heute["items"]:
    assert re.fullmatch(r"\d{1,2}:\d{2}", it["start"]) and re.fullmatch(r"\d{1,2}:\d{2}", it["end"]), it
    if it["type"] == "lesson":
        for k in ("id", "klasse", "titel", "ziel", "phases", "werke", "fragen", "hilfen", "planB", "mitnehmen"):
            assert k in it, it.get("id", "?") + ": Feld fehlt: " + k
        t = None
        for ph in it["phases"]:
            assert len(ph) >= 5 and isinstance(ph[1], int), ph
bad = [c for c in ("–", "—") if c in json.dumps([heute, morgen], ensure_ascii=False)]
assert not bad, "Lange Gedankenstriche in den Daten"
klar = json.dumps({"heute": heute, "morgen": morgen}, ensure_ascii=False).replace("</", "<\\/")
box = json.dumps(siegel({"heute": heute, "morgen": morgen}), ensure_ascii=False).replace("</", "<\\/")
put = lambda e: re.sub(r"/\*EMBED\*/.*?/\*EMBED_END\*/", lambda m: "/*EMBED*/" + e + "/*EMBED_END*/", app, flags=re.S)
# artifact.html (Claude, privat) mit Klartext; bleibt lokal, nicht im Repo
open(p("artifact.html"), "w", encoding="utf-8").write(put(klar))
frag = put(box)
# Tagesdaten verschlüsselt ablegen
json.dump(siegel(heute), open(p("daten", "heute.json"), "w"), ensure_ascii=False)
if morgen: json.dump(siegel(morgen), open(p("daten", "morgen.json"), "w"), ensure_ascii=False)
elif os.path.exists(p("daten", "morgen.json")): os.remove(p("daten", "morgen.json"))
head_end = frag.index("</style>") + len("</style>")
doc = ('<!doctype html><html lang="de"><head><meta charset="utf-8">'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
       '<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0b0c10">'
       '<link rel="manifest" href="manifest.json"><link rel="icon" href="icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="icon-192.png">'
       '<style>[hidden]{display:none!important}body{margin:0}</style>'
       + frag[:head_end] + "</head><body>" + frag[head_end:] + "</body></html>")
open(p("index.html"), "w", encoding="utf-8").write(doc)
print("gebaut:", heute["date"], len(heute["items"]), "Einträge, morgen:", morgen["date"] if morgen else "keine")
