/* SUCHBILD: 20 Gegenstände aus den Suchbild-Scans sind über die Website verteilt (Josef, 27.10., 21:16 bis 23:52).
   Zähler im Kopf (Lupe), Hinweis per Klick (kostet 50 Punkte), Fund: Zoom, Tintenspritzer, Jubel (Formantsynthese nach Marios Dreisprung: Yah, Yippee, Yahoo),
   bei 20: Urkunde (grünes Quadrat, als PNG), Bestenliste (Google Apps Script, nur mit Einwilligung per Klick). Stand nur im Local Storage. */
(function(){
  'use strict';
  if (document.documentElement.classList.contains('ff')) return;   /* Firefox: kein Spiel (Josef, 29.10., 07:43) */
  var PAGE = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  var DEV = !!window.JK_DEV_ON, SBK = DEV ? 'jk_sb_dev' : 'jk_sb'; var BOARD = DEV ? '' : (window.JK_BOARD || '');   /* Dev Tools: eigener Spielstand, nie in die Bestenliste (Josef, 1.11., T47/T48) */
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
            ['#suchbilder .marg', 'Bildende Kunst, Suchbilder, am Rand', 3], ['#weitere figure', 'Bildende Kunst, Weitere Arbeiten', 3], ['#lickitcutit .marg', 'Bildende Kunst, LICK IT CUT IT, am Rand', 3], ['footer .footgrid', 'Bildende Kunst, ganz unten', 3],
            /* Josef, 1.11., 10:23: schwere Dinge auch dort, wo Bild oder Schrift rot ist */
            ['#cowboykaugummi .marg', 'Bildende Kunst, Cowboy Kaugummi, bei den roten Abbildungsnummern', 3], ['#clickclickboom .marg', 'Bildende Kunst, Click Click Boom, am roten Rand', 3], ['#weitere .sertext', 'Bildende Kunst, Weitere Arbeiten, bei der roten Handschrift', 3], ['#egoshooter .serhead', 'Bildende Kunst, Ego Shooter, beim roten Serientitel', 3],
            /* Josef, 1.11., 10:55: auch in der Großansicht der Arbeiten und der Referenzen */
            ['@lb:#w-infreefall2017 a[data-full]', 'Bildende Kunst, LICK IT CUT IT, in der Großansicht von In free fall', 2], ['@lb:#w-ck17 a[data-full]', 'Bildende Kunst, Cowboy Kaugummi, in der Großansicht von UUUH! Godzilla', 2], ['@lb:#w-ccb_model a[data-full]', 'Bildende Kunst, Click Click Boom, in der Großansicht der Stereolithografie', 2], ['@lb:#w-es2013_1 a[data-full]', 'Bildende Kunst, Ego Shooter, in der Großansicht des ersten Blatts', 2],
            ['@lb:#praxis a.reflink', 'Bildende Kunst, Zur Praxis, in der Großansicht der ersten Abbildung am Rand', 3], ['@lb:#clickclickboom a.reflink', 'Bildende Kunst, Click Click Boom, in der Großansicht der ersten Abbildung am Rand', 3], ['@lb:#cowboykaugummi a.reflink', 'Bildende Kunst, Cowboy Kaugummi, in der Großansicht der ersten Abbildung am Rand', 3]],
    comic: [['.pagehead', 'Comic, oben beim Titel', 1], ['#idealcity .textwrap', 'Comic, THE IDEAL CITY, im Text', 1], ['#draugr figure', 'Comic, DRAUGR', 2], ['#prozess figure', 'Comic, Vom Skript zur Seite', 2], ['#draugr .marg', 'Comic, DRAUGR, am Rand', 3], ['footer .footgrid', 'Comic, ganz unten', 3], ['#prozess .marg', 'Comic, Vom Skript zur Seite, am Rand', 3], ['@lb:#w-freya a[data-full]', 'Comic, DRAUGR, in der Großansicht der Figurenstudie Freya', 2], ['@lb:#idealcity a.reflink', 'Comic, THE IDEAL CITY, in der Großansicht der ersten Abbildung am Rand', 3]],
    texte: [['.pagehead', 'Texte, oben beim Titel', 1], ['#texte .textwrap', 'Texte, im Tagebuch', 2], ['#texte .marg', 'Texte, am Rand', 3], ['footer .footgrid', 'Texte, ganz unten', 3]],
    vermittlung: [['.pagehead', 'Vermittlung, oben beim Titel', 1], ['#schule .textwrap', 'Vermittlung, Lehre', 1], ['#pinakothek2025 figure', 'Vermittlung, Alte Pinakothek', 2], ['#beckmann2022 figure', 'Vermittlung, Beckmann', 2], ['#huelshoff2022 figure', 'Vermittlung, Burg Hülshoff', 2], ['#streaming figure', 'Vermittlung, Streaming', 2], ['#princeofwales', 'Vermittlung, Prince of Wales', 2],
                  ['#princeofwales figure', 'Vermittlung, Prince of Wales, bei den Fotos', 3], ['footer .footgrid', 'Vermittlung, ganz unten', 3], ['#pinakothek2025 .marg', 'Vermittlung, Alte Pinakothek, am Rand', 3],
                  ['#beckmann2022 .marg', 'Vermittlung, Beckmann, bei den roten Abbildungsnummern', 3], ['#w-hh_hannah', 'Vermittlung, Burg Hülshoff, im roten Bild', 3], ['#w-beck_m03', 'Vermittlung, Beckmann, im roten Magnetbild', 3], ['#huelshoff2022 .serhead', 'Vermittlung, Burg Hülshoff, beim roten Serientitel', 3], ['@lb:#w-beck_m02 a[data-full]', 'Vermittlung, Beckmann, in der Großansicht eines Magneten', 2], ['@lb:#pinakothek2025 a.reflink', 'Vermittlung, Alte Pinakothek, in der Großansicht der ersten Abbildung am Rand', 3]],
    info: [['.pagehead', 'Info, oben beim Titel', 1], ['.info > div:first-child', 'Info, links im Lebenslauf', 1], ['.info .cvl', 'Info, in der Vita', 2], ['.info .credits', 'Info, bei den Quellen', 3], ['footer .footgrid', 'Info, ganz unten', 3]]
  };
  function rng(seed){ var x = seed >>> 0 || 1; return function(){ x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  function deal(){ var r = rng(S.seed); var out = []; var used = {};
    var ng = Math.min(3, S.ng || 0), usedG = {}; function grpOf(sel){ var m = /^#([a-z0-9]+)/.exec(sel); return m ? m[1] : sel.split(' ')[0]; }
    OBJ.forEach(function(o){ var dd = ng >= 3 ? 3 : Math.min(3, o.d + (ng ? 1 : 0)); var pool = SPOTS[o.p].filter(function(sp){ return sp[2] === dd; }); if (!pool.length) pool = SPOTS[o.p].filter(function(sp){ return sp[2] === o.d; }); if (!pool.length) pool = SPOTS[o.p];
      /* Route: lieber eine Werkgruppe, die auf dieser Seite noch kein Ding hat */ var fresh = pool.filter(function(sp){ return !usedG[o.p + grpOf(sp[0])]; }); if (fresh.length) pool = fresh; var k; var tries = 0; do { k = Math.floor(r() * pool.length); tries++; } while (used[o.p + pool[k][0]] && tries < 20); used[o.p + pool[k][0]] = 1; usedG[o.p + grpOf(pool[k][0])] = 1;
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
  /* Dev Tools Etappe 5 (T10, T11): Objekte bearbeiten, neue Objekte (Pool größer als 20), feste Plätze; nur mit ?dev, bis Claude sie einbaut */
  var OBJFIX = {};
  if (DEV){ try { var DO = JSON.parse(localStorage.getItem('jk_dev_obj') || 'null') || {}; Object.keys(DO.edit || {}).forEach(function(id){ var e = DO.edit[id]; OBJ.forEach(function(o){ if (o.id === id){ if (e.p) o.p = e.p; if (e.d) o.d = +e.d; } }); if (e.name) NAMES[id] = e.name; });
    (DO.add || []).forEach(function(o){ if (!OBJ.some(function(x){ return x.id === o.id; })){ OBJ.push({id:o.id, p:o.p, d:+o.d}); NAMES[o.id] = o.name || o.id; } }); OBJFIX = DO.fix || {}; } catch(e){} }
  PLACES = deal();
  if (OBJ.length > N){ var rp = rng(S.seed ^ 0x5bd1e995), pick = PLACES.map(function(p){ return [rp(), p]; }).sort(function(a, b){ return a[0] - b[0]; }).slice(0, N).map(function(x){ return x[1]; }); PLACES = PLACES.filter(function(p){ return pick.indexOf(p) >= 0; }); }   /* größerer Pool: je Partie werden 20 ausgelost */
  PLACES.forEach(function(p){ var f = OBJFIX[p.id]; if (f && f.p === p.p){ p.sel = f.sel; p.i = f.i; p.x = f.x; p.y = f.y; p.k = f.k || p.k; } });
  /* Besuche (Josef, 29.10., 13:14): neuer Besuch nach 6 Stunden Pause; Bonus 50 je neuer Besuch, +25 je Besuch in Folge (innerhalb 48 Stunden), höchstens 200; Stempel je Besuch auf der Urkunde */
  var NEWV = null;
  (function(){ var now = Date.now(), last = S.lastVisit || 0, gap = now - last;
    if (!last){ S.visits = 1; S.streak = 1; S.visitBonus = 0; S.stamps = [now]; S.lastVisit = now; S.introVisit = 0; NEWV = {n:1, bonus:0, first:true}; save(); return; }
    if (gap > 6 * 3600e3){ S.visits = (S.visits || 1) + 1; S.streak = gap < 48 * 3600e3 ? (S.streak || 1) + 1 : 1; var b = Math.min(CF('game.bonusmax', 200), CF('game.bonus', 50) + CF('game.bonusstep', 25) * (S.streak - 1));
      S.visitBonus = (S.visitBonus || 0) + b; S.stamps = (S.stamps || []).concat([now]).slice(-40); S.lastVisit = now; NEWV = {n:S.visits, bonus:b, streak:S.streak, gap:gap}; save(); }
    else { S.lastVisit = now; save(); } })();
  function optedOut(){ return !!S.optout && S.optout === (S.visits || 1); }   /* "Nicht jetzt": keine Dialoge, keine Dinge bis zum nächsten Besuch; Inka rufen bleibt */
  function notNow(){ S.optout = S.visits || 1; save(); document.querySelectorAll('.sbobj, .sbli').forEach(function(o){ o.remove(); }); }
  function V(){ return S.visits || 1; }
  function quiet(){ var q = false; try { q = !!sessionStorage.getItem('jk_sb_quiet'); } catch(e){} return q || optedOut() || (!!S.psst && S.psst === V()); }   /* Psst: keine ungefragten Fenster bis zum nächsten Besuch; jk_sb_quiet: Prüfläufe ohne Reaktionen */
  function load(){ try { var s = JSON.parse(localStorage.getItem(SBK) || 'null'); if (s && s.found) return s; } catch(e){} return {found:{}, start:0, hints:0, done:0, seed:(Math.random() * 4294967295) >>> 0}; }
  function save(){ if (window.__jkWipe) return; try { localStorage.setItem(SBK, JSON.stringify(S)); } catch(e){} }
  function count(){ return Object.keys(S.found).length; }
  function secs(){ var end = S.done || Date.now(); return S.start ? Math.round((end - S.start) / 1000) : 0; }
  function points(){ return Math.max(0, count() * CF('game.pts', 100) + (S.visitBonus || 0) + (S.questBonus || 0) + (H('bonus') || 0) - S.hints * CF('game.hint', HINT_COST)); }   /* plus Besuchsbonus (29.10., 13:14) */   /* kein Zeitabzug (Josef, 29.10., 13:14) */
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
    sigma:  {name:'TEST SIGMA', col:'#00A651', speed:40, blip:[520, 'sine']},            /* Indie: wackliger Rahmen, langsam, hinter Glas */
    gojira: {name:'GOJIRA', col:'#00A651', speed:150, blip:[60, 'sine']},                /* nur Punkte und ein Beben */
    /* Gäste der Welt (Josef, 1.11.2026) */
    polizei: {name:'NIL-POLIZEI', col:'#5A5A5A', speed:34, blip:[880, 'square']},
    nole: {name:'NOLE', col:'#8A6D3B', speed:62, blip:[240, 'triangle']},
    grind: {name:'GRIND', col:'#8A6D3B', speed:58, blip:[420, 'triangle']},
    griffith: {name:'PRÄSIDENT GRIFFITH', col:'#1F3A93', speed:50, blip:[200, 'square']},
    libido: {name:'AUSSERIRDISCHE LIBIDO', col:'#6B4FA0', speed:40, blip:[660, 'sine']},
    kalmar: {name:'VAMPIRTINTENFISCH', col:'#3F97B8', speed:90, blip:[140, 'sine']},
    haendler: {name:'GESTALT AUS DER U-BAHN', col:'#7A5C2E', speed:44, blip:[340, 'sawtooth']}
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
    if (n && Math.random() < .15) L.push(['inka', pickOne(['Nebenbei: das ganze Portfolio gibt es als PDF, unten in der Fußzeile. Ohne mich drin.', 'Josef schreibt manchmal einen Newsletter. Selten. Der Knopf ist unten. Ich sag das nur einmal.', 'Die Ausstellungen stehen bei Info. Falls du mal rausgehen willst.'])]);
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
            {who:'xae', text:'Damit du nicht komplett lost bist, die Liste der restlichen: ' + left.join(', ') + '. Wo, sage ich nicht. Das wäre ja langweilig. Beeindruckt?',
             ask:[{s:'d', t:'Vier Sekunden. Das ist wirklich beeindruckend.', re:[['xae', '[m:froh]Ich weiß. Danke, dass du es aussprichst. Die wenigsten checken das.']]},
                  {s:'p', t:'Vier Sekunden mit Augmentation. Das zählt nicht.', re:[['xae', '[m:wuetend]Es zählt. Alles zählt, das ist der Punkt. [m:neutral]Deine Zeit zählt übrigens nicht, hat Inka gesagt. Glück gehabt.']]},
                  {s:'a', t:'Dann hilf mir, schneller zu werden.', re:[['xae', 'Schneller wirst du nicht. [m:nachdenklich]Gründlicher vielleicht. Die kleinen Dinge liegen am Rand.']]},
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
  var MOODS = ['neutral', 'froh', 'wuetend', 'ueberrascht', 'traurig', 'nachdenklich', 'verlegen', 'gelangweilt', 'stolz'];
  var MOOD = {neutral:{k:1, pause:1}, froh:{k:.88, pause:.8}, wuetend:{k:.72, pause:.55, fx:'shk', win:'shake'}, ueberrascht:{k:.8, pause:1.3}, traurig:{k:1.35, pause:1.7, stock:.18, win:'thin'}, nachdenklich:{k:1.2, pause:1.5, stock:.12}, verlegen:{k:1.1, pause:1.3, stock:.15}, gelangweilt:{k:1.3, pause:1.2}, stolz:{k:.92, pause:.9}};
  var STANCE = {d:{icon:'◇', name:'diplomatisch'}, p:{icon:'!', name:'provokativ'}, a:{icon:'→', name:'aktiv'}, v:{icon:'…', name:'passiv'}, n:{icon:'?', name:'neugierig'}, l:{icon:'≈', name:'albern'}, e:{icon:'○', name:'ehrlich'}, k:{icon:'≠', name:'kritisch'}};
  /* Vorlieben (13:29): Inka mag aktiv und provokativ; Wagner respektiert provokativ widerwillig, verachtet passiv; X Æ A-13 mag Bewunderung (diplomatisch), hasst Widerspruch (provokativ); Sigma mag sanft (diplomatisch) und passiv, erschrickt bei provokativ */
  var LIKES = {inka:{a:[1, 0], p:[1, 1], d:[0, 0], v:[-1, 0], n:[1, 0], l:[0, 0], e:[1, 0], k:[0, 1]}, wagner:{p:[0, 1], v:[-1, -1], d:[0, 0], a:[0, 1], n:[1, 1], l:[-1, -1], e:[0, 0], k:[0, 1]}, xae:{d:[1, 1], p:[-1, -1], a:[0, 0], v:[0, -1], n:[0, 0], l:[1, 0], e:[0, 0], k:[-1, -1]}, sigma:{d:[1, 0], v:[1, 0], p:[-1, -1], a:[0, 0], n:[0, 0], l:[0, 0], e:[1, 0], k:[-1, 0]}, gojira:{d:[1, 0], p:[0, 0], a:[0, 1], v:[0, 0], n:[0, 0], l:[0, 0], e:[1, 0], k:[0, 0]}};   /* neu (1.11.): n neugierig, l albern, e ehrlich, k kritisch */
  function rel(who){ S.rel = S.rel || {}; return S.rel[who] || (S.rel[who] = {n:0, r:0, dn:0, dr:0}); }
  function relAdd(who, st){ var L = (LIKES[who] || LIKES.inka)[st] || [0, 0], R = rel(who);
    R.dn += L[0]; R.dr += L[1];   /* träge: drei Antworten in dieselbe Richtung ändern eine Stufe */
    if (R.dn >= 3){ R.n = Math.min(5, R.n + 1); R.dn = 0; } if (R.dn <= -3){ R.n = Math.max(-5, R.n - 1); R.dn = 0; }
    if (R.dr >= 3){ R.r = Math.min(5, R.r + 1); R.dr = 0; } if (R.dr <= -3){ R.r = Math.max(-5, R.r - 1); R.dr = 0; }
    S.answers = (S.answers || 0) + 1; save(); }
  function baseMood(who){ var R = rel(who); if (R.r <= -2) return 'wuetend'; if (R.n >= 2) return 'froh'; if (who === 'sigma') return 'nachdenklich'; return 'neutral'; }
  function tspeed(){ var v = S.tspeed || 'normal'; var b = v === 'langsam' ? 1.6 : v === 'sofort' ? 0 : 1; var d = window.JK_DEVSPD; if (d && d.mult){ b = d.mult >= 99 ? 0 : b / d.mult; } return b; }
  /* Stimme: Silben synthetisch, je Figur Grundton, Wellenform und Formant; Stimmung verschiebt Tonhöhe und Verlauf; drei Sätze: schnell, betont, Ende */
  var VOICE = {inka:{f:760, w:'square', q:4, up:1}, wagner:{f:300, w:'square', q:2, up:-1}, xae:{f:1200, w:'triangle', q:8, up:0}, sigma:{f:520, w:'sine', q:3, up:1}, gojira:{f:60, w:'sawtooth', q:1, up:-1}, polizei:{f:880, w:'square', q:6, up:0}, nole:{f:240, w:'triangle', q:2, up:-1}, grind:{f:420, w:'triangle', q:3, up:-1}, griffith:{f:200, w:'square', q:2, up:0}, libido:{f:660, w:'sine', q:5, up:1}, kalmar:{f:140, w:'sine', q:1, up:1}, haendler:{f:340, w:'sawtooth', q:3, up:-1}};
  var MOODV = {neutral:[0, 0], froh:[2, 1], wuetend:[-2, -1], ueberrascht:[4, 1], traurig:[-3, -1], nachdenklich:[-1, 0], verlegen:[1, -1], gelangweilt:[-2, 0], stolz:[1, 1]};
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

  /* Figurenlaute (Josef, 1.11., 10:12: "wie in Breath of the Wild manchmal Character Sounds"): kurze Formant-Ausrufe je Figur und Stimmung, synthetisch */
  var VOXP = {neutral:[['u', .1, 1], ['u', .12, .94]], froh:[['a', .08, 1.12], ['a', .11, 1.25]], wuetend:[['o', .1, .9], ['u', .16, .78]], ueberrascht:[['o', .16, 1.35]], traurig:[['u', .14, 1], ['o', .2, .8]], nachdenklich:[['u', .26, .96]], verlegen:[['e', .07, 1.1], ['e', .1, 1.2]], gelangweilt:[['e', .2, .85]], stolz:[['a', .18, 1.08]]};
  var lastVox = 0;
  /* echte Stimm-Schnipsel (CC0, OpenGameArt; src/build_vox.py), je Figur und Stimmung; ohne Datei die Synthese */
  var VOXF = {inka:'*', sigma:'*', wagner:'*', xae:'*', polizei:'neutral froh wuetend ueberrascht', nole:'neutral froh wuetend', grind:'neutral froh wuetend', griffith:'neutral froh wuetend', libido:'neutral froh wuetend ueberrascht', kalmar:'neutral froh wuetend', haendler:'neutral froh wuetend'};
  var voxBuf = {};
  function voxFile(who, mood){ var m = VOXF[who]; if (!m) return null; if (m !== '*' && m.split(' ').indexOf(mood) < 0) mood = 'neutral'; return who + '-' + mood; }
  function vox(who, mood){ var A = window.JK_AUDIO && window.JK_AUDIO(); if (!A || A.vol === 0) return; var vv = CF('dlg.voxvol', 1); if (vv <= 0) return; var key = voxFile(who, mood); if (!key || who === 'gojira') return voxSynth(who, mood);
    if (Date.now() - lastVox < 1800) return; lastVox = Date.now();
    function play(buf){ var src = A.ac.createBufferSource(); src.buffer = buf; src.playbackRate.value = .97 + Math.random() * .06; var g = A.ac.createGain(); var dvv = window.JK_DEVSNDVOL && window.JK_DEVSNDVOL['vox/' + key]; g.gain.value = .9 * vv * (dvv === undefined ? 1 : dvv); src.connect(g); g.connect(A.bus); src.start(); }
    if (voxBuf[key] && voxBuf[key] !== 1){ play(voxBuf[key]); return; } if (voxBuf[key] === 1) return; voxBuf[key] = 1;
    fetch((window.JK_DEVSND && window.JK_DEVSND['vox/' + key]) || '../assets/game/vox/' + key + '.mp3').then(function(r){ if (!r.ok) throw 0; return r.arrayBuffer(); }).then(function(ab){ return new Promise(function(res, rej){ A.ac.decodeAudioData(ab, res, rej); }); }).then(function(buf){ voxBuf[key] = buf; play(buf); }).catch(function(){ voxBuf[key] = null; lastVox = 0; voxSynth(who, mood); }); }
  function voxSynth(who, mood){ var A = window.JK_AUDIO && window.JK_AUDIO(); if (!A || A.vol === 0) return; var vv = CF('dlg.voxvol', 1); if (vv <= 0) return; if (Date.now() - lastVox < 1800) return; lastVox = Date.now();
    if (who === 'gojira'){ try { rumble(); } catch(e){} return; }
    var V = VOICE[who] || VOICE.inka, pat = VOXP[mood] || VOXP.neutral, ac = A.ac, t0 = ac.currentTime + .01;
    var base = Math.max(90, Math.min(420, V.f * .42)) * Math.pow(2, CF('dlg.pitch.' + who, 0) / 12);
    var src = ac.createOscillator(); src.type = who === 'polizei' ? 'square' : 'sawtooth'; var out = ac.createGain(); out.gain.value = 0;
    var vib = ac.createOscillator(); vib.frequency.value = who === 'sigma' ? 7.5 : 5.5; var vg = ac.createGain(); vg.gain.value = who === 'sigma' ? 10 : 4; vib.connect(vg); vg.connect(src.frequency);
    var fl = [0, 1, 2].map(function(j){ var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = [8, 11, 13][j]; var g = ac.createGain(); g.gain.value = [1, .5, .25][j]; src.connect(bp); bp.connect(g); g.connect(out); return bp; });
    var sh = who === 'xae' ? 1.18 : who === 'wagner' ? .9 : who === 'kalmar' ? .7 : 1;   /* Formantlage je Figur */
    var t = t0; pat.forEach(function(sg, i){ var f = VOW[sg[0]]; fl.forEach(function(bp, j){ bp.frequency.setValueAtTime(f[j] * sh, t); }); src.frequency.setValueAtTime(base * sg[2], t); src.frequency.exponentialRampToValueAtTime(base * sg[2] * (mood === 'ueberrascht' ? 1.3 : mood === 'traurig' ? .85 : 1.03), t + sg[1]);
      out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(.55 * vv, t + .02); out.gain.setValueAtTime(.55 * vv, t + sg[1] - .03); out.gain.linearRampToValueAtTime(0, t + sg[1]); t += sg[1] + .035; });
    var gc = ac.createGain(); gc.gain.value = .32; out.connect(gc); gc.connect(A.bus);
    if (who === 'polizei'){ var n = ac.createOscillator(); n.type = 'square'; n.frequency.value = 2400; var ng = ac.createGain(); ng.gain.setValueAtTime(.02 * vv, t0); ng.gain.exponentialRampToValueAtTime(.001, t0 + .08); n.connect(ng); ng.connect(A.bus); n.start(t0); n.stop(t0 + .1); }
    src.start(t0); vib.start(t0); src.stop(t + .05); vib.stop(t + .05); }
  /* Bestätigen: weiches Zweiklang-Plopp; Ende eines Gesprächs: fallender Ton */
  function advSnd(kind){ var A = window.JK_AUDIO && window.JK_AUDIO(); if (!A || A.vol === 0) return; var ac = A.ac, t = ac.currentTime, o = ac.createOscillator(); o.type = 'triangle';
    var f = kind === 'end' ? [1320, 660] : [990, 1480]; o.frequency.setValueAtTime(f[0], t); o.frequency.setValueAtTime(f[1], t + .045);
    var g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.11 * CF('dlg.advvol', 1), t + .005); g.gain.exponentialRampToValueAtTime(.001, t + (kind === 'end' ? .2 : .12)); o.connect(g); g.connect(A.bus); o.start(t); o.stop(t + .22); }
  function cursorSnd(kind){ var A = window.JK_AUDIO && window.JK_AUDIO(); if (!A || A.vol === 0) return; var ac = A.ac, t = ac.currentTime, o = ac.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(kind === 'ok' ? 880 : 660, t); if (kind === 'ok') o.frequency.setValueAtTime(1320, t + .05);
    var g = ac.createGain(); g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.001, t + (kind === 'ok' ? .12 : .06)); o.connect(g); g.connect(A.bus); o.start(t); o.stop(t + .14); }
  /* Text in Zeichen mit Eigenschaften zerlegen; Steuerzeichen bleiben als Ereignisse an der Stelle */
  function parseLine(text){ var out = [], i = 0, emph = false, link = null;
    while (i < text.length){ var ch = text[i];
      if (ch === '[' ){ var j = text.indexOf(']', i); if (j > 0){ var tag = text.slice(i + 1, j), m;
          if ((m = /^m:(\w+)$/.exec(tag)) && MOOD[m[1]]){ out.push({ev:'mood', v:m[1]}); i = j + 1; continue; }
          if ((m = /^p:([\d.]+)$/.exec(tag))){ out.push({ev:'pause', v:parseFloat(m[1])}); i = j + 1; continue; }
          if (tag === 'cut'){ out.push({ev:'cut'}); i = j + 1; continue; }
          if (tag === '/'){ out.push({ev:'brk'}); i = j + 1; continue; }
          if ((m = /^w:(?:(\w+):)?([\w-]+)\|([^\]]+)$/.exec(tag))){ var lk = {id:m[2], page:m[1] || ''}; Array.prototype.forEach.call(m[3], function(c){ out.push({ch:c, emph:true, link:lk}); }); i = j + 1; continue; } } }
      if (ch === '*' && !(i > 0 && /[A-Za-zÄÖÜäöüß]/.test(text[i - 1]) && /[a-zäöüß]/.test(text[i + 1] || ''))){ emph = !emph; i++; continue; }
      out.push({ch:ch, emph:emph}); i++; }
    return out; }
  /* in Seiten zu höchstens 3 Zeilen umbrechen (Wortgrenzen), Steuerzeichen hängen am folgenden Zeichen */
  function paginate(items, cols, rows){ var pages = [], page = [], line = 0, col = 0, k = 0;
    function wordLen(from){ var n = 0; for (var q = from; q < items.length && items[q].ch !== undefined && items[q].ch !== ' '; q++) n++; return n; }
    while (k < items.length){ var it = items[k];
      if (it.ev === 'brk'){ k++; if (page.length){ pages.push(page); page = []; line = 0; col = 0; } while (k < items.length && items[k].ch === ' ') k++; continue; }   /* dramatischer Umbruch (Josef, 1.11., 10:33) */
      if (it.ev){ page.push(it); k++; continue; }
      if (it.ch === ' '){ if (col === 0){ var lp = null; for (var q = page.length - 1; q >= 0; q--){ if (!page[q].ev){ lp = page[q]; break; } } if (lp && lp.ch !== ' ') page.push(it); k++; continue; } var wl = wordLen(k + 1); if (col + 1 + wl > cols){ line++; col = 0; k++; if (line >= rows){ pages.push(page); page = []; line = 0; } else page.push(it); continue; } }   /* Josef, 1.11.: Leerzeichen am Zeilenumbruch bleiben (der Browser bricht selbst um; sonst kleben Wörter zusammen) */
      if (col === 0 && line === 0 && page.length === 0 && it.ch === ' '){ k++; continue; }
      page.push(it); col++; k++;
      if (col >= cols){ line++; col = 0; if (line >= rows){ pages.push(page); page = []; line = 0; } } }
    if (page.length) pages.push(page); return rebalance(pages, cols, rows); }
  /* Seitenwechsel an Satzgrenzen: endet eine Seite mitten im Satz und liegt das letzte Satzende in der zweiten Hälfte der Seite, wandert der angefangene Satz ins nächste Fenster */
  function rebalance(pages, cols, rows){ if (pages.length < 2 || rows < 2) return pages; var out = []; var carry = [];
    for (var i = 0; i < pages.length; i++){ var lastC = carry.filter(function(x){ return x.ch !== undefined; }).pop(), firstP = pages[i].filter(function(x){ return x.ch !== undefined; })[0]; var pg = carry.concat(lastC && lastC.ch !== ' ' && firstP && firstP.ch !== ' ' ? [{ch:' ', emph:false}] : [], pages[i]); carry = [];   /* am alten Seitenwechsel fehlte das Leerzeichen (Josef, 10:42) */
      if (i < pages.length - 1){ var chars = pg.filter(function(x){ return x.ch !== undefined; }); var last = chars[chars.length - 1];
        if (last && !/[.!?…:]/.test(last.ch)){ var cut = -1; for (var q = pg.length - 2; q > 0; q--){ var c = pg[q]; if (c.ch !== undefined && /[.!?…]/.test(c.ch) && pg[q + 1] && pg[q + 1].ch === ' '){ cut = q; break; } }
          var nChar = 0; for (var r = 0; r <= cut; r++) if (pg[r].ch !== undefined) nChar++;
          var restChars = chars.length - nChar; if (cut > 0 && nChar >= cols * rows * .45 && restChars + pages[i + 1].filter(function(x){ return x.ch !== undefined; }).length <= cols * rows * 1.02){ carry = pg.slice(cut + 2); pg = pg.slice(0, cut + 1); } } }
      out.push(pg); }
    if (carry.length) out.push(carry); return out; }
  function ph(t){ return typeof t === 'string' ? t.replace(/\{(\w+)\}/g, function(m, k){ var v = X.hooks.ph ? X.hooks.ph(k) : (k === 'n' ? String(count()) : k === 'pts' ? String(points()) : k === 'rest' ? String(N - count()) : null); return v === null || v === undefined ? m : v; }) : t; }
  function norm0(l){ if (typeof l === 'string') return {who:'inka', text:l}; if (Array.isArray(l)) return {who:l[0], text:l[1], mood:l[2], ask:l[3]}; return l; }
  function norm(l){ var o = norm0(l); if (o && typeof o.text === 'string' && o.text.indexOf('{') >= 0){ var c = {}; for (var k in o) c[k] = o[k]; c.raw = o.text; c.text = ph(o.text); o = c; } if (o && o.ask && o.ask.some(function(a){ return /\{\w+\}/.test(a.t || ''); })){ var c2 = {}; for (var k2 in o) c2[k2] = o[k2]; c2.ask = o.ask.map(function(a){ var b = {}; for (var k3 in a) b[k3] = a[k3]; b.t = ph(a.t); return b; }); o = c2; } return o; }
  var lastDlg = 0, injectFn = null, snapFn = null, closeCur = null, dlgSoft = false;   /* dlgSoft: kurzer ungefragter Kommentar, darf von einer Reaktion ersetzt werden (Josef, 12.11.2026) */
  /* Josef, 1.11., 17:49: ein offener Dialog bleibt beim Seitenwechsel stehen und läuft auf der neuen Seite weiter */
  window.addEventListener('pagehide', function(){ try { if (snapFn) sessionStorage.setItem('jk_dlg_resume', JSON.stringify(snapFn())); else sessionStorage.removeItem('jk_dlg_resume'); } catch(e){} });
  window.addEventListener('pageshow', function(e){ if (e.persisted) try { sessionStorage.removeItem('jk_dlg_resume'); } catch(x){} });
  function resumeDlg(){ var R = null; try { R = JSON.parse(sessionStorage.getItem('jk_dlg_resume') || 'null'); sessionStorage.removeItem('jk_dlg_resume'); } catch(e){} var seen0 = false; try { seen0 = !!sessionStorage.getItem('jk_sb_seen'); } catch(e){} if (!seen0 || optedOut() || !R || !R.lines || !R.lines.length || Date.now() - R.t > 120000) return false;   /* Modem und Intro haben Vorrang */ try { var nv = performance.getEntriesByType('navigation')[0]; if (nv && nv.type === 'reload') return false; } catch(e){}   /* nur beim Seitenwechsel, nicht beim Neuladen */ dialog(R.lines, null, {psst:R.psst, resume:R.page || 0, resumed:1}); return true; }
  /* Sprites: veröffentlichte Extras (px/manifest.json) und lokale Dev-Sprites (window.JK_DEVSPR, nur mit ?dev) */
  var MANI = {};
  function SPRHAS(p){ return !!(window.JK_DEVSPR && window.JK_DEVSPR[p]); }
  function SPR(p){ return SPRHAS(p) ? window.JK_DEVSPR[p] : '../assets/game/' + p; }
  function ANIM(k){ var d = window.JK_DEVANIM && window.JK_DEVANIM[k]; return d || (MANI.anim || {})[k] || null; }
  try { fetch('../assets/game/px/manifest.json').then(function(r){ return r.ok ? r.json() : {}; }).then(function(m){ MANI = m || {}; }).catch(function(){}); } catch(e){}
  function devKey(t){ t = String(t || '').replace(/\[[^\]]*\]|\*/g, '').replace(/\s+/g, ' ').trim().slice(0, 80); var h = 0; for (var i = 0; i < t.length; i++){ h = (h * 31 + t.charCodeAt(i)) | 0; } return (h >>> 0).toString(36); }   /* Dev Tools: Statistik je Zeile */
  var MMNAME = {inka:'Inka', wagner:'Wagner', xae:'X', sigma:'Sigma', gojira:'Gojira', polizei:'Nil-Polizei', nole:'Nole', grind:'Grind', griffith:'Griffith', libido:'Libido', kalmar:'Kalmar', haendler:'Gestalt'};
  var MMCOL = {inka:'#5FB8DA', wagner:'#FF5446', xae:'#FFFFFF', sigma:'#2BD27A', gojira:'#2BD27A', polizei:'#B4B4B4', nole:'#D2AA64', grind:'#D2AA64', griffith:'#7C98F0', libido:'#B49BE6', kalmar:'#5FB8DA', haendler:'#D2A05A'};   /* Figurenfarben, auf dunklem Grund lesbar */
  function dialog(lines, done, opt){ opt = opt || {}; if (window.JK_DEVLOG && lines && lines[0]){ var l0 = norm0(lines[0]); window.JK_DEVLOG('dialog', (dlg ? 'angehängt, ' : '') + l0.who + ': ' + String(l0.text || '').slice(0, 80)); } if (dlg){ dq = (dq || []).concat(lines); return; } dq = []; lastDlg = Date.now();
    lines = lines.map(norm); dlgSoft = !!opt.psst && !opt.resumed && lines.length <= 2 && !lines.some(function(l){ return l && l.ask; }); var t0 = Date.now(), k = 0, pageIdx = 0, pages = [], typing = false, raf = null, answered = 0, cur, curMood = 'neutral', pending = null;
    dlg = document.createElement('div'); dlg.className = 'sbdlg mm'; dlg.setAttribute('role', 'dialog');
    /* Mega Man X (Josef, 1.11.2026, 16:00): dunkle Box, Pixelschrift, Name vorne in der Figurenfarbe, Porträt außen */
    dlg.innerHTML = '<span class="vh dlglive" aria-live="polite"></span><div class="win"><b class="who vh"></b><img alt=""><div class="txt"><p></p><i class="more" aria-hidden="true">▼</i></div></div>';
    document.body.appendChild(dlg); document.body.classList.add('sbdlgon'); var p = dlg.querySelector('p'), more = dlg.querySelector('.more'), who = dlg.querySelector('.who'), img = dlg.querySelector('img'), win = dlg.querySelector('.win'), live = dlg.querySelector('.dlglive');
    /* Josef, 29.10., 13:34: "Psst" in ungefragten Fenstern (keine ungefragten Fenster mehr bis zum nächsten Besuch), "Nicht jetzt" im ersten Fenster (wie im Modem) */
    /* Josef, 12.11.2026: Psst-Knopf in den Nachrichten weggelassen */ if (false && opt.psst){ var pb = document.createElement('button'); pb.type = 'button'; pb.className = 'psst'; pb.textContent = 'Psst'; pb.title = 'Keine ungefragten Fenster mehr bis zum nächsten Besuch'; pb.addEventListener('click', function(e){ e.stopPropagation(); S.psst = S.visits || 1; save(); H('onPsst'); cursorSnd('ok'); close(false); }); win.appendChild(pb); }
    if (opt.notnow){ var nb = document.createElement('button'); nb.type = 'button'; nb.className = 'psst notnow'; nb.textContent = 'Nicht jetzt'; nb.addEventListener('click', function(e){ e.stopPropagation(); close(false); notNow(); }); win.appendChild(nb); }
    var pAnim = null, pBase = '', blinkAt = 0;
    function portrait(w, mood){ var mo2 = mood || 'neutral', main = /^(inka|wagner|xae|sigma|gojira)$/.test(w), gm = (MANI.guests || {})[w];
      if (!main && !gm && !SPRHAS('px/char-' + w + '-neutral.png')){ img.removeAttribute('src'); img.style.visibility = 'hidden'; dlg.classList.add('noimg'); pAnim = null; return; }   /* Gäste ohne Porträt: keine 404-Anfragen */
      if (!main && gm && gm.indexOf(mo2) < 0 && !SPRHAS('px/char-' + w + '-' + mo2 + '.png')) mo2 = 'neutral';
      dlg.classList.remove('noimg'); img.style.visibility = ''; img.onerror = function(){ img.onerror = function(){ img.onerror = null; img.style.visibility = 'hidden'; if (dlg) dlg.classList.add('noimg'); }; img.src = SPR('px/char-' + w + '.png'); };
      pBase = 'px/char-' + w + '-' + mo2; img.src = SPR(pBase + '.png'); pAnim = ANIM(w + '-' + mo2); blinkAt = Date.now() + 2500 + Math.random() * 3000; }
    /* Sprechen und Blinzeln (Josef, 1.11., T8): Bilder px/char-<figur>-<stimmung>-t1.png ... -b1.png, Anzahl in px/manifest.json */
    var animT = setInterval(function(){ if (!dlg){ clearInterval(animT); return; } if (!pAnim || document.hidden) return; var now = Date.now();
      if (typing && pAnim.talk){ var f = Math.floor(now / 120) % (pAnim.talk + 1); img.src = SPR(pBase + (f ? '-t' + f : '') + '.png'); return; }
      if (pAnim.blink && now >= blinkAt){ var bf = Math.floor((now - blinkAt) / 90) + 1; if (bf <= pAnim.blink){ img.src = SPR(pBase + '-b' + bf + '.png'); return; } blinkAt = now + 2500 + Math.random() * 3500; }
      var base = SPR(pBase + '.png'); if (img.getAttribute('src') !== base) img.src = base; }, 60);
    function setMood(m){ curMood = m; MOODS.forEach(function(x){ dlg.classList.remove('m-' + x); }); dlg.classList.add('m-' + m); portrait(lines[k].who, m); }
    function startLine(){ var L = lines[k]; cur = CH[L.who] || CH.inka; var pw = k > 0 && lines[k - 1] ? lines[k - 1].who : null; if (pw && pw !== L.who) side = side === 'r' ? 'l' : 'r'; dlg.className = 'sbdlg mm c-' + L.who + (Date.now() - t0 < 300 ? ' opening' : '') + (CF('dlg.font', 0) ? ' f' + CF('dlg.font', 0) : ''); dlg.setAttribute('aria-label', cur.name); who.textContent = cur.name; dlg.style.setProperty('--c', cur.col); dlg.style.setProperty('--c2', MMCOL[L.who] || cur.col); placeDlg(); if (DEV){ window.__jkCurLine = {who:L.who, text:L.raw || L.text, mood:L.mood || ''}; try { var sk = 'jk_dev_seen', sn = JSON.parse(localStorage.getItem(sk) || '{}'), hk = devKey(L.raw || L.text); sn[hk] = (sn[hk] || 0) + 1; localStorage.setItem(sk, JSON.stringify(sn)); } catch(e){} }
      var m0 = L.mood || baseMood(L.who); if (L.who === 'gojira') m0 = 'neutral'; setMood(m0);
      var prevW = k > 0 && lines[k - 1] ? lines[k - 1].who : null; if ((k === 0 && !opt.resume) || (prevW !== L.who && Math.random() < .6) || (m0 !== 'neutral' && Math.random() < .45)) setTimeout(function(){ vox(L.who, m0); }, 60);
      var cols = measureCols(), rows = Math.round(CF('dlg.lines', 3)); if (L.who === 'gojira'){ cols = Math.max(8, Math.floor(cols / 2)); rows = 1; }
      var nm = Array.prototype.map.call((MMNAME[L.who] || cur.name) + ':', function(c){ return {ch:c, nm:true}; }).concat([{ch:' ', nm:true}]);
      pages = paginate(L.who === 'gojira' ? parseLine(L.text) : nm.concat(parseLine(L.text)), cols, rows); if (!pages.length) pages = [[]]; pageIdx = 0;
      live.textContent = cur.name + ': ' + L.text.replace(/\[[^\]]*\]|\*/g, '');
      if (L.who === 'gojira' && k === 0) rumble(); if (L.who === 'inka' && k === 0 && lines.length > 1) sp('g-kraehe', {vol:.5, max:.3});
      showPage(); }
    /* Zeichen je Zeile aus der echten Breite (Pixelschrift ist proportional; etwas Luft) */
    function measureCols(){ var mx = Math.round(CF('dlg.chars', 40)); var w = p.clientWidth; if (!w) return mx; var t = document.createElement('span'); t.className = 'ch'; t.style.cssText = 'position:absolute;visibility:hidden;white-space:pre'; t.textContent = 'Der Plotter schreibt langsam, Inka sieht'; p.appendChild(t); var cw = t.getBoundingClientRect().width / t.textContent.length; t.remove(); if (!cw) return mx; return Math.max(14, Math.min(mx, Math.floor(w / cw) - 1)); }
    /* Lage: breite Bildschirme rechts im freien Rand hinter den Marginalien, sonst links und rechts im Wechsel je Sprecher*in */
    function placeDlg(){ var vw = window.innerWidth, gut = false; if (vw > 900){ var right = 0, vh = window.innerHeight; document.querySelectorAll('main p, main h2, main h3, main figure, main aside, main ul, main ol, main .marg, main .sbmarg, main table').forEach(function(e){ var r = e.getBoundingClientRect(); if (r.width && r.bottom > vh * .45 && r.top < vh && r.right > right) right = r.right; }); var ww = win.offsetWidth || 620; if (vw - right >= ww + 28 + 72) gut = true; }
      dlg.classList.toggle('gut', gut); dlg.classList.toggle('sd-l', !gut && side === 'l'); dlg.classList.toggle('sd-r', gut || side !== 'l'); }
    function delayFor(it, next, L){ var ms = CF('dlg.ms.' + L.who, cur.speed) * (MOOD[curMood] || MOOD.neutral).k * tspeed(); if (it.emph) ms *= 2;
      var ch = it.ch, pz = (MOOD[curMood] || MOOD.neutral).pause * tspeed(), add = 0;
      if (ch === ',' || ch === ';' || ch === ':') add = CF('dlg.p.comma', .15); else if (ch === '.' && !(next && next.ch === '.')) add = CF('dlg.p.stop', .35); else if (ch === '!' || ch === '?') add = CF('dlg.p.excl', .3);
      if (ch === '.' && next && next.ch === '.') add = 0; if (ch === '.' && items3dots(it)) add = CF('dlg.p.dots', .6);
      if (ch === ' ' && (MOOD[curMood] || {}).stock && Math.random() < MOOD[curMood].stock) add += .12 + Math.random() * .2;   /* Stocken */
      return ms + add * 1000 * pz; }
    function items3dots(it){ return it._dots; }
    function showPage(){ var items = pages[pageIdx]; pageT0 = performance.now(); p.innerHTML = ''; more.style.visibility = 'hidden'; typing = true; if (raf) cancelAnimationFrame(raf); dlg.classList.remove('cut');
      /* drei Punkte markieren */ for (var q = 0; q < items.length; q++){ if (items[q].ch === '.' && items[q + 1] && items[q + 1].ch === '.' && items[q + 2] && items[q + 2].ch === '.'){ items[q + 2]._dots = true; } }
      var spans = [], curLink = null, linkEl = null, wordEl = null; items.forEach(function(it){ if (it.ev) return; var el;
        /* Josef, 1.11., 09:01: Wörter nie mitten im Wort umbrechen; jedes Wort liegt in einer nicht umbrechenden Klammer, Leerzeichen dazwischen */
        var host; if (it.link){ if (!linkEl || curLink !== it.link){ linkEl = document.createElement('a'); linkEl.className = 'wl'; linkEl.href = (document.getElementById('w-' + it.link.id) ? '' : (it.link.page || 'kunst') + '.html') + '#w-' + it.link.id; linkEl.addEventListener('click', function(e){ e.stopPropagation(); }); p.appendChild(linkEl); curLink = it.link; wordEl = null; } host = linkEl; }
        else { if (curLink){ wordEl = null; } curLink = null; host = p; }
        el = document.createElement('span');
        if (it.ch === ' '){ wordEl = null; host.appendChild(el); }
        else { if (!wordEl || wordEl.parentNode !== host){ wordEl = document.createElement('span'); wordEl.className = 'wd'; host.appendChild(wordEl); } wordEl.appendChild(el); }
        el.textContent = it.ch; el.className = 'ch' + (it.nm ? ' nm' : '') + (it.ch === ' ' ? ' sp' : '') + (it.emph ? ' emph' : '') + ((MOOD[curMood] || {}).fx ? ' ' + MOOD[curMood].fx : '') + (lines[k].who === 'sigma' ? ' wav' : ''); el.style.visibility = it.nm ? '' : 'hidden'; el.style.animationDelay = (spans.length * 37 % 400) + 'ms'; spans.push(el); });
      var L = lines[k], i = 0, si = 0, due = performance.now(), fin = false, nvis = 0;
      var hidden = document.hidden;
      function finish(){ if (fin) return; fin = true; typing = false; spans.forEach(function(s){ s.style.visibility = ''; }); if (!dlg) return;
        var txt = items.map(function(x){ return x.ch || ''; }).join(''); if (pageIdx === pages.length - 1) endSyl(L.who, curMood, txt);
        if (pageIdx === pages.length - 1 && L.ask && answered < 2 && !pending){ askAnswers(L); autoArm(CF('dlg.askwait', 25) * 1000, true); } else { more.style.visibility = 'visible'; autoArm(readMs(items) + (pageIdx === pages.length - 1 && k === lines.length - 1 && !(dq && dq.length) ? CF('dlg.endwait', 2000) : 0)); } }
      function step(now){ if (fin || !dlg) return; if ((window.JK_DEVSPD && window.JK_DEVSPD.pause) || window.JK_PAUSE){ due = Math.max(due, now + 60); raf = requestAnimationFrame(step); return; } if (tspeed() === 0 && !/^\s*\.\.\.\s*$/.test(L.text)){ /* sofort: ganze Seite, Schweigen-Seiten behalten ihr Tempo */ while (i < items.length){ var it0 = items[i++]; if (it0.ev && it0.ev === 'mood') setMood(it0.v); } finish(); return; }
        if (now < due){ raf = requestAnimationFrame(step); return; }
        while (i < items.length && (items[i].ev || items[i].nm)){ var ev = items[i++]; if (ev.nm){ si++; continue; } if (ev.ev === 'mood') setMood(ev.v); else if (ev.ev === 'pause') due = now + ev.v * 1000 * tspeed(); else if (ev.ev === 'cut'){ dlg.classList.add('cut'); i = items.length; } }
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
    function choose(a){ if (!pending) return; var L = pending; pending = null; answered++; cursorSnd('ok'); relAdd(L.who, a.s); H('onAnswer', a, L.who); if (a.fn) try { a.fn(); } catch(x){} var box = dlg.querySelector('.answers'); if (box) box.remove();
      var re = (a.re || []).map(norm); if (!re.length) re = [{who:L.who, text:'...'}];
      lines.splice(k + 1, 0, ...re); next(); }
    /* Josef, 1.11., 17:49: während geschrieben wird, wird schon gelesen. Lesezeit zählt ab Beginn des Schreibens und ist für alle Figuren gleich (unabhängig vom Schreibtempo); nach dem Schreiben mindestens kurz stehen */
    var pageT0 = 0;
    function readMs(items){ var n = items.filter(function(x){ return x.ch !== undefined && !x.nm; }).length; var d = window.JK_DEVSPD, m = d && d.mult ? Math.min(d.mult, 20) : 1; var left = n * CF('dlg.automs', 85) / m - (performance.now() - pageT0); return Math.max(CF('dlg.autominms', 1500) / m, left); }
    var autoT = null; function autoArm(ms, isAsk){ clearTimeout(autoT); autoT = setTimeout(function(){ if (!dlg) return; if ((window.JK_DEVSPD && window.JK_DEVSPD.pause) || window.JK_PAUSE){ autoArm(400, isAsk); return; } if (isAsk){ if (pending){ pending = null; close(false); } return; } if (!document.hidden) next(); else autoArm(1500); }, ms); }
    function next(e){ clearTimeout(autoT); if (e){ e.preventDefault(); e.stopPropagation(); } if (pending) return;
      if (typing){ if (raf) cancelAnimationFrame(raf); typing = false; var items = pages[pageIdx]; items.forEach(function(it){ if (it.ev === 'mood') setMood(it.v); }); p.querySelectorAll('.ch').forEach(function(s){ s.style.visibility = ''; });
        var L = lines[k]; if (pageIdx === pages.length - 1 && L.ask && answered < 2){ if (!pending){ askAnswers(L); autoArm(CF('dlg.askwait', 25) * 1000, true); } return; } more.style.visibility = 'visible'; cursorSnd('mv'); autoArm(readMs(items) + (pageIdx === pages.length - 1 && k === lines.length - 1 && !(dq && dq.length) ? CF('dlg.endwait', 2000) : 0)); return; }   /* Josef, 1.11., 16:00: nach dem Überspringen schloss der Dialog nicht mehr von allein */
      if (pageIdx < pages.length - 1){ pageIdx++; advSnd('next'); showPage(); return; }
      k++; advSnd(k >= lines.length && !dq.length ? 'end' : 'next'); if (k >= lines.length){ if (dq.length){ lines = lines.concat(dq.map(norm)); dq = []; startLine(); return; } close(true); return; } startLine(); }
    function close(nat){ clearTimeout(autoT); if (!dlg) return; lastDlg = Date.now();   /* Abstände zählen ab dem Ende eines Dialogs (keine Reaktion direkt nach einem langen Gespräch) */ if (raf) cancelAnimationFrame(raf); document.removeEventListener('keydown', onkey); document.body.classList.remove('sbdlgon'); dlg.classList.add('off'); var d = dlg; dlg = null; dlgSoft = false; injectFn = null; snapFn = null; closeCur = null; setTimeout(function(){ d.remove(); }, 300); if (done) done(nat === true); }
    snapFn = function(){ var rest = lines.slice(k).concat(dq || []); return {t:Date.now(), lines:rest.map(function(l){ var o = {}; for (var q in l) if (q !== 'raw' && typeof l[q] !== 'function') o[q] = l[q]; if (o.ask) o.ask = o.ask.map(function(a){ var b = {}; for (var q2 in a) if (typeof a[q2] !== 'function') b[q2] = a[q2]; return b; }); return o; }), page:pageIdx, psst:!!opt.psst}; };
    closeCur = function(){ close(false); };
    var side = 'r'; injectFn = function(line){ if (!dlg) return false; lines.splice(k + 1, 0, norm(line)); if (!typing && !pending && pageIdx === pages.length - 1) { clearTimeout(autoT); autoArm(600); } return true; };
    function onkey(e){ if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (pending){ var bs = [].slice.call(dlg.querySelectorAll('.ans')); var cur_ = bs.indexOf(document.activeElement);
        if (/^[1-6]$/.test(e.key) && bs[+e.key - 1]){ e.preventDefault(); bs[+e.key - 1].click(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight'){ e.preventDefault(); bs[(cur_ + 1 + bs.length) % bs.length].focus(); cursorSnd('mv'); return; }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft'){ e.preventDefault(); bs[(cur_ - 1 + bs.length) % bs.length].focus(); cursorSnd('mv'); return; }
        if (e.key === 'Escape'){ close(); } return; }
      var ae = document.activeElement, free = !ae || ae === document.body || ae === document.documentElement;
      var inForm = ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
      if (e.key === 'Escape') close(); else if (dlg && ((e.key === 'Enter' && !inForm) || (e.key === ' ' && dlg.contains(ae)))) next(e); }   /* Enter blättert, wenn nichts anderes den Fokus hat; Leertaste nur im Dialog (sonst scrollt sie die Seite) */
    dlg.addEventListener('click', function(e){ if (e.target.closest('.answers')) return; next(e); }); document.addEventListener('keydown', onkey);
    /* Josef, 1.11., 10:50: Dialoge blockieren die Seite nicht; ohne Klick geht es von allein weiter, am Ende verschwindet das Fenster von selbst */
    document.addEventListener('visibilitychange', function vis(){ if (!dlg){ document.removeEventListener('visibilitychange', vis); return; } });
    startLine(); if (opt.resume && pages.length > opt.resume){ pageIdx = opt.resume; showPage(); } }
  var dq = [];
  /* Josef, 28.10., 01:54: Inka kommt einmal pro Besuch von selbst, mit verschiedenen Ansprachen je Spielstand (mehrere je Stand, zufällig) */
  function pickOne(a){ return a[Math.floor(Math.random() * a.length)]; }
  function greet(){ var L0 = greet0(); var ex = (L0 !== RULES && H('greetExtra')) || []; return L0.concat(ex); }
  function greet0(){ var n = count(); var left = PLACES.filter(function(p){ return !S.found[p.id]; }); var here = left.filter(function(p){ return p.p === PAGE; }).length;
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
    mo.innerHTML = '<div class="box"><div class="mava" aria-hidden="true"><img src="' + SPR('char-inka.png') + '" alt=""><img class="g2" src="' + SPR('char-inka.png') + '" alt=""><i></i></div><div class="mterm"><pre aria-live="polite"></pre><div class="bar"><i></i></div><button type="button" class="mskip">Überspringen</button><button type="button" class="notnow">Nicht jetzt</button></div></div>';   /* Josef, 1.11., 10:19: kein Hinweistext mehr, stattdessen Inkas Avatar verzerrt und flimmernd */
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
    dialog(lines, function(nat){ if (newChapter(nat)) return; if (nat) offerQuest(); }, {notnow:lines === RULES}); }
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
    fab.innerHTML = '<button type="button" class="sbfabbtn" aria-haspopup="true" aria-expanded="false" aria-controls="sbmenu" aria-label="Suchbild: Inka, Inventar, Logbuch" title="Suchbild"><img src="' + SPR('char-inka.png') + '" alt=""><b class="sbnum">' + count() + '</b></button>' +
      '<div class="sbmenu" id="sbmenu" hidden><button type="button" class="sbcall">Inka rufen</button><button type="button" class="sbcount">Inventar <span>' + count() + '/' + N + '</span></button><button type="button" class="sblogbtn">Logbuch</button><button type="button" class="sbrestart">Neu starten</button></div>';
    document.body.appendChild(fab); btn = fab.querySelector('.sbfabbtn'); num = fab.querySelector('.sbnum'); menu = fab.querySelector('.sbmenu');
    function openMenu(o){ menu.hidden = !o; btn.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o){ cursorSnd('mv'); menu.querySelector('button').focus(); } }
    btn.addEventListener('click', function(e){ e.stopPropagation(); openMenu(menu.hidden); });
    document.addEventListener('click', function(e){ if (!menu.hidden && !e.target.closest('.sbfab')) openMenu(false); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !menu.hidden){ openMenu(false); btn.focus(); } });
    /* Josef, 28.10., 01:10: "Inka rufen" startet oder setzt fort; nach "Nicht jetzt" legt es die Dinge wieder aus */
    fab.querySelector('.sbcall').addEventListener('click', function callInka(){ openMenu(false); if (dlg){ if (closeCur) closeCur(); setTimeout(callInka, 380); return; }   /* eine laufende kurze Box weicht, Inka kommt trotzdem (Josef: Seite bleibt bedienbar) */ if (optedOut()){ S.optout = 0; save(); place(); } sp('g-kraehe', {vol:.5, max:.3}); try { sessionStorage.setItem('jk_sb_seen', '1'); localStorage.setItem('jk_sb_intro', '1'); } catch(e){} dialog(greet(), function(nat){ if (S.done) cert(); else if (!newChapter(nat) && !invCheck(false) && nat) offerQuest(); }); });
    fab.querySelector('.sbcount').addEventListener('click', function(){ openMenu(false); inventory(); });
    fab.querySelector('.sblogbtn').addEventListener('click', function(){ openMenu(false); logbook(); });
    /* Josef, 1.11., 10:32: Spiel neu starten; vorher fragen, ob wirklich alle Daten gelöscht werden; danach Startseite */
    fab.querySelector('.sbrestart').addEventListener('click', function(){ openMenu(false); if (dlg) return; dialog([{who:'inka', mood:'ueberrascht', text:'Neu anfangen? Dann vergesse ich alles: Funde, Punkte, Antworten, Abzeichen, Begegnungen, deine Einstellungen. *Wirklich alle Daten löschen?*', ask:[{s:'a', t:'Ja, wirklich alle Daten löschen', fn:wipeAll, re:[['inka', '[m:traurig]Gut. [p:.4]Bis gleich, wer auch immer du dann bist.']]}, {s:'v', t:'Nein, lieber nicht', re:[['inka', '[m:froh]Dachte ich mir. Alles bleibt, wie es ist.']]}]}], function(){ if (window.__jkWipe) location.href = 'index.html'; }); }); }
  function wipeAll(){ try { Object.keys(localStorage).forEach(function(k){ if (/^jk_/.test(k) && !/^jk_(dev|regler)/.test(k)) localStorage.removeItem(k); }); Object.keys(sessionStorage).forEach(function(k){ if (/^jk_/.test(k)) sessionStorage.removeItem(k); }); } catch(e){} window.__jkWipe = 1; }
  function refresh(){ if (num) num.textContent = count(); var c = fab && fab.querySelector('.sbcount span'); if (c) c.textContent = count() + '/' + N; if (panel && panel.classList.contains('sbinv')) inventory(true); }
  function closePanel(){ if (!panel) return; document.removeEventListener('keydown', panelKey); var pn = panel; panel = null; if (pn.classList.contains('mmenu')){ document.removeEventListener('keydown', mmKey, true); pauseOff(); MMS.comb = null; setTimeout(mmAfter, 50); } pn.classList.add('off'); setTimeout(function(){ pn.remove(); }, 250); if (btn) btn.focus(); }
  function panelKey(e){ if (e.key === 'Escape'){ e.stopPropagation(); closePanel(); } }
  function openPanel(cls, label, html){ if (panel) { var old = panel; panel = null; old.remove(); }
    panel = document.createElement('div'); panel.className = 'sbpanel ' + cls; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', label);
    panel.innerHTML = '<div class="sbpin"><button type="button" class="x" aria-label="Schließen">×</button><h2>' + label + '</h2>' + html + '</div>';
    document.body.appendChild(panel); panel.querySelector('.x').addEventListener('click', closePanel); panel.addEventListener('click', function(e){ if (e.target === panel) closePanel(); });
    document.addEventListener('keydown', panelKey); cursorSnd('ok'); var f = panel.querySelector('.sbpin button:not(.x), .sbpin input, .sbpin a'); (f || panel.querySelector('.x')).focus(); return panel; }
  /* ---------- Inventar als Mega-Man-X-Waffenmenü mit Kombinieren und Wagners Labor (Josef, 1.11.2026, Fragen R1 bis R10 und I1 bis I20) ---------- */
  var INV = null, INVP = null, RECIPES = {}, ICONC = {};
  function inventory(refreshOnly){ if (refreshOnly){ if (panel && panel.classList.contains('mmenu') && mmSig() !== MMS.sig) mmRender(); return; } pmenu('dinge'); }
  /* Neu zeichnen nur, wenn sich am Gezeigten etwas ändert (sonst verschwindet die Zeile unter dem Finger, z. B. wenn Verhaltenspunkte vergeben werden) */
  function mmSig(){ return [MMS.tab, MMS.sel, MMS.comb, count(), S.done ? 1 : 0, S.invIntro ? 1 : 0, S.labIntro ? 1 : 0, S.lab ? 1 : 0, Object.keys(crafted()).join(','), Object.keys(S.used || {}).join(','), Object.keys(S.gifted || {}).join(','), Object.keys(S.ruins || {}).join(','), MMS.tab === 'dinge' || MMS.tab === 'labor' ? '' : Date.now()].join('|'); }
  function invLoad(){ if (INVP) return INVP; INVP = fetch('../assets/game/inv.json').then(function(r){ return r.ok ? r.json() : {}; }).catch(function(){ return {}; }).then(function(d){ INV = d || {}; invTools(); return INV; }); return INVP; }
  function invTools(){ RECIPES = INV.recipes || {}; Object.keys(RECIPES).forEach(function(k){ var r = RECIPES[k], ab = k.split('+'); r.a = ab[0]; r.b = ab[1]; NAMES[r.id] = r.name;
      if (r.kind === 'tool'){ var t1 = TOOLS[ab[0]] || {}, t2 = TOOLS[ab[1]] || {}, tt = (INV.tools || {})[r.id] || {}; TOOLS[r.id] = {n:tt.n || r.name, fx:t1.fx, fx2:t2.fx, big:1, snd:t1.snd || t2.snd, line:tt.line}; } }); }
  function recipeById(id){ for (var k in RECIPES) if (RECIPES[k].id === id) return RECIPES[k]; return null; }
  function pairKey(a, b){ return [a, b].sort().join('+'); }
  function crafted(){ return (S.crafted = S.crafted || {}); }
  function clean(t){ return String(t || '').replace(/\[[^\]]*\]/g, '').replace(/(^|[^A-Za-zÄÖÜäöüß])\*([^*]+)\*/g, '$1$2').replace(/\s+/g, ' ').trim(); }
  function fmtT(t){ if (!t || t < 1e11) return ''; var d = new Date(t); return d.getDate() + '.' + (d.getMonth() + 1) + '., ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2) + ' Uhr'; }
  /* Pixel-Icons: px/obj-<id>.png (src/build_px.py); kombinierte Dinge werden aus beiden Zutaten zusammengesetzt */
  function icon(id){ var r = recipeById(id); if (!r) return SPR('px/obj-' + id + '.png'); if (ICONC[id]) return ICONC[id]; if (ICONC[id] === '') return '';
    ICONC[id] = ''; Promise.all([r.a, r.b].map(function(x){ return new Promise(function(res){ var im = new Image(); im.onload = function(){ res(im); }; im.onerror = function(){ res(null); }; im.src = SPR('px/obj-' + x + '.png'); }); })).then(function(ims){ var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d'); g.imageSmoothingEnabled = false; if (ims[0]) g.drawImage(ims[0], 0, 0, 22, 22); if (ims[1]) g.drawImage(ims[1], 10, 10, 22, 22); ICONC[id] = c.toDataURL(); document.querySelectorAll('img[data-icon="' + id + '"]').forEach(function(e){ e.src = ICONC[id]; }); });
    return ''; }
  function iconImg(id, cls){ var src = icon(id); return '<img data-icon="' + id + '"' + (src ? ' src="' + src + '"' : '') + ' alt=""' + (cls ? ' class="' + cls + '"' : '') + '>'; }
  /* Pause: solange das Menü offen ist, stehen Spielzeit, Dialoge, Plotter und Wandern */
  var pauseT = 0;
  function pauseOn(){ if (window.JK_PAUSE) return; window.JK_PAUSE = 1; pauseT = Date.now(); document.documentElement.classList.add('sbpaused'); }
  function pauseOff(){ if (!window.JK_PAUSE) return; window.JK_PAUSE = 0; document.documentElement.classList.remove('sbpaused'); if (S.start && !S.done){ S.start += Date.now() - pauseT; save(); } }
  var MMTABS = [['dinge', 'DINGE'], ['album', 'ALBUM'], ['abzeichen', 'ABZEICHEN'], ['logbuch', 'LOGBUCH'], ['tausch', 'TAUSCH'], ['labor', 'LABOR']];
  var MMS = {tab:'dinge', sel:0, comb:null, msg:null, tut:false, after:null};
  function tabsVisible(){ return MMTABS.filter(function(t){ if (t[0] === 'labor') return !!S.labIntro; if (/^(album|abzeichen|tausch)$/.test(t[0])) return !!S.invIntro; return true; }); }
  function pmenu(tab, opt){ opt = opt || {}; return invLoad().then(function(){ if (tab) MMS.tab = tab; MMS.comb = null; MMS.msg = null; MMS.tut = !!opt.tut; var tabs = tabsVisible(); if (!tabs.some(function(t){ return t[0] === MMS.tab; })) MMS.tab = tabs[0][0];
      if (!panel || !panel.classList.contains('mmenu')){ openPanel('mmenu sbinv', 'Inventar', '<nav class="mmtabs" role="tablist" aria-label="Bereiche"></nav><div class="mmbody"></div><div class="mmmsg" aria-live="polite"></div><p class="mmkeys" aria-hidden="true">◀ ▶ Bereich · ▲ ▼ wählen · Enter benutzen · 1 bis 9 · Esc schließen</p>'); pauseOn(); MMS.t0 = Date.now(); document.addEventListener('keydown', mmKey, true); }
      mmRender(); }); }
  function mmClose(){ closePanel(); }
  function mmRender(){ if (!panel || !panel.classList.contains('mmenu')) return; MMS.sig = mmSig(); var tabs = tabsVisible(), nav = panel.querySelector('.mmtabs');
    nav.innerHTML = tabs.map(function(t){ var on = t[0] === MMS.tab; return '<button type="button" role="tab" data-t="' + t[0] + '" aria-selected="' + on + '"' + (on ? ' class="on"' : '') + '>' + t[1] + '</button>'; }).join('');
    nav.querySelectorAll('button').forEach(function(b){ b.addEventListener('click', function(){ mmTab(b.getAttribute('data-t')); }); });
    var body = panel.querySelector('.mmbody'); body.className = 'mmbody t-' + MMS.tab;
    if (MMS.tab === 'dinge') mmDinge(body); else if (MMS.tab === 'album') body.innerHTML = '<div class="mmscroll">' + albumHtml() + '</div>'; else if (MMS.tab === 'abzeichen') body.innerHTML = '<div class="mmscroll">' + badgeHtml() + '</div>';
    else if (MMS.tab === 'logbuch'){ var w = document.createElement('div'); w.className = 'mmscroll'; body.innerHTML = ''; body.appendChild(w); logbookTab(w); }
    else if (MMS.tab === 'tausch'){ body.innerHTML = '<div class="mmscroll">' + (H('inventoryExtra') || '<p>Niemand da.</p>') + '</div>'; H('inventoryBind', body, mmClose); }
    else if (MMS.tab === 'labor') mmLabor(body);
    mmMsg(); }
  function mmTab(t){ MMS.tab = t; MMS.sel = 0; MMS.comb = null; MMS.msg = null; cursorSnd('mv'); mmRender(); var b = panel && panel.querySelector('.mmtabs .on'); if (b) b.focus(); }
  function dingeList(){ var L = PLACES.map(function(p){ return {id:p.id, p:p, got:!!S.found[p.id]}; }); var C = crafted(); Object.keys(C).sort(function(a, b){ return C[a] - C[b]; }).forEach(function(id){ var r = recipeById(id); if (r) L.push({id:id, got:true, craft:r}); }); return L; }
  function comment(id){ var a = ((INV && INV.itemlines) || {})[id]; if (!a || !a.length) return null; var l = a[((S.visits || 1) + new Date().getDate()) % a.length]; return Array.isArray(l) ? {who:l[0], text:l[1]} : l; }
  function actsFor(x){ var A = []; if (!x) return A; if (!x.got){ A.push(['hint', 'Hinweis kaufen (' + CF('game.hint', HINT_COST) + ' Punkte)']); return A; }
    var T = TOOLS[x.id], R = x.craft, used = S.used && S.used[x.id], gifted = S.gifted && S.gifted[x.id];
    if (T && !used && !gifted) A.push(['tool', 'Als Werkzeug benutzen']);
    if (!R && S.invIntro) A.push(['comb', MMS.comb === x.id ? 'Kombinieren abbrechen' : 'Kombinieren']);
    if (R && R.kind === 'gift' && !gifted){ var to = ((INV.gifts || {})[x.id] || {}).to || 'inka'; A.push(['gift', 'Verschenken an ' + (MMNAME[to] || to)]); }
    if (R && R.kind === 'lab' && S.labIntro && !S.lab) A.push(['lab', 'Am Labor benutzen']);
    return A; }
  function detail(x){ if (!x) return ''; var h = (S.done ? '<p><button type="button" class="sbcertbtn mmcert">Urkunde ansehen</button></p>' : '') + '<div class="mmbig">' + (x.got ? iconImg(x.id) : '<img src="' + SPR('px/obj-' + x.id + '.png') + '" alt="" class="sil">') + '</div><h3>' + esc(x.got ? (NAMES[x.id] || x.id) : 'Noch nicht gefunden') + '</h3>';
    if (!x.got) h += '<p>' + esc(String(x.p.k || '').split(',')[0]) + '. ' + ['', 'Offen sichtbar.', 'In Bildern oder Listen.', 'Am Rand, gut versteckt.'][x.p.d] + '</p>';
    else { var T = TOOLS[x.id], R = x.craft; if (R) h += '<p>' + esc(R.desc || '') + '</p><p class="mmsmall">' + esc(NAMES[R.a] || R.a) + ' + ' + esc(NAMES[R.b] || R.b) + '</p>';
      if (T) h += '<p><b>Wirkung:</b> ' + esc(T.n) + (S.used && S.used[x.id] ? ' (benutzt)' : '') + '</p>';
      if (R && R.kind === 'gift') h += '<p><b>Geschenk</b>' + (S.gifted && S.gifted[x.id] ? ' (verschenkt)' : '') + '</p>'; if (R && R.kind === 'lab') h += '<p><b>Schlüssel</b> für Wagners Labor</p>';
      if (x.p) h += '<p><b>Gefunden:</b> ' + esc(x.p.k || '') + (fmtT(S.found[x.id]) ? ', ' + fmtT(S.found[x.id]) : '') + '</p>'; else if (R) h += '<p><b>Hergestellt:</b> ' + fmtT(crafted()[x.id]) + '</p>';
      var cm = comment(x.id); if (cm) h += '<p class="mmcom"><b style="color:' + (MMCOL[cm.who] || '#fff') + '">' + esc(MMNAME[cm.who] || cm.who) + ':</b> ' + esc(clean(cm.text)) + '</p>'; }
    var A = actsFor(x); return h + '<ul class="mmacts">' + A.map(function(a){ return '<li><button type="button" data-a="' + a[0] + '"' + (MMS.tut && a[0] === 'comb' ? ' class="blink"' : '') + '>' + esc(a[1]) + '</button></li>'; }).join('') + '</ul>'; }
  function mmDinge(body){ var L = dingeList(); if (MMS.sel >= L.length) MMS.sel = 0; var tutPair = MMS.tut ? tutorialPair() : null;
    body.innerHTML = '<ol class="mmlist" role="listbox" aria-label="Dinge">' + L.map(function(x, i){ var used = S.used && S.used[x.id], gifted = S.gifted && S.gifted[x.id];
      return (x.craft && (i === 0 || !L[i - 1].craft) ? '<li class="mmsep" aria-hidden="true">KOMBINIERT</li>' : '') + '<li role="option" tabindex="-1" data-i="' + i + '" aria-selected="' + (i === MMS.sel) + '" class="' + [i === MMS.sel ? 'on' : '', x.got ? 'got' : 'open', used || gifted ? 'used' : '', MMS.comb === x.id ? 'comb' : '', tutPair && tutPair.indexOf(x.id) >= 0 ? 'blink' : ''].join(' ') + '">' +
        (x.got ? iconImg(x.id) : '<img src="' + SPR('px/obj-' + x.id + '.png') + '" alt="" class="sil">') + '<span>' + (i < 9 ? '<small>' + (i + 1) + '</small>' : '') + esc(x.got ? (NAMES[x.id] || x.id) : '???') + '</span>' + (used ? '<em>benutzt</em>' : gifted ? '<em>verschenkt</em>' : '') + '</li>'; }).join('') + '</ol><div class="mmdet">' + detail(L[MMS.sel]) + '</div>';
    body.querySelectorAll('.mmlist li[data-i]').forEach(function(li){ li.addEventListener('click', function(){ mmPick(+li.getAttribute('data-i')); }); });
    body.querySelectorAll('.mmacts button').forEach(function(b){ b.addEventListener('click', function(){ mmAct(b.getAttribute('data-a')); }); });
    var cb = body.querySelector('.mmcert'); if (cb) cb.addEventListener('click', function(){ mmClose(); setTimeout(cert, 260); });
    var on = body.querySelector('.mmlist li.on'); if (on && on.scrollIntoView) on.scrollIntoView({block:'nearest'}); }
  function mmPick(i){ var L = dingeList(), x = L[i]; if (!x) return; if (MMS.comb && x.got && !x.craft && x.id !== MMS.comb){ var a = MMS.comb; MMS.sel = i; doCombine(a, x.id); return; } if (MMS.comb && x.id === MMS.comb){ MMS.comb = null; MMS.msg = null; } MMS.sel = i; cursorSnd('mv'); mmRender(); }
  function mmAct(a){ var L = dingeList(), x = L[MMS.sel]; if (!x) return;
    if (a === 'hint'){ mmClose(); setTimeout(function(){ hintFor(x.p); }, 260); return; }
    if (a === 'tool'){ mmClose(); startTool(x.id); return; }
    if (a === 'comb'){ if (MMS.comb === x.id){ MMS.comb = null; MMS.msg = null; } else { MMS.comb = x.id; MMS.tut = false; MMS.msg = {sys:'Kombinieren: ' + (NAMES[x.id] || x.id) + ' + ? Wähle ein zweites Ding.'}; } cursorSnd('ok'); mmRender(); return; }
    if (a === 'gift'){ give(x.id); return; }
    if (a === 'lab'){ labTry(x.id); return; } }
  function tutorialPair(){ var ks = Object.keys(RECIPES).filter(function(k){ var r = RECIPES[k]; return S.found[r.a] && S.found[r.b] && !crafted()[r.id]; }); ks.sort(function(a, b){ return (RECIPES[a].kind === 'lab') - (RECIPES[b].kind === 'lab'); }); return ks.length ? [RECIPES[ks[0]].a, RECIPES[ks[0]].b] : null; }
  function fill(t, a, b){ return String(t || '').replace(/\{a\}/g, NAMES[a] || a).replace(/\{b\}/g, NAMES[b] || b); }
  function mmSay(line, extra){ MMS.msg = {who:line.who || 'inka', text:clean(line.text), extra:extra ? clean(norm0(extra).text || extra) : ''}; try { syl(MMS.msg.who, 'neutral', 'quick'); } catch(e){} mmMsg(); }
  function mmMsg(){ var m = panel && panel.querySelector('.mmmsg'); if (!m) return; var M = MMS.msg; if (!M){ m.innerHTML = ''; m.classList.remove('on'); return; } m.classList.add('on');
    m.innerHTML = M.sys ? '<p class="sys">' + esc(M.sys) + '</p>' : '<p><b style="color:' + (MMCOL[M.who] || '#fff') + '">' + esc(MMNAME[M.who] || M.who) + ':</b> ' + esc(M.text) + '</p>' + (M.extra ? '<p class="alarm">' + esc(M.extra) + '</p>' : ''); }
  function doCombine(a, b){ MMS.comb = null; var k = pairKey(a, b), R = RECIPES[k];
    if (R){ var C = crafted(); if (C[R.id]){ mmSay({who:'inka', text:'Das hast du schon: ' + R.name + '.'}); mmRender(); return; }
      C[R.id] = Date.now(); var first = !S.firstCraft; S.firstCraft = S.firstCraft || Date.now(); save(); cursorSnd('ok'); sp('g-fund', {vol:.6, max:.35}); H('onCraft', R);
      dingeList().forEach(function(x, i){ if (x.id === R.id) MMS.sel = i; }); mmRender(); mmSay({who:R.who || 'inka', text:R.made || (R.name + '.')});
      if (first && INV.scenes && INV.scenes.inv_firstcraft) MMS.after = INV.scenes.inv_firstcraft; return; }
    var c = (INV.pairs || {})[k] || {who:'inka', text:'Das passt nicht zusammen.'}; cursorSnd('mv'); mmRender();
    if (S.labIntro && !S.lab){ S.labFails = (S.labFails || 0) + 1; save(); H('wanted', .5, 'labor'); var al = INV.lab_alarm || []; tick(); mmSay(c, al.length ? al[S.labFails % al.length] : 'Alarm.'); }
    else mmSay(c); }
  function give(id){ var g = (INV.gifts || {})[id]; if (!g) return; S.gifted = S.gifted || {}; S.gifted[id] = Date.now(); var R = rel(g.to); R.n = Math.min(5, R.n + 1); save(); H('onGift', id, g.to); mmClose(); setTimeout(function(){ dialog(g.lines || [[g.to, '...']]); }, 300); }
  function mmLabor(body){ var C = crafted(), keys = Object.keys(C).filter(function(id){ return !!recipeById(id); });
    body.innerHTML = '<div class="mmlab"><div class="mmdoor' + (S.lab ? ' open' : '') + '" aria-hidden="true"><i></i><b></b></div><div class="mmlabtxt"><h3>' + (S.lab ? 'Wagners Labor ist offen' : 'Wagners Labor') + '</h3><p>' + (S.lab ? 'Sigmas Akte liegt hier. Du kannst sie jederzeit wieder lesen.' : 'Das Schloss nimmt nur ein Ding, das es nicht gibt. Wähle etwas Kombiniertes. Jeder Fehlversuch löst Wagners Alarm aus.') + '</p>' +
      '<ul class="mmacts">' + (S.lab ? '<li><button type="button" data-a="akte">Sigmas Akte lesen</button></li>' : keys.map(function(id){ return '<li><button type="button" data-a="key" data-id="' + id + '">' + iconImg(id) + ' ' + esc(NAMES[id] || id) + '</button></li>'; }).join('') + '<li><button type="button" data-a="lhint">Hinweis kaufen (' + CF('game.hint', HINT_COST) + ' Punkte)</button></li>') + '</ul>' +
      (!S.lab && !keys.length ? '<p class="mmsmall">Noch nichts Kombiniertes. Unter DINGE: ein Ding, Kombinieren, ein zweites Ding.</p>' : '') + (S.labFails && !S.lab ? '<p class="mmwarn">Alarm ausgelöst: ' + S.labFails + '-mal</p>' : '') + '</div></div>';
    body.querySelectorAll('.mmacts button').forEach(function(b){ b.addEventListener('click', function(){ var a = b.getAttribute('data-a'); if (a === 'key') labTry(b.getAttribute('data-id')); else if (a === 'lhint') labHint(); else if (a === 'akte'){ mmClose(); setTimeout(function(){ dialog((INV.scenes || {}).lab_success || []); }, 300); } }); }); }
  function labTry(id){ var R = recipeById(id); if (R && R.kind === 'lab' && !S.lab){ S.lab = Date.now(); save(); cursorSnd('ok'); H('onLab'); mmClose(); setTimeout(function(){ dialog((INV.scenes || {}).lab_success || []); }, 300); return; }
    S.labFails = (S.labFails || 0) + 1; save(); H('wanted', .5, 'labor'); tick(); var w = ((INV.scenes || {}).lab_wrongkey || [['wagner', 'Falsch.']])[0], al = INV.lab_alarm || []; mmSay(norm0(w), al.length ? al[S.labFails % al.length] : ''); if (MMS.tab === 'labor') mmLabor(panel.querySelector('.mmbody')); }
  function labHint(){ var have = Object.keys(crafted()).filter(function(id){ var r = recipeById(id); return r && r.kind === 'lab'; }); S.hints = (S.hints || 0) + 1; save(); refresh(); H('onHint');
    if (have.length){ mmSay({who:'inka', text:'Du hast schon einen Schlüssel: ' + (NAMES[have[0]] || have[0]) + '. Setz ihn ein.'}); return; }
    var ks = Object.keys(RECIPES).filter(function(k){ var r = RECIPES[k]; return r.kind === 'lab' && S.found[r.a] && S.found[r.b]; });
    if (ks.length){ var r = RECIPES[ks[(S.hints || 0) % ks.length]], hs = INV.lab_hint || ['{a} und {b}.']; mmSay({who:'inka', text:fill(hs[(S.hints || 0) % hs.length], r.a, r.b)}); }
    else { var hn = INV.lab_hint_none || ['Dir fehlt noch etwas. Such weiter.']; mmSay({who:'inka', text:hn[(S.hints || 0) % hn.length]}); } }
  /* Tastatur: Pfeile, Enter, Zahlen, Esc; Taste I öffnet (verzögert, damit getippte Namen und Cheatcodes weiter gehen) */
  function mmKey(e){ if (!panel || !panel.classList.contains('mmenu')){ document.removeEventListener('keydown', mmKey, true); return; } var t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== 'checkbox' && t.type !== 'radio') return;
    var tabs = tabsVisible().map(function(x){ return x[0]; }), ti = tabs.indexOf(MMS.tab), k = e.key;
    if (k === 'Enter' && Date.now() - (MMS.t0 || 0) < 600){ e.preventDefault(); e.stopPropagation(); return; }   /* Enter aus dem Dialog davor löst nichts aus */
    if (k === 'Escape'){ e.preventDefault(); e.stopPropagation(); if (MMS.comb){ MMS.comb = null; MMS.msg = null; mmRender(); } else mmClose(); return; }
    if (k === 'i' || k === 'I'){ e.preventDefault(); e.stopPropagation(); mmClose(); return; }
    if (k === 'ArrowRight' || k === 'ArrowLeft'){ if (t && t.closest && t.closest('.mmacts') && MMS.tab !== 'dinge') return; e.preventDefault(); e.stopPropagation(); mmTab(tabs[(ti + (k === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]); return; }
    if (MMS.tab === 'dinge'){ var L = dingeList();
      if (k === 'ArrowDown' || k === 'ArrowUp'){ e.preventDefault(); e.stopPropagation(); MMS.sel = (MMS.sel + (k === 'ArrowDown' ? 1 : -1) + L.length) % L.length; cursorSnd('mv'); mmRender(); return; }
      if (/^[1-9]$/.test(k) && L[+k - 1]){ e.preventDefault(); e.stopPropagation(); mmPick(+k - 1); return; }
      if (k === 'Enter' && !(t && t.closest && t.closest('.mmacts, .mmtabs'))){ e.preventDefault(); e.stopPropagation(); var x = L[MMS.sel]; if (MMS.comb && x && x.got && !x.craft && x.id !== MMS.comb){ mmPick(MMS.sel); return; } var A = actsFor(x); if (A.length) mmAct(A[0][0]); return; } }
    else if (k === 'ArrowDown' || k === 'ArrowUp'){ var bs = [].slice.call(panel.querySelectorAll('.mmbody button, .mmbody input, .mmbody a')); if (!bs.length) return; e.preventDefault(); var ci = bs.indexOf(document.activeElement); bs[(ci + (k === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus(); cursorSnd('mv'); } }
  var iKeyT = null;
  document.addEventListener('keydown', function(e){ var t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; if (e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.key === 'i' || e.key === 'I') && !(panel && panel.classList.contains('mmenu'))){ clearTimeout(iKeyT); iKeyT = setTimeout(function(){ if (!optedOut() && !ov && !mo) pmenu('dinge'); }, 450); return; }
    if (e.key.length === 1) clearTimeout(iKeyT); });
  /* Einführung nach 8 Funden, Labor nach 12 (Josef, I2 und I6): erst wenn nichts anderes offen ist */
  var invBusy = false;
  function whenFree(fn){ var n = 0; var iv = setInterval(function(){ if (++n > 240){ clearInterval(iv); return; } if (dlg || panel || ov || mo || document.hidden || window.JK_PAUSE || document.querySelector('.lb2.on')) return; clearInterval(iv); fn(); }, 500); }
  function invCheck(polite){ if (invBusy || optedOut() || (polite && quiet())) return false; var n = count();
    if (n >= 8 && !S.invIntro){ invBusy = true; invLoad().then(function(){ whenFree(function(){ invBusy = false; S.invIntro = Date.now(); save(); markNew(); dialog(((INV.scenes || {}).inv_intro) || [['inka', 'Dein Inventar ist jetzt mehr als eine Liste. Drück I.']], function(nat){ if (!nat) return; pmenu('dinge', {tut:true}).then(function(){ var tp = tutorialPair(); var ch = INV.craft_hint || []; if (tp){ dingeList().forEach(function(x, i){ if (x.id === tp[0]) MMS.sel = i; }); MMS.comb = tp[0]; mmRender(); mmSay({who:'inka', text:fill(ch[0] || 'Probier {a} mit {b}.', tp[0], tp[1]) + ' (' + (NAMES[tp[0]] || tp[0]) + ' ist schon gewählt.)'}); } }); }); }); }); return true; }
    if (n >= 12 && S.invIntro && !S.labIntro){ invBusy = true; invLoad().then(function(){ whenFree(function(){ invBusy = false; S.labIntro = Date.now(); save(); markNew(); dialog(((INV.scenes || {}).lab_intro) || [['inka', 'Wagners Labor. Im Inventar unter LABOR.']], function(nat){ if (nat) pmenu('labor'); }); }); }); return true; }
    return false; }
  /* Nach dem Schließen: aufgeschobene Zeilen (erste Kombination) */
  function mmAfter(){ if (MMS.after){ var a = MMS.after; MMS.after = null; setTimeout(function(){ dialog(a); }, 350); } }
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
  var seenBadges = 0;
  function markNew(){ if (!fab) return; var u = unreadChaps() + ((S.quest && !S.quest.done && !S.quest.declined && S.quest.v === V()) ? 1 : 0); fab.classList.toggle('sbnew', u > 0); var lb = fab.querySelector('.sblogbtn'); if (lb) lb.innerHTML = 'Logbuch' + (u ? ' <span>' + u + ' neu</span>' : ''); }
  function relLine(who){ var R = rel(who), n = R.n, r = R.r;
    var T = {inka:[n >= 2 ? 'Inka erzählt dir inzwischen mehr, als sie sollte.' : (n <= -2 ? 'Inka beobachtet dich. Mehr nicht.' : 'Inka beobachtet. Sie wartet ab, was du bist.')],
      wagner:[r >= 2 ? 'Wagner hat deinen Namen ins Raster eingetragen. Das ist bei ihm ein Lob.' : (r <= -2 ? 'Wagner rechnet dir alles doppelt an.' : 'Wagner notiert Koordinaten. Deine auch.')],
      xae:[n >= 2 ? 'X Æ A-13 hält dich für lernfähig. Vier Sekunden bleiben trotzdem vier Sekunden.' : (r <= -2 ? 'X Æ A-13 antwortet dir in Zahlen. Nur noch in Zahlen.' : 'X Æ A-13 zählt mit, was du brauchst.')],
      sigma:[n >= 2 ? 'Sigma klopft manchmal ans Glas, wenn du da bist.' : (n <= -2 ? 'Sigma zieht sich zurück, wenn du laut wirst.' : 'Sigma sieht zu, hinter dem Glas.')],
      gojira:[n >= 2 ? 'Gojira hat ein zweites Quadrat angefangen. Inka meint, es ist für dich.' : 'Gojira gräbt. Inka übersetzt, wenn es sein muss.']};
    return T[who][0]; }
  function logbook(){ pmenu('logbuch'); }
  function logbookTab(box){ var v = S.visits || 1, n = count();
    S.chap = S.chap || {}; var chaps = CHAPTERS.map(function(c, i){ var open = chapOpen(c); return '<li class="' + (open ? 'open' : 'locked') + '">' + (open ? '<button type="button" class="sbchap" data-i="' + i + '">' + (i + 1) + '. ' + esc(c.t) + '</button>' + (S.chap[i] ? '' : ' <small class="sbnewtag">neu</small>') : (i + 1) + '. <span class="sbq">' + esc(c.t).replace(/\S/g, '·') + '</span> <small>' + (v < c.v ? 'ab Besuch ' + c.v : 'ab ' + c.f + ' Funden') + '</small>') + '</li>'; }).join('');
    if (S.lab) chaps += '<li class="open secret"><button type="button" class="sbakte">✦ Sigmas Akte</button></li>';
    if (S.ending === 'destroy') chaps += '<li class="open secret"><button type="button" class="sbchap" data-i="s">✦ ' + esc(SECRET.t) + '</button>' + (S.chap.s ? '' : ' <small class="sbnewtag">neu</small>') + '</li>';
    var ngTxt = NG ? ' Plus-Stufe ' + NG + (RANKS[NG] ? ', Rang ' + RANKS[NG] : '') + '.' : ''; var ranks = (S.ranks || []).filter(function(r){ return r > 0; }); if (ranks.length) ngTxt += ' Abgeschlossen: ' + ranks.map(function(r){ return RANKS[r]; }).join(', ') + '.';
    var wv = NG >= 2 ? '<p class="sbwview"><label><input type="checkbox" class="sbwv"' + (S.wview ? ' checked' : '') + '> Wagners Sicht</label> <small>Kapitel aus seiner Perspektive, ab Plus-Stufe 2.</small></p>' : '';
    var stamps = (S.stamps || []).map(function(t){ return '<span title="' + new Date(t).toLocaleDateString('de-DE') + '"></span>'; }).join('');
    var rels = ['inka', 'wagner', 'xae', 'sigma', 'gojira'].map(function(w){ return '<li><b style="color:' + CH[w].col + '">' + CH[w].name + '</b> ' + relLine(w) + '</li>'; }).join('');
    var sp0 = S.tspeed || 'normal';
    var html = '<div class="sblogcols"><section><h3>Stand</h3><p>' + n + ' von ' + N + ' Dingen, ' + points() + ' Punkte' + (S.visitBonus ? ' (davon ' + S.visitBonus + ' fürs Wiederkommen)' : '') + ', ' + (S.hints || 0) + ' Hinweise. ' + v + (v > 1 ? ' Besuche' : ' Besuch') + '.' + (S.questBonus ? ' ' + S.questBonus + ' Punkte aus Aufträgen.' : '') + ngTxt + '</p><p class="cstamps" aria-label="Stempel je Besuch">' + stamps + '</p>' + (S.done ? '<p><button type="button" class="sbcertbtn">Urkunde</button></p>' : '') + '</section>' +
      '<section><h3>Kapitel</h3><ol class="sbchaps">' + chaps + '</ol>' + wv + '</section>' +
      '<section><h3>Auftrag</h3>' + questHtml() + '</section>' +
      '<section><h3>Freigespielt</h3><p>Hintergrundbilder und Ausschnitte aus den Suchbildern ab 5, 10, 15 und 20 Funden: <a href="musterbuch.html#freigespielt">im Musterbuch</a>.</p></section>' +
      '<section><h3>Figuren</h3><ul class="sbrels">' + rels + '</ul></section>' +
      '<section><h3>Textgeschwindigkeit</h3><p class="sbspeed" role="group" aria-label="Textgeschwindigkeit">' + ['langsam', 'normal', 'sofort'].map(function(k){ return '<label><input type="radio" name="sbspeed" value="' + k + '"' + (sp0 === k ? ' checked' : '') + '> ' + k + '</label>'; }).join(' ') + '</p></section>' +
      '<section><h3>Vergessen</h3><p>Löscht Funde, Punkte, Besuche, Verhältnisse und Kapitel in diesem Browser.</p><p><button type="button" class="sbforget">Alles vergessen</button></p></section></div>';
    html += (H('logbookExtra') || '');
    box.innerHTML = html;
    box.querySelectorAll('input[name=sbspeed]').forEach(function(r){ r.addEventListener('change', function(){ S.tspeed = r.value; save(); cursorSnd('ok'); }); });
    box.querySelectorAll('.sbchap').forEach(function(b){ b.addEventListener('click', function(){ var i = b.getAttribute('data-i'); closePanel(); showChapter(i === 's' ? 's' : +i); }); });
    var ak = box.querySelector('.sbakte'); if (ak) ak.addEventListener('click', function(){ closePanel(); setTimeout(function(){ invLoad().then(function(){ dialog((INV.scenes || {}).lab_success || []); }); }, 300); });
    var wvi = box.querySelector('.sbwv'); if (wvi) wvi.addEventListener('change', function(){ S.wview = wvi.checked ? 1 : 0; save(); cursorSnd('ok'); });
    var cb = box.querySelector('.sbcertbtn'); if (cb) cb.addEventListener('click', function(){ closePanel(); cert(); });
    box.querySelector('.sbforget').addEventListener('click', function(){ var b = this; if (!b.classList.contains('sure')){ b.classList.add('sure'); b.textContent = 'Wirklich alles vergessen?'; setTimeout(function(){ b.classList.remove('sure'); b.textContent = 'Alles vergessen'; }, 5000); return; }
      try { localStorage.removeItem(SBK); sessionStorage.removeItem('jk_sb_seen'); } catch(e){} location.reload(); }); }
  /* Plus-Stufe 2 und 3: Sigma spricht in Rätseln (Josef, 29.10., 13:14: kryptische Hinweise) */
  function riddle(p){ var where = /^@lb/.test(p.sel) ? 'in einem Bild, wenn man es groß ansieht' : /footgrid/.test(p.sel) ? 'wo die Seite aufhört zu sprechen' : /marg/.test(p.sel) ? 'am Rand, wo die Anmerkungen wohnen' : /figure/.test(p.sel) ? 'in einem Bild, das selbst ein Bild zeigt' : /pagehead/.test(p.sel) ? 'ganz oben, wo der Name steht' : /textwrap|cvl|credits|first-child|nlform|bigtabs|landing-foot|princeofwales/.test(p.sel) ? 'zwischen den Zeilen, wörtlich' : 'wo die Seite ihren Namen nicht sagt';
    var pg = {index:'wo drei Türen offen stehen', kunst:'wo die Farbe noch trocknet', comic:'wo die Felder sprechen', texte:'wo gewandert wird', vermittlung:'wo erklärt wird', info:'wo ein Leben in Zeilen steht'}[p.p] || 'irgendwo';
    return [['sigma', '*' + NAMES[p.id] + '* ... ' + pg + ', ' + where + '. [p:.5] Mehr sage ich nicht. Das Raster hört mit.', 'nachdenklich']]; }
  /* Plus-Stufe 2 und 3: wandernde Dinge. Alle 120 s ohne Fund wechseln die ungefundenen Dinge der Seite ihren Platz im Anker (Josef, 29.10., 13:14) */
  var lastAct = Date.now();
  function wanderNow(){ var moved = 0; document.querySelectorAll('img.sbobj:not(.found):not(.sblb)').forEach(function(o){ var p = o._p; if (!p) return; p.x = p.d === 3 ? (Math.random() < .5 ? 4 + Math.round(Math.random() * 14) : 82 + Math.round(Math.random() * 14)) : 10 + Math.round(Math.random() * 80); p.y = 6 + Math.round(Math.random() * 86);
      var sz = o.offsetWidth || SIZE[p.d], IN = 10; o.classList.add('wander'); setTimeout(function(){ o.style.left = 'clamp(' + IN + 'px, calc(' + p.x + '% - ' + (sz / 2) + 'px), calc(100% - ' + (sz + IN) + 'px))'; o.style.top = 'clamp(' + IN + 'px, calc(' + p.y + '% - ' + (sz / 2) + 'px), calc(100% - ' + (sz + IN) + 'px))'; o.classList.remove('wander'); unstack(); }, 420); moved++; }); lastAct = Date.now(); return moved; }
  function wander(){ if (NG < 2) return; setInterval(function(){ if (document.hidden || dlg || panel || ov) return; if (Date.now() - lastAct < CF('game.wander', 120) * 1000) return; wanderNow(); }, 5000); }
  function hint(){ if (S.done) { cert(); return; } var left = PLACES.filter(function(p){ return !S.found[p.id]; }); if (!left.length) return; hintFor(left[Math.floor(Math.random() * left.length)]); }
  function hintFor(p){ if (S.found[p.id]) return;
    S.hints++; S.hinted = S.hinted || {}; S.hinted[p.id] = 1; save(); tick(); H('onHint', p); document.querySelectorAll('img.sbobj').forEach(function(im){ if (im._p && im._p.id === p.id) a11yObj(im, p); });
    var R = rel('inka'), exact = R.n >= 2;   /* Nähe zu Inka: genauere Hinweise */
    var wag = rel('wagner').r >= 2 ? 'Fünfzig Punkte. Für Sie hätte ich es billiger gemacht, aber das Raster kennt keine Freunde.' : (rel('wagner').r <= -2 ? '[m:wuetend]Fünfzig Punkte. Für Sie eigentlich hundert.' : 'Fünfzig Punkte. Koordinaten kosten.');
    var lines = NG >= 2 ? riddle(p) : [['inka', '*' + NAMES[p.id] + '*: ' + p.k + '.' + (p.d === 3 ? ' Klein und blass, genau hinsehen.' : '') + (exact ? ' Ich zeig dir noch mehr: ' + (p.x < 50 ? 'eher links' : 'eher rechts') + ', ' + (p.y < 50 ? 'oben' : 'unten') + '.' : ''), exact ? 'froh' : undefined]];
    if ((S.hints || 0) % 3 === 1) lines.push({who:'wagner', text:wag + ' Einverstanden?', ask:[{s:'d', t:'In Ordnung. Danke für die Koordinaten.', re:[['wagner', '[m:froh]Bitte. Ein Geschäft ist ein Geschäft.']]}, {s:'p', t:'Wucher. Inka hätte es umsonst gesagt.', re:[['wagner', '[m:wuetend]Inka sagt vieles umsonst. [m:neutral]Deshalb ist sie auch nicht verantwortlich.']]}, {s:'a', t:'Abgemacht. Nächster Hinweis bitte gleich.', re:[['wagner', 'Nacheinander. Erst suchen, dann zahlen.']]}, {s:'v', t:'Von mir aus.', re:[['wagner', '[m:nachdenklich]Von Ihnen aus. Sehr wohl.']]}]}); else lines.push(['wagner', wag]);
    dialog(lines); }


  /* ---------- Reaktionen auf Verhalten (Suchbild 2.0, Etappe 5; Josef, 29.10., 13:14 bis 13:50) ----------
     Ungefragte Fenster höchstens alle 60 s (Regler game.gap), je Auslöser einmal je Besuch, nie während jemand liest (sichtbarer Absatz wird noch geschrieben), nie bei Psst oder Nicht jetzt. */
  var lastInput = Date.now(), misses = 0, hiddenAt = 0;
  function readingNow(){ var vh = window.innerHeight; return [].slice.call(document.querySelectorAll('.plotted:not(.plotdone)')).some(function(el){ var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh && r.height > 0; }); }
  function react(key, mk, tries){ var NOW = !/^op:/.test(key);   /* Reaktionen auf Verhalten kommen sofort und ersetzen einen kurzen Kommentar (Josef, 12.11.2026); Meinungsfragen halten den Abstand */
    if (quiet() || (dlg && !(NOW && dlgSoft)) || panel || ov || mo || document.hidden) return false; S.rx = S.rx || {}; if (S.rx[key] === V()) return false;
    if (!NOW && Date.now() - lastDlg < CF('game.gap', 120) * 1000) return false;
    if (NOW && dlg && dlgSoft && closeCur) closeCur();
    if (!NOW && readingNow()){ if ((tries || 0) < 10) setTimeout(function(){ react(key, mk, (tries || 0) + 1); }, 4000); return false; }
    var lines = typeof mk === 'function' ? mk() : mk; if (!lines || !lines.length) return false;
    S.rx[key] = V(); save(); dialog(lines, null, {psst:true}); return true; }
  function workTitle(f){ var i = f && f.querySelector('figcaption i'); if (i) return i.textContent.trim(); var im = f && f.querySelector('img'); var alt = im && im.alt || ''; return alt.replace(/^Josef Knoll,\s*/, '').replace(/,\s*\d{4}.*$/, '') || ''; }
  function reactions(){
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function(ev){ window.addEventListener(ev, function(){ lastInput = Date.now(); }, {passive:true, capture:true}); });
    /* Fehlklicks: Klicks ins Leere (kein Link, Knopf, Bild, Ding) */
    document.addEventListener('click', function(e){ if (e.target.closest('a, button, input, label, select, textarea, summary, img, .sbobj, .sbdlg, .sbpanel, .sbfab, .sbcert, .lb2, .modem, header, nav')) return; misses++;
      if (misses === 5) react('miss', function(){ return [['inka', 'Du klickst ins Leere. Fünfmal. Die Dinge sind klein, aber sie sind Bilder, keine Lücken.'], ['wagner', 'Fünf Klicks ohne Koordinaten. Ich habe sie notiert. Alle fünf.', 'nachdenklich']]; });
      if (misses === 12) react('miss2', function(){ return [['xae', 'Zwölf Fehlklicks. Ich sage es ohne Wertung: Das ist Wetter, keine Methode.'], {who:'inka', text:'Soll ich dir was verraten? Es kostet nichts, diesmal.', ask:[{s:'d', t:'Gern, danke.', re:[['inka', '[m:froh]Die leichten liegen offen bei den Titeln und Türen. Fang da an.']]}, {s:'p', t:'Ich brauche keine Hilfe.', re:[['inka', '[m:ueberrascht]Gut. Dann klick weiter. Ich schau zu.']]}, {s:'a', t:'Ja, schnell.', re:[['inka', 'Schau in die Bilder, nicht daneben. Und ganz unten in die Fußzeilen.']]}, {s:'v', t:'Egal.', re:[['inka', '[m:nachdenklich]Egal. Das sagt Sigma auch oft.']]}]}]; }); });
    /* lange Suche ohne Fund auf einer Seite mit Dingen */
    setInterval(function(){ if (S.done || document.hidden) return; var left = document.querySelectorAll('img.sbobj:not(.found)').length; if (!left) return;
      if (Date.now() - lastAct > CF('game.longsearch', 300) * 1000) react('long', function(){ return [['sigma', '... du suchst lange. Ich habe die Dinge nicht gut versteckt, sie sind nur klein. [p:.5] Schau dort, wo nichts geschrieben steht.', 'nachdenklich']]; }); }, 10000);
    /* 90 s untätig */
    setInterval(function(){ if (document.hidden) return; if (Date.now() - lastInput > CF('game.idle', 180) * 1000) react('idle', function(){ return [['sigma', '... bist du noch da? [p:.6] Ich bin es. Hinter dem Glas vergeht die Zeit anders.', 'nachdenklich'], ['inka', 'Er wartet gern. Ich nicht. Scroll weiter, wenn du magst.']]; }); }, 15000);
    /* rasantes Scrollen */
    var sdist = 0, st0 = 0, sy0 = window.pageYOffset; window.addEventListener('scroll', function(){ var now = Date.now(), y = window.pageYOffset; var FS = CF('game.fastscroll', 8); if (now - st0 > 1000){ sdist = 0; st0 = now; sy0 = y; } sdist = Math.abs(y - sy0); if (sdist > window.innerHeight * FS) { sdist = 0; st0 = now; sy0 = y; react('fast', function(){ return [['xae', 'Du scrollst mit ' + Math.round(window.innerHeight * FS) + ' Pixeln pro Sekunde. Ich lese so. Die meisten nicht.'], ['inka', 'Langsamer. Der Plotter schreibt nur, was du ansiehst.']]; }); } }, {passive:true});
    /* Tab verlassen und zurück */
    document.addEventListener('visibilitychange', function(){ if (document.hidden){ hiddenAt = Date.now(); return; } if (hiddenAt && Date.now() - hiddenAt > 30000) setTimeout(function(){ react('back', function(){ return [['inka', pickOne(['Wieder da. Ich habe nichts angefasst.', 'Du warst weg. Sigma hat gefragt, ob du wiederkommst. Ich habe ja gesagt.', 'Zurück. Die Dinge liegen noch da, wo sie lagen. Meistens.'])]]; }); }, 1200); hiddenAt = 0; });
    /* lange vor einem Bild (Großansicht 8 s): Figuren beziehen sich auf Titel und Material */
    var lbT = null; window.addEventListener('jk:lb', function(e){ var a = e.detail && e.detail.a; var f = a && a.closest('figure.work'); clearTimeout(lbT); if (!f) return; albumAdd(f, 'lb');
      lbT = setTimeout(function(){ if (!document.querySelector('.lb2.on')) return; var t = workTitle(f), mat = (f.querySelector('figcaption') || {}).textContent || ''; mat = (mat.split('\n')[1] || '').trim();
        react('look:' + f.id, function(){ return [[pickOne(['inka', 'wagner', 'xae']), lookLine(f, t)]]; }); }, 8000); });
    /* Hover 5 s auf einem Werk zählt fürs Album */
    var hovT = null; document.addEventListener('pointerover', function(e){ var f = e.target.closest && e.target.closest('figure.work'); clearTimeout(hovT); if (!f || TOUCH) return; hovT = setTimeout(function(){ if (f.matches(':hover')) albumAdd(f, 'hover'); }, 5000); }, {passive:true});
    /* Text zu Ende gelesen: der letzte Absatz einer Textspalte ist fertig geschrieben und sichtbar; dann fragt eine Figur nach der Meinung (einmal je Text und Besuch) */
    if ('IntersectionObserver' in window){ var lasts = []; document.querySelectorAll('.textwrap').forEach(function(tw){ var ps = tw.querySelectorAll('p'); if (ps.length >= 2) lasts.push(ps[ps.length - 1]); });
      var io = new IntersectionObserver(function(es){ es.forEach(function(en){ if (!en.isIntersecting) return; var pp = en.target; setTimeout(function(){ if (!pp.classList.contains('plotdone') && pp.classList.contains('plotted')) return; var sec = pp.closest('section'); if (!sec) return; var h = sec.querySelector('h2'); opinion(sec.id, h ? h.textContent.trim() : 'den Text'); }, 2500); }); }, {threshold:.6}); lasts.forEach(function(pp){ io.observe(pp); }); } }
  function lookLine(f, t){ var g = f.getAttribute('data-group') || ''; var cap = (f.querySelector('figcaption') || {}).textContent || ''; var mat = /Tusche/.test(cap) ? 'Tusche' : /Linolstift/.test(cap) ? 'Linolstift' : /Stereolithografie/.test(cap) ? 'Stereolithografie' : /Kohle/.test(cap) ? 'Kohle' : /Ölkreide/.test(cap) ? 'Ölkreide' : /Feder/.test(cap) ? 'Feder' : /Kaltnadel/.test(cap) ? 'Kaltnadel' : '';
    var L = ['Du siehst dir *' + t + '* lange an. ' + (mat ? mat + ' auf Papier, kein Pixel. ' : '') + 'Mir gefällt, was du ansiehst.', 'Du bleibst bei *' + t + '*. ' + (g === 'cowboykaugummi' ? 'Comicsprache, aber kein Comic, sagt Josef. Ich sage: Kaugummi.' : g === 'egoshooter' ? 'Die Perspektive der Waffe. Wagner mag die Serie, aus den falschen Gründen.' : g === 'lickitcutit' ? 'Vier Blätter, eine Figur. Schau auf die Nähte.' : g === 'suchbilder' ? 'Daher kommen die Dinge, die du suchst. Zähl die Löcher.' : 'Lass dir Zeit.')];
    return pickOne(L); }
  /* Meinungsfragen nach einem gelesenen Text (Josef, 29.10., 13:36): vier Haltungen, wirkt aufs Verhältnis */
  function opinion(id, title){ /* nur nach jedem zweiten Text (Josef, 12.11.2026) */ S.opi = S.opi || {}; if (!(id in S.opi)){ S.opi[id] = Object.keys(S.opi).length % 2; save(); } if (S.opi[id]) return; var who = ['inka', 'wagner', 'xae', 'sigma'][(S.ops || 0) % 4];
    var Q = {inka:{who:'inka', text:'Du hast den Text zu *' + title + '* bis zum Ende gelesen. Und? Ich frage für mich.', ask:[{s:'d', t:'Sachlich und klar. Gefällt mir.', re:[['inka', '[m:froh]Felix schreibt so. Kein Wort zu viel, sagt er. Ich finde, eins zu wenig.']]}, {s:'p', t:'Zu viel Text für Bilder.', re:[['inka', '[m:ueberrascht]Sag das Felix. [m:froh]Nein, sag es ihm wirklich, er mag Widerspruch.']]}, {s:'a', t:'Jetzt will ich die Bilder sehen.', re:[['inka', '[m:froh]Dann los. Klick drauf, sie werden groß.']]}, {s:'v', t:'Weiß nicht. Lang.', re:[['inka', '[m:nachdenklich]Lang. Sigma liest ihn jeden Tag. Er sagt, er wird kürzer.']]}]},
      wagner:{who:'wagner', text:'Sie haben *' + title + '* gelesen. Ein Urteil, bitte. Kurz.', ask:[{s:'d', t:'Gut gebaut. Jeder Satz an seinem Platz.', re:[['wagner', '[m:froh]Gebaut. Das richtige Wort. Sie sehen Konstruktion.']]}, {s:'p', t:'Wertungsfrei bis zur Langeweile.', re:[['wagner', '[m:wuetend]Sachlichkeit ist keine Langeweile. [m:neutral]Sie ist Disziplin. Aber Sie widersprechen, das zählt.']]}, {s:'a', t:'Weiter. Nächster Text.', re:[['wagner', 'Eile. [m:nachdenklich]Gut, der nächste wartet unten.']]}, {s:'v', t:'Kein Urteil.', re:[['wagner', '[m:wuetend]Kein Urteil ist auch eines. [m:neutral]Das schlechteste.']]}]},
      xae:{who:'xae', text:'Text zu *' + title + '*: gelesen in deiner Zeit. Ich brauche 1,8 Sekunden. Rating?', ask:[{s:'d', t:'Informativ. Ich habe etwas gelernt.', re:[['xae', '[m:froh]Lernen. Das sagen die wenigsten zu. Notiert.']]}, {s:'p', t:'Ich lese schneller als du denkst.', re:[['xae', '[m:wuetend]Nein. [m:neutral]Aber die Behauptung war unterhaltsam.']]}, {s:'a', t:'Gib mir die Kurzfassung des nächsten.', re:[['xae', 'Kurzfassung: Bilder. Darunter Text. [m:nachdenklich]So geht es weiter.']]}, {s:'v', t:'...', re:[['xae', '[m:nachdenklich]Schweigen. Statistisch die häufigste Antwort auf Kunst.']]}]},
      sigma:{who:'sigma', mood:'nachdenklich', text:'... du hast *' + title + '* gelesen. Ich lese mit, von hinten. Magst du es?', ask:[{s:'d', t:'Ja. Ruhig geschrieben.', re:[['sigma', '[m:froh]... ruhig. Ja. Hinter dem Glas liest man so.']]}, {s:'p', t:'Nein. Zu kühl.', re:[['sigma', '[m:traurig]... kühl. [p:.5] Vielleicht. Ich kenne es nicht anders.']]}, {s:'a', t:'Zeig mir, was dazu gehört.', re:[['sigma', '[m:froh]Die Bilder darüber. Und am Rand die Abbildungen, klein. Da war ich auch.']]}, {s:'v', t:'Ich habe nur überflogen.', re:[['sigma', '... überflogen. [m:nachdenklich]Das kann ich nicht. Ich habe keine Flügel.']]}]}};
    if (react('op:' + id, [Q[who]])){ S.ops = (S.ops || 0) + 1; save(); setTimeout(badges, 500); } }
  /* ---------- Sammelalbum (Josef, 29.10., 13:36): jedes groß angesehene Werk (Großansicht oder 5 s Hover) wird eine Karte mit Bild, Titel, Jahr und einer Zeile der nächsten Figur ---------- */
  var ALBUM_LINES = {
    lickitcutit:{inka:'Vier Blätter, eine Figur, lauter Nähte. Ich mag die Nähte.', wagner:'Die Blätter stoßen aneinander. Das Raster hält sie, nicht der Leim.', xae:'123 mal 91. Vier Blätter. Ich habe die Fläche im Kopf. 4,48 Quadratmeter.', sigma:'... so groß. Ich passe in eines der Blätter. Zweimal.', gojira:'... (Inka: Gojira sagt, das ist noch kein Relikt. Aber bald.)'},
    clickclickboom:{inka:'Stereolithografie. Das Wort allein. Josef hat es als Text gezeichnet, dann gedruckt.', wagner:'Eine Pistole aus Schichten. Perspektive in Scheiben. Endlich jemand, der rechnet.', xae:'Click Click Boom. Drei Silben, zwei Klicks, ein Treffer. Effizient.', sigma:'... Game Over steht darauf. Ich lese es jeden Tag anders.', gojira:'... (Inka: Gojira kennt Waffen. Er blinzelt nicht.)'},
    suchbilder:{inka:'Daher kommen die zwanzig Dinge. Aus diesem Blatt. Schau genau, es fehlen welche.', wagner:'Hundert mal fünfundneunzig. Jedes Ding hat Koordinaten. Ich habe sie alle.', xae:'Ich sehe das Blatt einmal und weiß, wo alles liegt. Deshalb spiele ich nicht mit.', sigma:'... hier war ich zuerst. Zwischen den Dingen, bevor sie fielen.', gojira:'... (Inka: Gojira hat lange hingesehen. Länger als du.)'},
    cowboykaugummi:{inka:'Kein Comic, sagt Josef. Comicsprache. Ich sage: ein Kaugummi, der nicht aufhört.', wagner:'42 mal 29,5. Immer dasselbe Format. Das ist Disziplin, der Rest ist Unfug.', xae:'Popfiguren, Schrift, Tusche. Ich erkenne alle Zitate. Das sage ich ohne Stolz.', sigma:'... die Figur raucht. Ich habe das nie verstanden. Luft, die man sieht.', gojira:'... (Inka: eines der Blätter zeigt Gojira. Er hat es gesehen. Er sagt nichts.)'},
    egoshooter:{inka:'Die Perspektive der Waffe. Du siehst, was der Lauf sieht.', wagner:'Ego Shooter. Zentralperspektive in Reinkultur. Der Fluchtpunkt ist das Ziel. Ich sage das ohne Freude.', xae:'Sechzig mal fünfzig, zehn Blätter. Ich habe alle in vier Sekunden. Dein Aim braucht länger.', sigma:'... ich mag die Hände. Jemand hält etwas. Ich halte nie etwas.', gojira:'... (Inka: Gojira versteht Zielen nicht. Er ist das Ziel.)'},
    weitere:{inka:'Ein Einzelblatt. Josef nennt sie Weitere Arbeiten. Ich nenne sie die Rückseite.', wagner:'Kein Serienzwang. Ein Blatt, eine Behauptung. Prüfen Sie die Linie.', xae:'Einzelblätter von 2010 bis 2024. Ich sehe die Entwicklung. Du musst scrollen.', sigma:'... klein und allein. Das kenne ich.', gojira:'... (Inka: eines zeigt Godzilla bei Eingrabungen. Gojira hat genickt. Das Haus hat gewackelt.)'},
    draugr:{inka:'DRAUGR. Freya, Björn, die Katze. Ich kenne sie, nicht persönlich.', wagner:'Comicseiten. Panels sind Fenster, Fenster sind Perspektive. Immerhin.', xae:'Layout, Skizze, Seite. Drei Stufen. Ich hätte die zweite übersprungen.', sigma:'... die Katze. Sieh dir die Katze an. Sie sieht zurück.', gojira:'... (Inka: Gojira mag die Katze. Das ist alles, was ich weiß.)'},
    prozess:{inka:'Vom Skript zur Seite. Da liegt auch ein Skript, in dem ein Song vorkommt. Connie Converse.', wagner:'Skript, Skizze, Seite. Ein Verfahren. Ich schätze Verfahren.', xae:'Prozess heißt: man sieht die Fehler. Ich mache keine. Deshalb bin ich langweilig, sagt Inka.', sigma:'... Bleistift unter der Tusche. Wie ein Gedanke unter dem Satz.', gojira:'... (Inka: Gojira versteht Skripte. Er kommt in einem vor.)'},
    beckmann2022:{inka:'Magnete für Beckmann. Kinder haben damit Bilder gebaut. Richtige Kinder.', wagner:'Vermittlung. Man zerlegt Beckmann in Teile und setzt ihn neu zusammen. Montage. Ich billige das.', xae:'Magnete. Haftkraft etwa 0,3 Newton. Ich habe nachgesehen.', sigma:'... Dinge, die man anfassen darf. Ich kenne das nur vom Hören.', gojira:'... (Inka: Gojira war nie in der Pinakothek. Er passt nicht durch die Tür.)'}
  };
  function albumOk(f){ return f && f.id && /^w-/.test(f.id) && !/^w-(hh_|beck_[pe])/.test(f.id); }
  function albumAdd(f, how){ if (!albumOk(f)) return; var id = f.id.slice(2); S.album = S.album || {}; if (S.album[id]){ questCheck(id); return; }
    var im = f.querySelector('img'), fc = f.querySelector('figcaption'); var t = workTitle(f) || 'Ohne Titel'; var cap = fc ? fc.textContent : ''; var ym = /(\d{4}(?:\/\d{4})?)/.exec(cap); var year = ym ? ym[1] : '';
    var lines = (cap.split('\n').map(function(x){ return x.trim(); }).filter(Boolean)); var mat = lines[1] || '';
    var g = f.getAttribute('data-group') || ''; var n = Object.keys(S.album).length; var who = ['inka', 'wagner', 'xae', 'sigma', 'gojira'][n % 5];
    var line = (ALBUM_LINES[g] && ALBUM_LINES[g][who]) || (who === 'gojira' ? '... (Inka: Gojira hat es gesehen.)' : (t + (year ? ', ' + year : '') + (mat ? '. ' + mat + '.' : '.') + (who === 'wagner' ? ' Notiert.' : who === 'xae' ? ' Gespeichert.' : who === 'sigma' ? ' ... schön.' : ' Gesehen.')));
    S.album[id] = {t:Date.now(), ti:t, y:year, m:mat, g:g, who:who, l:line, src:im ? (im.currentSrc || im.src) : '', p:PAGE};
    /* Gruppengröße merken, um volle Serien zu erkennen */ S.gsize = S.gsize || {}; if (g) S.gsize[g] = [].filter.call(document.querySelectorAll('figure.work[data-group="' + g + '"]'), albumOk).length;
    save(); markNew(); questCheck(id); setTimeout(badges, 400); }
  function albumCount(){ return Object.keys(S.album || {}).length; }
  function fullSeries(){ var out = []; var gs = S.gsize || {}; Object.keys(gs).forEach(function(g){ var n = Object.keys(S.album || {}).filter(function(id){ return S.album[id].g === g; }).length; if (gs[g] && n >= gs[g]) out.push(g); }); return out; }
  var GNAME = {lickitcutit:'LICK IT CUT IT', clickclickboom:'Click Click Boom', suchbilder:'Suchbilder', cowboykaugummi:'Cowboy Kaugummi', egoshooter:'Ego Shooter', weitere:'Weitere Arbeiten', draugr:'DRAUGR', prozess:'Vom Skript zur Seite', beckmann2022:'Beckmann'};
  function albumHtml(){ var A = S.album || {}; var ids = Object.keys(A).sort(function(a, b){ return A[b].t - A[a].t; }); if (!ids.length) return '<p class="sbpnote">Noch leer. Jedes Werk, das du groß ansiehst (Klick oder fünf Sekunden darüber), wird eine Karte.</p>';
    var full = fullSeries(); var fs = full.length ? '<p class="sbpnote">Vollständig gesehen: ' + full.map(function(g){ return GNAME[g] || g; }).join(', ') + '.</p>' : '';
    return '<p class="sbpnote">' + ids.length + (ids.length === 1 ? ' Karte.' : ' Karten.') + '</p>' + fs + '<ul class="sbalbum">' + ids.map(function(id){ var a = A[id]; var R = S.ruins && S.ruins[id]; var line = R ? {inka:'Ruine. Ich war dabei. Es war laut.', wagner:'Ruine. Koordinaten gesichert, Bild verloren.', xae:'Ruine, ' + (TOOLS[R.tool] || {}).n + '. Gespeichert in voller Auflösung.', sigma:'... Ruine. Ich sehe noch weg.', gojira:'... (Inka: Gojira sagt, jetzt ist es ein Relikt.)'}[a.who] : a.l;
      return '<li class="' + (R ? 'ruin fx-' + (TOOLS[R.tool] || {}).fx : '') + '"><a href="' + (a.p === PAGE ? '' : a.p + '.html') + '#w-' + id + '">' + (a.src ? '<img src="' + a.src + '" alt="" loading="lazy">' : '') + '<b>' + esc(a.ti) + '</b>' + (a.y ? ' <span>' + esc(a.y) + '</span>' : '') + (R ? ' <span class="sbruincap">zerstört mit ' + NAMES[R.tool] + '</span>' : '') + '</a><small style="color:' + CH[a.who].col + '">' + esc(CH[a.who].name) + '</small><p>' + esc(line) + '</p></li>'; }).join('') + '</ul>'; }
  /* ---------- Aufträge (Josef, 29.10., 13:36): etwa einer je Besuch, ein Werk groß ansehen; 50 Punkte und Nähe ---------- */
  var QUESTS = [
    {id:'infreefall2017', p:'kunst', who:'wagner', t:'Sehen Sie sich [w:kunst:infreefall2017|In free fall] an, in der Großansicht. Vier Blätter, ein Fall. Ich will wissen, ob das Raster hält.'},
    {id:'ck17', p:'kunst', who:'inka', t:'Such mir [w:kunst:ck17|UUUH! Godzilla] in Cowboy Kaugummi und schau es dir groß an. Ich will wissen, ob er aussieht wie der echte.'},
    {id:'suchbild2', p:'kunst', who:'sigma', t:'... sieh dir das [w:kunst:suchbild2|Suchbild] an, groß. Da komme ich her, irgendwie. Zähl die Löcher.'},
    {id:'ccb_model', p:'kunst', who:'xae', t:'Schau dir [w:kunst:ccb_model|Click Click Boom] an, die Stereolithografie. Ich will deine Meinung zur Auflösung.'},
    {id:'freya', p:'comic', who:'inka', t:'Schau dir die [w:comic:freya|Figurenstudie für DRAUGR, Freya] groß an. Ich kenne sie. Nicht persönlich.'},
    {id:'es2013_1', p:'kunst', who:'wagner', t:'[w:kunst:es2013_1|Ego Shooter], das erste Blatt. Sehen Sie es sich an und sagen Sie mir, wo der Fluchtpunkt liegt. Ich behaupte: außerhalb.'},
    {id:'axolotl2016', p:'kunst', who:'sigma', t:'... das [w:kunst:axolotl2016|AX0LOTL]. Klein. Sieh es dir groß an, für mich. Ich mag Dinge, die im Wasser atmen.'},
    {id:'ck14', p:'kunst', who:'xae', t:'Schau dir [w:kunst:ck14|404 Page not found] an. Es gibt hier auch eine echte Seite 404. Vergleich mal.'},
    {id:'lickit2015', p:'kunst', who:'inka', t:'[w:kunst:lickit2015|Lick it], neun Blätter, Installationsansicht. Schau es dir groß an und sag mir, ob die Wand hält.'},
    {id:'ot2013_treppe', p:'kunst', who:'wagner', t:'Das [w:kunst:ot2013_treppe|Treppenhaus] von 2013. Eine Treppe ist Perspektive in Reinform. Großansicht, bitte.'},
    {id:'godzilla_eingrabungen', p:'kunst', who:'gojira', t:'Gojira will, dass du dir [w:kunst:godzilla_eingrabungen|Godzilla bei Eingrabungen] ansiehst. Groß. Er sagt nicht, warum. Ich glaube, er findet sich ähnlich.'},
    {id:'beck_m02', p:'vermittlung', who:'sigma', t:'... die [w:vermittlung:beck_m02|Magnete] für Beckmann. Sieh dir eines groß an. Dinge, die man anfassen darf, kenne ich nur vom Hören.'}
  ];
  function offerQuest(kind){ if (quiet() || dlg) return false; var q = S.quest; if (q && q.v === V()) return false; if (q && !q.done && V() - q.v < 2) return false;   /* ein offener Auftrag bleibt einen Besuch lang stehen */
    var pool = QUESTS.filter(function(x){ return !(S.album && S.album[x.id]) && !(S.qdone && S.qdone[x.id]); });
    /* Wiederherstellung (Etappe 6): Sigma bittet, ein zerstörtes Werk noch einmal groß anzusehen; dann kommt es zurück */
    var ruins = Object.keys(S.ruins || {}); if (ruins.length && (kind === 'restore' || Math.random() < .5 || !pool.length)){ var rid = pickOne(ruins), RR = S.ruins[rid]; var al = S.album && S.album[rid]; var ti = al ? al.ti : 'das Werk'; pool = [{id:rid, p:RR.p, who:'sigma', restore:1, t:'... sieh dir [w:' + RR.p + ':' + rid + '|' + ti + '] noch einmal an, groß. Das, was du mit ' + NAMES[RR.tool] + ' zerstört hast. [p:.5] Vielleicht kann ich es zurückholen, wenn du hinsiehst.'}]; }
    if (!pool.length) return false; var Q = pickOne(pool); var spk = Q.who === 'gojira' ? 'inka' : Q.who;
    var intro = Q.who === 'gojira' ? [['gojira', '...']] : [];
    var ask = {who:spk, text:Q.t + ' Fünfzig Punkte, wenn du es dir ansiehst. Machst du das?', ask:[{s:'d', t:'Gern. Ich sehe es mir an.', re:[[spk, '[m:froh]Gut. Ich warte.']]}, {s:'a', t:'Klar, wo ist es?', re:[[spk, 'Auf der Seite ' + {kunst:'Bildende Kunst', comic:'Comic', vermittlung:'Vermittlung'}[Q.p] + '. Der Name ist ein Link.']]}, {s:'p', t:'Ich lasse mir keine Aufträge geben.', re:[[spk, '[m:wuetend]Dann nicht. [m:neutral]Es liegt trotzdem da.']]}, {s:'v', t:'Vielleicht später.', re:[[spk, '[m:nachdenklich]Später. Ich merke es mir.']]}]};
    ask.ask[0].fn = ask.ask[1].fn = function(){ S.quest = {id:Q.id, who:Q.who, v:V(), done:0, t:Q.t, restore:Q.restore || 0}; save(); markNew(); }; ask.ask[2].fn = ask.ask[3].fn = function(){ S.quest = {id:Q.id, who:Q.who, v:V(), done:0, declined:1, t:Q.t, restore:Q.restore || 0}; save(); };
    if (Q.restore) ask.text = Q.t + ' Machst du das?';
    if (Q.who === 'wagner') ask.text = ask.text.replace('Machst du das?', 'Machen Sie das?');
    dialog(intro.concat([ask])); return true; }
  function questCheck(id){ var q = S.quest; if (!q || q.done || q.declined || q.id !== id) return; q.done = Date.now();
    if (q.restore){ if (S.ruins) delete S.ruins[id]; save(); var f = document.getElementById('w-' + id); unruin(f, id); S.quests = (S.quests || 0) + 1; var R2 = rel('sigma'); R2.n = Math.min(3, R2.n + 1); save(); refresh(); H('onRestore', id); setTimeout(function(){ dialog([['sigma', '[m:froh]... da. Es ist wieder da. Ich habe es zurückgeholt, aus meiner Welt. [p:.5] Sag es niemandem. Wagner würde fragen, wie.'], ['inka', 'Das Werkzeug bleibt verbraucht. Das Bild ist zurück. Ein Tausch.', 'nachdenklich']]); }, 900); return; } S.questBonus = (S.questBonus || 0) + 50; S.quests = (S.quests || 0) + 1; S.qdone = S.qdone || {}; S.qdone[id] = 1; var R = rel(q.who); R.n = Math.min(3, R.n + 1); save(); refresh(); tick();
    var spk = q.who === 'gojira' ? 'inka' : q.who; setTimeout(function(){ dialog((q.who === 'gojira' ? [['gojira', '... ...']] : []).concat([[spk, (q.who === 'gojira' ? 'Gojira hat es gesehen, dass du es gesehen hast. ' : '') + '*Auftrag erledigt.* Fünfzig Punkte. ' + {inka:'Und? Sag nichts, ich sehe es dir an.', wagner:'Ihre Koordinaten stimmen. Ich trage Sie ein.', xae:'Zeit: akzeptabel. Für dich.', sigma:'... danke. Jetzt haben wir beide hingesehen.', gojira:'Ich glaube, das war ein Danke.'}[q.who], 'froh']])); setTimeout(badges, 600); }, 900); }
  function questHtml(){ var q = S.quest; if (!q) return '<p>Noch keiner. Die Figuren fragen beim nächsten Besuch.</p>'; var Q = QUESTS.filter(function(x){ return x.id === q.id; })[0] || (q.t ? {t:q.t} : null); var t = Q ? Q.t.replace(/\[w:([a-z]+):([^|\]]+)\|([^\]]+)\]/g, function(_, pg, id, ti){ return '<a href="' + (pg === PAGE ? '' : pg + '.html') + '#w-' + id + '">' + ti + '</a>'; }) : '';
    return '<p><b style="color:' + CH[q.who].col + '">' + CH[q.who].name + '</b> ' + t + '</p><p>' + (q.done ? 'Erledigt, 50 Punkte.' : q.declined ? 'Abgelehnt. Das Werk liegt trotzdem da.' : 'Offen: das Werk groß ansehen.') + (S.quests ? ' Insgesamt ' + S.quests + (S.quests === 1 ? ' Auftrag erledigt.' : ' Aufträge erledigt.') : '') + '</p>'; }
  /* ---------- Abzeichen (Josef, 29.10., 13:34: etwa 12, mit Figurenzeile) ---------- */
  var BADGES = [
    ['erster', 'Erster Fund', function(){ return count() >= 1; }, 'inka', 'Eins. Der Anfang zählt doppelt, sagt niemand.'],
    ['fuenf', 'Fünf', function(){ return count() >= 5; }, 'wagner', 'Fünf Punkte im Raster. Eine Linie, wenn man großzügig ist.'],
    ['zehn', 'Halbzeit', function(){ return count() >= 10; }, 'xae', 'Zehn. Die Hälfte. Ich sage nichts zur Zeit.'],
    ['alle', 'Alle zwanzig', function(){ return !!S.done; }, 'gojira', 'Gojira gratuliert. Das Haus wackelt.'],
    ['rein', 'Ohne Hinweis', function(){ return !!S.done && !(S.hints); }, 'wagner', 'Keine Koordinaten gekauft. Respekt. Das Wort steht jetzt da.'],
    ['wieder', 'Wiederkehrer*in', function(){ return V() >= 3; }, 'inka', 'Dreimal da. Du gehörst jetzt zum Inventar.'],
    ['nacht', 'Nachtaktiv', function(){ return !!S.night; }, 'sigma', '... du suchst nachts. Ich auch. Hinter dem Glas ist es immer hell.'],
    ['leser', 'Leser*in', function(){ return (S.ops || 0) >= 3; }, 'xae', 'Drei Texte zu Ende und drei Urteile. Statistisch selten.'],
    ['sammler', 'Sammler*in', function(){ return albumCount() >= 10; }, 'inka', 'Zehn Karten im Album. Josef würde sich freuen. Ich sag es ihm nicht.'],
    ['serie', 'Serienkenner*in', function(){ return fullSeries().length > 0; }, 'wagner', 'Eine Serie vollständig gesehen. Das nenne ich Methode.'],
    ['freund', 'Vertraut', function(){ return ['inka', 'wagner', 'xae', 'sigma', 'gojira'].some(function(w){ return rel(w).n >= 2; }); }, 'sigma', '... jemand hier mag dich. Ich verrate nicht, wer.'],
    ['auftrag', 'Auftrag erledigt', function(){ return (S.quests || 0) >= 1; }, 'wagner', 'Auftrag erfüllt. Fünfzig Punkte, wie vereinbart.'],
    ['plus', 'Plus', function(){ return NG >= 1 || (S.ranks || []).some(function(r){ return r >= 1; }); }, 'inka', 'Zweite Runde. Die Dinge sind kleiner, du nicht.'],
    ['konami', 'Code', function(){ return !!S.konami; }, 'gojira', 'Gojira hat den Code gehört. Er kannte ihn.'],
    ['sturm', 'Bilderstürmer*in', function(){ return ruinCount() >= 3; }, 'wagner', 'Drei Werke. Sie zerstören mit Methode. Das respektiere ich, gegen meinen Willen.']
  ];
  function badgeLines(){ S.badges = S.badges || {}; var fresh = []; BADGES.forEach(function(b){ if (!S.badges[b[0]] && b[2]()){ S.badges[b[0]] = Date.now(); fresh.push(b); } }); if (!fresh.length) return []; save(); markNew();
    var lines = []; fresh.forEach(function(b){ if (b[3] === 'gojira') lines.push(['gojira', '...'], ['inka', '*Abzeichen: ' + b[1] + '.* ' + b[4], 'froh']); else lines.push([b[3], '*Abzeichen: ' + b[1] + '.* ' + b[4], 'froh']); }); return lines; }
  var pendBadges = [];
  function badges(silent){ var lines = pendBadges.concat(badgeLines()); pendBadges = []; if (!lines.length || silent) return; if (quiet() && !dlg) return;   /* bei Psst: still ins Logbuch */
    if (document.querySelector('.lb2.on') || mo || ov){ pendBadges = lines; setTimeout(badges, 1500); return; }   /* nicht über der Großansicht, dem Modem oder der Urkunde */
    dialog(lines); }
  function badgeHtml(){ S.badges = S.badges || {}; var n = Object.keys(S.badges).length; return '<p class="sbpnote">' + n + ' von ' + BADGES.length + '.</p><ul class="sbbadges">' + BADGES.map(function(b){ var got = S.badges[b[0]]; return '<li class="' + (got ? 'got' : 'open') + '"><b>' + (got ? esc(b[1]) : '?') + '</b>' + (got ? '<small style="color:' + CH[b[3]].col + '">' + CH[b[3]].name + '</small><p>' + esc(b[4]) + '</p>' : '<p>' + esc({erster:'Ein Fund.', fuenf:'Fünf Funde.', zehn:'Zehn Funde.', alle:'Alle zwanzig.', rein:'Alle zwanzig ohne Hinweis.', wieder:'Drei Besuche.', nacht:'Ein Fund nachts.', leser:'Drei Texte gelesen und beurteilt.', sammler:'Zehn Karten im Album.', serie:'Eine Serie vollständig gesehen.', freund:'Nähe zu einer Figur.', auftrag:'Ein Auftrag erledigt.', plus:'Neues Spiel Plus.', konami:'Ein alter Code.', sturm:'Drei Werke zerstört.'}[b[0]]) + '</p>') + '</li>'; }).join('') + '</ul>'; }
  /* Konami-Code ruft Gojira (Josef, 29.10., 13:34) */
  (function(){ var seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], at = 0;
    document.addEventListener('keydown', function(e){ if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return; var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; at = (k === seq[at]) ? at + 1 : (k === seq[0] ? 1 : 0); if (at < seq.length) return; at = 0;
      S.konami = Date.now(); save(); if (dlg) return; dialog([['gojira', '...'], ['gojira', '... ... ...'], ['inka', 'Du hast Gojira gerufen. Mit dem alten Code. Er sagt: Er hat ihn auch mal benutzt, 1986, auf einem Schiff.', 'ueberrascht'], ['gojira', '...']], function(){ setTimeout(badges, 300); }); }); })();
  /* ---------- Stimmung der Seite (Josef, 29.10., 13:34): die nächste Figur färbt die Seite, subtil; Randnotizen bei gutem Verhältnis ---------- */
  function closest(){ var best = null, bn = 1; ['inka', 'wagner', 'xae', 'sigma', 'gojira'].forEach(function(w){ var n = rel(w).n; if (n >= 2 && n > bn){ bn = n; best = w; } }); return best; }
  function mood(){ var w = closest(); if (!w || !S.rel) return; document.documentElement.classList.add('sbmood', 'sbmood-' + w);
    if (w === 'xae' && window.JK_CF){ var orig = window.JK_CF; window.JK_CF = function(k){ var v = orig(k); if (k === 'plot.speed') return ((v === undefined || v === null || v === '') ? 1.25 : v) * 1.3; return v; }; }   /* X Æ A-13: schneller schreiben */
    /* Randnotizen: eine je Serie, handschriftlich in Figurenfarbe, vom Plotter geschrieben */
    document.querySelectorAll('section.series[id]').forEach(function(sec){ var g = sec.id, t = ALBUM_LINES[g] && ALBUM_LINES[g][w]; if (!t || sec.querySelector('.sbmarg')) return; var tw = sec.querySelector('.textwrap') || sec.querySelector('.grid'); if (!tw) return;
      var a = document.createElement('aside'); a.className = 'sbmarg hand'; a.style.color = CH[w].col; a.setAttribute('aria-label', 'Randnotiz von ' + CH[w].name); a.textContent = t.replace(/^\.\.\. \(Inka: |\)$/g, ''); tw.parentNode.insertBefore(a, tw);
      if ('IntersectionObserver' in window && window.JK_PLOT_ONCE){ var io = new IntersectionObserver(function(es){ es.forEach(function(en){ if (!en.isIntersecting) return; io.disconnect(); try { window.JK_PLOT_ONCE(a, 2600); } catch(e){} }); }, {threshold:.5}); io.observe(a); } }); }


  /* ---------- Werke zerstören (Suchbild 2.0, Etappe 6; Josef, 29.10., 13:42 bis 13:50) ----------
     Jedes gefundene Ding ist einmal ein Werkzeug mit eigener Wirkung und eigenem Klang. Bedienung: im Inventar ein Ding wählen, dann aufs Werk klicken (Escape bricht ab); vorher fragt eine Figur.
     Nur Josefs eigene Werke. Zerstörtes bleibt (nur in diesem Browser), wiederherstellbar über einen Auftrag von Sigma. Dahinter kommt eine Notiz zum Vorschein, auf Plus-Stufen ein verstecktes Ding. */
  var TOOLS = {
    flamme:{n:'Brandloch', fx:'burn', big:1, snd:[1400, 900, 120, 'lowpass']}, bombe:{n:'Krater', fx:'crater', big:1, snd:[1200, 120, 40, 'lowpass']}, schere:{n:'Schnitte', fx:'cuts', snd:[90, 2500, 5000, 'highpass', 3]},
    betonmischer:{n:'Beton', fx:'concrete', big:1, snd:[1600, 300, 90, 'lowpass']}, krokodil:{n:'Bisse', fx:'bites', big:1, snd:[160, 500, 180, 'bandpass', 4]}, hai:{n:'Wasser', fx:'water', big:1, snd:[1800, 400, 1600, 'bandpass']},
    klopapier:{n:'eingewickelt', fx:'wrap', snd:[700, 3000, 1500, 'highpass']}, bier:{n:'verschmiert', fx:'smear', snd:[600, 800, 300, 'bandpass']}, zigarette:{n:'Brandflecke', fx:'spots', snd:[300, 1200, 400, 'lowpass', 3]},
    sonne:{n:'ausgebleicht', fx:'bleach', snd:[2200, 4000, 8000, 'highpass']}, spiegel:{n:'gespiegelt', fx:'mirror', snd:[500, 3000, 6000, 'bandpass']}, ziegel:{n:'eingemauert', fx:'wall', snd:[260, 200, 100, 'lowpass', 5]},
    anker:{n:'versenkt', fx:'sunk', snd:[2000, 240, 60, 'lowpass']}, burger:{n:'Fettflecken', fx:'grease', snd:[400, 500, 200, 'lowpass']}, brief:{n:'überklebt', fx:'paper', snd:[500, 2500, 1200, 'highpass']},
    maus:{n:'angeknabbert', fx:'nibble', snd:[120, 1800, 900, 'bandpass', 6]}, sticker:{n:'beklebt', fx:'sticker', snd:[180, 1500, 600, 'bandpass', 2]}, kaese:{n:'Löcher', fx:'holes', snd:[220, 900, 300, 'bandpass', 3]},
    cocktail:{n:'verschüttet', fx:'spill', snd:[900, 1200, 500, 'bandpass']}, krabbe:{n:'zerkratzt', fx:'scratch', snd:[140, 3500, 5000, 'highpass', 5]} };
  var BEHIND = ['Dahinter, mit Bleistift: "Felix, der Text ist zu lang." Und darunter, in anderer Schrift: "Nein."', 'Dahinter eine Koordinate in Wagners Schrift: 48.137, 11.575. Das ist München, Mitte.', 'Dahinter ein Zettel von Sigma: "Ich war hier. 137b. Nicht final."',
    'Dahinter steht in Inkas Handschrift: "Die Krähen verstehen den Hügel. Ich verstehe die Krähen." Sie will nicht, dass du das liest.', 'Dahinter eine Liste von X Æ A-13: 112 Ziffern. Er sagt, es ist eine Telefonnummer.', 'Dahinter ein Fußabdruck. Zu groß für diese Seite. Inka sagt: Gojira war hier, vor dem Papier.',
    'Dahinter, klein: "Pretty" und ein Fragezeichen. Inka übermalt es sofort und sagt, das war nichts.', 'Dahinter das Raster. Nur das Raster. Wagner lächelt, zum ersten Mal.', 'Dahinter eine Skizze des Terrariums, von außen. Sigma hat sie nie gesehen.',
    'Dahinter steht: "Skript, Seite 12: Wagner fällt." Und ein Datum, das noch nicht war.', 'Dahinter ein Loch im Papier, und dahinter noch eines. Inka: "Nicht weiter. Da ist die Startseite."', 'Dahinter eine Notiz von Josef an sich selbst: "Comic oder Kunst. Beides. Montag und Dienstag."'];
  function ruinSnd(tool){ var A = window.JK_AUDIO && window.JK_AUDIO(); if (!A || A.vol === 0) return; var T = TOOLS[tool]; if (!T) return; var c = T.snd, ac = A.ac, reps = c[4] || 1;
    for (var r = 0; r < reps; r++){ var t = ac.currentTime + .02 + r * (c[0] / 1000 + .06); var dur = c[0] / 1000; var len = Math.max(1, Math.floor(ac.sampleRate * dur)); var buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
      var src = ac.createBufferSource(); src.buffer = buf; var f = ac.createBiquadFilter(); f.type = c[3]; f.frequency.setValueAtTime(c[1], t); f.frequency.exponentialRampToValueAtTime(Math.max(30, c[2]), t + dur); f.Q.value = 1.2; var g = ac.createGain(); g.gain.setValueAtTime(T.big ? .9 : .5, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); src.connect(f); f.connect(g); g.connect(A.bus); src.start(t); src.stop(t + dur + .02); }
    if (T.big) rumbleLite(); }
  function rumbleLite(){ document.documentElement.classList.add('beben'); setTimeout(function(){ document.documentElement.classList.remove('beben'); }, 900); }
  var TOOLACT = null, toolLab = null;
  function startTool(id){ if (!(S.found[id] || crafted()[id]) || (S.used && S.used[id]) || !TOOLS[id]) return; TOOLACT = id; H('onTool', id); document.documentElement.classList.add('sbtoolon');
    if (!toolLab){ toolLab = document.createElement('div'); toolLab.className = 'sbtoollab'; toolLab.setAttribute('role', 'status'); document.body.appendChild(toolLab); }
    toolLab.innerHTML = '<img src="' + SPR(id + '.png') + '" alt=""><span><b>' + NAMES[id] + '</b> (' + TOOLS[id].n + '): Klick auf eines von Josefs Werken. <kbd>Esc</kbd> bricht ab.</span><button type="button" class="x" aria-label="Abbrechen">×</button>'; toolLab.classList.add('on');
    toolLab.querySelector('.x').addEventListener('click', stopTool); cursorSnd('ok'); }
  function stopTool(){ TOOLACT = null; document.documentElement.classList.remove('sbtoolon'); if (toolLab) toolLab.classList.remove('on'); }
  function ruinable(f){ return albumOk(f) && !(S.ruins && S.ruins[f.id.slice(2)]); }
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && TOOLACT){ stopTool(); } });
  document.addEventListener('click', function(e){ if (!TOOLACT) return; var f = e.target.closest && e.target.closest('figure.work'); if (!f){ if (!e.target.closest('.sbtoollab, .sbfab, .sbdlg, .sbpanel')) stopTool(); return; } e.preventDefault(); e.stopPropagation();
    if (!ruinable(f)){ dialog([['inka', albumOk(f) ? 'Das ist schon kaputt. Einmal reicht.' : 'Nicht das. Das ist nicht von Josef.']]); return; } askRuin(f, TOOLACT); }, true);
  function askRuin(f, tool){ stopTool(); var T = TOOLS[tool], t = workTitle(f) || 'dieses Werk'; var id = f.id.slice(2);
    var who = T.big ? pickOne(['xae', 'inka']) : pickOne(['sigma', 'wagner', 'inka']);
    var Q = {inka:{who:'inka', mood:'ueberrascht', text:'*' + NAMES[tool] + '* auf *' + t + '*? [m:froh]Das wird ' + T.n + '. Ich bin dafür. Josef nicht, wahrscheinlich. Wirklich?'},
      wagner:{who:'wagner', mood:'nachdenklich', text:'Sie wollen *' + t + '* mit *' + NAMES[tool] + '* bearbeiten. Das stört die Ordnung. [p:.4] Andererseits: Darunter könnte etwas Wahres liegen. Entscheiden Sie.'},
      xae:{who:'xae', text:'*' + NAMES[tool] + '*. Das ist spektakulär, das gebe ich zu. *' + t + '* wird danach ' + T.n + ' sein. Unwiderruflich, bis jemand fragt. Also?'},
      sigma:{who:'sigma', mood:'traurig', text:'... bitte nicht *' + t + '*. [p:.6] Oder doch. Ich weiß nicht. [m:nachdenklich]Dahinter ist vielleicht etwas. Willst du es wirklich?'}}[who];
    Q.ask = [{s:'d', t:'Nein, lass es.', re:[[who, who === 'sigma' ? '[m:froh]... danke.' : who === 'inka' ? '[m:nachdenklich]Schade. Ich hätte zugesehen.' : 'Vernünftig. Oder feige. Beides passiert.']]},
      {s:'p', t:'Ja. Jetzt.', fn:function(){ setTimeout(function(){ ruin(f, tool); }, 400); }, re:[[who, who === 'sigma' ? '[m:traurig]... gut.' : who === 'inka' ? '[m:froh]Los.' : who === 'xae' ? '[m:froh]Endlich jemand mit Entschluss.' : '[m:nachdenklich]Wie Sie wollen. Ich notiere die Koordinaten vorher.']]},
      {s:'a', t:'Mach es. Ich will sehen, was dahinter ist.', fn:function(){ setTimeout(function(){ ruin(f, tool); }, 400); }, re:[[who, who === 'sigma' ? '[m:nachdenklich]... dahinter. Ja. Sieh hin.' : '[m:froh]Dahinter. Gut. Hinsehen ist der Punkt.']]},
      {s:'v', t:'Ich weiß nicht.', re:[[who, who === 'sigma' ? '[m:froh]... dann lassen wir es. Für heute.' : '[m:nachdenklich]Dann nicht. Das Ding bleibt im Inventar.']]}];
    dialog([Q]); }
  function ruin(f, tool){ if (!f || !TOOLS[tool]) return; var id = f.id.slice(2), T = TOOLS[tool]; S.ruins = S.ruins || {}; S.used = S.used || {}; if (S.ruins[id]) return;
    var bi = Object.keys(S.ruins).length % BEHIND.length; S.ruins[id] = {tool:tool, t:Date.now(), p:PAGE, g:f.getAttribute('data-group') || '', b:bi, rx:20 + Math.round(Math.random() * 60), ry:20 + Math.round(Math.random() * 60)}; S.used[tool] = Date.now(); save(); stopTool(); H('onRuin', id);
    ruinSnd(tool); applyRuin(f, S.ruins[id], true); refresh(); markNew();
    /* Verhältnisse: Inka näher, Sigma ferner, Wagner Respekt bei Großem, X Æ A-13 nah bei Großem, Respekt minus bei Kleinem */
    rel('inka').n = Math.min(3, rel('inka').n + 1); rel('sigma').n = Math.max(-3, rel('sigma').n - 1); if (T.big){ rel('wagner').r = Math.min(3, rel('wagner').r + 1); rel('xae').n = Math.min(3, rel('xae').n + 1); } else rel('xae').r = Math.max(-3, rel('xae').r - 1); save();
    var t = workTitle(f) || 'Das Werk', n = Object.keys(S.ruins).length;
    var L = [['inka', pickOne(['*' + t + '*: ' + T.n + '. Das hat gesessen. Schau, was dahinter liegt.', 'Oh. [m:froh]Das war laut. ' + t + ' ist jetzt ' + T.n + '. Lies, was darunter stand.']), 'froh'],
      ['sigma', pickOne(['... [p:.8] warum. Es war ein Bild. Es hat niemandem etwas getan.', '... ich sehe weg. [p:.5] Sag mir, wenn es vorbei ist.']), 'traurig'],
      ['wagner', T.big ? 'Ordnung gestört, Wahrheit freigelegt. Beides zugleich. [m:nachdenklich]Ich hasse es, dass es stimmt.' : 'Kleinlich. Aber auch Kleinlichkeit hinterlässt Koordinaten.', T.big ? 'nachdenklich' : 'neutral'],
      ['xae', T.big ? '[m:froh]Das war spektakulär. Ich speichere das in voller Auflösung.' : '[m:nachdenklich]Das war ... klein. Ich habe nicht einmal gezoomt.']];
    if (NG >= 1){ var hid = [].filter.call(document.querySelectorAll('img.sbobj:not(.found)'), function(o){ return o._p; })[0]; if (hid){ var sz = hid.offsetWidth || SIZE[hid._p.d]; if (getComputedStyle(f).position === 'static') f.style.position = 'relative'; f.appendChild(hid); hid.style.left = 'calc(50% - ' + sz / 2 + 'px)'; hid.style.top = 'calc(50% - ' + sz / 2 + 'px)'; hid.classList.add('pop'); L.push(['inka', 'Und da: Unter dem Bild lag eines der Dinge. Sigma hat es dort versteckt. Klick drauf.', 'ueberrascht']); } }
    if (n === 3) L.push(['inka', 'Drei Werke. Wagner nennt dich jetzt Bilderstürmer*in. Das steht auf deiner Urkunde.', 'nachdenklich']);
    if (n === 8) L.push(['gojira', '...'], ['inka', 'Gojira hat aufgesehen. Er sagt: Wenn du so weitermachst, gräbt er am Ende alles ein. Die ganze Seite.', 'ueberrascht']);
    setTimeout(function(){ dialog(L.concat(badgeLines())); }, 700); }
  /* Wirkungen bleiben in der Großansicht (Josef, 12.11.2026): Klassen aufs große Bild, Überlagerung folgt Zoom und Verschieben */
  var lbObs = null;
  function lbRuin(a){ var lb = document.querySelector('.lb2'); if (!lb) return; var img = lb.querySelector('img.main'), stage = lb.querySelector('.stage'); if (!img || !stage) return;
    if (lbObs){ lbObs.disconnect(); lbObs = null; } var old = lb.querySelector('.lbruinov'); if (old) old.remove();
    [].slice.call(img.classList).forEach(function(c){ if (c === 'lbruin' || /^fx-/.test(c)) img.classList.remove(c); }); if (img.style.scale) img.style.scale = ''; if (img.style.translate) img.style.translate = '';
    var f = a && a.closest && a.closest('figure.work.ruin'); if (!f) return;
    var fx = [].slice.call(f.classList).filter(function(c){ return /^fx-/.test(c); }); if (!fx.length) return;
    img.classList.add('lbruin'); fx.forEach(function(c){ img.classList.add(c); });
    var ov = document.createElement('div'); ov.className = 'lbruinov ' + fx.join(' '); ov.setAttribute('aria-hidden', 'true'); ov.style.setProperty('--rx', f.style.getPropertyValue('--rx') || '50%'); ov.style.setProperty('--ry', f.style.getPropertyValue('--ry') || '50%'); stage.appendChild(ov);
    var mirror = fx.indexOf('fx-mirror') >= 0;
    function sync(){ if (!ov.parentNode) return; ov.style.left = img.offsetLeft + 'px'; ov.style.top = img.offsetTop + 'px'; ov.style.width = img.offsetWidth + 'px'; ov.style.height = img.offsetHeight + 'px'; ov.style.transform = img.style.transform || '';
      if (mirror){ var m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([-\d.]+)\)/.exec(img.style.transform || '') || [0, 0, 0, 1]; var t = (2 * (+m[1]) + (+m[3]) * img.offsetWidth) + 'px 0px'; if (img.style.scale !== '-1 1') img.style.scale = '-1 1'; if (img.style.translate !== t) img.style.translate = t; } }
    sync(); img.addEventListener('load', sync); setTimeout(sync, 60); setTimeout(sync, 400);
    lbObs = new MutationObserver(sync); lbObs.observe(img, {attributes:true, attributeFilter:['style', 'src']}); }
  window.addEventListener('jk:lb', function(e){ try { lbRuin(e.detail && e.detail.a); } catch(_){} });
  window.addEventListener('resize', function(){ var a = document.querySelector('.lb2.on .lbruinov'); if (a && lbObs){ var im = document.querySelector('.lb2 img.main'); if (im) im.style.transform = im.style.transform; } });
  function applyRuin(f, R, fresh){ if (!f || f.classList.contains('ruin')) return; var T = TOOLS[R.tool] || TOOLS.flamme; f.classList.add('ruin', 'fx-' + T.fx); if (T.fx2) f.classList.add('fx-' + T.fx2); if (fresh) f.classList.add('fresh'); f.style.setProperty('--rx', R.rx + '%'); f.style.setProperty('--ry', R.ry + '%');
    var fc = f.querySelector('figcaption'); if (fc && !fc.querySelector('.sbruincap')){ var sp = document.createElement('span'); sp.className = 'sbruincap'; sp.textContent = 'zerstört mit ' + NAMES[R.tool] + ' am ' + new Date(R.t).toLocaleDateString('de-DE'); fc.appendChild(document.createElement('br')); fc.appendChild(sp); }
    if (!f.querySelector('.sbbehind')){ var b = document.createElement('p'); b.className = 'sbbehind hand'; b.textContent = BEHIND[R.b % BEHIND.length]; f.appendChild(b); if (window.JK_PLOT_ONCE && 'IntersectionObserver' in window){ var io = new IntersectionObserver(function(es){ es.forEach(function(en){ if (!en.isIntersecting) return; io.disconnect(); try { window.JK_PLOT_ONCE(b, 3000); } catch(e){} }); }, {threshold:.4}); io.observe(b); } }
    var sec = f.closest('section'); if (sec) sec.classList.add('sbruined'); }
  function unruin(f, id){ if (!f) return; f.classList.remove('ruin', 'fresh'); [].slice.call(f.classList).forEach(function(c){ if (/^fx-/.test(c)) f.classList.remove(c); }); var c = f.querySelector('.sbruincap'); if (c){ if (c.previousSibling && c.previousSibling.tagName === 'BR') c.previousSibling.remove(); c.remove(); } var b = f.querySelector('.sbbehind'); if (b) b.remove();
    var sec = f.closest('section'); if (sec && !sec.querySelector('figure.ruin')) sec.classList.remove('sbruined'); }
  function applyRuins(){ var R = S.ruins || {}; Object.keys(R).forEach(function(id){ var f = document.getElementById('w-' + id); if (f) applyRuin(f, R[id]); }); if (Object.keys(R).length && window.JK_PLOT_REBUILD && document.querySelector('.sbruined .plotted')) try { window.JK_PLOT_REBUILD(); } catch(e){} }
  function ruinCount(){ return Object.keys(S.ruins || {}).length; }

  /* Regler-Leiste: Dialogprobe und Spielstand (nur für Josefs Feintuning) */
  window.JK_DIALOG = function(lines){ dialog(lines); };
  window.JK_SB = {state:function(){ return {found:count(), hints:S.hints || 0, points:points(), done:!!S.done, seed:S.seed, n:N, visits:S.visits || 1, bonus:S.visitBonus || 0, streak:S.streak || 1, optout:optedOut(), ng:NG, ending:S.ending || '', chap:Object.keys(S.chap || {}), unread:unreadChaps(), size:SIZE}; },
    wander:wanderNow, chapter:showChapter, album:albumCount, badges:function(){ return Object.keys(S.badges || {}); }, ruins:function(){ return S.ruins || {}; }, ruin:function(id, tool){ var f = document.getElementById('w-' + id); if (f) ruin(f, tool); }, tool:startTool, quest:function(){ return S.quest || null; }, offer:offerQuest, react:react, opinion:opinion, mood:closest,
    ids:function(){ return PLACES.map(function(p){ return p.id; }); },
    set:function(found, hints){ var ids = PLACES.map(function(p){ return p.id; }); S.found = {}; for (var i = 0; i < Math.min(found, ids.length); i++) S.found[ids[i]] = Date.now(); S.hints = hints || 0; if (found >= N){ S.done = S.done || Date.now(); } else S.done = 0; save(); },
    reset:function(){ try { localStorage.removeItem(SBK); } catch(e){} }};
  /* ---------- Gegenstände verstecken ---------- */
  var ZI = 0;
  /* Dinge in der Großansicht (Josef, 1.11., 10:55): erscheinen nur, wenn genau diese Arbeit oder Abbildung groß angesehen wird; liegen auf der sichtbaren Bildfläche */
  var LBP = [], lbObj = null, lbWatch = null;
  function lbClear(){ if (lbObj){ lbObj.remove(); lbObj = null; } clearInterval(lbWatch); }
  window.addEventListener('jk:lb', function(e){ lbClear(); var a = e.detail && e.detail.a; if (!a || optedOut()) return; var lb = document.querySelector('.lb2'), im = lb && lb.querySelector('img.main'); if (!im) return;
    LBP.forEach(function(p){ if (S.found[p.id] || lbObj) return; var t = document.querySelector(p.sel.slice(4)); if (t !== a) return;
      var o = document.createElement('img'); o.src = SPR(p.id + '.png'); o.alt = ''; o.className = 'sbobj sblb d' + p.d; o.draggable = false; var sz = SIZE[p.d]; o.style.width = sz + 'px'; o._p = p; lbObj = o;
      var hit = function(ev){ ev.preventDefault(); ev.stopPropagation(); if (S.found[p.id]) return; found(p, o, ev); setTimeout(lbClear, 700); }; o.addEventListener('pointerdown', hit, true); o.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); }, true);   /* pointerdown: die Großansicht fängt Zeiger für Ziehen und Zoomen ab */
      function put(){ if (!lbObj || !im.naturalWidth) return; var r = im.getBoundingClientRect(), k = Math.min(r.width / im.naturalWidth, r.height / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k, x0 = r.left + (r.width - w) / 2, y0 = r.top + (r.height - h) / 2;
        o.style.left = Math.round(x0 + Math.min(w - sz - 6, Math.max(6, w * p.x / 100 - sz / 2))) + 'px'; o.style.top = Math.round(y0 + Math.min(h - sz - 6, Math.max(6, h * p.y / 100 - sz / 2))) + 'px'; o.style.visibility = (im.style.transform || '').indexOf('scale(1)') >= 0 || !im.style.transform ? '' : 'hidden'; }
      lb.appendChild(o); if (im.complete) setTimeout(put, 30); im.addEventListener('load', put, {once:true}); window.addEventListener('resize', put);
      lbWatch = setInterval(function(){ if (!lb.classList.contains('on') || !lbObj){ lbClear(); return; } put(); }, 400); }); });
  function place(){ if (optedOut()) return; if (document.querySelector('.sbobj')) return; PLACES.filter(function(p){ return p.p === PAGE; }).forEach(function(p){ if (/^@lb:/.test(p.sel)){ LBP.push(p); return; } var all = document.querySelectorAll(p.sel); if (!all.length) all = document.querySelectorAll('footer .footgrid'); if (!all.length) return; var a = all[(p.i - 1) % all.length];
      if (getComputedStyle(a).position === 'static') a.style.position = 'relative';
      /* Anker mit Objekt liegt über seinen Nachbarn (gedrehte Figuren im wilden Raster bilden eigene Stapelkontexte, Test 28.10., 08:15: Betonmischer unter dem Nachbarbild) */
      if (!a.style.zIndex) a.style.zIndex = String(29 - ZI++);   /* jeder Anker liegt über seinen Nachbarn (Test 29.10., 09:20: Sonne im Startseitenfuß unter der folgenden Zeile); bleibt unter Unternavigation (45) und Kopf (50) */
      var img = document.createElement('img'); img.src = SPR(p.id + '.png'); img.alt = ''; img.className = 'sbobj d' + p.d + (S.found[p.id] ? ' found' : ''); img.draggable = false; img.setAttribute('data-id', p.id);
      var sz = SIZE[p.d]; img.style.width = sz + 'px'; var IN = 10; img.style.left = 'clamp(' + IN + 'px, calc(' + p.x + '% - ' + (sz / 2) + 'px), calc(100% - ' + (sz + IN) + 'px))'; img.style.top = 'clamp(' + IN + 'px, calc(' + p.y + '% - ' + (sz / 2) + 'px), calc(100% - ' + (sz + IN) + 'px))';   /* 10 px Abstand zum Ankerrand: gedrehte Nachbarbilder überlappen die Ecken um einige Pixel (Test 29.10., 09:00) */   /* nie über den Anker hinaus */
      img._p = p; a11yObj(img, p); img.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); found(p, img, e); }); img.addEventListener('load', function(){ clearTimeout(window.__jkUn); window.__jkUn = setTimeout(unstack, 60); });
      if (/^(UL|OL)$/.test(a.tagName)){ var li = document.createElement('li'); li.setAttribute('aria-hidden', 'true'); li.className = 'sbli'; li.appendChild(img); a.appendChild(li); } else a.appendChild(img); });   /* Listen dürfen nur li enthalten (axe, 29.10.) */
    unstack(); window.addEventListener('load', unstack); window.addEventListener('resize', unstack); }
  /* Zwei Dinge dürfen nie übereinander liegen (Test 28.10., 06:00: Bombe lag unter einem anderen Objekt): das spätere wird im Anker verschoben, bis es frei liegt */
  function unstack(){ var objs = [].slice.call(document.querySelectorAll('.sbobj:not(.sblb)')); var done = [];
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
  function found(p, img, e){ if (S.found[p.id]) return; if (!S.start) S.start = Date.now(); S.found[p.id] = Date.now(); var n = count(); if (n >= N) S.done = Date.now(); save(); H('onFound', p);
    img.classList.add('found', 'pop'); refresh(); sp('g-fund', {vol:.7, max:.35}); setTimeout(function(){ cheer(n - 1); }, 120); splash(e.clientX, e.clientY, accent(img));
    if (btn){ btn.classList.add('bump'); setTimeout(function(){ btn.classList.remove('bump'); }, 400); }
    if (window.JK_PFAHL && e.pointerType === 'mouse'){ try { window.JK_PFAHL.on(e); setTimeout(function(){ window.JK_PFAHL.off(); }, 700); } catch(x){} }
    lastAct = Date.now(); markNew(); var hh = new Date().getHours(); if (hh >= 23 || hh < 5) S.night = 1; save();
    /* Abzeichen hängen sich an den Meilenstein-Dialog; ohne Meilenstein kommen sie als eigenes kurzes Fenster (Etappe 5) */
    if (n >= N){ S.ranks = (S.ranks || []); if (S.ranks.indexOf(NG) < 0) S.ranks.push(NG); save(); }
    var bl = badgeLines(); var ms = n === 1 ? FIRST : n === 5 ? FIVE : n === 10 ? TEN() : n === 15 ? FIFTEEN : null;
    if (n >= N) setTimeout(function(){ dialog(doneLines().concat(bl), function(){ cert(); }); }, 800);
    else if (ms) setTimeout(function(){ dialog(ms.concat(bl), newChapter); }, 800);
    else if (bl.length) setTimeout(function(){ dialog(bl); }, 800);
    if (n >= 8 && n < N) setTimeout(function(){ invCheck(false); }, 1600); }
  /* Finale: drei Fassungen je Verhältnis (Sigma nah, Wagner respektvoll, sonst Inka); auf Plus-Stufe 3 entscheidet man, was mit dem Quadrat geschieht (Josef, 29.10., 13:14) */
  function doneLines(){ if (ruinCount() >= 8) return DONE4(); if (NG < 3){ var he = H('ending'); if (he) return he; } if (NG >= 3) return DONE3();
    if (rel('sigma').n >= 2) return [['gojira', '...'], ['sigma', '[m:froh]... das war Gojira. Ich übersetze heute: Das Quadrat ist für dich. Und für mich, ein bisschen. Alle zwanzig.'], ['inka', 'Sigma hat sich das letzte Wort genommen. Das kommt selten vor. Lass es ihm.', 'froh']];
    if (rel('wagner').r >= 2) return [['gojira', '...'], ['wagner', 'Gojira hat das [w:index:green|Quadrat] eingegraben. Ein Relikt vergangener Existenz, wie ich es nenne. [m:froh]Ihre Koordinaten stimmen alle. Ich notiere das.'], ['inka', 'Wagner lobt. Das steht in keinem Skript. Alle zwanzig.', 'ueberrascht']];
    return DONE; }
  /* viertes Ende (Etappe 6): wer viel zerstört hat, erlebt, wie Gojira die ganze Seite eingräbt */
  function DONE4(){ return [['gojira', '...'], ['gojira', '... ... ...'], {who:'inka', mood:'ueberrascht', text:'Alle zwanzig. Und ' + ruinCount() + ' Werke zerstört. Gojira hat zugesehen. [m:nachdenklich]Er sagt: Wo so viel kaputt ist, gräbt er alles ein. Die ganze Seite. Als Relikt. Halt dich fest.', ask:[{s:'d', t:'Das habe ich nicht gewollt.', fn:bury, re:[['inka', 'Doch. Ein bisschen. Es ist in Ordnung, Relikte sind nichts Schlimmes.']]}, {s:'p', t:'Soll er. Ich bin fertig hier.', fn:bury, re:[['inka', '[m:froh]Du bist furchtbar. Ich mag das.']]}, {s:'a', t:'Dann los. Grab.', fn:bury, re:[['gojira', '...']]}, {s:'v', t:'...', fn:bury, re:[['sigma', '... es ist still. Das ist gut. Eingegraben ist still.', 'nachdenklich']]}]}]; }
  function bury(){ S.ending = 'buried'; save(); document.documentElement.classList.add('sbburied'); var e = document.createElement('div'); e.className = 'sbearth'; e.setAttribute('aria-hidden', 'true'); document.body.appendChild(e); rumble(); setTimeout(function(){ e.classList.add('up'); }, 50); setTimeout(function(){ e.classList.add('down'); setTimeout(function(){ e.remove(); }, 2500); }, 7000); }
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
      '<p class="cp">' + (S.visits || 1) + (S.visits > 1 ? ' Besuche' : ' Besuch') + '.' + (NG ? ' Plus-Stufe ' + NG + ', Rang ' + RANKS[NG] + '.' : '') + (ruinCount() >= 3 ? ' Bilderstürmer*in (' + ruinCount() + ' Werke zerstört).' : '') + (S.ending === 'buried' ? ' Gojira hat die ganze Seite eingegraben.' : '') + (NG >= 3 && S.ending ? (S.ending === 'destroy' ? ' Das Quadrat ist zerstört. Eingegraben bleibt es trotzdem.' : S.ending === 'sigma' ? ' Das Quadrat steht vor Sigmas Glas.' : ' Das Quadrat bleibt eingegraben.') : '') + '</p><p class="cstamps" aria-label="Stempel je Besuch">' + (S.stamps || [Date.now()]).map(function(t){ return '<span title="' + new Date(t).toLocaleDateString('de-DE') + '"></span>'; }).join('') + '</p>' +
      '<div class="cname"><label>Name <input type="text" maxlength="16" pattern="[A-Za-zÄÖÜäöüß0-9 ]{1,16}" placeholder="bis 16 Zeichen"></label></div>' +
      '<div class="cbtn"><button type="button" class="png">Als Bild speichern</button>' + (navigator.share ? '<button type="button" class="share">Teilen</button>' : '') + (BOARD ? '<button type="button" class="send">In die Bestenliste</button>' : '') + '<button type="button" class="again">Neustart</button>' + (NG < 3 ? '<button type="button" class="ngplus">Neues Spiel Plus' + (NG ? ' ' + (NG + 1) : '') + '</button>' : '') + '</div>' +
      (NG < 3 ? '<p class="cnote">Neues Spiel Plus: die Dinge werden kleiner und blasser und liegen in schwereren Verstecken' + (NG === 0 ? '. Ab Stufe 2 wandern sie und Sigma spricht in Rätseln.' : (NG === 1 ? ', wandern alle zwei Minuten und Sigma spricht in Rätseln.' : ', nur noch an Rändern und in Fußzeilen. Am Ende entscheidest du.')) + '</p>' : '') +
      '<p class="cnote">' + (BOARD ? 'Die Bestenliste speichert Name, Punkte, Zeit und Datum in einer Google-Tabelle von Josef Knoll (siehe Datenschutz). ' : '') + 'Dein Stand liegt nur in diesem Browser.</p>' + mh + '</div>';
    document.body.appendChild(ov); var sq = ov.querySelector('.sq'); if (NG >= 3 && S.ending === 'destroy') sq.classList.add('broken'); if (S.ending === 'buried') sq.classList.add('buried'); if (NG) sq.classList.add('ng' + NG); setTimeout(function(){ sp('g-stempel', {vol:.9, max:.5}); }, 400);
    ov.querySelector('.x').addEventListener('click', function(){ ov.remove(); ov = null; });
    function restart(ng){ S = {found:{}, start:0, hints:0, done:0, seed:(Math.random() * 4294967295) >>> 0, visits:S.visits, streak:S.streak, lastVisit:S.lastVisit, stamps:S.stamps, visitBonus:0, introVisit:S.introVisit, rel:S.rel, chap:S.chap, tspeed:S.tspeed, wview:S.wview, ranks:S.ranks, ending:S.ending, ng:ng, album:S.album, gsize:S.gsize, badges:S.badges, ops:S.ops, quests:S.quests, qdone:S.qdone, questBonus:0, ruins:S.ruins, night:S.night, konami:S.konami, psst:S.psst}; save(); ov.remove(); ov = null; location.reload(); }
    ov.querySelector('.again').addEventListener('click', function(){ restart(NG); });
    var np = ov.querySelector('.ngplus'); if (np) np.addEventListener('click', function(){ restart(Math.min(3, NG + 1)); });
    ov.querySelector('.png').addEventListener('click', function(){ png(ov.querySelector('input').value.trim()); });
    var shb = ov.querySelector('.share'); if (shb) shb.addEventListener('click', function(){ var nm = ov.querySelector('input').value.trim(); var txt = 'Alle ' + N + ' Dinge auf theidealcity.gg gefunden, ' + points() + ' Punkte.'; png(nm, function(blob){ var f = blob ? new File([blob], 'suchbild-urkunde.png', {type:'image/png'}) : null; var data = {title:'Suchbild, theidealcity.gg', text:txt, url:'https://theidealcity.gg/'}; if (f && navigator.canShare && navigator.canShare({files:[f]})) data.files = [f]; navigator.share(data).catch(function(){}); }); });
    var sb = ov.querySelector('.send'); if (sb) sb.addEventListener('click', function(){ send(ov.querySelector('input').value.trim(), sb); });
    if (window.JK_PLOT_ONCE) ov.querySelectorAll('.cp').forEach(function(q, i){ setTimeout(function(){ window.JK_PLOT_ONCE(q, 1800); }, 200 + i * 900); }); }
  function png(name, cb){ var W = 1200, cv = document.createElement('canvas'); cv.width = W; cv.height = W; var c = cv.getContext('2d'); c.fillStyle = '#00A651'; c.fillRect(0, 0, W, W);
    var draw = function(){ c.fillStyle = '#000'; c.textAlign = 'center'; c.font = '400 150px Duerer1525, serif'; c.fillText('SUCHBILD', W / 2, 300);
      c.font = '30px Relief, "Relief SingleLine", sans-serif'; var lines = ['Alle ' + N + ' Dinge auf theidealcity.gg gefunden.', points() + ' Punkte, ' + S.hints + ' Hinweise.', new Date(S.done || Date.now()).toLocaleDateString('de-DE', {day:'numeric', month:'long', year:'numeric'})];
      if (name) lines.unshift(name); lines.forEach(function(l, i){ c.fillText(l, W / 2, 430 + i * 56); });
      c.font = '48px DuererHand, cursive'; c.fillText('eingegraben von Gojira', W / 2, 760);
      var mono = document.querySelector('header .mark svg'); var fin = function(){ if (cb){ cv.toBlob(function(b){ cb(b); }, 'image/png'); return; } var a = document.createElement('a'); a.download = 'suchbild-urkunde.png'; a.href = cv.toDataURL('image/png'); a.click(); };
      if (mono){ var im = new Image(); var sv = mono.outerHTML.replace(/currentColor/g, '#000'); if (sv.indexOf('xmlns=') < 0) sv = sv.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '); im.onload = function(){ c.drawImage(im, W / 2 - 90, 860, 180, 228); fin(); }; im.onerror = fin; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sv); } else fin(); };
    if (document.fonts && document.fonts.load){ Promise.all([document.fonts.load('150px Duerer1525'), document.fonts.load('48px DuererHand')]).then(draw, draw); } else draw(); }
  function send(name, b){ if (!/^[A-Za-zÄÖÜäöüß0-9 ]{1,16}$/.test(name)){ alert('Name: 1 bis 16 Zeichen, nur Buchstaben, Ziffern und Leerzeichen.'); return; } b.disabled = true; b.textContent = 'Sende …';
    var body = JSON.stringify({name:name, points:points(), secs:0, hints:S.hints, found:count(), bonus:S.visitBonus || 0, visits:S.visits || 1, quests:S.quests || 0, ng:NG, date:new Date(S.done || Date.now()).toISOString()});   /* Fassung 2 (Etappe 7): neue Formel, keine Zeit */
    fetch(BOARD, {method:'POST', body:body, headers:{'Content-Type':'text/plain'}}).then(function(r){ return r.json(); }).then(function(j){ b.textContent = j && j.ok ? 'Eingetragen' : ('Abgelehnt: ' + (j && j.error || '?')); if (j && j.ok){ S.boarded = Date.now(); save(); } }).catch(function(){ b.textContent = 'Keine Verbindung'; b.disabled = false; }); }

  /* ---------- Bestenliste im Abschnitt Suchbilder ---------- */
  function board(){ var sec = document.getElementById('suchbilder'); if (!sec) return; var box = document.createElement('div'); box.className = 'sbboard'; var grid = sec.querySelector('.grid, .textwrap'); 
    box.innerHTML = '<h3>Bestenliste</h3><p>Diese Website ist selbst ein Suchbild: ' + N + ' Dinge aus den drei Blättern sind auf den Seiten versteckt. Jeder Fund zählt ' + CF('game.pts', 100) + ' Punkte, jeder Hinweis (im Inventar) kostet ' + CF('game.hint', HINT_COST) + '. Die Zeit zählt nicht; Wiederkommen und Aufträge der Figuren geben Bonuspunkte. ✦ zeigt die Plus-Stufe.</p><ol></ol><p class="sbme"></p><p><a href="#" class="sbrules">Regeln noch einmal</a></p>';
    (grid ? grid.parentNode.insertBefore(box, grid.nextSibling) : sec.appendChild(box));
    var ol = box.querySelector('ol'), me = box.querySelector('.sbme'); box.querySelector('.sbrules').addEventListener('click', function(e){ e.preventDefault(); dialog(RULES); });
    var mine = count() ? ('Dein Stand: ' + count() + ' von ' + N + ', ' + points() + ' Punkte' + (S.done ? ', alles gefunden.' : '.') + (NG ? ' Plus-Stufe ' + NG + '.' : '')) : ''; me.textContent = mine;
    function show(list){ ol.innerHTML = ''; list.slice(0, 10).forEach(function(r){ var li = document.createElement('li'); li.innerHTML = '<em class="kw">' + r.points + '</em> ' + esc(r.name) + (r.ng ? ' <span class="sbng" title="Plus-Stufe ' + r.ng + '">' + '✦'.repeat(Math.min(3, r.ng)) + '</span>' : ''); ol.appendChild(li); }); }
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

  /* Schnittstelle für die Welt (assets/game/world.js, Josef, 1.11.2026) */
  var X = window.JK_SBX = {hooks:{}, S:function(){ return S; }, save:save, dialog:function(l, d, o){ return dialog(l, d, o); }, inject:function(l){ return injectFn ? injectFn(l) : false; }, busy:function(){ return !!(dlg || panel || ov || mo || document.querySelector('.lb2.on')); }, hard:function(){ return !!((dlg && !dlgSoft) || panel || ov || mo || document.querySelector('.lb2.on')); }, closeSoft:function(){ if (dlg && dlgSoft && closeCur) closeCur(); }, quiet:quiet, optedOut:optedOut, count:count, points:points, refresh:refresh, markNew:markNew, V:V, PAGE:PAGE, TOUCH:TOUCH, CF:CF, esc:esc, rel:rel, CH:CH, VOICE:VOICE, NAMES:NAMES, NG:function(){ return NG; }, ruinCount:ruinCount, chapSeen:function(){ return Object.keys(S.chap || {}).length; }, readingNow:readingNow, lastDlg:function(){ return lastDlg; }, syl:syl,
    freeHint:function(){ var left = PLACES.filter(function(p){ return !S.found[p.id]; }); if (!left.length) return; var here = left.filter(function(p){ return p.p === PAGE; }); hintFor((here.length ? here : left)[0]); S.hints = Math.max(0, S.hints - 1); save(); refresh(); }};
  function H(n){ var f = X.hooks[n]; if (!f) return undefined; try { return f.apply(null, [].slice.call(arguments, 1)); } catch(e){ try { console.warn('world', n, e); } catch(_){} return undefined; } }
  function loadWorld(){ if (optedOut() && !S.done) {} var sc = document.querySelector('script[src*="game.js"]'); var v = sc ? ((sc.src.match(/[?&]v=([^&]+)/) || [])[1] || '') : ''; var s2 = document.createElement('script'); s2.src = '../assets/game/world.js' + (v ? '?v=' + v : ''); s2.defer = true; document.head.appendChild(s2); }
  /* Dev Tools (Josef, 1.11.2026, T13 bis T17): Zugriff aufs Innere, nur nach Freischaltung genutzt */
  X.dev = {S:function(){ return S; }, PLACES:PLACES, N:N, CHAPTERS:CHAPTERS, NAMES:NAMES, CH:CH, MOODS:MOODS, STANCE:STANCE, chapter:showChapter, secret:function(){ showChapter('s'); }, cert:cert, greet:function(){ dialog(greet()); }, intro:function(){ try { sessionStorage.removeItem('jk_sb_seen'); } catch(e){} startIntro('dev'); }, modem:function(){ modemScene(function(){}); }, hint:hint, wander:wanderNow, quest:function(){ offerQuest(); }, done:function(){ dialog(doneLines()); }, done3:function(){ dialog(DONE3()); }, done4:function(){ dialog(DONE4()); }, logbook:logbook, inventory:function(){ inventory(); }, rel:rel, relAdd:relAdd, baseMood:baseMood, count:count, points:points, secs:secs, refresh:refresh, save:save, place:place, close:function(){ var d = document.querySelector('.sbdlg'); if (d){ var e = new KeyboardEvent('keydown', {key:'Escape', bubbles:true}); document.dispatchEvent(e); } }, next:function(){ var d = document.querySelector('.sbdlg .win'); if (d) d.click(); },
    find:function(id){ var p = PLACES.filter(function(q){ return q.id === id; })[0]; if (!p || S.found[p.id]) return; var img = document.querySelector('img.sbobj[data-id="' + id + '"]'); if (img) found(p, img, null); else { if (!S.start) S.start = Date.now(); S.found[id] = Date.now(); if (count() >= N) S.done = Date.now(); save(); refresh(); } },
    unfind:function(id){ delete S.found[id]; if (count() < N) S.done = 0; save(); refresh(); }, snd:{syl:syl, adv:advSnd, cur:cursorSnd, cheer:cheer, tick:tick, blip:blip, rumble:rumble, vox:function(w, m){ lastVox = 0; voxBuf = {}; vox(w, m); }, voxSynth:function(w, m){ lastVox = 0; voxSynth(w, m); }, VOXF:VOXF, sp:sp}, MOOD:MOOD, MMCOL:MMCOL, TOOLS:TOOLS, pmenu:pmenu, invCheck:invCheck, inv:function(){ return INV; }, invIntro:function(){ S.invIntro = 0; save(); invCheck(false); }, labIntro:function(){ S.labIntro = 0; save(); invCheck(false); }, labSuccess:function(){ invLoad().then(function(){ dialog((INV.scenes || {}).lab_success || []); }); }, KEY:SBK, OBJ:OBJ, SPOTS:SPOTS, SIZE:SIZE, devKey:devKey, pages:function(text, who){ var p = document.querySelector('.sbdlg p'); var cols = Math.round(CF('dlg.chars', 40)); if (who === 'gojira'){ cols = 20; } var it = parseLine(String(text || '')); return paginate(it, cols, who === 'gojira' ? 1 : Math.round(CF('dlg.lines', 3))).length; }, MMNAME:MMNAME, PH:['n', 'rest', 'pts', 'zeit', 'tag', 'werk', 'abschnitt', 'bau', 'seite', 'modus', 'werkzeug', 'song', 'tage', 'uhr', 'bussgeld']};
  function init(){ try { if (!localStorage.getItem(SBK)) save(); } catch(e){} counter(); markNew(); place(); board(); if (!resumeDlg()) intro(); holes(); wander(); reactions(); mood(); applyRuins(); badges(true); ['g-inka', 'g-fund'].forEach(spLoad); setTimeout(loadWorld, 1200); setTimeout(function(){ invCheck(true); }, 15000); document.addEventListener('pointerdown', function(){ ['g-wagner', 'g-xae', 'g-sigma', 'g-gojira', 'g-stempel', 'g-kraehe'].forEach(spLoad); }, {once:true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
