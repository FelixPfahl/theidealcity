#!/usr/bin/env python3
"""Baut Veröffentlichungen aus den Dev Tools ein (Josef, 19.11.2026, Etappe 1).

Der Worker (backend/worker.js) legt jede Veröffentlichung als data/inbox/<id>.json ab.
Dieses Skript läuft in der GitHub Action (.github/workflows/apply.yml):
  1. jede Datei in data/inbox/ der Reihe nach (sortiert nach id = Zeitstempel)
  2. kind 'publish': payload einbauen
       regler      -> var PUB = {...}; in assets/cfg.js   (null löscht einen Schlüssel)
       texte       -> assets/game/talk.json, gleiche Logik wie devApply in world.js
       korrekturen -> eindeutiges Suchen/Ersetzen in der Seite bzw. im Spieltext
     Die Umkehrung (wieder ein payload) landet in data/applied/<id>.json.
  3. kind 'revert': die gespeicherte Umkehrung von <target> wird eingebaut.
  4. Fehler: data/applied/<id>.failed.json, nichts an den Dateien geändert.
  5. Versionskennungen ?v= in allen HTML-Dateien neu berechnen.
Danach committet die Action und stößt den Pages-Build an.
"""
import hashlib, json, os, re, sys, glob, traceback
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INBOX = os.path.join(ROOT, 'data', 'inbox')
APPLIED = os.path.join(ROOT, 'data', 'applied')
CFG = os.path.join(ROOT, 'assets', 'cfg.js')
TALK = os.path.join(ROOT, 'assets', 'game', 'talk.json')
PUB_RE = re.compile(r'var PUB = (\{.*?\});(?=\s*/\*)')
KEY_RE = re.compile(r'^[a-z][a-z0-9_]*(\.[a-z0-9_-]+)+(@[dm])?$')


def rd(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def wr(p, s):
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        f.write(s)


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


# ---------- Regler ----------
class Files:
    """Sammelt Änderungen im Speicher; geschrieben wird erst, wenn alles geklappt hat."""
    def __init__(self):
        self.buf = {}

    def get(self, p):
        if p not in self.buf:
            self.buf[p] = rd(p)
        return self.buf[p]

    def set(self, p, s):
        self.buf[p] = s

    def flush(self):
        changed = []
        for p, s in self.buf.items():
            if rd(p) != s:
                wr(p, s)
                changed.append(os.path.relpath(p, ROOT))
        return changed


def apply_regler(F, reg):
    src = F.get(CFG)
    m = PUB_RE.search(src)
    if not m:
        raise RuntimeError('var PUB = {...}; nicht in assets/cfg.js gefunden')
    pub = json.loads(m.group(1))
    inv = {}
    for k, v in reg.items():
        if not KEY_RE.match(k):
            raise RuntimeError('Ungültiger Regler-Schlüssel: ' + k)
        if v is not None and not isinstance(v, (int, float, str, bool)):
            raise RuntimeError('Ungültiger Regler-Wert für ' + k)
        inv[k] = pub.get(k)
        if v is None:
            pub.pop(k, None)
        else:
            pub[k] = v
    lit = json.dumps(dict(sorted(pub.items())), ensure_ascii=False, separators=(', ', ': '))
    F.set(CFG, src[:m.start(1)] + lit + src[m.end(1):])
    return inv


# ---------- Texte (talk.json) ----------
def apply_texte(F, tx):
    D = json.loads(F.get(TALK))
    D.setdefault('convos', []); D.setdefault('scenes', {}); D.setdefault('beh', {})
    inv = {'convos': {}, 'scenes': {}, 'beh': {}}
    for cid, v in (tx.get('convos') or {}).items():
        idx = next((i for i, c in enumerate(D['convos']) if c.get('id') == cid), -1)
        inv['convos'][cid] = D['convos'][idx] if idx >= 0 else None
        if v is None:
            if idx >= 0:
                D['convos'].pop(idx)
        else:
            if not isinstance(v, dict):
                raise RuntimeError('Dialog ' + cid + ' ist kein Objekt')
            v = dict(v); v['id'] = cid
            if idx >= 0:
                D['convos'][idx] = v
            else:
                D['convos'].append(v)
    for part in ('scenes', 'beh'):
        for k, v in (tx.get(part) or {}).items():
            inv[part][k] = D[part].get(k)
            if v is None:
                D[part].pop(k, None)
            else:
                D[part][k] = v
    F.set(TALK, json.dumps(D, ensure_ascii=False, separators=(',', ':')))
    return inv


# ---------- Korrekturen ----------
def page_file(page):
    page = re.sub(r'[^a-z0-9_-]', '', (page or 'index').lower()) or 'index'
    p = os.path.join(ROOT, 'de', page + '.html')
    return p if os.path.exists(p) else None


def html_esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def loose(s):
    """Text so suchen, wie er im Browser normalisiert erscheint: Leerraum flexibel, Tags/Umbrüche dazwischen erlaubt."""
    words = [re.escape(w) for w in s.split()]
    return re.compile(r'(?:\s|<br\s*/?>)+'.join(words)) if words else None


HIDDEN_RE = re.compile(r'<head\b.*?</head>|<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->', re.S | re.I)


def find_unique(text, old_variants, html=False):
    """Genau eine Fundstelle; in HTML zählen nur sichtbare Stellen (nicht head, script, style, Kommentare)."""
    hidden = [(m.start(), m.end()) for m in HIDDEN_RE.finditer(text)] if html else []
    vis = lambda a: not any(x <= a < y for x, y in hidden)
    for o in old_variants:
        if not o:
            continue
        hits = [m.start() for m in re.finditer(re.escape(o), text) if vis(m.start())]
        if len(hits) == 1:
            return hits[0], hits[0] + len(o), o
    for o in old_variants:
        rx = loose(o)
        if rx:
            hits = [m for m in rx.finditer(text) if vis(m.start())]
            if len(hits) == 1:
                return hits[0].start(), hits[0].end(), hits[0].group(0)
    return None


def apply_korrekturen(F, kor):
    inv, notes = [], []
    for k in kor:
        # Umkehrung einer früheren Korrektur: exakte Angaben
        if k.get('file'):
            p = os.path.join(ROOT, k['file'])
            if not os.path.abspath(p).startswith(ROOT) or not os.path.exists(p):
                notes.append('Datei fehlt: ' + k['file']); continue
            s = F.get(p)
            if s.count(k['find']) != 1:
                notes.append('Nicht eindeutig zurückzunehmen in ' + k['file'] + ': ' + k['find'][:60]); continue
            F.set(p, s.replace(k['find'], k['replace']))
            inv.append({'file': k['file'], 'find': k['replace'], 'replace': k['find']})
            continue
        old, new = str(k.get('old') or ''), str(k.get('new') or '')
        if not old or old == new:
            continue
        cands = []
        pf = page_file(k.get('page'))
        if k.get('where') == 'seite' and pf:
            cands = [(pf, 'html')]
        else:
            cands = [(TALK, 'json'), (os.path.join(ROOT, 'assets', 'game.js'), 'js'), (os.path.join(ROOT, 'assets', 'app.js'), 'js')]
            if pf:
                cands.append((pf, 'html'))
        hit = None
        for p, kind in cands:
            s = F.get(p)
            if kind == 'html':
                variants, enc = [old, html_esc(old)], html_esc
            elif kind == 'json':
                variants, enc = [json.dumps(old, ensure_ascii=False)[1:-1]], lambda x: json.dumps(x, ensure_ascii=False)[1:-1]
            else:
                variants, enc = [old], lambda x: x
            r = find_unique(s, variants, kind == 'html')
            if r:
                hit = (p, s, r, enc); break
        if not hit:
            notes.append('Nicht eindeutig gefunden (' + str(k.get('where')) + ', ' + str(k.get('page')) + '): ' + old[:80]); continue
        p, s, (a, b, found), enc = hit
        rep = enc(new)
        F.set(p, s[:a] + rep + s[b:])
        inv.append({'file': os.path.relpath(p, ROOT), 'find': rep, 'replace': found})
    return inv, notes


# ---------- Versionen ----------
def md5(*paths):
    h = hashlib.md5()
    for p in paths:
        with open(p, 'rb') as f:
            h.update(f.read())
    return h.hexdigest()[:8]


def versions():
    A = lambda *x: os.path.join(ROOT, 'assets', *x)
    tags = {
        'assets/cfg.js': md5(A('cfg.js')),
        'assets/app.js': md5(A('app.js')),
        'assets/style.css': md5(A('style.css')),
        # world.js und talk.json laden mit der Kennung von game.js, darum fließen sie mit ein
        'assets/game.js': md5(A('game.js'), A('game', 'world.js'), A('game', 'talk.json')),
    }
    rx = re.compile(r'(assets/(?:cfg\.js|app\.js|style\.css|game\.js))\?v=[0-9a-f]+')
    changed = []
    files = glob.glob(os.path.join(ROOT, '*.html')) + glob.glob(os.path.join(ROOT, 'de', '*.html')) + glob.glob(os.path.join(ROOT, 'musterbuch', '**', '*.html'), recursive=True)
    for p in files:
        s = rd(p)
        t = rx.sub(lambda m: m.group(1) + '?v=' + tags[m.group(1)], s)
        if t != s:
            wr(p, t); changed.append(os.path.relpath(p, ROOT))
    return changed


# ---------- Dateien aus der Werkstatt (19.11.2026): Sprites, Klänge, Werkbilder, welt.json ----------
UPLOADS = os.path.join(ROOT, 'data', 'uploads')


def apply_dateien(iid, files):
    import base64
    base = os.path.join(UPLOADS, iid)
    n = 0
    for f in files:
        name = f.get('name', '')
        if not re.match(r'^[A-Za-z0-9_\-][A-Za-z0-9_.\-/]{0,160}$', name) or '..' in name:
            raise RuntimeError('Ungültiger Dateiname: ' + name)
        p = os.path.join(base, name)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'wb') as fh:
            fh.write(base64.b64decode(f.get('b64', '')))
        n += 1
    return iid, n


def drop_dateien(iid):
    import shutil
    if not re.match(r'^[0-9]{14}-[a-z0-9]{6}$', str(iid)):
        raise RuntimeError('Ungültige id für Dateien: ' + str(iid))
    shutil.rmtree(os.path.join(UPLOADS, iid), ignore_errors=True)


# ---------- Ablauf ----------
def handle(path):
    item = json.loads(rd(path))
    iid = item.get('id') or os.path.basename(path)[:-5]
    if not re.match(r'^[0-9]{14}-[a-z0-9]{6}$', iid):
        raise RuntimeError('Ungültige id: ' + iid)
    rec = {'id': iid, 'kind': item.get('kind'), 'author': item.get('author'), 'message': item.get('message'),
           'created': item.get('created'), 'applied': now()}
    F = Files()
    if item.get('kind') == 'revert':
        tgt = item.get('target', '')
        tp = os.path.join(APPLIED, tgt + '.json')
        if not re.match(r'^[0-9]{14}-[a-z0-9]{6}$', tgt) or not os.path.exists(tp):
            raise RuntimeError('Ziel zum Zurückrollen nicht gefunden: ' + tgt)
        T = json.loads(rd(tp))
        if T.get('reverted_by'):
            raise RuntimeError(tgt + ' ist schon zurückgerollt (' + T['reverted_by'] + ')')
        payload = T.get('inverse') or {}
        rec['target'] = tgt
    else:
        payload = item.get('payload') or {}
    inverse, notes = {}, []
    # Reihenfolge: Korrekturen zuerst auf die alten Texte, dann Texte, dann Regler
    if payload.get('korrekturen'):
        inv, notes = apply_korrekturen(F, payload['korrekturen'])
        if inv:
            inverse['korrekturen'] = list(reversed(inv))
    if payload.get('texte'):
        inverse['texte'] = apply_texte(F, payload['texte'])
    if payload.get('regler'):
        inverse['regler'] = apply_regler(F, payload['regler'])
    if payload.get('dateien'):
        inverse['dateien_weg'], n = apply_dateien(iid, payload['dateien'])
        notes.append('%d Dateien in data/uploads/%s/ (Einbau ins Spiel durch Claude)' % (n, iid))
    if payload.get('dateien_weg'):
        drop_dateien(payload['dateien_weg'])
    rec['files'] = F.flush()
    rec['inverse'] = inverse
    rec['notes'] = notes
    if item.get('kind') == 'revert':
        tp = os.path.join(APPLIED, item['target'] + '.json')
        T = json.loads(rd(tp)); T['reverted_by'] = iid
        wr(tp, json.dumps(T, ensure_ascii=False, indent=1))
    wr(os.path.join(APPLIED, iid + '.json'), json.dumps(rec, ensure_ascii=False, indent=1))
    return iid, rec


def main():
    os.makedirs(APPLIED, exist_ok=True)
    items = sorted(p for p in glob.glob(os.path.join(INBOX, '*.json')))
    msgs = []
    for p in items:
        iid = os.path.basename(p)[:-5]
        try:
            iid, rec = handle(p)
            msgs.append('%s: %s (%s)%s' % (iid, rec.get('message') or '', ', '.join(rec['files']) or 'keine Änderung',
                                             ' Hinweise: ' + '; '.join(rec['notes']) if rec['notes'] else ''))
        except Exception as e:
            wr(os.path.join(APPLIED, iid + '.failed.json'), json.dumps(
                {'id': iid, 'error': str(e), 'trace': traceback.format_exc()[-2000:], 'applied': now()}, ensure_ascii=False, indent=1))
            msgs.append('%s: FEHLER %s' % (iid, e))
        os.remove(p)
    if items:
        versions()
    print('\n'.join(msgs))
    out = os.environ.get('GITHUB_OUTPUT')
    if out:
        with open(out, 'a') as f:
            f.write('count=%d\n' % len(items))
            f.write('summary<<EOF\n%s\nEOF\n' % '\n'.join(msgs))


if __name__ == '__main__':
    sys.exit(main())
