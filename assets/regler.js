/* Regler-Leiste für Josefs Feintuning (Josef, 29.10.2026, 14:44, 30 Rückfragen).
   Wird nur nach Freischaltung geladen (?regler in der Adresse, danach Alt+R; ?regler=aus meldet ab). Werte wirken nur in diesem Browser,
   bis Josef sie mit "Kopieren" in den Chat gibt; Claude trägt sie dann in cfg.js (PUB) ein. Werte und Bereiche: cfg.js. */
(function(){
  var C = window.JK_CFG; if (!C || window.JK_REGLER) return; window.JK_REGLER = true;
  function ls(k, d){ try { var v = localStorage.getItem(k); return v === null ? d : v; } catch(e){ return d; } }
  function lsSet(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
  function lsJSON(k, d){ try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch(e){ return d; } }
  var P = C.P, MOB = C.MOB;
  var TABS = ['Plotter', 'Ton', 'Dialoge', 'Spiel', 'Grafik', 'Effekte', 'Proben', 'Prüfung', 'Presets', 'Handbuch'];
  var st = {open: ls('jk_regler_open', '1') === '1', tab: ls('jk_regler_tab', 'Plotter'), scope: MOB ? 'm' : 'b', free: false, side: ls('jk_regler_side', 'r'), w: +ls('jk_regler_w', '360') || 360, q: ''};
  if (TABS.indexOf(st.tab) < 0) st.tab = 'Plotter';
  var undo = [], redo = [];

  /* ---------- Stil ---------- */
  var css = document.createElement('style'); css.textContent = [
    '#jkreg{position:fixed;top:0;bottom:0;z-index:9000;width:var(--regw,360px);background:var(--paper,#fff);color:var(--ink,#000);font:13px/1.35 Relief,var(--body),sans-serif;display:flex;flex-direction:column;box-sizing:border-box}',
    '#jkreg.r{right:0;border-left:2px solid var(--line,#000)}#jkreg.l{left:0;border-right:2px solid var(--line,#000)}',
    '#jkreg *{box-sizing:border-box}#jkreg button,#jkreg input,#jkreg select,#jkreg textarea{font:inherit;color:inherit}',
    '#jkreg .hd{padding:10px 12px 8px;border-bottom:2px solid var(--line,#000);display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    '#jkreg .hd b{font-family:var(--head),serif;font-size:20px;letter-spacing:.04em;text-transform:uppercase;margin-right:auto;cursor:move}',
    '#jkreg .badge{background:#E2231A;color:#fff;padding:2px 7px;border-radius:9px;font-size:11px;letter-spacing:.06em;text-transform:uppercase}',
    '#jkreg .btn{border:1.5px solid var(--line,#000);background:var(--paper,#fff);padding:3px 8px;cursor:pointer;border-radius:0}',
    '#jkreg .btn:hover{background:var(--ink,#000);color:var(--paper,#fff)}#jkreg .btn.on{background:#E2231A;border-color:#E2231A;color:#fff}',
    '#jkreg .row2{display:flex;gap:6px;width:100%;align-items:center}#jkreg .row2 input[type=search]{flex:1;border:1.5px solid var(--line,#000);padding:4px 6px;background:var(--paper,#fff)}',
    '#jkreg nav{display:flex;flex-wrap:wrap;border-bottom:1px solid var(--line,#000)}#jkreg nav button{border:0;background:none;padding:6px 8px;cursor:pointer;border-bottom:3px solid transparent}',
    '#jkreg nav button.on{border-bottom-color:#E2231A;color:#E2231A}',
    '#jkreg .bd{flex:1;overflow:auto;padding:4px 12px 40px}',
    '#jkreg h4{font-family:var(--head),serif;font-weight:400;font-size:15px;letter-spacing:.06em;text-transform:uppercase;margin:16px 0 4px;border-bottom:1px solid var(--line,#000)}',
    '#jkreg .p{padding:7px 0 8px;border-bottom:1px dotted #9a9a9a}#jkreg .p.chg{box-shadow:inset 3px 0 0 #E2231A;padding-left:7px}',
    '#jkreg .p .t{display:flex;gap:6px;align-items:baseline}#jkreg .p .t span{flex:1}#jkreg .p .t .dev{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#6b6b6b}',
    '#jkreg .p .c{display:flex;gap:6px;align-items:center;margin-top:3px}#jkreg .p input[type=range]{flex:1;accent-color:#E2231A}',
    '#jkreg .p input[type=number],#jkreg .p input.hex{width:76px;border:1.5px solid var(--line,#000);padding:2px 4px;background:var(--paper,#fff)}',
    '#jkreg .p .u{width:22px;color:#6b6b6b;font-size:11px}#jkreg .p .rs{border:0;background:none;cursor:pointer;font-size:15px;line-height:1;padding:0 2px;visibility:hidden}#jkreg .p.chg .rs{visibility:visible}',
    '#jkreg .p small{display:block;color:#6b6b6b;margin-top:2px}#jkreg .warn{color:#E2231A}',
    '#jkreg .meter{display:grid;grid-template-columns:70px 1fr;gap:3px 8px;align-items:center;font-size:11px}#jkreg .meter i{display:block;height:8px;background:#00A651;width:0;transition:width .08s}',
    '#jkreg .list div{display:flex;gap:6px;align-items:center;padding:3px 0;border-bottom:1px dotted #9a9a9a}#jkreg .list div span{flex:1}',
    '#jkreg textarea{width:100%;min-height:64px;border:1.5px solid var(--line,#000);padding:4px;background:var(--paper,#fff)}',
    '#jkreg select{border:1.5px solid var(--line,#000);padding:3px;background:var(--paper,#fff)}',
    '#jkreg .grip{position:absolute;top:0;bottom:0;width:7px;cursor:ew-resize}#jkreg.r .grip{left:-4px}#jkreg.l .grip{right:-4px}',
    '#jkreg .stat{font-size:11px;color:#6b6b6b;padding:4px 12px;border-top:1px solid var(--line,#000);display:flex;gap:10px;flex-wrap:wrap}',
    '#jkregtab{position:fixed;top:40%;z-index:9000;background:#E2231A;color:#fff;border:0;padding:10px 6px;font:12px/1 Relief,sans-serif;letter-spacing:.08em;text-transform:uppercase;writing-mode:vertical-rl;cursor:pointer}',
    '#jkregtab.r{right:0}#jkregtab.l{left:0;transform:rotate(180deg)}',
    'html.jkreg-open.jkreg-r body{margin-right:var(--regw,360px)}html.jkreg-open.jkreg-l body{margin-left:var(--regw,360px)}',
    'html.jkreg-open.jkreg-r .progress{right:var(--regw,360px);width:auto}html.jkreg-open.jkreg-l .progress{left:var(--regw,360px);width:auto}',
    '.jkpen{position:fixed;z-index:8999;width:14px;height:4px;pointer-events:none;background:#00A651}.jkpen.bg{background:#3F97B8}',
    'html.jkreg-showobj .sbobj{outline:3px solid #E2231A!important;outline-offset:2px;visibility:visible!important;opacity:1!important}',
    '@media (max-width:700px){#jkreg{top:auto;left:0!important;right:0!important;width:auto;height:50vh;border:0;border-top:2px solid var(--line,#000)}#jkreg .grip{display:none}',
    ' html.jkreg-open body{margin:0!important;padding-bottom:50vh}html.jkreg-open .progress{left:0!important;right:0!important}#jkregtab{top:auto;bottom:70px;writing-mode:horizontal-tb;transform:none!important;padding:8px 10px}}',
    '.jkfocusline{position:absolute;left:0;top:0;pointer-events:none;z-index:8998}'
  ].join('\n'); document.head.appendChild(css);

  /* ---------- Werte ---------- */
  function meta(k){ return C.META[k]; }
  function isDev(k){ return Array.isArray(meta(k)[5]); }
  function defFor(k, sc){ var d = meta(k)[5]; return Array.isArray(d) ? d[sc === 'm' ? 1 : sc === 'd' ? 0 : (MOB ? 1 : 0)] : d; }
  function valFor(k, sc){ var L = C.local(), U = C.PUB, s = sc === 'm' ? '@m' : sc === 'd' ? '@d' : (MOB ? '@m' : '@d');
    if (L[k + s] !== undefined) return L[k + s]; if (L[k] !== undefined) return L[k]; if (U[k + s] !== undefined) return U[k + s]; if (U[k] !== undefined) return U[k]; return defFor(k, sc); }
  function changed(k){ var L = C.local(); return L[k] !== undefined || L[k + '@d'] !== undefined || L[k + '@m'] !== undefined; }
  function scopeOf(k){ return isDev(k) ? st.scope : 'b'; }
  function setVal(k, v, record){ var sc = scopeOf(k), before = JSON.stringify(C.local());
    if (sc === 'b'){ var L = C.local(); delete L[k + '@d']; delete L[k + '@m']; C.set(k, v === null ? null : v, 'b'); } else C.set(k, v, sc);
    if (record){ undo.push(before); if (undo.length > 80) undo.shift(); redo = []; histPush(k, v, sc); } mark(); }
  var HIST = lsJSON('jk_regler_hist', []);
  function histPush(k, v, sc){ HIST.unshift({k:k, v:v, sc:sc, t:new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}); HIST = HIST.slice(0, 60); lsSet('jk_regler_hist', JSON.stringify(HIST)); }
  function doUndo(){ if (!undo.length) return; redo.push(JSON.stringify(C.local())); C.replace(JSON.parse(undo.pop())); render(); }
  function doRedo(){ if (!redo.length) return; undo.push(JSON.stringify(C.local())); C.replace(JSON.parse(redo.pop())); render(); }
  function fmt(v, step){ if (typeof v !== 'number') return v; var d = String(step).indexOf('.') >= 0 ? String(step).split('.')[1].length : 0; return v.toFixed(Math.min(4, d)).replace('.', ','); }
  function parse(s){ return parseFloat(String(s).replace(',', '.')); }

  /* Kontrast (WCAG) */
  function lum(hex){ var m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return 1; var n = parseInt(m[1], 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function(x){ x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
  function ratio(a, b){ var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function rgbHex(c){ var m = c.match(/\d+(\.\d+)?/g); if (!m) return '#ffffff'; return '#' + m.slice(0, 3).map(function(x){ return ('0' + Math.round(+x).toString(16)).slice(-2); }).join(''); }

  /* ---------- Gerüst ---------- */
  var box = document.createElement('aside'); box.id = 'jkreg'; box.setAttribute('aria-label', 'Regler');
  box.innerHTML = '<div class="grip" title="Breite ziehen"></div><div class="hd"><b title="Ziehen: Seite wechseln">Regler</b><span class="badge">Regler aktiv</span>' +
    '<button class="btn ab" title="A/B umschalten (Alt+B)">A</button><button class="btn cp" title="Alle geänderten Werte kopieren, für den Chat">Kopieren</button><button class="btn side" title="Seite wechseln">⇆</button><button class="btn x" title="Zuklappen (Alt+R)">×</button>' +
    '<div class="row2"><input type="search" placeholder="Regler suchen" aria-label="Regler suchen"><select class="sc" aria-label="Gerät"><option value="b">Beide Geräte</option><option value="d">Nur Desktop</option><option value="m">Nur Handy</option></select><button class="btn free" title="Grenzen aufheben (extreme Werte zum Ausprobieren)">frei</button></div></div>' +
    '<nav></nav><div class="bd"></div><div class="stat"></div>';
  var tab = document.createElement('button'); tab.id = 'jkregtab'; tab.textContent = 'Regler aktiv'; tab.title = 'Regler öffnen (Alt+R)';
  var nav = box.querySelector('nav'), bd = box.querySelector('.bd'), stat = box.querySelector('.stat'), q = box.querySelector('input[type=search]'), sc = box.querySelector('.sc');
  sc.value = st.scope;
  TABS.forEach(function(t){ var b = document.createElement('button'); b.textContent = t; b.addEventListener('click', function(){ st.tab = t; lsSet('jk_regler_tab', t); st.q = ''; q.value = ''; render(); }); nav.appendChild(b); });

  function layoutBox(){ var r = document.documentElement; r.style.setProperty('--regw', st.w + 'px');
    box.className = st.side; tab.className = st.side; r.classList.toggle('jkreg-open', st.open); r.classList.toggle('jkreg-r', st.side === 'r'); r.classList.toggle('jkreg-l', st.side === 'l');
    box.style.display = st.open ? '' : 'none'; tab.style.display = st.open ? 'none' : ''; lsSet('jk_regler_open', st.open ? '1' : '0'); lsSet('jk_regler_side', st.side); lsSet('jk_regler_w', String(st.w));
    window.dispatchEvent(new Event('resize')); }
  function mark(){ var n = Object.keys(C.local()).length; box.querySelector('.badge').textContent = n ? 'Regler aktiv, ' + n + ' geändert' : 'Regler aktiv'; tab.textContent = n ? 'Regler aktiv (' + n + ')' : 'Regler aktiv';
    [].forEach.call(bd.querySelectorAll('.p[data-k]'), function(row){ row.classList.toggle('chg', changed(row.getAttribute('data-k'))); }); }

  /* ---------- Regler-Zeile ---------- */
  function row(p){ var k = p[0], unit = p[9] || '', isCol = unit === 'color', v = valFor(k, scopeOf(k)), d = defFor(k, scopeOf(k));
    var el = document.createElement('div'); el.className = 'p' + (changed(k) ? ' chg' : ''); el.setAttribute('data-k', k);
    var dev = isDev(k) ? '<span class="dev">' + (st.scope === 'b' ? 'beide' : st.scope === 'd' ? 'Desktop' : 'Handy') + '</span>' : '';
    if (isCol){
      el.innerHTML = '<div class="t"><span>' + p[3] + '</span>' + dev + '<button class="rs" title="Zurück auf Standard">↺</button></div><div class="c"><input type="color" value="' + v + '"><input class="hex" value="' + v + '"></div><small>' + p[4] + ' Standard: ' + d + '. <span class="warn"></span></small>';
      var ci = el.querySelector('input[type=color]'), hx = el.querySelector('.hex'), w = el.querySelector('.warn');
      function chk(val){ var paper = rgbHex(getComputedStyle(document.body).backgroundColor), r0 = ratio(val, paper); w.textContent = r0 < 3 ? 'Kontrast zum Papier ' + r0.toFixed(1).replace('.', ',') + ':1, zu schwach (mindestens 3:1 für Akzente, 4,5:1 für Text).' : (r0 < 4.5 ? 'Kontrast ' + r0.toFixed(1).replace('.', ',') + ':1, reicht für Akzente, nicht für Fließtext.' : ''); }
      chk(v);
      ci.addEventListener('input', function(){ hx.value = ci.value; setVal(k, ci.value, false); chk(ci.value); });
      ci.addEventListener('change', function(){ setVal(k, ci.value, true); });
      hx.addEventListener('change', function(){ if (/^#[0-9a-f]{6}$/i.test(hx.value)){ ci.value = hx.value; setVal(k, hx.value, true); chk(hx.value); } });
    } else {
      var min = p[6], max = p[7], step = p[8];
      if (st.free){ var span = max - min; min = min >= 0 ? 0 : min - span; max = max + span * 2; }
      el.innerHTML = '<div class="t"><span>' + p[3] + '</span>' + dev + '<button class="rs" title="Zurück auf Standard">↺</button></div><div class="c"><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" aria-label="' + p[3] + '"><input type="number" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" aria-label="' + p[3] + ' Zahl"><span class="u">' + (unit === 'HT' ? 'HT' : unit) + '</span></div><small>' + p[4] + ' Standard: ' + fmt(d, step) + (unit && unit !== 'HT' ? ' ' + unit : '') + '.</small>';
      var rg = el.querySelector('input[type=range]'), nm = el.querySelector('input[type=number]');
      rg.addEventListener('input', function(){ nm.value = rg.value; setVal(k, +rg.value, false); });
      rg.addEventListener('change', function(){ setVal(k, +rg.value, true); });
      nm.addEventListener('change', function(){ var x = parse(nm.value); if (isNaN(x)) return; if (!st.free) x = Math.max(p[6], Math.min(p[7], x)); nm.value = x; rg.value = x; setVal(k, x, true); });
    }
    el.querySelector('.rs').addEventListener('click', function(){ var before = JSON.stringify(C.local()); var L = C.local(); var key = scopeOf(k) === 'b' ? k : k + '@' + scopeOf(k); if (scopeOf(k) === 'b'){ delete L[k + '@d']; delete L[k + '@m']; } C.set(k, null, scopeOf(k)); if (key !== k) {} undo.push(before); histPush(k, 'Standard', scopeOf(k)); render(); });
    return el; }

  /* ---------- Reiter ---------- */
  function section(title){ var h = document.createElement('h4'); h.textContent = title; bd.appendChild(h); }
  function params(filter){ var grp = null; P.forEach(function(p){ if (!filter(p)) return; if (p[2] !== grp){ grp = p[2]; section((st.q ? p[1] + ', ' : '') + grp); } bd.appendChild(row(p)); }); }
  function button(label, fn, parent){ var b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.addEventListener('click', fn); (parent || bd).appendChild(b); return b; }
  function para(html, parent){ var d = document.createElement('p'); d.innerHTML = html; (parent || bd).appendChild(d); return d; }

  function tabProben(){
    section('Plotter'); button('Plotter neu schreiben', function(){ if (window.JK_PLOT_RESTART) window.JK_PLOT_RESTART(); });
    section('Tonprobe'); var tl = document.createElement('div'); tl.className = 'list'; bd.appendChild(tl);
    [['plotter', 'Plotter', 'tools'], ['feder', 'Feder', 'tools'], ['zirkel', 'Zirkel', 'tools'], ['papier', 'Papier', 'ui'], ['g-fund', 'Fund', 'game'], ['g-stempel', 'Stempel', 'game'], ['g-kraehe', 'Inka ruft', 'game'], ['g-inka', 'Stimme Inka', 'game'], ['g-wagner', 'Stimme Wagner', 'game'], ['g-xae', 'Stimme X Æ A-13', 'game'], ['g-sigma', 'Stimme Sigma', 'game'], ['g-gojira', 'Gojira', 'game']].forEach(function(s){
      var d = document.createElement('div'); d.innerHTML = '<span>' + s[1] + '</span>'; button('▶', function(){ if (window.JK_SPRITE_LOAD) window.JK_SPRITE_LOAD(s[0]); setTimeout(function(){ if (window.JK_SPRITE) window.JK_SPRITE(s[0], {force:true, bus:s[2], vol:1}); }, 80); }, d); tl.appendChild(d); });
    section('Pegel'); var m = document.createElement('div'); m.className = 'meter'; ['master', 'tools', 'ui', 'atmos', 'game'].forEach(function(n){ m.insertAdjacentHTML('beforeend', '<span>' + {master:'Gesamt', tools:'Werkzeuge', ui:'Oberfläche', atmos:'Atmosphäre', game:'Spiel'}[n] + '</span><i data-m="' + n + '"></i>'); }); bd.appendChild(m);
    section('Dialogprobe'); var who = document.createElement('select'); [['inka', 'Inka'], ['wagner', 'Wagner'], ['xae', 'X Æ A-13'], ['sigma', 'Sigma'], ['gojira', 'Gojira']].forEach(function(o){ who.insertAdjacentHTML('beforeend', '<option value="' + o[0] + '">' + o[1] + '</option>'); }); bd.appendChild(who);
    var ta = document.createElement('textarea'); ta.value = ls('jk_regler_dlgtext', 'Das ist eine Probe, mit Komma. Und ein Punkt! Wirklich? Dann ... weiter.'); bd.appendChild(ta);
    button('Abspielen', function(){ lsSet('jk_regler_dlgtext', ta.value); if (window.JK_DIALOG) window.JK_DIALOG([[who.value, ta.value]]); });
    section('Spiel'); var so = button(document.documentElement.classList.contains('jkreg-showobj') ? 'Objekte verbergen' : 'Objekte zeigen', function(){ var on = document.documentElement.classList.toggle('jkreg-showobj'); so.textContent = on ? 'Objekte verbergen' : 'Objekte zeigen'; });
    section('Anzeigen'); var pens = button(PENS ? 'Stiftlage aus' : 'Stiftlage zeigen', function(){ PENS = !PENS; pens.textContent = PENS ? 'Stiftlage aus' : 'Stiftlage zeigen'; if (!PENS) clearPens(); });
    para('<small>Grün: sichtbarer Stift, Blau: Hintergrund-Stift. Bildrate und Spielstand stehen unten in der Leiste.</small>'); }

  function tabSpiel(){ params(function(p){ return p[1] === 'Spiel'; });
    section('Spielstand-Editor'); var s = window.JK_SB ? window.JK_SB.state() : null;
    if (!s){ para('Auf dieser Seite läuft das Spiel nicht.'); return; }
    var f = document.createElement('div'); f.className = 'p'; f.innerHTML = '<div class="c">Funde <input type="number" min="0" max="' + s.n + '" value="' + s.found + '" class="sf"> Hinweise <input type="number" min="0" max="99" value="' + s.hints + '" class="sh"></div><small>Setzt die ersten Dinge der aktuellen Auslosung als gefunden und lädt die Seite neu (nur Test, keine Einträge in die Bestenliste).</small>'; bd.appendChild(f);
    button('Setzen und neu laden', function(){ window.JK_SB.set(+f.querySelector('.sf').value, +f.querySelector('.sh').value); location.reload(); });
    button('Spielstand löschen', function(){ window.JK_SB.reset(); location.reload(); }); }

  /* Barrierefreiheit prüfen */
  var SIM = {protan:'0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0', deutan:'0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0', tritan:'0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0', grau:'0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0'};
  function sim(kind){ var id = 'jksim'; var svg = document.getElementById(id + 's'); if (!svg){ svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = id + 's'; svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute'; svg.innerHTML = '<filter id="' + id + '"><feColorMatrix type="matrix" values=""/></filter>'; document.body.appendChild(svg); }
    if (!kind){ document.querySelector('main') && (document.querySelector('main').style.filter = ''); document.body.style.filter = ''; return; }
    svg.querySelector('feColorMatrix').setAttribute('values', SIM[kind]); [].forEach.call(document.body.children, function(c){ if (c !== box && c !== tab && c.id !== id + 's') c.style.filter = 'url(#' + id + ')'; }); }
  function contrastScan(){ var bad = 0; document.querySelectorAll('.jkcbad').forEach(function(e){ e.classList.remove('jkcbad'); e.style.outline = ''; });
    var els = [].slice.call(document.querySelectorAll('main p, main li, main a, main figcaption, main h1, main h2, main h3, main span, footer a, footer div, header a, header button'));
    els.forEach(function(e){ if (!e.offsetParent || !e.textContent.trim() || e.closest('#jkreg')) return; var own = [].some.call(e.childNodes, function(n){ return n.nodeType === 3 && n.textContent.trim(); }); if (!own) return;
      var cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) return; var fg = rgbHex(cs.color), bg = null, x = e;
      while (x && x !== document.documentElement){ var b = getComputedStyle(x).backgroundColor; if (b && !/rgba\(.*,\s*0\)$/.test(b) && b !== 'transparent'){ bg = rgbHex(b); break; } x = x.parentElement; }
      bg = bg || rgbHex(getComputedStyle(document.body).backgroundColor); var big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
      if (ratio(fg, bg) < (big ? 3 : 4.5)){ bad++; e.classList.add('jkcbad'); e.style.outline = '2px dashed #E2231A'; } });
    return bad; }
  var FOCUS = null;
  function focusPath(on){ if (FOCUS){ FOCUS.remove(); FOCUS = null; } if (!on) return;
    var els = [].slice.call(document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')).filter(function(e){ return e.offsetParent && e.tabIndex >= 0 && !e.closest('#jkreg') && !e.disabled; });
    els.sort(function(a, b){ return (a.tabIndex || 0) - (b.tabIndex || 0); });
    var H = document.documentElement.scrollHeight, W = document.documentElement.scrollWidth, svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'jkfocusline'); svg.setAttribute('width', W); svg.setAttribute('height', H);
    var pts = els.map(function(e){ var r = e.getBoundingClientRect(); return [r.left + scrollX + r.width / 2, r.top + scrollY + r.height / 2]; });
    var d = pts.map(function(p, i){ return (i ? 'L' : 'M') + p[0].toFixed(0) + ' ' + p[1].toFixed(0); }).join('');
    svg.innerHTML = '<path d="' + d + '" fill="none" stroke="#E2231A" stroke-width="1.5" stroke-dasharray="4 3"/>' + pts.map(function(p, i){ return '<circle cx="' + p[0].toFixed(0) + '" cy="' + p[1].toFixed(0) + '" r="7" fill="#E2231A"/><text x="' + p[0].toFixed(0) + '" y="' + (p[1] + 3).toFixed(0) + '" font-size="8" fill="#fff" text-anchor="middle">' + (i + 1) + '</text>'; }).join('');
    document.body.appendChild(svg); FOCUS = svg; }
  function tabPruefung(){
    section('Farbsehschwäche simulieren'); var cur = null; [['', 'aus'], ['protan', 'Rot (Protanopie)'], ['deutan', 'Grün (Deuteranopie)'], ['tritan', 'Blau-Gelb (Tritanopie)'], ['grau', 'Graustufen']].forEach(function(o){ button(o[1], function(){ sim(o[0]); }); });
    section('Kontrastprüfer'); var out = para(''); button('Seite prüfen', function(){ var n = contrastScan(); out.textContent = n ? n + ' Stellen unter 4,5:1 (große Schrift 3:1), rot gestrichelt markiert.' : 'Keine Stelle unter dem Mindestkontrast.'; });
    button('Markierungen weg', function(){ document.querySelectorAll('.jkcbad').forEach(function(e){ e.classList.remove('jkcbad'); e.style.outline = ''; }); out.textContent = ''; });
    section('Fokus und Tastaturweg'); button('Tab-Weg zeigen', function(){ focusPath(true); }); button('ausblenden', function(){ focusPath(false); });
    para('<small>Die automatische axe-Prüfung läuft in der Debugging-Schleife.</small>'); }

  function changedObj(){ var L = C.local(), o = {}; Object.keys(L).sort().forEach(function(k){ o[k] = L[k]; }); return o; }
  function tabPresets(){
    section('Voreinstellungen'); var PR = lsJSON('jk_regler_presets', {});
    var nm = document.createElement('input'); nm.type = 'text'; nm.placeholder = 'Name, etwa ruhig'; nm.style.cssText = 'border:1.5px solid var(--line,#000);padding:3px 6px;width:60%;background:var(--paper,#fff)'; bd.appendChild(nm);
    button('Speichern', function(){ var n = nm.value.trim(); if (!n) return; PR[n] = changedObj(); lsSet('jk_regler_presets', JSON.stringify(PR)); render(); });
    var l = document.createElement('div'); l.className = 'list'; bd.appendChild(l);
    var d0 = document.createElement('div'); d0.innerHTML = '<span>Standard (alles zurück)</span>'; button('Laden', function(){ undo.push(JSON.stringify(C.local())); C.replace({}); histPush('alle', 'Standard', 'b'); render(); }, d0); l.appendChild(d0);
    Object.keys(PR).forEach(function(n){ var d = document.createElement('div'); d.innerHTML = '<span>' + n.replace(/</g, '&lt;') + ' (' + Object.keys(PR[n]).length + ')</span>'; button('Laden', function(){ undo.push(JSON.stringify(C.local())); C.replace(JSON.parse(JSON.stringify(PR[n]))); histPush('Preset', n, 'b'); render(); }, d); button('Löschen', function(){ delete PR[n]; lsSet('jk_regler_presets', JSON.stringify(PR)); render(); }, d); l.appendChild(d); });
    section('A/B'); para('<small>Zwei Zustände zum Vergleichen. Umschalten mit dem Knopf A oben oder Alt+B; der aktuelle Zustand bleibt im Fach gespeichert.</small>');
    section('Verlauf'); para('<small>Rückgängig: Strg+Z, wiederholen: Strg+Umschalt+Z.</small>'); var hl = document.createElement('div'); hl.className = 'list'; bd.appendChild(hl);
    HIST.slice(0, 40).forEach(function(h){ var m0 = meta(h.k); var d = document.createElement('div'); d.innerHTML = '<span>' + h.t + ' ' + (m0 ? m0[3] : h.k) + (h.sc !== 'b' ? ' (' + (h.sc === 'd' ? 'Desktop' : 'Handy') + ')' : '') + ': ' + (typeof h.v === 'number' ? fmt(h.v, m0 ? m0[8] : 1) : h.v) + '</span>'; hl.appendChild(d); }); }

  function tabHandbuch(){ [
    ['Wozu', 'Die Regler verändern die Website nur in diesem Browser. Die rote Marke zeigt, dass du nicht die öffentliche Fassung siehst. Mit ?regler=aus in der Adresse meldest du die Leiste ab.'],
    ['Übernehmen', 'Knopf "Kopieren" legt alle geänderten Werte in die Zwischenablage. Füge sie im Chat ein: Claude prüft sie kurz, stellt sie online und protokolliert sie.'],
    ['Breite', 'Am Desktop wird die Seite um die Leiste schmaler. Umbrüche (Kopfzeile, Spalten) richten sich weiter nach der Fensterbreite; zum Prüfen des Layouts die Leiste kurz zuklappen (Alt+R).'],
    ['Geräte', 'Werte mit dem Hinweis Desktop, Handy oder beide lassen sich je Gerät einstellen. Wähle oben das Gerät; auf dem Desktop kannst du Handy-Werte vorbereiten, sehen kannst du sie am Handy.'],
    ['Grenzen', 'Die Regler bleiben in sicheren Bereichen. Mit "frei" werden die Bereiche erweitert, zum Ausprobieren extremer Werte.'],
    ['Presets, A/B, Verlauf', 'Unter Presets speicherst du benannte Zustände. A/B vergleicht zwei Zustände (Alt+B). Strg+Z nimmt die letzte Änderung zurück.'],
    ['Proben', 'Plotter neu schreiben, jeden Klang einzeln abspielen (mit Pegel), Dialogzeilen jeder Figur abspielen, versteckte Dinge zeigen, Stiftlage am Rand anzeigen.'],
    ['Prüfung', 'Farbsehschwächen simulieren, Kontraste prüfen, den Tastaturweg als Linie zeigen.'],
    ['Tasten', 'Alt+R Leiste auf und zu, Alt+B A/B, Strg+Z rückgängig, Strg+Umschalt+Z wiederholen, Pfeiltasten im Regler feine Schritte, Bild auf und ab große Schritte.']
  ].forEach(function(x){ section(x[0]); para(x[1]); }); }

  function render(){ [].forEach.call(nav.children, function(b){ b.classList.toggle('on', b.textContent === st.tab && !st.q); });
    box.querySelector('.free').classList.toggle('on', st.free); bd.innerHTML = '';
    if (st.q){ var qq = st.q.toLowerCase(); params(function(p){ return (p[3] + ' ' + p[4] + ' ' + p[0] + ' ' + p[2]).toLowerCase().indexOf(qq) >= 0; }); if (!bd.children.length) para('Kein Regler gefunden.'); }
    else if (st.tab === 'Proben') tabProben(); else if (st.tab === 'Spiel') tabSpiel(); else if (st.tab === 'Prüfung') tabPruefung(); else if (st.tab === 'Presets') tabPresets(); else if (st.tab === 'Handbuch') tabHandbuch();
    else params(function(p){ return p[1] === st.tab; });
    mark(); updAB(); }

  /* ---------- A/B ---------- */
  var AB = lsJSON('jk_regler_ab', {cur:'A', A:null, B:null});
  function updAB(){ var b = box.querySelector('.ab'); b.textContent = AB.cur; b.classList.toggle('on', AB.cur === 'B'); }
  function toggleAB(){ AB[AB.cur] = changedObj(); AB.cur = AB.cur === 'A' ? 'B' : 'A'; var next = AB[AB.cur]; if (next) C.replace(JSON.parse(JSON.stringify(next))); lsSet('jk_regler_ab', JSON.stringify(AB)); render(); }

  /* ---------- Kopieren ---------- */
  function copy(){ var o = changedObj(), n = Object.keys(o).length, txt = 'Regler theidealcity.gg, ' + new Date().toLocaleString('de-DE') + ', ' + n + ' Werte geändert\n' + JSON.stringify(o, null, 1);
    var done = function(){ var b = box.querySelector('.cp'); b.textContent = n ? 'Kopiert (' + n + ')' : 'Nichts geändert'; setTimeout(function(){ b.textContent = 'Kopieren'; }, 2200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function(){ fallback(txt); done(); }); else { fallback(txt); done(); } }
  function fallback(txt){ var t = document.createElement('textarea'); t.value = txt; t.style.cssText = 'position:fixed;left:-999px;top:0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch(e){} t.remove(); }

  /* ---------- Anzeigen: Pegel, Stiftlage, Bildrate, Spielstand ---------- */
  var PENS = ls('jk_regler_pens', '0') === '1', penEls = [];
  function clearPens(){ penEls.forEach(function(e){ e.remove(); }); penEls = []; lsSet('jk_regler_pens', PENS ? '1' : '0'); }
  var frames = 0, fps = 0, lastF = performance.now();
  (function tick(now){ frames++; if (now - lastF > 1000){ fps = Math.round(frames * 1000 / (now - lastF)); frames = 0; lastF = now; statUpd(); }
    if (st.open){ var M = window.JK_METER && window.JK_METER(); if (M) [].forEach.call(bd.querySelectorAll('.meter i'), function(i){ var v = M[i.getAttribute('data-m')] || 0; i.style.width = Math.min(100, Math.sqrt(v) * 160) + '%'; }); }
    if (PENS && window.JK_PLOT_PENS){ var ps = window.JK_PLOT_PENS(); while (penEls.length < ps.length){ var e = document.createElement('i'); e.className = 'jkpen'; document.body.appendChild(e); penEls.push(e); }
      penEls.forEach(function(e, i){ var p = ps[i]; if (!p){ e.style.display = 'none'; return; } e.style.display = ''; e.classList.toggle('bg', p.bg); var y = Math.max(0, Math.min(innerHeight - 4, p.y)); e.style.top = y + 'px'; e.style[st.side === 'r' ? 'right' : 'left'] = (st.open && innerWidth > 700 ? st.w : 0) + 'px'; e.style[st.side === 'r' ? 'left' : 'right'] = 'auto'; e.style.opacity = (p.y < 0 || p.y > innerHeight) ? '.45' : '1'; }); }
    requestAnimationFrame(tick); })(performance.now());
  function statUpd(){ var s = window.JK_SB ? window.JK_SB.state() : null, pl = window.JK_PLOT_STATE ? window.JK_PLOT_STATE() : null;
    stat.textContent = fps + ' Bilder/s' + (pl ? ' · Plotter ' + pl.finished + '/' + pl.n + (pl.bg >= 0 ? ', Hintergrund-Stift an' : '') : '') + (s ? ' · Spiel ' + s.found + '/' + s.n + ', ' + s.points + ' Punkte, ' + s.hints + ' Hinweise' : '') + ' · ' + (MOB ? 'Handy' : 'Desktop'); }

  /* ---------- Bedienung ---------- */
  q.addEventListener('input', function(){ st.q = q.value.trim(); render(); });
  sc.addEventListener('change', function(){ st.scope = sc.value; render(); });
  box.querySelector('.free').addEventListener('click', function(){ st.free = !st.free; render(); });
  box.querySelector('.x').addEventListener('click', function(){ st.open = false; layoutBox(); });
  tab.addEventListener('click', function(){ st.open = true; layoutBox(); render(); });
  box.querySelector('.side').addEventListener('click', function(){ st.side = st.side === 'r' ? 'l' : 'r'; layoutBox(); });
  box.querySelector('.cp').addEventListener('click', copy);
  box.querySelector('.ab').addEventListener('click', toggleAB);
  /* Breite ziehen; Kopf ziehen wechselt die Seite */
  var grip = box.querySelector('.grip'); grip.addEventListener('pointerdown', function(e){ e.preventDefault(); grip.setPointerCapture(e.pointerId); var x0 = e.clientX, w0 = st.w;
    function mv(ev){ var dx = ev.clientX - x0; st.w = Math.max(260, Math.min(700, w0 + (st.side === 'r' ? -dx : dx))); document.documentElement.style.setProperty('--regw', st.w + 'px'); }
    function up(){ grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); layoutBox(); }
    grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up); });
  box.querySelector('.hd b').addEventListener('pointerdown', function(e){ var x0 = e.clientX; function up(ev){ document.removeEventListener('pointerup', up); var x = ev.clientX; if (Math.abs(x - x0) > 80){ st.side = x < innerWidth / 2 ? 'l' : 'r'; layoutBox(); } } document.addEventListener('pointerup', up); });
  document.addEventListener('keydown', function(e){
    if (e.altKey && (e.code === 'KeyR')){ e.preventDefault(); st.open = !st.open; layoutBox(); if (st.open) render(); return; }
    if (e.altKey && (e.code === 'KeyB')){ e.preventDefault(); toggleAB(); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !/^(INPUT|TEXTAREA)$/.test((e.target && e.target.tagName) || '') ){ e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); } });
  C.sub(function(k){ if (k === '*') { /* Presets, A/B, Rückgängig: Leiste zeigt neue Werte */ } });

  function mount(){ document.body.appendChild(box); document.body.appendChild(tab); layoutBox(); render(); statUpd(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
