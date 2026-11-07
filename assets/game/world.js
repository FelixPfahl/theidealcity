/* Welt von THE IDEAL CITY (Josef, 1.11.2026, 08:39 bis 09:05): Verhalten, Gespräche, Gäste, Ticker, Werbung, Fahndung, Fraktionen.
   Lädt nach dem Spiel (game.js stellt window.JK_SBX bereit); Texte aus talk.json (src/build_talk.py aus work/talk/out). Alles nur lokal im Browser. */
(function(){
  var X = window.JK_SBX; if (!X || X.world) return; X.world = true;
  var S = X.S(), PAGE = X.PAGE, T = null, ready = false;
  var now = function(){ return Date.now(); };
  function save(){ X.save(); }
  function dl(k, m){ if (window.JK_DEVLOG) try { window.JK_DEVLOG(k, m); } catch(e){} }   /* Ereignis-Protokoll der Dev Tools */
  function rnd(a){ return a[Math.floor(Math.random() * a.length)]; }
  function H(){ return new Date().getHours(); }
  S.w = S.w || {}; var W = S.w;   /* Weltzustand: cs gesehen, bh Verhalten, bv Varianten, bp Verhaltenspunkte, enc Begegnungen, fac, wanted, fines, mem */
  ['cs', 'bh', 'bv', 'bp', 'sc', 'pv', 'fac', 'mem', 'ach'].forEach(function(k){ W[k] = W[k] || {}; }); W.enc = W.enc || []; W.wanted = W.wanted || 0; W.fines = W.fines || 0; W.fake = W.fake || [];
  if (S.mem){ Object.keys(S.mem).forEach(function(k){ W.mem[k] = S.mem[k]; }); }
  S.mem = W.mem;
  /* Fahndungsstufe sinkt mit der Zeit: eine Stufe je 12 Stunden */
  if (W.wt){ var dec = (now() - W.wt) / 43200000; if (dec > 0){ W.wanted = Math.max(0, W.wanted - dec); } } W.wt = now();
  W.pv[PAGE] = (W.pv[PAGE] || 0) + 1;

  /* ---------- Kontext: Abschnitt, Zeit, Feiertage ---------- */
  var SEC = '', SECNAME = '';
  function secNames(){ var m = {}; document.querySelectorAll('section[id]').forEach(function(s){ var h = s.querySelector('h2'); m[s.id] = h ? (h.getAttribute('aria-label') || h.textContent).replace(/\s+/g, ' ').trim() : s.id; }); return m; }
  var SN = secNames();
  if ('IntersectionObserver' in window){ var vis = {}; var io = new IntersectionObserver(function(es){ es.forEach(function(e){ vis[e.target.id] = e.intersectionRatio * e.boundingClientRect.height; }); var best = '', bv = 0; Object.keys(vis).forEach(function(k){ if (vis[k] > bv){ bv = vis[k]; best = k; } }); SEC = best; SECNAME = SN[best] || ''; }, {threshold:[0, .1, .3, .5, .7, 1]}); document.querySelectorAll('section[id]').forEach(function(s){ io.observe(s); }); }
  function tod(){ var h = H(); return h < 5 ? 'nacht' : h < 11 ? 'morgen' : h < 14 ? 'mittag' : h < 18 ? 'nachmittag' : 'abend'; }
  function easter(y){ var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return new Date(y, mo - 1, da); }
  function days(){ var d = new Date(), md = (d.getMonth() + 1) * 100 + d.getDate(), y = d.getFullYear(), out = {}; var e = easter(y), diff = Math.round((new Date(y, d.getMonth(), d.getDate()) - e) / 86400000);
    if (md >= 1224 && md <= 1226) out.weihnachten = 1; if (md === 1231) out.silvester = 1; if (md === 101) out.neujahr = 1; if (md === 1031) out.halloween = 1; if (md === 214) out.valentin = 1; if (diff >= -2 && diff <= 1) out.ostern = 1;
    if (diff >= -52 && diff <= -47) out.fasching = 1; if (md >= 916 && md <= 1005) out.oktoberfest = 1; if (md === 1003) out.einheit = 1; if (md === 1206) out.nikolaus = 1; if (md === 401) out.ersterapril = 1; if (md === 1223) out.gojiratag = 1; return out; }
  var DAYS = days(), DOW = new Date().getDay();
  var WEEK0 = new Date(2026, 10, 2).getTime();
  function bau(){ var M = (T && T.monuments) || []; if (!M.length) return 'den Kölner Dom'; var i = Math.max(0, Math.floor((now() - WEEK0) / 604800000)); var m = M[i % M.length]; return m.n + ' (' + m.ort + ')'; }
  var WTAG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var PNAME = {kunst:'Bildende Kunst', comic:'Comic', texte:'Texte', vermittlung:'Vermittlung', info:'Info', index:'Startseite', '404':'Seite 404', musterbuch:'Musterbuch', links:'Links', danke:'Danke'};
  var ctx = {};   /* zusätzliche Platzhalter je Auslöser */
  X.hooks.ph = function(k){ switch (k){
    case 'n': return String(X.count()); case 'rest': return String(20 - X.count()); case 'pts': return String(X.points());
    case 'zeit': case 'uhr': var d = new Date(); return k === 'uhr' && W.hr ? W.hr + ' Uhr' : d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2);
    case 'tag': return WTAG[DOW]; case 'abschnitt': return SECNAME || PNAME[PAGE] || 'hier'; case 'bau': return bau(); case 'seite': return PNAME[PAGE] || PAGE;
    case 'bussgeld': return String(ctx.bussgeld || 10); case 'tage': return String(ctx.tage || 7);
    default: return ctx[k] !== undefined ? String(ctx[k]) : null; } };

  /* ---------- Fraktionen, Gedächtnis, Antwortfolgen ---------- */
  X.hooks.onAnswer = function(a, who){ if (a.mem) W.mem[a.mem] = a.s; if (a.f) W.fac[a.f] = (W.fac[a.f] || 0) + 1; if (a.pts){ W.tp = Math.min(200, (W.tp || 0) + a.pts); } if (a.trade) trade(a.trade); save(); };
  function lead(){ var best = '', bv = 2; ['nil', 'retter', 'wagner'].forEach(function(f){ var v = W.fac[f] || 0; if (v > bv){ bv = v; best = f; } else if (v === bv) best = best && v ? best : best; }); return best; }
  X.hooks.bonus = function(){ var b = 0; Object.keys(W.bp).forEach(function(k){ b += W.bp[k]; }); return Math.min(500, b) + (W.tp || 0) - Math.min(300, W.fines || 0); };
  X.hooks.ending = function(){ var f = lead(); if (!f || !T || !T.scenes || !T.scenes['ende_' + f] || (W.fac[f] || 0) < 5) return null; W.ending = f; S.ending = 'fac-' + f; save(); return T.scenes['ende_' + f]; };

  /* ---------- Gespräche ---------- */
  function relOk(r){ for (var w in r){ var v = r[w], R = X.rel(w); if (v >= 0 ? R.n < v : R.n > v) return false; } return true; }
  function eligible(c, opt){ var t = c.trig || {}; opt = opt || {}; if (W.cs[c.id]) return false;
    if (t.page && t.page !== PAGE && !(t.page === 'musterbuch' && /^mb-|^musterbuch$/.test(PAGE))) return false;
    if (t.sec && t.sec !== (opt.sec || SEC)) return false; if (t.work && t.work !== opt.work) return false; if (!t.work && opt.work) return false;
    var n = X.count(); if (t.fmin !== undefined && n < t.fmin) return false; if (t.fmax !== undefined && n > t.fmax) return false;
    if (t.chap !== undefined && X.chapSeen() < t.chap) return false; if (t.time && t.time !== tod()) return false; if (t.dow && t.dow.indexOf(DOW) < 0) return false;
    if (t.day && !DAYS[t.day]) return false; if (t.rel && !relOk(t.rel)) return false;
    if (t.mem){ if (typeof t.mem === 'string'){ if (!W.mem[t.mem]) return false; } else { for (var k in t.mem){ if (W.mem[k] !== t.mem[k]) return false; } } }
    if (t.after && !W.cs[t.after]) return false; if (t.visits && X.V() < t.visits) return false; if (t.ng && X.NG() < t.ng) return false; if (t.fac && lead() !== t.fac) return false; if (t.wanted && W.wanted < t.wanted) return false;
    return true; }
  function score(c){ var t = c.trig || {}, s = 0; ['page', 'fmin', 'fmax', 'chap', 'time', 'dow', 'rel', 'visits', 'ng'].forEach(function(k){ if (t[k] !== undefined) s += 1; }); ['sec', 'mem', 'after', 'fac', 'wanted'].forEach(function(k){ if (t[k] !== undefined) s += 2; }); if (t.day) s += 6; if (t.work) s += 5; return s + Math.random() * 2.5; }
  function pick(opt){ if (!T) return null; var best = null, bs = -1; T.convos.forEach(function(c){ if (!eligible(c, opt)) return; var s = score(c); if (s > bs){ bs = s; best = c; } }); return best; }
  function show(c, how){ if (!c) return false; dl('gespräch', c.id + ' (' + how + ')'); W.cs[c.id] = 1; save(); X.dialog(c.lines, null, {psst:how !== 'call'}); log(c.lines[0], how === 'call' ? 'Gespräch' : 'Gespräch'); return true; }
  X.hooks.greetExtra = function(){ var c = pick({}); if (!c) return []; W.cs[c.id] = 1; save(); return c.lines; };
  /* ungefragt: höchstens alle 40 s, nie während der Plotter im Sichtfeld schreibt, nie über Panels */
  var lastAmb = now();
  function ambient(){ if (!ready || document.hidden || X.busy() || X.quiet() || X.optedOut()) return; var gap = X.CF('game.gap', 40) * 1000; if (now() - X.lastDlg() < gap || now() - lastAmb < gap) return; if (X.readingNow()) return; if (now() - lastInput > 120000) return;
    var w = worldEvent(); if (w) { lastAmb = now(); return; }
    if (Math.random() < X.CF('game.ambskip', .35)) return;   /* nicht jedes Mal */
    var c = pick({}); if (c && show(c, 'amb')) lastAmb = now(); }
  var lastInput = now(); ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function(ev){ window.addEventListener(ev, function(){ lastInput = now(); }, {passive:true, capture:true}); });
  window.addEventListener('jk:lb', function(e){ var a = e.detail && e.detail.a, f = a && a.closest && a.closest('figure.work'); if (!f || !T) return; beh('lightbox');
    setTimeout(function(){ if (!document.querySelector('.lb2.on') || X.busy() || X.optedOut()) return; var c = pick({work:f.id.slice(2)}); if (c) show(c, 'work'); }, 3500); });

  /* ---------- Reaktionen als kurze Mega-Man-Box (Josef, 1.11., 16:18: keine Extra-Blasen mehr) ----------
     höchstens alle 90 s, nie während ein Gespräch läuft, nach Psst gar nichts Ungefragtes; Klick aufs Porträt: Zeile in der laufenden Box */
  var lastBub = 0;
  function bubble(who, text, opt){ opt = opt || {}; if (W.nowatch || X.optedOut() || !text){ dl('reaktion', 'nicht gezeigt: ' + (W.nowatch ? 'Beobachten aus' : X.optedOut() ? 'Nicht jetzt' : 'kein Text')); return false; }
    text = text.replace(/\{(\w+)\}/g, function(m, k){ var v = X.hooks.ph(k); return v === null || v === undefined ? m : v; });
    if (opt.inject){ if (X.inject({who:X.CH[who] ? who : 'inka', text:text})){ log([who, text], 'Reaktion'); return true; } return false; }
    if (X.quiet() || X.busy() || document.hidden){ dl('reaktion', 'nicht gezeigt: ' + (X.quiet() ? 'Psst oder ruhig' : X.busy() ? 'Fenster offen' : 'Tab verborgen')); return false; } if (now() - lastBub < X.CF('game.reactgap', 90) * 1000 || now() - X.lastDlg() < 20000 || now() - lastFoundT < 6000){ dl('reaktion', 'nicht gezeigt: Abstand (' + Math.round((now() - Math.max(lastBub, X.lastDlg())) / 1000) + ' s)'); return false; } lastBub = now();
    X.dialog([{who:X.CH[who] ? who : 'inka', text:text}], null, {psst:true}); log([who, text], 'Reaktion'); return true; }
  function log(line, kind){ var who = Array.isArray(line) ? line[0] : line && line.who, t = Array.isArray(line) ? line[1] : line && line.text; if (!who || !t) return; t = String(t).replace(/\[[^\]]*\]/g, '').replace(/\*/g, ''); W.enc.push({w:who, t:t.slice(0, 160), d:now(), k:kind}); if (W.enc.length > 150) W.enc = W.enc.slice(-150); save(); }

  /* ---------- Verhalten: drei Stufen, nie dieselbe Variante doppelt, Punkte einmal je Partie ---------- */
  var PTS = {read_full:20, footnote:15, ref_open:15, captions:15, slow_read:15, musterbuch:15, pdf:10, spotify:10, lightbox:10, tab_jump:5, page_change:5, select_text:5, copy:5, mode_change:5, lesehilfe:10, zoom:5, calm_toggle:5, rotate:5, resize:5, tab_return:5, external_link:5, find_ctrlf:5, find_streak:20, long_session:15, daily:20, same_hour:10, long_away:10, fav_page:10, type_title:15, type_name:10, cheat_code:10, poke:5, restored:15, scroll_pingpong:5, plot_interrupt:5, images_only:5, pointer_circle:5, page_404:10, back_button:5};
  var cool = {};
  function beh(key, who, extra){ if (!T || !T.beh || !T.beh[key] || W.nowatch || X.optedOut()){ dl('verhalten', key + ': aus'); return false; } var B = T.beh[key]; var n = W.bh[key] = (W.bh[key] || 0) + 1; save();
    if (cool[key] && now() - cool[key] < X.CF('game.behcool', 45) * 1000){ dl('verhalten', key + ': Abkühlung'); return false; } cool[key] = now();
    var st = n <= 2 ? 0 : n <= 5 ? 1 : 2, arr = B.stages[st] || B.stages[0]; var used = W.bv[key + st] = W.bv[key + st] || []; var free = []; arr.forEach(function(_, i){ if (used.indexOf(i) < 0) free.push(i); }); if (!free.length){ used.length = 0; free = arr.map(function(_, i){ return i; }); }
    var i = rnd(free); used.push(i); var v = arr[i]; dl('verhalten', key + ' Stufe ' + (st + 1) + ' Variante ' + (i + 1)); var w = B.who === 'self' ? (who || 'inka') : B.who; if (typeof v === 'object') v = v[w] || v.inka;
    if (extra) Object.keys(extra).forEach(function(k){ ctx[k] = extra[k]; });
    if (!W.bp[key] && PTS[key] !== undefined){ W.bp[key] = PTS[key]; save(); X.refresh(); }   /* Punkte zählen auch, wenn gerade keine Box erscheinen darf */
    var shown = bubble(w, v, {inject:key === 'poke'}); if (!shown){ used.pop(); W.bh[key]--; cool[key] = 0; save(); achievements(); return false; }
    achievements(); return true; }
  X.beh = beh;

  /* Detektoren */
  var lastY = window.pageYOffset, dir = 0, flips = [], sStart = now(), lastScrollT = now(), jumpChecked = false, slowAcc = 0;
  window.addEventListener('scroll', function(){ var y = window.pageYOffset, dy = y - lastY, t = now(); if (Math.abs(dy) < 4) return; var d = dy > 0 ? 1 : -1;
    if (d !== dir){ flips.push(t); flips = flips.filter(function(x){ return t - x < 8000; }); if (flips.length >= 7){ flips = []; beh('scroll_pingpong'); } dir = d; }
    var H2 = document.documentElement.scrollHeight - window.innerHeight; if (Math.abs(dy) > H2 * .5 && H2 > window.innerHeight * 3) beh('jump_bottom');
    var dt = (t - lastScrollT) / 1000; if (dt > 0 && dt < 3){ var v = Math.abs(dy) / dt; if (v < 60) slowAcc += dt; else slowAcc = Math.max(0, slowAcc - dt); if (slowAcc > 75){ slowAcc = 0; beh('slow_read'); } if (v > window.innerHeight * 3) fastN++; }
    lastScrollT = t; lastY = y; plotCheck(); }, {passive:true});
  var fastN = 0; setInterval(function(){ if (fastN > 6) beh('fast_scroll'); fastN = 0; }, 2000);
  /* Zeiger kreist oder wackelt */
  var pts = []; document.addEventListener('pointermove', function(e){ if (e.pointerType !== 'mouse') return; var t = now(); pts.push([e.clientX, e.clientY, t]); pts = pts.filter(function(p){ return t - p[2] < 1800; }); if (pts.length < 20) return; var ang = 0, rev = 0; for (var i = 2; i < pts.length; i++){ var a1 = Math.atan2(pts[i - 1][1] - pts[i - 2][1], pts[i - 1][0] - pts[i - 2][0]), a2 = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]); var da = a2 - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; ang += da; if (Math.abs(da) > 2.4) rev++; }
    if (Math.abs(ang) > Math.PI * 5 || rev > 14){ pts = []; beh('pointer_circle'); } }, {passive:true});
  /* Klicks */
  var clicks = [];
  document.addEventListener('click', function(e){ var t = now(); clicks.push(t); clicks = clicks.filter(function(x){ return t - x < 1600; }); if (clicks.length >= 7){ clicks = []; beh('click_rage'); wanted(.4, 'klickwut'); }
    var el = e.target; if (!el || !el.closest) return;
    if (el.closest('a.reflink')) beh('ref_open'); if (el.closest('main sup, .fnpop, a[href^="#fn"]')) beh('footnote');
    var a = el.closest('a[href]'); if (a){ var href = a.getAttribute('href') || ''; if (/\.pdf($|\?)/i.test(href)) beh('pdf'); else if (/^https?:/i.test(href) && a.host !== location.host) beh('external_link'); else if (/musterbuch\/|\.(png|zip|svg)$/i.test(href) && /^mb-|musterbuch/.test(PAGE)) beh('musterbuch'); else if (/^#/.test(href) && a.closest('nav, header, .subnav, .toc')) beh('tab_jump'); }
    var sp = el.closest('.playbig, .spot, [data-spot]'); if (sp){ var song = sp.getAttribute('data-title') || sp.getAttribute('data-song') || 'der Song'; beh('spotify', null, {song:song}); }
    if (el.closest('.sbdlg img')){ var d = el.closest('.sbdlg'); var who = ((d.className.match(/\bc-(\w+)/) || [])[1]) || 'inka'; beh('poke', who); }
    if (el.closest('.mute')) setTimeout(function(){ var A = window.JK_AUDIO && window.JK_AUDIO(); if (A && A.vol === 0) beh('sound_off'); }, 200);
  }, true);
  document.addEventListener('contextmenu', function(e){ if (e.target.closest && e.target.closest('main')) beh('right_click'); });
  document.addEventListener('copy', function(){ beh('copy'); });
  var selT = null; document.addEventListener('selectionchange', function(){ clearTimeout(selT); selT = setTimeout(function(){ var s = String(window.getSelection() || ''); if (s.length > 25) beh('select_text'); }, 900); });
  /* Tasten: Strg+F, Tastenhauen, Namen, Werktitel, Cheatcodes */
  var keyb = '', keyT = [], CHEATS = ['iddqd', 'idkfa', 'xyzzy', 'hesoyam', 'rosebud', 'justinbailey', 'thereisnospoon', 'motherlode', 'impulse9', 'uuddlrlrba'];
  var TITLES = []; document.querySelectorAll('figure.work[id] figcaption i').forEach(function(i){ var t = i.textContent.toLowerCase().replace(/[^a-zäöüß0-9]/g, ''); if (t.length >= 5) TITLES.push([t, i.closest('figure'), i.textContent.trim()]); });
  document.addEventListener('keydown', function(e){ if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')){ beh('find_ctrlf'); return; }
    if ((e.ctrlKey || e.metaKey) && /^[+=\-0]$/.test(e.key)){ setTimeout(function(){ beh('zoom'); }, 400); return; }
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return; var t = now(); keyT.push(t); keyT = keyT.filter(function(x){ return t - x < 1500; }); if (keyT.length >= 10){ keyT = []; beh('key_mash'); }
    keyb = (keyb + e.key.toLowerCase()).slice(-30);
    ['inka', 'wagner', 'sigma', 'xae', 'gojira'].forEach(function(n){ if (keyb.slice(-n.length) === n){ keyb = ''; beh('type_name', n); } });
    for (var i = 0; i < CHEATS.length; i++){ if (keyb.slice(-CHEATS[i].length) === CHEATS[i]){ keyb = ''; beh('cheat_code'); return; } }
    var kb = keyb.replace(/[^a-zäöüß0-9]/g, ''); for (var j = 0; j < TITLES.length; j++){ var tt = TITLES[j]; if (kb.slice(-tt[0].length) === tt[0]){ keyb = ''; tt[1].scrollIntoView({behavior:'smooth', block:'center'}); beh('type_title', null, {werk:tt[2]}); return; } } });
  /* Fenster, Drehen, Zoom */
  var lw = window.innerWidth, lo = window.matchMedia && window.matchMedia('(orientation: portrait)').matches, dpr = window.devicePixelRatio, rsT = null;
  window.addEventListener('resize', function(){ clearTimeout(rsT); rsT = setTimeout(function(){ var po = window.matchMedia && window.matchMedia('(orientation: portrait)').matches; if (window.devicePixelRatio !== dpr){ dpr = window.devicePixelRatio; beh('zoom'); } else if (po !== lo && X.TOUCH){ beh('rotate'); } else if (Math.abs(window.innerWidth - lw) > 80) beh('resize'); lo = po; lw = window.innerWidth; }, 600); });
  /* Einstellungen über Klassen und Attribute am html-Element */
  var html = document.documentElement, lastMode = html.getAttribute('data-mode'), lastCalm = html.classList.contains('calm'), lastLh = /\blh-/.test(html.className);
  new MutationObserver(function(){ var m = html.getAttribute('data-mode'); if (m && m !== lastMode){ lastMode = m; beh('mode_change', null, {modus:{hell:'Weiß', dunkel:'Schwarz', rot:'Rot'}[m] || m}); }
    var c = html.classList.contains('calm'); if (c !== lastCalm){ lastCalm = c; beh('calm_toggle'); } var l = /\blh-/.test(html.className); if (l && !lastLh) beh('lesehilfe'); lastLh = l; }).observe(html, {attributes:true, attributeFilter:['class', 'data-mode']});
  /* Lesen: Absatz zu Ende geschrieben, Plotter unterbrochen, Bildunterschriften, nur Bilder */
  var pens = [];
  function plotCheck(){ if (!window.JK_PLOT_PENS) return; var p = window.JK_PLOT_PENS(); var vh = window.innerHeight; var was = pens.filter(function(y){ return y > 0 && y < vh; }).length; pens = p.map(function(q){ return q.y; }); var nowIn = pens.filter(function(y){ return y > 0 && y < vh; }).length; if (was > 0 && nowIn === 0 && p.length) beh('plot_interrupt'); }
  var doneN = 0; new MutationObserver(function(ms){ ms.forEach(function(m){ var el = m.target; if (el.classList && el.classList.contains('plotdone') && !el._jkd){ el._jkd = 1; var r = el.getBoundingClientRect(); if (r.bottom > 0 && r.top < window.innerHeight && el.matches('.textwrap p:last-of-type, .sertext p:last-of-type')) beh('read_full'); doneN++; } }); }).observe(document.body, {attributes:true, subtree:true, attributeFilter:['class']});
  var lbN = 0; window.addEventListener('jk:lb', function(){ lbN++; if (lbN >= 5 && doneN < 2) beh('images_only'); });
  var capT = null; document.addEventListener('pointerover', function(e){ var c = e.target.closest && e.target.closest('figcaption'); clearTimeout(capT); if (!c || X.TOUCH) return; capT = setTimeout(function(){ if (c.matches(':hover')) beh('captions'); }, 5000); }, {passive:true});
  /* Zeit, Besuche */
  setInterval(function(){ if (!document.hidden && now() - sStart > 20 * 60000) { beh('long_session'); sStart = now() + 3600000; } }, 30000);
  var hidAt = 0; document.addEventListener('visibilitychange', function(){ if (document.hidden){ hidAt = now(); return; } if (hidAt && now() - hidAt > 20000) setTimeout(function(){ beh('tab_return'); }, 2600); hidAt = 0; });
  var lastFind = now(); setInterval(function(){ if (document.hidden || S.done) return; if (now() - lastFind > 240000 && document.querySelectorAll('img.sbobj:not(.found)').length){ lastFind = now(); beh('long_nofind'); } }, 15000);
  setInterval(function(){ if (!document.hidden && now() - lastInput > 150000){ lastInput = now(); beh('idle'); } }, 20000);
  /* Spielereignisse aus game.js */
  var finds = [];
  var lastFoundT = 0;
  X.hooks.onFound = function(){ var t = now(); lastFind = t; lastFoundT = t; finds.push(t); finds = finds.filter(function(x){ return t - x < 90000; }); if (finds.length >= 3){ finds = []; setTimeout(function(){ beh('find_streak'); }, 3000); } milestones(); };
  X.hooks.onHint = function(){ if ((S.hints || 0) >= 3) setTimeout(function(){ beh('many_hints'); }, 2500); };
  X.hooks.onRuin = function(){ var n = X.ruinCount(); setTimeout(function(){ beh(n === 1 ? 'ruin_first' : 'ruin_many'); }, 2500); wanted(1, 'ruin'); };
  var lastTool = null; X.hooks.onTool = function(id){ if (lastTool && lastTool !== id) beh('tool_switch', null, {werkzeug:X.NAMES[id] || id}); lastTool = id; };
  X.hooks.onRestore = function(){ setTimeout(function(){ beh('restored'); }, 4000); };
  X.hooks.wanted = function(d, why){ wanted(d, why); dl('fahndung', '+' + d + ' (' + why + ')'); };   /* Wagners Alarm im Labor (Josef, 1.11., I12) */
  X.hooks.onPsst = function(){ W.psstV = X.V(); save(); };

  /* Besuchsmuster beim Laden */
  function visitPatterns(){ var v = X.V(); W.hrs = W.hrs || []; if (W.lastV !== v){ W.lastV = v; W.hrs.push(H()); W.hrs = W.hrs.slice(-5); var gap = W.lastSeen ? Math.floor((now() - W.lastSeen) / 86400000) : 0; save();
      setTimeout(function(){ if (gap >= 7) beh('long_away', null, {tage:gap}); else if (W.hrs.length >= 3 && W.hrs.slice(-3).every(function(h){ return Math.abs(h - W.hrs[W.hrs.length - 1]) <= 1; })){ W.hr = W.hrs[W.hrs.length - 1]; beh('same_hour'); } else if ((S.streak || 1) >= 3) beh('daily'); else if (W.psstV && W.psstV === v - 1) beh('quit_psst'); }, 9000); }
    W.lastSeen = now(); save();
    var top = Object.keys(W.pv).sort(function(a, b){ return W.pv[b] - W.pv[a]; })[0]; if (top === PAGE && W.pv[PAGE] >= 6 && W.pv[PAGE] % 6 === 0) setTimeout(function(){ beh('fav_page'); }, 14000);
    if (PAGE === '404') setTimeout(function(){ beh('page_404'); }, 3000);
    else if (W.lastPage && W.lastPage !== PAGE) setTimeout(function(){ beh('page_change'); }, 6000);
    W.lastPage = PAGE; save();
    try { var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0]; if (nav && nav.type === 'back_forward') setTimeout(function(){ beh('back_button'); }, 4000); } catch(e){}
    window.addEventListener('pageshow', function(e){ if (e.persisted) beh('back_button'); }); }

  /* ---------- Fahndung, Polizei, Bußgeld ---------- */
  function wanted(d, why){ var before = Math.floor(W.wanted); W.wanted = Math.min(5, W.wanted + d); W.wt = now(); save(); var after = Math.floor(W.wanted); if (after > before && after >= 1) pendingPolice = Math.min(3, after); }
  var pendingPolice = 0;
  function police(){ if (!pendingPolice || !T || !T.scenes) return false; var lv = pendingPolice; pendingPolice = 0; var key = 'polizei_kontrolle_' + lv; if (W.sc[key + ':' + X.V()]) return false; var L = T.scenes[key]; if (!L) return false; W.sc[key + ':' + X.V()] = 1;
    var fine = 10 * lv; W.fines = Math.min(300, (W.fines || 0) + fine); ctx.bussgeld = fine; save(); X.dialog(L.concat(T.scenes.polizei_bussgeld || []), function(){ X.refresh(); }, {}); log(L[0], 'Polizei'); return true; }
  setInterval(function(){ if (W.wanted >= 1 && T && T.police && Math.random() < .25) bubble('polizei', rnd(T.police.durchsage)); }, 150000);

  /* ---------- Welt-Ereignisse: Szenen der Gäste, Ticker, Auge, Werbung, Händler*in ---------- */
  function scene(key, once){ if (!T || !T.scenes || !T.scenes[key]) return false; if (once !== false && W.sc[key]) return false; dl('szene', key); W.sc[key] = now(); save(); X.dialog(T.scenes[key], null, {psst:true}); log(T.scenes[key][0], 'Szene'); return true; }
  function milestones(){ var n = X.count(); W.ms = W.ms || {}; [[4, 'griffith_1'], [8, 'griffith_2'], [12, 'griffith_3'], [16, 'griffith_4'], [19, 'griffith_5']].forEach(function(m){ if (n >= m[0] && !W.ms[m[1]]) { W.ms[m[1]] = 1; W.queue = (W.queue || []).concat([m[1]]); } }); if (n >= 12 && !W.ms.job){ W.ms.job = 1; W.queue = (W.queue || []).concat(['nil_job']); } save(); }
  function worldEvent(){ if (police()) return true;
    if (W.queue && W.queue.length){ var k = W.queue.shift(); save(); if (scene(k)) return true; }
    var ch = X.chapSeen();
    if (!W.sc.polizei_steckbrief && (ch >= 3 || W.wanted >= 1) && Math.random() < .5) return scene('polizei_steckbrief');
    if (ch >= 9 && X.V() >= 4 && !W.sc.konferenz && (W.sc.griffith_3 || W.sc.libido_3) && Math.random() < .3) return scene('konferenz');
    var r = Math.random();
    if (r < .12){ for (var i = 1; i <= 6; i++){ if (!W.sc['nole_grind_' + i]) return scene('nole_grind_' + i); } }
    else if (r < .22){ for (var j = 1; j <= 5; j++){ if (!W.sc['libido_' + j]) { if (j > ch / 2 + 1) break; return scene('libido_' + j); } } }
    else if (r < .3 && ch >= 8){ for (var k2 = 1; k2 <= 5; k2++){ if (!W.sc['kalmar_' + k2]) return scene('kalmar_' + k2); } }
    return false; }   /* Ticker und Nil-Werbung entfernt (Josef, 1.11., 16:18) */
  /* Ticker: schmales Laufband unten zwischen den Ecken, höchstens 3 je Besuch */
  var tick = null, tickN = 0;
  function ticker(force){ if (!T || !T.ticker || W.nowatch || tickN >= 3 || X.optedOut()) return false; var n = X.count(); var pool = T.ticker.filter(function(x){ return x.tag !== 'du' || n >= 3; }); W.tk = W.tk || []; var free = pool.filter(function(x, i){ return W.tk.indexOf(x.t.slice(0, 24)) < 0; }); if (!free.length){ W.tk = []; free = pool; }
    var m = rnd(free); W.tk.push(m.t.slice(0, 24)); if (W.tk.length > 120) W.tk = W.tk.slice(-120); tickN++; save();
    var txt = m.t.replace(/\{(\w+)\}/g, function(mm, k){ var v = X.hooks.ph(k); return v === null ? mm : v; });
    if (!tick){ tick = document.createElement('div'); tick.className = 'sbtick'; tick.setAttribute('role', 'status'); tick.setAttribute('aria-live', 'polite'); document.body.appendChild(tick); }
    tick.innerHTML = '<b>NIL NEWS 2186</b><span>' + X.esc(txt) + '</span>'; tick.classList.add('on'); setTimeout(function(){ tick.classList.remove('on'); }, 14000); log(['libido', txt], 'Ticker'); return true; }
  /* das schwebende Auge: selten, einmal je Besuch höchstens */
  function eye(force){ if (!force && (W.nowatch || X.optedOut() || W.eyeV === X.V() || Math.random() > .25)) return; dl('welt', 'Auge'); W.eyeV = X.V(); W.eyeN = (W.eyeN || 0) + 1; save();
    var e = document.createElement('div'); e.className = 'sbeye'; e.setAttribute('aria-hidden', 'true'); e.innerHTML = '<svg viewBox="0 0 120 60" width="120" height="60"><path class="wl" d="M42 30 C20 10 6 14 0 22 C14 22 24 28 40 34"/><path class="wr" d="M78 30 C100 10 114 14 120 22 C106 22 96 28 80 34"/><ellipse cx="60" cy="30" rx="18" ry="12" fill="#fff" stroke="#000" stroke-width="2"/><circle cx="60" cy="30" r="6" fill="#000"/><path d="M60 30 L74 4" stroke="#000" stroke-width="2.5"/></svg>'; document.body.appendChild(e);
    setTimeout(function(){ e.remove(); }, 9000); setTimeout(function(){ bubble(rnd(['inka', 'sigma', 'xae']), rnd(['Da oben. Das Auge. Hast du es gesehen?', '... es fliegt wieder. Es sieht alles, nur nicht sich selbst.', 'Mein Auge. Flex: es hat Flügel. Ich nicht.'])); achievements(); }, 5000); }
  /* Werbung: eine kleine Anzeige je Seite, selten, schließbar */
  function ad(){ if (!T || !T.ads || W.nowatch || X.optedOut() || W.noads || Math.random() > .5) return; if (!/^(kunst|comic|texte|vermittlung)$/.test(PAGE)) return; var secs = [].slice.call(document.querySelectorAll('main section[id]')); if (secs.length < 3) return; var s = secs[1 + Math.floor(Math.random() * (secs.length - 2))];
    var a = rnd(T.ads); var el = document.createElement('aside'); el.className = 'sbad'; el.setAttribute('aria-label', 'Anzeige von Nil (Teil des Spiels)'); el.innerHTML = '<span class="sbadk">Anzeige</span><b>NIL</b><p>' + X.esc(a.t) + '</p><button type="button" class="x" aria-label="Anzeige schließen">×</button>';
    /* ohne Layoutverschiebung: breit als schwebende Karte am Abschnittsanfang, schmal als kurze Einblendung unten */
    var hd = s.querySelector('.serhead'); if (window.innerWidth >= 1400 && hd){ if (getComputedStyle(hd).position === 'static') hd.style.position = 'relative'; el.classList.add('float'); hd.appendChild(el); } else { el.classList.add('pop'); document.body.appendChild(el); setTimeout(function(){ el.remove(); }, 9000); }
    el.querySelector('.x').addEventListener('click', function(){ el.remove(); W.adclosed = (W.adclosed || 0) + 1; save(); if (W.adclosed === 3) bubble('polizei', 'Sie haben drei Anzeigen geschlossen. Nil respektiert Ihre Wahl. Nil merkt sich Ihre Wahl.'); }); }
  /* Händler*in: erscheint selten im Inventar (ab 3 Funden) */
  var trader = X.count() >= 3 && Math.random() < .35;
  X.hooks.inventoryExtra = function(){ var h = '<p class="sbwatch"><label><input type="checkbox" class="sbnowatch"' + (W.nowatch ? ' checked' : '') + '> Figuren beobachten mich nicht</label></p>';
    if (trader && T && T.scenes && T.scenes.haendler_intro) h = '<p class="sbtrader"><button type="button" class="sbtraderbtn">Eine Gestalt aus der U-Bahn winkt dir</button></p>' + h;
    var lv = Math.floor(W.wanted); if (lv >= 1) h = '<p class="sbwanted">Fahndungsstufe: ' + '★'.repeat(lv) + '☆'.repeat(5 - lv) + '</p>' + h; return h; };
  X.hooks.inventoryBind = function(panel, close){ var cb = panel.querySelector('.sbnowatch'); if (cb) cb.addEventListener('change', function(){ W.nowatch = cb.checked ? 1 : 0; save(); });
    var tb = panel.querySelector('.sbtraderbtn'); if (tb) tb.addEventListener('click', function(){ close(); var k = !W.sc.haendler_intro ? 'haendler_intro' : 'haendler_' + (1 + ((W.trN = (W.trN || 0) + 1) - 1) % 6); W.sc[k] = now(); save(); X.dialog(T.scenes[k] || T.scenes.haendler_intro); }); };
  function freeTool(){ var ids = Object.keys(S.found || {}).filter(function(id){ return !(S.used && S.used[id]); }); return ids.length ? ids[0] : null; }
  function trade(kind){ var t = freeTool();
    if (kind === 'hint_for_tool'){ if (!t){ setTimeout(function(){ X.dialog([['haendler', 'Du hast nichts zum Tauschen. Komm wieder, wenn deine Taschen voller sind.']]); }, 600); return; } S.used = S.used || {}; S.used[t] = now(); save(); setTimeout(function(){ X.freeHint(); }, 700); }
    else if (kind === 'rumor'){ W.fines = (W.fines || 0) + 10; save(); X.refresh(); setTimeout(function(){ X.dialog([['haendler', T && T.rumors ? rnd(T.rumors) : 'Gerüchte sind aus.']]); }, 600); }
    else if (kind === 'wanted_down'){ if (!t){ return; } S.used = S.used || {}; S.used[t] = now(); W.wanted = Math.max(0, W.wanted - 1); save(); }
    else if (kind === 'fake_badge'){ var F = (T && T.fakebadges) || []; var f = F.filter(function(x){ return W.fake.indexOf(x.name) < 0; })[0]; if (f){ W.fake.push(f.name); save(); setTimeout(function(){ X.dialog([['haendler', '*Abzeichen: ' + f.name + '.* ' + f.line]]); }, 600); } }
    W.trades = (W.trades || 0) + 1; save(); achievements(); }

  /* ---------- Logbuch: Begegnungen ---------- */
  X.hooks.logbookExtra = function(){ var E = W.enc.slice(-40).reverse(); if (!E.length) return ''; return '<h3>Begegnungen</h3><ul class="sbenc">' + E.map(function(e){ var ch = X.CH[e.w] || X.CH.inka; var d = new Date(e.d); return '<li><small>' + d.getDate() + '.' + (d.getMonth() + 1) + '. ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2) + '</small> <b style="color:' + ch.col + '">' + X.esc(ch.name) + '</b> ' + X.esc(e.t) + '</li>'; }).join('') + '</ul>' + (W.fake.length ? '<p class="sbpnote">Gefälschte Abzeichen (zählen nicht): ' + X.esc(W.fake.join(', ')) + '</p>' : ''); };

  /* ---------- Abzeichen für Verhalten (15) ---------- */
  var ACH = [
    ['fussnote', 'Fußnotenleser*in', function(){ return (W.bh.footnote || 0) >= 5; }, 'wagner', 'Fünf Fußnoten. Sie lesen das Kleingedruckte. Das tun sonst nur Jurist*innen und ich.'],
    ['eule', 'Nachteule', function(){ return W.hrs && W.hrs.filter(function(h){ return h < 5; }).length >= 3; }, 'sigma', '... drei Nächte. Wir sind beide wach, wenn das Raster schläft.'],
    ['kopist', 'Kopist*in', function(){ return (W.bh.copy || 0) >= 3; }, 'xae', 'Dreimal Strg+C. Ich respektiere Sampling. Quellen angeben, ja?'],
    ['ruhe', 'Ruhepol', function(){ return (W.bh.slow_read || 0) >= 2; }, 'sigma', '... du liest langsam. Wie Wasser, das sich Zeit lässt.'],
    ['klickwut', 'Klickwut', function(){ return (W.bh.click_rage || 0) >= 6; }, 'xae', 'APM über 300. Du wärst gut in StarCraft. Hier bist du einfach laut.'],
    ['suche', 'Strg+F', function(){ return (W.bh.find_ctrlf || 0) >= 2; }, 'xae', 'Suchfunktion zweimal. Die Dinge findest du so nicht, aber Respekt für den Versuch.'],
    ['cheat', 'Cheater*in', function(){ return (W.bh.cheat_code || 0) >= 1; }, 'xae', 'Cheatcode erkannt. Kein God Mode hier. Nur Kunst.'],
    ['stamm', 'Stammgast', function(){ return (S.streak || 1) >= 5; }, 'inka', 'Fünf Tage in Folge. Du wohnst hier fast.'],
    ['polizei', 'Polizeibekannt', function(){ return W.wanted >= 3; }, 'polizei', 'Ihre Akte ist jetzt Premium. Danke, dass Sie Nil-Sicherheit nutzen.'],
    ['unterwelt', 'Unterwelt', function(){ return (W.trades || 0) >= 1; }, 'haendler', 'Erster Deal. Wir haben uns nie gesehen.'],
    ['auge', 'Augenzeug*in', function(){ return (W.eyeN || 0) >= 1; }, 'inka', 'Du hast das Auge gesehen. Jetzt hat es dich auch gesehen.'],
    ['seite', 'Parteiisch', function(){ return !!lead(); }, 'wagner', 'Sie haben sich entschieden. Eine Perspektive. Endlich.'],
    ['leser2', 'Bis zum Ende', function(){ return (W.bh.read_full || 0) >= 5; }, 'wagner', 'Fünf Texte bis zum letzten Strich. Der Plotter dankt. Ich auch.'],
    ['dreher', 'Kreisel', function(){ return (W.bh.rotate || 0) + (W.bh.resize || 0) + (W.bh.zoom || 0) >= 5; }, 'sigma', '... du drehst die Welt. Das Raster hält trotzdem. Meistens.'],
    ['spieler', 'Spieltrieb', function(){ return Object.keys(W.bp).length >= 15; }, 'inka', 'Fünfzehn verschiedene Dinge getan, die keiner verlangt hat. So mag ich das.']
  ];
  function achievements(){ var fresh = []; ACH.forEach(function(a){ if (!W.ach[a[0]] && a[2]()){ W.ach[a[0]] = now(); fresh.push(a); } }); if (!fresh.length) return; save(); X.markNew(); fresh.forEach(function(a, i){ setTimeout(function(){ bubble(a[3], 'Abzeichen: ' + a[1] + '. ' + a[4]); }, 8000 * (i + 1)); }); }
  X.hooks.badgeExtra = function(){ return ACH.map(function(a){ return {id:a[0], name:a[1], who:a[3], line:a[4], got:!!W.ach[a[0]]}; }); };

  /* ---------- Laden der Texte ---------- */
  /* Dev Tools: Zugriff (Josef, 1.11., T13 bis T18) */
  X.wdev = {W:W, T:function(){ return T; }, PTS:PTS, ACH:ACH, lead:lead, achievements:achievements,
    scene:function(k){ if (T && T.scenes && T.scenes[k]){ dl('szene', k + ' (dev)'); X.dialog(T.scenes[k]); } },
    convo:function(id){ var c = T && T.convos.filter(function(x){ return x.id === id; })[0]; if (c){ dl('gespräch', id + ' (dev)'); X.dialog(c.lines); } },
    beh:function(key, st, i, who){ var B = T && T.beh[key]; if (!B) return; var arr = B.stages[st] || []; var v = arr[i]; var w = B.who === 'self' ? (who || 'inka') : B.who; if (typeof v === 'object') v = v[w] || v.inka; if (v){ dl('verhalten', key + ' Stufe ' + (st + 1) + ' Variante ' + (i + 1) + ' (dev)'); X.dialog([{who:X.CH[w] ? w : 'inka', text:v}]); } },
    police:function(lv){ pendingPolice = lv; delete W.sc['polizei_kontrolle_' + lv + ':' + X.V()]; police(); }, eye:function(){ eye(true); }, ambient:function(){ lastAmb = 0; ambient(); }, worldEvent:function(){ return worldEvent(); }, applyDev:function(){ devApply(T); }, orig:null };
  /* Dev Tools Etappe 2: bearbeitete Texte (localStorage jk_dev_text) wirken sofort im eigenen Browser */
  function devApply(D){ if (!window.JK_DEV_ON || !D) return D; var O = null; try { O = JSON.parse(localStorage.getItem('jk_dev_text') || 'null'); } catch(e){} if (!O) return D; D.convos = D.convos || []; D.scenes = D.scenes || {}; D.beh = D.beh || {};
    Object.keys(O.convos || {}).forEach(function(id){ var v = O.convos[id], i = -1; D.convos.forEach(function(c, j){ if (c.id === id) i = j; }); if (v === null){ if (i >= 0) D.convos.splice(i, 1); } else if (i >= 0) D.convos[i] = v; else D.convos.push(v); });
    Object.keys(O.scenes || {}).forEach(function(k){ if (O.scenes[k] === null) delete D.scenes[k]; else D.scenes[k] = O.scenes[k]; });
    Object.keys(O.beh || {}).forEach(function(k){ if (O.beh[k] === null) delete D.beh[k]; else D.beh[k] = O.beh[k]; }); return D; }
  function boot(data){ T = devApply(data || {}); T.convos = T.convos || []; ready = true; visitPatterns(); setTimeout(eye, 60000 + Math.random() * 240000); setInterval(ambient, 5000); achievements(); }
  var src = (document.currentScript && document.currentScript.src) || ''; var v = (src.match(/[?&]v=([^&]+)/) || [])[1] || '';
  fetch('../assets/game/talk.json' + (v ? '?v=' + v : '')).then(function(r){ return r.json(); }).then(function(d){ if (window.JK_DEV_ON) try { X.wdev.orig = JSON.parse(JSON.stringify(d)); } catch(e){} boot(d); }).catch(function(){ boot({}); });
})();
