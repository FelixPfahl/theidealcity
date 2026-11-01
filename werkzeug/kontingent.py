"""ElevenLabs-Sprachkontingent fuer die App (Josef 1.11.2026: "zeig mir immer gleich das verbleibende Sprachkontingent").
abfragen(key) -> {"used","limit","rest","reset","at"} oder None. Aufruf direkt:
python3 -I kontingent.py <elevenlabs-schluesseldatei> <inka-schluessel.json> <repo>   schreibt d/quota.json (verschluesselt)."""
import base64, json, os, subprocess, sys, time


def abfragen(key):
    try:
        r = subprocess.run(["curl", "-s", "-m", "20", "https://api.elevenlabs.io/v1/user/subscription", "-H", "xi-api-key: " + key],
                           capture_output=True, text=True).stdout
        d = json.loads(r)
        used, limit = int(d["character_count"]), int(d["character_limit"])
        return {"used": used, "limit": limit, "rest": limit - used, "reset": int(d.get("next_character_count_reset_unix") or 0),
                "tier": d.get("tier", ""), "at": int(time.time() * 1000)}
    except Exception:
        return None


def schreiben(q, inka_key_json, repo):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    cfg = json.load(open(inka_key_json)); cfg = cfg.get("data", cfg)
    k = cfg["key"]; k += "=" * (-len(k) % 4)
    aes = AESGCM(base64.urlsafe_b64decode(k)); iv = os.urandom(12)
    b = lambda x: base64.b64encode(x).decode()
    json.dump({"v": 1, "iv": b(iv), "ct": b(aes.encrypt(iv, json.dumps(q).encode(), None))}, open(os.path.join(repo, "d", "quota.json"), "w"))


if __name__ == "__main__":
    key = open(sys.argv[1]).read().strip()
    q = abfragen(key)
    if not q: sys.exit("Kontingent nicht abrufbar")
    schreiben(q, sys.argv[2], sys.argv[3])
    print(json.dumps({"rest": q["rest"], "limit": q["limit"]}))
