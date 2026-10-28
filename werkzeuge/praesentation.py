"""Hilfen, um Präsentationen (.atelier.json) als Daten anzulegen (Claude baut, Josef feilt)."""
import json, random, string
def uid(): return "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(8))
def pres(klasse, titel, datum, start, ende, ziel, phases, slides, schrift="Jost", titelschrift=None, akzent="#0028FF", notiz=""):
    out = {"format": "atelier-folien", "version": 1, "id": uid(),
           "meta": {"klasse": klasse, "titel": titel, "datum": datum, "start": start, "ende": ende, "ziel": ziel},
           "konzept": {"schrift": schrift, "titelschrift": titelschrift or schrift, "akzent": akzent, "notiz": notiz},
           "phases": [{"d": d, "form": f, "titel": t, "puffer": pu} for d, f, t, pu in phases],
           "slides": []}
    for s in slides:
        s = dict(s); s.setdefault("id", uid()); out["slides"].append(s)
    txt = json.dumps(out, ensure_ascii=False)
    assert "–" not in txt and "—" not in txt, "Langer Gedankenstrich"
    return out
def save(p, path):
    json.dump(p, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
