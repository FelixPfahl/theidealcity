"""Baut index.html aus app.html (QR-Bibliothek eingebettet).
Aufruf im Ordner: python3 -I werkzeuge/bauen.py"""
import os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = open(os.path.join(root, "app.html"), encoding="utf-8").read()
qr = open(os.path.join(root, "werkzeuge", "qrcode.js"), encoding="utf-8").read()
assert "</script" not in qr
out = app.replace("/*QRLIB*/", qr, 1)
for bad in ("–", "—"):
    assert bad not in app, "Langer Gedankenstrich in app.html"
open(os.path.join(root, "index.html"), "w", encoding="utf-8").write(out)
print("gebaut:", len(out) // 1024, "KB")
