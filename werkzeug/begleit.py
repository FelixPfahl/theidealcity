#!/usr/bin/env python3
"""Inka-Begleitseite: Show-Daten verschluesselt in den Branch "inka" von FelixPfahl/theidealcity legen.
Aufruf: begleit.py <show-doc.json> <show.mp4|-> <entries.json|-> <schluesseldatei> <repo-ordner> [<slot>]
Slot (optional, z. B. "fahrt"): weitere Show am selben Tag, Dateien d/<JJJJ-MM-TT>_<slot>.json/.bin, Titel aus doc["title"].
Alle Shows stehen verschluesselt im Index d/shows.json; die App bietet bei mehreren Shows an einem Tag eine Auswahl.
Schluesseldatei: JSON {"key": "<base64url 32 Byte>", "topic": "<ntfy-Thema>"}
Ergebnis im Repo-Ordner: d/<JJJJ-MM-TT>.json (AES-GCM-Umschlag) und d/<JJJJ-MM-TT>.bin (12 Byte IV + Chiffrat).
Dateien aelter als 3 Tage werden entfernt. Committen und pushen macht der Aufrufer."""
import base64, datetime, json, os, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

doc_p, mp4_p, ent_p, key_p, repo = sys.argv[1:6]
slot = (sys.argv[6] if len(sys.argv) > 6 else "").strip().lower()
assert all(c.isalnum() or c == "-" for c in slot), "Slot nur Buchstaben, Ziffern, Bindestrich"
cfg = json.load(open(key_p))
cfg = cfg.get("data", cfg)
pad = lambda s: s + "=" * (-len(s) % 4)
key = base64.urlsafe_b64decode(pad(cfg["key"]))
assert len(key) == 32
aes = AESGCM(key)
b64 = lambda b: base64.b64encode(b).decode()

doc = json.load(open(doc_p))
doc = doc.get("data", doc)
day = doc["day"]
fid = day + ("_" + slot if slot else "")
keep = ["day", "title", "kind", "duration", "chapters", "voice", "made", "checked", "weather", "trips", "hints",
        "questions", "songs", "agentId", "nochat", "text"]  # text: Archiv und Drive-Export
out = {k: doc.get(k) for k in keep if k in doc}
out["entries"] = json.load(open(ent_p)) if ent_p != "-" and os.path.exists(ent_p) else []
out["topic"] = cfg["topic"]
out["published"] = int(datetime.datetime.now().timestamp() * 1000)
out["id"] = fid; out["slot"] = slot
os.makedirs(os.path.join(repo, "d"), exist_ok=True)
if mp4_p != "-" and os.path.exists(mp4_p):
    iv = os.urandom(12)
    open(os.path.join(repo, "d", fid + ".bin"), "wb").write(iv + aes.encrypt(iv, open(mp4_p, "rb").read(), None))
    out["audio"] = True
else:
    out["audio"] = False
iv = os.urandom(12)
ct = aes.encrypt(iv, json.dumps(out, ensure_ascii=False).encode(), None)
json.dump({"v": 1, "iv": b64(iv), "ct": b64(ct)}, open(os.path.join(repo, "d", fid + ".json"), "w"))

# Archiv: alle Shows bleiben dauerhaft gespeichert (Josef 1.11.2026), nichts wird geloescht.
# Index aller Shows (verschluesselt)
ip = os.path.join(repo, "d", "shows.json")
idx = []
if os.path.exists(ip):
    try:
        e = json.load(open(ip)); idx = json.loads(aes.decrypt(base64.b64decode(e["iv"]), base64.b64decode(e["ct"]), None)).get("shows", [])
    except Exception:
        idx = []
files = set(os.listdir(os.path.join(repo, "d")))
idx = [x for x in idx if x.get("id") != fid and (x.get("id", "") + ".json") in files]
for f in sorted(files):  # aeltere Shows ohne Indexeintrag (vor Einfuehrung des Index) nachtragen
    if f.endswith(".json") and f[:4].isdigit() and f[:-5] != fid and not any(x.get("id") == f[:-5] for x in idx):
        sid = f[:-5]; idx.append({"id": sid, "day": sid[:10], "slot": sid[11:], "title": "", "duration": None, "published": None})
idx.append({"id": fid, "day": day, "slot": slot, "title": doc.get("title") or ("" if not slot else slot.capitalize()),
            "duration": out.get("duration"), "published": out["published"]})
idx.sort(key=lambda x: (x["day"], x["slot"] != "", x["slot"]))
iv = os.urandom(12)
json.dump({"v": 1, "iv": b64(iv), "ct": b64(aes.encrypt(iv, json.dumps({"shows": idx}, ensure_ascii=False).encode(), None))}, open(ip, "w"))
print(json.dumps({"id": fid, "shows": [x["id"] for x in idx], "day": day, "audio": out["audio"], "entries": len(out["entries"]),
                  "files": sorted(os.listdir(os.path.join(repo, "d")))}))
