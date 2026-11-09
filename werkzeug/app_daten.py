#!/usr/bin/env python3
"""Inka-App: Wochendaten verschluesselt ablegen.
Aufruf: app_daten.py <app-klartext.json> <schluesseldatei> <repo-ordner>
Klartext (vom Lauf geschrieben, siehe werkzeug/app_daten.md) -> repo/d/app.json (AES-GCM-Umschlag).
Prueft Pflichtfelder und Formate, bricht bei Fehlern mit Meldung ab."""
import base64, datetime, json, os, re, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

src, key_p, repo = sys.argv[1:4]
cfg = json.load(open(key_p)); cfg = cfg.get("data", cfg)
key = base64.urlsafe_b64decode(cfg["key"] + "=" * (-len(cfg["key"]) % 4))
d = json.load(open(src)); d = d.get("data", d)
DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$"); HM = re.compile(r"^(\d{2}:\d{2})?$")
KINDS = {"fix", "travel", "deadline", "meet", "plan", "event", "birthday", "allday"}
err = []
for i, e in enumerate(d.get("entries", [])):
    if not DAY.match(e.get("date", "")): err.append("entries[%d].date" % i)
    if e.get("kind") not in KINDS: err.append("entries[%d].kind=%s" % (i, e.get("kind")))
    if not HM.match(e.get("start", "") or ""): err.append("entries[%d].start" % i)
    if not e.get("key") or not e.get("title"): err.append("entries[%d] key/title" % i)
for i, t in enumerate(d.get("tasks", [])):
    if not str(t.get("key", "")).startswith("t|"): err.append("tasks[%d].key" % i)
    if t.get("date") and not DAY.match(t["date"]): err.append("tasks[%d].date" % i)
    if not HM.match(t.get("time", "") or ""): err.append("tasks[%d].time" % i)
for i, c in enumerate(d.get("conflicts", [])):
    if not c.get("id") or len(c.get("options", [])) < 1: err.append("conflicts[%d]" % i)
for i, q in enumerate(d.get("questions", [])):
    if not q.get("id") or not q.get("q"): err.append("questions[%d] id/q" % i)
m = d.get("morning")
if m is not None and not isinstance(m.get("lines", None), list): err.append("morning.lines")
if err: sys.exit("Fehler im Klartext: " + ", ".join(err[:20]))
d["topic"] = cfg["topic"]
d.setdefault("made", int(datetime.datetime.now().timestamp() * 1000))
iv = os.urandom(12)
ct = AESGCM(key).encrypt(iv, json.dumps(d, ensure_ascii=False).encode(), None)
os.makedirs(os.path.join(repo, "d"), exist_ok=True)
json.dump({"v": 1, "iv": base64.b64encode(iv).decode(), "ct": base64.b64encode(ct).decode()}, open(os.path.join(repo, "d", "app.json"), "w"))
print(json.dumps({"ok": True, "entries": len(d.get("entries", [])), "tasks": len(d.get("tasks", [])),
                  "conflicts": len(d.get("conflicts", [])), "projects": len(d.get("projects", []))}))
