#!/usr/bin/env python3
"""Inka-Kanal fuer den Stundencheck (verschluesselt ueber ntfy).
  kanal.py <schluesseldatei> lesen [<seit-id>]          -> JSON-Liste der Nachrichten von der App (neueste zuletzt), je {ntfy_id, ...}
  kanal.py <schluesseldatei> quittung <re-id> <ok 1|0> <text>   -> Rueckmeldung an die App (erscheint dort als ✓ oder ✗)
  kanal.py <schluesseldatei> app_lesen <repo> <ausgabe.json>    -> d/app.json entschluesseln (zum Nachziehen nach Auftraegen)
Der Schluessel wird nie ausgegeben."""
import base64, json, os, subprocess, sys, time
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

cfg = json.load(open(sys.argv[1])); cfg = cfg.get("data", cfg)
aes = AESGCM(base64.urlsafe_b64decode(cfg["key"] + "=" * (-len(cfg["key"]) % 4)))
topic = cfg["topic"]; cmd = sys.argv[2]

def openenv(env):
    return json.loads(aes.decrypt(base64.b64decode(env["iv"]), base64.b64decode(env["ct"]), None))

def seal(obj):
    iv = os.urandom(12)
    return {"v": 1, "iv": base64.b64encode(iv).decode(), "ct": base64.b64encode(aes.encrypt(iv, json.dumps(obj, ensure_ascii=False).encode(), None)).decode()}

if cmd == "lesen":
    since = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else "24h"
    out = subprocess.run(["curl", "-s", "https://ntfy.sh/%s/json?poll=1&since=%s" % (topic, since)], capture_output=True, text=True).stdout
    res = []
    for line in out.splitlines():
        try: m = json.loads(line)
        except Exception: continue
        if m.get("event") != "message": continue
        body = m.get("message", "")
        if m.get("attachment"):
            body = subprocess.run(["curl", "-sL", m["attachment"]["url"]], capture_output=True, text=True).stdout
        try: d = openenv(json.loads(body))
        except Exception: continue
        if d.get("from") != "inka": continue
        d["ntfy_id"] = m["id"]; res.append(d)
    print(json.dumps(res, ensure_ascii=False, indent=1))
elif cmd == "quittung":
    re_id, ok, text = sys.argv[3], sys.argv[4] == "1", sys.argv[5]
    msg = {"v": 1, "from": "sekretariat", "kind": "quittung", "re": re_id, "ok": ok, "text": text, "t": int(time.time() * 1000)}
    r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-X", "POST", "--data-binary", json.dumps(seal(msg)), "https://ntfy.sh/" + topic], capture_output=True, text=True).stdout
    print("quittung", re_id, r)
elif cmd == "app_lesen":
    env = json.load(open(os.path.join(sys.argv[3], "d", "app.json")))
    d = openenv(env); d.pop("topic", None)
    json.dump(d, open(sys.argv[4], "w"), ensure_ascii=False, indent=1); print("ok", len(d.get("entries", [])), len(d.get("tasks", [])))
else:
    sys.exit("unbekannt: " + cmd)
