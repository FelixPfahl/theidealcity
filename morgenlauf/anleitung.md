# Morgenlauf für Pult und Atelier

Geplante Aufgabe, Mo bis Fr früh (Europe/Berlin). Füllt Pult mit den Stunden von heute und morgen; Atelier liest dieselben Daten.

## Ablauf
1. Heute und den nächsten Schultag bestimmen (Ferien- und Feiertagskalender beachten).
2. Je Tag: Unterrichtskalender (Stunden, Aufsichten, Präsenzstunden, Vorbereitungsblöcke) und das Tagesmemo im Drive-Ordner Schule_Material/Tagesmemos_2026-27/<JJJJ-MM-TT> lesen (Verlaufspläne, Drucksachen, Material, Ratschläge).
3. Daten nach dem Format unten schreiben: `daten/heute.json`, `daten/morgen.json` (an freien Tagen `items: []`).
   - Ohne Verlaufsplan: Grobplan aus der Kalenderbeschreibung, im Titel „(Grobplan)“.
   - Kernfakten zu Werken kurz an Museum oder Werkverzeichnis prüfen, Unsicheres weglassen.
   - Plan B und Hilfen dürfen Vorschläge sein; Impulsfragen mit erwarteter Antwort.
   - Bewertung offen: Einheiten, die heute enden. MB-Hinweis nur in der Oberstufe.
   - Keine Schülernamen, keine Noten, keine privaten Kennungen, keine langen Gedankenstriche.
4. `python3 -I werkzeuge/bauen.py` (prüft Pflichtfelder), dann `python3 -I werkzeuge/test.py` (muss „FEHLER: keine“ melden; sonst Fehler in den Daten beheben, höchstens zwei Versuche).
5. Commit „Pult JJJJ-MM-TT“, Push nach origin pult. Nie main, nie Force-Push.
6. Claude-Fassung: `artifact.html` auf das bestehende Pult-Artifact veröffentlichen.

## Format (Auszug, Vorlage: daten/heute.json)
- Tag: `date`, `label`, `items`, `drucken`, `bewertung` [{k,t}], `bewertungHinweis`
- Termin: `{type:"other", start:"9:30", end:"9:45", titel, sub?}`
- Stunde: `{type:"lesson", id, klasse, titel, start, end, ziel, mitnehmen[], mb?, phases[[start, dauer, sozialform, titel, regie, puffer?]], werke[{w (nur <em> erlaubt), f[]}], fragen[{q,a}], hilfen{schnell,haengt}, planB{technik,unruhe,frueh}}`
- Zeiten in 5-Minuten-Schritten, Dauern als Zahl.
