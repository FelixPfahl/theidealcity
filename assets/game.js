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
    OBJ.forEach(function(o){ var pool = SPOTS[o.p].filter(function(sp){ return sp[2] === o.d; }); if (!pool.length) pool = SPOTS[o.p]; var k; var tries = 0; do { k = Math.floor(r() * pool.length); tries++; } while (used[o.p + pool[k][0]] && tries < 20); used[o.p + pool[k][0]] = 1;
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
  var S = load(); if (!S.seed) S.seed = (Math.random() * 4294967295) >>> 0; PLACES = deal();
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
    ['inka', 'Die leichten sind groß und liegen offen. Die schweren sind klein und blass, am Rand, in den Fußzeilen, tief in den langen Rastern. In jeder Partie liegen sie woanders. Bei zwanzig kommt Gojira.']
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
  var FIVE = [['wagner', 'Rohrschach. Ich sehe, Sie sammeln meine Versuchsanordnung ein. Fünf von zwanzig.'], ['wagner', 'Jedes Ding, das Sie finden, ist ein Punkt im Raster, den ich wieder einsetzen kann. Machen Sie ruhig weiter. Ich notiere die Koordinaten.']];
  function TEN(){ var left = PLACES.filter(function(p){ return !S.found[p.id]; }).map(function(p){ return NAMES[p.id]; });
    return [['xae', 'X Æ A-13. Zehn Objekte in dieser Zeit. Ich hätte alle zwanzig in vier Sekunden gehabt. Fotografisches Gedächtnis, Nil-Augmentation, dritte Generation.'],
            ['xae', 'Damit Sie nicht völlig verloren sind, die Liste der restlichen: ' + left.join(', ') + '. Wo, sage ich nicht. Das wäre ja langweilig.']]; }
  var FIFTEEN = [['sigma', '… hallo? Hier. Hinter dem Glas. Ich bin Sigma. 137b, final, final.'], ['sigma', 'Ich wollte die Dinge nur einmal selbst sehen. Ohne Raster, ohne Koordinaten. Einen Burger. Einen Hai. Fünf fehlen noch. Dann lässt er mich vielleicht in Ruhe.']];
  var DONE = [['gojira', '…'], ['gojira', '… … …'], ['sigma', 'Das war Gojira. Er hat das Quadrat eingegraben, für dich. Als Relikt vergangener Existenz, würde Wagner sagen. Danke.']];
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
  function dialog(lines, done){ if (dlg){ dq = (dq || []).concat(lines); return; } var k = 0, typing = null; dq = [];
    lines = lines.map(function(l){ return typeof l === 'string' ? ['inka', l] : l; });
    dlg = document.createElement('div'); dlg.className = 'sbdlg'; dlg.setAttribute('role', 'dialog');
    dlg.innerHTML = '<span class="vh dlglive" aria-live="polite"></span><div class="win"><img alt=""><div class="txt"><b class="who"></b><p></p><i class="more" aria-hidden="true">▼</i></div></div>';
    document.body.appendChild(dlg); var p = dlg.querySelector('p'), more = dlg.querySelector('.more'), who = dlg.querySelector('.who'), img = dlg.querySelector('img'), cur;
    function show(i){ var who_ = lines[i][0], text = lines[i][1]; var lv = dlg.querySelector('.dlglive'); if (lv) lv.textContent = ((CH[who_] || CH.inka).name) + ': ' + text; cur = CH[who_] || CH.inka; dlg.className = 'sbdlg c-' + who_; dlg.setAttribute('aria-label', cur.name); who.textContent = cur.name; img.src = '../assets/game/char-' + who_ + '.png'; dlg.style.setProperty('--c', cur.col);
      p.textContent = ''; more.style.visibility = 'hidden'; var n = 0; clearInterval(typing); if (who_ === 'gojira' && k === 0) rumble(); if (who_ === 'inka' && i === 0 && lines.length > 1) sp('g-kraehe', {vol:.5, max:.3});
      typing = setInterval(function(){ n++; p.textContent = text.slice(0, n); if (who_ !== 'gojira' && n % Math.max(1, Math.round(CF('dlg.blipevery', 2))) === 1 % Math.max(1, Math.round(CF('dlg.blipevery', 2))) && text[n - 1] !== ' ') blipFor(cur, who_); if (n >= text.length){ clearInterval(typing); typing = null; more.style.visibility = 'visible'; } }, CF('dlg.ms.' + who_, cur.speed)); }
    function next(e){ if (e) { e.preventDefault(); e.stopPropagation(); } if (typing){ clearInterval(typing); typing = null; p.textContent = lines[k][1]; more.style.visibility = 'visible'; return; }
      k++; if (k >= lines.length){ if (dq.length){ lines = lines.concat(dq.map(function(l){ return typeof l === 'string' ? ['inka', l] : l; })); dq = []; show(k); return; } close(); return; } show(k); }
    function close(){ if (!dlg) return; document.removeEventListener('keydown', onkey); dlg.classList.add('off'); var d = dlg; dlg = null; setTimeout(function(){ d.remove(); }, 350); if (done) done(); }
    function onkey(e){ if (e.key === 'Escape') close(); else if (e.key === ' ' || e.key === 'Enter') next(e); }
    dlg.addEventListener('click', next); document.addEventListener('keydown', onkey); show(0); }
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
    dialog(lines); }
  function intro(){ var seen = false; try { seen = !!sessionStorage.getItem('jk_sb_seen'); } catch(e){} if (seen || optedOut()) return;
    if (S.introVisit === (S.visits || 1) && S.introVisit) return;   /* in diesem Besuch schon gelaufen (anderer Tab) */
    var fired = false;
    function go(){ if (fired) return; fired = true; document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); if (dlg || document.querySelector('.lb2.on, .menu.vis')) { setTimeout(go2, 1200); return; } go2(); }
    function go2(){ if (LHG.now || CF('fx.modem', 1) < .5){ startIntro('done'); return; } modemScene(startIntro); }
    /* Ton braucht eine Geste: die Szene startet mit dem ersten Klick oder Tastendruck, spätestens nach 25 s ohne Ton */
    setTimeout(function(){ document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true); }, 400);
    setTimeout(function(){ if (!fired){ fired = true; document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); go2(); } }, CF('fx.modemwait', 25) * 1000); }

  /* ---------- Zähler im Kopf ---------- */
  var btn, num, note;
  function counter(){ var head = document.querySelector('header.top'); if (!head) return; btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sbcount'; btn.setAttribute('aria-label', 'Suchbild: Hinweis (kostet 50 Punkte)'); btn.title = 'Suchbild: Hinweis, kostet 50 Punkte';
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/></svg><b>' + count() + '</b><span>/' + N + '</span>';
    num = btn.querySelector('b'); var mb = head.querySelector('.menubtn'); head.insertBefore(btn, mb || null);
    btn.addEventListener('click', hint);
    /* Josef, 28.10., 01:10: ein Schalter, mit dem man das Spiel aktiv startet: "Inka rufen". Man weiß nicht, was das soll, und klickt drauf. Mit Spielstand: weiterspielen. */
    var call = document.createElement('button'); call.type = 'button'; call.className = 'sbcall'; call.textContent = 'Inka rufen'; call.title = 'Suchbild starten oder weiterspielen'; head.insertBefore(call, btn);
    call.addEventListener('click', function(){ if (dlg) return; if (optedOut()){ S.optout = 0; save(); place(); } sp('g-kraehe', {vol:.5, max:.3}); try { sessionStorage.setItem('jk_sb_seen', '1'); localStorage.setItem('jk_sb_intro', '1'); } catch(e){} dialog(greet(), S.done ? cert : null); }); }
  function refresh(){ if (num) num.textContent = count(); }
  function hint(){ if (S.done) { cert(); return; } var left = PLACES.filter(function(p){ return !S.found[p.id]; }); if (!left.length) return;
    var p = left[Math.floor(Math.random() * left.length)]; S.hints++; S.hinted = S.hinted || {}; S.hinted[p.id] = 1; save(); tick(); document.querySelectorAll('img.sbobj').forEach(function(im){ if (im._p && im._p.id === p.id) a11yObj(im, p); });
    dialog([['inka', NAMES[p.id] + ': ' + p.k + '.' + (p.d === 3 ? ' Klein und blass, genau hinsehen.' : '')], ['wagner', 'Fünfzig Punkte. Koordinaten kosten.']]); }

  /* Regler-Leiste: Dialogprobe und Spielstand (nur für Josefs Feintuning) */
  window.JK_DIALOG = function(lines){ dialog(lines); };
  window.JK_SB = {state:function(){ return {found:count(), hints:S.hints || 0, points:points(), done:!!S.done, seed:S.seed, n:N, visits:S.visits || 1, bonus:S.visitBonus || 0, streak:S.streak || 1, optout:optedOut()}; },
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
    if (n === 1) setTimeout(function(){ dialog(FIRST); }, 800); else if (n === 5) setTimeout(function(){ dialog(FIVE); }, 800); else if (n === 10) setTimeout(function(){ dialog(TEN()); }, 800); else if (n === 15) setTimeout(function(){ dialog(FIFTEEN); }, 800);
    if (n >= N) setTimeout(function(){ dialog(DONE, cert); }, 800); }

  /* ---------- Urkunde ---------- */
  var ov;
  function cert(){ if (ov) return; ov = document.createElement('div'); ov.className = 'sbcert'; var date = new Date(S.done || Date.now()); var ds = date.toLocaleDateString('de-DE', {day:'numeric', month:'long', year:'numeric'});
    var mono = document.querySelector('header .mark svg'); var mh = mono ? mono.outerHTML.replace('class="mono"', 'class="mono cm"') : '';
    ov.innerHTML = '<div class="sq" role="dialog" aria-label="Urkunde"><button type="button" class="x" aria-label="Schließen">×</button><h2 class="ct">SUCHBILD</h2>' +
      '<p class="cp">Alle ' + N + ' Dinge auf theidealcity.gg gefunden. Eingegraben von Gojira.</p><p class="cp">' + points() + ' Punkte, ' + S.hints + (S.hints === 1 ? ' Hinweis' : ' Hinweise') + (S.visitBonus ? ', ' + S.visitBonus + ' fürs Wiederkommen' : '') + '. ' + ds + '.</p>' +
      '<p class="cp">' + (S.visits || 1) + (S.visits > 1 ? ' Besuche' : ' Besuch') + '.</p><p class="cstamps" aria-label="Stempel je Besuch">' + (S.stamps || [Date.now()]).map(function(t){ return '<span title="' + new Date(t).toLocaleDateString('de-DE') + '"></span>'; }).join('') + '</p>' +
      '<div class="cname"><label>Name <input type="text" maxlength="16" pattern="[A-Za-zÄÖÜäöüß0-9 ]{1,16}" placeholder="bis 16 Zeichen"></label></div>' +
      '<div class="cbtn"><button type="button" class="png">Als Bild speichern</button>' + (BOARD ? '<button type="button" class="send">In die Bestenliste</button>' : '') + '<button type="button" class="again">Neustart</button></div>' +
      '<p class="cnote">' + (BOARD ? 'Die Bestenliste speichert Name, Punkte, Zeit und Datum in einer Google-Tabelle von Josef Knoll (siehe Datenschutz). ' : '') + 'Dein Stand liegt nur in diesem Browser.</p>' + mh + '</div>';
    document.body.appendChild(ov); var sq = ov.querySelector('.sq'); setTimeout(function(){ sp('g-stempel', {vol:.9, max:.5}); }, 400);
    ov.querySelector('.x').addEventListener('click', function(){ ov.remove(); ov = null; });
    ov.querySelector('.again').addEventListener('click', function(){ S = {found:{}, start:0, hints:0, done:0, seed:(Math.random() * 4294967295) >>> 0, visits:S.visits, streak:S.streak, lastVisit:S.lastVisit, stamps:S.stamps, visitBonus:0, introVisit:S.introVisit}; save(); ov.remove(); ov = null; location.reload(); });
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

  function init(){ try { if (!localStorage.getItem('jk_sb')) save(); } catch(e){} counter(); place(); board(); intro(); holes(); ['g-inka', 'g-fund'].forEach(spLoad); document.addEventListener('pointerdown', function(){ ['g-wagner', 'g-xae', 'g-sigma', 'g-gojira', 'g-stempel', 'g-kraehe'].forEach(spLoad); }, {once:true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
