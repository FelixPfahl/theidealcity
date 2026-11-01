#!/usr/bin/env python3
"""Inka-Begleitseite: Show-Daten verschluesselt in den Branch "inka" von FelixPfahl/theidealcity legen.
Aufruf: begleit.py <show-doc.json> <show.mp4|-> <entries.json|-> <schluesseldatei> <repo-ordner>
Schluesseldatei: JSON {"key": "<base64url 32 Byte>", "topic": "<ntfy-Thema>"}
Ergebnis im Repo-Ordner: d/<JJJJ-MM-TT>.json (AES-GCM-Umschlag) und d/<JJJJ-MM-TT>.bin (12 Byte IV + Chiffrat).
Dateien aelter als 3 Tage werden entfernt. Committen und pushen macht der Aufrufer."""
import base64, datetime, json, os, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

doc_p, mp4_p, ent_p, key_p, repo = sys.argv[1:6]
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
keep = ["day", "kind", "duration", "chapters", "voice", "made", "checked", "weather", "trips", "hints",
        "questions", "songs", "agentId"]
out = {k: doc.get(k) for k in keep if k in doc}
out["entries"] = json.load(open(ent_p)) if ent_p != "-" and os.path.exists(ent_p) else []
out["topic"] = cfg["topic"]
out["published"] = int(datetime.datetime.now().timestamp() * 1000)
os.makedirs(os.path.join(repo, "d"), exist_ok=True)
if mp4_p != "-" and os.path.exists(mp4_p):
    iv = os.urandom(12)
    open(os.path.join(repo, "d", day + ".bin"), "wb").write(iv + aes.encrypt(iv, open(mp4_p, "rb").read(), None))
    out["audio"] = True
else:
    out["audio"] = False
iv = os.urandom(12)
ct = aes.encrypt(iv, json.dumps(out, ensure_ascii=False).encode(), None)
json.dump({"v": 1, "iv": b64(iv), "ct": b64(ct)}, open(os.path.join(repo, "d", day + ".json"), "w"))

# Aufraeumen: nur die letzten 3 Tage behalten
cut = (datetime.date.fromisoformat(day) - datetime.timedelta(days=3)).isoformat()
for f in os.listdir(os.path.join(repo, "d")):
    if f[:10] < cut:
        os.remove(os.path.join(repo, "d", f))
print(json.dumps({"day": day, "audio": out["audio"], "entries": len(out["entries"]),
                  "files": sorted(os.listdir(os.path.join(repo, "d")))}))
