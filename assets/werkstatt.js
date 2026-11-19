/* Werkstatt (Josef, 19.11.2026, Umbau Teil A nach regeln/devtools_umbau.md).
   Ein Werkzeug statt Dev Tools plus Reglerleiste: Leiste rechts angedockt (die Seite rückt zur Seite), zwei Gesichter
   (Gestaltung für Alina: hell, ruhig, typografisch; Spiel für Josef: im Stil der Seite), Gliederung nach Aufgaben,
   Befehlspalette Strg/Cmd+K, Rückgängig Strg/Cmd+Z mit Verlauf, Zähler "nicht veröffentlicht", ein Veröffentlichen-Weg
   über das Backend (auch Sprites und Klänge). Freischaltung ?werkstatt (cfg.js), ?werkstatt=aus meldet ab.
   Die Spiel-Werkzeuge kommen aus assets/devtools.js im Gastbetrieb (window.JK_WS_HOST). */
(function(){
  'use strict';
  if (window.JK_WS) return; window.JK_WS = true;
  var CF = window.JK_CFG; if (!CF) return;
  var D = document, R = D.documentElement, API = CF.API;
  var MAC = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
  var MOD = MAC ? '⌘' : 'Strg';
  var MQ = window.matchMedia ? matchMedia('(max-width:700px)') : {matches:false, addListener:function(){}};
  var BASE = ((D.currentScript && D.currentScript.src) || '').replace(/werkstatt\.js.*$/, '') || '../assets/';
  var PAGE = (D.body && D.body.getAttribute('data-page')) || '';

  /* ---------- kleine Helfer ---------- */
  function ls(k, d){ try { var v = localStorage.getItem(k); return v === null ? d : v; } catch(e){ return d; } }
  function lsSet(k, v){ try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch(e){} }
  function lsJ(k, d){ try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null || v === undefined ? d : v; } catch(e){ return d; } }
  function esc(s){ return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]; }); }
  function $(s, r){ return (r || D).querySelector(s); }
  function $$(s, r){ return [].slice.call((r || D).querySelectorAll(s)); }
  function when(t){ var d = new Date(typeof t === 'number' ? t : Date.parse(t)), p = function(n){ return ('0' + n).slice(-2); }; return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '. ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function norm(s){ return String(s || '').toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss'); }
  function dec(step){ var s = String(step); return s.indexOf('.') < 0 ? 0 : s.length - s.indexOf('.') - 1; }

  /* ---------- Zustand ---------- */
  var S = {
    open: ls('jk_ws_open', '1') === '1', face: ls('jk_ws_face', ''), area: lsJ('jk_ws_area', {}), sub: lsJ('jk_ws_sub', {}),
    scope: ls('jk_ws_scope', 'beide'), snd: ls('jk_ws_snd', '1') === '1',
    sess: ls('jk_api_sess', ''), me: lsJ('jk_api_me', null), msg: '', hist: null, drafts: null, users: null, last: null, busy: false
  };
  function role(){ return S.me && S.me.role || ''; }
  function canSpiel(){ return role() !== 'design'; }
  if (!S.face || (S.face === 'spiel' && !canSpiel())) S.face = role() === 'owner' ? 'spiel' : 'gestalt';

  /* ---------- Aufgaben (UX 1, 2): Gestaltung für Alina, Spiel für Josef ---------- */
  var GK = {   /* Gestaltungs-Regler je Bereich */
    schrift: [['Größen', ['ui.fsbody', 'ui.fshead', 'ui.fscap', 'ui.barfs']], ['Zeilen', ['ui.lh']]],
    farben: [['Grundfarben', ['col.paper', 'col.ink']], ['Akzente', ['col.red', 'col.green', 'col.blue']]],
    raster: [['Ränder und Raster', ['ui.gutter', 'ui.gridmin', 'ui.gridgap', 'ui.series']], ['Balken', ['ui.barh']], ['Hover und Großansicht', ['ui.hover', 'ui.hovermax', 'ui.lbspeed']]],
    bewegung: [['Plotter: Tempo', ['plot.speed', 'plot.k.text', 'plot.k.list', 'plot.k.legal', 'plot.k.hero', 'plot.k.once', 'plot.seen']], ['Plotter: Strich', ['plot.stroke', 'plot.stroke.acc', 'plot.jitter', 'plot.ink', 'plot.scratch', 'plot.bleed', 'plot.dot']], ['Plotter: Reisewege', ['plot.travel', 'plot.travelw']],
      ['Dürer-Handschrift', ['hand.size', 'hand.wave', 'hand.rand', 'hand.tilt', 'hand.join']], ['Holzschnitt und Konstruktionsnetz', ['fx.wood', 'fx.woodgrain', 'fx.net']], ['Parallax und Modem-Intro', ['fx.parallax', 'fx.modem', 'fx.modemwait', 'fx.modemlen']]]
  };
  var AREAS = {
    gestalt: [
      {id:'schrift', name:'Schrift', ic:'Aa', hint:'Größen und Zeilenabstand je Textsorte'},
      {id:'farben', name:'Farben', ic:'◐', hint:'Papier, Schrift und Akzente mit Kontrast'},
      {id:'raster', name:'Raster', ic:'▦', hint:'Ränder, Bildraster, Balken'},
      {id:'bewegung', name:'Bewegung', ic:'∿', hint:'Plotter, Handschrift, Holzschnitt, Modem'},
      {id:'pub', name:'Veröffentlichen', ic:'↑', hint:'Vorschau-Link oder live'}],
    spiel: [
      {id:'test', name:'Spiel testen', ic:'▶', hint:'Momente herstellen, Spielstand, Welt', subs:[['go', 'Momente'], ['st', 'Spielstand'], ['wl', 'Welt'], ['ob', 'Objekte'], ['wk', 'Werke'], ['ov', 'Einblendungen']]},
      {id:'texte', name:'Texte', ic:'¶', hint:'Dialoge und Korrekturen', subs:[['tx', 'Texte']]},
      {id:'figuren', name:'Figuren und Klänge', ic:'☺', hint:'Sprites, Klänge, Blips', subs:[['sp', 'Sprites'], ['so', 'Klänge']]},
      {id:'aussehen', name:'Aussehen', ic:'Aa', hint:'Alle Regler', subs:[['Grafik', 'Grafik'], ['Plotter', 'Plotter'], ['Effekte', 'Effekte'], ['Dialoge', 'Dialoge'], ['Ton', 'Ton'], ['Spiel', 'Spiel']]},
      {id:'pruefen', name:'Prüfen', ic:'✓', hint:'Protokoll und Fehler', subs:[['log', 'Protokoll'], ['err', 'Fehler']]},
      {id:'pub', name:'Veröffentlichen', ic:'↑', hint:'Vorschau, live, Verlauf, Sicherung', subs:[['pub', 'Veröffentlichen'], ['ex', 'Sicherung (ZIP)']]}]
  };
  var DEVTAB = {go:'test', st:'test', wl:'test', ob:'test', wk:'test', ov:'test', tx:'texte', sp:'figuren', so:'figuren', log:'pruefen', err:'pruefen', pub:'pub', ex:'pub', reg:'aussehen', keys:'pruefen'};
  function areas(){ return AREAS[S.face]; }
  function curArea(){ var a = S.area[S.face], L = areas(); for (var i = 0; i < L.length; i++) if (L[i].id === a) return L[i]; return L[0]; }
  function curSub(A){ A = A || curArea(); if (!A.subs) return ''; var s = S.sub[A.id]; for (var i = 0; i < A.subs.length; i++) if (A.subs[i][0] === s) return s; return A.subs[0][0]; }

  /* ---------- Werte der Regler (mit Geltung Beide, Desktop, Handy) ---------- */
  function locKeys(k){ var L = CF.local(); return [k, k + '@d', k + '@m'].filter(function(x){ return L[x] !== undefined; }); }
  function val(k){ var L = CF.local(), P = CF.PUB, p = CF.META[k], sc = S.scope === 'd' ? '@d' : S.scope === 'm' ? '@m' : (CF.MOB ? '@m' : '@d');
    if (L[k + sc] !== undefined) return L[k + sc]; if (L[k] !== undefined) return L[k]; if (P[k + sc] !== undefined) return P[k + sc]; if (P[k] !== undefined) return P[k];
    var d = p[5]; return Array.isArray(d) ? d[sc === '@m' ? 1 : 0] : d; }
  function setv(k, v){ CF.set(k, v, S.scope === 'd' ? 'd' : S.scope === 'm' ? 'm' : ''); }
  function resetv(k){ if (S.scope === 'beide') locKeys(k).forEach(function(x){ var b = x.replace(/@[dm]$/, ''), s = x.slice(b.length); CF.set(b, null, s === '@d' ? 'd' : s === '@m' ? 'm' : ''); }); else setv(k, null); }

  /* Farbe: WCAG-2.2-Kontrast (Pflicht) */
  function rgb(h){ h = String(h || '').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h.slice(0, 6), 16); return isNaN(n) ? [0, 0, 0] : [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function lum(h){ return rgb(h).map(function(c){ c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }).reduce(function(a, c, i){ return a + c * [.2126, .7152, .0722][i]; }, 0); }
  function contrast(a, b){ var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function amp(r, big){ var ok = big ? 3 : 4.5; return r >= 7 ? ['ok', '✓ AAA'] : r >= ok ? ['ok', '✓ AA'] : r >= 3 ? ['warn', '△ nur groß'] : ['bad', '✕ zu schwach']; }

  /* ---------- Stil: zwei Gesichter ---------- */
  var css = D.createElement('style'); css.id = 'wscss'; css.textContent = [
    '@font-face{font-family:"WSInter";src:url(' + BASE + 'fonts/ws/inter-latin-400-normal.woff2) format("woff2");font-weight:400}',
    '@font-face{font-family:"WSInter";src:url(' + BASE + 'fonts/ws/inter-latin-600-normal.woff2) format("woff2");font-weight:600}',
    '@font-face{font-family:"WSInter";src:url(' + BASE + 'fonts/ws/inter-latin-700-normal.woff2) format("woff2");font-weight:700}',
    '@font-face{font-family:"WSMono";src:url(' + BASE + 'fonts/ws/jetbrains-mono-latin-400-normal.woff2) format("woff2");font-weight:400}',
    '@font-face{font-family:"WSMono";src:url(' + BASE + 'fonts/ws/jetbrains-mono-latin-700-normal.woff2) format("woff2");font-weight:700}',
    ':root{--wsw:0px}html.wsdock{padding-right:var(--wsw)!important;overflow-x:hidden}',
    '#ws,#ws *,#wspal,#wspal *,#wsdv,#wsdv *,#wsmod,#wsmod *,#wstour,#wstour *{box-sizing:border-box}',
    '#ws{position:fixed;top:0;right:0;bottom:0;width:440px;z-index:2147482000;display:flex;flex-direction:column;--b:#0028FF;--ink:#0d0d0d;--mute:#6b6b6b;--line:#e3e3e3;--soft:#f6f6f4;--ok:#0a7d3b;--warn:#b26a00;--bad:#c4161c;text-align:left;letter-spacing:normal;text-transform:none;word-spacing:normal;cursor:auto}',
    '#ws button,#ws input,#ws select,#ws textarea{font:inherit;color:inherit;margin:0;letter-spacing:inherit;text-transform:none}#ws button{cursor:pointer}',
    '#ws .hd{display:flex;align-items:center;gap:6px;padding:8px 10px;flex-wrap:wrap}#ws .hd.h1{flex-wrap:nowrap}#ws .hd.h2{padding-top:0;border:0!important}#ws .brand{margin-right:auto;white-space:nowrap}',
    '#ws .seg{display:inline-flex;overflow:hidden}#ws .seg button{border:0;background:none;padding:5px 9px}',
    '#ws .ib{min-width:30px;padding:4px 7px;background:#fff}#ws .ib:disabled{opacity:.35;cursor:default}',
    '#ws .chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#fff;white-space:nowrap}',
    '#ws .chip .dot{width:8px;height:8px;display:inline-block}#ws kbd{font:11px/1.4 "WSMono",ui-monospace,monospace;padding:0 4px;border:1px solid currentColor;opacity:.75}',
    '#ws nav.ar{display:flex;flex-wrap:wrap;gap:2px;padding:0 10px}#ws nav.ar button{border:0;background:none;padding:8px 7px 7px;border-bottom:3px solid transparent;display:inline-flex;gap:5px;align-items:baseline}',
    '#ws nav.ar button i{font-style:normal;opacity:.6;font-size:.9em}#ws nav.sb{display:flex;flex-wrap:wrap;gap:4px;padding:8px 10px 0}#ws nav.sb button{padding:3px 9px;background:#fff}',
    '#ws .tempo{display:flex;gap:4px;align-items:center;padding:0 10px 8px;flex-wrap:wrap}#ws .tempo button{padding:2px 8px;background:#fff}',
    '#ws .bd{flex:1;overflow:auto;padding:12px 14px 70px;overscroll-behavior:contain}',
    '#ws h2,#ws h3,#ws p,#ws label,#ws a,#ws b,#ws span{font-family:inherit;hyphens:manual;-webkit-hyphens:manual;overflow-wrap:normal;max-width:none}#ws a{color:inherit;text-decoration:underline}',
    '#ws h2{margin:0 0 4px}#ws h3{margin:20px 0 6px}#ws p{margin:4px 0 10px}#ws .note{color:var(--mute)}',
    '#ws .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0}',
    '#ws .btn{padding:7px 12px;background:#fff}#ws .btn:disabled{opacity:.4;cursor:not-allowed}#ws .btn.sm{padding:3px 8px;font-size:12.5px}',
    '#ws input[type=text],#ws input[type=email],#ws select.in,#ws textarea{width:100%;padding:7px 10px;background:#fff}',
    '#ws .ctl{margin:4px -6px;padding:8px 6px;border-radius:0;scroll-margin:80px}#ws .ctl.hl{animation:wshl 1.4s ease-out}@keyframes wshl{0%{background:#0028FF33}100%{background:transparent}}',
    '#ws .ctl .tp{display:flex;justify-content:space-between;align-items:baseline;gap:8px}#ws .ctl label{font-weight:600}#ws .ctl .hint{font-size:12px;color:var(--mute);margin-top:2px}',
    '#ws .ctl .c{display:flex;gap:8px;align-items:center;margin-top:4px}#ws .ctl input[type=range]{flex:1;height:28px;accent-color:var(--b);background:none;min-width:60px}',
    '#ws .ctl input.num{width:84px;padding:3px 6px;text-align:right;font:13px "WSMono",ui-monospace,monospace;background:#fff}#ws .ctl .u{font-size:12px;color:var(--mute);min-width:22px}',
    '#ws .ctl .rs{border:0;background:none;padding:0 2px;color:var(--mute);visibility:hidden}#ws .ctl.chg .rs{visibility:visible}',
    '#ws .ctl.chg label::before{content:"● ";color:var(--b)}#ws .ctl .sc{font:11px "WSMono",monospace;color:var(--mute)}',
    '#ws .crow{display:grid;grid-template-columns:56px 1fr;gap:6px 12px;align-items:center}#ws .sw{width:56px;height:56px;position:relative;overflow:hidden;border:1px solid #0003}#ws .sw input{position:absolute;inset:-10px;width:80px;height:80px;opacity:0;cursor:pointer}',
    '#ws input.hex{width:96px;padding:3px 6px;font:13px "WSMono",monospace;text-transform:uppercase;background:#fff}',
    '#ws .amp{display:inline-block;font-size:12px;padding:1px 8px;font-weight:600;white-space:nowrap}#ws .amp.ok{background:#e3f4ea;color:var(--ok)}#ws .amp.warn{background:#fff1d6;color:var(--warn)}#ws .amp.bad{background:#fde4e4;color:var(--bad)}',
    '#ws .smp{padding:8px 10px;margin-top:6px;border:1px solid #0002;font-size:15px}',
    '#ws .lst{margin:4px 0}#ws .lst div{display:flex;gap:8px;align-items:baseline;padding:5px 0;border-top:1px solid var(--line);font-size:13px}#ws .lst div:first-child{border-top:0}#ws .lst i{font-style:normal;color:var(--mute);font:12px "WSMono",monospace;white-space:nowrap}#ws .lst span{flex:1;min-width:0}',
    '#ws .st{font-size:11.5px;padding:0 6px;white-space:nowrap;border:1px solid currentColor}#ws .st.chg{color:var(--b)}#ws .st.live{color:var(--ok)}#ws .st.wart{color:var(--warn)}#ws .st.err{color:var(--bad)}#ws .st.draft{color:#6b3fd1}',
    '#ws .prog{height:10px;border:1.5px solid currentColor;overflow:hidden;margin:6px 0}#ws .prog i{display:block;height:100%;width:0;background:var(--ok);transition:width .4s}',
    '#ws .msg{padding:6px 10px;margin:6px 0;border-left:3px solid var(--b);background:var(--soft)}',
    '#ws .wsdev{font-size:14px}#ws .wsdev .note{font-size:12.5px}#ws .wsdev h5{font-size:12px}',
    '#wstab{position:fixed;right:0;top:40%;z-index:2147482000;writing-mode:vertical-rl;padding:10px 6px;border:0;cursor:pointer}',
    /* Gestaltung: hell, ruhig, typografisch (Grotesk plus Monospace) */
    '#ws.g{background:#fff;color:var(--ink);font:14px/1.45 "WSInter",system-ui,-apple-system,sans-serif;border-left:1px solid var(--line);box-shadow:-8px 0 30px #0000000f}',
    '#ws.g .hd{border-bottom:1px solid var(--line)}#ws.g .brand{font-weight:700;letter-spacing:-.01em}#ws.g .brand small{font-weight:400;color:var(--mute);margin-left:6px}',
    '#ws.g .seg{border:1px solid var(--line);border-radius:8px}#ws.g .seg button.on{background:var(--ink);color:#fff}#ws.g .seg button+button{border-left:1px solid var(--line)}',
    '#ws.g .ib,#ws.g .chip,#ws.g nav.sb button{border:1px solid var(--line);border-radius:8px}#ws.g .chip{border-radius:999px}#ws.g .chip .dot{border-radius:50%;background:var(--b)}#ws.g .chip.zero .dot{background:var(--ok)}',
    '#ws.g nav.ar{border-bottom:1px solid var(--line)}#ws.g nav.ar button{color:var(--mute)}#ws.g nav.ar button.on{color:var(--ink);border-bottom-color:var(--b);font-weight:600}#ws.g nav.sb button.on{background:var(--ink);color:#fff;border-color:var(--ink)}',
    '#ws.g h2{font:700 20px/1.25 "WSInter",system-ui,sans-serif;letter-spacing:-.01em;text-transform:none}#ws.g h3{font-family:"WSInter",system-ui,sans-serif;font-size:11.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--mute);font-weight:600}',
    '#ws.g .btn{border:1px solid var(--ink);border-radius:8px;font-weight:600}#ws.g .btn.pri{background:var(--b);border-color:var(--b);color:#fff}#ws.g .btn.ghost{border-color:var(--line);font-weight:400}',
    '#ws.g input[type=text],#ws.g input[type=email],#ws.g select.in,#ws.g textarea,#ws.g input.num,#ws.g input.hex{border:1px solid var(--line);border-radius:6px}#ws.g .sw{border-radius:10px}#ws.g .amp{border-radius:999px}#ws.g .st{border-radius:6px}#ws.g .ctl{border-radius:8px}',
    '#ws.g .smp{border-radius:8px}#ws.g kbd{border-radius:4px}#wstab.g{background:#0028FF;color:#fff;font:600 12px "WSInter",sans-serif;border-radius:8px 0 0 8px}',
    /* Spiel (Josef): im Stil der Seite (Relief, Dürer 1525 für Titel, Dürer Sans für Knöpfe, Schwarz auf Papier, 2-px-Linien, Zinnober und Grün, keine Rundungen) */
    '#ws.s{background:#fff;color:#000;font:15px/1.45 "Relief","Helvetica Neue",Helvetica,Arial,sans-serif;border-left:2px solid #000;--b:#E2231A;--ok:#00A651;--bad:#E2231A;--warn:#8a5a00;--line:#000}',
    '#ws.s .hd{border-bottom:2px solid #000}#ws.s .brand{font:400 22px/1 "Duerer1525",serif;text-transform:uppercase;letter-spacing:.02em}#ws.s .brand small{display:none}',
    '#ws.s .seg,#ws.s .ib,#ws.s .chip,#ws.s nav.sb button,#ws.s .tempo button{border:1.5px solid #000;border-radius:0}#ws.s .seg button+button{border-left:1.5px solid #000}',
    '#ws.s .seg button,#ws.s .chip,#ws.s nav.ar button,#ws.s nav.sb button,#ws.s .btn,#ws.s .tempo button,#ws.s .tempo b{font-family:"Duerer Sans",sans-serif;text-transform:uppercase;letter-spacing:.06em;font-size:11.5px;font-weight:400}',
    '#ws.s .seg button.on,#ws.s nav.sb button.on,#ws.s .tempo button.on{background:#000;color:#fff}#ws.s .chip .dot{background:#E2231A}#ws.s .chip.zero .dot{background:#00A651}',
    '#ws.s nav.ar{border-bottom:2px solid #000;padding-top:4px}#ws.s nav.ar button{color:#000;font-size:11.5px;letter-spacing:.04em;padding:7px 5px 6px}#ws.s nav.ar button.on{color:#E2231A;border-bottom-color:#E2231A}',
    '#ws.s h2{font:400 28px/1.05 "Duerer1525",serif;text-transform:uppercase;letter-spacing:.02em;margin-bottom:8px}#ws.s h3{font:400 12px "Duerer Sans",sans-serif;text-transform:uppercase;letter-spacing:.12em;color:#6b6b6b;border-bottom:1px solid #000;padding-bottom:3px}',
    '#ws.s .btn{border:1.5px solid #000;border-radius:0;background:#fff}#ws.s .btn:hover{background:#000;color:#fff}#ws.s .btn.pri{background:#E2231A;border-color:#E2231A;color:#fff}#ws.s .btn.pri:hover{background:#000;border-color:#000}',
    '#ws.s input[type=text],#ws.s input[type=email],#ws.s select.in,#ws.s textarea,#ws.s input.num,#ws.s input.hex{border:1.5px solid #000;border-radius:0}#ws.s .lst div{border-top:1px dotted #9a9a9a}#ws.s .st{font-family:"Duerer Sans",sans-serif;letter-spacing:.04em}',
    '#ws.s .msg{border-left-color:#E2231A;background:#fff;border-top:1px solid #000;border-bottom:1px solid #000}#ws.s .ctl input[type=range]{accent-color:#000}',
    '#wstab.s{background:#000;color:#fff;font:12px "Duerer Sans",sans-serif;letter-spacing:.1em;text-transform:uppercase;border-radius:0}',
    '#ws.s .wsdev{font:14px/1.45 "Relief","Helvetica Neue",Arial,sans-serif;color:#000}#ws.s .wsdev .b{border:1.5px solid #000;border-radius:0;background:#fff;font:11px/1.6 "Duerer Sans",sans-serif;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px}',
    '#ws.s .wsdev .b:hover{background:#000;color:#fff;border-color:#000}#ws.s .wsdev .b.on{background:#E2231A;border-color:#E2231A;color:#fff}#ws.s .wsdev h5{font:400 12px "Duerer Sans",sans-serif;text-transform:uppercase;letter-spacing:.12em;color:#6b6b6b;border-bottom:1px solid #000}',
    '#ws.s .wsdev input,#ws.s .wsdev select,#ws.s .wsdev textarea{border:1.5px solid #000!important;border-radius:0!important;font-family:"Relief",Arial,sans-serif}#ws.s .wsdev .log b{color:#E2231A}#ws.s .wsdev .note{color:#6b6b6b}',
    /* Palette, Verlauf, Handbuch, Tour, Geräte, Stempel */
    '#wspal{position:fixed;inset:0;z-index:2147482500;background:#0006;display:none;align-items:flex-start;justify-content:center;padding-top:12vh;font:14px/1.45 "WSInter",system-ui,sans-serif;color:#0d0d0d}',
    '#wspal .box{width:min(620px,92vw);background:#fff;border-radius:12px;box-shadow:0 20px 60px #0004;overflow:hidden}#wspal input{width:100%;border:0;border-bottom:1px solid #e3e3e3;padding:16px 18px;font:17px "WSInter",sans-serif;outline:0;background:#fff;color:#0d0d0d}',
    '#wspal ul{list-style:none;margin:0;padding:6px;max-height:52vh;overflow:auto}#wspal li{display:flex;justify-content:space-between;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer}#wspal li.on{background:#eef1ff}#wspal li small{color:#6b6b6b;white-space:nowrap}#wspal li kbd{font:11px "WSMono",monospace;border:1px solid #ccc;border-bottom-width:2px;border-radius:4px;padding:0 4px;margin-left:6px}',
    '#wspal.s{font-family:"Relief",Arial,sans-serif;color:#000}#wspal.s .box{border-radius:0;border:2px solid #000;box-shadow:6px 6px 0 #000}#wspal.s input{font-family:"Relief",Arial,sans-serif;border-bottom:2px solid #000}#wspal.s li{border-radius:0}#wspal.s li.on{background:#000;color:#fff}#wspal.s li.on small{color:#ddd}',
    '#wsmod{position:fixed;inset:0;z-index:2147482400;background:#0006;display:flex;align-items:center;justify-content:center;font:14px/1.5 "WSInter",system-ui,sans-serif;color:#0d0d0d}#wsmod .box{width:min(640px,94vw);max-height:84vh;overflow:auto;background:#fff;border-radius:12px;padding:20px 24px;box-shadow:0 20px 60px #0004}#wsmod h2{margin:0 0 8px;font-size:22px}#wsmod h3{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#6b6b6b;margin:18px 0 4px}#wsmod ul{margin:4px 0;padding-left:20px}#wsmod .x{float:right;border:1px solid #e3e3e3;background:#fff;border-radius:8px;padding:4px 10px;cursor:pointer}',
    '#wsmod.s{font-family:"Relief",Arial,sans-serif;color:#000}#wsmod.s .box{border-radius:0;border:2px solid #000;box-shadow:6px 6px 0 #000}#wsmod.s h2{font:400 32px/1 "Duerer1525",serif;text-transform:uppercase}#wsmod.s h3{font-family:"Duerer Sans",sans-serif;color:#6b6b6b}#wsmod.s .x{border:1.5px solid #000;border-radius:0}',
    '#wstour{position:fixed;z-index:2147482600;max-width:320px;background:#0d0d0d;color:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 12px 40px #0005;font:14px/1.45 "WSInter",system-ui,sans-serif}#wstour .n{font:12px "WSMono",monospace;opacity:.7}#wstour .row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}#wstour button{background:#fff;color:#0d0d0d;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;font:inherit}#wstour button.sk{background:none;color:#fff;opacity:.7}',
    '#wsring{position:fixed;z-index:2147482550;border:3px solid #0028FF;border-radius:10px;pointer-events:none;box-shadow:0 0 0 9999px #0004;transition:all .25s}',
    '#wstoast{position:fixed;left:calc(50% - var(--wsw)/2);top:70px;transform:translateX(-50%);z-index:2147482700;background:#0d0d0d;color:#fff;border-radius:10px;padding:10px 16px;max-width:80vw;font:14px/1.4 "WSInter",system-ui,sans-serif;display:none}#wstoast.s{border-radius:0;font-family:"Relief",Arial,sans-serif;border-bottom:3px solid #E2231A}#wstoast button{margin-left:10px;background:#fff;color:#000;border:0;padding:2px 8px;cursor:pointer;font:inherit}',
    '#wsstamp{position:fixed;left:calc(50% - var(--wsw)/2);top:45%;z-index:2147482700;pointer-events:none;opacity:0;font:700 44px "WSMono",monospace;color:#0028FF;border:6px solid #0028FF;border-radius:14px;padding:6px 22px;transform:translate(-50%,-50%) rotate(-8deg) scale(2)}',
    '#wsstamp.s{font:400 52px "Duerer1525",serif;color:#00A651;border-color:#00A651;border-radius:0}#wsstamp.go{animation:wsstamp 1.1s ease-out forwards}@keyframes wsstamp{0%{opacity:0;transform:translate(-50%,-50%) rotate(-8deg) scale(2.4)}30%{opacity:1;transform:translate(-50%,-50%) rotate(-8deg) scale(1)}80%{opacity:1}100%{opacity:0}}',
    '#wsinka{position:fixed;left:24px;bottom:56px;z-index:2147482700;width:min(380px,80vw);background:#0a0a14;border:3px solid #3fb6ff;padding:10px 12px;font:18px/1.3 "Pixelify",monospace;color:#fff;cursor:pointer}#wsinka b{color:#3fb6ff;font-weight:400;margin-right:6px}',
    '#wsdv{position:fixed;top:0;left:0;bottom:0;right:var(--wsw);z-index:2147481900;background:#ececea;display:flex;gap:14px;padding:44px 14px 14px;align-items:flex-start;justify-content:center;overflow:auto}#wsdv .fr{position:relative;background:#fff;box-shadow:0 8px 30px #0002;overflow:hidden;flex:none}#wsdv iframe{border:0;transform-origin:0 0;display:block;background:#fff}',
    '#wsdv .lb{position:absolute;left:0;top:-22px;font:12px "WSMono",monospace;color:#333}#wsdv .fr.ph{border-radius:24px;border:8px solid #111}#wsdv .bar{position:fixed;top:8px;left:14px;display:flex;gap:6px;z-index:2}#wsdv .bar button{border:1px solid #0003;background:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font:13px "WSInter",sans-serif}',
    '#wsgrid{position:fixed;top:0;bottom:0;left:0;right:var(--wsw);pointer-events:none;z-index:2147481800}#wsgrid i{position:absolute;top:0;bottom:0;width:0;border-left:1px dashed #0028FFaa}#wsgrid b{position:absolute;top:8px;font:11px "WSMono",monospace;color:#0028FF;background:#fff;padding:0 4px;transform:translateX(-50%)}#wsgrid u{position:absolute;left:0;right:0;height:0;border-top:1px solid #0028FF22;text-decoration:none}',
    '@media (max-width:700px){#ws{top:auto;left:0;width:auto;height:62vh;border-left:0!important;border-top:2px solid #000}#ws.g{border-top:1px solid #e3e3e3}#wstab{top:auto;bottom:12px;writing-mode:horizontal-tb;right:12px;padding:8px 12px}}'
  ].join('\n'); D.head.appendChild(css);

  /* ---------- Gerüst ---------- */
  var box = D.createElement('aside'); box.id = 'ws'; box.setAttribute('aria-label', 'Werkstatt');
  var tab = D.createElement('button'); tab.id = 'wstab'; tab.textContent = 'Werkstatt'; tab.title = 'Werkstatt öffnen (' + MOD + '+K, dann „Leiste“)';
  var toast = D.createElement('div'); toast.id = 'wstoast'; toast.setAttribute('role', 'status');
  var stamp = D.createElement('div'); stamp.id = 'wsstamp';
  var pal = D.createElement('div'); pal.id = 'wspal'; pal.innerHTML = '<div class="box" role="dialog" aria-label="Befehlspalette"><input type="text" placeholder="Was willst du tun? z. B. Laufweite, Papier, Inka, veröffentlichen" autocomplete="off" spellcheck="false"><ul></ul></div>';

  function face(){ return S.face === 'spiel' ? 's' : 'g'; }
  function setDock(){ var o = S.open, mob = MQ.matches; box.style.display = o ? '' : 'none'; tab.style.display = o ? 'none' : '';
    var w = o && !mob ? Math.round(box.getBoundingClientRect().width) + 'px' : '0px'; R.classList.toggle('wsdock', o && !mob); if (w !== setDock.w){ setDock.w = w; R.style.setProperty('--wsw', w); window.dispatchEvent(new Event('resize')); } }
  function setOpen(o){ S.open = o; lsSet('jk_ws_open', o ? '1' : '0'); setDock(); if (o) render(); }
  function setFace(f){ if (f === 'spiel' && !canSpiel()) { say('Das Spiel-Gesicht ist Josef vorbehalten.'); return; } S.face = f; lsSet('jk_ws_face', f); if (f === 'spiel') loadDev(); blip(f === 'spiel' ? 660 : 520); render(); }
  function go(areaId, sub){ var L = areas(), ok = L.some(function(a){ return a.id === areaId; }); if (!ok) return; S.area[S.face] = areaId; lsSet('jk_ws_area', JSON.stringify(S.area)); if (sub){ S.sub[areaId] = sub; lsSet('jk_ws_sub', JSON.stringify(S.sub)); } if (!S.open) setOpen(true); else render(); if (S.face === 'spiel') blip(880); }

  /* Die Seite rückt zur Seite (UX 17): feste Elemente der Seite bekommen die Leistenbreite rechts dazu */
  (function shift(){ var out = [];
    function sel(t){ return t.split(',').map(function(x){ return 'html.wsdock ' + x.trim(); }).join(','); }
    function walk(rules, wrap){ [].forEach.call(rules, function(r){ if (r.cssRules && r.media){ walk(r.cssRules, '@media ' + r.media.mediaText); return; } if (!r.style || !r.selectorText || r.style.position !== 'fixed') return;
        var d = '', rt = r.style.right, lt = r.style.left, w = r.style.width, mw = r.style.maxWidth;
        if (rt && rt !== 'auto') d += 'right:calc(' + rt + ' + var(--wsw))!important;';
        else if (lt === '50%') d += 'left:calc(50% - var(--wsw) / 2)!important;';
        if (w && /vw/.test(w)) d += 'width:calc(' + w + ' - var(--wsw))!important;'; if (mw && /vw/.test(mw)) d += 'max-width:calc(' + mw + ' - var(--wsw))!important;';
        if (d) out.push((wrap ? wrap + '{' : '') + sel(r.selectorText) + '{' + d + '}' + (wrap ? '}' : '')); }); }
    [].forEach.call(D.styleSheets, function(s){ if (s.ownerNode && s.ownerNode.id === 'wscss') return; try { walk(s.cssRules || [], ''); } catch(e){} });
    var st = D.createElement('style'); st.id = 'wsshift'; st.textContent = out.join('\n'); D.head.appendChild(st); })();

  /* ---------- Klang (dezent, abschaltbar): SNES-artige Töne ---------- */
  var AC = null;
  function ac(){ if (!AC){ try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} } return AC; }
  function blip(f, dur, type, vol){ if (!S.snd) return; var a = ac(); if (!a) return; try { var o = a.createOscillator(), g = a.createGain(), t = a.currentTime; o.type = type || 'square'; o.frequency.value = f; g.gain.setValueAtTime((vol || .035), t); g.gain.exponentialRampToValueAtTime(.0001, t + (dur || .06)); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + (dur || .06) + .02); } catch(e){} }
  function chord(){ [523, 659, 784, 1047].forEach(function(f, i){ setTimeout(function(){ blip(f, .12, 'square', .04); }, i * 70); }); }
  function thud(){ if (!S.snd) return; var a = ac(); if (!a) return; try { var n = a.sampleRate * .18, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = .5; s.buffer = b; s.connect(f); f.connect(g); g.connect(a.destination); s.start(); } catch(e){} }

  function say(t, act){ toast.className = face(); toast.innerHTML = esc(t) + (act ? ' <button>' + esc(act[0]) + '</button>' : ''); toast.style.display = 'block'; if (act) toast.querySelector('button').onclick = function(){ toast.style.display = 'none'; act[1](); };
    clearTimeout(say.t); say.t = setTimeout(function(){ toast.style.display = 'none'; }, act ? 7000 : 2600); }

  /* ---------- Rückgängig und Verlauf (UX 4): beobachtet alle lokalen Änderungen ---------- */
  var TRACK = ['jk_regler', 'jk_dev_text', 'jk_dev_kor', 'jk_dev_blip', 'jk_dev_fig', 'jk_dev_moods', 'jk_dev_ach', 'jk_dev_pts', 'jk_dev_obj', 'jk_dev_werke', 'jk_dev_sndmeta', 'jk_dev_sndvol', 'jk_dev_sprmeta', 'jk_dev_bhide'];
  var TNAME = {jk_dev_text:'Texte', jk_dev_kor:'Korrekturen', jk_dev_blip:'Blips', jk_dev_fig:'Figuren', jk_dev_moods:'Stimmungen', jk_dev_ach:'Abzeichen', jk_dev_pts:'Punkte', jk_dev_obj:'Objekte', jk_dev_werke:'Werke', jk_dev_sndmeta:'Klänge', jk_dev_sndvol:'Klang-Lautstärken', jk_dev_sprmeta:'Sprites', jk_dev_bhide:'Bestenliste'};
  var H = lsJ('jk_ws_hist', []), HI = +ls('jk_ws_histi', String(H.length));   /* H: Schritte {t, l, ch:{key:[vorher, nachher]}}, HI: Anzahl angewendeter Schritte */
  if (HI > H.length) HI = H.length;
  var PEND = null, APPLYING = false;
  function regLabel(b, a){ var x = {}, y = {}; try { x = JSON.parse(b || '{}') || {}; } catch(e){} try { y = JSON.parse(a || '{}') || {}; } catch(e){}
    var ks = Object.keys(x).concat(Object.keys(y)).filter(function(k, i, A){ return A.indexOf(k) === i && JSON.stringify(x[k]) !== JSON.stringify(y[k]); });
    return ks.map(function(k){ var b0 = k.replace(/@[dm]$/, ''), m = CF.META[b0]; return (m ? m[3] : k) + (/@d$/.test(k) ? ' (Desktop)' : /@m$/.test(k) ? ' (Handy)' : '') + (y[k] === undefined ? ' zurückgesetzt' : ''); }).join(', '); }
  function commit(){ if (!PEND) return; var ch = PEND; PEND = null; var keys = Object.keys(ch).filter(function(k){ return ch[k][0] !== ch[k][1]; }); if (!keys.length) return;
    var c = {}; keys.forEach(function(k){ c[k] = ch[k]; });
    var l = keys.map(function(k){ return k === 'jk_regler' ? regLabel(c[k][0], c[k][1]) : TNAME[k] || k; }).filter(Boolean).join(', ') || 'Änderung';
    H = H.slice(0, HI); H.push({t:Date.now(), l:l.slice(0, 140), ch:c}); if (H.length > 80) H = H.slice(-80); HI = H.length; saveH(); tick(); }
  function saveH(){ try { localStorage.setItem('jk_ws_hist', JSON.stringify(H)); localStorage.setItem('jk_ws_histi', String(HI)); } catch(e){ H = H.slice(-20); HI = Math.min(HI, H.length); try { localStorage.setItem('jk_ws_hist', JSON.stringify(H)); } catch(x){} } }
  (function(){ var P = Storage.prototype, si = P.setItem, ri = P.removeItem;
    function rec(store, k, nv){ if (APPLYING || store !== window.localStorage || TRACK.indexOf(k) < 0) return; var ov = store.getItem(k); if (ov === nv) return; PEND = PEND || {}; if (!PEND[k]) PEND[k] = [ov, nv]; else PEND[k][1] = nv; clearTimeout(rec.t); rec.t = setTimeout(commit, 450); }
    P.setItem = function(k, v){ rec(this, String(k), String(v)); return si.apply(this, arguments); };
    P.removeItem = function(k){ rec(this, String(k), null); return ri.apply(this, arguments); }; })();
  function applyStep(step, dir){ APPLYING = true; var reload = false;
    try { Object.keys(step.ch).forEach(function(k){ var v = step.ch[k][dir < 0 ? 0 : 1]; if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, v);
        if (k === 'jk_regler'){ var o = {}; try { o = JSON.parse(v || '{}') || {}; } catch(e){} CF.replace(o); }
        else if (k === 'jk_dev_text' || k === 'jk_dev_kor'){ if (window.JK_DEVAPI) window.JK_DEVAPI.reloadLocal(); }
        else reload = true; }); } finally { APPLYING = false; }
    if (reload) say('Wirkt vollständig nach dem Neuladen.', ['Neu laden', function(){ location.reload(); }]); }
  function undo(){ commit(); if (!HI) { say('Nichts mehr rückgängig zu machen.'); return; } HI--; applyStep(H[HI], -1); saveH(); say('Rückgängig: ' + H[HI].l); blip(392, .05); render(); }
  function redo(){ commit(); if (HI >= H.length) { say('Nichts zu wiederholen.'); return; } applyStep(H[HI], 1); HI++; saveH(); say('Wiederholt: ' + H[HI - 1].l); blip(587, .05); render(); }
  function jump(n){ commit(); while (HI > n){ HI--; applyStep(H[HI], -1); } while (HI < n){ applyStep(H[HI], 1); HI++; } saveH(); render(); }

  /* ---------- Zähler (UX 6) ---------- */
  function counts(){ var L = CF.local(), c = {regler:Object.keys(L).length, texte:0, korrekturen:0, extra:[], extraN:0};
    if (window.JK_DEVAPI){ var d = window.JK_DEVAPI.counts(); c.texte = d.texte; c.korrekturen = d.korrekturen; c.extra = d.extra; }
    else { var t = lsJ('jk_dev_text', {}); c.texte = ['convos', 'scenes', 'beh'].reduce(function(n, k){ return n + Object.keys(t[k] || {}).length; }, 0); var k = lsJ('jk_dev_kor', []); c.korrekturen = Array.isArray(k) ? k.length : 0; }
    var pubx = ls('jk_ws_extrapub', ''); if (c.extra.join('|') !== pubx) c.extraN = c.extra.reduce(function(n, s){ return n + (parseInt(s, 10) || 0); }, 0);
    c.n = c.regler + c.texte + c.korrekturen + c.extraN; return c; }
  function tick(){ var ch = $('.cnt', box); if (!ch) return; var c = counts(); ch.classList.toggle('zero', !c.n); $('span.t', ch).textContent = c.n ? c.n + (S.face === 'spiel' ? ' offen' : ' nicht veröffentlicht') : (S.face === 'spiel' ? 'alles live' : 'alles veröffentlicht');
    ch.title = c.n ? c.n + (c.n === 1 ? ' Änderung' : ' Änderungen') + ', nicht veröffentlicht. Klick: Liste und Verlauf' : 'Keine lokalen Änderungen';
    var u = $('.undo', box), r = $('.redo', box); if (u) u.disabled = !HI; if (r) r.disabled = HI >= H.length;
    $$('.ctl', box).forEach(function(e){ var k = e.getAttribute('data-k'); e.classList.toggle('chg', locKeys(k).length > 0); }); }

  /* ---------- Spiel-Werkzeuge (devtools.js im Gastbetrieb) ---------- */
  var DEVLOADING = false, DEVREADY = false;
  function loadDev(){ if (window.JK_DEVAPI || DEVLOADING || !canSpiel()) return; DEVLOADING = true;
    window.JK_WS_HOST = {open:function(){ setOpen(true); }, go:function(t){ var a = DEVTAB[t] || 'test'; if (S.face !== 'spiel') setFace('spiel'); go(a, t === 'reg' ? 'Grafik' : t === 'keys' ? 'log' : t); }, ready:function(){ DEVREADY = true; render(); tick(); }};
    var s = D.createElement('script'); s.src = BASE + 'devtools.js?t=' + Math.floor(Date.now() / 60000); s.defer = true; D.head.appendChild(s); }

  /* ---------- Darstellung ---------- */
  function render(){ if (!S.open) return; var f = face(), A = curArea(), sub = curSub(A), c = counts();
    box.className = f; tab.className = f; pal.className = f;
    var owner = canSpiel();
    var h = '<div class="hd h1"><span class="brand">Werkstatt<small>' + (S.face === 'spiel' ? 'Spiel' : 'Gestaltung') + '</small></span>' +
      '<button class="ib undo" title="Rückgängig (' + MOD + '+Z)" aria-label="Rückgängig">↶</button><button class="ib redo" title="Wiederholen (' + MOD + '+Shift+Z)" aria-label="Wiederholen">↷</button>' +
      '<button class="ib more" title="Mehr: Geräte, Raster, Klänge, Handbuch" aria-label="Mehr">⋯</button><button class="ib cls" title="Leiste schließen" aria-label="Leiste schließen">×</button></div>' +
      '<div class="hd h2">' + (owner ? '<span class="seg fc"><button data-f="gestalt" class="' + (S.face === 'gestalt' ? 'on' : '') + '" title="Gestaltung: Schrift, Farben, Raster, Bewegung">Gestaltung</button><button data-f="spiel" class="' + (S.face === 'spiel' ? 'on' : '') + '" title="Spiel: testen, Texte, Figuren, Klänge">Spiel</button></span>' : '') +
      '<button class="chip cnt' + (c.n ? '' : ' zero') + '"><span class="dot"></span><span class="t"></span></button><button class="chip pal" title="Befehlspalette: alles suchen">Suchen <kbd>' + MOD + ' K</kbd></button></div>';
    if (S.face === 'spiel'){ var sp = window.JK_DEVAPI ? window.JK_DEVAPI.spd() : (window.JK_DEVSPD || {mult:1}); h += '<div class="tempo"><b>Tempo</b>' + [['pause', '❚❚', 'Pause'], ['1', '1×', 'normal'], ['2', '2×', 'doppelt'], ['4', '4×', 'vierfach'], ['99', '»', 'sofort']].map(function(t){ var on = t[0] === 'pause' ? sp.pause : (!sp.pause && +t[0] === sp.mult); return '<button data-m="' + t[0] + '" class="' + (on ? 'on' : '') + '" title="Tempo ' + t[2] + ' (Dialoge, Plotter, Wartezeiten)">' + t[1] + '</button>'; }).join('') + '<span style="width:6px"></span><button class="inka" title="Inka rufen">Inka</button><button class="dnx" title="Dialog weiter" aria-label="Dialog weiter">▸</button><button class="dcl" title="Dialog schließen" aria-label="Dialog schließen">✕</button></div>'; }
    h += '<nav class="ar">' + areas().map(function(a){ return '<button data-a="' + a.id + '" class="' + (a.id === A.id ? 'on' : '') + '" title="' + esc(a.hint) + '"><i aria-hidden="true">' + a.ic + '</i>' + esc(a.name) + '</button>'; }).join('') + '</nav>';
    if (A.subs && A.subs.length > 1) h += '<nav class="sb">' + A.subs.map(function(s){ return '<button data-s="' + s[0] + '" class="' + (s[0] === sub ? 'on' : '') + '">' + esc(s[1]) + '</button>'; }).join('') + '</nav>';
    h += '<div class="bd"></div>';
    box.innerHTML = h; var bd = $('.bd', box);
    $$('.fc button', box).forEach(function(b){ b.onclick = function(){ setFace(b.getAttribute('data-f')); }; });
    $('.undo', box).onclick = undo; $('.redo', box).onclick = redo; $('.cls', box).onclick = function(){ setOpen(false); }; $('.more', box).onclick = moreMenu;
    $('.cnt', box).onclick = function(){ go('pub', 'pub'); }; $('.pal', box).onclick = openPal;
    $$('nav.ar button', box).forEach(function(b){ b.onclick = function(){ go(b.getAttribute('data-a')); }; });
    $$('nav.sb button', box).forEach(function(b){ b.onclick = function(){ go(A.id, b.getAttribute('data-s')); }; });
    $$('.tempo button[data-m]', box).forEach(function(b){ b.onclick = function(){ if (window.JK_DEVAPI){ window.JK_DEVAPI.speed(b.getAttribute('data-m')); render(); } }; });
    if ($('.tempo .inka', box)){ $('.tempo .inka', box).onclick = function(){ devRun('KeyI'); }; $('.tempo .dnx', box).onclick = function(){ devRun('KeyN'); }; $('.tempo .dcl', box).onclick = function(){ devRun('KeyX'); }; }
    if (A.id === 'pub' && sub !== 'ex') rPub(bd);
    else if (S.face === 'gestalt') rDesign(bd, A.id);
    else if (A.id === 'aussehen') rRegTab(bd, sub);
    else rDev(bd, sub);
    tick(); setDock(); }
  function devRun(code){ if (window.JK_DEVAPI) window.JK_DEVAPI.run(code); else say('Spiel-Werkzeuge laden noch ...'); }
  function rDev(bd, t){ var w = D.createElement('div'); w.className = 'wsdev'; bd.appendChild(w);
    if (!window.JK_DEVAPI || !DEVREADY){ w.innerHTML = '<p class="note">Spiel-Werkzeuge laden ...</p>'; loadDev(); return; }
    window.JK_DEVAPI.mount(w, t); }

  /* Regler (Design 11, Feinarbeit 6): groß, Zahlenfeld, Pfeiltasten (fein, Shift groß, Alt ganz fein), Doppelklick setzt zurück */
  function ctl(k){ var p = CF.META[k]; if (!p) return ''; var v = val(k), chg = locKeys(k).length > 0, sc = locKeys(k).map(function(x){ return /@d$/.test(x) ? 'Desktop' : /@m$/.test(x) ? 'Handy' : 'beide'; }).join(', ');
    var top = '<div class="tp"><label title="' + esc(p[0]) + '">' + esc(p[3]) + '</label><span>' + (chg ? '<span class="sc">' + esc(sc) + '</span> ' : '') + '<button class="rs" title="Zurücksetzen (Doppelklick auf den Namen)">↺</button></span></div>';
    if (p[9] === 'color'){ var paper = val('col.paper'), ink = val('col.ink'), ref = k === 'col.paper' ? ink : paper, r = contrast(v, ref), a = amp(r, k !== 'col.ink' && k !== 'col.paper');
      return '<div class="ctl" data-k="' + k + '">' + top + '<div class="crow"><span class="sw" style="background:' + esc(v) + '"><input type="color" value="' + esc(String(v).slice(0, 7).toLowerCase()) + '" aria-label="' + esc(p[3]) + '"></span><div>' +
        '<div class="row" style="margin:0"><input class="hex" type="text" value="' + esc(String(v).toUpperCase()) + '" maxlength="7" aria-label="Hex"><span class="amp ' + a[0] + '" title="Kontrast nach WCAG 2.2 gegen ' + (k === 'col.paper' ? 'Schrift' : 'Papier') + '">' + a[1] + ' ' + r.toFixed(2) + ':1</span></div>' +
        '<div class="smp" style="background:' + esc(k === 'col.paper' ? v : paper) + ';color:' + esc(k === 'col.paper' ? ink : v) + '">' + (k === 'col.paper' ? 'Schrift auf diesem Papier' : 'Text in dieser Farbe auf Papier') + '</div></div></div><div class="hint">' + esc(p[4]) + '</div></div>'; }
    var bin = p[6] === 0 && p[7] === 1 && p[8] === 1;
    return '<div class="ctl" data-k="' + k + '">' + top + '<div class="c"><input type="range" min="' + p[6] + '" max="' + p[7] + '" step="' + p[8] + '" value="' + v + '" aria-label="' + esc(p[3]) + '"><input class="num" type="number" min="' + p[6] + '" max="' + p[7] + '" step="' + p[8] + '" value="' + v + '" aria-label="' + esc(p[3]) + ' als Zahl"><span class="u">' + esc(p[9] || (bin ? 'an/aus' : '')) + '</span></div><div class="hint">' + esc(p[4]) + '</div></div>'; }
  function scopeSeg(){ return '<div class="row"><span class="note" style="margin:0">Gilt für</span><span class="seg scp">' + [['beide', 'Handy und Desktop'], ['d', 'nur Desktop'], ['m', 'nur Handy']].map(function(s){ return '<button data-sc="' + s[0] + '" class="' + (S.scope === s[0] ? 'on' : '') + '">' + s[1] + '</button>'; }).join('') + '</span></div>'; }
  function wire(bd){ $$('.scp button', bd).forEach(function(b){ b.onclick = function(){ S.scope = b.getAttribute('data-sc'); lsSet('jk_ws_scope', S.scope); render(); }; });
    $$('.ctl', bd).forEach(function(e){ var k = e.getAttribute('data-k'), p = CF.META[k], rg = $('input[type=range]', e), nm = $('input.num', e), col = $('input[type=color]', e), hx = $('input.hex', e);
      function put(v, live){ if (p[9] !== 'color'){ v = +(+v).toFixed(dec(p[8])); if (isNaN(v)) return; v = Math.max(p[6], Math.min(p[7], v)); if (rg) rg.value = v; if (nm && (!live || D.activeElement !== nm)) nm.value = v; }
        setv(k, v); if (p[9] === 'color' && !live) render(); else tick(); }
      $('label', e).ondblclick = function(){ resetv(k); render(); }; $('.rs', e).onclick = function(){ resetv(k); render(); };
      if (rg){ rg.oninput = function(){ put(rg.value, true); }; rg.ondblclick = function(){ resetv(k); render(); }; }
      if (nm) nm.onchange = function(){ put(nm.value); };
      [rg, nm].forEach(function(x){ if (!x) return; x.addEventListener('keydown', function(ev){ if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(ev.key) < 0) return; ev.preventDefault(); var d = (ev.key === 'ArrowUp' || ev.key === 'ArrowRight') ? 1 : -1, m = ev.shiftKey ? 10 : ev.altKey ? .1 : 1; put(+val(k) + d * p[8] * m, true); }); });
      if (col){ col.oninput = function(){ $('.sw', e).style.background = col.value; hx.value = col.value.toUpperCase(); setv(k, col.value.toUpperCase()); tick(); }; col.onchange = function(){ render(); }; }
      [nm, hx].forEach(function(x){ if (x) x.addEventListener('keydown', function(ev){ if (ev.key === 'Enter'){ ev.preventDefault(); x.onchange && x.onchange(); } }); });
      if (hx) hx.onchange = function(){ var v = hx.value.trim(); if (!/^#?[0-9a-f]{6}$/i.test(v)){ say('Bitte sechsstelligen Hex-Wert, z. B. #E2231A'); return; } put((v[0] === '#' ? v : '#' + v).toUpperCase()); }; }); }
  function rDesign(bd, id){ var A = curArea(), G = GK[id] || [];
    var html = '<h2>' + esc(A.name) + '</h2><p class="note">Änderungen wirken sofort auf dieser Seite, nur in deinem Browser. Veröffentlicht wird erst über „Veröffentlichen“.</p>' + scopeSeg();
    if (id === 'farben'){ var pr = contrast(val('col.ink'), val('col.paper')), a = amp(pr); html += '<div class="msg">Schrift auf Papier: <span class="amp ' + a[0] + '">' + a[1] + ' ' + pr.toFixed(2) + ':1</span> <span class="note">(WCAG 2.2, Pflicht; mindestens 4,5:1)</span></div>'; }
    if (id === 'raster') html += '<div class="row"><button class="btn ghost sm grd">' + (D.getElementById('wsgrid') ? 'Raster ausblenden' : 'Raster über der Seite zeigen') + '</button></div>';
    G.forEach(function(g){ html += '<h3>' + esc(g[0]) + '</h3>' + g[1].map(ctl).join(''); });
    if (id === 'schrift') html += '<p class="note" style="margin-top:18px">Schrift laden, Achsen, OpenType und Werte, die zwischen Handy und Desktop fließen, kommen in der nächsten Etappe hierher.</p>';
    bd.innerHTML = html; wire(bd); var gb = $('.grd', bd); if (gb) gb.onclick = function(){ grid(); render(); }; }
  function rRegTab(bd, t){ var groups = {}; CF.P.forEach(function(p){ if (p[1] !== t) return; (groups[p[2]] = groups[p[2]] || []).push(p[0]); });
    var html = '<h2>' + esc(t) + '</h2>' + scopeSeg(); Object.keys(groups).forEach(function(g){ html += '<h3>' + esc(g) + '</h3>' + groups[g].map(ctl).join(''); }); bd.innerHTML = html; wire(bd); }

  /* Raster als Überlagerung (Design 15): Ränder aus --gutterx, Grundlinien aus der Zeilenhöhe */
  function grid(){ var g = D.getElementById('wsgrid'); if (g){ g.remove(); return; } g = D.createElement('div'); g.id = 'wsgrid'; D.body.appendChild(g); drawGrid(); }
  function drawGrid(){ var g = D.getElementById('wsgrid'); if (!g) return; var cs = getComputedStyle(D.body), gx = parseFloat(getComputedStyle(R).getPropertyValue('--gutterx')) || parseFloat(val('ui.gutter')) || 40, w = g.getBoundingClientRect().width, lh = parseFloat(cs.lineHeight) || 24, h = '';
    [gx, w - gx].forEach(function(x){ h += '<i style="left:' + x + 'px"></i><b style="left:' + x + 'px">' + Math.round(gx) + ' px</b>'; }); for (var y = lh; y < innerHeight; y += lh) h += '<u style="top:' + y + 'px"></u>'; g.innerHTML = h; }
  window.addEventListener('resize', function(){ clearTimeout(drawGrid.t); drawGrid.t = setTimeout(drawGrid, 150); });
  CF.sub(function(){ drawGrid(); });

  /* ---------- Veröffentlichen: ein Weg über das Backend (UX 7, 8; Design 12, 16) ---------- */
  function api(path, body, cb){ var x = new XMLHttpRequest(); x.open(body === undefined ? 'GET' : 'POST', API + path, true); x.setRequestHeader('Content-Type', 'application/json'); if (S.sess) x.setRequestHeader('Authorization', 'Bearer ' + S.sess);
    x.onload = function(){ var j = null; try { j = JSON.parse(x.responseText); } catch(e){} if (x.status === 401 && path !== '/auth/verify') logout(true); cb(j || {ok:false, error:'Antwort ' + x.status}); }; x.onerror = function(){ cb({ok:false, error:'Backend nicht erreichbar'}); }; x.send(body === undefined ? null : JSON.stringify(body)); }
  function logout(silent){ if (!silent && S.sess) api('/auth/logout', {}, function(){}); S.sess = ''; S.me = null; lsSet('jk_api_sess', null); lsSet('jk_api_me', null); }
  function b64(data){ if (typeof data === 'string') data = new TextEncoder().encode(data); var s = ''; for (var i = 0; i < data.length; i += 0x8000) s += String.fromCharCode.apply(null, data.subarray(i, i + 0x8000)); return btoa(s); }
  function payload(files){ var p = {}, L = CF.local(); if (Object.keys(L).length) p.regler = JSON.parse(JSON.stringify(L));
    if (window.JK_DEVAPI){ var d = window.JK_DEVAPI.payload(); if (d.texte) p.texte = d.texte; if (d.korrekturen) p.korrekturen = d.korrekturen; }
    else if (canSpiel()){ var t = lsJ('jk_dev_text', {}), k = lsJ('jk_dev_kor', []); if (['convos', 'scenes', 'beh'].some(function(x){ return Object.keys(t[x] || {}).length; })) p.texte = t; if (Array.isArray(k) && k.length) p.korrekturen = k; }
    if (files && window.JK_DEVAPI && counts().extraN){ var f = window.JK_DEVAPI.files(); p.dateien = f.map(function(x){ return {name:x.name, b64:b64(x.data)}; }); }
    return p; }
  function clearLocal(){ APPLYING = true; try { CF.replace({}); if (window.JK_DEVAPI) window.JK_DEVAPI.clearLocal(); else { lsSet('jk_dev_text', JSON.stringify({convos:{}, scenes:{}, beh:{}})); lsSet('jk_dev_kor', '[]'); } lsSet('jk_ws_extrapub', counts().extra.join('|')); } finally { APPLYING = false; } PEND = null; H = []; HI = 0; saveH(); }
  function load(){ api('/history', undefined, function(j){ S.hist = j.ok ? j.items : []; if (curArea().id === 'pub') render(); });
    api('/drafts', undefined, function(j){ S.drafts = j.ok ? j.drafts : []; if (curArea().id === 'pub') render(); });
    if (role() === 'owner') api('/users', undefined, function(j){ S.users = j.ok ? j.users : []; if (curArea().id === 'pub') render(); }); }
  var WATCH = null;
  function watch(id){ var t0 = Date.now(); WATCH = {id:id, p:15, txt:'Wird ins Repository gelegt ...'}; render();
    (function poll(){ api('/history', undefined, function(j){ if (!WATCH || WATCH.id !== id) return; S.hist = j.ok ? j.items : S.hist; var it = (S.hist || []).filter(function(x){ return x.id === id; })[0], dt = (Date.now() - t0) / 1000;
      if (it && it.status === 'fehler'){ WATCH = {id:id, p:100, txt:'Fehler beim Einbauen. Details: data/applied/' + id + '.failed.json', err:true}; render(); return; }
      if (it && it.status === 'eingebaut'){ if (!WATCH.built){ WATCH.built = Date.now(); } var b = (Date.now() - WATCH.built) / 1000; if (b > 60){ WATCH = {id:id, p:100, txt:'Live. Neu laden zeigt den Stand für alle.', done:true}; chord(); render(); return; } WATCH.p = 70 + Math.min(29, b / 2); WATCH.txt = 'Eingebaut, die Seite wird gebaut (etwa eine Minute) ...'; }
      else { WATCH.p = Math.min(65, 15 + dt / 2); WATCH.txt = 'Wird eingebaut ...'; }
      if (curArea().id === 'pub') { var pg = $('.prog i', box), tx = $('.wtxt', box); if (pg) pg.style.width = WATCH.p + '%'; if (tx) tx.textContent = WATCH.txt; }
      if (dt < 420) setTimeout(poll, 8000); else { WATCH.txt = 'Dauert länger als üblich. Verlauf später prüfen.'; render(); } }); })(); }
  function celebrate(){ stamp.className = face(); stamp.textContent = S.face === 'spiel' ? 'Eingegraben' : 'Veröffentlicht ✓'; void stamp.offsetWidth; stamp.classList.add('go'); thud(); setTimeout(chord, 250);
    if (ls('jk_ws_firstpub', '') !== '1'){ lsSet('jk_ws_firstpub', '1'); var X = window.JK_SBX, col = X && X.CH && X.CH.inka && X.CH.inka.col || '#3fb6ff'; var k = D.createElement('div'); k.id = 'wsinka'; k.style.borderColor = col; k.innerHTML = '<b style="color:' + esc(col) + '">INKA</b>Erste Veröffentlichung. Ich hab zugesehen. Sieht gut aus. Gojira ist neidisch.'; k.onclick = function(){ k.remove(); }; D.body.appendChild(k); setTimeout(function(){ k.remove(); }, 9000); } }
  function rPub(bd){ var me = S.me, m = S.msg ? '<div class="msg">' + esc(S.msg) + '</div>' : '';
    if (!S.sess || !me){ bd.innerHTML = '<h2>Anmelden</h2>' + m + '<p>Zum Veröffentlichen meldest du dich einmal an: Du bekommst einen Link per Mail (gilt 15 Minuten, landet manchmal im Spam). Die Anmeldung hält 30 Tage.</p><div class="row"><input type="email" class="pe" placeholder="E-Mail-Adresse" autocomplete="email" style="flex:1"><button class="btn pri pl">Link schicken</button></div>' + listChanges();
      $('.pl', bd).onclick = function(){ var e = $('.pe', bd).value.trim(); if (!e) return; api('/auth/link', {email:e, back:location.origin + location.pathname}, function(j){ S.msg = j.ok ? 'Wenn die Adresse eingetragen ist, kommt gleich eine Mail. Link dort anklicken.' : (j.error || 'Fehler'); render(); }); }; wireList(bd); return; }
    var c = counts(), design = role() === 'design';
    var html = '<h2>Veröffentlichen</h2><div class="row"><span>' + esc(me.name) + ' <span class="note">(' + (design ? 'Gestaltung' : 'alles') + ')</span></span><span style="flex:1"></span><button class="btn ghost sm rl">Aktualisieren</button><button class="btn ghost sm lo">Abmelden</button></div>' + m;
    if (WATCH) html += '<div class="msg"><div class="wtxt">' + esc(WATCH.txt) + '</div><div class="prog"><i style="width:' + WATCH.p + '%;' + (WATCH.err ? 'background:var(--bad)' : '') + '"></i></div></div>';
    html += listChanges();
    if (c.n){ html += '<div class="row"><input type="text" class="pt" placeholder="Kurz beschreiben, was sich ändert" style="flex:1"></div><div class="row"><button class="btn pv">Vorschau-Link</button><button class="btn pri pp">' + (design && !designOnly() ? 'Als Entwurf an Josef' : 'Veröffentlichen') + '</button></div>' +
      (design && !designOnly() ? '<p class="note">Einige Änderungen gehören nicht zur Gestaltung; sie gehen als Entwurf an Josef.</p>' : '<p class="note">Live nach etwa 1 bis 3 Minuten. Jede Veröffentlichung lässt sich zurückrollen.</p>'); }
    if (S.last) html += '<p class="note">Vorschau: <a href="' + esc(S.last) + '" target="_blank" rel="noopener">' + esc(S.last) + '</a> <button class="btn ghost sm cp">kopieren</button></p>';
    var RV = {}; (S.hist || []).forEach(function(x){ if (x.kind === 'revert' && x.target && x.status !== 'fehler') RV[x.target] = 1; });
    html += '<h3>Verlauf</h3>' + (S.hist === null ? '<p class="note">lädt ...</p>' : !S.hist.length ? '<p class="note">Noch nichts veröffentlicht.</p>' : '<div class="lst">' + S.hist.map(function(x){
      var rv = RV[x.id], cl = x.status === 'fehler' ? 'err' : x.status === 'wartet' ? 'wart' : rv ? '' : 'live', lb = rv ? '↺ zurückgerollt' : x.status === 'wartet' ? '◷ wird eingebaut' : x.status === 'fehler' ? '! Fehler' : x.kind === 'revert' ? '↺ Rücknahme' : '✓ live';
      return '<div><i>' + when(x.created) + '</i><span class="st ' + cl + '">' + lb + '</span><span>' + esc(x.message) + ' <span class="note">' + esc(x.name || '') + '</span></span>' + (role() === 'owner' && x.kind === 'publish' && x.status === 'eingebaut' && !rv ? '<button class="btn ghost sm rv" data-id="' + esc(x.id) + '">zurückrollen</button>' : '') + '</div>'; }).join('') + '</div>');
    html += '<h3>Entwürfe</h3>' + (S.drafts === null ? '<p class="note">lädt ...</p>' : !S.drafts.length ? '<p class="note">Keine.</p>' : '<div class="lst">' + S.drafts.map(function(d){
      return '<div><i>' + when(d.created) + '</i><span class="st draft">◐ Entwurf</span><span><a href="' + esc(location.origin + '/de/index.html?preview=' + d.id) + '" target="_blank" rel="noopener">' + esc(d.title) + '</a> <span class="note">' + esc(d.name || d.email) + '</span></span>' + (role() === 'owner' ? '<button class="btn ghost sm dp" data-id="' + esc(d.id) + '" data-t="' + esc(d.title) + '">veröffentlichen</button>' : '') + '</div>'; }).join('') + '</div>');
    if (role() === 'owner') html += '<h3>Personen</h3>' + (S.users ? '<div class="lst">' + S.users.map(function(u){ return '<div><span>' + esc(u.name) + ' <span class="note">' + esc(u.email) + ' · ' + (u.role === 'owner' ? 'alles' : 'Gestaltung') + '</span></span></div>'; }).join('') + '</div>' : '') +
      '<div class="row"><input type="text" class="un" placeholder="Name" style="width:110px;flex:none"><input type="email" class="ue" placeholder="E-Mail" style="flex:1"><select class="in ur" style="width:auto"><option value="design">Gestaltung</option><option value="owner">alles</option></select><button class="btn sm ua">Hinzufügen</button></div>';
    bd.innerHTML = html; wireList(bd);
    $('.lo', bd).onclick = function(){ logout(); S.msg = 'Abgemeldet.'; render(); }; $('.rl', bd).onclick = function(){ S.msg = ''; load(); };
    if ($('.cp', bd)) $('.cp', bd).onclick = function(){ try { navigator.clipboard.writeText(S.last); say('Link kopiert.'); } catch(e){} };
    if ($('.pv', bd)) $('.pv', bd).onclick = function(){ var t = $('.pt', bd).value.trim() || 'Entwurf ' + when(Date.now()), pl = payload(true);
      api('/drafts', {title:t, payload:pl}, function(j){ if (!j.ok && pl.dateien && /groß|Unbekannt/.test(j.error || '')){ delete pl.dateien; api('/drafts', {title:t, payload:pl}, done); S.msg = 'Sprites und Klänge sind zu groß für einen Entwurf; der Vorschau-Link zeigt den Rest.'; } else done(j); });
      function done(j){ if (j.ok){ S.last = j.preview.replace(/^https:\/\/theidealcity\.gg/, location.origin); S.msg = (S.msg && /Sprites/.test(S.msg) ? S.msg + ' ' : '') + 'Vorschau-Link erstellt.'; blip(784, .08); load(); } else S.msg = j.error || 'Fehler'; render(); } };
    var arm = false; if ($('.pp', bd)) $('.pp', bd).onclick = function(e){ var b = e.currentTarget; if (role() === 'design' && !designOnly()){ $('.pv', bd).click(); return; }
      if (!arm){ arm = true; b.textContent = 'Wirklich veröffentlichen?'; return; } var t = $('.pt', bd).value.trim() || 'Änderungen aus der Werkstatt'; b.disabled = true;
      api('/publish', {payload:payload(true), message:t}, function(j){ if (j.ok){ clearLocal(); S.msg = ''; celebrate(); watch(j.id); load(); } else { S.msg = j.error || 'Fehler'; render(); } }); };
    $$('.dp', bd).forEach(function(b){ b.onclick = function(){ if (b.getAttribute('data-arm') !== '1'){ b.setAttribute('data-arm', '1'); b.textContent = 'Wirklich?'; return; } api('/publish', {draft:b.getAttribute('data-id'), message:b.getAttribute('data-t')}, function(j){ if (j.ok){ celebrate(); watch(j.id); } else S.msg = j.error || 'Fehler'; load(); render(); }); }; });
    $$('.rv', bd).forEach(function(b){ b.onclick = function(){ if (b.getAttribute('data-arm') !== '1'){ b.setAttribute('data-arm', '1'); b.textContent = 'Wirklich zurückrollen?'; return; } api('/revert', {id:b.getAttribute('data-id')}, function(j){ S.msg = j.ok ? 'Wird zurückgerollt. In 1 bis 3 Minuten live.' : (j.error || 'Fehler'); if (j.ok) watch(j.id); load(); render(); }); }; });
    if ($('.ua', bd)) $('.ua', bd).onclick = function(){ var e = $('.ue', bd).value.trim(), n = $('.un', bd).value.trim(), r = $('.ur', bd).value; if (!e) return; api('/users', {email:e, name:n || e, role:r}, function(j){ S.msg = j.ok ? (n || e) + ' kann sich jetzt anmelden.' : (j.error || 'Fehler'); load(); render(); }); };
    if (S.hist === null && !S.busy){ S.busy = true; load(); } }
  var DESIGNP = ['type.', 'color.', 'grid.', 'design.', 'ui.', 'col.', 'plot.', 'hand.', 'fx.'];
  function designOnly(){ var c = counts(); if (c.texte || c.korrekturen || c.extraN) return false; return Object.keys(CF.local()).every(function(k){ return DESIGNP.some(function(p){ return k.indexOf(p) === 0; }); }); }
  /* Liste der lokalen Änderungen mit Verlauf zum Zurückspringen */
  function listChanges(){ var c = counts(), L = CF.local(), h = '<h3>Deine Änderungen</h3>';
    if (!c.n) h += '<p class="note">Keine lokalen Änderungen. Alles ist veröffentlicht.</p>';
    else { h += '<div class="lst">' + Object.keys(L).map(function(k){ var b = k.replace(/@[dm]$/, ''), m = CF.META[b], v = L[k], o = m ? (Array.isArray(m[5]) ? m[5][/@m$/.test(k) ? 1 : 0] : m[5]) : '';
        return '<div><span class="st chg">● Regler</span><span>' + esc(m ? m[3] : k) + (/@d$/.test(k) ? ' (Desktop)' : /@m$/.test(k) ? ' (Handy)' : '') + ' <span class="note">' + esc(o) + ' → </span><b>' + esc(v) + '</b></span><button class="btn ghost sm gk" data-k="' + esc(b) + '">zeigen</button></div>'; }).join('') +
        (c.texte ? '<div><span class="st chg">● Texte</span><span>' + c.texte + ' Dialoge oder Szenen geändert</span><button class="btn ghost sm gt" data-t="tx">zeigen</button></div>' : '') +
        (c.korrekturen ? '<div><span class="st chg">● Korrekturen</span><span>' + c.korrekturen + ' Korrekturen auf Seiten</span><button class="btn ghost sm gt" data-t="tx">zeigen</button></div>' : '') +
        (c.extraN ? '<div><span class="st chg">● Dateien</span><span>' + esc(c.extra.join(', ')) + '</span><button class="btn ghost sm gt" data-t="sp">zeigen</button></div>' : '') + '</div>'; }
    h += '<h3>Verlauf deiner Schritte</h3>' + (H.length ? '<p class="note">Klick springt zu diesem Stand (' + MOD + '+Z und ' + MOD + '+Shift+Z gehen schrittweise).</p><div class="lst">' + '<div><i>Anfang</i><span>' + (HI === 0 ? '<b>● hier</b>' : '') + '</span><button class="btn ghost sm hj" data-n="0">hierhin</button></div>' + H.map(function(s, i){
      return '<div style="' + (i >= HI ? 'opacity:.45' : '') + '"><i>' + when(s.t) + '</i><span>' + esc(s.l) + (i === HI - 1 ? ' <b>● hier</b>' : '') + '</span><button class="btn ghost sm hj" data-n="' + (i + 1) + '">hierhin</button></div>'; }).reverse().join('') + '</div>' : '<p class="note">Noch keine Schritte.</p>');
    return h; }
  function wireList(bd){ $$('.hj', bd).forEach(function(b){ b.onclick = function(){ jump(+b.getAttribute('data-n')); }; });
    $$('.gk', bd).forEach(function(b){ b.onclick = function(){ focusKey(b.getAttribute('data-k')); }; });
    $$('.gt', bd).forEach(function(b){ b.onclick = function(){ if (S.face !== 'spiel') setFace('spiel'); var t = b.getAttribute('data-t'); go(DEVTAB[t], t); }; }); }
  function areaOfKey(k){ var p = CF.META[k]; if (!p) return null; if (S.face === 'gestalt'){ for (var a in GK) if (GK[a].some(function(g){ return g[1].indexOf(k) >= 0; })) return [a, null]; if (!canSpiel()) return null; setFace('spiel'); } return ['aussehen', p[1]]; }
  function focusKey(k){ var a = areaOfKey(k); if (!a){ say('Dieser Regler gehört nicht zur Gestaltung.'); return; } go(a[0], a[1]); setTimeout(function(){ var e = $('.ctl[data-k="' + k + '"]', box); if (e){ e.scrollIntoView({block:'center'}); e.classList.add('hl'); var i = $('input', e); if (i) i.focus({preventScroll:true}); } }, 30); }

  /* ---------- Mehr: Geräte, Raster, Klänge, Handbuch, Abmelden ---------- */
  function moreMenu(){ openPal('', true); }
  function devices(){ var o = D.getElementById('wsdv'); if (o){ o.remove(); return; } o = D.createElement('div'); o.id = 'wsdv';
    var u = location.pathname + '?devframe' + location.hash;
    o.innerHTML = '<div class="bar"><button class="x">Schließen</button><button class="rl">Neu laden</button><span style="font:12px WSMono,monospace;align-self:center;color:#555">Regler wirken in beiden Rahmen sofort mit.</span></div><div class="fr dk"><span class="lb">Desktop 1440 × 900</span><iframe src="' + esc(u) + '" title="Desktop"></iframe></div><div class="fr ph"><span class="lb">Handy 390 × 844</span><iframe src="' + esc(u) + '" title="Handy"></iframe></div>';
    D.body.appendChild(o); function lay(){ var W = o.clientWidth - 28 - 14, Hh = o.clientHeight - 58, ph = Math.min(1, (Hh) / 860), pw = 390 * ph + 16, dw = Math.max(200, W - pw), sc = Math.min(dw / 1440, Hh / 900);
      var d = $('.dk', o), di = $('.dk iframe', o), p = $('.ph', o), pi = $('.ph iframe', o); di.style.width = '1440px'; di.style.height = '900px'; di.style.transform = 'scale(' + sc + ')'; d.style.width = 1440 * sc + 'px'; d.style.height = 900 * sc + 'px';
      pi.style.width = '390px'; pi.style.height = '844px'; pi.style.transform = 'scale(' + ph + ')'; p.style.width = 390 * ph + 16 + 'px'; p.style.height = 844 * ph + 16 + 'px'; }
    lay(); window.addEventListener('resize', lay); $('.x', o).onclick = function(){ window.removeEventListener('resize', lay); o.remove(); }; $('.rl', o).onclick = function(){ $$('iframe', o).forEach(function(f){ f.src = f.src; }); }; }
  function manual(){ var m = D.createElement('div'); m.id = 'wsmod'; m.className = face(); m.innerHTML = '<div class="box" role="dialog" aria-label="Handbuch"><button class="x">Schließen</button><h2>Handbuch</h2>' +
    '<p>Die Werkstatt ist ein Werkzeug für die Arbeit an theidealcity.gg. Alles, was du hier änderst, wirkt sofort auf der Seite, aber nur in deinem Browser, bis du es veröffentlichst.</p>' +
    '<h3>Zwei Gesichter</h3><ul><li><b>Gestaltung</b>: Schrift, Farben, Raster, Bewegung. Alina veröffentlicht diese Werte selbst.</li><li><b>Spiel</b>: Momente herstellen, Spielstand, Texte, Figuren und Klänge, Prüfen. Alles außer Gestaltung veröffentlicht Josef.</li></ul>' +
    '<h3>Regler</h3><ul><li>Ziehen, Zahl eintippen oder Pfeiltasten: Pfeil fein, Shift groß, Alt ganz fein.</li><li>Doppelklick auf Namen oder Regler setzt zurück (↺).</li><li>„Gilt für“: Handy und Desktop zusammen oder getrennt.</li><li>Farben: Kontrast nach WCAG 2.2 gegen Papier (✓ reicht, △ nur für große Schrift, ✕ zu schwach). Es wird nur gewarnt.</li></ul>' +
    '<h3>Kürzel</h3><ul><li><b>' + MOD + '+K</b>: Befehlspalette (alles suchen, auch jeden Regler)</li><li><b>' + MOD + '+Z</b> rückgängig, <b>' + MOD + '+Shift+Z</b> oder <b>' + MOD + '+Y</b> wiederholen</li><li><b>Esc</b>: Palette oder Fenster schließen</li></ul>' +
    '<h3>Zähler und Verlauf</h3><p>Der Zähler oben zeigt, was noch nicht veröffentlicht ist. Ein Klick öffnet die Liste und den Verlauf deiner Schritte; dort springst du zu jedem früheren Stand.</p>' +
    '<h3>Veröffentlichen</h3><ul><li><b>Vorschau-Link</b>: Entwurf mit Link, den andere ansehen können (blaues Schild VORSCHAU).</li><li><b>Veröffentlichen</b>: live nach 1 bis 3 Minuten; der Fortschritt läuft mit. Josef kann jede Veröffentlichung zurückrollen.</li><li>Sprites und Klänge gehen über denselben Knopf ins Repository; der Einbau ins Spiel folgt danach.</li></ul>' +
    '<h3>Zustände</h3><ul><li>● geändert (lokal) · ◐ Entwurf · ◷ wird eingebaut · ✓ live · ! Fehler · ↺ zurückgerollt</li></ul>' +
    '<h3>Abmelden</h3><p>Adresse mit <code>?werkstatt=aus</code> öffnen: Die Werkstatt verschwindet in diesem Browser.</p></div>';
    D.body.appendChild(m); m.onclick = function(e){ if (e.target === m || e.target.classList.contains('x')) m.remove(); }; }

  /* ---------- Befehlspalette (UX 5, 19) ---------- */
  function cmds(){ var C = [], owner = canSpiel();
    function add(l, fn, kw, k, grp){ C.push({l:l, fn:fn, kw:norm(l + ' ' + (kw || '') + ' ' + (grp || '')), k:k || '', g:grp || ''}); }
    add('Rückgängig', undo, 'undo zuruck', MOD + ' Z', 'Bearbeiten'); add('Wiederholen', redo, 'redo', MOD + ' ⇧ Z', 'Bearbeiten');
    add('Änderungen und Verlauf zeigen', function(){ go('pub', 'pub'); }, 'zahler liste history', '', 'Bearbeiten');
    add('Veröffentlichen', function(){ go('pub', 'pub'); }, 'publish live hochladen', '', 'Veröffentlichen'); add('Vorschau-Link erstellen', function(){ go('pub', 'pub'); setTimeout(function(){ var b = $('.pv', box); if (b) b.focus(); }, 50); }, 'entwurf link teilen', '', 'Veröffentlichen');
    if (owner){ add('Gesicht: Gestaltung', function(){ setFace('gestalt'); }, 'alina design', '', 'Ansicht'); add('Gesicht: Spiel', function(){ setFace('spiel'); }, 'josef game', '', 'Ansicht'); }
    add(S.open ? 'Leiste schließen' : 'Leiste öffnen', function(){ setOpen(!S.open); }, 'dock seitenleiste', '', 'Ansicht');
    add('Handy und Desktop nebeneinander', devices, 'gerate vorschau mobil', '', 'Ansicht'); add('Raster über der Seite ein/aus', function(){ grid(); render(); }, 'overlay spalten rand grundlinien', '', 'Ansicht');
    add(S.snd ? 'Klänge der Werkstatt aus' : 'Klänge der Werkstatt an', function(){ S.snd = !S.snd; lsSet('jk_ws_snd', S.snd ? '1' : '0'); say(S.snd ? 'Klänge an.' : 'Klänge aus.'); }, 'ton sound stumm', '', 'Ansicht');
    add('Handbuch', manual, 'hilfe anleitung help', '', 'Hilfe'); add('Kurze Tour', tour, 'einfuhrung', '', 'Hilfe');
    if (S.sess) add('Abmelden', function(){ logout(); render(); say('Abgemeldet.'); }, 'logout', '', 'Konto');
    add('Werkstatt beenden (?werkstatt=aus)', function(){ location.href = location.pathname + '?werkstatt=aus'; }, 'aus beenden', '', 'Konto');
    areas().forEach(function(a){ add('Gehe zu: ' + a.name, function(){ go(a.id); }, a.hint, '', 'Bereiche'); (a.subs || []).forEach(function(s){ if (a.subs.length > 1) add('Gehe zu: ' + a.name + ' › ' + s[1], function(){ go(a.id, s[0]); }, '', '', 'Bereiche'); }); });
    if (owner && S.face === 'spiel'){ [['KeyI', 'Inka rufen'], ['KeyN', 'Dialog weiter'], ['KeyX', 'Dialog schließen'], ['KeyO', 'Alle Objekte sichtbar ein/aus'], ['KeyV', 'Mögliche Verstecke ein/aus'], ['KeyT', 'Texte auf der Seite bearbeiten ein/aus'], ['KeyE', 'Fehler prüfen']].forEach(function(x){ add(x[1], function(){ devRun(x[0]); }, 'spiel', '', 'Spiel'); });
      [['pause', 'Tempo: Pause'], ['1', 'Tempo: normal'], ['2', 'Tempo: doppelt'], ['4', 'Tempo: vierfach'], ['99', 'Tempo: sofort']].forEach(function(x){ add(x[1], function(){ if (window.JK_DEVAPI){ window.JK_DEVAPI.speed(x[0]); render(); } }, 'geschwindigkeit', '', 'Spiel'); }); }
    CF.P.forEach(function(p){ var inG = Object.keys(GK).some(function(a){ return GK[a].some(function(g){ return g[1].indexOf(p[0]) >= 0; }); }); if (!owner && !inG) return; if (S.face === 'gestalt' && !inG && !owner) return;
      add(p[3] + ' (' + p[2] + ')', function(){ focusKey(p[0]); }, p[0] + ' ' + p[1] + ' ' + p[4], '', 'Regler'); if (!inG) C[C.length - 1].pri = 1; });
    if (S.face === 'gestalt') C = C.map(function(c, i){ return [c.pri || 0, i, c]; }).sort(function(a, b){ return a[0] - b[0] || a[1] - b[1]; }).map(function(x){ return x[2]; });
    return C; }
  var PC = [], PI = 0;
  function openPal(q, more){ PC = cmds(); pal.className = face(); pal.style.display = 'flex'; var i = $('input', pal); i.value = q || ''; i.placeholder = more ? 'Mehr: Geräte, Raster, Klänge, Handbuch ...' : 'Was willst du tun? z. B. Laufweite, Papier, Inka, veröffentlichen'; PI = 0; palList(more); i.focus(); blip(988, .04); }
  function closePal(){ pal.style.display = 'none'; }
  function palList(more){ var q = norm($('input', pal).value).split(/\s+/).filter(Boolean), L = PC.filter(function(c){ if (more && !q.length) return /Ansicht|Hilfe|Konto/.test(c.g); return q.every(function(w){ return c.kw.indexOf(w) >= 0; }); }).slice(0, 60);
    PI = Math.min(PI, Math.max(0, L.length - 1)); $('ul', pal).innerHTML = L.length ? L.map(function(c, i){ return '<li data-i="' + i + '" class="' + (i === PI ? 'on' : '') + '"><span>' + esc(c.l) + '</span><small>' + esc(c.g) + (c.k ? '<kbd>' + esc(c.k) + '</kbd>' : '') + '</small></li>'; }).join('') : '<li><span>Nichts gefunden.</span></li>';
    pal._L = L; $$('li[data-i]', pal).forEach(function(li){ li.onclick = function(){ run(+li.getAttribute('data-i')); }; li.onmousemove = function(){ if (PI !== +li.getAttribute('data-i')){ PI = +li.getAttribute('data-i'); $$('li', pal).forEach(function(x){ x.classList.toggle('on', x === li); }); } }; }); }
  function run(i){ var c = pal._L && pal._L[i]; if (!c) return; closePal(); c.fn(); }
  $('input', pal).addEventListener('input', function(){ PI = 0; palList(); });
  $('input', pal).addEventListener('keydown', function(e){ var n = (pal._L || []).length; if (e.key === 'ArrowDown'){ e.preventDefault(); PI = (PI + 1) % Math.max(1, n); palList(); scrollOn(); } else if (e.key === 'ArrowUp'){ e.preventDefault(); PI = (PI - 1 + n) % Math.max(1, n); palList(); scrollOn(); } else if (e.key === 'Enter'){ e.preventDefault(); run(PI); } else if (e.key === 'Escape'){ e.preventDefault(); closePal(); } e.stopPropagation(); });
  function scrollOn(){ var li = $('li.on', pal); if (li) li.scrollIntoView({block:'nearest'}); }
  pal.addEventListener('mousedown', function(e){ if (e.target === pal) closePal(); });

  /* Kürzel: nur Strg/Cmd+K, Z, Shift+Z, Y (keine Alt-Kürzel mehr) */
  D.addEventListener('keydown', function(e){ var m = MAC ? e.metaKey : e.ctrlKey; if (!m || e.altKey) { if (e.key === 'Escape'){ if (pal.style.display === 'flex') closePal(); var md = D.getElementById('wsmod'); if (md) md.remove(); } return; }
    var k = (e.key || '').toLowerCase(), ed = e.target && (e.target.isContentEditable || /^(TEXTAREA|SELECT)$/.test(e.target.tagName) || (e.target.tagName === 'INPUT' && !/^(range|color|checkbox|radio|button)$/.test(e.target.type)));
    if (k === 'k'){ e.preventDefault(); e.stopPropagation(); if (pal.style.display === 'flex') closePal(); else openPal(); return; }
    if (ed) return;
    if (k === 'z' && !e.shiftKey){ e.preventDefault(); e.stopPropagation(); undo(); } else if ((k === 'z' && e.shiftKey) || k === 'y'){ e.preventDefault(); e.stopPropagation(); redo(); } }, true);

  /* ---------- Tour beim ersten Start (UX 11) ---------- */
  function tour(){ if (!S.open) setOpen(true); var steps = [
      ['nav.ar', 'Hier sind deine Bereiche' + (S.face === 'gestalt' ? ': Schrift, Farben, Raster, Bewegung und Veröffentlichen.' : ': Spiel testen, Texte, Figuren und Klänge, Aussehen, Prüfen, Veröffentlichen.')],
      ['.bd', 'Regler ziehen, Zahl tippen oder Pfeiltasten. Die Seite links ändert sich sofort, nur bei dir. Doppelklick setzt zurück.'],
      ['.cnt', 'Der Zähler zeigt, was noch nicht veröffentlicht ist. Klick öffnet Liste und Verlauf.'],
      ['.undo', MOD + '+Z macht jeden Schritt rückgängig, ' + MOD + '+Shift+Z wiederholt.'],
      ['.pal', MOD + '+K öffnet die Suche: jeder Regler, jeder Bereich, das Handbuch.']];
    var i = 0, ring = D.createElement('div'), tip = D.createElement('div'); ring.id = 'wsring'; tip.id = 'wstour'; D.body.appendChild(ring); D.body.appendChild(tip);
    function end(){ ring.remove(); tip.remove(); lsSet('jk_ws_tour', '1'); }
    function show(){ var s = steps[i], el = $(s[0], box); if (!el){ i++; if (i < steps.length) show(); else end(); return; } var r = el.getBoundingClientRect();
      ring.style.cssText = 'left:' + (r.left - 4) + 'px;top:' + (r.top - 4) + 'px;width:' + (r.width + 8) + 'px;height:' + Math.min(r.height + 8, innerHeight - r.top) + 'px';
      tip.innerHTML = '<div class="n">' + (i + 1) + ' / ' + steps.length + '</div><div>' + esc(s[1]) + '</div><div class="row"><button class="sk">Überspringen</button><button class="nx">' + (i === steps.length - 1 ? 'Los geht’s' : 'Weiter') + '</button></div>';
      var tw = 320, tl = Math.max(10, Math.min(r.left - tw - 16, innerWidth - tw - 10)); if (MQ.matches) tl = 10; tip.style.left = tl + 'px'; tip.style.top = Math.max(10, Math.min(r.top, innerHeight - 170)) + 'px';
      $('.sk', tip).onclick = end; $('.nx', tip).onclick = function(){ i++; blip(880, .04); if (i < steps.length) show(); else end(); }; }
    setTimeout(show, 80); }

  /* ---------- Anmeldung über den Link aus der Mail ---------- */
  (function(){ var m = location.search.match(/[?&]login=([A-Za-z0-9_-]+)/); if (!m) return; var clean = location.pathname + location.search.replace(/([?&])login=[^&]*&?/, '$1').replace(/[?&]$/, '') + location.hash; try { history.replaceState(null, '', clean); } catch(e){}
    api('/auth/verify', {token:m[1]}, function(j){ if (j.ok){ S.sess = j.session; S.me = j.user; lsSet('jk_api_sess', j.session); lsSet('jk_api_me', JSON.stringify(j.user)); S.msg = 'Angemeldet. Willkommen, ' + j.user.name + '.'; S.face = j.user.role === 'owner' ? (S.face || 'spiel') : 'gestalt'; lsSet('jk_ws_face', S.face); if (canSpiel()) loadDev(); }
      else S.msg = j.error || 'Anmeldung fehlgeschlagen'; S.open = true; S.area[S.face] = 'pub'; render(); }); })();

  /* ---------- Start ---------- */
  function boot(){ D.body.appendChild(box); D.body.appendChild(tab); D.body.appendChild(toast); D.body.appendChild(stamp); D.body.appendChild(pal);
    tab.onclick = function(){ setOpen(true); };
    if (S.face === 'spiel' || role() === 'owner') loadDev();
    setDock(); render(); if (MQ.addEventListener) MQ.addEventListener('change', setDock); else MQ.addListener(setDock);
    if (S.open && role() === 'design' && ls('jk_ws_tour', '') !== '1') setTimeout(tour, 900);
    window.JK_WSAPI = {go:go, face:setFace, open:setOpen, undo:undo, redo:redo, counts:counts, hist:function(){ return {H:H, HI:HI}; }, palette:openPal, payload:payload, render:render}; }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
