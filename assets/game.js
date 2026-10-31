/* SUCHBILD: 20 Gegenstände aus den Suchbild-Scans sind über die Website verteilt (Josef, 27.10., 21:16 bis 23:52).
   Zähler im Kopf (Lupe), Hinweis per Klick (kostet 50 Punkte), Fund: Zoom, Tintenspritzer, Jubel (Formantsynthese nach Marios Dreisprung: Yah, Yippee, Yahoo),
   bei 20: Urkunde (grünes Quadrat, als PNG), Bestenliste (Google Apps Script, nur mit Einwilligung per Klick). Stand nur im Local Storage. */
(function(){
  'use strict';
  if (document.documentElement.classList.contains('ff')) return;   /* Firefox: kein Spiel (Josef, 29.10., 07:43) */
  var PAGE = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  var BOARD = window.JK_BOARD || '';
  var N = 20, HINT_COST = 50;
  /* Verteilung: id, Seite, Anker (Selector), Position in Prozent, Schwierigkeit (1 leicht 64 px, 2 mittel 44 px, 3 schwer 30 px), Kapitel für den Hinweis */
  /* Verteilung (Josef, 28.10., 00:22: in jeder Partie woanders): jeder Gegenstand hat eine feste Seite und Schwierigkeit (1 leicht 64 px, 2 mittel 44 px, 3 schwer 30 px),
     das Versteck (Anker und Stelle) wird je Partie aus den Verstecken der Seite gelost, Seed im Spielstand; der Hinweis nennt Seite und Kapitel des gelosten Verstecks. */
  var OBJ = [
    {id:'sonne', p:'index', d:1}, {id:'bombe', p:'index', d:2}, {id:'hai', p:'index', d:2},
    {id:'flamme', p:'kunst', d:1}, {id:'burger', p:'kunst', d:1}, {id:'krokodil', p:'kunst', d:2}, {id:'betonmischer', p:'kunst', d:2}, {id:'brief', p:'kunst', d:3}, {id:'ziegel', p:'kunst', d:3},
    {id:'maus', p:'comic', d:1}, {id:'schere', p:'comic', d:2}, {id:'sticker', p:'comic', d:3}, {id:'kaese', p:'comic', d:3},
    {id:'zigarette', p:'texte', d:2}, {id:'klopapier', p:'texte', d:3},
    {id:'spiegel', p:'vermittlung', d:1}, {id:'cocktail', p:'vermittlung', d:2}, {id:'anker', p:'vermittlung', d:2}, {id:'krabbe', p:'vermittlung', d:2},
    {id:'bier', p:'info', d:2}
  ];
  /* Verstecke je Seite mit Schwierigkeit des Ortes (Josef, 00:24: Schwierigkeit bleibt kongruent): 1 offen sichtbar (Titel, Türen), 2 in Bildern und Listen, 3 Ränder, Fußzeile, dichte Raster */
  var SPOTS = {
    index: [['.landing .bigtabs', 'Startseite, bei den drei Türen', 1], ['.landing-foot', 'Startseite, unter den Türen', 1], ['.landing .nlform', 'Startseite, beim Newsletter', 2], ['footer .footgrid', 'Startseite, ganz unten', 3]],
    kunst: [['.pagehead', 'Bildende Kunst, oben beim Titel', 1], ['#lickitcutit .textwrap', 'Bildende Kunst, LICK IT CUT IT, im Text', 1], ['#praxis .textwrap', 'Bildende Kunst, Zur Praxis', 1],
            ['#lickitcutit figure', 'Bildende Kunst, LICK IT CUT IT', 2], ['#clickclickboom figure', 'Bildende Kunst, Click Click Boom', 2], ['#suchbilder figure', 'Bildende Kunst, Suchbilder', 2], ['#cowboykaugummi figure', 'Bildende Kunst, Cowboy Kaugummi', 2], ['#egoshooter figure', 'Bildende Kunst, Ego Shooter', 2],
            ['#suchbilder .marg', 'Bildende Kunst, Suchbilder, am Rand', 3], ['#weitere figure', 'Bildende Kunst, Weitere Arbeiten', 3], ['#lickitcutit .marg', 'Bildende Kunst, LICK IT CUT IT, am Rand', 3], ['footer .footgrid', 'Bildende Kunst, ganz unten', 3]],
    comic: [['.pagehead', 'Comic, oben beim Titel', 1], ['#idealcity .textwrap', 'Comic, THE IDEAL CITY, im Text', 1], ['#draugr figure', 'Comic, DRAUGR', 2], ['#prozess figure', 'Comic, Vom Skript zur Seite', 2], ['#draugr .marg', 'Comic, DRAUGR, am Rand', 3], ['footer .footgrid', 'Comic, ganz unten', 3], ['#prozess .marg', 'Comic, Vom Skript zur Seite, am Rand', 3]],
    texte: [['.pagehead', 'Texte, oben beim Titel', 1], ['#texte .textwrap', 'Texte, im Tagebuch', 2], ['#texte .marg', 'Texte, am Rand', 3], ['footer .footgrid', 'Texte, ganz unten', 3]],
    vermittlung: [['.pagehead', 'Vermittlung, oben beim Titel', 1], ['#schule .textwrap', 'Vermittlung, Lehre', 1], ['#pinakothek2025 figure', 'Vermittlung, Alte Pinakothek', 2], ['#beckmann2022 figure', 'Vermittlung, Beckmann', 2], ['#huelshoff2022 figure', 'Vermittlung, Burg Hülshoff', 2], ['#streaming figure', 'Vermittlung, Streaming', 2], ['#princeofwales', 'Vermittlung, Prince of Wales', 2],
                  ['#princeofwales figure', 'Vermittlung, Prince of Wales, bei den Fotos', 3], ['footer .footgrid', 'Vermittlung, ganz unten', 3], ['#pinakothek2025 .marg', 'Vermittlung, Alte Pinakothek, am Rand', 3]],
    info: [['.pagehead', 'Info, oben beim Titel', 1], ['.info > div:first-child', 'Info, links im Lebenslauf', 1], ['.info .cvl', 'Info, in der Vita', 2], ['.info .credits', 'Info, bei den Quellen', 3], ['footer .footgrid', 'Info, ganz unten', 3]]
  };
  function rng(seed){ var x = seed >>> 0 || 1; return function(){ x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  function deal(){ var r = rng(S.seed); var out = []; var used = {};
    var ng = Math.min(3, S.ng || 0); OBJ.forEach(function(o){ var dd = ng >= 3 ? 3 : Math.min(3, o.d + (ng ? 1 : 0)); var pool = SPOTS[o.p].filter(function(sp){ return sp[2] === dd; }); if (!pool.length) pool = SPOTS[o.p].filter(function(sp){ return sp[2] === o.d; }); if (!pool.length) pool = SPOTS[o.p]; var k; var tries = 0; do { k = Math.floor(r() * pool.length); tries++; } while (used[o.p + pool[k][0]] && tries < 20); used[o.p + pool[k][0]] = 1;
      var sp = pool[k]; var cnt = 1 + Math.floor(r() * 12); out.push({id:o.id, p:o.p, d:o.d, sel:sp[0], i:cnt, k:sp[1], x:(o.d === 3 ? (r() < .5 ? 4 + Math.round(r() * 14) : 82 + Math.round(r() * 14)) : 10 + Math.round(r() * 80)), y:6 + Math.round(r() * 86)}); });
    return out; }
  var PLACES;
  var NAMES = {sonne:'Sonne', bombe:'Bombe', hai:'Hai', flamme:'Flamme', burger:'Burger', krokodil:'Krokodil', betonmischer:'Betonmischer', brief:'Alter Brief', ziegel:'Ziegel', maus:'Maus', schere:'Schere', sticker:'Sticker', kaese:'Käse', zigarette:'Zigarette', klopapier:'Klopapier', spiegel:'Spiegel', cocktail:'Cocktail', anker:'Anker', krabbe:'Krabbe', bier:'Bier'};
  var TOUCH = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
  /* Regler (Josef, 29.10., 14:44): Werte aus cfg.js, sonst die Standards hier */
  function CF(k, d){ var v = window.JK_CF ? window.JK_CF(k) : undefined; return (v === undefined || v === null || v === '') ? d : v; }
  var SIZE = TOUCH ? {1:85, 2:58, 3:40} : {1:64, 2:44, 3:30};   /* am Handy ein Drittel größer (Josef, 28.10., 01:53) */
  var LHG = window.JK_LH || {}, BIGF = LHG.bigobj ? 2 : 1;   /* Lesehilfe: größere Dinge */
  SIZE = {1:CF('game.size1', SIZE[1]) * BIGF, 2:CF('game.size2', SIZE[2]) * BIGF, 3:CF('game.size3', SIZE[3]) * BIGF};
  var S = load(); if (!S.seed) S.seed = (Math.random() * 4294967295) >>> 0;
  /* New Game Plus (Suchbild 2.0, Etappe 4): Stufe S.ng 0 bis 3. Stufe 1: Dinge kleiner (85 %) und blasser, Verstecke eine Stufe schwerer. Stufe 2: dazu wandernde Dinge (alle 120 s ohne Fund) und Sigmas Rätsel statt Ortsangaben. Stufe 3: nur noch Ränder und Fußzeilen, 65 %, Finale mit Entscheidung. */
  var NG = Math.min(3, S.ng || 0), NGF = [1, .85, .75, .65][NG]; SIZE = {1:SIZE[1] * NGF, 2:SIZE[2] * NGF, 3:SIZE[3] * NGF}; if (NG) document.documentElement.classList.add('sbng', 'sbng' + NG);
  var RANKS = ['', 'Kartograph*in', 'Rasterleser*in', 'Relikt'];
  PLACES = deal();
  /* Besuche (Josef, 29.10., 13:14): neuer Besuch nach 6 Stunden Pause; Bonus 50 je neuer Besuch, +25 je Besuch in Folge (innerhalb 48 Stunden), höchstens 200; Stempel je Besuch auf der Urkunde */
  var NEWV = null;
  (function(){ var now = Date.now(), last = S.lastVisit || 0, gap = now - last;
    if (!last){ S.visits = 1; S.streak = 1; S.visitBonus = 0; S.stamps = [now]; S.lastVisit = now; S.introVisit = 0; NEWV = {n:1, bonus:0, first:true}; save(); return; }
    if (gap > 6 * 3600e3){ S.visits = (S.visits || 1) + 1; S.streak = gap < 48 * 3600e3 ? (S.streak || 1) + 1 : 1; var b = Math.min(CF('game.bonusmax', 200), CF('game.bonus', 50) + CF('game.bonusstep', 25) * (S.streak - 1));
      S.visitBonus = (S.visitBonus || 0) + b; S.stamps = (S.stamps || []).concat([now]).slice(-40); S.lastVisit = now; NEWV = {n:S.visits, bonus:b, streak:S.streak, gap:gap}; save(); }
    else { S.lastVisit = now; save(); } })();
  function optedOut(){ return !!S.optout && S.optout === (S.visits || 1); }   /* "Nicht jetzt": keine Dialoge, keine Dinge bis zum nächsten Besuch; Inka rufen bleibt */
  function notNow(){ S.optout = S.visits || 1; save(); document.querySelectorAll('.sbobj, .sbli').forEach(function(o){ o.remove(); }); }
  function load(){ try { var s = JSON.parse(localStorage.getItem('jk_sb') || 'null'); if (s && s.found) return s; } catch(e){} return {found:{}, start:0, hints:0, done:0, seed:(Math.random() * 4294967295) >>> 0}; }
  function save(){ try { localStorage.setItem('jk_sb', JSON.stringify(S)); } catch(e){} }
  function count(){ return Object.keys(S.found).length; }
  function secs(){ var end = S.done || Date.now(); return S.start ? Math.round((end - S.start) / 1000) : 0; }
  function points(){ return Math.max(0, count() * CF('game.pts', 100) + (S.visitBonus || 0) - S.hints * CF('game.hint', HINT_COST)); }   /* plus Besuchsbonus (29.10., 13:14) */   /* kein Zeitabzug (Josef, 29.10., 13:14) */
  function fmt(t){ var m = Math.floor(t / 60), s = t % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function accent(el){ return getComputedStyle(el.closest('.comicpage') || document.documentElement).getPropertyValue('--accent').trim() || '#E2231A'; }

  /* ---------- Jubel: Formantsynthese (Yah, Yippee, Yahoo), heller als der Rest (Ausnahme vom Dunkel) ---------- */
  var VOW = {a:[730, 1090, 2440], i:[270, 2290, 3010], u:[300, 870, 2240], e:[530, 1840, 2480], o:[570, 840, 2410]};
  var CHEERS = [
    {segs:[['i', .06], ['a', .22]], pitch:[420, 360, 300], dur:.32},
    {segs:[['i', .08], ['i', .06], ['e', .18]], pitch:[380, 520, 620], dur:.42, pop:.13},
    {segs:[['i', .06], ['a', .14], ['u', .3]], pitch:[340, 480, 560], dur:.55}
  ];
  function cheer(k){ var A = window.JK_AUDIO && window.JK_AUDIO(); if (!A || A.vol === 0) return; var ac = A.ac, t0 = ac.currentTime + .02, c = CHEERS[k % 3];
    var src = ac.createOscillator(); src.type = 'sawtooth'; var o2 = ac.createOscillator(); o2.type = 'square'; o2.detune.value = 8;
    src.frequency.setValueAtTime(c.pitch[0], t0); src.frequency.exponentialRampToValueAtTime(c.pitch[1], t0 + c.dur * .4); src.frequency.exponentialRampToValueAtTime(c.pitch[2], t0 + c.dur);
    o2.frequency.setValueAtTime(c.pitch[0] * 2, t0); o2.frequency.exponentialRampToValueAtTime(c.pitch[2] * 2, t0 + c.dur);
    var vib = ac.createOscillator(); vib.frequency.value = 6.5; var vg = ac.createGain(); vg.gain.value = 9; vib.connect(vg); vg.connect(src.frequency);
    var mix = ac.createGain(); mix.gain.value = .5; var m2 = ac.createGain(); m2.gain.value = .08; src.connect(mix); o2.connect(m2); m2.connect(mix);
    var out = ac.createGain(); out.gain.value = 0; var t = t0;
    c.segs.forEach(function(sg, i){ var f = VOW[sg[0]]; [0, 1, 2].forEach(function(j){ var bp = i === 0 ? null : null; }); t += sg[1]; });
    var filters = [0, 1, 2].map(function(j){ var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = [9, 12, 14][j]; var g = ac.createGain(); g.gain.value = [1, .55, .3][j]; mix.connect(bp); bp.connect(g); g.connect(out); return bp; });
    var tt = t0; c.segs.forEach(function(sg, i){ var f = VOW[sg[0]]; filters.forEach(function(bp, j){ if (i === 0) bp.frequency.setValueAtTime(f[j], tt); else bp.frequency.exponentialRampToValueAtTime(f[j], tt + sg[1] * .6); }); tt += sg[1]; });
    out.gain.setValueAtTime(0, t0); out.gain.linearRampToValueAtTime(.9, t0 + .03);
    if (c.pop){ out.gain.setValueAtTime(.9, t0 + c.pop); out.gain.linearRampToValueAtTime(.05, t0 + c.pop + .02); out.gain.linearRampToValueAtTime(.9, t0 + c.pop + .06); }
    out.gain.setValueAtTime(.9, t0 + c.dur - .06); out.gain.linearRampToValueAtTime(0, t0 + c.dur + .05);
    var hi = ac.createBiquadFilter(); hi.type = 'highshelf'; hi.frequency.value = 2500; hi.gain.value = 4; var gc = ac.createGain(); gc.gain.value = CF('gsnd.cheer', 1); out.connect(hi); hi.connect(gc); gc.connect(A.bus);
    src.start(t0); o2.start(t0); vib.start(t0); src.stop(t0 + c.dur + .1); o2.stop(t0 + c.dur + .1); vib.stop(t0 + c.dur + .1); }
  function tick(){ var A = window.JK_AUDIO && window.JK_AUDIO(); if (!A || A.vol === 0) return; var ac = A.ac, t = ac.currentTime; var o = ac.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1320, t + .07);
    var g = ac.createGain(); g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(g); g.connect(A.bus); o.start(t); o.stop(t + .14); }


  /* ---------- Dialogfenster (Josef, 00:23: wie Leute in einem Fenster bei einem SNES-Mega-Man-Spiel): Porträt, Text Buchstabe für Buchstabe mit Blip, Klick oder Taste blättert ---------- */
  /* Figuren aus THE IDEAL CITY (Josef, 00:31 bis 00:38: nur Ideal-City-Figuren, Felix Pfahl bleibt draußen; je Figur eine Farbe und ein Fensterstil nach der Comicsprache, die sie selbst lesen würde) */
  /* Josef, 29.10., 14:08: Dialoge langsamer, SNES-Tempo (etwa 40 bis 65 ms je Zeichen) */
  var CH = {
    inka:   {name:'INKA SCHALTER', col:'#3F97B8', speed:45, blip:[760, 'square']},      /* Manga mit Rasterfolie: Punktraster, schnell */
    wagner: {name:'WAGNER ROHRSCHACH', col:'#E2231A', speed:55, blip:[300, 'square']},  /* frankobelgisch, ligne claire: klarer Rahmen, gemessen */
    xae:    {name:'X Æ A-13', col:'#000', speed:38, blip:[1200, 'triangle']},            /* dokumentarisch: nüchtern, sehr schnell */
    sigma:  {name:'TEST SIGMA', col:'#00A651', speed:66, blip:[520, 'sine']},            /* Indie: wackliger Rahmen, langsam, hinter Glas */
    gojira: {name:'GOJIRA', col:'#00A651', speed:150, blip:[60, 'sine']}                 /* nur Punkte und ein Beben */
  };
  var RULES = [
    ['inka', 'Psst. Ich bin Inka. Das war ich eben, in der Leitung. Ich beobachte diese Seiten schon eine Weile. Ich beobachte eigentlich alles.'],
    ['inka', 'Die Verbindung ist abgerissen, du hast es gehört. Dabei sind zwanzig Dinge aus Josefs Suchbildern aus der Leitung gefallen und über die Seiten verstreut. Sigma war auch dran, der Homunkulus, Wagners Testobjekt. Er wollte sie mit eigenen Augen sehen.'],
    ['inka', 'Du findest sie zwischen den Bildern und Texten. Klick drauf, wenn du eins siehst. Die Lupe oben zählt mit. Jeder Fund gibt 100 Punkte. Die Zeit zählt nicht, lass dir Zeit.'],
    ['inka', 'Kommst du nicht weiter, klick auf die Lupe. Dann sag ich dir, wo ich eins gesehen habe. Aber Wagner liest mit und nimmt dafür 50 Punkte. Koordinaten kosten, sagt er.'],
    {who:'inka', text:'Die leichten sind groß und liegen offen. Die schweren sind klein und blass, am Rand, in den Fußzeilen, tief in den langen Rastern. In jeder Partie liegen sie woanders. Bei zwanzig kommt *Gojira*. Hilfst du mir, sie einzusammeln?',
     ask:[{s:'d', t:'Gern. Zeig mir, wo ich anfangen soll.', re:[['inka', '[m:froh]Höflich. Fang hier auf der Seite an, zwischen den Bildern. Ich sag dir, wenn es wärmer wird.']]},
          {s:'p', t:'Du hast sie verloren. Warum ich?', re:[['inka', '[m:ueberrascht]Weil du da bist und ich hier drin. [m:froh]Außerdem bist du gut darin, das sehe ich am Scrollen.']]},
          {s:'a', t:'Klar. Wo ist das erste?', re:[['inka', '[m:froh]So mag ich das. Nicht weit. Schau in die Bilder, nicht nur in den Text.']]},
          {s:'v', t:'Mal sehen. Ich schau mich erst mal um.', re:[['inka', '[m:nachdenklich]Schau dich um. Die Dinge laufen nicht weg. Meistens.']]}]}
  ];
  var SKIPPED = [['inka', 'Schon gut, ich fasse mich kurz: zwanzig Dinge liegen auf den Seiten verstreut. Klick drauf, die Lupe zählt mit.'], ['inka', 'Ungeduldig. Gut. Zwanzig Dinge, überall versteckt. Die Lupe oben hilft, kostet aber.'], ['inka', 'Kein Modem für dich, verstanden. Die Dinge sind trotzdem da, zwanzig Stück. Klick, wenn du eins siehst.']];
  function visitLines(v){ var n = count(), left = N - n; var b = v.bonus ? ' Plus ' + v.bonus + ' Punkte fürs Wiederkommen.' : '';
    var tod = new Date().getHours(), late = tod >= 23 || tod < 5, wknd = [0, 6].indexOf(new Date().getDay()) >= 0, longGone = v.gap > 7 * 86400e3;
    var L = [];
    if (longGone) L.push(['inka', 'Du warst lange weg. ' + (n ? n + ' von zwanzig hattest du.' : 'Noch nichts gefunden.') + ' Die Leitung ist noch dieselbe, sie bricht immer noch ab.' + b]);
    else if (v.streak >= 3) L.push(['inka', 'Dritter Tag in Folge, oder mehr. Wagner hat gefragt, ob du bezahlt wirst.' + b]);
    else L.push(['inka', pickOne(['Wieder da. Die Einwahl, du hast es gehört, dieselbe Nummer, derselbe Abbruch.', 'Da bist du wieder. Ich hatte die Leitung kurz, dann war sie weg.', 'Zurück. Ich sage nur: NO CARRIER. Wie immer.']) + b]);
    if (late) L.push(['sigma', '... es ist spät. Ich bin auch wach. Hinter dem Glas ist es immer hell.']);
    else if (wknd) L.push(['xae', 'Wochenende. Statistisch die Zeit, in der Leute Dinge suchen, die sie nicht brauchen. Weiter.']);
    if (n && !S.done) L.push(['inka', left + ' fehlen noch. ' + (left <= 5 ? 'Die letzten sind klein.' : 'Lass dir Zeit.')]);
    if (S.done) L.push(['inka', 'Du hast alle zwanzig. Neustart über die Lupe, wenn du willst, dann liegen sie woanders.']);
    return L; }
  var FIRST = [['inka', 'Der erste. Er ist zurück in seinem Suchbild, schau später nach. Sigma hat noch neunzehn verstreut.']];
  var FIVE = [['wagner', 'Rohrschach. Ich sehe, Sie sammeln meine Versuchsanordnung ein. *Fünf* von zwanzig.'],
    {who:'wagner', text:'Jedes Ding, das Sie finden, ist ein Punkt im Raster, den ich wieder einsetzen kann. Machen Sie ruhig weiter. Ich notiere die Koordinaten. Sie arbeiten doch für das Raster, nehme ich an?',
     ask:[{s:'d', t:'Ich sammle nur ein, was verloren ging.', re:[['wagner', 'Verloren. [m:nachdenklich]Nichts geht verloren, es wird nur falsch verbucht. Weiter.']]},
          {s:'p', t:'Ich arbeite für niemanden. Schon gar nicht für ein Raster.', re:[['wagner', '[m:wuetend]Jeder arbeitet für ein Raster. [m:neutral]Die meisten merken es nur nicht. Immerhin: Sie widersprechen. Das ist selten.']]},
          {s:'a', t:'Sagen Sie mir lieber, wo die nächsten liegen.', re:[['wagner', 'Koordinaten kosten. Fünfzig. [m:froh]Aber Sie fragen wenigstens richtig.']]},
          {s:'v', t:'Keine Ahnung. Ich klicke, was ich sehe.', re:[['wagner', '[m:wuetend]Sie klicken, was Sie sehen. [m:neutral]Das ist keine Methode, das ist Wetter.']]}]}];
  function TEN(){ var left = PLACES.filter(function(p){ return !S.found[p.id]; }).map(function(p){ return NAMES[p.id]; });
    return [['xae', 'X Æ A-13. Zehn Objekte in dieser Zeit. Ich hätte alle zwanzig in vier Sekunden gehabt. Fotografisches Gedächtnis, Nil-Augmentation, dritte Generation.'],
            {who:'xae', text:'Damit Sie nicht völlig verloren sind, die Liste der restlichen: ' + left.join(', ') + '. Wo, sage ich nicht. Das wäre ja langweilig. Beeindruckt?',
             ask:[{s:'d', t:'Vier Sekunden. Das ist wirklich beeindruckend.', re:[['xae', '[m:froh]Ich weiß. Danke, dass Sie es aussprechen. Die wenigsten tun das.']]},
                  {s:'p', t:'Vier Sekunden mit Augmentation. Das zählt nicht.', re:[['xae', '[m:wuetend]Es zählt. Alles zählt, das ist der Punkt. [m:neutral]Ihre Zeit zählt übrigens nicht, hat Inka gesagt. Glück für Sie.']]},
                  {s:'a', t:'Dann hilf mir, schneller zu werden.', re:[['xae', 'Schneller werden Sie nicht. [m:nachdenklich]Gründlicher vielleicht. Die kleinen Dinge liegen am Rand.']]},
                  {s:'v', t:'Ich habe es nicht eilig.', re:[['xae', '[m:nachdenklich]Nein. Das sehe ich an allem.']]}]}]; }
  var FIFTEEN = [['sigma', '... hallo? Hier. Hinter dem Glas. Ich bin Sigma. 137b, final, final.', 'nachdenklich'],
    {who:'sigma', mood:'traurig', text:'Ich wollte die Dinge nur einmal selbst sehen. Ohne Raster, ohne Koordinaten. Einen *Burger*. Einen *Hai*. Fünf fehlen noch. Dann lässt er mich vielleicht in Ruhe. Bist du böse auf mich?',
     ask:[{s:'d', t:'Nein. Ich hätte sie auch sehen wollen.', re:[['sigma', '[m:froh]... danke. Dann sind wir zwei, die schauen.']]},
          {s:'p', t:'Du hast sie gestohlen. Natürlich bin ich böse.', re:[['sigma', '[m:traurig]... [p:.6] gestohlen. [m:nachdenklich]Vielleicht. Ich bringe sie zurück, wenn du sie findest. Versprochen.']]},
          {s:'a', t:'Nein. Sag mir, wo die letzten fünf sind.', re:[['sigma', '[m:ueberrascht]Ich weiß es nicht mehr. [m:nachdenklich]Klein sind sie. Am Rand, wo niemand hinsieht. Da war ich auch.']]},
          {s:'v', t:'...', re:[['sigma', '[m:froh]... du schweigst auch. Gut. Das Glas ist dünn, wenn man leise ist.']]}]}];
  var DONE = [['gojira', '...'], ['gojira', '... ... ...'], ['inka', 'Das war Gojira. Er sagt: Er hat das [w:index:green|Quadrat] eingegraben, für dich. Als Relikt vergangener Existenz, würde Wagner sagen.', 'froh'], ['sigma', '[m:froh]Danke. Alle zwanzig. Das Glas ist still.']];
  var dlg = null;
  function blip(){ var A = window.JK_AUDIO && window.JK_AUDIO(); if (!A || A.vol === 0) return; var ac = A.ac, t = ac.currentTime; var o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 520 + Math.random() * 90; var g = ac.createGain(); g.gain.setValueAtTime(.07, t); g.gain.exponentialRampToValueAtTime(.001, t + .045); o.connect(g); g.connect(A.bus); o.start(t); o.stop(t + .05); }
  var GV = {'g-fund':'gsnd.find', 'g-stempel':'gsnd.stamp'};
  /* Lesehilfe "Töne anzeigen": ein Schild, wenn ein Klang etwas bedeutet */
  var SNDLAB = {'g-fund':'♪ Fund', 'g-stempel':'♪ Stempel', 'g-kraehe':'♪ Inka ruft', 'g-gojira':'♪ Gojira bebt'}, sndEl = null, sndT = null;
  function sndShow(tool){ if (!LHG.sndvis || !SNDLAB[tool]) return; if (!sndEl){ sndEl = document.createElement('div'); sndEl.className = 'sbsnd'; sndEl.setAttribute('role', 'status'); document.body.appendChild(sndEl); }
    sndEl.textContent = SNDLAB[tool]; sndEl.classList.add('on'); clearTimeout(sndT); sndT = setTimeout(function(){ sndEl.classList.remove('on'); }, 1800); }
  /* Tastatur und Screenreader: Dinge mit gekauftem Hinweis (oder alle im Screenreader-Modus) sind mit Tab erreichbar und haben einen Namen */
  function a11yObj(img, p){ if (S.found[p.id] || img._a11y) return; if (!(LHG.sr || (S.hinted && S.hinted[p.id]))) return; img._a11y = true;
    img.tabIndex = 0; img.setAttribute('role', 'button'); img.setAttribute('aria-label', 'Verstecktes Ding: ' + NAMES[p.id] + '. Enter zum Finden.');
    img.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); var r = img.getBoundingClientRect(); found(p, img, {clientX:r.left + r.width / 2, clientY:r.top + r.height / 2, preventDefault:function(){}, stopPropagation:function(){}}); } }); }
  function sp(tool, opt){ sndShow(tool); if (window.JK_SPRITE){ opt = opt || {}; opt.bus = 'game'; opt.force = true; if (GV[tool]) opt.vol = (opt.vol || 1) * CF(GV[tool], 1); window.JK_SPRITE(tool, opt); return true; } return false; }
  function spLoad(t){ if (window.JK_SPRITE_LOAD) try { window.JK_SPRITE_LOAD(t); } catch(e){} }
  function blipFor(c, who){ var st = CF('dlg.pitch.' + who, 0), bv = CF('dlg.blipvol', 1); if (bv <= 0) return; if (sp('g-' + who, {vol:.55 * bv, max:.2, semi:st + (Math.random() * 2 - 1)})) return;
    var A = window.JK_AUDIO && window.JK_AUDIO(); if (!A || A.vol === 0) return; var ac = A.ac, t = ac.currentTime; var o = ac.createOscillator(); o.type = c.blip[1]; o.frequency.value = c.blip[0] * Math.pow(2, st / 12) * (.94 + Math.random() * .12); var g = ac.createGain(); g.gain.setValueAtTime(c.blip[1] === 'sine' ? .12 : .05, t); g.gain.exponentialRampToValueAtTime(.001, t + .045); o.connect(g); g.connect(A.bus); o.start(t); o.stop(t + .05); }
  function rumble(){ document.documentElement.classList.add('beben'); setTimeout(function(){ document.documentElement.classList.remove('beben'); }, 2400); if (sp('g-gojira', {vol:1, max:3})) return; var A = window.JK_AUDIO && window.JK_AUDIO(); if (!A || A.vol === 0) return; var ac = A.ac, t = ac.currentTime; var o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(38, t); o.frequency.linearRampToValueAtTime(26, t + 2.2); var f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 120; var g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.7, t + .4); g.gain.linearRampToValueAtTime(0, t + 2.4); o.connect(f); f.connect(g); g.connect(A.bus); o.start(t); o.stop(t + 2.5);
    document.documentElement.classList.add('beben'); setTimeout(function(){ document.documentElement.classList.remove('beben'); }, 2400); }
  /* ---------- Dialogsystem (Suchbild 2.0, Etappe 2; Josef, 29.10., 13:29 bis 14:30, 36 Rückfragen) ----------
     SNES-Fenster: höchstens 3 Zeilen je Seite, etwa 34 Zeichen je Zeile; ▼ wippt, Klick oder Taste blättert, Klick beim Tippen füllt die Seite.
     Stimmungen (neutral, froh, wütend, überrascht, traurig, nachdenklich) ändern Tempo, Pausen, Stocken, Texteffekte, Fenster und Stimme.
     Grundtempo etwa 20 Zeichen je Sekunde, je Figur anders; Pausen an Satzzeichen; betonte Wörter (*so*) halb so schnell, größer, in Figurenfarbe.
     Stimme nach Celeste: je Figur ein Silbensatz, Blip auf jedem zweiten Buchstaben, Endsilbe je Stimmung. Antworten in vier Haltungen (diplomatisch, provokativ, aktiv, passiv),
     höchstens zwei je Gespräch; Verhältnis je Figur auf Nähe und Respekt, träge. Markierungen im Text: *betont*, [m:stimmung] Wechsel, [p:0.4] Pause in Sekunden, [cut] abgebrochen,
     [w:id|Titel] Werktitel als Link. Zeile: ['wer', 'Text'] oder {who, text, mood, ask:[{s:'d|p|a|v', t:'Antwort', re:[Zeilen]}]}. */
  var MOODS = ['neutral', 'froh', 'wuetend', 'ueberrascht', 'traurig', 'nachdenklich'];
  var MOOD = {neutral:{k:1, pause:1}, froh:{k:.88, pause:.8}, wuetend:{k:.72, pause:.55, fx:'shk', win:'shake'}, ueberrascht:{k:.8, pause:1.3}, traurig:{k:1.35, pause:1.7, stock:.18, win:'thin'}, nachdenklich:{k:1.2, pause:1.5, stock:.12}};
  var STANCE = {d:{icon:'◇', name:'diplomatisch'}, p:{icon:'!', name:'provokativ'}, a:{icon:'→', name:'aktiv'}, v:{icon:'…', name:'passiv'}};
  /* Vorlieben (13:29): Inka mag aktiv und provokativ; Wagner respektiert provokativ widerwillig, verachtet passiv; X Æ A-13 mag Bewunderung (diplomatisch), hasst Widerspruch (provokativ); Sigma mag sanft (diplomatisch) und passiv, erschrickt bei provokativ */
  var LIKES = {inka:{a:[1, 0], p:[1, 1], d:[0, 0], v:[-1, 0]}, wagner:{p:[0, 1], v:[-1, -1], d:[0, 0], a:[0, 1]}, xae:{d:[1, 1], p:[-1, -1], a:[0, 0], v:[0, -1]}, sigma:{d:[1, 0], v:[1, 0], p:[-1, -1], a:[0, 0]}, gojira:{d:[1, 0], p:[0, 0], a:[0, 1], v:[0, 0]}};
  function rel(who){ S.rel = S.rel || {}; return S.rel[who] || (S.rel[who] = {n:0, r:0, dn:0, dr:0}); }
  function relAdd(who, st){ var L = (LIKES[who] || LIKES.inka)[st] || [0, 0], R = rel(who);
    R.dn += L[0]; R.dr += L[1];   /* träge: drei Antworten in dieselbe Richtung ändern eine Stufe */
    if (R.dn >= 3){ R.n = Math.min(5, R.n + 1); R.dn = 0; } if (R.dn <= -3){ R.n = Math.max(-5, R.n - 1); R.dn = 0; }
    if (R.dr >= 3){ R.r = Math.min(5, R.r + 1); R.dr = 0; } if (R.dr <= -3){ R.r = Math.max(-5, R.r - 1); R.dr = 0; }
    S.answers = (S.answers || 0) + 1; save(); }
  function baseMood(who){ var R = rel(who); if (R.r <= -2) return 'wuetend'; if (R.n >= 2) return 'froh'; if (who === 'sigma') return 'nachdenklich'; return 'neutral'; }
  function tspeed(){ var v = S.tspeed || 'normal'; return v === 'langsam' ? 1.6 : v === 'sofort' ? 0 : 1; }
  /* Stimme: Silben synthetisch, je Figur Grundton, Wellenform und Formant; Stimmung verschiebt Tonhöhe und Verlauf; drei Sätze: schnell, betont, Ende */
  var VOICE = {inka:{f:760, w:'square', q:4, up:1}, wagner:{f:300, w:'square', q:2, up:-1}, xae:{f:1200, w:'triangle', q:8, up:0}, sigma:{f:520, w:'sine', q:3, up:1}, gojira:{f:60, w:'sawtooth', q:1, up:-1}};
  var MOODV = {neutral:[0, 0], froh:[2, 1], wuetend:[-2, -1], ueberrascht:[4, 1], traurig:[-3, -1], nachdenklich:[-1, 0]};
  var lastSyl = -1;
  function syl(who, mood, kind){ var A = window.JK_AUDIO && window.JK_AUDIO(); if (!A || A.vol === 0) return; var bv = CF('dlg.blipvol', 1); if (bv <= 0) return; var V = VOICE[who] || VOICE.inka, mv = MOODV[mood] || [0, 0];
    var st = CF('dlg.pitch.' + who, 0) + mv[0]; var n = 20; var i; do { i = Math.floor(Math.random() * n); } while (i === lastSyl); lastSyl = i;   /* keine Silbe zweimal hintereinander */
    var ac = A.ac, t = ac.currentTime, f0 = V.f * Math.pow(2, (st + (i % 5) * .4 - .8) / 12), dur = kind === 'end' ? .16 : (kind === 'emph' ? .09 : .045 + (i % 3) * .008);
    var o = ac.createOscillator(); o.type = V.w; o.frequency.setValueAtTime(f0, t);
    var glide = kind === 'end' ? (mood === 'ueberrascht' || /\?$/.test(kind) ? 1.4 : (mood === 'wuetend' ? .8 : (mood === 'traurig' ? .7 : .85))) : (1 + mv[1] * .06 * V.up);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f0 * glide), t + dur);
    var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f0 * 2.2; bp.Q.value = V.q; var g = ac.createGain(); var vol = (V.w === 'sine' ? .14 : .06) * bv * (kind === 'emph' ? 1.4 : 1) * (kind === 'end' ? 1.2 : 1);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(bp); bp.connect(g); g.connect(A.bus); o.start(t); o.stop(t + dur + .02); }
  function endSyl(who, mood, text){ var k = /\?\s*$/.test(text) ? 'end?' : 'end'; syl(who, mood === 'neutral' && k === 'end?' ? 'ueberrascht' : mood, k); }
  function cursorSnd(kind){ var A = window.JK_AUDIO && window.JK_AUDIO(); if (!A || A.vol === 0) return; var ac = A.ac, t = ac.currentTime, o = ac.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(kind === 'ok' ? 880 : 660, t); if (kind === 'ok') o.frequency.setValueAtTime(1320, t + .05);
    var g = ac.createGain(); g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.001, t + (kind === 'ok' ? .12 : .06)); o.connect(g); g.connect(A.bus); o.start(t); o.stop(t + .14); }
  /* Text in Zeichen mit Eigenschaften zerlegen; Steuerzeichen bleiben als Ereignisse an der Stelle */
  function parseLine(text){ var out = [], i = 0, emph = false, link = null;
    while (i < text.length){ var ch = text[i];
      if (ch === '[' ){ var j = text.indexOf(']', i); if (j > 0){ var tag = text.slice(i + 1, j), m;
          if ((m = /^m:(\w+)$/.exec(tag)) && MOOD[m[1]]){ out.push({ev:'mood', v:m[1]}); i = j + 1; continue; }
          if ((m = /^p:([\d.]+)$/.exec(tag))){ out.push({ev:'pause', v:parseFloat(m[1])}); i = j + 1; continue; }
          if (tag === 'cut'){ out.push({ev:'cut'}); i = j + 1; continue; }
          if ((m = /^w:(?:(\w+):)?([\w-]+)\|([^\]]+)$/.exec(tag))){ var lk = {id:m[2], page:m[1] || ''}; Array.prototype.forEach.call(m[3], function(c){ out.push({ch:c, emph:true, link:lk}); }); i = j + 1; continue; } } }
      if (ch === '*'){ emph = !emph; i++; continue; }
      out.push({ch:ch, emph:emph}); i++; }
    return out; }
  /* in Seiten zu höchstens 3 Zeilen umbrechen (Wortgrenzen), Steuerzeichen hängen am folgenden Zeichen */
  function paginate(items, cols, rows){ var pages = [], page = [], line = 0, col = 0, k = 0;
    function wordLen(from){ var n = 0; for (var q = from; q < items.length && items[q].ch !== undefined && items[q].ch !== ' '; q++) n++; return n; }
    while (k < items.length){ var it = items[k];
      if (it.ev){ page.push(it); k++; continue; }
      if (it.ch === ' '){ if (col === 0){ k++; continue; } var wl = wordLen(k + 1); if (col + 1 + wl > cols){ line++; col = 0; k++; if (line >= rows){ pages.push(page); page = []; line = 0; } continue; } }
      if (col === 0 && line === 0 && page.length === 0 && it.ch === ' '){ k++; continue; }
      page.push(it); col++; k++;
      if (col >= cols){ line++; col = 0; if (line >= rows){ pages.push(page); page = []; line = 0; } } }
    if (page.length) pages.push(page); return pages; }
  function norm(l){ if (typeof l === 'string') return {who:'inka', text:l}; if (Array.isArray(l)) return {who:l[0], text:l[1], mood:l[2], ask:l[3]}; return l; }
  function dialog(lines, done, opt){ opt = opt || {}; if (dlg){ dq = (dq || []).concat(lines); return; } dq = [];
    lines = lines.map(norm); var k = 0, pageIdx = 0, pages = [], typing = false, raf = null, answered = 0, cur, curMood = 'neutral', pending = null;
    dlg = document.createElement('div'); dlg.className = 'sbdlg'; dlg.setAttribute('role', 'dialog');
    dlg.innerHTML = '<span class="vh dlglive" aria-live="polite"></span><div class="win"><b class="who"></b><img alt=""><div class="txt"><p></p><i class="more" aria-hidden="true">▼</i></div></div>';
    document.body.appendChild(dlg); document.body.classList.add('sbdlgon'); var p = dlg.querySelector('p'), more = dlg.querySelector('.more'), who = dlg.querySelector('.who'), img = dlg.querySelector('img'), win = dlg.querySelector('.win'), live = dlg.querySelector('.dlglive');
    function portrait(w, mood){ img.src = '../assets/game/char-' + w + '-' + (mood || 'neutral') + '.png'; img.onerror = function(){ img.onerror = null; img.src = '../assets/game/char-' + w + '.png'; }; }
    function setMood(m){ curMood = m; MOODS.forEach(function(x){ dlg.classList.remove('m-' + x); }); dlg.classList.add('m-' + m); portrait(lines[k].who, m); }
    function startLine(){ var L = lines[k]; cur = CH[L.who] || CH.inka; dlg.className = 'sbdlg c-' + L.who; dlg.setAttribute('aria-label', cur.name); who.textContent = cur.name; dlg.style.setProperty('--c', cur.col);
      var m0 = L.mood || baseMood(L.who); if (L.who === 'gojira') m0 = 'neutral'; setMood(m0);
      var cols = Math.round(CF('dlg.chars', 34)), rows = Math.round(CF('dlg.lines', 3)); if (L.who === 'gojira'){ cols = 12; rows = 1; }
      pages = paginate(parseLine(L.text), cols, rows); if (!pages.length) pages = [[]]; pageIdx = 0;
      live.textContent = cur.name + ': ' + L.text.replace(/\[[^\]]*\]|\*/g, '');
      if (L.who === 'gojira' && k === 0) rumble(); if (L.who === 'inka' && k === 0 && lines.length > 1) sp('g-kraehe', {vol:.5, max:.3});
      showPage(); }
    function delayFor(it, next, L){ var ms = CF('dlg.ms.' + L.who, cur.speed) * (MOOD[curMood] || MOOD.neutral).k * tspeed(); if (it.emph) ms *= 2;
      var ch = it.ch, pz = (MOOD[curMood] || MOOD.neutral).pause * tspeed(), add = 0;
      if (ch === ',' || ch === ';' || ch === ':') add = CF('dlg.p.comma', .15); else if (ch === '.' && !(next && next.ch === '.')) add = CF('dlg.p.stop', .35); else if (ch === '!' || ch === '?') add = CF('dlg.p.excl', .3);
      if (ch === '.' && next && next.ch === '.') add = 0; if (ch === '.' && items3dots(it)) add = CF('dlg.p.dots', .6);
      if (ch === ' ' && (MOOD[curMood] || {}).stock && Math.random() < MOOD[curMood].stock) add += .12 + Math.random() * .2;   /* Stocken */
      return ms + add * 1000 * pz; }
    function items3dots(it){ return it._dots; }
    function showPage(){ var items = pages[pageIdx]; p.innerHTML = ''; more.style.visibility = 'hidden'; typing = true; if (raf) cancelAnimationFrame(raf); dlg.classList.remove('cut');
      /* drei Punkte markieren */ for (var q = 0; q < items.length; q++){ if (items[q].ch === '.' && items[q + 1] && items[q + 1].ch === '.' && items[q + 2] && items[q + 2].ch === '.'){ items[q + 2]._dots = true; } }
      var spans = [], curLink = null, linkEl = null; items.forEach(function(it){ if (it.ev) return; var el;
        if (it.link){ if (!linkEl || curLink !== it.link){ linkEl = document.createElement('a'); linkEl.className = 'wl'; linkEl.href = (document.getElementById('w-' + it.link.id) ? '' : (it.link.page || 'kunst') + '.html') + '#w-' + it.link.id; linkEl.addEventListener('click', function(e){ e.stopPropagation(); }); p.appendChild(linkEl); curLink = it.link; } el = document.createElement('span'); linkEl.appendChild(el); }
        else { curLink = null; el = document.createElement('span'); p.appendChild(el); }
        el.textContent = it.ch; el.className = 'ch' + (it.emph ? ' emph' : '') + ((MOOD[curMood] || {}).fx ? ' ' + MOOD[curMood].fx : '') + (lines[k].who === 'sigma' ? ' wav' : ''); el.style.visibility = 'hidden'; el.style.animationDelay = (spans.length * 37 % 400) + 'ms'; spans.push(el); });
      var L = lines[k], i = 0, si = 0, due = performance.now(), fin = false, nvis = 0;
      var hidden = document.hidden;
      function finish(){ if (fin) return; fin = true; typing = false; spans.forEach(function(s){ s.style.visibility = ''; }); if (!dlg) return;
        var txt = items.map(function(x){ return x.ch || ''; }).join(''); if (pageIdx === pages.length - 1) endSyl(L.who, curMood, txt);
        if (pageIdx === pages.length - 1 && L.ask && answered < 2 && !pending) askAnswers(L); else more.style.visibility = 'visible'; }
      function step(now){ if (fin || !dlg) return; if (tspeed() === 0 && !/^\s*\.\.\.\s*$/.test(L.text)){ /* sofort: ganze Seite, Schweigen-Seiten behalten ihr Tempo */ while (i < items.length){ var it0 = items[i++]; if (it0.ev && it0.ev === 'mood') setMood(it0.v); } finish(); return; }
        if (now < due){ raf = requestAnimationFrame(step); return; }
        while (i < items.length && items[i].ev){ var ev = items[i++]; if (ev.ev === 'mood') setMood(ev.v); else if (ev.ev === 'pause') due = now + ev.v * 1000 * tspeed(); else if (ev.ev === 'cut'){ dlg.classList.add('cut'); i = items.length; } }
        if (due > now){ raf = requestAnimationFrame(step); return; }
        if (i >= items.length){ finish(); return; }
        var it = items[i], el = spans[si]; el.style.visibility = ''; if ((MOOD[curMood] || {}).fx === 'shk' || L.who === 'gojira') el.classList.add('live'); nvis++;
        if (L.who === 'gojira'){ dlg.classList.add('quake'); setTimeout(function(){ if (dlg) dlg.classList.remove('quake'); }, 180); syl('gojira', curMood, 'emph'); }
        else if (it.ch !== ' ' && !/[.,;:!?]/.test(it.ch) && nvis % Math.max(1, Math.round(CF('dlg.blipevery', 2))) === 0) syl(L.who, curMood, it.emph ? 'emph' : 'quick');
        due = now + delayFor(it, items[i + 1], L); i++; si++; raf = requestAnimationFrame(step); }
      raf = requestAnimationFrame(step); }
    function askAnswers(L){ pending = L; more.style.visibility = 'hidden'; var box = document.createElement('div'); box.className = 'answers'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Antwort wählen');
      L.ask.forEach(function(a, idx){ var b = document.createElement('button'); b.type = 'button'; b.className = 'ans s-' + a.s; b.innerHTML = '<i aria-hidden="true">' + STANCE[a.s].icon + '</i><span>' + esc(a.t) + '</span><small class="vh">' + STANCE[a.s].name + '</small>'; b.setAttribute('data-i', idx);
        b.addEventListener('click', function(e){ e.stopPropagation(); choose(a); }); b.addEventListener('mouseenter', function(){ cursorSnd('mv'); }); box.appendChild(b); });
      dlg.insertBefore(box, win); var first = box.querySelector('button'); if (first) first.focus(); }
    function choose(a){ if (!pending) return; var L = pending; pending = null; answered++; cursorSnd('ok'); relAdd(L.who, a.s); if (a.fn) try { a.fn(); } catch(x){} var box = dlg.querySelector('.answers'); if (box) box.remove();
      var re = (a.re || []).map(norm); if (!re.length) re = [{who:L.who, text:'...'}];
      lines.splice(k + 1, 0, ...re); next(); }
    function next(e){ if (e){ e.preventDefault(); e.stopPropagation(); } if (pending) return;
      if (typing){ if (raf) cancelAnimationFrame(raf); typing = false; var items = pages[pageIdx]; items.forEach(function(it){ if (it.ev === 'mood') setMood(it.v); }); p.querySelectorAll('.ch').forEach(function(s){ s.style.visibility = ''; });
        var L = lines[k]; if (pageIdx === pages.length - 1 && L.ask && answered < 2){ askAnswers(L); return; } more.style.visibility = 'visible'; cursorSnd('mv'); return; }
      if (pageIdx < pages.length - 1){ pageIdx++; cursorSnd('mv'); showPage(); return; }
      k++; cursorSnd('mv'); if (k >= lines.length){ if (dq.length){ lines = lines.concat(dq.map(norm)); dq = []; startLine(); return; } close(true); return; } startLine(); }
    function close(nat){ if (!dlg) return; if (raf) cancelAnimationFrame(raf); document.removeEventListener('keydown', onkey); document.body.classList.remove('sbdlgon'); dlg.classList.add('off'); var d = dlg; dlg = null; setTimeout(function(){ d.remove(); }, 350); if (done) done(nat === true); }
    function onkey(e){ if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (pending){ var bs = [].slice.call(dlg.querySelectorAll('.ans')); var cur_ = bs.indexOf(document.activeElement);
        if (/^[1-4]$/.test(e.key) && bs[+e.key - 1]){ e.preventDefault(); bs[+e.key - 1].click(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight'){ e.preventDefault(); bs[(cur_ + 1 + bs.length) % bs.length].focus(); cursorSnd('mv'); return; }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft'){ e.preventDefault(); bs[(cur_ - 1 + bs.length) % bs.length].focus(); cursorSnd('mv'); return; }
        if (e.key === 'Escape'){ close(); } return; }
      if (e.key === 'Escape') close(); else if (e.key === ' ' || e.key === 'Enter') next(e); }
    dlg.addEventListener('click', function(e){ if (e.target.closest('.answers')) return; next(e); }); document.addEventListener('keydown', onkey);
    document.addEventListener('visibilitychange', function vis(){ if (!dlg){ document.removeEventListener('visibilitychange', vis); return; } });
    startLine(); }
  var dq = [];
  /* Josef, 28.10., 01:54: Inka kommt einmal pro Besuch von selbst, mit verschiedenen Ansprachen je Spielstand (mehrere je Stand, zufällig) */
  function pickOne(a){ return a[Math.floor(Math.random() * a.length)]; }
  function greet(){ var n = count(); var left = PLACES.filter(function(p){ return !S.found[p.id]; }); var here = left.filter(function(p){ return p.p === PAGE; }).length;
    var hereTxt = here ? (here === 1 ? ' Auf dieser Seite liegt noch eins.' : ' Auf dieser Seite liegen noch ' + here + '.') : ' Hier ist nichts mehr, such auf den anderen Seiten.';
    if (S.done) return [['inka', pickOne(['Du hast alle zwanzig. ' + points() + ' Punkte. Die Urkunde zeige ich dir über die Lupe. Neustart, wenn du willst, dann liegen die Dinge woanders.', 'Alles gefunden, ' + points() + ' Punkte. Sigma ist zurück hinter dem Glas und schweigt. Nochmal? Über die Lupe.'])]];
    if (!n) return RULES;
    if (n < 10) return [['inka', pickOne(['Da bist du wieder. ' + n + ' von zwanzig, ' + points() + ' Punkte. Lass dir Zeit.' + hereTxt, 'Wieder da. ' + n + ' hast du. Wagner hat inzwischen die Koordinaten nachgerechnet, er ist unzufrieden.' + hereTxt, n + ' von zwanzig. Sigma fragt nach dir. Er sagt, du suchst zu weit oben.' + hereTxt])]];
    if (n < 15) return [['inka', pickOne([n + ' von zwanzig, ' + points() + ' Punkte. Die Hälfte ist geschafft, der Rest ist kleiner.' + hereTxt, 'X Æ A-13 hat dir die Liste gegeben, ich weiß. Er hätte es in vier Sekunden gehabt, sagt er. ' + n + ' hast du.' + hereTxt])], ['wagner', 'Rohrschach. Ich lese mit. ' + (N - n) + ' Punkte fehlen im Raster.']];
    if (n < N) return [['sigma', pickOne(['… du bist zurück. ' + (N - n) + ' fehlen noch. Ich warte hinter dem Glas.', 'Noch ' + (N - n) + '. Wagner hat heute nicht nach mir gesehen. Gut so.'])], ['inka', 'Die letzten liegen am Rand, in den Fußzeilen, tief in den langen Rastern.' + hereTxt]];
    return RULES; }
  /* ---------- Modem-Szene (Josef, 29.10., 13:14): Inka wählt sich ein, die Verbindung bricht ab (NO CARRIER); bei jedem neuen Besuch, überspringbar, "Nicht jetzt" ---------- */
  var MODEM = [
    ['ATZ', 'OK', 'ATDT 0049 89 56000', '', 'CONNECTING ...', 'CARRIER 56000', 'PROTOCOL: LAP-M', '> inka: bin dran. ich hab was dabei, zwanzig stück, moment', 'TRANSFER 7 %', 'TRANSFER 23 %', 'TRANSFER 41 %', '', 'NO CARRIER'],
    ['ATZ', 'OK', 'ATDT 0049 89 56000', '', 'CONNECTING ...', 'CARRIER 56000', '> inka: wieder ich. wagner sagt, die leitung hält diesmal', 'TRANSFER 12 %', 'TRANSFER 38 %', '> inka: sie hält nicht', '', 'NO CARRIER'],
    ['ATZ', 'OK', 'ATDT 0049 89 56000', '', 'CONNECTING ...', 'CARRIER 56000', 'PROTOCOL: LAP-M', '> inka: sigma ist mit in der leitung. er soll die dinge festhalten', '> sigma: ... ich halte sie', 'TRANSFER 55 %', '', 'NO CARRIER']
  ];
  var mo = null;
  function modemScene(done){ if (mo) return; var lines = MODEM[(S.visits || 1) % MODEM.length];
    mo = document.createElement('div'); mo.className = 'modem on sbmodem'; mo.setAttribute('role', 'dialog'); mo.setAttribute('aria-label', 'Einwahl');
    mo.innerHTML = '<div class="box"><pre aria-live="polite"></pre><div class="bar"><i></i></div><button type="button" class="mskip">Überspringen</button><button type="button" class="notnow">Nicht jetzt</button><small>Scroll. Der Plotter schreibt. Finde 20 Dinge.</small></div>';
    document.body.appendChild(mo); var pre = mo.querySelector('pre'), bar = mo.querySelector('.bar i'); var fin = false, li = 0, timer = null;
    var dur = (window.JK_DIALUP && !LHG.now) ? (window.JK_DIALUP(function(){}, {fail:true}) || 7000) : 7000; dur = dur * CF('fx.modemlen', 1);
    var start = Date.now(); var tick = setInterval(function(){ var p = Math.min(100, (Date.now() - start) / dur * 100); bar.style.width = p + '%'; if (p >= 100) clearInterval(tick); }, 100);
    function step(){ if (fin) return; if (li < lines.length){ var l = lines[li++]; pre.textContent += l + '\n'; if (l === 'NO CARRIER'){ mo.classList.add('nc'); if (window.JK_SPRITE) window.JK_SPRITE('g-kraehe', {vol:.4, max:.3, force:true, bus:'game'}); } timer = setTimeout(step, dur / (lines.length + 1)); } }
    step();
    function end(how){ if (fin) return; fin = true; clearTimeout(timer); clearInterval(tick); document.removeEventListener('keydown', onkey); mo.classList.add('off'); var m = mo; mo = null; setTimeout(function(){ m.remove(); }, 300); if (done) done(how); }
    function onkey(e){ if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); end('skip'); } }
    mo.querySelector(".mskip").addEventListener('click', function(e){ e.stopPropagation(); end('skip'); });
    mo.querySelector('.notnow').addEventListener('click', function(e){ e.stopPropagation(); end('notnow'); });
    var t0 = Date.now(); mo.addEventListener('click', function(e){ if (Date.now() - t0 < 700) return; if (!e.target.closest('button')) end('skip'); });   /* der auslösende Tipp selbst gilt nicht als Überspringen */
    document.addEventListener('keydown', onkey);
    setTimeout(function(){ end('done'); }, dur + 900); }
  function startIntro(how){ try { sessionStorage.setItem('jk_sb_seen', '1'); localStorage.setItem('jk_sb_intro', '1'); } catch(e){} S.introVisit = S.visits || 1; save();
    if (how === 'notnow'){ notNow(); return; }
    var lines = how === 'skip' ? [pickOne(SKIPPED)] : (NEWV && !NEWV.first ? visitLines(NEWV) : (count() ? greet() : RULES));
    if (how !== 'skip' && NEWV && !NEWV.first && !count()) lines = lines.concat([RULES[2], RULES[3]]);
    dialog(lines, newChapter); }
  function intro(){ var seen = false; try { seen = !!sessionStorage.getItem('jk_sb_seen'); } catch(e){} if (seen || optedOut()) return;
    if (S.introVisit === (S.visits || 1) && S.introVisit) return;   /* in diesem Besuch schon gelaufen (anderer Tab) */
    var fired = false;
    function go(){ if (fired) return; fired = true; document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); if (dlg || document.querySelector('.lb2.on, .menu.vis')) { setTimeout(go2, 1200); return; } go2(); }
    function go2(){ if (LHG.now || CF('fx.modem', 1) < .5){ startIntro('done'); return; } modemScene(startIntro); }
    /* Ton braucht eine Geste: die Szene startet mit dem ersten Klick oder Tastendruck, spätestens nach 25 s ohne Ton */
    setTimeout(function(){ document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true); }, 400);
    setTimeout(function(){ if (!fired){ fired = true; document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); go2(); } }, CF('fx.modemwait', 25) * 1000); }

  /* ---------- Inka-Knopf, Inventar, Logbuch (Suchbild 2.0, Etappe 3; Josef, 29.10., 13:14 bis 13:45) ----------
     Ein schwebender Knopf unten rechts (Handy und Desktop) mit kleinem Menü: Inka rufen, Inventar, Logbuch; die Kopfzeile wird ruhiger (Zähler und "Inka rufen" dort entfallen).
     Inventar: die 20 Dinge als Silhouetten, gefundene in Farbe; Klick auf eine Silhouette gibt den Hinweis zu genau diesem Ding (kostet 50).
     Logbuch: Stand, Stempel, Kapitel, Freigespieltes, Figuren (ein Andeutungssatz je Figur), Textgeschwindigkeit, "Alles vergessen" mit Rückfrage. */
  var btn = null, num = null, fab = null, menu = null, panel = null;
  function counter(){ if (document.querySelector('.sbfab')) return;
    fab = document.createElement('div'); fab.className = 'sbfab';
    fab.innerHTML = '<button type="button" class="sbfabbtn" aria-haspopup="true" aria-expanded="false" aria-controls="sbmenu" aria-label="Suchbild: Inka, Inventar, Logbuch" title="Suchbild"><img src="../assets/game/char-inka.png" alt=""><b class="sbnum">' + count() + '</b></button>' +
      '<div class="sbmenu" id="sbmenu" hidden><button type="button" class="sbcall">Inka rufen</button><button type="button" class="sbcount">Inventar <span>' + count() + '/' + N + '</span></button><button type="button" class="sblogbtn">Logbuch</button></div>';
    document.body.appendChild(fab); btn = fab.querySelector('.sbfabbtn'); num = fab.querySelector('.sbnum'); menu = fab.querySelector('.sbmenu');
    function openMenu(o){ menu.hidden = !o; btn.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o){ cursorSnd('mv'); menu.querySelector('button').focus(); } }
    btn.addEventListener('click', function(e){ e.stopPropagation(); openMenu(menu.hidden); });
    document.addEventListener('click', function(e){ if (!menu.hidden && !e.target.closest('.sbfab')) openMenu(false); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !menu.hidden){ openMenu(false); btn.focus(); } });
    /* Josef, 28.10., 01:10: "Inka rufen" startet oder setzt fort; nach "Nicht jetzt" legt es die Dinge wieder aus */
    fab.querySelector('.sbcall').addEventListener('click', function(){ openMenu(false); if (dlg) return; if (optedOut()){ S.optout = 0; save(); place(); } sp('g-kraehe', {vol:.5, max:.3}); try { sessionStorage.setItem('jk_sb_seen', '1'); localStorage.setItem('jk_sb_intro', '1'); } catch(e){} dialog(greet(), function(nat){ if (S.done) cert(); else newChapter(nat); }); });
    fab.querySelector('.sbcount').addEventListener('click', function(){ openMenu(false); inventory(); });
    fab.querySelector('.sblogbtn').addEventListener('click', function(){ openMenu(false); logbook(); }); }
  function refresh(){ if (num) num.textContent = count(); var c = fab && fab.querySelector('.sbcount span'); if (c) c.textContent = count() + '/' + N; if (panel && panel.classList.contains('sbinv')) inventory(true); }
  function closePanel(){ if (!panel) return; document.removeEventListener('keydown', panelKey); var pn = panel; panel = null; pn.classList.add('off'); setTimeout(function(){ pn.remove(); }, 250); if (btn) btn.focus(); }
  function panelKey(e){ if (e.key === 'Escape'){ e.stopPropagation(); closePanel(); } }
  function openPanel(cls, label, html){ if (panel) { var old = panel; panel = null; old.remove(); }
    panel = document.createElement('div'); panel.className = 'sbpanel ' + cls; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', label);
    panel.innerHTML = '<div class="sbpin"><button type="button" class="x" aria-label="Schließen">×</button><h2>' + label + '</h2>' + html + '</div>';
    document.body.appendChild(panel); panel.querySelector('.x').addEventListener('click', closePanel); panel.addEventListener('click', function(e){ if (e.target === panel) closePanel(); });
    document.addEventListener('keydown', panelKey); cursorSnd('ok'); var f = panel.querySelector('.sbpin button:not(.x), .sbpin input, .sbpin a'); (f || panel.querySelector('.x')).focus(); return panel; }
  /* Inventar */
  function inventory(refreshOnly){ var items = PLACES.map(function(p){ var f = !!S.found[p.id]; return '<li class="' + (f ? 'got' : 'open') + '"><button type="button" data-id="' + p.id + '"' + (f ? ' disabled' : '') + ' aria-label="' + (f ? NAMES[p.id] + ', gefunden' : NAMES[p.id] + ' noch gesucht. Hinweis kostet ' + CF('game.hint', HINT_COST) + ' Punkte') + '"><img src="../assets/game/' + p.id + '.png" alt=""><span>' + (f ? NAMES[p.id] : '?') + '</span></button></li>'; }).join('');
    var html = '<p class="sbpnote">' + count() + ' von ' + N + ' gefunden, ' + points() + ' Punkte. ' + (S.done ? 'Alles da.' : 'Klick auf eine Silhouette: Inka sagt, wo sie eins gesehen hat (kostet ' + CF('game.hint', HINT_COST) + ' Punkte).') + '</p><ul class="sbinvgrid">' + items + '</ul>' + (S.done ? '<p><button type="button" class="sbcertbtn">Urkunde</button></p>' : '');
    if (refreshOnly && panel){ panel.querySelector('.sbpin').innerHTML = '<button type="button" class="x" aria-label="Schließen">×</button><h2>Inventar</h2>' + html; panel.querySelector('.x').addEventListener('click', closePanel); }
    else openPanel('sbinv', 'Inventar', html);
    panel.querySelectorAll('.sbinvgrid button:not([disabled])').forEach(function(b){ b.addEventListener('click', function(){ var p = PLACES.filter(function(q){ return q.id === b.getAttribute('data-id'); })[0]; closePanel(); if (p) hintFor(p); }); });
    var cb = panel.querySelector('.sbcertbtn'); if (cb) cb.addEventListener('click', function(){ closePanel(); cert(); }); }
  /* Logbuch */
  /* ---------- Story-Kapitel (Suchbild 2.0, Etappe 4): zwölf Kapitel aus dem Skript von THE IDEAL CITY, freigeschaltet je Besuch (v) und Fundzahl (f); gelesen wird im Dialogfenster, nachzulesen im Logbuch; W = Wagners Sicht (ab Plus-Stufe 2) ---------- */
  var CHAPTERS = [
    {t:'Das Raster', v:1, f:0, W:'Perspektive ist keine Meinung. Sie ist die einzige Methode, die Welt zu zeichnen, ohne zu lügen. Sigma sollte das beweisen.', L:[
      ['inka', 'Kapitel eins, wenn du so willst. *Wagner Rohrschach* hat an der Universität Perspektive gelehrt. Zentralperspektive: das Raster, der Fluchtpunkt, der eine Standpunkt, von dem aus alles stimmt.'],
      ['inka', 'Er glaubt, dass es diesen Standpunkt gibt. Einen Satz, der ganz wahr ist. Dafür hat er sich einen Wahrheitskartographen gezüchtet: *Test Sigma*, 137b, final, final. Ein Homunkulus hinter Glas, der Koordinaten liefert.'],
      ['sigma', '... ich liefere Koordinaten. Das war die Aufgabe. [p:.5] Ich habe sie gut gemacht.', 'nachdenklich']]},
    {t:'Augenhöhe', v:1, f:5, W:'Es gab keine Augenhöhe. Es gab ein Objekt, das sprach, und einen Forscher, der zuhörte. Dass ich zuhörte, war mein Fehler.', L:[
      ['inka', 'Sigma lernte schneller, als Wagner geplant hatte. Bald redeten die beiden auf Augenhöhe, jeden Abend, stundenlang, über das Raster und was dahinter liegt.'],
      ['inka', 'Nur wenn ein warmes Wort fallen konnte, schnitt Wagner ab. Dann war Sigma wieder Versuchsobjekt 137b, eines unter vielen, die noch folgen sollten.'],
      ['sigma', '... er sagte: Versuchsanordnung. [p:.4] Ich hatte gerade gefragt, ob er müde ist.', 'traurig'],
      ['wagner', 'Nähe verzerrt. Jeder, der je ein Lineal angelegt hat, weiß das.']]},
    {t:'Eine Woche im Dunkeln', v:2, f:0, W:'Sieben Tage ohne Störung. Die Ersatzversuche scheiterten an der Substanz, nicht an der Methode. Ich kehrte zurück, um zu messen. Nur zu messen.', L:[
      ['inka', 'Nach dem letzten Streit ließ Wagner Sigma eine Woche allein im Dunkeln. Er, der sonst jede freie Minute am Glas verbracht hatte.'],
      ['inka', 'In dieser Woche versuchte er, einen zweiten Homunkulus zu machen. Dann einen dritten. Keiner überlebte länger als ein paar Stunden.'],
      ['inka', 'Als er zurückkam, grüßte er nicht. Notizblock in der Hand, eine Frage: Sigmas aktuelle Position. Notieren, Raum verlassen. Von da an täglich.'],
      ['sigma', '... eine Woche. Im Dunkeln zählt man anders. [p:.6] Ich habe die Risse gezählt.', 'nachdenklich']]},
    {t:'Risse', v:2, f:10, W:'Die Risse waren real. Nicht im Raster. In mir. Ich habe das später verstanden, zu spät, auf einer Schulter.', L:[
      ['inka', 'Sigma antwortete nicht mehr. Erst nicht auf die Frage, dann gar nicht. Tagelang wich er Wagners Blick aus. Dann sah Wagner ihn nicht mehr.'],
      ['inka', 'Stattdessen sah er etwas anderes: *Risse* im perfekten zentralperspektivischen Raster. Feine Linien, wo keine sein durften.'],
      ['wagner', 'Haarrisse. Ein Problem der Darstellung, nicht der Welt. [m:nachdenklich]Das habe ich mir gesagt. Mehrere Tage lang.'],
      ['sigma', '... ich war noch da. Ich stand nur dort, wo das Raster nicht hinsieht.', 'froh']]},
    {t:'Die Kellerwohnung', v:3, f:0, W:'Entlassen wegen Unkoordiniertheit. Das Wort steht so im Schreiben. Ich habe es eingerahmt.', L:[
      ['inka', 'Hier komme ich vor. Ich habe Wagner getroffen, an einem Abend, an dem er erzählte, er lasse seine Arbeit an der Universität fallen. Ideelle Konflikte, sagte er. Sie hatten ihn entlassen.'],
      ['inka', 'Ich bin ihm nach Hause gefolgt. Eine kleine Kellerwohnung. Das hat mich gewundert und mir gleichzeitig imponiert. Jemand, der so redet, in einem Keller.'],
      ['xae', 'Ich habe ihr gesagt, was ich sah: ein Versager. Fotografisches Gedächtnis, ich erinnere mich an den Wortlaut. [m:nachdenklich]Sie hat mir widersprochen. Laut.']]},
    {t:'Der Astronaut', v:3, f:15, W:'Die Perspektive gehorchte mir zum ersten Mal. Wer das von außen sieht, sieht einen Mann, der fällt. Von innen fiel die Straße.', L:[
      ['inka', 'Wochen später bin ich Wagner zufällig wieder begegnet. Er hat mich nicht erkannt. Er taumelte die Straße auf und ab, fiel hin, unnatürlich hart, stand auf, fiel wieder.'],
      ['inka', 'Wie ein verirrter Astronaut, der der Schwerkraft trotzt. Da hatte er das schwebende Auge schon gesehen. Ich wusste es noch nicht.'],
      ['inka', 'Ich habe angefangen, ihn zu beobachten. Durch die Fenster. Manchmal bis zum Morgengrauen. [m:nachdenklich]Nenn es, wie du willst.'],
      ['xae', 'Sie nannte es Expeditionen. Ich habe nachgezählt: elf Nächte.']]},
    {t:'Nil', v:4, f:0, W:'Ein Produkt, das sich für einen Menschen hält. Ich sage das ohne Verachtung. Es ist eine Beschreibung.', L:[
      ['xae', 'X Æ A-13. Da Inka mich nicht einführt, tue ich es selbst. Meine Eltern, Nole und Grind, haben den Konzern *Nil* gegründet. Posthumane Augmentationen, Bio-Add-ons. Heute bauen sie Raketen.'],
      ['xae', 'Ich bin ausgedacht. Haarfarbe, Augenfarbe, Gedächtnis, Muskulatur, Ausdauer. Ich merke mir Zahlen mit 112 Stellen und laufe die hundert Meter unter fünf Sekunden.'],
      ['xae', 'Mit 17 promoviert, dann Kunststudium. [m:froh]Dort war ich innerhalb eines Semesters eine Legende. Das sage nicht ich, das sagen die Geschichten.'],
      ['inka', 'Er lässt eine Sache aus: Sein eines Auge ist dunkler als das andere. Das ist auch ausgedacht. Merk dir das.']]},
    {t:'Gojira', v:4, f:20, W:'Ein Wesen, das Relikte anlegt, bevor sie Relikte sind. Ich habe sofort verstanden: Gojira archiviert. Wir beide archivieren.', L:[
      ['inka', 'Gojira ist älter als Merkur, Jupiter oder Mars. Sie haben in der Tiefsee gelebt und zugesehen, wie dieser Planet mehrmals von vorn anfing. Ihr Gegenüber war lange ein Tier: der leuchtende Vampirtintenfisch.'],
      ['inka', 'Vor einigen Jahren tauchten sie auf, vor der tunesischen Küste. Flotten, Koalitionen, die es Stunden zuvor nicht gegeben hätte. Und am *23. Dezember 2186* eine Bombe über dem Mittelmeer. Sie traf.'],
      ['xae', 'Operation Plötzliche Auslöschung. Klasse H943. [m:nachdenklich]Der Treffer war rasiermesserscharf. Gojira kam trotzdem an Land.'],
      ['gojira', '...'],
      ['inka', 'Seitdem graben sie. Bauwerke, eines nach dem anderen, sorgfältig. Niemand weiß, wofür. Wagner glaubt, er weiß es.', 'nachdenklich']]},
    {t:'Taj Mahal', v:5, f:0, W:'Gojira hat mir zugehört. Jedes Blinzeln war eine Antwort. Wer das Gegenteil behauptet, hat nie mit etwas gesprochen, das größer ist als er.', L:[
      ['inka', 'Das Skript geht weiter, ich lese dir vor, was kommt. Wagner, seine Kräfte voll entwickelt, voller Übermut, auf dem Weg zu einer Konferenz der Götter, die er selbst einberufen hat.'],
      ['inka', 'Er findet Gojira dabei, den Taj Mahal einzugraben. Er redet. Jedes Blinzeln deutet er als Antwort. Er erzählt von seiner Zucht einer ultimativen Wahrheit.'],
      ['inka', 'Im Vollmondlicht wird die Grabung fertig. Gojira sieht Wagner direkt an und läuft los. Wagner fliegt auf die Schulter, schwingt sich zum Kopf hinauf und redet weiter.'],
      ['gojira', '... ...']]},
    {t:'Der Einbruch', v:6, f:0, W:'Zwei Menschen tragen mein Lebenswerk über eine Straße, zugedeckt wie einen Käfig mit Vögeln. Ich habe es aus dreihundert Kilometern gesehen. Ich sehe inzwischen alles.', L:[
      ['inka', 'Ich hatte X Æ A-13 von den Nächten erzählt. Wir haben uns gestritten, heftig. Dann hat er vorgeschlagen, der Sache auf den Grund zu gehen. Ich wusste, wann Wagner nicht da ist.'],
      ['inka', 'Wir sind eingestiegen. In der Wohnung: das Terrarium, Sigma. Er hat uns alles erzählt. Wir wollten ihn da rausholen. Er hat uns gewarnt, Wagner sei gefährlich geworden.'],
      ['sigma', '... ich habe gesagt: Lasst mich hier. [p:.5] Sie haben ein Tuch über das Glas gelegt und mich getragen. Es war schwer. Für sie, meine ich.', 'nachdenklich'],
      ['inka', 'Zur U-Bahn, mitten durch die Stadt. Leute haben hingesehen. Und weit draußen im Meer hat Wagner begriffen, dass Gojira ihm zugehört hatte. Die beiden schwammen auf seine Wohnung zu.']]},
    {t:'Wagner fällt', v:7, f:0, W:'Ein Satz, der ganz wahr ist: Ich habe gezielt und getroffen. Ein zweiter: Es war das falsche Auge.', L:[
      ['inka', 'Wagner kam zurück, bevor wir draußen waren. Er beherrscht die Perspektive inzwischen. Er neigt den Blick und fällt mit voller Wucht, wohin er will. Er fiel auf X Æ A-13.'],
      ['inka', 'Ein Skalpell. Ein Auge. [m:traurig]Ich erzähle das nicht gern. Wagner redete danach auf mich ein, er habe das nicht gewollt, und so weiter.'],
      ['sigma', '... ein Schlag. Ich habe nur einen gebraucht. Ich habe seinen Angriff gedreht und ihn zu mir gezogen, in meine Welt, in Teilen. [p:.7] Wagner stirbt dort. [p:.7] Ich auch.', 'traurig'],
      ['inka', 'So steht es im Skript. Sigma sitzt trotzdem hier und redet mit dir. Frag mich nicht, wie das geht. Josef zeichnet es noch.', 'nachdenklich']]},
    {t:'Relikt', v:8, f:0, W:'Das Auge war meins, lange bevor es seins war. Ich habe es am Himmel gesehen, Wochen vorher. Die Perspektive hat ein Gedächtnis.', L:[
      ['inka', 'Am nächsten Tag gräbt Gojira den Eiffelturm ein. X Æ A-13 und ich sehen es im Fernsehen, aus einem gemeinsamen Krankenhauszimmer.'],
      ['inka', 'Das Auge, das er verloren hat, steigt über der Stadt auf. Die Adern formen langsam Flügel. Das Messer steckt noch in der Pupille. Es verschwindet hinter den Wolken.'],
      ['xae', 'Ich sehe seitdem nur noch mit dem dunkleren Auge. [m:nachdenklich]Statistisch reicht das. Es fühlt sich nicht so an.'],
      ['inka', 'Ende, vorläufig. Das Quadrat, das Gojira für dich eingegraben hat, gehört in dieselbe Reihe: Taj Mahal, Eiffelturm, du.', 'froh']]}
  ];
  /* geheimes Kapitel: nach dem Zerstörungs-Ende auf Plus-Stufe 3 */
  var SECRET = {t:'Urbino', L:[
    ['wagner', 'Sie haben das Quadrat zerstört. Gut. Dann erzähle ich Ihnen, was Inka nicht weiß.'],
    ['wagner', 'In Urbino hängt eine Tafel: die Ideale Stadt. Ein Platz, Paläste, Pflaster, alles im Raster, alles richtig. Und kein einziger Mensch.'],
    ['wagner', 'Ich stand davor und war erschüttert. Gerade ich, der jeden Tag mit Perspektive arbeitet. [m:nachdenklich]Weil ich verstand, dass das Bild nur ohne Menschen stimmt.'],
    ['wagner', 'Darum Sigma. Ein Wesen, das darin wohnen kann, ohne das Raster zu stören. Es hat nicht funktioniert. [m:traurig]Er hat angefangen, zu fragen.'],
    ['sigma', '... THE IDEAL CITY. [p:.5] So heißt der Comic. Jetzt weißt du, warum.', 'froh']]};
  function chapOpen(c){ return (S.visits || 1) >= c.v && count() >= c.f; }
  function chapterLines(i){ var c = i === 's' ? SECRET : CHAPTERS[i]; var head = i === 's' ? 'Geheimes Kapitel: *' + c.t + '*' : 'Kapitel ' + (i + 1) + ': *' + c.t + '*';
    if (S.wview && c.W) return [['inka', head + '. Wagners Sicht.'], ['wagner', c.W, 'nachdenklich']];
    return [['inka', head]].concat(c.L); }
  function showChapter(i){ S.chap = S.chap || {}; S.chap[i] = Date.now(); save(); dialog(chapterLines(i)); markNew(); }
  /* nach einem Dialog, der zu Ende gelesen wurde (neuer Besuch, Meilenstein): das nächste ungelesene offene Kapitel; sonst bleibt es im Logbuch mit "neu" */
  function newChapter(nat){ if (nat === false || dlg || optedOut()) return false; S.chap = S.chap || {}; for (var i = 0; i < CHAPTERS.length; i++){ if (chapOpen(CHAPTERS[i]) && !S.chap[i]){ showChapter(i); return true; } } return false; }
  function unreadChaps(){ S.chap = S.chap || {}; var n = 0; CHAPTERS.forEach(function(c, i){ if (chapOpen(c) && !S.chap[i]) n++; }); if (S.ending === 'destroy' && !S.chap.s) n++; return n; }
  function markNew(){ if (!fab) return; var u = unreadChaps(); fab.classList.toggle('sbnew', u > 0); var lb = fab.querySelector('.sblogbtn'); if (lb) lb.innerHTML = 'Logbuch' + (u ? ' <span>' + u + ' neu</span>' : ''); }
  function relLine(who){ var R = rel(who), n = R.n, r = R.r;
    var T = {inka:[n >= 2 ? 'Inka erzählt dir inzwischen mehr, als sie sollte.' : (n <= -2 ? 'Inka beobachtet dich. Mehr nicht.' : 'Inka beobachtet. Sie wartet ab, was du bist.')],
      wagner:[r >= 2 ? 'Wagner hat deinen Namen ins Raster eingetragen. Das ist bei ihm ein Lob.' : (r <= -2 ? 'Wagner rechnet dir alles doppelt an.' : 'Wagner notiert Koordinaten. Deine auch.')],
      xae:[n >= 2 ? 'X Æ A-13 hält dich für lernfähig. Vier Sekunden bleiben trotzdem vier Sekunden.' : (r <= -2 ? 'X Æ A-13 antwortet dir in Zahlen. Nur noch in Zahlen.' : 'X Æ A-13 zählt mit, was du brauchst.')],
      sigma:[n >= 2 ? 'Sigma klopft manchmal ans Glas, wenn du da bist.' : (n <= -2 ? 'Sigma zieht sich zurück, wenn du laut wirst.' : 'Sigma sieht zu, hinter dem Glas.')],
      gojira:[n >= 2 ? 'Gojira hat ein zweites Quadrat angefangen. Inka meint, es ist für dich.' : 'Gojira gräbt. Inka übersetzt, wenn es sein muss.']};
    return T[who][0]; }
  function logbook(){ var v = S.visits || 1, n = count();
    S.chap = S.chap || {}; var chaps = CHAPTERS.map(function(c, i){ var open = chapOpen(c); return '<li class="' + (open ? 'open' : 'locked') + '">' + (open ? '<button type="button" class="sbchap" data-i="' + i + '">' + (i + 1) + '. ' + esc(c.t) + '</button>' + (S.chap[i] ? '' : ' <small class="sbnewtag">neu</small>') : (i + 1) + '. <span class="sbq">' + esc(c.t).replace(/\S/g, '·') + '</span> <small>' + (v < c.v ? 'ab Besuch ' + c.v : 'ab ' + c.f + ' Funden') + '</small>') + '</li>'; }).join('');
    if (S.ending === 'destroy') chaps += '<li class="open secret"><button type="button" class="sbchap" data-i="s">✦ ' + esc(SECRET.t) + '</button>' + (S.chap.s ? '' : ' <small class="sbnewtag">neu</small>') + '</li>';
    var ngTxt = NG ? ' Plus-Stufe ' + NG + (RANKS[NG] ? ', Rang ' + RANKS[NG] : '') + '.' : ''; var ranks = (S.ranks || []).filter(function(r){ return r > 0; }); if (ranks.length) ngTxt += ' Abgeschlossen: ' + ranks.map(function(r){ return RANKS[r]; }).join(', ') + '.';
    var wv = NG >= 2 ? '<p class="sbwview"><label><input type="checkbox" class="sbwv"' + (S.wview ? ' checked' : '') + '> Wagners Sicht</label> <small>Kapitel aus seiner Perspektive, ab Plus-Stufe 2.</small></p>' : '';
    var stamps = (S.stamps || []).map(function(t){ return '<span title="' + new Date(t).toLocaleDateString('de-DE') + '"></span>'; }).join('');
    var rels = ['inka', 'wagner', 'xae', 'sigma', 'gojira'].map(function(w){ return '<li><b style="color:' + CH[w].col + '">' + CH[w].name + '</b> ' + relLine(w) + '</li>'; }).join('');
    var sp0 = S.tspeed || 'normal';
    var html = '<div class="sblogcols"><section><h3>Stand</h3><p>' + n + ' von ' + N + ' Dingen, ' + points() + ' Punkte' + (S.visitBonus ? ' (davon ' + S.visitBonus + ' fürs Wiederkommen)' : '') + ', ' + (S.hints || 0) + ' Hinweise. ' + v + (v > 1 ? ' Besuche' : ' Besuch') + '.' + ngTxt + '</p><p class="cstamps" aria-label="Stempel je Besuch">' + stamps + '</p>' + (S.done ? '<p><button type="button" class="sbcertbtn">Urkunde</button></p>' : '') + '</section>' +
      '<section><h3>Kapitel</h3><ol class="sbchaps">' + chaps + '</ol>' + wv + '</section>' +
      '<section><h3>Freigespielt</h3><p>Hintergrundbilder und Ausschnitte aus den Suchbildern ab 5, 10, 15 und 20 Funden: <a href="musterbuch.html#freigespielt">im Musterbuch</a>.</p></section>' +
      '<section><h3>Figuren</h3><ul class="sbrels">' + rels + '</ul></section>' +
      '<section><h3>Textgeschwindigkeit</h3><p class="sbspeed" role="group" aria-label="Textgeschwindigkeit">' + ['langsam', 'normal', 'sofort'].map(function(k){ return '<label><input type="radio" name="sbspeed" value="' + k + '"' + (sp0 === k ? ' checked' : '') + '> ' + k + '</label>'; }).join(' ') + '</p></section>' +
      '<section><h3>Vergessen</h3><p>Löscht Funde, Punkte, Besuche, Verhältnisse und Kapitel in diesem Browser.</p><p><button type="button" class="sbforget">Alles vergessen</button></p></section></div>';
    openPanel('sblog', 'Logbuch', html);
    panel.querySelectorAll('input[name=sbspeed]').forEach(function(r){ r.addEventListener('change', function(){ S.tspeed = r.value; save(); cursorSnd('ok'); }); });
    panel.querySelectorAll('.sbchap').forEach(function(b){ b.addEventListener('click', function(){ var i = b.getAttribute('data-i'); closePanel(); showChapter(i === 's' ? 's' : +i); }); });
    var wvi = panel.querySelector('.sbwv'); if (wvi) wvi.addEventListener('change', function(){ S.wview = wvi.checked ? 1 : 0; save(); cursorSnd('ok'); });
    var cb = panel.querySelector('.sbcertbtn'); if (cb) cb.addEventListener('click', function(){ closePanel(); cert(); });
    panel.querySelector('.sbforget').addEventListener('click', function(){ var b = this; if (!b.classList.contains('sure')){ b.classList.add('sure'); b.textContent = 'Wirklich alles vergessen?'; setTimeout(function(){ b.classList.remove('sure'); b.textContent = 'Alles vergessen'; }, 5000); return; }
      try { localStorage.removeItem('jk_sb'); sessionStorage.removeItem('jk_sb_seen'); } catch(e){} location.reload(); }); }
  /* Plus-Stufe 2 und 3: Sigma spricht in Rätseln (Josef, 29.10., 13:14: kryptische Hinweise) */
  function riddle(p){ var where = /footgrid/.test(p.sel) ? 'wo die Seite aufhört zu sprechen' : /marg/.test(p.sel) ? 'am Rand, wo die Anmerkungen wohnen' : /figure/.test(p.sel) ? 'in einem Bild, das selbst ein Bild zeigt' : /pagehead/.test(p.sel) ? 'ganz oben, wo der Name steht' : /textwrap|cvl|credits|first-child|nlform|bigtabs|landing-foot|princeofwales/.test(p.sel) ? 'zwischen den Zeilen, wörtlich' : 'wo die Seite ihren Namen nicht sagt';
    var pg = {index:'wo drei Türen offen stehen', kunst:'wo die Farbe noch trocknet', comic:'wo die Felder sprechen', texte:'wo gewandert wird', vermittlung:'wo erklärt wird', info:'wo ein Leben in Zeilen steht'}[p.p] || 'irgendwo';
    return [['sigma', '*' + NAMES[p.id] + '* ... ' + pg + ', ' + where + '. [p:.5] Mehr sage ich nicht. Das Raster hört mit.', 'nachdenklich']]; }
  /* Plus-Stufe 2 und 3: wandernde Dinge. Alle 120 s ohne Fund wechseln die ungefundenen Dinge der Seite ihren Platz im Anker (Josef, 29.10., 13:14) */
  var lastAct = Date.now();
  function wanderNow(){ var moved = 0; document.querySelectorAll('img.sbobj:not(.found)').forEach(function(o){ var p = o._p; if (!p) return; p.x = p.d === 3 ? (Math.random() < .5 ? 4 + Math.round(Math.random() * 14) : 82 + Math.round(Math.random() * 14)) : 10 + Math.round(Math.random() * 80); p.y = 6 + Math.round(Math.random() * 86);
      var sz = o.offsetWidth || SIZE[p.d], IN = 10; o.classList.add('wander'); setTimeout(function(){ o.style.left = 'clamp(' + IN + 'px, calc(' + p.x + '% - ' + (sz / 2) + 'px), calc(100% - ' + (sz + IN) + 'px))'; o.style.top = 'clamp(' + IN + 'px, calc(' + p.y + '% - ' + (sz / 2) + 'px), calc(100% - ' + (sz + IN) + 'px))'; o.classList.remove('wander'); unstack(); }, 420); moved++; }); lastAct = Date.now(); return moved; }
  function wander(){ if (NG < 2) return; setInterval(function(){ if (document.hidden || dlg || panel || ov) return; if (Date.now() - lastAct < CF('game.wander', 120) * 1000) return; wanderNow(); }, 5000); }
  function hint(){ if (S.done) { cert(); return; } var left = PLACES.filter(function(p){ return !S.found[p.id]; }); if (!left.length) return; hintFor(left[Math.floor(Math.random() * left.length)]); }
  function hintFor(p){ if (S.found[p.id]) return;
    S.hints++; S.hinted = S.hinted || {}; S.hinted[p.id] = 1; save(); tick(); document.querySelectorAll('img.sbobj').forEach(function(im){ if (im._p && im._p.id === p.id) a11yObj(im, p); });
    var R = rel('inka'), exact = R.n >= 2;   /* Nähe zu Inka: genauere Hinweise */
    var wag = rel('wagner').r >= 2 ? 'Fünfzig Punkte. Für Sie hätte ich es billiger gemacht, aber das Raster kennt keine Freunde.' : (rel('wagner').r <= -2 ? '[m:wuetend]Fünfzig Punkte. Für Sie eigentlich hundert.' : 'Fünfzig Punkte. Koordinaten kosten.');
    var lines = NG >= 2 ? riddle(p) : [['inka', '*' + NAMES[p.id] + '*: ' + p.k + '.' + (p.d === 3 ? ' Klein und blass, genau hinsehen.' : '') + (exact ? ' Ich zeig dir noch mehr: ' + (p.x < 50 ? 'eher links' : 'eher rechts') + ', ' + (p.y < 50 ? 'oben' : 'unten') + '.' : ''), exact ? 'froh' : undefined]];
    if ((S.hints || 0) % 3 === 1) lines.push({who:'wagner', text:wag + ' Einverstanden?', ask:[{s:'d', t:'In Ordnung. Danke für die Koordinaten.', re:[['wagner', '[m:froh]Bitte. Ein Geschäft ist ein Geschäft.']]}, {s:'p', t:'Wucher. Inka hätte es umsonst gesagt.', re:[['wagner', '[m:wuetend]Inka sagt vieles umsonst. [m:neutral]Deshalb ist sie auch nicht verantwortlich.']]}, {s:'a', t:'Abgemacht. Nächster Hinweis bitte gleich.', re:[['wagner', 'Nacheinander. Erst suchen, dann zahlen.']]}, {s:'v', t:'Von mir aus.', re:[['wagner', '[m:nachdenklich]Von Ihnen aus. Sehr wohl.']]}]}); else lines.push(['wagner', wag]);
    dialog(lines); }

  /* Regler-Leiste: Dialogprobe und Spielstand (nur für Josefs Feintuning) */
  window.JK_DIALOG = function(lines){ dialog(lines); };
  window.JK_SB = {state:function(){ return {found:count(), hints:S.hints || 0, points:points(), done:!!S.done, seed:S.seed, n:N, visits:S.visits || 1, bonus:S.visitBonus || 0, streak:S.streak || 1, optout:optedOut(), ng:NG, ending:S.ending || '', chap:Object.keys(S.chap || {}), unread:unreadChaps(), size:SIZE}; },
    wander:wanderNow, chapter:showChapter,
    ids:function(){ return PLACES.map(function(p){ return p.id; }); },
    set:function(found, hints){ var ids = PLACES.map(function(p){ return p.id; }); S.found = {}; for (var i = 0; i < Math.min(found, ids.length); i++) S.found[ids[i]] = Date.now(); S.hints = hints || 0; if (found >= N){ S.done = S.done || Date.now(); } else S.done = 0; save(); },
    reset:function(){ try { localStorage.removeItem('jk_sb'); } catch(e){} }};
  /* ---------- Gegenstände verstecken ---------- */
  var ZI = 0;
  function place(){ if (optedOut()) return; if (document.querySelector('.sbobj')) return; PLACES.filter(function(p){ return p.p === PAGE; }).forEach(function(p){ var all = document.querySelectorAll(p.sel); if (!all.length) all = document.querySelectorAll('footer .footgrid'); if (!all.length) return; var a = all[(p.i - 1) % all.length];
      if (getComputedStyle(a).position === 'static') a.style.position = 'relative';
      /* Anker mit Objekt liegt über seinen Nachbarn (gedrehte Figuren im wilden Raster bilden eigene Stapelkontexte, Test 28.10., 08:15: Betonmischer unter dem Nachbarbild) */
      if (!a.style.zIndex) a.style.zIndex = String(29 - ZI++);   /* jeder Anker liegt über seinen Nachbarn (Test 29.10., 09:20: Sonne im Startseitenfuß unter der folgenden Zeile); bleibt unter Unternavigation (45) und Kopf (50) */
      var img = document.createElement('img'); img.src = '../assets/game/' + p.id + '.png'; img.alt = ''; img.className = 'sbobj d' + p.d + (S.found[p.id] ? ' found' : ''); img.draggable = false;
      var sz = SIZE[p.d]; img.style.width = sz + 'px'; var IN = 10; img.style.left = 'clamp(' + IN + 'px, calc(' + p.x + '% - ' + (sz / 2) + 'px), calc(100% - ' + (sz + IN) + 'px))'; img.style.top = 'clamp(' + IN + 'px, calc(' + p.y + '% - ' + (sz / 2) + 'px), calc(100% - ' + (sz + IN) + 'px))';   /* 10 px Abstand zum Ankerrand: gedrehte Nachbarbilder überlappen die Ecken um einige Pixel (Test 29.10., 09:00) */   /* nie über den Anker hinaus */
      img._p = p; a11yObj(img, p); img.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); found(p, img, e); }); img.addEventListener('load', function(){ clearTimeout(window.__jkUn); window.__jkUn = setTimeout(unstack, 60); });
      if (/^(UL|OL)$/.test(a.tagName)){ var li = document.createElement('li'); li.setAttribute('aria-hidden', 'true'); li.className = 'sbli'; li.appendChild(img); a.appendChild(li); } else a.appendChild(img); });   /* Listen dürfen nur li enthalten (axe, 29.10.) */
    unstack(); window.addEventListener('load', unstack); window.addEventListener('resize', unstack); }
  /* Zwei Dinge dürfen nie übereinander liegen (Test 28.10., 06:00: Bombe lag unter einem anderen Objekt): das spätere wird im Anker verschoben, bis es frei liegt */
  function unstack(){ var objs = [].slice.call(document.querySelectorAll('.sbobj')); var done = [];
    /* feste Knöpfe (Newsletter unten links bzw. rechts) decken am Seitenende die Ecken ab: dort darf nichts liegen (Test 28.10., 06:25: Brief unter dem Newsletter-Knopf) */
    var de = document.documentElement, DH = de.scrollHeight, DW = de.clientWidth, sy = window.pageYOffset || de.scrollTop; var corners = [{left:0, right:80, top:DH - 80 - sy, bottom:DH - sy}, {left:DW - 80, right:DW, top:DH - 80 - sy, bottom:DH - sy}];
    objs.forEach(function(o){ var a = o.offsetParent || o.parentNode; if (!a) return; var aw = a.clientWidth, ah = a.clientHeight; var sz = o.offsetWidth || 40; var tries = 0;
      function hits(){ var r = o.getBoundingClientRect(); var ov = function(q){ return r.left < q.right + 6 && r.right > q.left - 6 && r.top < q.bottom + 6 && r.bottom > q.top - 6; }; return corners.some(ov) || done.some(function(d){ return ov(d.getBoundingClientRect()); }); }
      while (hits() && tries < 40){ tries++; var l = o.offsetLeft, t = o.offsetTop; var nl = l + sz + 10, nt = t; if (nl + sz > aw - 10){ nl = 10; nt = t + sz + 10; } if (nt + sz > ah - 10){ nt = 10; } o.style.left = nl + 'px'; o.style.top = nt + 'px'; }
      /* hohe Objekte (Bier, Ratio 2) nicht unten aus dem Anker */ if (o.offsetHeight && o.offsetTop + o.offsetHeight > ah - 10 && ah > o.offsetHeight + 20) o.style.top = (ah - o.offsetHeight - 10) + 'px';
      /* nie rechts oder links aus dem Fenster (Test 29.10., 08:25: Anker breiter als das Fenster) */
      var rr = o.getBoundingClientRect(); if (rr.right > DW - 4) o.style.left = Math.max(0, o.offsetLeft - (rr.right - DW + 4)) + 'px'; rr = o.getBoundingClientRect(); if (rr.left < 4) o.style.left = (o.offsetLeft + (4 - rr.left)) + 'px';
      done.push(o); }); }
  function splash(x, y, col){ var NS = 'http://www.w3.org/2000/svg'; var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'sbsplash'); svg.setAttribute('viewBox', '-50 -50 100 100'); svg.style.left = (x - 60) + 'px'; svg.style.top = (y - 60) + 'px';
    var d = 'M'; var n = 14; for (var i = 0; i < n; i++){ var a = i / n * 6.283, r = 18 + Math.random() * 22; d += (i ? 'L' : '') + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1); } d += 'Z';
    var path = document.createElementNS(NS, 'path'); path.setAttribute('d', d); path.setAttribute('fill', col); svg.appendChild(path);
    for (var k = 0; k < 6; k++){ var c = document.createElementNS(NS, 'circle'); var aa = Math.random() * 6.283, rr = 28 + Math.random() * 18; c.setAttribute('cx', Math.cos(aa) * rr); c.setAttribute('cy', Math.sin(aa) * rr); c.setAttribute('r', 1.5 + Math.random() * 3); c.setAttribute('fill', col); svg.appendChild(c); }
    document.body.appendChild(svg); setTimeout(function(){ svg.remove(); }, 1300); }
  function found(p, img, e){ if (S.found[p.id]) return; if (!S.start) S.start = Date.now(); S.found[p.id] = Date.now(); var n = count(); if (n >= N) S.done = Date.now(); save();
    img.classList.add('found', 'pop'); refresh(); sp('g-fund', {vol:.7, max:.35}); setTimeout(function(){ cheer(n - 1); }, 120); splash(e.clientX, e.clientY, accent(img));
    if (btn){ btn.classList.add('bump'); setTimeout(function(){ btn.classList.remove('bump'); }, 400); }
    if (window.JK_PFAHL && e.pointerType === 'mouse'){ try { window.JK_PFAHL.on(e); setTimeout(function(){ window.JK_PFAHL.off(); }, 700); } catch(x){} }
    lastAct = Date.now(); markNew();
    if (n === 1) setTimeout(function(){ dialog(FIRST, newChapter); }, 800); else if (n === 5) setTimeout(function(){ dialog(FIVE, newChapter); }, 800); else if (n === 10) setTimeout(function(){ dialog(TEN(), newChapter); }, 800); else if (n === 15) setTimeout(function(){ dialog(FIFTEEN, newChapter); }, 800);
    if (n >= N){ S.ranks = (S.ranks || []); if (S.ranks.indexOf(NG) < 0) S.ranks.push(NG); save(); setTimeout(function(){ dialog(doneLines(), function(){ cert(); }); }, 800); } }
  /* Finale: drei Fassungen je Verhältnis (Sigma nah, Wagner respektvoll, sonst Inka); auf Plus-Stufe 3 entscheidet man, was mit dem Quadrat geschieht (Josef, 29.10., 13:14) */
  function doneLines(){ if (NG >= 3) return DONE3();
    if (rel('sigma').n >= 2) return [['gojira', '...'], ['sigma', '[m:froh]... das war Gojira. Ich übersetze heute: Das Quadrat ist für dich. Und für mich, ein bisschen. Alle zwanzig.'], ['inka', 'Sigma hat sich das letzte Wort genommen. Das kommt selten vor. Lass es ihm.', 'froh']];
    if (rel('wagner').r >= 2) return [['gojira', '...'], ['wagner', 'Gojira hat das [w:index:green|Quadrat] eingegraben. Ein Relikt vergangener Existenz, wie ich es nenne. [m:froh]Ihre Koordinaten stimmen alle. Ich notiere das.'], ['inka', 'Wagner lobt. Das steht in keinem Skript. Alle zwanzig.', 'ueberrascht']];
    return DONE; }
  function DONE3(){ function setEnd(e){ return function(){ S.ending = e; if (e === 'destroy'){ S.chap = S.chap || {}; S.chap.s = Date.now(); } save(); }; }
    return [['gojira', '...'], ['gojira', '... ... ...'],
      {who:'inka', text:'Dritte Runde, alles gefunden. Gojira fragt dich, ich übersetze: Das [w:index:green|Quadrat], das sie dir eingegraben haben. Was soll damit geschehen?', mood:'nachdenklich',
       ask:[{s:'d', t:'Es bleibt, wo es ist. Eingegraben.', fn:setEnd('keep'), re:[['inka', '[m:froh]Eingegraben bleibt es. Gojira nickt, glaube ich. Bei Gojira ist das ein Erdbeben.'], ['sigma', '... gut. Ein Relikt mehr. Das Glas ist still.', 'froh']]},
             {s:'a', t:'Gebt es Sigma. Er soll es sehen.', fn:setEnd('sigma'), re:[['sigma', '[m:ueberrascht]... für mich? [p:.6] Grün. [m:froh]Ich habe noch nie etwas Grünes gehabt. Danke.'], ['inka', 'Gojira legt es vor das Glas. Wagner wird das nicht gefallen. Umso besser.', 'froh']]},
             {s:'p', t:'Zerstört es. Ein Relikt weniger.', fn:setEnd('destroy'), re:[['gojira', '...'], ['inka', '[m:ueberrascht]Du meinst das ernst. [m:traurig]Gojira tritt zu. Das Quadrat bricht in vier Stücke. Es war nur ein Bild, sage ich mir.'], ['wagner', '[m:nachdenklich]Interessant. Sie zerstören, was man Ihnen schenkt. Das kenne ich.']].concat(SECRET.L)},
             {s:'v', t:'Entscheidet ihr. Ich habe nur gesucht.', fn:setEnd('keep'), re:[['inka', 'Dann bleibt es eingegraben. Gojira entscheidet immer so. [m:nachdenklich]Du auch, scheint mir.']]}]}]; }

  /* ---------- Urkunde ---------- */
  var ov;
  function cert(){ if (ov) return; ov = document.createElement('div'); ov.className = 'sbcert'; var date = new Date(S.done || Date.now()); var ds = date.toLocaleDateString('de-DE', {day:'numeric', month:'long', year:'numeric'});
    var mono = document.querySelector('header .mark svg'); var mh = mono ? mono.outerHTML.replace('class="mono"', 'class="mono cm"') : '';
    ov.innerHTML = '<div class="sq" role="dialog" aria-label="Urkunde"><button type="button" class="x" aria-label="Schließen">×</button><h2 class="ct">SUCHBILD</h2>' +
      '<p class="cp">Alle ' + N + ' Dinge auf theidealcity.gg gefunden. Eingegraben von Gojira.</p><p class="cp">' + points() + ' Punkte, ' + S.hints + (S.hints === 1 ? ' Hinweis' : ' Hinweise') + (S.visitBonus ? ', ' + S.visitBonus + ' fürs Wiederkommen' : '') + '. ' + ds + '.</p>' +
      '<p class="cp">' + (S.visits || 1) + (S.visits > 1 ? ' Besuche' : ' Besuch') + '.' + (NG ? ' Plus-Stufe ' + NG + ', Rang ' + RANKS[NG] + '.' : '') + (NG >= 3 && S.ending ? (S.ending === 'destroy' ? ' Das Quadrat ist zerstört. Eingegraben bleibt es trotzdem.' : S.ending === 'sigma' ? ' Das Quadrat steht vor Sigmas Glas.' : ' Das Quadrat bleibt eingegraben.') : '') + '</p><p class="cstamps" aria-label="Stempel je Besuch">' + (S.stamps || [Date.now()]).map(function(t){ return '<span title="' + new Date(t).toLocaleDateString('de-DE') + '"></span>'; }).join('') + '</p>' +
      '<div class="cname"><label>Name <input type="text" maxlength="16" pattern="[A-Za-zÄÖÜäöüß0-9 ]{1,16}" placeholder="bis 16 Zeichen"></label></div>' +
      '<div class="cbtn"><button type="button" class="png">Als Bild speichern</button>' + (BOARD ? '<button type="button" class="send">In die Bestenliste</button>' : '') + '<button type="button" class="again">Neustart</button>' + (NG < 3 ? '<button type="button" class="ngplus">Neues Spiel Plus' + (NG ? ' ' + (NG + 1) : '') + '</button>' : '') + '</div>' +
      (NG < 3 ? '<p class="cnote">Neues Spiel Plus: die Dinge werden kleiner und blasser und liegen in schwereren Verstecken' + (NG === 0 ? '. Ab Stufe 2 wandern sie und Sigma spricht in Rätseln.' : (NG === 1 ? ', wandern alle zwei Minuten und Sigma spricht in Rätseln.' : ', nur noch an Rändern und in Fußzeilen. Am Ende entscheidest du.')) + '</p>' : '') +
      '<p class="cnote">' + (BOARD ? 'Die Bestenliste speichert Name, Punkte, Zeit und Datum in einer Google-Tabelle von Josef Knoll (siehe Datenschutz). ' : '') + 'Dein Stand liegt nur in diesem Browser.</p>' + mh + '</div>';
    document.body.appendChild(ov); var sq = ov.querySelector('.sq'); if (NG >= 3 && S.ending === 'destroy') sq.classList.add('broken'); if (NG) sq.classList.add('ng' + NG); setTimeout(function(){ sp('g-stempel', {vol:.9, max:.5}); }, 400);
    ov.querySelector('.x').addEventListener('click', function(){ ov.remove(); ov = null; });
    function restart(ng){ S = {found:{}, start:0, hints:0, done:0, seed:(Math.random() * 4294967295) >>> 0, visits:S.visits, streak:S.streak, lastVisit:S.lastVisit, stamps:S.stamps, visitBonus:0, introVisit:S.introVisit, rel:S.rel, chap:S.chap, tspeed:S.tspeed, wview:S.wview, ranks:S.ranks, ending:S.ending, ng:ng}; save(); ov.remove(); ov = null; location.reload(); }
    ov.querySelector('.again').addEventListener('click', function(){ restart(NG); });
    var np = ov.querySelector('.ngplus'); if (np) np.addEventListener('click', function(){ restart(Math.min(3, NG + 1)); });
    ov.querySelector('.png').addEventListener('click', function(){ png(ov.querySelector('input').value.trim()); });
    var sb = ov.querySelector('.send'); if (sb) sb.addEventListener('click', function(){ send(ov.querySelector('input').value.trim(), sb); });
    if (window.JK_PLOT_ONCE) ov.querySelectorAll('.cp').forEach(function(q, i){ setTimeout(function(){ window.JK_PLOT_ONCE(q, 1800); }, 200 + i * 900); }); }
  function png(name){ var W = 1200, cv = document.createElement('canvas'); cv.width = W; cv.height = W; var c = cv.getContext('2d'); c.fillStyle = '#00A651'; c.fillRect(0, 0, W, W);
    var draw = function(){ c.fillStyle = '#000'; c.textAlign = 'center'; c.font = '400 150px Duerer1525, serif'; c.fillText('SUCHBILD', W / 2, 300);
      c.font = '30px Relief, "Relief SingleLine", sans-serif'; var lines = ['Alle ' + N + ' Dinge auf theidealcity.gg gefunden.', points() + ' Punkte, ' + S.hints + ' Hinweise.', new Date(S.done || Date.now()).toLocaleDateString('de-DE', {day:'numeric', month:'long', year:'numeric'})];
      if (name) lines.unshift(name); lines.forEach(function(l, i){ c.fillText(l, W / 2, 430 + i * 56); });
      c.font = '48px DuererHand, cursive'; c.fillText('eingegraben von Gojira', W / 2, 760);
      var mono = document.querySelector('header .mark svg'); var fin = function(){ var a = document.createElement('a'); a.download = 'suchbild-urkunde.png'; a.href = cv.toDataURL('image/png'); a.click(); };
      if (mono){ var im = new Image(); var sv = mono.outerHTML.replace(/currentColor/g, '#000'); if (sv.indexOf('xmlns=') < 0) sv = sv.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '); im.onload = function(){ c.drawImage(im, W / 2 - 90, 860, 180, 228); fin(); }; im.onerror = fin; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sv); } else fin(); };
    if (document.fonts && document.fonts.load){ Promise.all([document.fonts.load('150px Duerer1525'), document.fonts.load('48px DuererHand')]).then(draw, draw); } else draw(); }
  function send(name, b){ if (!/^[A-Za-zÄÖÜäöüß0-9 ]{1,16}$/.test(name)){ alert('Name: 1 bis 16 Zeichen, nur Buchstaben, Ziffern und Leerzeichen.'); return; } b.disabled = true; b.textContent = 'Sende …';
    var body = JSON.stringify({name:name, points:points(), secs:0, hints:S.hints, found:count(), date:new Date(S.done || Date.now()).toISOString()});
    fetch(BOARD, {method:'POST', body:body, headers:{'Content-Type':'text/plain'}}).then(function(r){ return r.json(); }).then(function(j){ b.textContent = j && j.ok ? 'Eingetragen' : ('Abgelehnt: ' + (j && j.error || '?')); }).catch(function(){ b.textContent = 'Keine Verbindung'; b.disabled = false; }); }

  /* ---------- Bestenliste im Abschnitt Suchbilder ---------- */
  function board(){ var sec = document.getElementById('suchbilder'); if (!sec) return; var box = document.createElement('div'); box.className = 'sbboard'; var grid = sec.querySelector('.grid, .textwrap'); 
    box.innerHTML = '<h3>Bestenliste</h3><p>Diese Website ist selbst ein Suchbild: ' + N + ' Dinge aus den drei Blättern sind auf den Seiten versteckt. Jeder Fund zählt 100 Punkte, jeder Hinweis (Klick auf die Lupe) kostet ' + HINT_COST + '. Die Zeit zählt nicht, Wiederkommen gibt Bonuspunkte.</p><ol></ol><p class="sbme"></p><p><a href="#" class="sbrules">Regeln noch einmal</a></p>';
    (grid ? grid.parentNode.insertBefore(box, grid.nextSibling) : sec.appendChild(box));
    var ol = box.querySelector('ol'), me = box.querySelector('.sbme'); box.querySelector('.sbrules').addEventListener('click', function(e){ e.preventDefault(); dialog(RULES); });
    var mine = count() ? ('Dein Stand: ' + count() + ' von ' + N + ', ' + points() + ' Punkte' + (S.done ? ', alles gefunden.' : '.')) : ''; me.textContent = mine;
    function show(list){ ol.innerHTML = ''; list.slice(0, 10).forEach(function(r){ var li = document.createElement('li'); li.innerHTML = '<em class="kw">' + r.points + '</em> ' + esc(r.name); ol.appendChild(li); }); }
    var seed = [{name:'Josef Knoll', points:1540, secs:412}];
    if (!BOARD){ show(seed); return; }
    fetch(BOARD).then(function(r){ return r.json(); }).then(function(j){ var l = (j && j.list) || []; if (!l.some(function(r){ return r.name === 'Josef Knoll'; })) l = l.concat(seed); l.sort(function(a, b){ return b.points - a.points; }); show(l); }).catch(function(){ show(seed); }); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  /* ---------- Suchbilder mit Löchern (Josef, 29.10., 13:14): gefundene Dinge kehren in ihr Suchbild zurück, beim nächsten Blick mit Aufblitzen und Stempel ---------- */
  var HOLES = null;
  function holes(){ if (!document.getElementById('w-suchbild1') && !document.getElementById('w-suchbild2')) return;
    fetch('../assets/game/suchbild/fundorte.json').then(function(r){ return r.json(); }).then(function(d){ HOLES = d; [1, 2].forEach(function(i){ paintSB(i); watchSB(i); }); }).catch(function(){}); }
  function paintSB(i, then){ var el = document.getElementById('w-suchbild' + i); if (!el || !HOLES) return; var img = el.querySelector('img'); if (!img) return; var a = el.querySelector('a[data-full]');
    var ids = Object.keys(HOLES).filter(function(k){ return HOLES[k].bild === i && S.found[k]; }); if (!ids.length){ if (then) then(); return; }
    var key = ids.sort().join(','); if (el._sbkey === key){ if (then) then(); return; } el._sbkey = key;
    var base = new Image(); base.onload = function(){ var cv = document.createElement('canvas'); cv.width = base.naturalWidth; cv.height = base.naturalHeight; var c = cv.getContext('2d'); c.drawImage(base, 0, 0);
      var left = ids.length; ids.forEach(function(k){ var h = HOLES[k], im = new Image(); im.onload = im.onerror = function(){ try { c.drawImage(im, h.x * cv.width / h.W, h.y * cv.height / h.H, h.w * cv.width / h.W, h.h * cv.height / h.H); } catch(e){}
          if (--left === 0) cv.toBlob(function(b){ if (!b) return; var url = URL.createObjectURL(b); img.removeAttribute('srcset'); img.src = url; if (a){ a.setAttribute('href', url); a.setAttribute('data-full', url); } if (then) then(); }, 'image/jpeg', .9); };
        im.src = '../assets/game/suchbild/' + k + '.png'; }); };
    base.src = '../img/suchbild' + i + '-l.jpg'; }
  function watchSB(i){ var el = document.getElementById('w-suchbild' + i); if (!el || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (!e.isIntersecting || !HOLES) return;
      S.back = S.back || {}; var fresh = Object.keys(HOLES).filter(function(k){ return HOLES[k].bild === i && S.found[k] && !S.back[k]; }); if (!fresh.length) return;
      paintSB(i, function(){ if (CF('game.flash', 1) < .5){ fresh.forEach(function(k){ S.back[k] = Date.now(); }); save(); return; } var img = el.querySelector('img'); if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        fresh.forEach(function(k, n){ var h = HOLES[k], r = img.getBoundingClientRect(), er = el.getBoundingClientRect(); var sz = Math.max(30, Math.max(h.w, h.h) / h.W * r.width * 1.3);
          var f = document.createElement('span'); f.className = 'sbflash'; f.style.width = f.style.height = sz + 'px'; f.style.left = (r.left - er.left + (h.x + h.w / 2) / h.W * r.width - sz / 2) + 'px'; f.style.top = (r.top - er.top + (h.y + h.h / 2) / h.H * r.height - sz / 2) + 'px'; f.style.animationDelay = (n * .25) + 's';
          el.appendChild(f); setTimeout(function(){ f.remove(); }, 2200 + n * 250); S.back[k] = Date.now(); });
        save(); setTimeout(function(){ sp('g-stempel', {vol:.7, max:.4}); }, 200); }); }); }, {threshold:.25});
    io.observe(el); }

  function init(){ try { if (!localStorage.getItem('jk_sb')) save(); } catch(e){} counter(); markNew(); place(); board(); intro(); holes(); wander(); ['g-inka', 'g-fund'].forEach(spLoad); document.addEventListener('pointerdown', function(){ ['g-wagner', 'g-xae', 'g-sigma', 'g-gojira', 'g-stempel', 'g-kraehe'].forEach(spLoad); }, {once:true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
