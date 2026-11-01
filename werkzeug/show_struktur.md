# Morning-Show: feste Struktur (verbindlich, Josef 1.11.2026: "ab jetzt immer so")

Vorbild ist die Show vom 1.11.2026 (Text unten verlinkt in der Beschreibung). Jede Show folgt diesem Ablauf.
Sprecherzeilen `INKA:`, `WAGNER:`, `SIGMA:`; Klänge mit `KLANG:` (siehe unten); Songs als `## [song]`.

## Figuren (aus Josefs Comic "The Ideal City")
- **Inka Schalter**: redet vor allem über Beobachtungen (kleine, genaue Details), warm, trocken, duzt Josef. Hat Empathie für Sigma, verteidigt ihn.
- **Wagner Rohrschach**, Professor a. D., sucht die absolute Wahrheit: brutal, unmenschlich, kalt, siezt Josef. Reagiert auf Sigma immer genervt, als wäre er eine lästige Stubenfliege (Zeitung zusammenrollen, "Weg da").
- **Sigma**, der Homunkulus im Glas: kommt oft vor, kurze, seltsam poetische Sätze, kindlich. Wiederkehrende Motive (z. B. sein beschlagenes "Fenster" im Glas) dürfen über die ganze Show laufen.
- Ort: Wagners Labor (Brummen, Blubbern, Neonröhre, Piepen). Inka streut ein paar Beobachtungen aus dem Labor ein.

## Ablauf
1. `## [show] Im Labor`: **Einstieg mit Soundscape und Skit mit allen dreien** (ca. 45 bis 60 Sekunden), z. B. `KLANG: labor 6`, `WAGNER: Licht.`, `KLANG: neon`, dann eine kleine Szene zu dritt mit einem Motiv, das später wiederkehrt. Danach Begrüßung (Wochentag, Datum, Besonderheiten wie Feiertag oder Ferien) und ein Satz zum Charakter des Tages. Ansage des ersten Songs im Gespräch.
2. `## [song]`
3. `## [show] Wetter und Lauf` (Lauf nur, wenn einer im Kalender oder bei Runna steht). Einstieg mit einem Satz zum gerade gehörten Song oder einer Beobachtung.
4. `## [song]`
5. `## [show] Der Tag`: Ablauf mit Uhrzeiten (Schultag: Stunden mit Ziel, Ablauf, Tipps, Material), Packliste falls nötig.
6. `## [song]`
7. `## [show] Fristen und Post`: erledigte Aufgaben, Fristen der nächsten 14 Tage, Geburtstage, Mails mit Handlungsbedarf.
8. `## [song]`
9. `## [show] Nachrichten aus dem Perlentaucher`: wichtigste Punkte der neuesten 9punkt- und Efeu-Ausgabe, mit Zeitung und Autor; Wagner kommentiert brutal, Sigma darf einhaken. Hinweis, dass alles vollständig im App-Reiter "Nachrichten" steht.
10. `## [show] Die Kunst-Rubrik`: Ausstellungen und Kunstfakten (belegt).
11. `## [song]`
12. `## [show] Morgen` (oder Name des nächsten Vorhabens): der nächste Tag kurz.
13. `## [song]`
14. `## [show] Zum Schluss`: worauf es ankommt, Abschied aller drei, Inka endet mit "Josef, ich hab noch … Fragen für dich, bleib kurz dran."

## Wiederkehrendes Motiv: "Ertappt" (Josef 1.11.2026)
Nach Songs (freier Tag 3 bis 4 Mal, Schultag 4 bis 6 Mal, nie zweimal gleich) beginnt das nächste Kapitel nicht mit der Moderation, sondern **mitten in einem Streitgespräch zwischen Sigma und Wagner**, das sie in der Musikpause geführt haben. Wir steigen mitten im Satz ein.
- **Anspruchsvoll**: echte Fragen aus der Welt von "The Ideal City" (Wahrheit, Zentralperspektive, Wahrnehmung, Bewusstsein, Schöpfung und Geschöpf, Karte und Gebiet, Ideale Stadt von Urbino, Messbarkeit, Seele, Sprache). Sigma argumentiert überraschend klug, seltsam, kindlich-präzise (oft als Karte, Vermessung, Zählung); Wagner argumentiert brillant, kalt, mit Fachwissen.
- **Ertappt**: Sie merken, dass das Mikrofon wieder an ist oder Inka zuhört (ein Räuspern, das Rotlicht, "Wir sind auf Sendung").
- **Abschmettern**: Wagner schmettert Sigma heftig ab: vernichtend, eisig, klinisch (ein Satz, der Sigmas Existenz kleinmacht), nie mit Gewalt oder Drohung.
- **Übergang**: Inka übernimmt mit einem warmen Satz zu Sigma und leitet ins Kapitel über.
- Länge 4 bis 8 Zeilen. Ein Thema darf über mehrere Ertappt-Szenen weiterlaufen (Fortsetzung beim nächsten Song).

Songs: Schultag 12, freier Tag 6 (doppelt so viele wie früher); bei 12 Songs weitere `## [song]` zwischen kürzeren Kapiteln. Jeder Song wird im Gespräch angesagt (Titel, Künstler, ein Satz Haltung von Wagner oder Inka), nicht als Liste.

## Stil
- Fließend: Übergänge aus dem Gespräch heraus, Callbacks auf frühere Stellen, keine Aufzählungen.
- Für das Ohr: kurze Sätze, Uhrzeiten "um 13 Uhr 30", Datum "Mittwoch, der 4. November", keine Gedankenstriche, keine Abkürzungen.
- Nur belegte Fakten. Länge: Sprechtext etwa 9.000 bis 11.000 Zeichen; bei knappem ElevenLabs-Kontingent kürzer (lieber kürzere Sprechzeit als weniger Songs).

## Klänge (`werkzeug/show_tts.py`)
- `KLANG: labor <Sek.>`: Laborgeräusche, lauter als der Hintergrund (Einstieg)
- `KLANG: neon`: Neonröhre springt in drei Anläufen an
- `KLANG: summen <Sek.>`: Sigma summt wie eine Fliege am Glas
- `KLANG: stille <Sek.>`: Pause
Tempo: Inka 1,15, Wagner 1,25, Sigma 1,15 (Voreinstellung im Skript). Alle Stimmen gleich laut, leiser Laborhintergrund unter der ganzen Show.
