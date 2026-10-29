"""Verschlüsselung der Tagesdaten (gleiches Verfahren wie geheim.js)."""
import os, json, base64, hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
def norm(s): return "".join(c for c in str(s).lower() if c.isalnum())
def _key(s, salt): return hashlib.pbkdf2_hmac("sha256", norm(s).encode(), salt.encode(), 150000, 32)
def seal(obj, s, salt="atelier-daten-v1"):
    iv = os.urandom(12)
    ct = AESGCM(_key(s, salt)).encrypt(iv, json.dumps(obj, ensure_ascii=False).encode("utf-8"), None)
    return {"v": 1, "iv": base64.b64encode(iv).decode(), "ct": base64.b64encode(ct).decode()}
def open_(box, s, salt="atelier-daten-v1"):
    return json.loads(AESGCM(_key(s, salt)).decrypt(base64.b64decode(box["iv"]), base64.b64decode(box["ct"]), None))
def topic(s):
    return "atelier-" + hashlib.sha256(("atelier-topic-v1:" + norm(s)).encode()).hexdigest()[:24]
