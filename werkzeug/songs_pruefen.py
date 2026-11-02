#!/usr/bin/env python3
"""Songs vor dem Ablegen einer Show prüfen (Josef 2.11.2026: Lee Marvin "Wand'rin' Star" war in Deutschland gesperrt,
die Show blieb an dem Song hängen und Spotify spielte stattdessen alte Titel).

Aufruf: songs_pruefen.py <spotify-token.json> <songs.json>
  spotify-token.json: Feld access (gültiger Zugriffsschlüssel)
  songs.json: Liste [{uri,name,artist,ms}] (wird überschrieben)
Für jeden Song: GET /v1/tracks/{id}?market=from_token. Ist er nicht abspielbar (is_playable false, gesperrt, gelöscht),
sucht das Skript eine abspielbare Fassung desselben Titels vom selben Künstler (Suche) und setzt uri und ms neu.
Gibt es keine, fliegt der Song raus. Ausgabe: eine Zeile je Änderung, am Ende "geprüft: n, ersetzt: x, entfernt: y".
Achtung: Wird ein Song entfernt, muss auch seine Ansage und seine ## [song]-Marke aus dem Sprechtext."""
import json, sys, time, urllib.parse, urllib.request

tok_p, songs_p = sys.argv[1:3]
tok = json.load(open(tok_p)); tok = tok.get("data", tok)
H = {"Authorization": "Bearer " + tok["access"]}


def get(u):
    for i in range(3):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=20))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(int(e.headers.get("Retry-After", "2")) + 1); continue
            if e.code == 404:
                return None
            raise
    return None


songs = json.load(open(songs_p))
out, rep, rm = [], 0, 0
for s in songs:
    tid = s["uri"].split(":")[-1]
    tr = get(f"https://api.spotify.com/v1/tracks/{tid}?market=from_token")
    if tr and tr.get("is_playable") is not False:
        if tr.get("linked_from"):  # Spotify spielt eine verknüpfte Fassung: deren URI nehmen
            s = dict(s, uri=tr["uri"], ms=tr.get("duration_ms", s["ms"]))
        out.append(s); continue
    q = urllib.parse.quote(f'track:{s["name"]} artist:{s["artist"].split(",")[0]}')
    res = get(f"https://api.spotify.com/v1/search?type=track&limit=10&market=from_token&q={q}") or {}
    alt = [t for t in (res.get("tracks") or {}).get("items", []) if t.get("is_playable") and t["uri"] != s["uri"]]
    alt.sort(key=lambda t: abs(t["duration_ms"] - s["ms"]))
    if alt:
        a = alt[0]; out.append(dict(s, uri=a["uri"], ms=a["duration_ms"])); rep += 1
        print(f'ersetzt: {s["artist"]} - {s["name"]} -> {a["album"]["name"]} ({a["uri"]})')
    else:
        rm += 1; print(f'entfernt (nicht abspielbar, keine andere Fassung): {s["artist"]} - {s["name"]}')
json.dump(out, open(songs_p, "w"), ensure_ascii=False)
print(f"geprüft: {len(songs)}, ersetzt: {rep}, entfernt: {rm}")
