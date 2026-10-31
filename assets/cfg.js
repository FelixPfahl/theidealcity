/* Regler (Josef, 29.10.2026, 14:44): alle Werte fürs Feintuning an einem Ort.
   Reihenfolge: Standard < veröffentlichte Werte (PUB, von Claude nach Übernahme eingetragen) < Josefs lokale Regler (nur nach Freischaltung mit ?regler).
   Gerätewerte: ein Standard kann [Desktop, Handy] sein; lokale Werte "key" gelten für beide, "key@d" nur Desktop, "key@m" nur Handy.
   Lädt vor app.js und game.js; die Leiste selbst (regler.js) wird nur nach Freischaltung nachgeladen. */
(function(){
  var MOB = false; try { MOB = matchMedia('(max-width:700px)').matches; } catch(e){}
  /* [Schlüssel, Reiter, Gruppe, Name, Erklärung, Standard, min, max, Schritt, Einheit, CSS-Variable] */
  var P = [
    /* ---------- Plotter ---------- */
    ['plot.speed', 'Plotter', 'Tempo und Start', 'Schreibtempo', 'Grundtempo aller Stifte (1,25 = Stand 29.10., 14:07).', 1.25, .2, 4, .05],
    ['plot.k.text', 'Plotter', 'Tempo und Start', 'Tempo Fließtext', 'Faktor für Texte zu Serien und Kapiteln.', 1, .2, 4, .05],
    ['plot.k.list', 'Plotter', 'Tempo und Start', 'Tempo Listen', 'Faktor für Vita, Kontakt, Kurzbiografie.', 1, .2, 4, .05],
    ['plot.k.legal', 'Plotter', 'Tempo und Start', 'Tempo Kleingedrucktes', 'Faktor für Datenschutz, Kolophon, Credits, 404.', 1, .2, 4, .05],
    ['plot.k.hero', 'Plotter', 'Tempo und Start', 'Tempo Startseite', 'Faktor für Monogramm und Handschrift der Startseite.', 1, .2, 4, .05],
    ['plot.k.once', 'Plotter', 'Tempo und Start', 'Tempo Einzelnes', 'Faktor für Sektionsname im Balken, Urkunde, Großansicht.', 1, .2, 4, .05],
    ['plot.seen', 'Plotter', 'Tempo und Start', 'Startschwelle', 'Ein Absatz beginnt, sobald seine Oberkante über diesem Anteil der Fensterhöhe liegt.', .9, .3, 1, .01],
    ['plot.bg', 'Plotter', 'Tempo und Start', 'Hintergrund-Stift', '1 = zweiter Stift schreibt die übrige Seite, 0 = nur was man sieht.', 1, 0, 1, 1],
    ['plot.bgwait', 'Plotter', 'Tempo und Start', 'Start Hintergrund-Stift', 'Spätester Start in Sekunden, wenn oben kein Text steht.', 8, 0, 30, .5, 's'],
    ['plot.stroke', 'Plotter', 'Strich', 'Strichstärke', 'Strichstärke des Fließtexts in Pixeln.', 1.2, .4, 3, .05, 'px'],
    ['plot.stroke.acc', 'Plotter', 'Strich', 'Strichstärke Betonung', 'Faktor für rote und grüne Betonungen.', 1, .3, 3, .05],
    ['plot.jitter', 'Plotter', 'Strich', 'Zittern', 'Faktor für kleine Abweichungen von Neigung, Start- und Endpunkt.', 1, 0, 4, .05],
    ['plot.ink', 'Plotter', 'Strich', 'Tintenverlauf', 'Faktor für das Ausgehen der Tinte vor dem Nachfüllen (0 = gleichmäßig).', 1, 0, 2, .05],
    ['plot.scratch', 'Plotter', 'Strich', 'Kratzer', 'Anteil kratziger, unterbrochener Buchstaben.', .08, 0, .4, .01],
    ['plot.dot', 'Plotter', 'Strich', 'Stiftpunkt', 'Radius des roten Stiftpunkts beim Schreiben.', 3, 0, 10, .5, 'px'],
    ['plot.bleed', 'Plotter', 'Strich', 'Kleckse', 'Faktor für kleine Tintenkleckse am Strichbeginn.', 1, 0, 5, .1],
    ['hand.size', 'Plotter', 'Dürer-Handschrift', 'Größe', 'Größe von Dürers Hand relativ zur Relief.', 1.6, .8, 3, .05],
    ['hand.wave', 'Plotter', 'Dürer-Handschrift', 'Welle', 'Höhe der Wellenbewegung der Grundlinie.', 35, 0, 120, 1],
    ['hand.rand', 'Plotter', 'Dürer-Handschrift', 'Unruhe', 'Zufällige Höhenabweichung je Buchstabe (± Wert).', 22, 0, 80, 1],
    ['hand.tilt', 'Plotter', 'Dürer-Handschrift', 'Neigung', 'Zufällige Drehung je Buchstabe (± Grad).', 2, 0, 12, .5, '°'],
    ['hand.join', 'Plotter', 'Dürer-Handschrift', 'Verbindungen', '1 = Buchstaben verbunden, 0 = einzeln.', 1, 0, 1, 1],
    ['plot.travel', 'Plotter', 'Reisewege', 'Sichtbarkeit', 'Deckkraft der dünnen Stiftwege zwischen Buchstaben (0 = unsichtbar).', .14, 0, .6, .01],
    ['plot.travelw', 'Plotter', 'Reisewege', 'Stärke', 'Strichstärke der Reisewege.', .6, .2, 2, .05, 'px'],
    /* ---------- Ton ---------- */
    ['snd.master', 'Ton', 'Lautstärken', 'Gesamt', 'Gesamtlautstärke in Prozent (Stand 28.10.: 50).', 50, 0, 100, 1, '%'],
    ['snd.tools', 'Ton', 'Lautstärken', 'Werkzeuge', 'Plotter, Feder, Zirkel, Papier.', .9, 0, 2, .05],
    ['snd.ui', 'Ton', 'Lautstärken', 'Oberfläche', 'Menü, Knöpfe, Blättern.', .55, 0, 2, .05],
    ['snd.atmos', 'Ton', 'Lautstärken', 'Atmosphäre', 'Klänge der Serien und Trenner.', .5, 0, 2, .05],
    ['snd.game', 'Ton', 'Lautstärken', 'Spiel', 'Funde, Dialoge, Urkunde.', 1, 0, 2, .05],
    ['snd.loop', 'Ton', 'Lautstärken', 'Plotter-Schleife', 'Lautstärke des laufenden Plotters.', .27, 0, 1, .01],
    ['snd.feder', 'Ton', 'Lautstärken', 'Feder', 'Kratzen der Feder bei Dürers Hand.', .3, 0, 1, .01],
    ['snd.fade', 'Ton', 'Raum', 'Ausblendweg', 'Anteil der sichtbaren Höhe, über den ein Stift außerhalb des Fensters leiser wird.', .35, .05, 1.5, .01],
    ['snd.lp', 'Ton', 'Raum', 'Dumpfheit', 'Wie dumpf ein Stift außerhalb klingt (0 = gar nicht, 1 = Standard).', 1, 0, 2, .05],
    ['snd.stereo', 'Ton', 'Raum', 'Stereobreite', 'Wie weit links und rechts ein Stift klingt (0 = mittig).', .8, 0, 2, .05],
    ['snd.share', 'Ton', 'Raum', 'Zwei Stifte', 'Lautstärke je Stift, wenn beide hörbar sind (0,71 = zusammen so laut wie einer).', .71, .3, 1, .01],
    ['snd.pitch2', 'Ton', 'Raum', 'Versatz zweiter Stift', 'Tonhöhe des Hintergrund-Stifts relativ zum ersten.', .87, .5, 1.2, .01],
    ['dlg.pitch.inka', 'Ton', 'Dialogstimmen', 'Tonhöhe Inka', 'Verschiebung der Stimme in Halbtönen.', 0, -12, 12, .5, 'HT'],
    ['dlg.pitch.wagner', 'Ton', 'Dialogstimmen', 'Tonhöhe Wagner', 'Verschiebung der Stimme in Halbtönen.', 0, -12, 12, .5, 'HT'],
    ['dlg.pitch.xae', 'Ton', 'Dialogstimmen', 'Tonhöhe X Æ A-13', 'Verschiebung der Stimme in Halbtönen.', 0, -12, 12, .5, 'HT'],
    ['dlg.pitch.sigma', 'Ton', 'Dialogstimmen', 'Tonhöhe Sigma', 'Verschiebung der Stimme in Halbtönen.', 0, -12, 12, .5, 'HT'],
    ['dlg.pitch.gojira', 'Ton', 'Dialogstimmen', 'Tonhöhe Gojira', 'Verschiebung der Stimme in Halbtönen.', 0, -12, 12, .5, 'HT'],
    ['dlg.blipvol', 'Ton', 'Dialogstimmen', 'Lautstärke Blips', 'Faktor für alle Dialogstimmen.', 1, 0, 3, .05],
    ['dlg.blipevery', 'Ton', 'Dialogstimmen', 'Blip-Dichte', 'Blip auf jedem n-ten Buchstaben.', 2, 1, 5, 1],
    ['gsnd.find', 'Ton', 'Spielklänge', 'Fund', 'Lautstärke beim Finden.', 1, 0, 3, .05],
    ['gsnd.stamp', 'Ton', 'Spielklänge', 'Stempel', 'Lautstärke des Stempels auf der Urkunde.', 1, 0, 3, .05],
    ['gsnd.cheer', 'Ton', 'Spielklänge', 'Jubel', 'Lautstärke des Jubels.', 1, 0, 3, .05],
    /* ---------- Dialoge ---------- */
    ['dlg.ms.inka', 'Dialoge', 'Tempo und Pausen', 'Tempo Inka', 'Millisekunden je Zeichen (kleiner = schneller).', 45, 5, 200, 1, 'ms'],
    ['dlg.ms.wagner', 'Dialoge', 'Tempo und Pausen', 'Tempo Wagner', 'Millisekunden je Zeichen.', 55, 5, 200, 1, 'ms'],
    ['dlg.ms.xae', 'Dialoge', 'Tempo und Pausen', 'Tempo X Æ A-13', 'Millisekunden je Zeichen.', 38, 5, 200, 1, 'ms'],
    ['dlg.ms.sigma', 'Dialoge', 'Tempo und Pausen', 'Tempo Sigma', 'Millisekunden je Zeichen.', 66, 5, 200, 1, 'ms'],
    ['dlg.ms.gojira', 'Dialoge', 'Tempo und Pausen', 'Tempo Gojira', 'Millisekunden je Zeichen.', 150, 20, 600, 5, 'ms'],
    ['dlg.p.comma', 'Dialoge', 'Tempo und Pausen', 'Pause Komma', 'Pause nach Komma, Semikolon, Doppelpunkt.', .15, 0, 1, .01, 's'],
    ['dlg.p.stop', 'Dialoge', 'Tempo und Pausen', 'Pause Punkt', 'Pause nach Punkt.', .35, 0, 2, .01, 's'],
    ['dlg.p.excl', 'Dialoge', 'Tempo und Pausen', 'Pause ! und ?', 'Pause nach Ausrufe- und Fragezeichen.', .3, 0, 2, .01, 's'],
    ['dlg.p.dots', 'Dialoge', 'Tempo und Pausen', 'Pause ...', 'Pause nach Auslassungspunkten.', .6, 0, 3, .01, 's'],
    ['dlg.lines', 'Dialoge', 'Fenster', 'Zeilen', 'Zeilen je Fensterseite.', 3, 1, 6, 1],
    ['dlg.chars', 'Dialoge', 'Fenster', 'Zeichen je Zeile', 'Höchstzahl, wie in SNES-Spielen.', 34, 16, 60, 1],
    ['dlg.width', 'Dialoge', 'Fenster', 'Breite', 'Höchste Fensterbreite in Pixeln (nie breiter als der Bildschirm).', 720, 280, 1200, 10, 'px', '--dlgw'],
    ['dlg.bottom', 'Dialoge', 'Fenster', 'Abstand unten', 'Abstand des Fensters vom unteren Rand.', 18, 0, 200, 2, 'px', '--dlgb'],
    /* ---------- Spiel ---------- */
    ['game.size1', 'Spiel', 'Objekte', 'Größe leicht', 'Breite der offen liegenden Dinge.', [64, 85], 20, 200, 1, 'px'],
    ['game.size2', 'Spiel', 'Objekte', 'Größe mittel', 'Breite der Dinge in Bildern.', [44, 58], 14, 160, 1, 'px'],
    ['game.size3', 'Spiel', 'Objekte', 'Größe schwer', 'Breite der Dinge an Rändern und in der Fußzeile.', [30, 40], 10, 120, 1, 'px'],
    ['game.flash', 'Spiel', 'Objekte', 'Blitz beim Wiederfinden', '1 = gefundene Dinge blitzen in den Suchbildern grün auf.', 1, 0, 1, 1],
    ['game.pts', 'Spiel', 'Punkte', 'Punkte je Fund', 'Punkte für jedes gefundene Ding.', 100, 0, 1000, 10],
    ['game.bonus', 'Spiel', 'Punkte', 'Besuchsbonus', 'Punkte je neuem Besuch (nach 6 Stunden Pause).', 50, 0, 500, 5],
    ['game.bonusstep', 'Spiel', 'Punkte', 'Bonus je Folgebesuch', 'Zuschlag je Besuch in Folge (innerhalb 48 Stunden).', 25, 0, 200, 5],
    ['game.bonusmax', 'Spiel', 'Punkte', 'Bonus höchstens', 'Obergrenze je Besuch.', 200, 0, 1000, 10],
    ['game.wander', 'Spiel', 'Plus', 'Wandern alle', 'Plus-Stufe 2 und 3: nach so vielen Sekunden ohne Fund wechseln die ungefundenen Dinge der Seite ihren Platz.', 120, 20, 600, 10, 's'],
    ['game.gap', 'Spiel', 'Reaktionen', 'Abstand ungefragter Fenster', 'Sekunden zwischen zwei ungefragten Dialogfenstern.', 60, 10, 600, 5, 's'],
    ['game.longsearch', 'Spiel', 'Reaktionen', 'Lange Suche nach', 'Sekunden ohne Fund auf einer Seite mit Dingen, dann meldet sich Sigma.', 150, 30, 900, 10, 's'],
    ['game.idle', 'Spiel', 'Reaktionen', 'Untätig nach', 'Sekunden ohne Eingabe, dann meldet sich Sigma.', 90, 20, 600, 10, 's'],
    ['game.hint', 'Spiel', 'Punkte', 'Kosten Hinweis', 'Abzug je Hinweis.', 50, 0, 500, 5],
    /* ---------- Grafik ---------- */
    ['ui.barh', 'Grafik', 'Balken', 'Höhe Balken', 'Höhe des grünen Fortschrittsbalkens.', [56, 44], 8, 120, 1, 'px', '--pbh'],
    ['ui.barfs', 'Grafik', 'Balken', 'Schriftgröße im Balken', 'Anteil der Balkenhöhe (lange Namen werden am Handy kleiner, bis sie passen).', .5, .2, 1, .01, '', '--pbk'],
    ['ui.fsbody', 'Grafik', 'Schrift', 'Fließtext', 'Faktor für die Schriftgröße der Texte (Plotter schreibt neu).', 1, .7, 1.6, .01, '', '--kbody'],
    ['ui.fshead', 'Grafik', 'Schrift', 'Überschriften', 'Faktor für alle großen Überschriften.', 1, .5, 1.6, .01, '', '--khead'],
    ['ui.fscap', 'Grafik', 'Schrift', 'Bildunterschriften', 'Faktor für Bildunterschriften und Marginalien.', 1, .7, 1.6, .01, '', '--kcap'],
    ['ui.lh', 'Grafik', 'Schrift', 'Zeilenhöhe', 'Zeilenhöhe des Fließtexts.', 1.42, 1.1, 2.4, .01, '', '--lh'],
    ['ui.gutter', 'Grafik', 'Raster und Abstände', 'Rand', 'Seitenrand links und rechts.', [40, 16], 0, 160, 1, 'px', '--gutterx'],
    ['ui.gridmin', 'Grafik', 'Raster und Abstände', 'Bildgröße im Raster', 'Mindestbreite eines Bilds im Raster (kleiner = mehr Spalten).', 260, 120, 600, 5, 'px', '--gridmin'],
    ['ui.gridgap', 'Grafik', 'Raster und Abstände', 'Abstand im Raster', 'Faktor für die Abstände zwischen Bildern.', 1, 0, 3, .05, '', '--kgap'],
    ['ui.series', 'Grafik', 'Raster und Abstände', 'Abstand der Serien', 'Faktor für den Leerraum zwischen Werkgruppen.', 1, 0, 3, .05, '', '--kseries'],
    ['ui.hover', 'Grafik', 'Hover und Großansicht', 'Hover-Faktor', 'Vorschau ist so viel mal größer als das Thumbnail.', 3, 1, 6, .1],
    ['ui.hovermax', 'Grafik', 'Hover und Großansicht', 'Hover höchstens', 'Höchstens dieser Anteil des Fensters.', .9, .3, 1, .01],
    ['ui.lbspeed', 'Grafik', 'Hover und Großansicht', 'Tempo Großansicht', 'Dauer des Überblendens der Großansicht.', .28, 0, 1.5, .02, 's', '--lbt'],
    ['col.red', 'Grafik', 'Farben', 'Zinnoberrot', 'Akzent Bildende Kunst, Trenner.', '#E2231A', 0, 0, 0, 'color', '--red'],
    ['col.blue', 'Grafik', 'Farben', 'Non-Photo-Blau (Lesen)', 'Akzent Comic in Lesestärke.', '#3F97B8', 0, 0, 0, 'color', '--blue-ink'],
    ['col.green', 'Grafik', 'Farben', 'Prozessgrün', 'Cover, Urkunde, Danksagungen, Balken.', '#00A651', 0, 0, 0, 'color', '--green'],
    ['col.paper', 'Grafik', 'Farben', 'Papier (hell)', 'Hintergrund im hellen Modus.', '#FFFFFF', 0, 0, 0, 'color', '--paperx'],
    ['col.ink', 'Grafik', 'Farben', 'Tinte (hell)', 'Schrift im hellen Modus.', '#000000', 0, 0, 0, 'color', '--inkx'],
    /* ---------- Effekte ---------- */
    ['fx.wood', 'Effekte', 'Holzschnitt', 'Verzerrung', 'Stärke der Holzschnitt-Struktur in den Überschriften (0 = glatt).', 1, 0, 4, .05],
    ['fx.woodgrain', 'Effekte', 'Holzschnitt', 'Körnung', 'Faktor für die ausgesparten Körner.', 1, 0, 2, .05],
    ['fx.parallax', 'Effekte', 'Trenner', 'Parallax', 'Wie stark sich Ausstellungsansichten beim Scrollen verschieben.', 10, 0, 30, .5, '%'],
    ['fx.modem', 'Effekte', 'Modem-Intro', 'Modem', '1 = Modem-Intro einmal je Besuch, 0 = aus.', 1, 0, 1, 1],
    ['fx.modemwait', 'Effekte', 'Modem-Intro', 'Start ohne Geste', 'Sekunden, nach denen die Einwahl ohne Klick von selbst startet (dann ohne Ton).', 25, 3, 120, 1, 's'],
    ['fx.modemlen', 'Effekte', 'Modem-Intro', 'Dauer', 'Faktor für die Länge der Einwahl.', 1, .3, 3, .05],
    ['fx.net', 'Effekte', 'Konstruktionsnetz', 'Strichstärke', 'Stärke der Linien von Dürers Fierung beim Hover über große Titel.', 1, 0, 3, .05, '', '--knet']
  ];
  var DEF = {}, META = {}; P.forEach(function(p){ DEF[p[0]] = p[5]; META[p[0]] = p; });
  var PUB = {};   /* veröffentlichte Werte: hier trägt Claude nach Josefs Übernahme ein (Schlüssel, @d, @m) */
  var ON = false, LOC = {};
  try { if (/[?&]regler\b/.test(location.search)) localStorage.setItem('jk_regler_on', '1'); if (/[?&]regler=aus\b/.test(location.search)) localStorage.removeItem('jk_regler_on'); ON = localStorage.getItem('jk_regler_on') === '1'; if (ON) LOC = JSON.parse(localStorage.getItem('jk_regler') || '{}') || {}; } catch(e){}
  function dev(v){ return Array.isArray(v) ? v[MOB ? 1 : 0] : v; }
  function get(k){ var s = MOB ? '@m' : '@d';
    if (LOC[k + s] !== undefined) return LOC[k + s]; if (LOC[k] !== undefined) return LOC[k];
    if (PUB[k + s] !== undefined) return PUB[k + s]; if (PUB[k] !== undefined) return PUB[k];
    return dev(DEF[k]); }
  var subs = [];
  function css(){ var r = document.documentElement; P.forEach(function(p){ if (!p[10]) return; var v = get(p[0]), base = dev(p[5]); var u = p[9] === 'color' || p[9] === '%' || p[9] === '°' ? '' : (p[9] || '');
      if (v === base){ r.style.removeProperty(p[10]); return; } r.style.setProperty(p[10], (p[9] === 'color' ? v : v + u)); }); }
  window.JK_CF = function(k){ return get(k); };
  window.JK_CFG = {P:P, DEF:DEF, META:META, PUB:PUB, MOB:MOB, on:function(){ return ON; }, local:function(){ return LOC; }, dev:dev,
    set:function(k, v, scope){ var key = k + (scope === 'd' ? '@d' : scope === 'm' ? '@m' : ''); if (v === null) delete LOC[key]; else LOC[key] = v; try { localStorage.setItem('jk_regler', JSON.stringify(LOC)); } catch(e){} css(); subs.forEach(function(f){ try { f(k); } catch(e){} }); },
    replace:function(obj){ LOC = obj || {}; try { localStorage.setItem('jk_regler', JSON.stringify(LOC)); } catch(e){} css(); subs.forEach(function(f){ try { f('*'); } catch(e){} }); },
    sub:function(f){ subs.push(f); }, css:css};
  css();
  if (ON){ document.documentElement.classList.add('regler'); var s = document.createElement('script'); s.src = (document.currentScript && document.currentScript.src || '../assets/cfg.js').replace(/cfg\.js(\?.*)?$/, 'regler.js') + '?t=' + Math.floor(Date.now() / 60000); s.defer = true; document.head.appendChild(s); }
})();
