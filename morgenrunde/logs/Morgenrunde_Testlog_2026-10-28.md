# Morgenrunde: Testlog vom 28.10.2026

Erstellt mit Unterstützung von Claude (KI-Assistent von Anthropic).

## Was ein Durchgang prüft

Jeder Durchgang besteht aus 7 Szenarien in einer Testumgebung mit Datenbank-Attrappe und einem Lauf in echtem Chromium mit Android-Kennung.

1. **Logik**: Schultage, KW, Berliner Datum über Mitternacht und Zeitumstellung, Wiederholung nach 1, 3, 7 Schultagen, Serie mit Schutzschild, Ränge, MB-Urteil, Combo, Abzeichen.
2. **Ganzer Tag**: Titel, 20 Fragen, richtige Sprecherfigur je Bereich, Doppeltippen sperrt, Punkte mit Combo nachgerechnet, Endgegner mit Urteil, Ergebnis, Profil, Album, neues Abzeichen, Woche, Album, Abzeichen, Archiv, Nachlesen.
3. **Fortsetzen**: mitten im Heft schließen, neu öffnen, an der richtigen Frage weitermachen.
4. **Folgetag**: fällige Wiederholungen zuerst, richtige Fälligkeit danach, Serie 2, Freitags-Finale mit doppelten Punkten.
5. **Wochenende und Ferien**: freie Hefte, Archivhinweis, Wochenansicht.
6. **Leer und Fehler**: leerer Speicher, kein Speicher, Netz bricht einmal ab (zweiter Versuch), U-Bahn-Funkloch (Antwort vorgemerkt, beim Wiederverbinden nachgeschickt).
7. **Kaputte Daten**: unvollständige Fragen und Hefte werden ignoriert, Heft ohne Endgegner.
8. **Browser** (Chromium, 360 px hell und 412 px dunkel, Touch): ganzer Durchlauf, kein seitliches Überlaufen in keiner Ansicht, keine Skriptfehler, Ergebnis korrekt gespeichert.

## Gefundene und behobene Fehler

| Nr. | Fund | Folge | Behebung |
|---|---|---|---|
| 1 | Lange Gedankenstriche als Platzhalter in Balken und Woche | Verstoß gegen Schreibregel | Ersetzt durch 0/0 und Punkt |
| 2 | Spätes Echo eines älteren Speicherstands überschrieb neue Eingaben (gleiche Uhrzeit) | Abhaken beim MB ging verloren | Revisionszähler statt Zeitstempel |
| 3 | Titel "MORGENRUNDE" ragte bei Ersatzschrift aus dem Bild | Seitliches Scrollen | Zweizeiliger Titel |
| 4 | Ansichten mit riesigen Lücken (falsche Flex-Regel) | Unruhiges Layout | Eigene Stapel-Klasse |
| 5 | Endgegner-Zelle der Fortschrittsleiste erbte Speedlines | Streifen über der Seite | Klasse umbenannt |
| 6 | "WEIHNACHTSKARTE" im Kapitelkopf zu breit bei 360 px | Text abgeschnitten | Kleinere Größe, Silbentrennung |
| 7 | Rang-Fortschritt zeigte 100 %, obwohl der Rang noch fehlte | Falsches Signal | Abrunden statt Runden |
| 8 | Hing beim Laden, wenn ein Datenstrom im Funkloch nicht antwortet | Ewiges "lädt" | Nach 8 Sekunden mit Teildaten starten, Funkloch-Hinweis |
| 9 | Antwort ging im Funkloch verloren, wenn danach nichts mehr gespeichert wurde | Datenverlust | Vormerkung, Nachsenden bei Netz und beim Zurückkehren in die App |
| 10 | Zählerbeschriftung "Wiederholen" abgeschnitten | Unlesbar bei 360 px | Kürzere Beschriftung, Schild-Hinweis in den Rang-Kasten |

## Testschleife Fassung 1 (vor dem Umbau)

10 von 10 Durchgängen fehlerfrei (Seeds 101 bis 110, je 7/7 Szenarien plus Browser).

## Testschleife Fassung 2 (nach dem Umbau, veröffentlicht)

| Durchgang | Seed | Szenarien | Browser | Ergebnis |
|---|---|---|---|---|
| 1 | 101 | 7/7 | ok | fehlerfrei |
| 2 | 102 | 7/7 | ok | fehlerfrei |
| 3 | 103 | 7/7 | ok | fehlerfrei |
| 4 | 104 | 7/7 | ok | fehlerfrei |
| 5 | 105 | 7/7 | ok | fehlerfrei |
| 6 | 106 | 7/7 | ok | fehlerfrei |
| 7 | 107 | 7/7 | ok | fehlerfrei |
| 8 | 108 | 7/7 | ok | fehlerfrei |
| 9 | 109 | 7/7 | ok | fehlerfrei |
| 10 | 110 | 7/7 | ok | fehlerfrei |

**10 fehlerfreie Durchgänge am Stück.**

## Prüfung am echten Speicher

- Heft für Do 29.10. liegt in der Datenbank (Fassung 2 mit Album-Daten).
- Zugriffsregel greift: Mit Leserechten anderer ist nichts sichtbar, nur Josef liest und schreibt.
- Noch keine Spielstände vorhanden (erwartet, das erste Spiel ist morgen).

## Was nicht getestet werden konnte

- Die App im echten Claude-Rahmen auf deinem Android (Testumgebung ahmt den Speicher nach).
- Der Push des Morgenlaufs (erster Lauf morgen 5.48 Uhr; das Heft für morgen existiert schon, der Lauf schickt dann nur die Meldung).
- Titelbild aus Wikimedia: Die Domain ist für meine Umgebung gesperrt.
