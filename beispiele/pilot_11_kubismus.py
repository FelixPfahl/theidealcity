"""Pilot: Jgst. 11, Klassische Moderne 2 von 4: Kubismus, Fr 13.11.2026. Skelett ohne Werke (Beispiele erst nach Freigabe)."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "werkzeuge"))
from praesentation import pres, save
F = "[nach Freigabe]"
p = pres("11", "Klassische Moderne 2 von 4: Kubismus", "2026-11-13", "11:30", "13:00",
  "Sie erklären, wie der Kubismus einen Gegenstand von mehreren Seiten zugleich zeigt, und wer ihn zwischen 1908 und 1914 feierte oder bekämpfte.",
  [(5, "Partnerarbeit", "Wo sitzt hier ein Mann?", 0),
   (10, "Plenum", "Paris 1907: ein Bild, das keiner wollte", 0),
   (10, "Einzelarbeit", "Ein Gegenstand, drei Ansichten", 0),
   (10, "Plenum", "Vom Würfel zum Zeitungspapier", 0),
   (15, "Partnerarbeit", "Stimmen der Zeit", 0),
   (15, "Gruppenarbeit", "Wer feierte, wer bekämpfte?", 0),
   (10, "Plenum", "Ein Satz je Gruppe, Vorgriff 1937", 0),
   (10, "Einzelarbeit", "Steckbrief Kubismus", 5),
   (5, "Plenum", "Ausblick: Expressionismus", 0)],
  [
   {"type": "titel", "kicker": "Klassische Moderne 2 von 4", "thema": "Kubismus", "unter": "Ein Ding, von allen Seiten zugleich"},
   {"type": "frage", "phase": 0, "frage": "In diesem Bild sitzt ein Mann. Wo sind seine Hände, seine Haare, seine Uhrkette?", "hinweis": "Suchen Sie zu zweit und zeigen Sie mit dem Finger.", "mitBild": True},
   {"type": "ablauf", "phase": 0},
   {"type": "werkbild", "phase": 1},
   {"type": "werk", "phase": 1, "titel": "Die Auflösung", "text": F},
   {"type": "text", "phase": 1, "titel": "Paris 1907: ein Bild, das keiner wollte", "text": F},
   {"type": "auftrag", "phase": 2, "titel": "Ein Gegenstand, drei Ansichten", "schritte": "Stellen Sie einen Gegenstand vor sich: Tasse, Flasche oder Schuh.\nZeichnen Sie ihn in drei kleinen Skizzen: von vorn, von der Seite, von oben.\nVerbinden Sie die drei Ansichten zu einem Bild. Teile dürfen sich überlagern und brechen.\nLassen Sie alle Linien stehen, radieren Sie nicht.", "extra": "Schnell fertig? Fügen Sie eine vierte Ansicht von unten hinzu."},
   {"type": "text", "phase": 3, "titel": "Vom Würfel zum Zeitungspapier", "text": F},
   {"type": "auftrag", "phase": 4, "titel": "Stimmen der Zeit", "schritte": "Lesen Sie zu zweit Ihren Text (Handout 2 bis 6).\nMarkieren Sie: Wer spricht, wann, für oder gegen den Kubismus?\nNotieren Sie das stärkste Argument in einem Satz.\nWählen Sie ein Wort aus dem Text, das Sie den anderen erklären."},
   {"type": "auftrag", "phase": 5, "titel": "Wer feierte, wer bekämpfte?", "schritte": "Bilden Sie Gruppen mit je einer Person aus jedem Expertenpaar.\nStellen Sie Ihren Text in einer Minute vor.\nOrdnen Sie alle Stimmen auf einer Linie von Ablehnung bis Begeisterung (Arbeitsblatt 7).\nFormulieren Sie einen gemeinsamen Satz: Der Kubismus war 1912 umstritten, weil ..."},
   {"type": "text", "phase": 6, "titel": "1937", "text": F},
   {"type": "auftrag", "phase": 7, "titel": "Steckbrief Kubismus", "abgabe": True, "schritte": "Ergänzen Sie den Steckbrief (Handout 1): Zeit, Ort, Personen, Merkmale.\nNennen Sie ein Werk und eine Stimme der Zeit.\nLegen Sie den Steckbrief in Ihre Mappe."},
   {"type": "text", "phase": 8, "titel": "Nächste Woche: Expressionismus", "text": F},
   {"type": "quellen", "text": "Abbildungen\n" + F + "\nTexte\n" + F}
  ], schrift="Archivo", titelschrift="Archivo", akzent="#A8571B",
  notiz="Facetten. Archivo, Überschriften schmal und hoch wie gebrochene Bildflächen, Fließtext in normaler Breite. Akzent Ocker aus der Palette des analytischen Kubismus, sonst nur Schwarz und Grau. Werke immer unbeschnitten auf Weiß, Text links ausgerichtet, ruhiger Wechsel von Bild und Text.")
p["konzept"]["breite"] = 72
p["meta"]["ohneBewertung"] = True
save(p, os.path.join(os.path.dirname(os.path.abspath(__file__)), "11_Screen_Klassische_Moderne_02_Kubismus.atelier.json"))
print("ok", len(p["slides"]))
