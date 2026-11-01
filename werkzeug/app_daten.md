# Inka-App: Wochendaten (Klartext-Format für app_daten.py)

Show-Text: Aufbau, Figuren und Klänge stehen verbindlich in `werkzeug/show_struktur.md` (seit 1.11.2026 immer so).

Der Lauf schreibt eine Datei `app.json` im Klartext (nur im Arbeitsordner, nie ins Repo) und ruft
`python3 -I werkzeug/app_daten.py app.json <schlüsseldatei> <repo>` auf. Ins Repo kommt nur `d/app.json` verschlüsselt.

Zeitraum: heute bis heute + 6 Tage. Zeiten "HH:MM" (24 h, Europe/Berlin), Daten "JJJJ-MM-TT".

```json
{
  "made": 1793510000000,
  "range": ["2026-11-01", "2026-11-07"],
  "entries": [
    {"key": "ev|<calendarId>|<eventId>", "kind": "plan", "date": "2026-11-01", "start": "09:00", "end": "09:30",
     "title": "Frühstück", "loc": "", "note": ""}
  ],
  "tasks": [
    {"key": "t|<taskId>", "title": "MTV kündigen", "date": "2026-10-30", "time": "21:30", "dur": 20,
     "prio": 1, "project": "Inbox", "overdue": true, "due": "30.10."}
  ],
  "deadlines": [{"date": "2026-11-04", "title": "Montessori: Geld und Dokumente"}],
  "trips": {"2026-11-02": [{"leave": "12:30", "to": "Motten", "dest": "Hauptstr. 15, 97786 Motten", "minutes": 270}]},
  "hints": {"2026-11-03": ["Papa hat Geburtstag: anrufen"]},
  "conflicts": [
    {"id": "k-2026-11-02-1", "date": "2026-11-02", "text": "Kurzer Satz, was kollidiert",
     "options": [{"label": "Empfohlene Lösung kurz", "auftrag": "Genaue Anweisung fürs Sekretariat, z. B. misc-Eintrag X auf 9:00 bis 9:45 verschieben"},
                 {"label": "Zweite Lösung", "auftrag": "..."}]}
  ],
  "projects": [{"name": "Unterricht", "stand": "…", "next": "…", "frist": "…", "quelle": "Memo 30.10."}],
  "mails": [{"from": "Name", "subject": "Betreff", "since": "28.10.", "why": "Frage nach Termin"}],
  "waiting": [{"who": "Name", "what": "Rückmeldung zu …", "since": "27.10."}],
  "news": {"source": "Perlentaucher", "fetched": "2026-11-01T07:16", "rundschauen": [
    {"name": "9punkt · Debattenrundschau", "date": "2026-10-31", "url": "https://www.perlentaucher.de/9punkt",
     "items": [{"section": "Frankreich", "paper": "FAZ", "author": "Name", "title": "Überschrift", "text": "Ausführliche Zusammenfassung, 2 bis 4 Sätze"}]},
    {"name": "Efeu · Kulturrundschau", "date": "2026-10-31", "url": "https://www.perlentaucher.de/efeu", "items": [ ... ]}]}
}
```

kind:
- fix: Unterricht, Aufsichten, Unterrichtsvorbereitung (Schulkalender, Vor- und Nachbereitung)
- travel: Kalender Fahrten
- meet: Verabredungen mit Menschen (fest)
- plan: misc und Sport & Kunst (planbar)
- deadline: Fristen (ganztägig, start leer)
- birthday: Geburtstage (start leer)
- event: Veranstaltungen und Ausstellungen (nur Auswahl; laufende Ausstellungen nur am ersten und letzten Tag und an Wochenenden)
- allday: sonstige ganztägige Einträge (z. B. Hotel, Ferien), start leer

Regeln:
- Jede Instanz einzeln (Serien aufgelöst), nur Einträge im Zeitraum. Ganztägige mehrtägige Einträge je Tag einmal.
- tasks: alle offenen Todoist-Aufgaben bis heute + 6 Tage plus überfällige (overdue true, due "TT.MM."). Ohne Datum nur Priorität 1 und 2.
- conflicts: nach den Konfliktregeln des Sekretariats; je 2 Lösungen, empfohlene zuerst; "auftrag" so genau, dass ein späterer Lauf ihn ohne Rückfrage ausführen kann. Nie fixe Einträge verschieben.
- projects: aus dem Doc "Sekretariat Übersicht" und den Projekt-Memos (Stand, nächster Schritt, Frist, Quelle mit Datum).
- mails: nur Mails, die eine Antwort von Josef brauchen (Gmail nur lesen).
- waiting: worauf Josef von wem wartet (aus der Übersicht).
- news (Reiter Nachrichten): die jeweils neueste 9punkt- und Efeu-Ausgabe, ALLE Beiträge der Rundschau, je Beitrag Rubrik (section: Politikfeld bzw. Kunst, Literatur, Bühne, Film, Musik, Comic …), Zeitung, Autor, Überschrift und eine ausführliche eigene Zusammenfassung in 2 bis 4 Sätzen (keine wörtlichen Übernahmen langer Passagen). Reihenfolge wie im Original. Im Morgenlauf neu holen, bei den Voll-Aktualisierungen 12:23 und 17:23 nur ersetzen, wenn eine neue Ausgabe erschienen ist; sonst unverändert übernehmen.
- Keine langen Gedankenstriche in Texten.
