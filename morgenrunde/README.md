# Morgenrunde

Ein tägliches Quiz für den Schulweg eines Kunstlehrers: An jedem Schultag liegt um 6.30 Uhr ein Heft mit 20 Fragen zu den Kunststunden des Tages bereit (Fachwissen, Didaktik, Methodik, Pädagogik), am Ende das Gespräch mit dem Ministerialbeauftragten als Endgegner. Gespielt wird auf dem Android-Handy in der Claude-App.

Erstellt mit Unterstützung von Claude (KI-Assistent von Anthropic).

## Inhalt

- `app/morgenrunde.html`: die App (läuft als Claude-Artifact mit Speicher für Hefte, Antworten, Wiederholungen, Album und Profil)
- `hefte/`: alle Hefte als JSON, ein Heft pro Schultag (`JJJJ-MM-TT.json`), wird täglich vom Morgenlauf ergänzt
- `morgenlauf/anleitung.md`: die Anleitung des geplanten Morgenlaufs (Mo bis Fr 5.48 Uhr), private Kennungen durch Platzhalter ersetzt
- `tests/`: Testschleife (jsdom-Szenarien mit Speicher-Attrappe und Chromium-Durchlauf mit Android-Kennung, 360 und 412 px)
- `logs/`: Testlog und Ergebnisse der 10er-Schleifen

## Spielprinzip

- 20 Fragen Stunde für Stunde, Schwierigkeit steigend, je eine Sprecherfigur pro Bereich
- Punkte nach Stufe (10, 20, 30) mit Combo bis zum Faktor 2
- Wiederholung falscher Antworten nach 1, 3 und 7 Schultagen
- Serie mit einem Schutzschild pro Woche, Ränge, 16 Abzeichen, Album der Werke nach Epochen
- Freitags Wochenfinale mit den Fehlern der Woche
- Endgegner: laut antworten, aufdecken, selbst abhaken, Urteil des MB

## Tests ausführen

```
cd tests
npm install jsdom@24.1.3
node run.js 1 101          # ein Durchgang mit 7 Szenarien
python3 -I browser.py 101  # Chromium-Durchgang (Playwright nötig)
./loop.sh                  # bis 10 fehlerfreie Durchgänge am Stück
```
