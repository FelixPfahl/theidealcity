"""Baut index.html (Webversion) und artifact.html (Claude-Fassung) aus app.html und daten/*.json.
Aufruf im Zweig-Ordner: python3 -I werkzeuge/bauen.py"""
import json, os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = lambda *a: os.path.join(root, *a)
app = open(p("app.html"), encoding="utf-8").read()
heute = json.load(open(p("daten", "heute.json"), encoding="utf-8"))
morgen = None
if os.path.exists(p("daten", "morgen.json")):
    morgen = json.load(open(p("daten", "morgen.json"), encoding="utf-8"))
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
embed = json.dumps({"heute": heute, "morgen": morgen}, ensure_ascii=False).replace("</", "<\\/")
frag = re.sub(r"/\*EMBED\*/.*?/\*EMBED_END\*/", lambda m: "/*EMBED*/" + embed + "/*EMBED_END*/", app, flags=re.S)
open(p("artifact.html"), "w", encoding="utf-8").write(frag)
head_end = frag.index("</style>") + len("</style>")
doc = ('<!doctype html><html lang="de"><head><meta charset="utf-8">'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
       '<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0b0c10">'
       '<style>[hidden]{display:none!important}body{margin:0}</style>'
       + frag[:head_end] + "</head><body>" + frag[head_end:] + "</body></html>")
open(p("index.html"), "w", encoding="utf-8").write(doc)
print("gebaut:", heute["date"], len(heute["items"]), "Einträge, morgen:", morgen["date"] if morgen else "keine")
