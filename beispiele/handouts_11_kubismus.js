// Word-Gerüste der Arbeitsblätter zur Pilotstunde 11 Kubismus (13.11.2026).
// Fertigstellen (Originaltexte einfügen, Schrift prüfen, PDF) in Word auf dem Cloud-PC.
const fs = require("fs");
const path = require("path");
const D = require("docx");
const { Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType, PageNumber, Table, TableRow, TableCell, WidthType, BorderStyle, HeightRule, TabStopType, TabStopPosition, LeaderType } = D;

const OUT = process.argv[2] || ".";
const FONT = "Futura";
const ACC = "A8571B";
const KLASSE = "Kunst 11", THEMA = "Klassische Moderne 2: Kubismus", DATUM = "13.11.2026";
const W = 11906 - 2 * 1020; // A4 Breite minus 18 mm Rand links und rechts

function runs(text, o = {}) {
  // *kursiv*, **fett**
  const out = []; const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...o }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...o }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, ...o }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...o }));
  return out;
}
const P = (text, o = {}) => new Paragraph({ children: runs(text, o.run || {}), style: o.style, spacing: o.spacing, alignment: o.alignment, numbering: o.numbering });
const H1 = t => new Paragraph({ style: "Titel1", children: runs(t) });
const H2 = t => new Paragraph({ style: "Titel2", children: runs(t) });
const line = (label) => new Paragraph({ spacing: { before: 200, after: 0 }, tabStops: [{ type: TabStopType.RIGHT, position: W, leader: LeaderType.UNDERSCORE }], children: [new TextRun({ text: label ? label + " " : "" }), new TextRun({ text: "\t" })] });
const lines = (n, label) => Array.from({ length: n }, (_, i) => line(i === 0 ? label : ""));
const thin = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
function box(cols, heights, labels) {
  const cw = cols.map(c => Math.round(W * c));
  cw[cw.length - 1] = W - cw.slice(0, -1).reduce((a, b) => a + b, 0);
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: cw,
    rows: heights.map((h, r) => new TableRow({ height: { value: h, rule: HeightRule.ATLEAST }, children: cw.map((w, c) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: runs((labels && labels[r] && labels[r][c]) || "", { size: 18, color: "555555" }) })] })) })) });
}
function doc(nr, titel, body, slug) {
  const header = new Header({ children: [
    new Paragraph({ style: "Kopf", tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [new TextRun(`${KLASSE} · ${THEMA}`), new TextRun("\t"), new TextRun(`Stunde vom ${DATUM}`)] }),
    new Paragraph({ style: "Kopf", spacing: { before: 160, after: 120 }, tabStops: [{ type: TabStopType.LEFT, position: Math.round(W * 0.62), leader: LeaderType.UNDERSCORE }, { type: TabStopType.RIGHT, position: W, leader: LeaderType.UNDERSCORE }], children: [new TextRun("Name: \t Datum: \t")] }),
  ] });
  const footer = new Footer({ children: [new Paragraph({ style: "Fuss", tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [
    new TextRun("Erstellt mit Unterstützung von Claude (KI-Assistent von Anthropic)"), new TextRun("\tSeite "), new TextRun({ children: [PageNumber.CURRENT] }), new TextRun("/"), new TextRun({ children: [PageNumber.TOTAL_PAGES] })] })] });
  const d = new Document({
    creator: "Josef, mit Claude", title: titel,
    styles: {
      default: { document: { run: { font: FONT, size: 22 }, paragraph: { spacing: { after: 100, line: 300 } } } },
      paragraphStyles: [
        { id: "Titel1", name: "Titel 1", basedOn: "Normal", next: "Normal", run: { font: FONT, size: 36, bold: true }, paragraph: { spacing: { before: 120, after: 160 } } },
        { id: "Titel2", name: "Titel 2", basedOn: "Normal", next: "Normal", run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { before: 240, after: 80 } } },
        { id: "Auftrag", name: "Auftrag", basedOn: "Normal", run: { font: FONT, size: 22, color: ACC, bold: true }, paragraph: { spacing: { after: 60 } } },
        { id: "Zitat", name: "Zitat", basedOn: "Normal", run: { font: FONT, size: 22, italics: true }, paragraph: { indent: { left: 400 }, spacing: { before: 80, after: 80 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACC, space: 8 } } } },
        { id: "Kopf", name: "Kopfzeile Blatt", basedOn: "Normal", run: { font: FONT, size: 18 } },
        { id: "Fuss", name: "Fußzeile Blatt", basedOn: "Normal", run: { font: FONT, size: 15, color: "555555" } },
        { id: "Klein", name: "Klein", basedOn: "Normal", run: { font: FONT, size: 18, color: "333333" } },
      ] },
    numbering: { config: [{ reference: "schritte", levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } } } }] }] },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1020, bottom: 1020, left: 1020, right: 1020, header: 567, footer: 567 } } }, headers: { default: header }, footers: { default: footer },
      children: [H1(titel), ...body] }]
  });
  const name = `11_Print_Klassische_Moderne_02_Kubismus_${String(nr).padStart(2, "0")}_${(slug || titel).replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}.docx`;
  return Packer.toBuffer(d).then(b => { fs.writeFileSync(path.join(OUT, name), b); console.log(name); });
}
const steps = arr => arr.map(t => P(t, { numbering: { reference: "schritte", level: 0 } }));
const auftrag = (t) => new Paragraph({ style: "Auftrag", children: runs(t) });

const textBlatt = (nr, titel, einordnung, quelle, zitatFR, zitatDE, einfuegen, slug) => doc(nr, titel, [
  auftrag("12.05 bis 12.20 Uhr · Partnerarbeit · 15 Minuten"),
  ...steps(["Lesen Sie zu zweit den Text.", "Markieren Sie: Wer spricht, wann, für oder gegen den Kubismus?", "Notieren Sie das stärkste Argument in einem Satz.", "Wählen Sie ein Wort aus dem Text, das Sie den anderen erklären."]),
  H2("Zur Einordnung"), ...einordnung.map(t => P(t)),
  H2("Der Text"),
  ...(zitatFR ? [new Paragraph({ style: "Zitat", children: runs(zitatFR) }), new Paragraph({ style: "Zitat", children: runs(zitatDE) })] : []),
  P("PLATZHALTER ERSETZEN: " + einfuegen, { run: { bold: true } }),
  P("Quelle: " + quelle, { style: "Klein" }),
  H2("Ihre Notizen"),
  ...lines(1, "Wer spricht, wann?"), ...lines(1, "Für oder gegen den Kubismus?"), ...lines(2, "Das stärkste Argument:"), ...lines(1, "Unser Wort zum Erklären:"),
], slug);

fs.mkdirSync(OUT, { recursive: true });
(async () => {
  await doc(1, "Steckbrief Kubismus", [
    auftrag("12.45 bis 12.55 Uhr · Einzelarbeit · 10 Minuten · Abgabe 12.55 Uhr"),
    ...steps(["Ergänzen Sie den Steckbrief: Zeit, Ort, Personen, Merkmale.", "Nennen Sie ein Werk und eine Stimme der Zeit.", "Legen Sie den Steckbrief in Ihre Mappe."]),
    new Paragraph({ text: "" }),
    box([0.28, 0.72], [1000, 1000, 1600, 2700, 1400, 1500, 2100], [["Zeit"], ["Ort"], ["Personen"], ["Merkmale (mindestens drei)"], ["Ein Werk (Künstlerin oder Künstler, Titel, Jahr)"], ["Eine Stimme der Zeit (wer, wann, was?)"], ["Mein Satz: Der Kubismus zeigt einen Gegenstand ..."]]),
  ], "Steckbrief");
  await textBlatt(2, "Text 1: Louis Vauxcelles, 1908",
    ["Louis Vauxcelles (1870 bis 1943) war einer der bekanntesten Kunstkritiker in Paris. 1905 hatte er schon den Fauves ihren Namen gegeben.", "Im November 1908 stellt Georges Braque bei dem Kunsthändler Daniel-Henry Kahnweiler aus, nachdem die Jury des Salon d'Automne seine Bilder abgelehnt hatte. Vauxcelles bespricht die Ausstellung in der Zeitung *Gil Blas*."],
    "Louis Vauxcelles, Besprechung der Ausstellung Georges Braque, *Gil Blas*, Paris, 14. November 1908 (Gallica, Bibliothèque nationale de France). Übersetzung: Claude, von Josef zu prüfen.",
    "„Il méprise la forme, réduit tout, sites et figures et maisons, à des schémas géométriques, à des cubes.“",
    "„Er verachtet die Form, reduziert alles, Orte und Figuren und Häuser, auf geometrische Schemata, auf Würfel.“",
    "ganze Besprechung aus *Gil Blas* vom 14.11.1908 (Gallica) mit deutscher Arbeitsübersetzung, höchstens eine Seite.", "Text_Vauxcelles");
  await textBlatt(3, "Text 2: Guillaume Apollinaire, 1913",
    ["Guillaume Apollinaire (1880 bis 1918) war Dichter und Kunstkritiker und ein Freund Picassos. Marie Laurencin malte ihn 1908 im Kreis der Künstler.", "1913 erscheint sein Buch *Les Peintres cubistes*, die erste große Verteidigung der neuen Malerei."],
    "Guillaume Apollinaire, *Les Peintres cubistes. Méditations esthétiques*, Paris 1913, Teil I „Sur la peinture“; Project Gutenberg Nr. 55638. Übersetzung: Claude, von Josef zu prüfen.",
    "„Les vertus plastiques: la pureté, l'unité et la vérité maintiennent sous leurs pieds la nature terrassée.“",
    "„Die bildnerischen Tugenden, Reinheit, Einheit und Wahrheit, halten die niedergeworfene Natur unter ihren Füßen.“",
    "Teil I von „Sur la peinture“ (Gutenberg Nr. 55638), etwa eine Seite, mit deutscher Arbeitsübersetzung.", "Text_Apollinaire");
  await textBlatt(4, "Text 3: Streit im Parlament, 1912",
    ["Im Herbst 1912 zeigen die Kubisten im Salon d'Automne, im staatlichen Grand Palais. Ein Pariser Stadtrat, Pierre Lampué, protestiert in einem offenen Brief.", "Am 3. Dezember 1912 kommt der Streit in die Abgeordnetenkammer: Der Abgeordnete Jean-Louis Breton greift die Ausstellung an. Der Sozialist Marcel Sembat verteidigt die Kubisten."],
    "*Journal officiel de la République française*, Débats parlementaires, Chambre des députés, 3. Dezember 1912, S. 2924 bis 2929 (Gallica). Wortlaut Sembat nach Larousse, Encyclopédie de la peinture, Artikel „cubisme“. Übersetzung: Claude, von Josef zu prüfen.",
    "„Quand un tableau vous semble mauvais, vous avez un incontestable droit: celui de ne pas le regarder et d'aller en voir d'autres. Mais on n'appelle pas les gendarmes.“",
    "„Wenn Ihnen ein Bild schlecht vorkommt, haben Sie ein unbestreitbares Recht: es nicht anzusehen und sich andere anzusehen. Aber man ruft nicht die Gendarmen.“",
    "Redeauszüge Breton und Sembat aus dem Journal officiel vom 3.12.1912 (Gallica), je eine halbe Seite, mit deutscher Arbeitsübersetzung.", "Text_Parlament");
  await textBlatt(5, "Text 4: Albert Gleizes und Jean Metzinger, 1912",
    ["Albert Gleizes und Jean Metzinger waren selbst Maler des Kubismus. 1912 schreiben sie das erste Buch über die neue Malerei: *Du Cubisme*.", "Sie wollen erklären, warum ein Bild einen Gegenstand nicht nur von einem Standpunkt aus zeigen muss."],
    "Albert Gleizes und Jean Metzinger, *Du Cubisme*, Paris 1912. Metzinger starb 1956, der Text ist noch geschützt: nur ein kurzes Zitat mit Seitenangabe.",
    "", "",
    "kurzes Zitat (höchstens drei Sätze) aus *Du Cubisme* mit Seitenangabe und deutscher Übersetzung; dazu zwei bis drei Sätze Zusammenfassung des Kapitels.", "Text_Gleizes_Metzinger");
  await textBlatt(6, "Text 5: Apollinaire über Marie Laurencin, 1913",
    ["Marie Laurencin (1883 bis 1956) gehörte zum Kreis um Picasso und Apollinaire. 1908 malte sie die *Gruppe von Künstlern* mit sich selbst darin.", "In seinem Buch von 1913 widmet Apollinaire ihr ein eigenes Kapitel, als einziger Malerin."],
    "Guillaume Apollinaire, *Les Peintres cubistes. Méditations esthétiques*, Paris 1913, Kapitel „Marie Laurencin“; Project Gutenberg Nr. 55638. Übersetzung: Claude, von Josef zu prüfen.",
    "„Notre époque a permis aux talents féminins de s'épanouir dans les Lettres et dans les Arts.“",
    "„Unsere Zeit hat weiblichen Talenten erlaubt, sich in der Literatur und in den Künsten zu entfalten.“",
    "Kapitel „Marie Laurencin“ (Gutenberg Nr. 55638), etwa eine Seite, mit deutscher Arbeitsübersetzung; dazu die Abbildung *Gruppe von Künstlern* (1908) klein mit Bildunterschrift.", "Text_Laurencin");
  await doc(7, "Wer feierte, wer bekämpfte?", [
    auftrag("12.20 bis 12.35 Uhr · Gruppenarbeit · 15 Minuten"),
    ...steps(["Bilden Sie Gruppen mit je einer Person aus jedem Expertenpaar.", "Stellen Sie Ihren Text in einer Minute vor.", "Ordnen Sie alle Stimmen auf der Linie ein: Namen und Jahr in das passende Feld.", "Formulieren Sie einen gemeinsamen Satz."]),
    new Paragraph({ text: "" }),
    box([0.2, 0.2, 0.2, 0.2, 0.2], [500, 5200], [["**starke Ablehnung**", "**Ablehnung**", "**gemischt**", "**Zustimmung**", "**Begeisterung**"]]),
    H2("Unser Satz"), ...lines(3, "Der Kubismus war 1912 umstritten, weil"),
    H2("Was hat Sie überrascht?"), ...lines(2),
  ], "Meinungslinie");
  await doc(8, "Ein Gegenstand, drei Ansichten", [
    auftrag("11.45 bis 11.55 Uhr · Einzelarbeit · 10 Minuten"),
    ...steps(["Stellen Sie einen Gegenstand vor sich: Tasse, Flasche oder Schuh.", "Zeichnen Sie ihn in drei kleinen Skizzen: von vorn, von der Seite, von oben.", "Verbinden Sie die drei Ansichten zu einem Bild. Teile dürfen sich überlagern und brechen.", "Lassen Sie alle Linien stehen, radieren Sie nicht."]),
    new Paragraph({ text: "" }),
    box([1 / 3, 1 / 3, 1 / 3], [3300], [["von vorn", "von der Seite", "von oben"]]),
    new Paragraph({ text: "" }),
    box([1], [7000], [["Mein Bild: drei Ansichten in einem"]]),
    P("Schnell fertig? Fügen Sie eine vierte Ansicht von unten hinzu.", { style: "Klein" }),
  ], "Drei_Ansichten");
})();
