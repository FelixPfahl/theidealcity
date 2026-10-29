"""heute.json (Ersatzdaten für Atelier) verschlüsseln. Aufruf: ATELIER_SCHLUESSEL=... python3 -I werkzeuge/verschluesseln.py
Klartext liegt nur lokal in klar/heute.json (nicht im Repo)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geheim
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = os.environ.get("ATELIER_SCHLUESSEL", "")
assert len(geheim.norm(KEY)) == 16, "ATELIER_SCHLUESSEL fehlt"
os.makedirs(os.path.join(root, "klar"), exist_ok=True)
src = os.path.join(root, "heute.json"); klar = os.path.join(root, "klar", "heute.json")
d = json.load(open(src, encoding="utf-8"))
if "termine" in d: json.dump(d, open(klar, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
d = json.load(open(klar, encoding="utf-8"))
json.dump(geheim.seal(d, KEY), open(src, "w"))
print("verschlüsselt:", d["datum"])
