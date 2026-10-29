"""Verschlüsselte Tagesdaten lesbar ausgeben (nur lokal, nie committen).
Aufruf: ATELIER_SCHLUESSEL=... python3 -I werkzeuge/zeige.py daten/heute.json"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geheim
box = json.load(open(sys.argv[1], encoding="utf-8"))
print(json.dumps(geheim.open_(box, os.environ["ATELIER_SCHLUESSEL"]) if "iv" in box else box, ensure_ascii=False, indent=1))
