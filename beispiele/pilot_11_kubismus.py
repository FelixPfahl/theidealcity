"""Pilot: Jgst. 11, Klassische Moderne 2 von 4: Kubismus, Fr 13.11.2026.
Inhalte freigegeben am 29.10.2026; Fakten geprüft (siehe Quellenfolie). Bilder setzt Josef am Cloud-PC ein (Bildliste in bildliste.txt)."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "werkzeuge"))
from praesentation import pres, save

KAHN = {"kuenstler": "Pablo Picasso", "titel": "Daniel-Henry Kahnweiler", "jahr": "1910", "material": "Öl auf Leinwand, 100,4 × 72,4 cm", "ort": "Art Institute of Chicago", "art": "werk"}
PABLO = {"kuenstler": "Julie Birmant und Clément Oubrerie", "titel": "Pablo, Band 4: Picasso", "jahr": "", "material": "Comic", "ort": "Dargaud, Paris", "art": "comic"}
LAUR = {"kuenstler": "Marie Laurencin", "titel": "Gruppe von Künstlern", "jahr": "1908", "material": "Öl auf Leinwand, 65,1 × 81 cm", "ort": "Baltimore Museum of Art, The Cone Collection", "art": "werk"}
DEMO = {"kuenstler": "Pablo Picasso", "titel": "Les Demoiselles d'Avignon", "jahr": "1907", "material": "Öl auf Leinwand, 243,9 × 233,7 cm", "ort": "The Museum of Modern Art, New York", "art": "werk"}
BRAQ = {"kuenstler": "Georges Braque", "titel": "Häuser in L'Estaque", "jahr": "1908", "material": "Öl auf Leinwand, 40,5 × 32,5 cm", "ort": "LaM, Lille Métropole", "art": "werk"}
COLL = {"kuenstler": "Pablo Picasso", "titel": "Stillleben mit Rohrstuhlgeflecht", "jahr": "1912", "material": "Öl und Wachstuch auf Leinwand, mit Seil gerahmt", "ort": "Musée national Picasso-Paris", "art": "werk"}

p = pres("11", "Klassische Moderne 2 von 4: Kubismus", "2026-11-13", "11:30", "13:00",
  "Sie erklären, wie der Kubismus einen Gegenstand von mehreren Seiten zugleich zeigt, und wer ihn zwischen 1908 und 1914 feierte oder bekämpfte.",
  [(5, "Partnerarbeit", "Wo sitzt hier ein Mann?", 0),
   (10, "Plenum", "Paris 1907: ein Bild, das kaum jemand sah", 0),
   (10, "Einzelarbeit", "Ein Gegenstand, drei Ansichten", 0),
   (10, "Plenum", "Vom Würfel zum Zeitungspapier", 0),
   (15, "Partnerarbeit", "Stimmen der Zeit", 0),
   (15, "Gruppenarbeit", "Wer feierte, wer bekämpfte?", 0),
   (10, "Plenum", "Ein Satz je Gruppe, Vorgriff 1937", 0),
   (10, "Einzelarbeit", "Steckbrief Kubismus", 5),
   (5, "Plenum", "Ausblick: Expressionismus", 0)],
  [
   {"type": "titel", "kicker": "Klassische Moderne 2 von 4", "thema": "Kubismus", "unter": "Ein Ding, von allen Seiten zugleich"},
   {"type": "frage", "phase": 0, "frage": "In diesem Bild sitzt ein Mann. Wo sind seine Hände, seine Haare, seine Uhrkette?", "hinweis": "Suchen Sie zu zweit und zeigen Sie mit dem Finger.", "mitBild": True, "bild": dict(KAHN, kuenstler="", titel="", jahr="", material="", ort="")},
   {"type": "ablauf", "phase": 0},
   {"type": "werkbild", "phase": 1, "bild": dict(KAHN)},
   {"type": "werk", "phase": 1, "titel": "Die Auflösung", "bild": dict(KAHN), "text":
    "Der Mann ist **Daniel-Henry Kahnweiler**, ein deutscher Kunsthändler in Paris. Er verkaufte die Bilder von Picasso und Braque.\n"
    "Bis zu dreißig Mal saß er Picasso Modell.\n"
    "Picasso zerlegt die Figur in durchscheinende **Flächen** aus Braun, Grau, Schwarz und Weiß.\n"
    "Erkennbar bleiben: gefaltete Hände, eine Haarwelle, der Krawattenknoten, die Uhrkette."},
   {"type": "werk", "phase": 1, "seite": "rechts", "titel": "Paris, Montmartre, um 1907", "bild": dict(PABLO), "text":
    "Picasso lebt und malt im **Bateau-Lavoir**, einem heruntergekommenen Atelierhaus.\n"
    "Der Comic *Pablo* erzählt diese Jahre nach den Erinnerungen von **Fernande Olivier**, Picassos damaliger Partnerin.\n"
    "Wer gehörte noch dazu?"},
   {"type": "werkbild", "phase": 1, "bild": dict(LAUR)},
   {"type": "werk", "phase": 1, "titel": "Eine Malerin malt ihre Gruppe", "bild": dict(LAUR), "text":
    "**Marie Laurencin** malt 1908 den Kreis, zu dem sie selbst gehört: Picasso, Fernande Olivier, den Dichter **Guillaume Apollinaire** und sich selbst.\n"
    "Apollinaire wird zum wichtigsten Fürsprecher der Kubisten."},
   {"type": "werkbild", "phase": 1, "bild": dict(DEMO)},
   {"type": "werk", "phase": 1, "titel": "Ein Bild, das kaum jemand sah", "bild": dict(DEMO), "text":
    "Fünf nackte Frauen, die Gesichter wie Masken, fast zweieinhalb Meter hoch.\n"
    "Kaum jemand bekam das Bild damals zu sehen.\n"
    "Heute gilt es als **Bruch mit der Tradition**: kein Raum nach der Zentralperspektive, Körper aus kantigen Flächen.\n"
    "Seit 1939 hängt es im Museum of Modern Art in New York."},
   {"type": "auftrag", "phase": 2, "titel": "Ein Gegenstand, drei Ansichten", "schritte":
    "Stellen Sie einen Gegenstand vor sich: Tasse, Flasche oder Schuh.\n"
    "Zeichnen Sie ihn in drei kleinen Skizzen auf Arbeitsblatt 8: von vorn, von der Seite, von oben.\n"
    "Verbinden Sie die drei Ansichten zu einem Bild. Teile dürfen sich überlagern und brechen.\n"
    "Lassen Sie alle Linien stehen, radieren Sie nicht.",
    "extra": "Schnell fertig? Fügen Sie eine vierte Ansicht von unten hinzu."},
   {"type": "werkbild", "phase": 3, "bild": dict(BRAQ)},
   {"type": "werk", "phase": 3, "titel": "Kleine Würfel", "bild": dict(BRAQ), "text":
    "Herbst 1908: Die Jury des **Salon d'Automne** lehnt Braques neue Bilder ab. Matisse spricht von „kleinen Würfeln“.\n"
    "Der Kritiker **Louis Vauxcelles** schreibt am 14. November 1908, Braque „verachtet die Form, reduziert alles, Orte, Figuren und Häuser, auf geometrische Schemata, auf Würfel“.\n"
    "Aus dem Spott wird ein Name: **Kubismus**."},
   {"type": "werkbild", "phase": 3, "bild": dict(COLL)},
   {"type": "werk", "phase": 3, "titel": "Vom Würfel zum Zeitungspapier", "bild": dict(COLL), "text":
    "Frühjahr 1912: Picasso klebt ein Stück **Wachstuch** mit dem Muster eines Rohrstuhls auf die Leinwand. Der Rahmen ist ein echtes Seil.\n"
    "Die Buchstaben JOU stehen für *journal*, Zeitung.\n"
    "Das Bild gilt als erste **Collage** der modernen Malerei.\n"
    "**Analytischer Kubismus**: zerlegen. **Synthetischer Kubismus**: aus Flächen und Fundstücken zusammensetzen."},
   {"type": "auftrag", "phase": 4, "titel": "Stimmen der Zeit", "schritte":
    "Lesen Sie zu zweit Ihren Text (Handout 2 bis 6).\n"
    "Markieren Sie: Wer spricht, wann, für oder gegen den Kubismus?\n"
    "Notieren Sie das stärkste Argument in einem Satz.\n"
    "Wählen Sie ein Wort aus dem Text, das Sie den anderen erklären.",
    "extra": "Texte: Vauxcelles 1908, Apollinaire 1913, Abgeordnetenkammer 1912, Gleizes und Metzinger 1912, Apollinaire über Marie Laurencin 1913."},
   {"type": "auftrag", "phase": 5, "titel": "Wer feierte, wer bekämpfte?", "schritte":
    "Bilden Sie Gruppen mit je einer Person aus jedem Expertenpaar.\n"
    "Stellen Sie Ihren Text in einer Minute vor.\n"
    "Ordnen Sie alle Stimmen auf einer Linie von Ablehnung bis Begeisterung (Arbeitsblatt 7).\n"
    "Formulieren Sie einen gemeinsamen Satz: Der Kubismus war 1912 umstritten, weil ..."},
   {"type": "zitat", "phase": 6, "zitat": "Wenn Ihnen ein Bild schlecht vorkommt, haben Sie ein unbestreitbares Recht: es nicht anzusehen und sich andere anzusehen. Aber man ruft nicht die Gendarmen.",
    "quelle": "Marcel Sembat verteidigt die Kubisten in der Abgeordnetenkammer, Paris, 3. Dezember 1912"},
   {"type": "text", "phase": 6, "titel": "1937", "text":
    "1937 beschlagnahmen die Nationalsozialisten in deutschen Museen Tausende Werke als „**entartete Kunst**“, darunter Werke von Picasso.\n"
    "Am 30. Juni 1939 werden 125 davon in **Luzern** versteigert. Die Stadt Lüttich kauft dort Picassos *Die Familie Soler*.\n"
    "Mehr dazu in der Stunde „Diffamierung der Moderne“ am 22. Januar."},
   {"type": "auftrag", "phase": 7, "titel": "Steckbrief Kubismus", "abgabe": True, "schritte":
    "Ergänzen Sie den Steckbrief (Handout 1): Zeit, Ort, Personen, Merkmale.\n"
    "Nennen Sie ein Werk und eine Stimme der Zeit.\n"
    "Legen Sie den Steckbrief in Ihre Mappe."},
   {"type": "text", "phase": 8, "titel": "Nächste Woche: Expressionismus", "text":
    "Freitag, 20. November: Wir schauen nach München ins **Lenbachhaus**.\n"
    "Frage zum Mitnehmen: Kann eine Farbe ein Gefühl zeigen?"},
   {"type": "quellen", "text":
    "Abbildungen\n"
    "Pablo Picasso, *Daniel-Henry Kahnweiler*, 1910, Öl auf Leinwand, 100,4 × 72,4 cm, Art Institute of Chicago, artic.edu, abgerufen am 29.10.2026\n"
    "Julie Birmant und Clément Oubrerie, *Pablo*, Band 4: *Picasso*, Dargaud, Paris\n"
    "Marie Laurencin, *Gruppe von Künstlern*, 1908, Öl auf Leinwand, 65,1 × 81 cm, Baltimore Museum of Art, The Cone Collection, artbma.org, abgerufen am 29.10.2026\n"
    "Pablo Picasso, *Les Demoiselles d'Avignon*, 1907, Öl auf Leinwand, 243,9 × 233,7 cm, The Museum of Modern Art, New York, moma.org, abgerufen am 29.10.2026\n"
    "Georges Braque, *Häuser in L'Estaque*, 1908, Öl auf Leinwand, 40,5 × 32,5 cm, LaM Lille\n"
    "Pablo Picasso, *Stillleben mit Rohrstuhlgeflecht*, 1912, Öl und Wachstuch auf Leinwand, mit Seil gerahmt, Musée national Picasso-Paris (MP36), museepicassoparis.fr, abgerufen am 29.10.2026\n"
    },
   {"type": "quellen", "text":
    "Texte\n"
    "Louis Vauxcelles, Kritik zu Georges Braque, *Gil Blas*, Paris, 14.11.1908 (eigene Übersetzung)\n"
    "Guillaume Apollinaire, *Les Peintres cubistes. Méditations esthétiques*, Paris 1913, Project Gutenberg Nr. 55638\n"
    "Marcel Sembat, Abgeordnetenkammer, 3.12.1912, *Journal officiel*, Débats parlementaires, S. 2924 bis 2929; Wortlaut nach Larousse, Encyclopédie de la peinture, Artikel „cubisme“, larousse.fr, abgerufen am 29.10.2026 (eigene Übersetzung)\n"
    "Albert Gleizes und Jean Metzinger, *Du Cubisme*, Paris 1912\n"
    "Ville de Liège, La Boverie, Ankäufe bei der Versteigerung in Luzern 1939, liege.be, abgerufen am 29.10.2026"}
  ], schrift="Archivo", titelschrift="Archivo", akzent="#A8571B",
  notiz="Facetten. Archivo, Überschriften schmal und hoch wie gebrochene Bildflächen, Fließtext in normaler Breite. Akzent Ocker aus der Palette des analytischen Kubismus, sonst nur Schwarz und Grau. Werke immer unbeschnitten auf Weiß, Text links ausgerichtet, ruhiger Wechsel von Bild und Text.")
p["konzept"]["breite"] = 72
p["meta"]["ohneBewertung"] = True
save(p, os.path.join(os.path.dirname(os.path.abspath(__file__)), "11_Screen_Klassische_Moderne_02_Kubismus.atelier.json"))
print("ok", len(p["slides"]))
