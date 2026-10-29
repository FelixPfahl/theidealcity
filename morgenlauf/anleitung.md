# Morgenlauf für Pult und Atelier

Geplante Aufgabe, Mo bis Fr früh (Europe/Berlin). Füllt Pult mit den Stunden von heute und morgen; Atelier liest dieselben Daten.

## Ablauf
1. Heute und den nächsten Schultag bestimmen (Ferien- und Feiertagskalender beachten).
2. Je Tag: Unterrichtskalender (Stunden, Aufsichten, Präsenzstunden, Vorbereitungsblöcke) und das Tagesmemo im Drive-Ordner Schule_Material/Tagesmemos_2026-27/<JJJJ-MM-TT> lesen (Verlaufspläne, Drucksachen, Material, Ratschläge).
3. Daten nach dem Format unten im Klartext schreiben: `daten/heute.json`, `daten/morgen.json` (an freien Tagen `items: []`). Die Dateien im Repo sind verschlüsselt; die bisherige Fassung als Vorlage zeigt `ATELIER_SCHLUESSEL=… python3 -I werkzeuge/zeige.py daten/heute.json`.
   - Ohne Verlaufsplan: Grobplan aus der Kalenderbeschreibung, im Titel „(Grobplan)“.
   - Kernfakten zu Werken kurz an Museum oder Werkverzeichnis prüfen, Unsicheres weglassen.
   - Plan B und Hilfen dürfen Vorschläge sein; Impulsfragen mit erwarteter Antwort.
   - Bewertung offen: Einheiten, die heute enden. MB-Hinweis nur in der Oberstufe.
   - Keine Schülernamen, keine Noten, keine privaten Kennungen, keine langen Gedankenstriche.
4. `ATELIER_SCHLUESSEL=… python3 -I werkzeuge/bauen.py` (prüft Pflichtfelder, legt den Klartext in `daten/klar/` ab und verschlüsselt `daten/*.json` und die eingebetteten Daten), dann `ATELIER_SCHLUESSEL=… python3 -I werkzeuge/test.py` (muss „FEHLER: keine“ melden; sonst Fehler in den Daten beheben, höchstens zwei Versuche).
   Vor dem Commit prüfen: `daten/heute.json` und `daten/morgen.json` beginnen mit `{"v": 1, "iv"`; `daten/klar/` und `artifact.html` sind nicht im Commit (stehen in .gitignore). Der Schlüssel steht nie im Repo, in Commit-Nachrichten oder in der Ausgabe.
5. Commit „Pult JJJJ-MM-TT“, Push nach origin pult. Nie main, nie Force-Push.
6. Claude-Fassung: `artifact.html` auf das bestehende Pult-Artifact veröffentlichen.

## Format (Auszug, Vorlage: daten/heute.json)
- Tag: `date`, `label`, `items`, `drucken`, `bewertung` [{k,t}], `bewertungHinweis`
- Termin: `{type:"other", start:"9:30", end:"9:45", titel, sub?}`
- Stunde: `{type:"lesson", id, klasse, titel, start, end, ziel, mitnehmen[], mb?, phases[[start, dauer, sozialform, titel, regie, puffer?]], werke[{w (nur <em> erlaubt), f[]}], fragen[{q,a}], hilfen{schnell,haengt}, planB{technik,unruhe,frueh}}`
- Zeiten in 5-Minuten-Schritten, Dauern als Zahl.
