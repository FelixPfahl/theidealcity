/* Dev Tools für Josef (1.11.2026, 50 Rückfragen T1 bis T50), Etappe 1: Spiel steuern, Spielstand, Anzeigen, Protokoll, Fehler, Regler.
   Lädt nur nach Freischaltung mit ?dev (cfg.js), ?dev=aus meldet ab. Eigener Spielstand (jk_sb_dev), nie Bestenliste.
   Nüchtern-technisch, Seitenleiste rechts (am Handy unten), liegt über der Reglerleiste; der Reiter "Regler" zeigt diese. */
(function(){
  if (window.JK_DEVTOOLS) return; window.JK_DEVTOOLS = true;
  var X = null, G = null, WD = null, PAGE = (document.body && document.body.getAttribute('data-page')) || '';
  function ls(k, d){ try { var v = localStorage.getItem(k); return v === null ? d : v; } catch(e){ return d; } }
  function lsSet(k, v){ try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch(e){} }
  function lsJ(k, d){ try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch(e){ return d; } }
  function esc(s){ return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]; }); }
  function txt(l){ if (!l) return ''; if (typeof l === 'string') return l; if (Array.isArray(l)) return l[1] || ''; return l.text || ''; }
  function who(l){ if (!l) return ''; if (typeof l === 'string') return 'inka'; if (Array.isArray(l)) return l[0]; return l.who || ''; }
  function clean(t){ return String(t || '').replace(/\[[^\]]*\]/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim(); }
  var MOB = window.matchMedia && matchMedia('(max-width:700px)').matches;
  var TABS = [['go', 'Auslösen'], ['st', 'Spielstand'], ['ov', 'Anzeigen'], ['log', 'Protokoll'], ['err', 'Fehler'], ['reg', 'Regler'], ['keys', 'Tasten']];
  var st = {open: ls('jk_dev_open', '1') === '1', tab: ls('jk_dev_tab', 'go'), q: '', type: 'alle', fig: '', logk: '', obj: ls('jk_dev_obj', '0') === '1', spots: ls('jk_dev_spots', '0') === '1', more: 200};
  var SPD = window.JK_DEVSPD || (window.JK_DEVSPD = {mult:1, pause:false});

  /* ---------- Stil ---------- */
  var css = document.createElement('style'); css.textContent = [
    '#jkdev{position:fixed;top:0;right:0;bottom:0;width:var(--regw,360px);z-index:9100;background:#f4f4f4;color:#1a1a1a;font:12px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column;border-left:1px solid #9a9a9a;box-shadow:-2px 0 8px rgba(0,0,0,.12)}',
    '#jkdev *{box-sizing:border-box}#jkdev button,#jkdev input,#jkdev select,#jkdev textarea{font:inherit;color:inherit}',
    '#jkdev .hd{display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:6px 8px;background:#e6e6e6;border-bottom:1px solid #b5b5b5}',
    '#jkdev .hd b{font-weight:600;letter-spacing:.04em;margin-right:auto}#jkdev .hd .k{font-size:10px;color:#555;background:#fff;border:1px solid #c8c8c8;padding:1px 5px;border-radius:3px}',
    '#jkdev .b{border:1px solid #b5b5b5;background:#fff;padding:2px 7px;border-radius:3px;cursor:pointer;line-height:1.5}#jkdev .b:hover{background:#e9f0f8;border-color:#2b6cb0}#jkdev .b.on{background:#2b6cb0;border-color:#2b6cb0;color:#fff}#jkdev .b.warn{border-color:#c0392b;color:#c0392b}',
    '#jkdev nav{display:flex;flex-wrap:wrap;background:#ececec;border-bottom:1px solid #b5b5b5}#jkdev nav button{border:0;background:none;padding:5px 8px;cursor:pointer;border-bottom:2px solid transparent}#jkdev nav button.on{border-bottom-color:#2b6cb0;color:#2b6cb0;font-weight:600}',
    '#jkdev .bd{flex:1;overflow:auto;padding:6px 10px 40px}',
    '#jkdev h5{margin:12px 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#555;border-bottom:1px solid #c8c8c8;padding-bottom:2px}',
    '#jkdev .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:4px 0}#jkdev .row>label{display:flex;gap:4px;align-items:center}',
    '#jkdev input[type=search],#jkdev input[type=text],#jkdev input[type=number],#jkdev input[type=datetime-local],#jkdev select{border:1px solid #b5b5b5;background:#fff;padding:2px 4px;border-radius:3px}#jkdev input[type=search]{flex:1;min-width:120px}#jkdev input[type=number]{width:64px}',
    '#jkdev .it{display:flex;gap:6px;align-items:flex-start;padding:3px 0;border-bottom:1px dotted #c8c8c8}#jkdev .it .pl{flex:none;width:22px;height:20px;padding:0;border:1px solid #b5b5b5;background:#fff;border-radius:3px;cursor:pointer;font-size:10px}#jkdev .it .pl:hover{background:#2b6cb0;color:#fff}',
    '#jkdev .it span{flex:1;min-width:0}#jkdev .it small{color:#666}#jkdev .it code{font:11px ui-monospace,Consolas,monospace;color:#2b6cb0}',
    '#jkdev .who{display:inline-block;font-size:10px;padding:0 4px;border-radius:2px;color:#fff;background:#666;margin-right:3px}',
    '#jkdev .vars{margin:2px 0 4px 28px}#jkdev .vars .it{border-bottom:0;padding:1px 0}',
    '#jkdev .grid{display:grid;grid-template-columns:1fr auto auto;gap:2px 8px;align-items:center}',
    '#jkdev table{border-collapse:collapse;width:100%}#jkdev td,#jkdev th{border-bottom:1px solid #d5d5d5;padding:2px 4px;text-align:left;font-weight:400}#jkdev th{color:#555;font-size:11px}',
    '#jkdev .log div{font:11px/1.35 ui-monospace,Consolas,monospace;padding:1px 0;border-bottom:1px dotted #d0d0d0}#jkdev .log i{font-style:normal;color:#777}#jkdev .log b{font-weight:600;color:#2b6cb0}',
    '#jkdev .err div{padding:3px 0;border-bottom:1px dotted #d0d0d0;color:#c0392b}#jkdev .ok{color:#1e7d43}',
    '#jkdev .note{color:#666;font-size:11px}',
    '#jkdevtab{position:fixed;right:0;top:45%;z-index:9100;background:#2b6cb0;color:#fff;border:0;padding:8px 5px;font:600 11px system-ui,sans-serif;letter-spacing:.06em;writing-mode:vertical-rl;cursor:pointer}',
    '#jkdevback{position:fixed;right:calc(var(--regw,360px) + 8px);top:8px;z-index:9101;background:#2b6cb0;color:#fff;border:0;padding:5px 9px;font:600 11px system-ui,sans-serif;cursor:pointer;border-radius:3px}',
    'html.jkdev-on:not(.jkdev-reg) #jkreg,html.jkdev-on #jkregtab{visibility:hidden!important}html.jkdev-reg #jkdev{display:none}html:not(.jkdev-reg) #jkdevback{display:none}',
    'html.jkdev-obj img.sbobj,html.jkdev-obj img.sbobj.found{outline:3px solid #ff00d4!important;outline-offset:2px;opacity:1!important;visibility:visible!important;filter:none!important;animation:none!important}',
    'html.jkdev-obj img.sbobj.found{outline-style:dashed!important}',
    '.jkdevlab{position:absolute;z-index:60;background:#ff00d4;color:#fff;font:600 10px/1.2 system-ui,sans-serif;padding:1px 4px;pointer-events:none;white-space:nowrap;transform:translateY(-100%)}',
    'html.jkdev-spots .jkspot1{outline:2px dashed #1e7d43!important;outline-offset:-2px}html.jkdev-spots .jkspot2{outline:2px dashed #d68910!important;outline-offset:-2px}html.jkdev-spots .jkspot3{outline:2px dashed #c0392b!important;outline-offset:-2px}',
    '@media (max-width:700px){#jkdev{top:auto;left:0;width:auto;height:55vh;border-left:0;border-top:1px solid #9a9a9a}#jkdevtab{top:auto;bottom:70px;writing-mode:horizontal-tb;padding:6px 9px}#jkdevback{right:8px;top:auto;bottom:calc(50vh + 8px)}}'
  ].join('\n'); document.head.appendChild(css);

  /* ---------- Gerüst ---------- */
  var box = document.createElement('aside'); box.id = 'jkdev'; box.setAttribute('aria-label', 'Dev Tools');
  box.innerHTML = '<div class="hd"><b>DEV TOOLS</b><span class="k" title="Eigener Spielstand, nie in der Bestenliste">Dev-Spielstand</span>' +
    '<button class="b sp" data-m="pause" title="Pause (Alt+P)">❚❚</button><button class="b sp" data-m="1" title="Normal (Alt+1)">1×</button><button class="b sp" data-m="2" title="Doppelt (Alt+2)">2×</button><button class="b sp" data-m="4" title="Vierfach (Alt+4)">4×</button><button class="b sp" data-m="99" title="Sofort (Alt+0)">»</button>' +
    '<button class="b x" title="Zuklappen (Alt+D)">×</button></div><nav></nav><div class="bd"></div>';
  var tabBtn = document.createElement('button'); tabBtn.id = 'jkdevtab'; tabBtn.textContent = 'DEV'; tabBtn.title = 'Dev Tools öffnen (Alt+D)';
  var back = document.createElement('button'); back.id = 'jkdevback'; back.textContent = '◀ Dev Tools'; back.addEventListener('click', function(){ setTab('go'); });
  var nav = box.querySelector('nav'), bd = box.querySelector('.bd');
  TABS.forEach(function(t){ var b = document.createElement('button'); b.textContent = t[1]; b.setAttribute('data-t', t[0]); b.addEventListener('click', function(){ setTab(t[0]); }); nav.appendChild(b); });
  box.querySelector('.x').addEventListener('click', function(){ setOpen(false); });
  tabBtn.addEventListener('click', function(){ setOpen(true); });
  box.querySelectorAll('.sp').forEach(function(b){ b.addEventListener('click', function(){ speed(b.getAttribute('data-m')); }); });

  function regOpen(want){ var r = document.documentElement; if (!document.getElementById('jkreg')) return; if (r.classList.contains('jkreg-open') !== want) document.dispatchEvent(new KeyboardEvent('keydown', {key:'r', code:'KeyR', altKey:true, bubbles:true})); }
  function setOpen(o){ st.open = o; lsSet('jk_dev_open', o ? '1' : '0'); box.style.display = o ? '' : 'none'; tabBtn.style.display = o ? 'none' : ''; document.documentElement.classList.toggle('jkdev-on', o); if (!o) document.documentElement.classList.remove('jkdev-reg'); regOpen(o); if (o) render(); }
  function setTab(t){ st.tab = t; lsSet('jk_dev_tab', t); document.documentElement.classList.toggle('jkdev-reg', t === 'reg'); if (t === 'reg'){ regOpen(true); } render(); }
  function speed(m){ if (m === 'pause') SPD.pause = !SPD.pause; else { SPD.mult = +m; SPD.pause = false; } lsSet('jk_dev_spd', JSON.stringify(SPD)); markSpeed(); window.JK_DEVLOG && window.JK_DEVLOG('tempo', SPD.pause ? 'Pause' : SPD.mult >= 99 ? 'sofort' : SPD.mult + '×'); }
  function markSpeed(){ box.querySelectorAll('.sp').forEach(function(b){ var m = b.getAttribute('data-m'); b.classList.toggle('on', m === 'pause' ? !!SPD.pause : (!SPD.pause && +m === SPD.mult)); }); }

  /* ---------- Reiter ---------- */
  function render(){ if (!st.open) return; nav.querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-t') === st.tab); }); markSpeed();
    if (!X || !G){ bd.innerHTML = '<p class="note">Warte auf das Spiel ...</p>'; return; }
    var f = {go:rGo, st:rState, ov:rOv, log:rLog, err:rErr, reg:rReg, keys:rKeys}[st.tab] || rGo; f(); }
  function h(html){ bd.innerHTML = html; }
  function on(sel, ev, fn){ bd.querySelectorAll(sel).forEach(function(e){ e.addEventListener(ev, function(x){ fn(e, x); }); }); }
  function col(w){ var c = X.CH[w]; return c ? c.col : '#666'; }
  function tag(w){ return '<i class="who" style="background:' + col(w) + '">' + esc(w) + '</i>'; }

  /* Auslösen */
  var SYS = [
    ['Inka rufen', function(){ G.greet(); }], ['Intro', function(){ G.intro(); }], ['Modem', function(){ G.modem(); }], ['Hinweis', function(){ G.hint(); }], ['Auftrag anbieten', function(){ G.quest(); }],
    ['Ungefragt jetzt', function(){ WD && WD.ambient(); }], ['Welt-Ereignis', function(){ WD && WD.worldEvent(); }], ['Polizei 1', function(){ WD && WD.police(1); }], ['Polizei 2', function(){ WD && WD.police(2); }], ['Polizei 3', function(){ WD && WD.police(3); }], ['Auge', function(){ WD && WD.eye(); }],
    ['Dinge wandern', function(){ G.wander(); }], ['Geheimes Kapitel', function(){ G.secret(); }], ['Ende (normal)', function(){ G.done(); }], ['Ende Zerstörung', function(){ G.done3(); }], ['Ende Gojira', function(){ G.done4(); }], ['Urkunde', function(){ G.cert(); }],
    ['Logbuch', function(){ G.logbook(); }], ['Inventar', function(){ G.inventory(); }], ['Dialog weiter', function(){ G.next(); }], ['Dialog schließen', function(){ G.close(); }]];
  function items(){ var T = WD ? WD.T() : null, out = [];
    if (T){ (T.convos || []).forEach(function(c){ var ws = {}; c.lines.forEach(function(l){ ws[who(l)] = 1; }); out.push({ty:'Gespräche', id:c.id, ws:Object.keys(ws), t:clean(txt(c.lines[0])), all:c.lines.map(function(l){ return clean(txt(l)); }).join(' '), cond:condStr(c), run:function(){ WD.convo(c.id); }}); });
      Object.keys(T.scenes || {}).forEach(function(k){ var L = T.scenes[k], ws = {}; L.forEach(function(l){ ws[who(l)] = 1; }); out.push({ty:'Szenen', id:k, ws:Object.keys(ws), t:clean(txt(L[0])), all:L.map(function(l){ return clean(txt(l)); }).join(' '), run:function(){ WD.scene(k); }}); });
      Object.keys(T.beh || {}).forEach(function(k){ var B = T.beh[k]; var all = []; B.stages.forEach(function(a){ a.forEach(function(v){ all.push(typeof v === 'object' ? Object.keys(v).map(function(q){ return v[q]; }).join(' ') : v); }); }); out.push({ty:'Verhalten', id:k, ws:[B.who], t:B.stages.map(function(a){ return a.length; }).join(' / ') + ' Varianten', all:all.join(' '), beh:B, pts:WD.PTS[k]}); }); }
    G.CHAPTERS.forEach(function(c, i){ out.push({ty:'Kapitel', id:'Kapitel ' + (i + 1), ws:['inka'], t:clean(c.t || c.title || ''), all:JSON.stringify(c), cond:'ab Besuch ' + c.v + ', ' + c.f + ' Funde', run:function(){ G.chapter(i); }}); });
    return out; }
  function condStr(c){ var p = []; ['page', 'sec', 'work', 'min', 'max', 'visits', 'tod', 'dow', 'day', 'after', 'fac', 'wanted', 'ng', 'rel'].forEach(function(k){ if (c[k] !== undefined) p.push(k + ' ' + (typeof c[k] === 'object' ? JSON.stringify(c[k]) : c[k])); }); return p.join(', '); }
  var ITEMS = null;
  function rGo(){ ITEMS = ITEMS || items(); var figs = {}; ITEMS.forEach(function(i){ i.ws.forEach(function(w){ figs[w] = 1; }); });
    var q = st.q.toLowerCase(), list = ITEMS.filter(function(i){ return (st.type === 'alle' || i.ty === st.type) && (!st.fig || i.ws.indexOf(st.fig) >= 0) && (!q || (i.id + ' ' + i.all).toLowerCase().indexOf(q) >= 0); });
    var cnt = {}; ITEMS.forEach(function(i){ cnt[i.ty] = (cnt[i.ty] || 0) + 1; });
    var html = '<h5>System</h5><div class="row">' + SYS.map(function(s, i){ return '<button class="b sys" data-i="' + i + '">' + esc(s[0]) + '</button>'; }).join('') + '</div>' +
      '<h5>Texte (' + ITEMS.length + ')</h5><div class="row"><input type="search" class="q" placeholder="Suche in Texten und IDs" value="' + esc(st.q) + '"></div>' +
      '<div class="row"><select class="ty">' + ['alle', 'Gespräche', 'Szenen', 'Verhalten', 'Kapitel'].map(function(t){ return '<option' + (t === st.type ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>' +
      '<select class="fig"><option value="">alle Figuren</option>' + Object.keys(figs).sort().map(function(f){ return '<option' + (f === st.fig ? ' selected' : '') + '>' + esc(f) + '</option>'; }).join('') + '</select><span class="note">' + list.length + ' Treffer; ' + Object.keys(cnt).map(function(k){ return k + ' ' + cnt[k]; }).join(', ') + '</span></div><div class="lst">';
    list.slice(0, st.more).forEach(function(it, n){ var j = ITEMS.indexOf(it);
      if (it.beh){ html += '<div class="it"><span><code>' + esc(it.id) + '</code> ' + tag(it.ws[0]) + '<small>' + esc(it.t) + (it.pts ? ', ' + it.pts + ' Punkte' : '') + '</small></span></div><div class="vars">' + it.beh.stages.map(function(a, s){ return a.map(function(v, vi){ var tv = typeof v === 'object' ? (v.inka || v[Object.keys(v)[0]]) : v; if (q && String(typeof v === 'object' ? JSON.stringify(v) : v).toLowerCase().indexOf(q) < 0 && it.id.toLowerCase().indexOf(q) < 0) return ''; return '<div class="it"><button class="pl bv" data-j="' + j + '" data-s="' + s + '" data-v="' + vi + '" title="Abspielen">▶</button><span><small>S' + (s + 1) + '.' + (vi + 1) + '</small> ' + esc(clean(tv)).slice(0, 140) + '</span></div>'; }).join(''); }).join('') + '</div>'; return; }
      html += '<div class="it"><button class="pl run" data-j="' + j + '" title="Abspielen">▶</button><span><code>' + esc(it.id) + '</code> ' + it.ws.map(tag).join('') + '<br>' + esc(it.t).slice(0, 150) + (it.cond ? '<br><small>' + esc(it.cond) + '</small>' : '') + '</span></div>'; });
    if (list.length > st.more) html += '<div class="row"><button class="b more">' + (list.length - st.more) + ' weitere zeigen</button></div>';
    h(html + '</div>');
    on('.sys', 'click', function(e){ try { SYS[+e.getAttribute('data-i')][1](); } catch(x){ err('Auslösen: ' + x.message); } });
    on('.run', 'click', function(e){ var it = ITEMS[+e.getAttribute('data-j')]; try { it.run(); } catch(x){ err(x.message); } });
    on('.bv', 'click', function(e){ var it = ITEMS[+e.getAttribute('data-j')]; WD.beh(it.id, +e.getAttribute('data-s'), +e.getAttribute('data-v'), st.fig || 'inka'); });
    on('.q', 'input', function(e){ st.q = e.value; st.more = 200; clearTimeout(qT); qT = setTimeout(function(){ rGo(); var n = bd.querySelector('.q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 220); });
    on('.ty', 'change', function(e){ st.type = e.value; rGo(); }); on('.fig', 'change', function(e){ st.fig = e.value; rGo(); }); on('.more', 'click', function(){ st.more += 300; rGo(); }); }
  var qT = null;

  /* Spielstand */
  var FIG = ['inka', 'wagner', 'xae', 'sigma', 'gojira'];
  function rState(){ var S = G.S(), W = WD ? WD.W : {}; var snaps = lsJ('jk_dev_snaps', {});
    var toff = +ls('jk_dev_toff', '0') || 0, real = window.JK_REALDATE ? window.JK_REALDATE.now() : Date.now(), sim = new Date(real + toff);
    function dtl(d){ var p = function(n){ return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }
    var html = '<h5>Überblick</h5><table><tr><th>Speicher</th><td><code>' + G.KEY + '</code></td></tr><tr><th>Funde</th><td>' + G.count() + ' von ' + G.N + '</td></tr><tr><th>Punkte</th><td>' + G.points() + '</td></tr><tr><th>Zeit</th><td>' + G.secs() + ' s</td></tr><tr><th>Seed</th><td>' + S.seed + '</td></tr></table>' +
      '<h5>Werte</h5><div class="grid">' + num('Hinweise', 'hints', S.hints || 0) + num('Besuche', 'visits', S.visits || 1) + num('Spielzeit (s)', 'secs', G.secs()) + num('Besuchsbonus', 'visitBonus', S.visitBonus || 0) + num('Plus-Stufe (neu laden)', 'ng', S.ng || 0) + num('Fahndung 0 bis 5', 'w.wanted', Math.round((W.wanted || 0) * 10) / 10) + num('Bußgeld', 'w.fines', W.fines || 0) +
      ['nil', 'retter', 'wagner'].map(function(f){ return num('Fraktion ' + f, 'fac.' + f, (W.fac || {})[f] || 0); }).join('') + '</div>' +
      '<h5>Beziehungen</h5><table><tr><th>Figur</th><th>Nähe n</th><th>Reibung r</th><th>Stimmung</th></tr>' + FIG.map(function(w){ var R = G.rel(w); return '<tr><td>' + tag(w) + '</td><td><input type="number" class="rel" data-w="' + w + '" data-k="n" value="' + (R.n || 0) + '"></td><td><input type="number" class="rel" data-w="' + w + '" data-k="r" value="' + (R.r || 0) + '"></td><td>' + esc(G.baseMood(w)) + '</td></tr>'; }).join('') + '</table>' +
      '<h5>Funde</h5><div class="row"><button class="b fa">alle</button><button class="b fn">keine</button></div>' + G.PLACES.map(function(p){ return '<div class="it"><label><input type="checkbox" class="fd" data-id="' + p.id + '"' + (S.found[p.id] ? ' checked' : '') + '> ' + esc(G.NAMES[p.id] || p.id) + '</label> <small>' + esc(p.p) + ', Stufe ' + p.d + ', ' + esc(p.k || p.sel) + '</small></div>'; }).join('') +
      '<h5>Zeit simulieren</h5><div class="row"><input type="datetime-local" class="dt" value="' + dtl(sim) + '"><button class="b dts">Setzen und neu laden</button><button class="b dtr"' + (toff ? '' : ' disabled') + '>Echte Zeit</button></div><p class="note">' + (toff ? 'Simuliert: ' + esc(sim.toLocaleString('de-DE')) + '. Tageszeit, Wochentag, Feiertage und Besuchsabstände richten sich danach.' : 'Es läuft die echte Zeit.') + '</p>' +
      '<h5>Schnappschüsse</h5><div class="row"><input type="text" class="sn" placeholder="Name, z. B. kurz vor Ende"><button class="b sns">Speichern</button></div>' + Object.keys(snaps).map(function(k){ return '<div class="it"><span>' + esc(k) + ' <small>' + new Date(snaps[k].t).toLocaleString('de-DE') + '</small></span><button class="b snl" data-k="' + esc(k) + '">Laden</button><button class="b snx" data-k="' + esc(k) + '">Datei</button><button class="b snd" data-k="' + esc(k) + '">×</button></div>'; }).join('') +
      '<div class="row"><label class="b">Datei laden<input type="file" class="sni" accept=".json,application/json" hidden></label></div>' +
      '<h5>Zurücksetzen</h5><div class="row"><button class="b warn rs">Dev-Spielstand löschen</button><button class="b rl">Neu laden</button></div><p class="note">Dein echter Spielstand (jk_sb) bleibt unberührt.</p>';
    h(html);
    on('.v', 'change', function(e){ var k = e.getAttribute('data-k'), v = +e.value; if (k === 'secs') S.start = Date.now() - v * 1000; else if (k.indexOf('w.') === 0) W[k.slice(2)] = v; else if (k.indexOf('fac.') === 0){ W.fac = W.fac || {}; W.fac[k.slice(4)] = v; } else S[k] = v; G.save(); G.refresh(); log('spielstand', k + ' = ' + v); });
    on('.rel', 'change', function(e){ var R = G.rel(e.getAttribute('data-w')); R[e.getAttribute('data-k')] = +e.value; G.save(); log('spielstand', e.getAttribute('data-w') + '.' + e.getAttribute('data-k') + ' = ' + e.value); rState(); });
    on('.fd', 'change', function(e){ var id = e.getAttribute('data-id'); if (e.checked) G.find(id); else G.unfind(id); setTimeout(rState, 300); });
    on('.fa', 'click', function(){ G.PLACES.forEach(function(p){ G.find(p.id); }); setTimeout(rState, 300); }); on('.fn', 'click', function(){ G.PLACES.forEach(function(p){ G.unfind(p.id); }); rState(); });
    on('.dts', 'click', function(){ var v = bd.querySelector('.dt').value; if (!v) return; var t = new (window.JK_REALDATE || Date)(v).getTime(); lsSet('jk_dev_toff', String(t - real)); location.reload(); });
    on('.dtr', 'click', function(){ lsSet('jk_dev_toff', null); location.reload(); });
    on('.sns', 'click', function(){ var n = bd.querySelector('.sn').value.trim() || ('Stand ' + new Date().toLocaleString('de-DE')); snaps[n] = {t:Date.now(), S:JSON.parse(JSON.stringify(S))}; lsSet('jk_dev_snaps', JSON.stringify(snaps)); log('spielstand', 'Schnappschuss ' + n); rState(); });
    on('.snl', 'click', function(e){ var s = snaps[e.getAttribute('data-k')]; if (!s) return; lsSet(G.KEY, JSON.stringify(s.S)); location.reload(); });
    on('.snd', 'click', function(e){ delete snaps[e.getAttribute('data-k')]; lsSet('jk_dev_snaps', JSON.stringify(snaps)); rState(); });
    on('.snx', 'click', function(e){ var k = e.getAttribute('data-k'); download('spielstand-' + k.replace(/[^\w-]+/g, '_') + '.json', JSON.stringify({name:k, t:snaps[k].t, S:snaps[k].S}, null, 1)); });
    on('.sni', 'change', function(e){ var f = e.files[0]; if (!f) return; f.text().then(function(t){ try { var o = JSON.parse(t); var S2 = o.S || o; if (!S2.found) throw new Error('kein Spielstand'); snaps[o.name || f.name] = {t:o.t || Date.now(), S:S2}; lsSet('jk_dev_snaps', JSON.stringify(snaps)); rState(); } catch(x){ err('Datei: ' + x.message); rErrMark(); } }); });
    var rsArm = false; on('.rs', 'click', function(e){ if (!rsArm){ rsArm = true; e.textContent = 'Wirklich löschen?'; return; } lsSet(G.KEY, null); location.reload(); });
    on('.rl', 'click', function(){ location.reload(); }); }
  function num(lab, k, v){ return '<label>' + esc(lab) + '</label><input type="number" class="v" data-k="' + k + '" value="' + v + '" step="any"><span></span>'; }
  function download(name, text){ var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type:'application/json'})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500); }

  /* Anzeigen */
  function labels(){ document.querySelectorAll('.jkdevlab').forEach(function(l){ l.remove(); }); if (!st.obj) return; document.querySelectorAll('img.sbobj').forEach(function(o){ var id = o.getAttribute('data-id') || ''; var l = document.createElement('span'); l.className = 'jkdevlab'; l.textContent = (G.NAMES[id] || id) + (o.classList.contains('found') ? ' ✓' : ''); l.style.left = o.style.left; l.style.top = o.style.top; if (o.parentNode) o.parentNode.insertBefore(l, o); }); }
  function spots(){ document.querySelectorAll('.jkspot1,.jkspot2,.jkspot3').forEach(function(e){ e.classList.remove('jkspot1', 'jkspot2', 'jkspot3'); }); if (!st.spots) return; (G.SPOTS[PAGE] || []).forEach(function(sp){ if (/^@lb:/.test(sp[0])) return; try { document.querySelectorAll(sp[0]).forEach(function(e){ e.classList.add('jkspot' + sp[2]); }); } catch(x){} }); }
  function setObj(v){ st.obj = v; lsSet('jk_dev_obj', v ? '1' : '0'); document.documentElement.classList.toggle('jkdev-obj', v); labels(); }
  function setSpots(v){ st.spots = v; lsSet('jk_dev_spots', v ? '1' : '0'); document.documentElement.classList.toggle('jkdev-spots', v); spots(); }
  function rOv(){ var here = G.PLACES.filter(function(p){ return p.p === PAGE; }), S = G.S();
    var html = '<h5>Anzeigen</h5><div class="row"><label><input type="checkbox" class="o1"' + (st.obj ? ' checked' : '') + '> Alle Objekte sichtbar (Alt+O)</label></div><div class="row"><label><input type="checkbox" class="o2"' + (st.spots ? ' checked' : '') + '> Mögliche Verstecke (Alt+V)</label></div><p class="note">Grün offen (Stufe 1), orange in Bildern (2), rot Ränder und Fußzeile (3).</p>' +
      '<h5>Objekte auf dieser Seite (' + here.length + ')</h5>' + here.map(function(p){ var lb = /^@lb:/.test(p.sel); return '<div class="it"><button class="pl go" data-id="' + p.id + '" title="Hinscrollen">→</button><span>' + esc(G.NAMES[p.id] || p.id) + (S.found[p.id] ? ' ✓' : '') + '<br><small>Stufe ' + p.d + ', ' + esc(p.k || '') + (lb ? ' (in der Großansicht)' : '') + '</small></span></div>'; }).join('') +
      '<h5>Verstecke dieser Seite</h5>' + (G.SPOTS[PAGE] || []).map(function(sp){ var n = 0; try { n = /^@lb:/.test(sp[0]) ? document.querySelectorAll(sp[0].slice(4)).length : document.querySelectorAll(sp[0]).length; } catch(x){} return '<div class="it"><span><small>Stufe ' + sp[2] + '</small> ' + esc(sp[1]) + ' <small>(' + n + ' Anker)</small></span></div>'; }).join('') +
      '<h5>Figuren</h5><table><tr><th>Figur</th><th>n</th><th>r</th><th>Stimmung</th></tr>' + FIG.map(function(w){ var R = G.rel(w); return '<tr><td>' + tag(w) + '</td><td>' + (R.n || 0) + '</td><td>' + (R.r || 0) + '</td><td>' + esc(G.baseMood(w)) + '</td></tr>'; }).join('') + '</table>' +
      (WD ? '<h5>Welt</h5><table><tr><th>Fahndung</th><td>' + (Math.round((WD.W.wanted || 0) * 10) / 10) + '</td></tr><tr><th>Fraktionen</th><td>' + esc(JSON.stringify(WD.W.fac || {})) + ', führend: ' + esc(WD.lead() || '-') + '</td></tr><tr><th>Gespräche gesehen</th><td>' + Object.keys(WD.W.cs || {}).length + ' von ' + ((WD.T() || {}).convos || []).length + '</td></tr><tr><th>Szenen gesehen</th><td>' + Object.keys(WD.W.sc || {}).length + '</td></tr><tr><th>Abzeichen</th><td>' + Object.keys(WD.W.ach || {}).length + ' von ' + WD.ACH.length + '</td></tr><tr><th>Verhaltenspunkte</th><td>' + Object.keys(WD.W.bp || {}).reduce(function(a, k){ return a + (WD.W.bp[k] || 0); }, 0) + '</td></tr></table>' : '');
    h(html); on('.o1', 'change', function(e){ setObj(e.checked); }); on('.o2', 'change', function(e){ setSpots(e.checked); });
    on('.go', 'click', function(e){ var o = document.querySelector('img.sbobj[data-id="' + e.getAttribute('data-id') + '"]'); if (o){ o.scrollIntoView({behavior:'smooth', block:'center'}); o.animate && o.animate([{transform:'scale(1.6)'}, {transform:'scale(1)'}], {duration:700}); } else err('Objekt nicht auf der Seite (Großansicht oder Nicht jetzt)'); }); }

  /* Protokoll */
  function log(k, m){ if (window.JK_DEVLOG) window.JK_DEVLOG(k, m); }
  function fmtT(t){ var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2); }
  function rLog(){ var b = window.__jkdevbuf || [], kinds = {}; b.forEach(function(e){ kinds[e.k] = 1; }); var list = b.filter(function(e){ return !st.logk || e.k === st.logk; }).slice(-300).reverse();
    h('<h5>Ereignisse (' + b.length + ')</h5><div class="row"><select class="lk"><option value="">alle</option>' + Object.keys(kinds).sort().map(function(k){ return '<option' + (k === st.logk ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select><button class="b lc">Leeren</button><button class="b lp">Kopieren</button></div><div class="log">' + list.map(function(e){ return '<div><i>' + fmtT(e.t) + '</i> <b>' + esc(e.k) + '</b> ' + esc(e.m) + '</div>'; }).join('') + '</div>');
    on('.lk', 'change', function(e){ st.logk = e.value; rLog(); }); on('.lc', 'click', function(){ b.length = 0; rLog(); });
    on('.lp', 'click', function(e){ copy(b.map(function(x){ return fmtT(x.t) + ' ' + x.k + ' ' + x.m; }).join('\n'), e); }); }
  window.JK_DEVLOG_ON = function(){ if (st.open && st.tab === 'log'){ clearTimeout(logT); logT = setTimeout(rLog, 250); } };
  var logT = null;

  /* Fehler */
  function err(m){ (window.__jkdeverr = window.__jkdeverr || []).push({t:Date.now(), m:m}); rErrMark(); }
  function rErrMark(){ var b = nav.querySelector('[data-t=err]'); var n = (window.__jkdeverr || []).length; if (b) b.textContent = 'Fehler' + (n ? ' (' + n + ')' : ''); }
  function check(){ var out = [], vw = document.documentElement.clientWidth;
    document.querySelectorAll('img').forEach(function(i){ if (i.complete && i.getAttribute('src') && !i.naturalWidth && !i.closest('#jkdev') && getComputedStyle(i).display !== 'none') out.push('Bild kaputt: ' + i.getAttribute('src')); });
    if (document.documentElement.scrollWidth > vw + 1) out.push('Seite breiter als das Fenster: ' + document.documentElement.scrollWidth + ' > ' + vw + ' px');
    var objs = [].slice.call(document.querySelectorAll('img.sbobj:not(.found)')).filter(function(o){ return o.offsetWidth; }); for (var a = 0; a < objs.length; a++){ var ra = objs[a].getBoundingClientRect(); for (var b2 = a + 1; b2 < objs.length; b2++){ var rb = objs[b2].getBoundingClientRect(); if (ra.left < rb.right && rb.left < ra.right && ra.top < rb.bottom && rb.top < ra.bottom) out.push('Objekte überlappen: ' + objs[a].getAttribute('data-id') + ' / ' + objs[b2].getAttribute('data-id')); }
      var an = objs[a].parentNode && objs[a].parentNode.getBoundingClientRect(); if (an && (ra.left < an.left - 1 || ra.right > an.right + 1 || ra.top < an.top - 1 || ra.bottom > an.bottom + 1)) out.push('Objekt ragt aus dem Anker: ' + objs[a].getAttribute('data-id')); }
    document.querySelectorAll('a[href]').forEach(function(l){ var hr = l.getAttribute('href'); if (/^#./.test(hr) && !document.getElementById(decodeURIComponent(hr.slice(1)))) out.push('Sprungziel fehlt: ' + hr); });
    document.querySelectorAll('main button, main a').forEach(function(e){ var r = e.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) return; var x = r.left + r.width / 2, y = r.top + r.height / 2; var t = document.elementFromPoint(x, y); if (t && t !== e && !e.contains(t) && !t.closest('#jkdev, .sbdlg, .sbfab, .jkdevlab, img.sbobj, header, nav')) out.push('Verdeckt: ' + (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 40) + ' unter ' + t.tagName.toLowerCase() + (t.className && typeof t.className === 'string' ? '.' + t.className.split(' ')[0] : '')); });
    return out; }
  var lastCheck = null;
  function rErr(){ var e = window.__jkdeverr || [];
    h('<h5>Laufzeit (' + e.length + ')</h5><div class="err">' + (e.length ? e.slice(-100).reverse().map(function(x){ return '<div>' + fmtT(x.t) + ' ' + esc(x.m) + '</div>'; }).join('') : '<p class="ok">Keine JS-Fehler und keine fehlenden Dateien seit dem Laden.</p>') + '</div>' +
      '<h5>Prüfung dieser Seite</h5><div class="row"><button class="b ck">Jetzt prüfen</button><button class="b cp">Fehlerbericht kopieren</button><button class="b cl">Liste leeren</button></div><div class="err res">' + (lastCheck ? (lastCheck.length ? lastCheck.map(function(m){ return '<div>' + esc(m) + '</div>'; }).join('') : '<p class="ok">Nichts gefunden (Bilder, Breite, Objekte, Sprungziele, verdeckte Knöpfe im Sichtfeld).</p>') : '') + '</div>');
    on('.ck', 'click', function(){ lastCheck = check(); rErr(); }); on('.cl', 'click', function(){ (window.__jkdeverr || []).length = 0; lastCheck = null; rErrMark(); rErr(); });
    on('.cp', 'click', function(b){ var c = lastCheck || check(); var s = G.S(); copy(['Fehlerbericht ' + new Date().toLocaleString('de-DE'), location.href, navigator.userAgent, 'Fenster ' + innerWidth + ' x ' + innerHeight + ', DPR ' + devicePixelRatio, 'Funde ' + G.count() + ', Besuche ' + (s.visits || 1), '', 'Laufzeit:'].concat(e.map(function(x){ return fmtT(x.t) + ' ' + x.m; })).concat(['', 'Prüfung:']).concat(c).join('\n'), b); }); }

  /* Regler und Tasten */
  function rReg(){ h('<p class="note">Die Reglerleiste liegt jetzt sichtbar. Zurück mit dem Knopf oben links neben der Leiste.</p>'); }
  var KEYS = [['Alt+D', 'Dev Tools auf und zu'], ['Alt+O', 'alle Objekte sichtbar'], ['Alt+V', 'mögliche Verstecke'], ['Alt+P', 'Pause (Dialoge)'], ['Alt+1 / 2 / 4', 'Tempo normal, doppelt, vierfach (Dialoge, Plotter, Wartezeiten)'], ['Alt+0', 'Tempo sofort'], ['Alt+N', 'Dialog weiter'], ['Alt+X', 'Dialog schließen'], ['Alt+I', 'Inka rufen'], ['Alt+L', 'Protokoll'], ['Alt+E', 'Fehler prüfen'], ['Alt+R', 'Regler (aus der Reglerleiste)'], ['Alt+B', 'Regler A/B']];
  function rKeys(){ h('<h5>Tastenkürzel</h5><table>' + KEYS.map(function(k){ return '<tr><th>' + esc(k[0]) + '</th><td>' + esc(k[1]) + '</td></tr>'; }).join('') + '</table><h5>Abmelden</h5><p class="note">Adresse mit <code>?dev=aus</code> öffnen: Dev Tools und Regler verschwinden in diesem Browser.</p>'); }
  function copy(t, btn){ function ok(){ if (btn){ var o = btn.textContent; btn.textContent = 'Kopiert'; setTimeout(function(){ btn.textContent = o; }, 1200); } } if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, function(){ fallback(); }); else fallback(); function fallback(){ var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch(x){} ta.remove(); } }

  document.addEventListener('keydown', function(e){ if (!e.altKey || e.ctrlKey || e.metaKey) return; var c = e.code;
    var map = {KeyD:function(){ setOpen(!st.open); }, KeyO:function(){ setObj(!st.obj); if (st.tab === 'ov') rOv(); }, KeyV:function(){ setSpots(!st.spots); if (st.tab === 'ov') rOv(); }, KeyP:function(){ speed('pause'); }, Digit1:function(){ speed('1'); }, Digit2:function(){ speed('2'); }, Digit4:function(){ speed('4'); }, Digit0:function(){ speed('99'); }, KeyN:function(){ G && G.next(); }, KeyX:function(){ G && G.close(); }, KeyI:function(){ G && G.greet(); }, KeyL:function(){ setOpen(true); setTab('log'); }, KeyE:function(){ setOpen(true); lastCheck = G ? check() : null; setTab('err'); }};
    if (map[c]){ e.preventDefault(); e.stopPropagation(); map[c](); } }, true);

  /* ---------- Start: warten, bis Spiel und Welt bereit sind ---------- */
  function boot(){ document.body.appendChild(box); document.body.appendChild(tabBtn); document.body.appendChild(back); setOpen(st.open); if (st.tab === 'reg') setTab('reg'); rErrMark();
    var tries = 0; (function wait(){ X = window.JK_SBX; G = X && X.dev; WD = X && X.wdev; if (X && X.PAGE) PAGE = X.PAGE; if (G && (WD || tries > 40)){ document.documentElement.classList.toggle('jkdev-obj', st.obj); document.documentElement.classList.toggle('jkdev-spots', st.spots); setTimeout(function(){ labels(); spots(); }, 600); render(); return; } tries++; setTimeout(wait, 250); })(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('resize', function(){ if (st.obj){ clearTimeout(window.__jkdl); window.__jkdl = setTimeout(labels, 300); } });
})();
