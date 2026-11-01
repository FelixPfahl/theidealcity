# Show auf Bestellung (Maske "Neue Show erstellen" in der Inka-App)

Josef bestellt in der App eine Show. Sie kommt verschlüsselt über den Kanal als Auftrag:
`kind "aktion", tool "show_bestellen"`, args:
`anlass, datum (JJJJ-MM-TT), start (HH:MM oder leer), laenge_min (gesamt mit Songs), thema, geschichte, figuren[], songs, ton, tiefe, ertappt, klaenge, nachrichten, kunst, aufgaben, freitext`.

Der Stundencheck führt den Auftrag sofort aus (eigener Tokenrahmen bis 300.000), ohne Rückfrage.

## Ablauf
1. Repo holen (wie im Stundencheck 0g), Schlüssel aus der App-Datenbank: `inka/schluessel`, `inka/elevenlabs`, `inka/kanon` (out_dir, Inhalt nie anzeigen).
2. `werkzeug/show_struktur.md` und den Kanon (`k/inka/kanon.json`, Feld text) vollständig lesen. Ton, Figuren, Klänge und Regeln gelten wie bei der Morgenshow, die Wünsche aus der Bestellung gehen vor.
3. Daten nach Bedarf: Kalender und Todoist für den bestellten Tag (Fahrten, Termine, Fristen), Wetter, Perlentaucher (nach `nachrichten`), Kunst (nach `kunst`). Fakten nur aus Quellen.
4. Länge: `laenge_min` gesamt. Songs: "Halb-halb" = halbe Zeit Songs; "Mehr Musik" = zwei Drittel; "Mehr Sprache" = ein Drittel; "Keine Songs". Songs aus den Spotify-Top-Tracks (wie im Morgenlauf, Token `spotify/token`), nicht dieselben wie in der Show desselben Tages. Sprache: 150 Wörter je Minute (das Skript beschleunigt).
5. `geschichte`: "Fortsetzungsgeschichte in Folgen" = Folgen zwischen den Blöcken mit Spannungsbogen, keine Spoiler aus dem Finale des Comics. `ertappt` steuert die Ertappt-Szenen. `figuren`: nur diese Figuren (X Æ A-13 per Sprecher `XAE:`, Gojira nur als `KLANG: gojira <Sek.>`). `aufgaben` Ja = Zeichenaufgaben fürs Skizzenbuch am Ende. `freitext` beachten.
6. Faktenprüfung wie im Morgenlauf (Prüfer-Agent, höchstens 2 Durchgänge).
7. Audio: ElevenLabs-Kontingent prüfen; über 60 Minuten Sprache oder Rest unter 40.000: `EL_MODEL=eleven_flash_v2_5`, sonst `eleven_v3`. `python3 -I repo/werkzeug/show_tts.py show.txt out <elevenlabs-schlüsseldatei>`.
8. Ablegen: doc.json mit `day`, `title` (z. B. "Die lange Fahrt", "Abendshow"), `kind "bestellt"`, `duration`, `chapters`, `voice`, `made`, `text`, `checked`, `weather`, `trips`, `hints`, `questions` (leer, wenn keine Fragen gewünscht), `songs`, `nochat` (true bei Fahrt und Lauf). Dann `python3 -I repo/werkzeug/begleit.py doc.json out/show.mp4 entries.json k/inka/schluessel.json repo <slot>`; Slot = kurzer Name ohne Leerzeichen (fahrt, abend, lauf, extra). Gibt es für den Tag noch keine Show, ohne Slot (dann ist sie die Show des Tages). Commit "Show bestellt <JJJJ-MM-TT> <slot>", push origin inka.
9. Quittung an die App: `kanal.py quittung <id> 1 "Show '<Titel>' für <TT.MM.> liegt bereit, <Min> Min"` bzw. bei Fehler 0 mit Grund.
10. Liegt die bestellte Show auf einem Tag, für den noch kein Morgenlauf gelaufen ist, und ist sie die Show des Tages (ohne Slot), lässt der Morgenlauf seine eigene Show weg (Regel im Morgenlauf).
