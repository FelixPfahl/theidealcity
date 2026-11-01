#!/usr/bin/env python3
"""Songs der letzten 7 Tage (Josef 1.11.2026: "in den Shows einer Woche nie zweimal der gleiche Song", rollend 7 Tage).

Aufruf: python3 -I songs_woche.py <schluesseldatei> <repo> <JJJJ-MM-TT> <ausgabe.json>
Liest den verschluesselten Index d/shows.json und alle Shows vom Tag minus 6 bis Tag plus 6
(auch schon bestellte Shows der naechsten Tage) und schreibt eine Liste {"uris": [...], "shows": [...]}.
Die neue Show darf keine dieser URIs enthalten.
"""
import base64, datetime, json, os, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

key_p, repo, day, out_p = sys.argv[1:5]
cfg = json.load(open(key_p)); cfg = cfg.get("data", cfg)
k = cfg["key"]; k += "=" * (-len(k) % 4)
aes = AESGCM(base64.urlsafe_b64decode(k))


def opn(p):
    e = json.load(open(p))
    return json.loads(aes.decrypt(base64.b64decode(e["iv"]), base64.b64decode(e["ct"]), None))


d0 = datetime.date.fromisoformat(day)
lo, hi = (d0 - datetime.timedelta(days=6)).isoformat(), (d0 + datetime.timedelta(days=6)).isoformat()
ids = set()
ip = os.path.join(repo, "d", "shows.json")
if os.path.exists(ip):
    ids |= {x["id"] for x in opn(ip).get("shows", [])}
ids |= {f[:-5] for f in os.listdir(os.path.join(repo, "d")) if f[:4].isdigit() and f.endswith(".json")}
uris, used = [], []
for sid in sorted(ids):
    if not (lo <= sid[:10] <= hi):
        continue
    try:
        doc = opn(os.path.join(repo, "d", sid + ".json"))
    except Exception:
        continue
    s = [x.get("uri") for x in doc.get("songs") or [] if x.get("uri")]
    uris += s; used.append({"id": sid, "songs": len(s)})
json.dump({"uris": sorted(set(uris)), "shows": used}, open(out_p, "w"))
print(json.dumps({"gesperrt": len(set(uris)), "shows": used}))
