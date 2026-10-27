/* Josef Knoll, Portfolio: Spielereien. Kein Framework, keine Audiodateien (alles Web Audio). */
(function(){
  /* Holzschnitt-Textur der Versalien: Seeds je Seitenaufruf neu, damit die Textur immer variiert */
  try { if (window.innerWidth > 700){ document.querySelectorAll('feTurbulence').forEach(function(t){ t.setAttribute('seed', String(Math.floor(Math.random() * 1000))); }); document.documentElement.classList.add('woodcut'); } } catch(e){}
  var T = window.JK_STRINGS || {};
  function safe(f){ try { f(); } catch(e){ try { console.warn('jk', e); } catch(_){} } }   /* ein Fehler in einem Block legt nicht alles lahm (Firefox) */
  var lang = document.documentElement.lang || 'de';

  /* ---------- Sichtbar werden ---------- */
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} }); }, {rootMargin:'0px 0px -5% 0px'});
    document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
  } else { document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('in'); }); }

  /* ---------- Titel wechselt ---------- */
  var titles = [document.title, 'JO', 'SEF', document.title];
  var ti = 0; setInterval(function(){ if(document.hidden){ ti=(ti+1)%titles.length; document.title = titles[ti]; } else { document.title = titles[0]; } }, 1500);

  /* ---------- Feste Werte (Regler abgeschafft, Josef, 27.10.): Ton alle 2 bis 5 Klicks, Bewegung voll, bei Systemeinstellung "weniger Bewegung" ruhig ---------- */
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* Bewegung: 2 voll, 1 ruhig (nur Ein- und Ausblenden, kein Wackeln), 0 aus. Wer im System "weniger Bewegung" eingestellt hat, startet mit ruhig. */
  var FX_DEFAULT = {ton:5, vol:100, bewegung:2, modem:true};   /* Josef, 27.10.: alle Effekte an, Systemeinstellung "weniger Bewegung" wird nicht mehr ausgewertet (Firefox zeigte sonst keinen Zeiger und keine Laufschrift) */   /* Ton bei jedem Klick, volle Stärke (viertes Interview) */
  var FX = {}; for (var k0 in FX_DEFAULT) FX[k0] = FX_DEFAULT[k0];
  if (REDUCED){ FX.vol = 0; FX.ton = 0; FX.bewegung = 1; FX.modem = false; }   /* Reduced Motion (Josef, 27.10.): Text sofort komplett, kein Einflug, Ton aus */
  try { localStorage.removeItem('jk_fx'); } catch(e){}   /* Regler abgeschafft (Josef, 27.10., 18:30): nichts mehr gespeichert */
  function applyMotion(){ var h = document.documentElement; h.classList.toggle('calm', FX.bewegung < 2); h.classList.toggle('still', FX.bewegung === 0); }
  applyMotion();
  /* Töne: 0 aus, 1 selten, 2 manchmal, 3 normal (alle 2 bis 5 Klicks), 4 oft, 5 bei jedem Klick */
  var TON_RANGE = [null, [6,10], [4,7], [2,5], [1,3], [1,1]];
  function nextGap(){ var r = TON_RANGE[FX.ton]; return r ? r[0] + Math.floor(Math.random()*(r[1]-r[0]+1)) : Infinity; }

  /* ---------- Klickzähler (nur diese Seite, nichts gespeichert) ---------- */
  try { localStorage.removeItem('jk_visits'); } catch(e){}   /* alter Besucherzähler: Rest aus früheren Besuchen entfernen */
  var clickCount = 0, counterEl = document.querySelector('[data-counter]');
  document.addEventListener('pointerdown', function(){ clickCount++; if(counterEl) counterEl.textContent = String(clickCount).padStart(6,'0'); }, true);

  /* ---------- Töne (Web Audio, synthetisch) ---------- */
  var AC = null;
  function ctx(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC && AC.state==='suspended'){ try{AC.resume();}catch(e){} } return AC; }
  /* Variation: jeder Klick bekommt eine zufällige Tonhöhe (±5 Halbtöne), Länge und Lautstärke */
  var V = {cents:0, len:1, vol:1};
  /* Gesamtlautstärke (Regler) */
  var MASTER = null;
  function OUT(ac){ if(MASTER && MASTER.ctx===ac) return MASTER.node; var g=ac.createGain(); g.gain.value=FX.vol/100; g.connect(ac['destination']); MASTER={ctx:ac,node:g}; return g; }
  /* ---------- Busse (Game-Audio): Werkzeuge, UI, Atmos, Spiel; Ducking der Atmos, wenn ein Werkzeug schreibt ---------- */
  var BUS = null;
  function bus(ac, name){ if (!BUS || BUS.ctx !== ac){ BUS = {ctx:ac}; var lv = {tools:.9, ui:.55, atmos:.5, game:1.0}; for (var k in lv){ var g = ac.createGain(); g.gain.value = lv[k]; g.connect(OUT(ac)); BUS[k] = g; } BUS.duckT = 0; }
    return BUS[name] || OUT(ac); }
  function duck(ac){ bus(ac, 'atmos'); var now = ac.currentTime; BUS.atmos.gain.cancelScheduledValues(now); BUS.atmos.gain.setTargetAtTime(.25, now, .05); clearTimeout(BUS.duckT); BUS.duckT = setTimeout(function(){ try { BUS.atmos.gain.setTargetAtTime(.5, ac.currentTime, .6); } catch(e){} }, 700); }
  /* ---------- Werkzeug-Sprites (Aufnahmen von Pixabay, dunkel abgemischt): Round-Robin, Pitch und Lautstärke zufällig, 3 Stimmen je Werkzeug, Panning nach x ---------- */
  var SPR = {};   /* tool -> {buf, clips, last, voices:[], lastT} */
  var MOBILE = window.innerWidth <= 700 || /Mobi|Android/i.test(navigator.userAgent);
  function spriteLoad(tool){ if (SPR[tool]) return SPR[tool].p; var ac = ctx(); if (!ac) return null; var base = '../assets/snd/' + tool + (MOBILE ? '-m' : '');
    var ext = (document.createElement('audio').canPlayType('audio/ogg; codecs=vorbis') ? '.ogg' : '.mp3');
    var st = {buf:null, clips:[], last:-1, voices:[], lastT:0};
    st.p = Promise.all([fetch(base + '.json').then(function(r){ return r.json(); }), fetch(base + ext).then(function(r){ return r.arrayBuffer(); }).then(function(ab){ return ac.decodeAudioData(ab); })])
      .then(function(r){ st.clips = r[0].clips; st.buf = r[1]; }).catch(function(){ st.buf = null; });
    SPR[tool] = st; return st.p; }
  function spritePlay(tool, opt){ opt = opt || {}; var ac = ctx(); if (!ac || FX.vol === 0) return; var st = SPR[tool];
    if (!st){ spriteLoad(tool); return; } if (!st.buf || !st.clips.length) return;
    var now = ac.currentTime; if (now - st.lastT < .06 && !opt.force) return; st.lastT = now;
    var i; do { i = Math.floor(Math.random() * st.clips.length); } while (st.clips.length > 1 && i === st.last); st.last = i;
    var c = st.clips[i]; var src = ac.createBufferSource(); src.buffer = st.buf; src.playbackRate.value = Math.pow(2, ((Math.random() * 4 - 2) + (opt.semi || 0)) / 12);
    var g = ac.createGain(); var vol = (opt.vol || 1) * Math.pow(10, (Math.random() * 6 - 3) / 20); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(vol, now + .01);
    var dur = Math.min(c[1], opt.max || c[1]); g.gain.setValueAtTime(vol, now + dur - .03); g.gain.linearRampToValueAtTime(0, now + dur);
    var pan = null; if (ac.createStereoPanner && opt.x !== undefined){ pan = ac.createStereoPanner(); pan.pan.value = Math.max(-.4, Math.min(.4, (opt.x / window.innerWidth - .5) * .8)); }
    src.connect(g); if (pan){ g.connect(pan); pan.connect(bus(ac, opt.bus || 'tools')); } else g.connect(bus(ac, opt.bus || 'tools'));
    src.start(now, c[0], dur); 
    /* Polyphonie: höchstens 3 Stimmen je Werkzeug, die älteste wird ausgeblendet */
    st.voices.push({g:g, src:src, t:now}); while (st.voices.length > 3){ var v = st.voices.shift(); try { v.g.gain.setTargetAtTime(0, now, .03); v.src.stop(now + .12); } catch(e){} }
    st.voices = st.voices.filter(function(v){ return v.t + 2 > now; });
    if ((opt.bus || 'tools') === 'tools') duck(ac); }
  /* Plotter-Loop beim Scrollen: läuft mit Fade, solange gescrollt wird */
  var LOOP = null;
  function plotterLoop(on){ var ac = ctx(); if (!ac || FX.vol === 0) return; var st = SPR.plotter; if (!st){ spriteLoad('plotter'); return; } if (!st.buf) return;
    if (on){ if (!LOOP){ var src = ac.createBufferSource(); src.buffer = st.buf; src.loop = true; var c = st.clips[Math.floor(Math.random() * st.clips.length)]; src.loopStart = c[0]; src.loopEnd = c[0] + c[1]; src.playbackRate.value = .9 + Math.random() * .2;
        var g = ac.createGain(); g.gain.value = 0; src.connect(g); g.connect(bus(ac, 'tools')); src.start(ac.currentTime, c[0]); LOOP = {src:src, g:g}; }
      LOOP.g.gain.setTargetAtTime(.5, ac.currentTime, .08); clearTimeout(LOOP.t); LOOP.t = setTimeout(function(){ plotterLoop(false); }, 260); }
    else if (LOOP){ LOOP.g.gain.setTargetAtTime(0, ac.currentTime, .15); var L = LOOP; LOOP = null; setTimeout(function(){ try { L.src.stop(); } catch(e){} }, 700); } }
  window.JK_SPRITE = spritePlay; window.JK_SPRITE_LOAD = spriteLoad;
  /* Erste Nutzeraktion (Modem-Intro, Klick, Tipp) schaltet Audio frei und lädt die Werkzeug-Sprites nach */
  var unlocked = false; function unlock(){ if (unlocked) return; unlocked = true; var ac = ctx(); if (!ac) return; ['plotter', 'feder', 'zirkel', 'papier'].forEach(function(t){ spriteLoad(t); }); }

  /* Idle (Josef, 27.10.): 20 s ohne Eingabe, dann zieht der Plotter am linken Rand eine Linie nach unten, die Atmo wird lauter; die erste Bewegung beendet es */
  (function(){ if (REDUCED) return; var T = null, cv = null, raf = null, y = 0, x = 0, pts = [];
    function stop(){ clearTimeout(T); T = setTimeout(start, 20000); if (!cv) return; var c = cv; cv = null; cancelAnimationFrame(raf); c.style.opacity = 0; setTimeout(function(){ if (c.parentNode) c.parentNode.removeChild(c); }, 600);
      plotterLoop(false); if (BUS && BUS.atmos) BUS.atmos.gain.setTargetAtTime(.5, BUS.ctx.currentTime, .4); }
    function start(){ if (cv || document.hidden) return; cv = document.createElement('canvas'); cv.className = 'idleline'; document.body.appendChild(cv);
      var d = Math.min(2, window.devicePixelRatio || 1), W = 48, H = window.innerHeight; cv.width = W * d; cv.height = H * d; var c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
      c.strokeStyle = getComputedStyle(document.body).color; c.lineWidth = 1.2; c.lineCap = 'round'; x = 24; y = 0; pts = [[x, y]]; var t0 = performance.now(), last = t0;
      if (BUS && BUS.atmos) BUS.atmos.gain.setTargetAtTime(.9, BUS.ctx.currentTime, 1.5);
      (function step(now){ if (!cv) return; var dt = now - last; last = now; y += dt * .035; x += (Math.random() - .5) * 2.4; x = Math.max(8, Math.min(40, x)); pts.push([x, y]);
        if (y > H){ y = 0; x = 24; pts = [[x, y]]; c.clearRect(0, 0, W, H); }
        c.clearRect(0, 0, W, H); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke();
        c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(x, y, 2, 0, 6.283); c.fill(); if (Math.random() < .08) plotterLoop(true); raf = requestAnimationFrame(step); })(t0); }
    ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach(function(ev){ window.addEventListener(ev, stop, {passive:true}); });
    document.addEventListener('visibilitychange', stop); T = setTimeout(start, 20000); })();
  /* Konstruktionsnetz: beim Hover über große Titel erscheint kurz Dürers Fierung (Quadrat, Diagonalen, Zirkelschläge) über jedem Buchstaben, dazu der Zirkel */
  (function(){ if (REDUCED) return; var NS = 'http://www.w3.org/2000/svg';
    function el(n, a){ var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }
    function net(h, ev){ if (h.querySelector('svg.net')) return; var hr = h.getBoundingClientRect(); if (!hr.width) return;
      var svg = el('svg', {class:'net', viewBox:'0 0 ' + hr.width + ' ' + hr.height, preserveAspectRatio:'none'});
      var ls = h.querySelectorAll('.fat .l'); if (!ls.length) ls = [h];
      var n = 0; Array.prototype.forEach.call(ls, function(l){ if (n++ > 40) return; var r = l.getBoundingClientRect(); if (r.width < 4) return;
        var x = r.left - hr.left, y = r.top - hr.top, w = r.width, hh = r.height, s = Math.max(w, hh * .78), cx = x + w / 2, cy = y + hh / 2;
        var g = el('g', {}); g.appendChild(el('rect', {x:cx - s / 2, y:cy - s / 2, width:s, height:s}));
        g.appendChild(el('line', {x1:cx - s / 2, y1:cy - s / 2, x2:cx + s / 2, y2:cy + s / 2, class:'f'})); g.appendChild(el('line', {x1:cx + s / 2, y1:cy - s / 2, x2:cx - s / 2, y2:cy + s / 2, class:'f'}));
        g.appendChild(el('line', {x1:cx, y1:cy - s / 2, x2:cx, y2:cy + s / 2, class:'f'})); g.appendChild(el('line', {x1:cx - s / 2, y1:cy, x2:cx + s / 2, y2:cy, class:'f'}));
        g.appendChild(el('circle', {cx:cx, cy:cy, r:s / 2})); if (Math.random() < .5) g.appendChild(el('circle', {cx:cx, cy:cy, r:s * .3}));
        for (var i = 1; i < 10; i++){ g.appendChild(el('line', {x1:cx - s / 2 + s * i / 10, y1:cy - s / 2, x2:cx - s / 2 + s * i / 10, y2:cy - s / 2 + s * .04})); }
        svg.appendChild(g); });
      h.appendChild(svg); spritePlay('zirkel', {vol:.55, max:.3, x:ev.clientX, force:true}); setTimeout(function(){ if (svg.parentNode) svg.parentNode.removeChild(svg); }, 1700); }
    function hook(){ document.querySelectorAll('.pagehead h1, .serhead h2, .opener h2, .bigtabs a').forEach(function(h){ if (h._net) return; h._net = 1; h.addEventListener('pointerenter', function(e){ if (e.pointerType !== 'mouse') return; net(h, e); }); }); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook(); })();
  /* geplottete Trenner: eine leicht unregelmäßige Linie, die der Plotter zieht, sobald der Trenner ins Bild kommt */
  (function(){ var divs = document.querySelectorAll('.divider canvas'); if (!divs.length) return;
    function draw(cv, f){ var W = cv.clientWidth, H = cv.clientHeight, d = Math.min(2, window.devicePixelRatio || 1); if (cv.width !== W * d){ cv.width = W * d; cv.height = H * d; }
      var c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H); c.strokeStyle = getComputedStyle(cv).color; c.lineWidth = 1.3; c.lineCap = 'round'; c.globalAlpha = .9;
      var pts = cv._pts; if (!pts){ pts = []; var y = H / 2, n = Math.max(12, Math.round(W / 18)); for (var i = 0; i <= n; i++){ y += (Math.random() - .5) * 2.2; y = Math.max(H * .3, Math.min(H * .7, y)); pts.push([W * i / n, y]); } cv._pts = pts; }
      c.beginPath(); var k = Math.max(1, Math.floor(pts.length * f)); c.moveTo(pts[0][0], pts[0][1]); for (var j = 1; j < k; j++) c.lineTo(pts[j][0], pts[j][1]); c.stroke();
      if (f < 1){ c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(pts[k - 1][0], pts[k - 1][1], 2.2, 0, 6.283); c.fill(); } }
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ var cv = e.target; if (!e.isIntersecting || cv._done) return; cv._done = 1; io.unobserve(cv);
      if (REDUCED){ draw(cv, 1); return; } var t0 = performance.now(), dur = 700 + Math.random() * 500; spritePlay('plotter', {vol:.4, max:.25});
      (function step(now){ var f = Math.min(1, (now - t0) / dur); draw(cv, f); if (f < 1) requestAnimationFrame(step); })(t0); }); }, {rootMargin:'0px 0px -10% 0px'});
    divs.forEach(function(cv){ io.observe(cv); }); })();
  ['pointerdown', 'keydown', 'touchstart'].forEach(function(ev){ window.addEventListener(ev, unlock, {passive:true, once:true}); });
  function vary(){ V.cents = (Math.random()*1000-500); V.len = .75+Math.random()*.6; V.vol = .7+Math.random()*.45; }
  function osc(ac, type, f, t, d, vol, env){ d*=V.len; vol*=V.vol; var o=ac.createOscillator(), g=ac.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); o.detune.value=V.cents;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+(env||.01)); g.gain.exponentialRampToValueAtTime(.0005,t+d); o.connect(g); g.connect(OUT(ac)); o.start(t); o.stop(t+d+.02); return o; }
  function noiseBuf(ac, d){ var n=Math.floor(ac.sampleRate*d), b=ac.createBuffer(1,n,ac.sampleRate), ch=b.getChannelData(0); for(var i=0;i<n;i++){ ch[i]=Math.random()*2-1; } return b; }
  function noise(ac, t, d, vol, type, f, q, decay){ d*=V.len; vol=(vol||.2)*V.vol; if(decay) decay*=V.len; var s=ac.createBufferSource(); s.buffer=noiseBuf(ac,d); var fl=ac.createBiquadFilter(); fl.type=type||'bandpass'; fl.frequency.setValueAtTime(f||1800,t); fl.detune.value=V.cents; fl.Q.value=q||.8;
    var g=ac.createGain(); g.gain.setValueAtTime(vol||.2,t); g.gain.exponentialRampToValueAtTime(.0005,t+(decay||d)); s.connect(fl); fl.connect(g); g.connect(OUT(ac)); s.start(t); s.stop(t+d); return fl; }
  var REV = null;
  function rev(ac){ if(REV && REV.ctx===ac) return REV.node; var d=2.8, n=Math.floor(ac.sampleRate*d), b=ac.createBuffer(2,n,ac.sampleRate);
    for(var c=0;c<2;c++){ var ch=b.getChannelData(c); for(var i=0;i<n;i++){ ch[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6); } }
    var cv=ac.createConvolver(); cv.buffer=b; var g=ac.createGain(); g.gain.value=.9; cv.connect(g); g.connect(OUT(ac)); REV={ctx:ac,node:cv}; return cv; }
  var SND = {
    whistle: function(ac,t){ var o=osc(ac,'sine',1500,t,.36,.18,.03); o.frequency.exponentialRampToValueAtTime(2600,t+.12); o.frequency.exponentialRampToValueAtTime(1900,t+.3);
      var v=ac.createOscillator(), vg=ac.createGain(); v.frequency.value=22; vg.gain.value=60; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t+.35); },
    squeak: function(ac,t){ var o=osc(ac,'triangle',2800,t,.2,.16); o.frequency.linearRampToValueAtTime(3600,t+.05); o.frequency.linearRampToValueAtTime(2400,t+.11); o.frequency.linearRampToValueAtTime(3300,t+.17); },
    shotgun: function(ac,t){ noise(ac,t,.55,.5,'lowpass',6000,.7,.5); var o=osc(ac,'sine',110,t,.36,.5); o.frequency.exponentialRampToValueAtTime(35,t+.3); },
    blip: function(ac,t){ osc(ac,'square',1200,t,.08,.08); },
    plotter: function(ac,t){ var f=160+Math.random()*120; var o=osc(ac,'square',f,t,.22,.07,.01); o.frequency.linearRampToValueAtTime(f*1.6,t+.2); noise(ac,t,.2,.05,'highpass',3000,.5,.2); },
    pen: function(ac,t){ noise(ac,t,.06,.25,'highpass',2500,1,.06); },
    pencil: function(ac,t){ noise(ac,t,.18+Math.random()*.12,.22,'bandpass',900+Math.random()*600,.6,.2); },
    chalk: function(ac,t){ noise(ac,t,.25,.18,'bandpass',2400,.4,.25); osc(ac,'sine',3200+Math.random()*800,t,.12,.04); },
    pop: function(ac,t){ var o=osc(ac,'sine',600,t,.08,.3); o.frequency.exponentialRampToValueAtTime(240,t+.07); },
    bubble: function(ac,t){ noise(ac,t,.05,.35,'lowpass',2500,.5,.05); var o=osc(ac,'sine',420,t+.02,.16,.28); o.frequency.exponentialRampToValueAtTime(90,t+.16); },
    quack: function(ac,t){ var n=Math.random()<.5?1:2; for(var k=0;k<n;k++){ var tt=t+k*.19; var o=ac.createOscillator(), f=ac.createBiquadFilter(), g=ac.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(300,tt); o.frequency.linearRampToValueAtTime(240,tt+.15);
      f.type='bandpass'; f.frequency.setValueAtTime(1500,tt); f.frequency.linearRampToValueAtTime(900,tt+.15); f.Q.value=3; g.gain.setValueAtTime(0,tt); g.gain.linearRampToValueAtTime(.35,tt+.02); g.gain.setValueAtTime(.3,tt+.1); g.gain.linearRampToValueAtTime(0,tt+.16); o.connect(f); f.connect(g); g.connect(OUT(ac)); o.start(tt); o.stop(tt+.17); } },
    typewriter: function(ac,t){ noise(ac,t,.04,.4,'highpass',1800,1,.04); osc(ac,'square',2400,t,.03,.05); noise(ac,t+.05,.05,.15,'bandpass',600,1,.05); },
    growl: function(ac,t){ var o=osc(ac,'sawtooth',70,t,.5,.25,.05); o.frequency.linearRampToValueAtTime(42,t+.45); noise(ac,t,.5,.12,'lowpass',500,.8,.5); },
    foghorn: function(ac,t){ osc(ac,'sawtooth',98,t,.7,.18,.08); osc(ac,'sine',49,t,.7,.2,.08); },
    ping: function(ac,t){ osc(ac,'sine',880,t,.18,.12); osc(ac,'sine',1320,t+.12,.25,.1); },
    click: function(ac,t){ noise(ac,t,.03,.35,'highpass',4000,1,.03); osc(ac,'square',3000+Math.random()*1500,t,.02,.06); },
    crackle: function(ac,t){ var n=3+Math.floor(Math.random()*5); for(var k=0;k<n;k++){ noise(ac,t+k*(.03+Math.random()*.05),.02,.25,'bandpass',2000+Math.random()*3000,2,.02); } },
    boing: function(ac,t){ var o=osc(ac,'triangle',380,t,.5,.22,.01); o.frequency.exponentialRampToValueAtTime(120,t+.08); o.frequency.exponentialRampToValueAtTime(260,t+.2); o.frequency.exponentialRampToValueAtTime(150,t+.45); },
    zip: function(ac,t){ var o=osc(ac,'sawtooth',300,t,.25,.12,.01); o.frequency.exponentialRampToValueAtTime(2400,t+.22); noise(ac,t,.25,.08,'highpass',2000,.5,.25); },
    ratchet: function(ac,t){ var n=4+Math.floor(Math.random()*4); for(var k=0;k<n;k++){ osc(ac,'square',900+k*60,t+k*.035,.02,.12); } },
    bell: function(ac,t){ var f=700+Math.random()*500; osc(ac,'sine',f,t,.9,.14,.005); osc(ac,'sine',f*2.76,t,.5,.05,.005); osc(ac,'sine',f*5.4,t,.3,.03,.005); },
    thud: function(ac,t){ var o=osc(ac,'sine',140,t,.25,.5,.005); o.frequency.exponentialRampToValueAtTime(45,t+.2); noise(ac,t,.08,.2,'lowpass',400,.7,.08); },
    ticks: function(ac,t){ var n=2+Math.floor(Math.random()*4); for(var k=0;k<n;k++){ noise(ac,t+k*(.09+Math.random()*.06),.015,.4,'highpass',5000,1,.015); } },
    wobble: function(ac,t){ var o=osc(ac,'sine',440,t,.6,.14,.02); var v=ac.createOscillator(), vg=ac.createGain(); v.frequency.value=6+Math.random()*6; vg.gain.value=80; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t+.6); },
    /* --- eigene Klangcharaktere je Abschnitt (Geräuschemacher-Art, Aardman) --- */
    servo: function(ac,t){ var o=osc(ac,'sawtooth',180,t,.35,.09,.02); o.frequency.linearRampToValueAtTime(420,t+.15); o.frequency.linearRampToValueAtTime(260,t+.33); var v=ac.createOscillator(), vg=ac.createGain(); v.frequency.value=38; vg.gain.value=25; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t+.35); noise(ac,t,.35,.05,'bandpass',3200,1,.35); },
    stepper: function(ac,t){ var n=5+Math.floor(Math.random()*6); for(var k=0;k<n;k++){ osc(ac,'square',1400+Math.random()*300,t+k*.028,.012,.07); } },
    pendown: function(ac,t){ noise(ac,t,.02,.3,'highpass',3500,1,.02); osc(ac,'sine',900,t,.05,.1); },
    snip: function(ac,t){ noise(ac,t,.03,.4,'highpass',5000,1,.03); osc(ac,'square',4200,t,.015,.08); noise(ac,t+.07,.04,.35,'highpass',4500,1,.04); osc(ac,'square',3600,t+.07,.015,.08); noise(ac,t+.11,.12,.1,'bandpass',2500,.6,.12); },
    lick: function(ac,t){ var o=osc(ac,'sine',320,t,.14,.3,.02); o.frequency.exponentialRampToValueAtTime(140,t+.12); noise(ac,t,.1,.12,'lowpass',1200,.8,.1); osc(ac,'sine',520,t+.1,.06,.12); },
    gunclick: function(ac,t){ noise(ac,t,.025,.45,'highpass',2500,1,.025); osc(ac,'square',1800,t,.02,.12); noise(ac,t+.09,.03,.4,'bandpass',1600,2,.03); osc(ac,'square',1300,t+.09,.025,.1); },
    boom: function(ac,t){ noise(ac,t,.7,.55,'lowpass',3000,.5,.6); var o=osc(ac,'sine',90,t,.6,.6,.005); o.frequency.exponentialRampToValueAtTime(28,t+.5); },
    ricochet: function(ac,t){ var o=osc(ac,'sine',2600,t,.5,.14,.005); o.frequency.exponentialRampToValueAtTime(400,t+.45); var v=ac.createOscillator(), vg=ac.createGain(); v.frequency.value=14; vg.gain.value=120; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t+.5); },
    casing: function(ac,t){ var f=3200+Math.random()*1200; osc(ac,'sine',f,t,.25,.09,.003); osc(ac,'sine',f*1.5,t+.08,.2,.06,.003); osc(ac,'sine',f*.9,t+.17,.18,.05,.003); },
    aha: function(ac,t){ osc(ac,'sine',660,t,.14,.12); osc(ac,'sine',990,t+.1,.22,.12); osc(ac,'sine',1320,t+.2,.35,.1); },
    glassclink: function(ac,t){ var f=2200+Math.random()*900; osc(ac,'sine',f,t,.4,.12,.003); osc(ac,'sine',f*2.1,t,.2,.04,.003); },
    pageturn: function(ac,t){ var n=noise(ac,t,.3,.2,'bandpass',1400,.5,.3); n.frequency.linearRampToValueAtTime(3200,t+.25); },
    chew: function(ac,t){ var n=2+Math.floor(Math.random()*3); for(var k=0;k<n;k++){ var tt=t+k*.17; var o=osc(ac,'sine',260,tt,.12,.22,.02); o.frequency.exponentialRampToValueAtTime(120,tt+.1); noise(ac,tt,.08,.1,'lowpass',900,.8,.08); } },
    spurs: function(ac,t){ var n=3+Math.floor(Math.random()*3); for(var k=0;k<n;k++){ var f=4200+Math.random()*2200; osc(ac,'sine',f,t+k*.055,.09,.06,.003); osc(ac,'sine',f*1.33,t+k*.055,.07,.04,.003); } },
    harmonica: function(ac,t){ var f=330+[0,2,4,5,7][Math.floor(Math.random()*5)]*20; var o=osc(ac,'sawtooth',f,t,.45,.07,.04); osc(ac,'sawtooth',f*1.01,t,.45,.07,.04); osc(ac,'square',f*2,t,.45,.02,.04); var v=ac.createOscillator(), vg=ac.createGain(); v.frequency.value=5.5; vg.gain.value=6; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t+.45); },
    pew: function(ac,t){ var o=osc(ac,'square',1800,t,.18,.1,.005); o.frequency.exponentialRampToValueAtTime(220,t+.16); },
    reload: function(ac,t){ noise(ac,t,.04,.35,'bandpass',1200,2,.04); osc(ac,'square',700,t,.03,.1); noise(ac,t+.14,.05,.4,'bandpass',900,2,.05); osc(ac,'square',500,t+.14,.04,.12); },
    pickup: function(ac,t){ osc(ac,'square',880,t,.07,.06); osc(ac,'square',1108,t+.07,.07,.06); osc(ac,'square',1318,t+.14,.07,.06); osc(ac,'square',1760,t+.21,.18,.06); },
    footstep: function(ac,t){ var o=osc(ac,'sine',110,t,.14,.3,.005); o.frequency.exponentialRampToValueAtTime(60,t+.12); noise(ac,t,.06,.15,'lowpass',700,.8,.06); },
    eraser: function(ac,t){ var n=2+Math.floor(Math.random()*3); for(var k=0;k<n;k++){ noise(ac,t+k*.16,.14,.2,'bandpass',700+Math.random()*300,.6,.14); } },
    tear: function(ac,t){ var n=noise(ac,t,.35,.3,'bandpass',900,1,.35); n.frequency.exponentialRampToValueAtTime(2600,t+.3); },
    sharpener: function(ac,t){ for(var k=0;k<6;k++){ var tt=t+k*.07; noise(ac,tt,.05,.2,'bandpass',1800,1.5,.05); osc(ac,'square',240+k*8,tt,.05,.04); } },
    howl: function(ac,t){ var o=osc(ac,'sine',330,t,1.2,.16,.15); o.frequency.exponentialRampToValueAtTime(620,t+.45); o.frequency.exponentialRampToValueAtTime(380,t+1.1); var v=ac.createOscillator(), vg=ac.createGain(); v.frequency.value=5; vg.gain.value=12; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t+1.2); },
    bonecrack: function(ac,t){ var n=3+Math.floor(Math.random()*4); for(var k=0;k<n;k++){ noise(ac,t+k*(.04+Math.random()*.04),.02,.4,'bandpass',900+Math.random()*1500,3,.02); } osc(ac,'sine',80,t,.2,.2,.005); },
    wind: function(ac,t){ var n=noise(ac,t,1.4,.12,'bandpass',500,.5,1.4); n.frequency.linearRampToValueAtTime(1400,t+.7); n.frequency.linearRampToValueAtTime(400,t+1.3); },
    drum: function(ac,t){ var o=osc(ac,'sine',150,t,.35,.5,.005); o.frequency.exponentialRampToValueAtTime(50,t+.3); noise(ac,t,.05,.3,'lowpass',1500,.7,.05); },
    gull: function(ac,t){ var n=1+Math.floor(Math.random()*3); for(var k=0;k<n;k++){ var tt=t+k*.22; var o=osc(ac,'sawtooth',1100,tt,.2,.08,.02); o.frequency.exponentialRampToValueAtTime(1700,tt+.06); o.frequency.exponentialRampToValueAtTime(900,tt+.18); } },
    harbourbell: function(ac,t){ osc(ac,'sine',392,t,1.4,.16,.005); osc(ac,'sine',392*2.4,t,.8,.06,.005); osc(ac,'sine',392*3.9,t,.4,.03,.005); },
    splash: function(ac,t){ noise(ac,t,.25,.35,'bandpass',1800,.6,.25); for(var k=0;k<3;k++){ var o=osc(ac,'sine',500+Math.random()*400,t+.08+k*.07,.1,.12); o.frequency.exponentialRampToValueAtTime(150,t+.18+k*.07); } },
    brush: function(ac,t){ var n=noise(ac,t,.22,.18,'bandpass',2200,.4,.22); n.frequency.linearRampToValueAtTime(900,t+.2); },
    scribble: function(ac,t){ var n=5+Math.floor(Math.random()*5); for(var k=0;k<n;k++){ noise(ac,t+k*.035,.03,.22,'bandpass',1200+Math.random()*1200,.8,.03); } },
    rustle: function(ac,t){ var n=3+Math.floor(Math.random()*4); for(var k=0;k<n;k++){ noise(ac,t+k*.06,.05,.18,'highpass',2500+Math.random()*2000,.7,.05); } },
    birdie: function(ac,t){ var n=2+Math.floor(Math.random()*3); for(var k=0;k<n;k++){ var tt=t+k*.13; var o=osc(ac,'sine',2600,tt,.09,.08,.01); o.frequency.exponentialRampToValueAtTime(3600,tt+.04); o.frequency.exponentialRampToValueAtTime(2800,tt+.08); } },
    twig: function(ac,t){ noise(ac,t,.03,.45,'bandpass',2400,2,.03); osc(ac,'square',600,t,.02,.08); },
    shh: function(ac,t){ var n=noise(ac,t,.5,.14,'bandpass',4500,.8,.5); n.frequency.linearRampToValueAtTime(6500,t+.2); },
    echo: function(ac,t){ for(var k=0;k<3;k++){ var o=osc(ac,'sine',120,t+k*.22,.12,.3/(k+1),.005); o.frequency.exponentialRampToValueAtTime(60,t+k*.22+.1); } },
    applause: function(ac,t){ var n=8+Math.floor(Math.random()*8); for(var k=0;k<n;k++){ noise(ac,t+Math.random()*.6,.02,.15,'bandpass',1500+Math.random()*2000,1,.02); } },
    shiphorn: function(ac,t){ osc(ac,'sawtooth',73,t,1.1,.14,.12); osc(ac,'sawtooth',110,t,1.1,.1,.12); osc(ac,'sine',55,t,1.1,.16,.12); },
    creak: function(ac,t){ var o=osc(ac,'sawtooth',140,t,.8,.06,.05); o.frequency.linearRampToValueAtTime(90,t+.75); var v=ac.createOscillator(), vg=ac.createGain(); v.frequency.value=18; vg.gain.value=30; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t+.8); noise(ac,t,.8,.06,'bandpass',800,2,.8); },
    owl: function(ac,t){ osc(ac,'sine',330,t,.28,.16,.05); osc(ac,'sine',290,t+.34,.42,.16,.05); },
    keys: function(ac,t){ var n=3+Math.floor(Math.random()*5); for(var k=0;k<n;k++){ var tt=t+k*(.06+Math.random()*.05); noise(ac,tt,.02,.3,'highpass',3000,1,.02); osc(ac,'square',1800+Math.random()*800,tt,.015,.05); } },
    notify: function(ac,t){ osc(ac,'sine',1047,t,.12,.12); osc(ac,'sine',1319,t+.1,.3,.12); },
    blips: function(ac,t){ var n=3+Math.floor(Math.random()*4); for(var k=0;k<n;k++){ osc(ac,'square',[1200,1600,2100,2400][Math.floor(Math.random()*4)],t+k*.07,.05,.06); } },
    schoolbell: function(ac,t){ for(var k=0;k<6;k++){ var tt=t+k*.08; osc(ac,'square',2200,tt,.06,.07,.003); osc(ac,'sine',3300,tt,.06,.05,.003); } },
    scrape: function(ac,t){ var o=osc(ac,'sawtooth',900,t,.5,.06,.05); o.frequency.linearRampToValueAtTime(1400,t+.45); noise(ac,t,.5,.1,'bandpass',2600,2,.5); },
    slam: function(ac,t){ noise(ac,t,.12,.5,'lowpass',1200,.7,.12); var o=osc(ac,'sine',95,t,.3,.5,.005); o.frequency.exponentialRampToValueAtTime(40,t+.25); },
    flap: function(ac,t){ var n=3+Math.floor(Math.random()*3); for(var k=0;k<n;k++){ noise(ac,t+k*.11,.07,.3,'lowpass',1800,.7,.07); } },
    bikebell: function(ac,t){ for(var k=0;k<2;k++){ var tt=t+k*.14; osc(ac,'sine',2900,tt,.3,.12,.003); osc(ac,'sine',4300,tt,.2,.06,.003); } },
    tja: function(ac,t){
      /* "Tja": Formantsynthese einer resignierten Männerstimme. t (Verschluss, Aspiration), j (F1 280, F2 2250), Gleiten zum a (F1 750, F2 1250), Tonhöhe fällt */
      var k=.85+Math.random()*.3, L=.9+Math.random()*.5, f0=128*k;
      var mix=ac.createGain(); mix.gain.value=1.1; mix.connect(OUT(ac)); try{ mix.connect(rev(ac)); }catch(e){}
      var src=ac.createOscillator(); src.type='sawtooth';
      var tb=t+.03, tj=tb+.075, ta=tj+.07*L, ts=ta+.08*L, te=ts+.42*L;   /* tb: Verschlusslösung des t, danach 75 ms Behauchung (deutsches t), dann Stimme */
      src.frequency.setValueAtTime(f0*1.12,tj); src.frequency.linearRampToValueAtTime(f0*1.05,ta); src.frequency.linearRampToValueAtTime(f0*.95,ts); src.frequency.exponentialRampToValueAtTime(f0*.66,te);
      var soft=ac.createBiquadFilter(); soft.type='lowpass'; soft.frequency.value=3800; src.connect(soft);
      var vg=ac.createGain(); vg.gain.setValueAtTime(.0001,tj); vg.gain.exponentialRampToValueAtTime(.55,tj+.03); vg.gain.setValueAtTime(.6,ts); vg.gain.exponentialRampToValueAtTime(.0001,te+.05); soft.connect(vg);
      /* Formanten: j -> a */
      var F=[[280,750,90,1],[2250,1250,110,.55],[2950,2600,160,.3],[3500,3400,250,.12]];
      F.forEach(function(f){ var bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.setValueAtTime(f[0],tj); bp.frequency.setValueAtTime(f[0],ta-.01); bp.frequency.linearRampToValueAtTime(f[1],ts); bp.Q.value=f[1]/f[2];
        var g=ac.createGain(); g.gain.value=f[3]*2.2; vg.connect(bp); bp.connect(g); g.connect(mix); });
      /* t: knackige Verschlusslösung (breitbandig, 4 ms) */
      var nb=ac.createBufferSource(); nb.buffer=noiseBuf(ac,.02); var hp=ac.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=2200;
      var ng=ac.createGain(); ng.gain.setValueAtTime(.0001,tb); ng.gain.exponentialRampToValueAtTime(.45,tb+.002); ng.gain.exponentialRampToValueAtTime(.0001,tb+.018);
      nb.connect(hp); hp.connect(ng); ng.connect(mix); nb.start(tb); nb.stop(tb+.02);
      /* Behauchung mit Zischen wie "tch" (palatal vor dem j), hört man deutlich als t */
      var na=ac.createBufferSource(); na.buffer=noiseBuf(ac,.12); var af=ac.createBiquadFilter(); af.type='bandpass'; af.frequency.setValueAtTime(4200,tb); af.frequency.linearRampToValueAtTime(3200,tj); af.Q.value=1.4;
      var ag=ac.createGain(); ag.gain.setValueAtTime(.0001,tb); ag.gain.exponentialRampToValueAtTime(.32,tb+.012); ag.gain.setValueAtTime(.28,tj-.02); ag.gain.exponentialRampToValueAtTime(.0001,tj+.035);
      na.connect(af); af.connect(ag); ag.connect(mix); na.start(tb); na.stop(tb+.12);
      /* Hauch im Vokal (etwas Luft, klingt müder) */
      var br=ac.createBufferSource(); br.buffer=noiseBuf(ac,1); var bf=ac.createBiquadFilter(); bf.type='bandpass'; bf.frequency.setValueAtTime(2000,tj); bf.frequency.linearRampToValueAtTime(1200,ts); bf.Q.value=1.5;
      var bg=ac.createGain(); bg.gain.setValueAtTime(.0001,tj); bg.gain.exponentialRampToValueAtTime(.05,ta); bg.gain.exponentialRampToValueAtTime(.0001,te+.08); br.connect(bf); bf.connect(bg); bg.connect(mix); br.start(tj); br.stop(te+.1);
      src.start(tj); src.stop(te+.1);
    },
    hm: function(ac,t){
      /* "Hm": geschlossener Mund, Nasalklang mit fallender Tonhöhe */
      var f0=(110+Math.random()*30), d=.45+Math.random()*.35; var o=ac.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(f0*1.08,t); o.frequency.exponentialRampToValueAtTime(f0*.8,t+d);
      var g=ac.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.5,t+.06); g.gain.exponentialRampToValueAtTime(.0001,t+d); o.connect(g);
      [[250,60,1],[1100,200,.12],[2400,250,.06]].forEach(function(f){ var bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=f[0]; bp.Q.value=f[0]/f[1]; var gg=ac.createGain(); gg.gain.value=f[2]*2.5; g.connect(bp); bp.connect(gg); gg.connect(OUT(ac)); });
      o.start(t); o.stop(t+d+.05); },
    sigh: function(ac,t){
      /* Seufzer: Ausatmen durch den offenen Mund, Formant sinkt */
      var d=.7+Math.random()*.4; var n=ac.createBufferSource(); n.buffer=noiseBuf(ac,d+.1); var f=ac.createBiquadFilter(); f.type='bandpass'; f.frequency.setValueAtTime(1400,t); f.frequency.exponentialRampToValueAtTime(600,t+d); f.Q.value=1.2;
      var g=ac.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.3,t+.12); g.gain.exponentialRampToValueAtTime(.0001,t+d); n.connect(f); f.connect(g); g.connect(OUT(ac)); n.start(t); n.stop(t+d+.1); },
    waves: function(ac,t){
      /* Brandung: Rauschen schwillt an und zieht sich zurück */
      var d=1.6+Math.random()*.8; var n=ac.createBufferSource(); n.buffer=noiseBuf(ac,d); var f=ac.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(400,t); f.frequency.linearRampToValueAtTime(2600,t+d*.45); f.frequency.linearRampToValueAtTime(500,t+d);
      var g=ac.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.28,t+d*.45); g.gain.exponentialRampToValueAtTime(.0001,t+d); n.connect(f); f.connect(g); g.connect(OUT(ac)); n.start(t); n.stop(t+d); },
    oars: function(ac,t){
      /* Ruder: Holz klopft an die Dolle, dann Wasser */
      for(var k=0;k<2;k++){ var tt=t+k*.55; var o=osc(ac,'triangle',420,tt,.08,.25,.003); o.frequency.exponentialRampToValueAtTime(260,tt+.06);
        noise(ac,tt+.06,.35,.14,'bandpass',900,.7,.35); }
    },
    chains: function(ac,t){
      /* Ketten: viele kleine Metallglieder, unregelmäßig */
      var n=8+Math.floor(Math.random()*8); for(var k=0;k<n;k++){ var tt=t+Math.random()*.45; var f=2200+Math.random()*3000; osc(ac,'sine',f,tt,.09,.05,.002); osc(ac,'sine',f*1.47,tt,.06,.03,.002); noise(ac,tt,.015,.12,'highpass',4000,1,.015); }
    },
    pfahl: function(ac,t){
      /* Felix Pfahl: alles im Mittenbereich, damit es auch aus Handy-Lautsprechern unheimlich klingt
         (Handys geben unter ca. 250 Hz fast nichts wieder). Dissonanter Cluster, Theremin-Klage,
         fallendes Glissando, Flüstern, Rückwärts-Schwell, verzerrter Herzschlag, langer Hall. */
      var wet = rev(ac);
      function out(node, t0, d, vol, att, dry){ var g=ac.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol,t0+(att||.05)); g.gain.exponentialRampToValueAtTime(.0001,t0+d);
        node.connect(g); g.connect(wet); if(dry!==false) g.connect(OUT(ac)); return g; }
      var root = [207.65,220,233.08][Math.floor(Math.random()*3)];
      /* 1 Cluster: Grundton, kleine Sekunde, Tritonus, große Septime, jede Stimme verstimmt doppelt (Schwebung) */
      var lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=4; lp.frequency.setValueAtTime(500,t); lp.frequency.linearRampToValueAtTime(2400,t+1.8); lp.frequency.linearRampToValueAtTime(700,t+3.4);
      [1, 1.0595, 1.4142, 1.8877].forEach(function(r,i){ [-7,7].forEach(function(dc){ var o=ac.createOscillator(); o.type= i%2 ? 'sawtooth' : 'triangle'; o.frequency.value=root*r; o.detune.value=dc+(Math.random()*6-3); o.connect(lp); o.start(t); o.stop(t+3.8); }); });
      out(lp, t, 3.7, .07, 1.1);
      /* 2 Theremin: Sinus mit Vibrato, gleitet klagend nach unten */
      var th=ac.createOscillator(); th.type='sine'; var thf=root*3*(1+Math.random()*.06); th.frequency.setValueAtTime(thf,t+.4); th.frequency.exponentialRampToValueAtTime(thf*1.12,t+1.2); th.frequency.exponentialRampToValueAtTime(thf*.71,t+3.2);
      var vb=ac.createOscillator(), vg=ac.createGain(); vb.frequency.value=5.2; vg.gain.value=thf*.018; vb.connect(vg); vg.connect(th.frequency);
      out(th, t+.4, 3.1, .06, .9); th.start(t+.4); vb.start(t+.4); th.stop(t+3.6); vb.stop(t+3.6);
      /* 3 fallendes Glissando im Hintergrund (nur Hall) */
      var gl=ac.createOscillator(); gl.type='sawtooth'; gl.frequency.setValueAtTime(root*4,t+.2); gl.frequency.exponentialRampToValueAtTime(root*1.5,t+3.3);
      var glf=ac.createBiquadFilter(); glf.type='bandpass'; glf.frequency.value=900; glf.Q.value=2; gl.connect(glf); out(glf, t+.2, 3.2, .05, .8, false); gl.start(t+.2); gl.stop(t+3.5);
      /* 4 Flüstern in Sprachrhythmus, jedes Mal andere Silben */
      var n=6+Math.floor(Math.random()*6), tt=t+.25+Math.random()*.5;
      for(var k=0;k<n;k++){ var w=ac.createBufferSource(); w.buffer=noiseBuf(ac,.2); var wf=ac.createBiquadFilter(); wf.type='bandpass'; wf.frequency.value=[1200,2200,3400,5200][Math.floor(Math.random()*4)]; wf.Q.value=4+Math.random()*4;
        w.connect(wf); out(wf, tt, .09+Math.random()*.12, .14, .015); w.start(tt); w.stop(tt+.25); tt+=.07+Math.random()*.2; }
      /* 5 Herzschlag mit Obertönen, damit man ihn auch am Handy hört */
      [0.55,0.86].forEach(function(dt){ var h=ac.createOscillator(); h.type='triangle'; h.frequency.setValueAtTime(150,t+dt); h.frequency.exponentialRampToValueAtTime(70,t+dt+.16);
        var hf=ac.createBiquadFilter(); hf.type='lowpass'; hf.frequency.value=600; h.connect(hf); out(hf, t+dt, .24, .22, .008); h.start(t+dt); h.stop(t+dt+.26);
        var hn=ac.createBufferSource(); hn.buffer=noiseBuf(ac,.06); var hnf=ac.createBiquadFilter(); hnf.type='bandpass'; hnf.frequency.value=300; hnf.Q.value=2; hn.connect(hnf); out(hnf, t+dt, .06, .2, .004); hn.start(t+dt); hn.stop(t+dt+.07); });
      /* 6 Rückwärts-Schwell, bricht abrupt ab */
      if(Math.random()<.7){ var st=t+1.7; var sw=ac.createBufferSource(); sw.buffer=noiseBuf(ac,1.4); var sf=ac.createBiquadFilter(); sf.type='bandpass'; sf.frequency.setValueAtTime(600,st); sf.frequency.exponentialRampToValueAtTime(3500,st+1.3); sf.Q.value=1.5;
        var sg=ac.createGain(); sg.gain.setValueAtTime(.0005,st); sg.gain.exponentialRampToValueAtTime(.16,st+1.32); sg.gain.setValueAtTime(0,st+1.34); sw.connect(sf); sf.connect(sg); sg.connect(wet); sg.connect(OUT(ac)); sw.start(st); sw.stop(st+1.4); }
    }
  };
  var DEFAULT = ['whistle','squeak','shotgun','boing','zip','click','bell','ticks'];
  var lastName = '';
  var play = function(name){ var ac=ctx(); if(!ac||!SND[name]) return; if(name!=='pfahl') vary(); else { V.cents=0; V.len=1; V.vol=1; } SND[name](ac, ac.currentTime+.005); };
  function clickSound(target){
    var el = target && target.closest ? target.closest('[data-sounds]') : null;
    var list = el ? el.getAttribute('data-sounds').split(',') : DEFAULT;
    var name = list[Math.floor(Math.random()*list.length)];
    if (list.length > 1 && name === lastName) name = list[(list.indexOf(name)+1) % list.length];   /* nie zweimal hintereinander derselbe */
    lastName = name; play(name);
  }
  /* Ton je Klick nach FX.ton (Standard alle 2 bis 5 Klicks, nie zweimal direkt hintereinander). Keine aufploppenden Schriften (Josef, 27.10., 15:20). */
  var untilSound = nextGap();
  document.addEventListener('pointerdown', function(e){ if(e.button!==0) return; if(e.target.closest && e.target.closest('.modem, iframe, .pfahl, .lb, .fxpanel, .fxknob, .nlform, sup.fn, .fnpop')) return;
    if (--untilSound <= 0){ untilSound = nextGap(); clickSound(e.target); } }, true);
  /* Schnelles Mehrfachklicken (wegen der Klänge) markiert keinen Text außerhalb von Fließtext */
  document.addEventListener('mousedown', function(e){ if(e.detail>1 && !(e.target.closest && e.target.closest('p, li, pre, blockquote, input, textarea, .sertext, .notes'))) e.preventDefault(); });
  /* Handy: Audio beim ersten Antippen freischalten (iOS) */
  ['touchend','click'].forEach(function(ev){ document.addEventListener(ev, function(){ ctx(); }, {passive:true}); });
  /* Spotify erst auf Klick laden (Datenschutz) */
  document.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('.spot button'); if(!b) return; var box = b.parentNode; var f = document.createElement('iframe'); f.src = box.getAttribute('data-src'); f.title = box.getAttribute('data-title')||'Spotify'; f.setAttribute('allow','autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'); f.setAttribute('loading','lazy'); box.innerHTML=''; box.appendChild(f); });

  /* sanftes Ein- und Ausblenden der Großansicht */
  function lbOpen(el){ el.classList.add('on'); document.body.style.overflow='hidden'; requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.classList.add('show'); }); }); }
  function lbClose(el, done){ el.classList.remove('show'); setTimeout(function(){ el.classList.remove('on'); document.body.style.overflow=''; if(done) done(); }, 300); }
  /* Großansicht: siehe unten (lb2, zweites Interview) */

  /* ---------- Felix Pfahl: Gesicht aus dem Holzschnitt, unheimlicher Ton ---------- */
  var pf = document.querySelectorAll('.pfahl');
  if (pf.length){
    var face = document.createElement('img'); face.id='pfahlface'; face.src='../assets/pfahl-face.png'; face.alt=''; document.body.appendChild(face);
    var water = document.createElement('img'); water.id='pfahlwater'; water.src='../assets/pfahl-face.png'; water.alt=''; document.body.appendChild(water);   /* riesiges Wasserzeichen hinter dem Text (Josef, 27.10.) */
    var pfTimer = null;
    function moveFace(e){ face.style.left=e.clientX+'px'; face.style.top=e.clientY+'px'; }
    var pfHide = null;
    var touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
    var pfGone = null;
    function faceOff(){ /* sehr langsam ausfaden (6 s), der Ton klingt mit Hall aus */
      clearInterval(pfTimer); pfTimer=null; clearTimeout(pfHide);
      if(!face.classList.contains('on') || face.classList.contains('fade')) return;
      face.classList.add('fade'); water.classList.remove('on'); clearTimeout(pfGone); pfGone=setTimeout(function(){ face.classList.remove('on','fade'); }, touch ? 9500 : 6500); }
    window.JK_PFAHL = {on:function(e){ faceOn(e); }, off:function(){ faceOff(); }, move:function(e){ moveFace(e); }};
    function faceOn(e){ moveFace(e); clearTimeout(pfGone); face.classList.remove('fade'); face.classList.add('on'); water.classList.add('on'); play('pfahl'); clearInterval(pfTimer); pfTimer=setInterval(function(){ play('pfahl'); }, 3300); }
    pf.forEach(function(s){
      /* Maus: Überfahren zeigt das Gesicht; Finger oder Stift: Antippen zeigt es 8 s lang */
      s.addEventListener('pointerenter', function(e){ if(e.pointerType==='mouse'){ faceOn(e); } });
      s.addEventListener('pointermove', function(e){ if(e.pointerType==='mouse') moveFace(e); });
      s.addEventListener('pointerleave', function(e){ if(e.pointerType==='mouse') faceOff(); });
      s.addEventListener('click', function(e){ if(e.pointerType==='mouse' || (!e.pointerType && face.classList.contains('on'))) return; faceOn({clientX:e.clientX, clientY:e.clientY}); clearTimeout(pfHide); pfHide=setTimeout(faceOff, 8000); });
    });
    document.addEventListener('touchstart', function(e){ if(face.classList.contains('on') && !(e.target.closest && e.target.closest('.pfahl'))) faceOff(); }, {passive:true});
    document.addEventListener('scroll', function(){ if(touch && face.classList.contains('on')) faceOff(); }, {passive:true});
  }

  /* 56k-Modem: Wählton, DTMF, Klingeln, V.90-Handshake, Rauschen. Etwa 9 Sekunden. */
  function dialup(onDone){
    var ac = ctx(); if(!ac){ onDone(); return; }
    var t0 = ac.currentTime, out = ac.createGain(); out.gain.value = .5; out.connect(OUT(ac));
    function tone(f, t, d, vol, type){ var o=ac.createOscillator(), g=ac.createGain(); o.type=type||'sine'; o.frequency.value=f; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol||.3,t+.01); g.gain.setValueAtTime(vol||.3,t+d-.01); g.gain.linearRampToValueAtTime(0,t+d); o.connect(g); g.connect(out); o.start(t); o.stop(t+d+.02); }
    function nz(t, d, vol, lp){ var s=ac.createBufferSource(); s.buffer=noiseBuf(ac,d); var f=ac.createBiquadFilter(); f.type='bandpass'; f.frequency.value=lp||1800; f.Q.value=.7; var g=ac.createGain(); g.gain.setValueAtTime(vol||.2,t); s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t+d); }
    var t = t0 + .1;   /* dunkler und kürzer (Josef, 27.10.): alles eine Oktave tiefer, ca. 5 s */
    tone(175, t, .7, .2); tone(220, t, .7, .18); t += .8;
    var dtmf = [[348,604],[385,668],[426,738],[348,668],[470,668]];
    dtmf.forEach(function(p){ tone(p[0], t, .1, .22); tone(p[1], t, .1, .2); t += .14; });
    t += .2; tone(212, t, .6, .16); t += .8;
    tone(1050, t, .6, .18); t += .65;
    tone(900, t, .3, .18); tone(1125, t+.3, .3, .18); t += .65;
    nz(t, .9, .3, 900); tone(825, t, .5, .1); t += .95;
    nz(t, .8, .35, 500); t += .85;
    tone(500, t, .15, .25, 'square'); tone(750, t+.17, .15, .25, 'square'); t += .4;
    var total = (t - t0) * 1000;
    setTimeout(onDone, total);
    return total;
  }

  /* ---------- Modem-Overlay beim ersten Klick auf einen Link ----------
     Ohne Speicher (cookiefrei): nur wer von außen kommt (Verweis von einer anderen Seite oder direkt), bekommt das Intro.
     Über den Regler abschaltbar. */
  var fromInside = false;
  try { fromInside = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch(e){}
  if (!fromInside && FX.modem && !/nomodem/.test(location.search)){
    var ov = document.createElement('div'); ov.className='modem';
    ov.innerHTML = '<div class="box"><pre></pre><div class="bar"><i></i></div><button type="button">'+(T.skip||'Überspringen')+'</button>'+(T.modem_hint?'<small>'+T.modem_hint+'</small>':'')+'</div>';
    document.body.appendChild(ov);
    var pre = ov.querySelector('pre'), bar = ov.querySelector('.bar i'), skipBtn = ov.querySelector('button');
    var lines = ['ATZ','OK','ATDT 0049 89 56000','',(T.connecting||'CONNECTING')+' ...','CARRIER 56000','PROTOCOL: LAP-M','COMPRESSION: V.42BIS','',(T.connected||'CONNECT 56000')];
    var armed = true; window.JK_MODEM_ARMED = function(){ return armed; };
    document.addEventListener('click', function(e){
      if (!armed) return;
      var a = e.target.closest && e.target.closest('a[href]'); if(!a) return;
      var href = a.getAttribute('href'); if(!href || href.charAt(0)==='#' || a.target==='_blank' || /^(mailto|tel):/.test(href)) return;
      if (a.closest('.work, .powgrid, .powtiles, .powinfo, .powlead, .marg') || a.hasAttribute('data-full') || a.classList.contains('reflink')) return;   /* Bilder öffnen die Großansicht, nie das Modem */
      e.preventDefault(); armed = false;
      ov.classList.add('on'); pre.textContent='';
      var go = function(){ window.location.href = href; };
      var dur = dialup(go) || 9000; var start = Date.now();
      var li = 0; var step = function(){ if(li<lines.length){ pre.textContent += lines[li++] + '\n'; setTimeout(step, dur/lines.length); } };
      step();
      var tick = setInterval(function(){ var p=Math.min(100,(Date.now()-start)/dur*100); bar.style.width=p+'%'; if(p>=100) clearInterval(tick); }, 100);
      skipBtn.style.visibility='hidden'; setTimeout(function(){ skipBtn.style.visibility='visible'; }, 2500);
      skipBtn.onclick = function(){ try{ if(AC) AC.close(); AC=null; }catch(err){} go(); };
    }, true);
  }

  /* ---------- Motivationsrede ---------- */
  var mo = document.querySelector('[data-moti]');
  if (mo && window.JK_MOTI){
    mo.addEventListener('click', function(){
      var d = document.createElement('div'); d.className='moti on';
      var parts = window.JK_MOTI.split(/(?<=[!?.])\s+/);
      d.innerHTML = '<button>'+(T.close||'X')+'</button>' + parts.map(function(p,i){ return '<p style="--i:'+Math.min(i,40)+'">'+p.replace(/</g,'&lt;')+'</p>'; }).join('');
      document.body.appendChild(d); document.body.style.overflow='hidden';
      d.querySelector('button').onclick=function(){ d.remove(); document.body.style.overflow=''; };
      var ps = d.querySelectorAll('p'); ps.forEach(function(p,i){ p.style.opacity=0; setTimeout(function(){ p.style.opacity=1; if(i%6===5) play('blip'); }, 120*i); });
    });
  }

  /* ---------- Startseite: Werk bildschirmfüllend hinter dem Text (zweites Interview) ---------- */
  var peek = document.querySelector('.peek'), peekbig = document.querySelector('.peekbig');
  if (peekbig){
    var pbT = null;
    document.querySelectorAll('.bigtabs a[data-peek]').forEach(function(a){
      a.addEventListener('mouseenter', function(){ var list = a.getAttribute('data-peek').split(','); peekbig.src = list[Math.floor(Math.random()*list.length)].replace('-m.jpg','-l.jpg'); clearTimeout(pbT); peekbig.classList.add('on'); if (peek) peek.classList.add('off'); });
      a.addEventListener('mouseleave', function(){ pbT = setTimeout(function(){ peekbig.classList.remove('on'); if (peek) peek.classList.remove('off'); }, 250); });
    });
  }
  /* ---------- Zufällige Neigung der Werke (dezent) ---------- */
  document.querySelectorAll('.work.rot').forEach(function(w,i){ w.style.setProperty('--tilt', (((i*7919)%7)-3)*0.5+'deg'); });

  /* ---------- Newsletter: schwebender Mail-Knopf, Anmeldung mit Applaus (Josef, 27.10.) ----------
     Mit Brevo-Link läuft die Anmeldung im Hintergrund; sonst geht das Formular normal ab (FormSubmit), nach dem Applaus. */
  safe(function(){
    var box = document.querySelector('.nlfloat'); if (!box) return;
    var knob = box.querySelector('.nlknob'), panel = box.querySelector('.nlpanel');
    function open(){ panel.classList.add('on'); knob.setAttribute('aria-expanded','true'); var i = panel.querySelector('input[type=email]'); if (i) setTimeout(function(){ i.focus(); }, 120); }
    function close(){ panel.classList.remove('on'); knob.setAttribute('aria-expanded','false'); }
    knob.addEventListener('click', function(){ panel.classList.contains('on') ? close() : open(); });
    panel.querySelector('.x').addEventListener('click', close);
    document.addEventListener('keydown', function(e){ if (e.key==='Escape' && panel.classList.contains('on')){ close(); knob.focus(); } });
    document.addEventListener('pointerdown', function(e){ if (panel.classList.contains('on') && !(e.target.closest && e.target.closest('.nlfloat'))) close(); });
  });
  function applause(){ /* dunkel: Sub-Schwell mit Glocke (Josef, 27.10.: kein Applaus mehr) */ var ac = ctx(); if (!ac) return 0; vary(); V.len = 1; V.vol = 1; var t = ac.currentTime + .02;
    SND['d_sub05'](ac, t); SND['d_bell07'](ac, t + .25); SND['d_choir03'](ac, t + .5); return 1900; }
  document.querySelectorAll('form[data-nl]').forEach(function(f){
    var busy = false;
    f.addEventListener('submit', function(e){
      if (busy) return; e.preventDefault(); busy = true;
      var btn = f.querySelector('button[type=submit]'); if (btn){ btn.disabled = true; btn.textContent = 'Danke!'; }
      var wait = applause() || 300;
      var brevo = /sibforms|brevo/.test(f.action);
      if (brevo && window.fetch && window.FormData){
        fetch(f.action, {method:'POST', body:new FormData(f), mode:'no-cors'}).then(function(){
          var row = f.querySelector('.nlrow'); if (row) row.hidden = true; var ok = f.querySelector('.nlok') || f.parentNode.querySelector('.nlok'); if (ok) ok.hidden = false;
          if (!ok){ var p = document.createElement('p'); p.className = 'nlok'; p.textContent = 'Fast geschafft: Bitte die Mail bestätigen, die gleich kommt.'; f.parentNode.appendChild(p); f.hidden = true; }
        }).catch(function(){ setTimeout(function(){ f.submit(); }, wait); });
      } else { setTimeout(function(){ f.submit(); }, wait); }
    });
  });
  /* ---------- Kopf- und Unterleiste: Höhen für Sticky und Sprungziele, aktive Serie markieren ---------- */
  safe(function(){
    var top = document.querySelector('header.top'), sub = document.querySelector('.subnav');
    function measure(){ var r = document.documentElement.style;
      if (top) r.setProperty('--headh', top.offsetHeight + 'px');
      if (sub) r.setProperty('--subh', sub.offsetHeight + 'px'); }
    measure();
    if (window.ResizeObserver){ var ro = new ResizeObserver(measure); if (top) ro.observe(top); if (sub) ro.observe(sub); }
    else window.addEventListener('resize', measure);
    if (!sub) return;
    var links = Array.prototype.slice.call(sub.querySelectorAll('a[href^="#"]'));
    var targets = links.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); });
    var current = null, ticking = false;
    function more(){ sub.classList.toggle('more', sub.scrollWidth - sub.clientWidth - sub.scrollLeft > 8); }
    function spy(){ ticking = false;
      var line = (top ? top.offsetHeight : 0) + sub.offsetHeight + 30, idx = -1;
      targets.forEach(function(t, i){ if (t && t.getBoundingClientRect().top <= line) idx = i; });
      var a = idx >= 0 ? links[idx] : null;
      if (a === current) return;
      if (current) current.classList.remove('on');
      current = a;
      if (a){ a.classList.add('on');
        if (sub.scrollWidth > sub.clientWidth){ var l = a.offsetParent === sub ? a.offsetLeft : a.offsetLeft - sub.offsetLeft, rr = l + a.offsetWidth;
          if (l < sub.scrollLeft || rr > sub.scrollLeft + sub.clientWidth) sub.scrollTo({left: Math.max(0, l - 16), behavior: 'smooth'}); } }
    }
    window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(spy); } }, {passive:true});
    sub.addEventListener('scroll', more, {passive:true}); window.addEventListener('resize', more);
    spy(); more();
  });

  /* ---------- Fußnoten: Quelle als kleines Fenster (Maus: Drüberfahren, Touch: Antippen, Tastatur: Fokus) ---------- */
  safe(function(){
    var pop = document.createElement('div'); pop.className = 'fnpop'; pop.setAttribute('role','tooltip'); pop.id = 'fnpop'; document.body.appendChild(pop);
    var hideT = null, cur = null, shownAt = 0;
    function place(sup){ var r = sup.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
      var x = Math.min(Math.max(12, r.left + r.width/2 - pw/2), window.innerWidth - pw - 12);
      var y = r.top - ph - 10; if (y < ((document.querySelector('header.top')||{}).offsetHeight || 0) + 8) y = r.bottom + 10;
      pop.style.left = x + 'px'; pop.style.top = y + 'px'; }
    function show(sup){ clearTimeout(hideT); if (cur !== sup || !pop.classList.contains('on')) shownAt = Date.now(); if (cur && cur !== sup) cur.classList.remove('on'); cur = sup; sup.classList.add('on');
      pop.innerHTML = '<b>' + (T.note || 'Anmerkung') + ' ' + sup.textContent + '</b>' + sup._note.innerHTML;
      pop.style.left = '-9999px'; pop.style.top = '0'; pop.classList.add('on'); place(sup); sup.setAttribute('aria-describedby','fnpop'); }
    function hide(now){ clearTimeout(hideT); hideT = setTimeout(function(){ pop.classList.remove('on'); if (cur){ cur.classList.remove('on'); cur.removeAttribute('aria-describedby'); } cur = null; }, now ? 0 : 160); }
    document.querySelectorAll('.notes ol').forEach(function(ol){
      var box = ol.closest('section, .powlead, .textblock, main') || document.body, lis = ol.querySelectorAll('li');
      box.querySelectorAll('sup').forEach(function(sup){
        if (sup.closest('.notes')) return; var n = parseInt(sup.textContent, 10); if (!n || !lis[n-1] || sup._note) return;
        sup._note = lis[n-1]; sup.classList.add('fn'); sup.tabIndex = 0; sup.setAttribute('role','button'); sup.setAttribute('aria-label', (T.note || 'Anmerkung') + ' ' + n);
        sup.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') show(sup); });
        sup.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') hide(); });
        sup.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); if (cur === sup && pop.classList.contains('on') && Date.now() - shownAt > 450) hide(true); else show(sup); });
        sup.addEventListener('focus', function(){ show(sup); }); sup.addEventListener('blur', function(){ hide(); });
      });
    });
    pop.addEventListener('pointerenter', function(){ clearTimeout(hideT); });
    pop.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') hide(); });
    document.addEventListener('pointerdown', function(e){ if (cur && !(e.target.closest && e.target.closest('.fnpop, sup.fn'))) hide(true); });
    window.addEventListener('scroll', function(){ if (cur && pop.classList.contains('on')) place(cur); }, {passive:true});
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && cur) hide(true); });
  });

  /* ============================================================
     Design Harder (Erik Carter) als Vorbild, 27.10.2026
     ============================================================ */
  var MOUSE = !(window.matchMedia && window.matchMedia('(hover: none)').matches);

  /* ---------- Fette Buchstaben: Maus oder Finger macht sie frei, sie wachsen langsam wieder zu ---------- */
  safe(function(){
    var fats = document.querySelectorAll('.fat'); if (!fats.length) return;
    function ready(){ document.documentElement.classList.add('fatready'); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ setTimeout(ready, 60); }); else setTimeout(ready, 300);
    var pending = null, raf = false;
    function free(l, amt){ if (!l || l._free) return; l._free = true; l.classList.add('free'); l.style.setProperty('--st', amt ? 'calc(var(--fatmax,.09em)*' + amt + ')' : '0px');
      clearTimeout(l._t); l._t = setTimeout(function(){ l.classList.remove('free'); l.style.removeProperty('--st'); l._free = false; }, amt ? 500 : 1100); }
    function hit(x, y){
      var el = document.elementFromPoint(x, y); if (!el || !el.closest) return;
      var l = el.closest('.fat .l'); if (!l) return;
      free(l, 0);
      var p = l.previousElementSibling, n = l.nextElementSibling;   /* Nachbarn halb frei */
      if (p && p.classList.contains('l')) free(p, .45); if (n && n.classList.contains('l')) free(n, .45);
    }
    function onMove(e){ pending = e; if (raf) return; raf = true; requestAnimationFrame(function(){ raf = false; if (pending){ hit(pending.clientX, pending.clientY); pending = null; } }); }
    document.addEventListener('pointermove', onMove, {passive:true});
    document.addEventListener('pointerdown', function(e){ hit(e.clientX, e.clientY); }, {passive:true});
    /* Finger-Wischen über Titel (touch-action none auf Hero und Reitern, sonst würde gescrollt) */
    document.addEventListener('touchmove', function(e){ var t = e.touches[0]; if (t) hit(t.clientX, t.clientY); }, {passive:true});
  });

  /* ---------- Fließtext: Wörter werden unter der Maus rot und bleiben rot, kurze Linse ---------- */
  if (false) safe(function(){   /* rote Hover-Wörter gestrichen (siebtes Interview): der Plotter ist die Textbewegung */
    var zones = '.sertext, .bio, .notes, .legal, .einzel .side, .textblock, .cvl, .info p';
    var raf = false, last = null;
    function wordAt(x, y){
      var node, off;
      if (document.caretPositionFromPoint){ var c = document.caretPositionFromPoint(x, y); if (!c) return null; node = c.offsetNode; off = c.offset; }
      else if (document.caretRangeFromPoint){ var r = document.caretRangeFromPoint(x, y); if (!r) return null; node = r.startContainer; off = r.startOffset; }
      else return null;
      if (!node || node.nodeType !== 3) return null;
      var par = node.parentNode; if (!par || !par.closest || !par.closest(zones)) return null;
      if (par.closest('.hot, sup, .fat, .nlform, input, textarea, .playmark, .spot')) return null;
      var txt = node.nodeValue, a = off, b = off;
      var W = /[^\s,.;:!?()„“"»«\[\]…·]/;
      while (a > 0 && W.test(txt.charAt(a - 1))) a--;
      while (b < txt.length && W.test(txt.charAt(b))) b++;
      if (b - a < 2) return null;
      return {node:node, a:a, b:b};
    }
    function mark(w){
      try { var r = document.createRange(); r.setStart(w.node, w.a); r.setEnd(w.node, w.b);
        var sp = document.createElement('span'); sp.className = 'hot lens'; r.surroundContents(sp);
        setTimeout(function(){ sp.classList.remove('lens'); }, 420); } catch(e){}
    }
    document.addEventListener('pointermove', function(e){ if (e.pointerType !== 'mouse') return; last = e; if (raf) return; raf = true;
      requestAnimationFrame(function(){ raf = false; var w = wordAt(last.clientX, last.clientY); if (w) mark(w); }); }, {passive:true});
  });

  /* ---------- Fortschrittsbalken: nur das jeweilige Kapitel; Grün für Bilder-Kapitel, Rot für Texte, Blau für Comic; darunter Lesebalken für den Fließtext ---------- */
  safe(function(){
    var bar = document.querySelector('.progress i'), bar2 = document.querySelector('.progress2 i'); if (!bar) return; var t = false;
    var secs = Array.prototype.slice.call(document.querySelectorAll('section.series'));
    var comic = document.body.classList.contains('comicbody'), isText = document.body.classList.contains('textbody');
    var texts = Array.prototype.slice.call(document.querySelectorAll('.sertext'));
    function upd(){ t = false; var h = document.documentElement, vh = h.clientHeight, p = 0, p2 = 0, col = comic ? '#3F97B8' : (isText ? '#E2231A' : '#00A651');
      var cur = null; secs.forEach(function(s){ var r = s.getBoundingClientRect(); if (r.top <= vh * .5 && r.bottom > vh * .5) cur = s; });
      if (cur){ var r = cur.getBoundingClientRect(); p = Math.min(100, Math.max(0, (vh * .5 - r.top) / Math.max(1, r.height - vh * .5) * 100)); }
      else if (!secs.length){ var max = h.scrollHeight - vh; p = max > 0 ? Math.min(100, (h.scrollTop || 0) / max * 100) : 0; }
      var ct = null; texts.forEach(function(x){ var r = x.getBoundingClientRect(); if (r.top <= vh * .6 && r.bottom > vh * .3) ct = x; });
      if (ct){ var rr = ct.getBoundingClientRect(); p2 = Math.min(100, Math.max(0, (vh * .6 - rr.top) / Math.max(1, rr.height) * 100)); }
      bar.style.width = p + '%'; bar.style.background = col; if (bar2){ bar2.style.width = p2 + '%'; bar2.parentNode.classList.toggle('on', !!ct); } }
    window.addEventListener('scroll', function(){ if (!t){ t = true; requestAnimationFrame(upd); } }, {passive:true}); window.addEventListener('resize', upd); upd();
  });

  /* ---------- Drei Modi: weiß, schwarz, rot (im Browser gemerkt, ohne Personenbezug) ---------- */
  safe(function(){
    var h = document.documentElement, btns = document.querySelectorAll('.modes button'); if (!btns.length) return;
    function set(m, save){ if (m === 'hell') h.removeAttribute('data-mode'); else h.setAttribute('data-mode', m);
      btns.forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-mode') === m); });
      var meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = m === 'dunkel' ? '#000000' : m === 'rot' ? '#E2231A' : '#ffffff';
      if (save){ try { localStorage.setItem('jk_mode', m); } catch(e){} } }
    /* Standard: schwarz (Josef, 27.10., 19:03: weiße Hintergründe vermeiden) */
    var cur = 'dunkel'; try { cur = localStorage.getItem('jk_mode') || 'dunkel'; } catch(e){}
    set(cur, false);
    btns.forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); set(b.getAttribute('data-mode'), true); play('ratchet'); }); });   /* Lichtschalter-Knacken */
  });

  /* ---------- Menü-Overlay ---------- */
  safe(function(){
    var menu = document.getElementById('menu'), btn = document.querySelector('.menubtn'); if (!menu || !btn) return;
    var peek = menu.querySelector('.mpeek'), x = menu.querySelector('.menux');
    function open(){ menu.hidden = false; document.body.classList.add('menuopen'); btn.setAttribute('aria-expanded', 'true'); requestAnimationFrame(function(){ requestAnimationFrame(function(){ menu.classList.add('vis'); }); }); if (SPR.papier && SPR.papier.buf) spritePlay('papier', {vol:.9, force:true, bus:'ui'}); else play('pageturn'); }
    function close(){ if (SPR.papier && SPR.papier.buf) spritePlay('papier', {vol:.6, max:.5, force:true, bus:'ui'}); menu.classList.remove('vis'); btn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menuopen'); setTimeout(function(){ menu.hidden = true; }, 320); }
    btn.addEventListener('click', function(){ menu.hidden ? open() : close(); });
    x.addEventListener('click', close);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !menu.hidden) close(); });
    menu.querySelectorAll('a[data-peek]').forEach(function(a){
      a.addEventListener('mouseenter', function(){ var list = a.getAttribute('data-peek').split(',').filter(Boolean); if (!list.length) return; peek.src = list[Math.floor(Math.random()*list.length)]; peek.classList.add('on'); peek.style.transform = 'rotate(' + ((Math.random()*6)-3) + 'deg)'; });
      a.addEventListener('mouseleave', function(){ peek.classList.remove('on'); });
    });
    menu.querySelectorAll('a[href]').forEach(function(a){ a.addEventListener('click', function(){
      var href = a.getAttribute('href'); var here = location.pathname.split('/').pop() || 'index.html';
      if (href.indexOf('#') >= 0 && href.split('#')[0].replace('./','') === here) close();   /* Sprung auf dieser Seite: Menü zu */
      else if (href.charAt(0) === '#') close(); }); });
  });

  /* ---------- Seitenwechsel: weicher Farbübergang in der Serienfarbe (kein harter Blitz) ---------- */
  safe(function(){
    var veil = document.querySelector('.veil'); if (!veil) return;
    var h = document.documentElement;
    if (h.classList.contains('arrive')){ requestAnimationFrame(function(){ requestAnimationFrame(function(){ h.classList.add('go'); setTimeout(function(){ h.classList.remove('arrive', 'go'); }, 450); }); }); }
    document.addEventListener('click', function(e){
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (window.JK_MODEM_ARMED && window.JK_MODEM_ARMED()) return;
      var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      var href = a.getAttribute('href'); if (!href || href.charAt(0) === '#' || a.target === '_blank' || a.hasAttribute('download') || /^(mailto|tel|http)/.test(href)) return;
      if (a.closest('.work, .powgrid, .powtiles, .powinfo, .powlead, a.reflink')) return;
      if (href.indexOf('#') > 0 && href.split('#')[0] === (location.pathname.split('/').pop() || 'index.html')) return;
      e.preventDefault(); veil.classList.add('on'); setTimeout(function(){ location.href = href; }, 320);
    });
    window.addEventListener('pageshow', function(ev){ if (ev.persisted){ veil.classList.remove('on'); h.classList.remove('arrive','go'); } });
  });

  /* ---------- Serienköpfe kleben oben und schrumpfen; Marginalien laufen langsamer mit (Parallax) ---------- */
  safe(function(){
    var heads = Array.prototype.slice.call(document.querySelectorAll('section.series .serhead'));
    heads.forEach(function(hd){ hd.classList.add('sticky-head'); });
    var par = [];   /* Parallax gestrichen (siebtes Interview) */
    var calm = document.documentElement.classList.contains('calm');
    var t = false;
    function upd(){ t = false;
      heads.forEach(function(hd){ var r = hd.getBoundingClientRect(), sec = hd.parentNode.getBoundingClientRect();
        var top = parseFloat(getComputedStyle(hd).top) || 0;   /* der echte Sticky-Abstand (Kopf, Unterleiste, Fortschrittsbalken) */
        var stuck = r.top <= top + 1 && sec.bottom > top + r.height * .5;
        hd.classList.toggle('small', stuck); });
      if (calm) return;
      var vh = window.innerHeight;
      par.forEach(function(el){ var r = el.getBoundingClientRect(); if (r.bottom < -vh || r.top > vh * 2){ return; }
        var c = (r.top + r.height / 2) - vh / 2; el.style.transform = 'translateY(' + Math.max(-48, Math.min(48, c * -0.07)).toFixed(1) + 'px)'; });
    }
    if (heads.length || par.length){ window.addEventListener('scroll', function(){ if (!t){ t = true; requestAnimationFrame(upd); } }, {passive:true}); window.addEventListener('resize', upd); upd(); }
  });

  /* ============================================================
     Zweites Interview (Bilder vor Schrift) und viertes (Zeiger, Sounds), 27.10.2026
     ============================================================ */
  var CALM = document.documentElement.classList.contains('calm');
  function secOf(el){ var s = el.closest('section, main'); return s ? s.id || '' : ''; }
  var softPlay = function(name, vol){ var ac = ctx(); if(!ac||!SND[name]) return; vary(); V.vol *= (vol || .4); SND[name](ac, ac.currentTime + .005); };
  function secSound(el){ var s = el.closest('[data-sounds]'); var list = s ? s.getAttribute('data-sounds').split(',') : DEFAULT; return list[Math.floor(Math.random()*list.length)]; }


  /* ============================================================
     Dunkle Klangbibliothek (Josef, 27.10., 19:58): synthetisch, düster, bassschwer. 12 Familien x 18 Varianten = 216 Klänge,
     deterministisch aus dem Variantenindex erzeugt (jede Variante klingt immer gleich, play() variiert zusätzlich leicht).
     ============================================================ */
  var DARK = {};
  function sr(i, k){ var x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); }   /* 0..1, stabil je Variante */
  function dout(ac, t, d, vol, att, wet){ var g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.001, vol * V.vol), t + (att || .01)); g.gain.exponentialRampToValueAtTime(.0001, t + d * V.len);
    g.connect(OUT(ac)); if (wet){ try { var w = ac.createGain(); w.gain.value = wet; g.connect(w); w.connect(rev(ac)); } catch(e){} } return g; }
  function dosc(ac, type, f, t, stop){ var o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = V.cents * .3; o.start(t); o.stop(t + stop); return o; }
  function dnoise(ac, t, d){ var n = ac.createBufferSource(); n.buffer = noiseBuf(ac, d + .1); n.start(t); n.stop(t + d + .1); return n; }
  function dist(ac, k){ var ws = ac.createWaveShaper(), n = 256, c = new Float32Array(n); for (var i = 0; i < n; i++){ var x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } ws.curve = c; return ws; }
  var FAM = {
    sub: function(ac, t, i){ /* 808-Kick, tief, mit Knack */ var f0 = 48 + sr(i,1) * 40, d = .35 + sr(i,2) * .7; var o = dosc(ac, 'sine', f0 * 3, t, d + .1); o.frequency.exponentialRampToValueAtTime(f0, t + .06); o.frequency.exponentialRampToValueAtTime(Math.max(22, f0 * .45), t + d);
      var ds = dist(ac, 2 + sr(i,3) * 6); o.connect(ds); ds.connect(dout(ac, t, d, .9, .004)); var c = dnoise(ac, t, .03); var hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500 + sr(i,4) * 3000; c.connect(hp); hp.connect(dout(ac, t, .03, .25 * sr(i,5), .002)); },
    drone: function(ac, t, i){ /* zwei verstimmte Sägezähne, tief, Tiefpass öffnet und schließt */ var f0 = 30 + sr(i,1) * 30, d = .9 + sr(i,2) * 1.6; var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3 + sr(i,3) * 8; lp.frequency.setValueAtTime(120, t); lp.frequency.exponentialRampToValueAtTime(300 + sr(i,4) * 900, t + d * .35); lp.frequency.exponentialRampToValueAtTime(90, t + d);
      [1, 1.007 + sr(i,5) * .01, .5].forEach(function(r){ dosc(ac, 'sawtooth', f0 * r, t, d + .2).connect(lp); }); lp.connect(dout(ac, t, d, .5, .08 + sr(i,6) * .3, .5)); },
    growl: function(ac, t, i){ /* FM-Knurren */ var f0 = 38 + sr(i,1) * 50, d = .5 + sr(i,2) * .9, ratio = [1.5, 2, 2.5, 3.01, 3.7][Math.floor(sr(i,3) * 5)]; var c = dosc(ac, 'sine', f0, t, d + .1); var m = dosc(ac, 'sine', f0 * ratio, t, d + .1); var mg = ac.createGain(); mg.gain.setValueAtTime(f0 * (4 + sr(i,4) * 14), t); mg.gain.exponentialRampToValueAtTime(f0 * .3, t + d); m.connect(mg); mg.connect(c.frequency);
      var ds = dist(ac, 4 + sr(i,5) * 10); c.connect(ds); ds.connect(dout(ac, t, d, .6, .02, .35)); },
    rumble: function(ac, t, i){ /* Grollen: tiefes Rauschen, langsam */ var d = 1 + sr(i,1) * 1.8; var n = dnoise(ac, t, d); var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(60 + sr(i,2) * 80, t); lp.frequency.linearRampToValueAtTime(140 + sr(i,3) * 200, t + d * .5); lp.frequency.linearRampToValueAtTime(50, t + d); lp.Q.value = 1 + sr(i,4) * 4;
      n.connect(lp); lp.connect(dout(ac, t, d, 1.2, .15 + sr(i,5) * .4, .4)); var o = dosc(ac, 'sine', 28 + sr(i,6) * 20, t, d + .1); o.connect(dout(ac, t, d, .5, .2)); },
    impact: function(ac, t, i){ /* Einschlag: Knall, Sub, Hall */ var d = .5 + sr(i,1) * .6; var n = dnoise(ac, t, .25); var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3000 + sr(i,2) * 5000, t); lp.frequency.exponentialRampToValueAtTime(120, t + .25); n.connect(lp); lp.connect(dout(ac, t, .3, .9, .003, .7));
      var o = dosc(ac, 'sine', 90 + sr(i,3) * 60, t, d + .1); o.frequency.exponentialRampToValueAtTime(26 + sr(i,4) * 14, t + d * .6); var ds = dist(ac, 3 + sr(i,5) * 5); o.connect(ds); ds.connect(dout(ac, t, d, .9, .005, .3)); },
    metal: function(ac, t, i){ /* Metall, unharmonisch, tief, lang */ var f0 = 70 + sr(i,1) * 110, d = 1.2 + sr(i,2) * 1.8; [1, 2.76, 5.4, 8.9, 1.41].forEach(function(r, k){ var o = dosc(ac, k % 2 ? 'triangle' : 'sine', f0 * r * (1 + (sr(i, 3 + k) - .5) * .01), t, d + .2); o.connect(dout(ac, t, d / (1 + k * .4), .32 / (1 + k * .8), .004, .6)); });
      var n = dnoise(ac, t, .04); var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400 + sr(i,8) * 1200; bp.Q.value = 2; n.connect(bp); bp.connect(dout(ac, t, .05, .3, .002)); },
    riser: function(ac, t, i){ /* Rückwärts-Schwell, bricht ab */ var d = .7 + sr(i,1) * 1; var n = dnoise(ac, t, d); var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(80, t); bp.frequency.exponentialRampToValueAtTime(600 + sr(i,2) * 2400, t + d); bp.Q.value = 1 + sr(i,3) * 3; n.connect(bp);
      var g = ac.createGain(); g.gain.setValueAtTime(.0005, t); g.gain.exponentialRampToValueAtTime(.7 * V.vol, t + d - .02); g.gain.setValueAtTime(0, t + d); bp.connect(g); g.connect(OUT(ac)); try { g.connect(rev(ac)); } catch(e){}
      var o = dosc(ac, 'sawtooth', 40 + sr(i,4) * 30, t, d); o.frequency.exponentialRampToValueAtTime(90 + sr(i,5) * 120, t + d); var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; o.connect(lp); lp.connect(g); },
    glitch: function(ac, t, i){ /* Störung: tiefe Rechteck-Fetzen mit Lücken */ var n = 3 + Math.floor(sr(i,1) * 6), f0 = 45 + sr(i,2) * 120; for (var k = 0; k < n; k++){ var tt = t + k * (.03 + sr(i, 3 + k) * .09); var o = dosc(ac, 'square', f0 * (1 + Math.floor(sr(i, 20 + k) * 4) * .5), tt, .06); var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400 + sr(i, 40 + k) * 1200; o.connect(lp); lp.connect(dout(ac, tt, .03 + sr(i, 60 + k) * .05, .35, .002)); }
      var s = dosc(ac, 'sine', f0 * .5, t, .4); s.connect(dout(ac, t, .35, .5, .01)); },
    choir: function(ac, t, i){ /* dunkler Moll-Akkord, verstimmte Dreiecke */ var f0 = 55 + sr(i,1) * 55, d = 1.4 + sr(i,2) * 1.6; [1, 1.1892, 1.4983, 2, .5].forEach(function(r, k){ [-6, 6].forEach(function(dc){ var o = dosc(ac, k < 2 ? 'triangle' : 'sawtooth', f0 * r, t, d + .3); o.detune.value = dc + (sr(i, 10 + k) - .5) * 8; var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500 + sr(i,3) * 500; o.connect(lp); lp.connect(dout(ac, t, d, .09, .3 + sr(i,4) * .6, .8)); }); }); },
    heart: function(ac, t, i){ /* Herzschlag, zwei Schläge, Sub */ var gap = .32 + sr(i,1) * .25, f0 = 50 + sr(i,2) * 40; [0, gap].forEach(function(dt, k){ var o = dosc(ac, 'sine', f0 * 1.8, t + dt, .3); o.frequency.exponentialRampToValueAtTime(f0 * .6, t + dt + .18); o.connect(dout(ac, t + dt, .26, k ? .6 : .85, .004, .25)); var n = dnoise(ac, t + dt, .05); var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 250; n.connect(lp); lp.connect(dout(ac, t + dt, .06, .3, .003)); }); },
    scrape: function(ac, t, i){ /* Schaben, abwärts, dunkel */ var d = .4 + sr(i,1) * .8; var n = dnoise(ac, t, d); var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(900 + sr(i,2) * 1500, t); bp.frequency.exponentialRampToValueAtTime(120 + sr(i,3) * 200, t + d); bp.Q.value = 3 + sr(i,4) * 10; n.connect(bp); bp.connect(dout(ac, t, d, .7, .02, .5));
      var o = dosc(ac, 'sawtooth', 60 + sr(i,5) * 40, t, d); o.frequency.exponentialRampToValueAtTime(30, t + d); var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200; o.connect(lp); lp.connect(dout(ac, t, d, .35, .02)); },
    bell: function(ac, t, i){ /* dunkle Glocke, langsamer Anschlag */ var f0 = 65 + sr(i,1) * 90, d = 1.5 + sr(i,2) * 2; [1, 2.0, 2.98, 4.2, .5].forEach(function(r, k){ var o = dosc(ac, 'sine', f0 * r * (1 + (sr(i, 5 + k) - .5) * .006), t, d + .2); o.connect(dout(ac, t, d / (1 + k * .5), .3 / (1 + k * .6), .04 + sr(i,3) * .25, .7)); }); }
  };
  var FAMS = Object.keys(FAM), VARIANTS = 18;
  FAMS.forEach(function(name){ DARK[name] = []; for (var i = 1; i <= VARIANTS; i++){ (function(nm, idx){ var key = 'd_' + nm + (idx < 10 ? '0' + idx : idx); SND[key] = function(ac, t){ FAM[nm](ac, t, idx); }; DARK[nm].push(key); })(name, i); } });
  /* Familienname in den Klanglisten = zufällige Variante */
  var _play = play; play = function(name){ if (DARK[name]) name = DARK[name][Math.floor(Math.random() * DARK[name].length)]; _play(name); };
  var _softPlay = softPlay; softPlay = function(name, vol){ if (DARK[name]) name = DARK[name][Math.floor(Math.random() * DARK[name].length)]; _softPlay(name, vol); };
  DEFAULT = ['sub', 'impact', 'glitch', 'metal', 'drone', 'heart'];

  /* ---------- Stumm-Knopf ---------- */
  safe(function(){
    var b = document.querySelector('.mute'); if (!b) return; var muted = false;
    try { muted = localStorage.getItem('jk_mute') === '1'; } catch(e){}
    function apply(){ b.classList.toggle('off', muted); b.setAttribute('aria-pressed', muted ? 'true' : 'false'); b.setAttribute('aria-label', muted ? 'Ton an' : 'Ton aus'); FX.vol = muted ? 0 : FX_DEFAULT.vol; if (MASTER) MASTER.node.gain.value = FX.vol/100; }
    apply();
    b.addEventListener('click', function(e){ e.stopPropagation(); muted = !muted; try { localStorage.setItem('jk_mute', muted ? '1' : '0'); } catch(err){} apply(); if (!muted) play('click'); });
  });

  /* ---------- Einflug: Bilder kommen beim Scrollen riesig und schrumpfen an ihren Platz (scrollgekoppelt) ---------- */
  safe(function(){
    if (CALM) return;
    var els = Array.prototype.slice.call(document.querySelectorAll('.grid .work, .powtiles figure, .einzelgrid .work, .marg figure'));
    if (!els.length) return;
    var t = false, vw = window.innerWidth, vh = window.innerHeight;
    els.forEach(function(el){ el._landed = false; el._huge = el.classList.contains('huge'); });
    function ease(p){ return 1 - Math.pow(1 - p, 3); }
    function upd(){ t = false; vw = window.innerWidth; vh = window.innerHeight;
      els.forEach(function(el){
        var r = el.getBoundingClientRect();
        if (r.top > vh + 40 || r.bottom < -40){ if (el.classList.contains('fly')){ el.classList.remove('fly'); el.style.removeProperty('--s'); el.style.removeProperty('--tx'); el.style.removeProperty('--z'); el.style.removeProperty('--cap'); } return; }
        /* 0: Oberkante am unteren Rand, 1: Oberkante bei 42 % der Höhe */
        var p = Math.min(1, Math.max(0, (vh - r.top) / (vh * .6)));
        if (p >= 1){ if (el.classList.contains('fly')){ el.classList.remove('fly'); el.style.removeProperty('--s'); el.style.removeProperty('--tx'); el.style.removeProperty('--z'); el.style.removeProperty('--cap'); }
          if (!el._landed){ el._landed = true; if (el._huge && el._seen) softPlay(secSound(el), .35); } return; }
        el._seen = true;
        var w = r.width / Math.max(.01, parseFloat(el.style.getPropertyValue('--s')) || 1);
        if (el._rk === undefined) el._rk = .9 + Math.random() * .2;   /* leicht zufällig (Interview 27.10.) */
        var maxS = (el._huge ? Math.min(8, (vw * .92) / w) : Math.min(3, (vw * .5) / w)) * el._rk;
        if (maxS < 1.35) maxS = 1.35;   /* auch am Handy sichtbar: mindestens ein Drittel größer */
        var e = ease(p), sc = maxS - (maxS - 1) * e;
        var cx = r.left + r.width / 2, tx = (vw / 2 - cx) * (1 - e);
        el.classList.add('fly');
        el.style.setProperty('--s', sc.toFixed(3)); el.style.setProperty('--tx', tx.toFixed(1) + 'px'); el.style.setProperty('--z', Math.round(e * 19));
        if (el._huge) el.style.setProperty('--cap', (1 - e).toFixed(2));
      });
    }
    window.addEventListener('scroll', function(){ if (!t){ t = true; requestAnimationFrame(upd); } }, {passive:true});
    window.addEventListener('resize', upd); setTimeout(upd, 100); setTimeout(upd, 800);
    /* Trenner (Ausstellungsansichten): Parallax */
    var bleeds = Array.prototype.slice.call(document.querySelectorAll('.bleed img'));
    if (bleeds.length){ var tb = false; function pb(){ tb = false; bleeds.forEach(function(im){ var r = im.parentNode.parentNode.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return; var c = (r.top + r.height/2 - vh/2) / vh; im.style.setProperty('--py', (-10 - c * 10).toFixed(1) + '%'); }); }
      window.addEventListener('scroll', function(){ if (!tb){ tb = true; requestAnimationFrame(pb); } }, {passive:true}); pb(); }
  });

  /* ---------- Hover-Vorschau: Bild sofort groß über dem Raster; leiser Ton ---------- */
  var hov = null;
  if (MOUSE) safe(function(){
    hov = document.createElement('div'); hov.className = 'hov'; hov.innerHTML = '<img alt=""><div class="cap"></div>'; document.body.appendChild(hov);
    var him = hov.querySelector('img'), hcap = hov.querySelector('.cap'), cur = null, lastSnd = 0;
    var lastE = null;
    function place(e){ if (e) lastE = e; e = e || lastE; if (!e) return; var w = hov.offsetWidth, h = hov.offsetHeight, x = e.clientX + 24, y = e.clientY - h / 2;
      if (x + w > window.innerWidth - 12) x = e.clientX - w - 24; if (x < 12) x = 12;
      y = Math.min(window.innerHeight - h - 40, y); if (y < 12) y = 12; hov.style.left = x + 'px'; hov.style.top = y + 'px'; }
    him.addEventListener('load', function(){ place(); });   /* erst nach dem Laden ist die Größe bekannt: nie aus dem Bild (Josef, 27.10.) */
    document.querySelectorAll('.grid .work, .powtiles figure, .einzelgrid .work, .marg figure, .powinfo figure, .powlead figure').forEach(function(f){
      var a = f.querySelector('a[data-full], a.reflink'); if (!a) return;
      f.addEventListener('pointerenter', function(e){ if (e.pointerType !== 'mouse') return; if (f.classList.contains('fly') && (parseFloat(f.style.getPropertyValue('--s')) || 1) > 1.2) return; cur = f;
        him.src = a.getAttribute('data-full') || a.getAttribute('href'); var fc = f.querySelector('figcaption'); hcap.innerHTML = fc ? fc.innerHTML : '';
        hov.classList.add('on'); place(e); if (Date.now() - lastSnd > 350){ lastSnd = Date.now(); softPlay(secSound(f), .25); } });
      f.addEventListener('pointermove', function(e){ if (cur === f && e.pointerType === 'mouse') place(e); });
      f.addEventListener('pointerleave', function(){ if (cur === f){ cur = null; hov.classList.remove('on'); } });
      f.addEventListener('click', function(){ cur = null; hov.classList.remove('on'); });
    });
  });

  /* ---------- Großansicht: schwarz, bildschirmfüllend, Wischen, Pfeile, Zoom, Lupe, Play ---------- */
  safe(function(){
    var links = Array.prototype.slice.call(document.querySelectorAll('a[data-full]'));
    if (!links.length) return;
    var lb = document.createElement('div'); lb.className = 'lb2';
    lb.innerHTML = '<div class="stage"><img class="main" alt=""></div><div class="lens"></div><div class="cnt"></div><button class="x" aria-label="Schließen">&times;</button><button class="p" aria-label="Zurück">&larr;</button><button class="nx" aria-label="Weiter">&rarr;</button><div class="cap"></div>';
    document.body.appendChild(lb);
    var img = lb.querySelector('img.main'), cap = lb.querySelector('.cap'), cnt = lb.querySelector('.cnt'), lens = lb.querySelector('.lens'), stage = lb.querySelector('.stage');
    var group = [], idx = 0, z = 1, px = 0, py = 0, drag = null, pinch = null, lensOn = false, spotBox = null, playBtn = null;
    function groupOf(a){ var f = a.closest('[data-group]'); var g = f ? f.getAttribute('data-group') : ''; return links.filter(function(l){ var ff = l.closest('[data-group]'); return (ff ? ff.getAttribute('data-group') : '') === g; }); }
    function resetZoom(){ z = 1; px = 0; py = 0; applyZoom(); }
    function applyZoom(){ img.style.transform = 'translate(' + px + 'px,' + py + 'px) scale(' + z + ')'; img.style.transformOrigin = '0 0'; }
    function show(i){ idx = (i + group.length) % group.length; var a = group[idx]; var f = a.closest('figure') || a.parentNode;
      img.src = a.getAttribute('data-full') || a.getAttribute('href'); img.alt = a.getAttribute('data-alt') || '';
      var fc = f.querySelector('figcaption'); cap.innerHTML = fc ? fc.innerHTML : ''; cap.classList.remove('plotted'); cap.style.minHeight = ''; cnt.textContent = group.length > 1 ? (idx + 1) + ' / ' + group.length : '';
      if (window.JK_PLOT_ONCE) setTimeout(function(){ window.JK_PLOT_ONCE(cap, 900); }, 30);
      lb.querySelector('.p').style.display = lb.querySelector('.nx').style.display = group.length > 1 ? '' : 'none';
      resetZoom(); lensOn = !!a.closest('#suchbilder'); lens.classList.remove('on');
      if (spotBox){ spotBox.remove(); spotBox = null; } if (playBtn){ playBtn.remove(); playBtn = null; }
      var fig = a.closest('figure'); var song = fig && fig.getAttribute('data-song');
      if (song){ playBtn = document.createElement('button'); playBtn.className = 'play'; playBtn.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="6"/><polygon points="40,28 74,50 40,72" fill="currentColor"/></svg><span>' + song.replace(/</g,'&lt;') + '</span>'; lb.appendChild(playBtn);
        var src = fig.getAttribute('data-spot');
        playBtn.addEventListener('click', function(e){ e.stopPropagation(); if (!src){ window.open('https://open.spotify.com/search/' + encodeURIComponent(song), '_blank'); return; }
          softPlay('boom', .6); playBtn.remove(); playBtn = null; spotBox = document.createElement('div'); spotBox.className = 'lbspot'; var f2 = document.createElement('iframe'); f2.src = src; f2.title = song; f2.setAttribute('allow','autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'); spotBox.appendChild(f2); lb.appendChild(spotBox); }); }
    }
    function open(a){ group = groupOf(a); show(group.indexOf(a)); lb.classList.add('on'); document.body.classList.add('lbopen'); requestAnimationFrame(function(){ requestAnimationFrame(function(){ lb.classList.add('vis'); }); }); if (hov) hov.classList.remove('on'); softPlay(secSound(a), .5); }
    function close(){ lb.classList.remove('vis'); setTimeout(function(){ lb.classList.remove('on'); document.body.classList.remove('lbopen'); img.removeAttribute('src'); if (spotBox){ spotBox.remove(); spotBox = null; } }, 300); }
    links.forEach(function(a){ a.addEventListener('click', function(ev){ ev.preventDefault(); open(a); }); });
    lb.querySelector('.x').addEventListener('click', close);
    lb.querySelector('.p').addEventListener('click', function(e){ e.stopPropagation(); show(idx - 1); softPlay('pageturn', .4); });
    lb.querySelector('.nx').addEventListener('click', function(e){ e.stopPropagation(); show(idx + 1); softPlay('pageturn', .4); });
    stage.addEventListener('click', function(e){ if (e.target === stage && !drag) close(); });
    document.addEventListener('keydown', function(e){ if (!lb.classList.contains('on')) return; if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(idx + 1); else if (e.key === 'ArrowLeft') show(idx - 1); });
    /* Zoom mit Mausrad, Verschieben mit Ziehen, Pinch mit zwei Fingern, Wischen mit einem */
    lb.addEventListener('wheel', function(e){ e.preventDefault(); var r = img.getBoundingClientRect(); var ox = e.clientX - r.left, oy = e.clientY - r.top; var nz = Math.min(8, Math.max(1, z * (e.deltaY < 0 ? 1.18 : 1/1.18)));
      var k = nz / z; px = e.clientX - (ox * k) - (r.left - px) ; py = e.clientY - (oy * k) - (r.top - py); z = nz; if (z === 1){ px = py = 0; } applyZoom(); if (lensOn) moveLens(e); }, {passive:false});
    var pts = {};
    lb.addEventListener('pointerdown', function(e){ if (e.target.closest('button, .lbspot')) return; pts[e.pointerId] = {x:e.clientX, y:e.clientY, sx:e.clientX, sy:e.clientY}; var ks = Object.keys(pts);
      if (ks.length === 1){ drag = null; } else if (ks.length === 2){ pinch = {d: dist(), z: z}; } lb.setPointerCapture && lb.setPointerCapture(e.pointerId); });
    function dist(){ var ks = Object.keys(pts); var a = pts[ks[0]], b = pts[ks[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
    lb.addEventListener('pointermove', function(e){ if (lensOn && e.pointerType === 'mouse') moveLens(e); var p = pts[e.pointerId]; if (!p) return;
      var dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; var ks = Object.keys(pts);
      if (ks.length === 2 && pinch){ var nz = Math.min(8, Math.max(1, pinch.z * dist() / pinch.d)); z = nz; applyZoom(); return; }
      if (Math.abs(e.clientX - p.sx) > 6 || Math.abs(e.clientY - p.sy) > 6) drag = true;
      if (z > 1){ px += dx; py += dy; applyZoom(); } });
    lb.addEventListener('pointerup', function(e){ var p = pts[e.pointerId]; delete pts[e.pointerId];
      if (p && z === 1 && Object.keys(pts).length === 0 && !pinch){ var dx = e.clientX - p.sx; if (Math.abs(dx) > 60 && group.length > 1){ show(dx < 0 ? idx + 1 : idx - 1); softPlay('pageturn', .4); } }
      if (Object.keys(pts).length < 2) pinch = null; setTimeout(function(){ drag = null; }, 50); });
    lb.addEventListener('pointercancel', function(e){ delete pts[e.pointerId]; pinch = null; });
    lb.addEventListener('dblclick', function(e){ if (z > 1) resetZoom(); else { z = 2.5; var r = img.getBoundingClientRect(); px = e.clientX - (e.clientX - r.left) * 2.5; py = e.clientY - (e.clientY - r.top) * 2.5; applyZoom(); } });
    function moveLens(e){ var r = img.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom){ lens.classList.remove('on'); return; }
      lens.classList.add('on'); lens.style.left = e.clientX + 'px'; lens.style.top = e.clientY + 'px';
      var f = 2.6, bw = r.width * f, bh = r.height * f, fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      lens.style.backgroundImage = 'url("' + img.src + '")'; lens.style.backgroundSize = bw + 'px ' + bh + 'px'; lens.style.backgroundPosition = (-(fx * bw) + 120) + 'px ' + (-(fy * bh) + 120) + 'px'; }
    lb.addEventListener('pointerleave', function(){ lens.classList.remove('on'); });
  });

  /* ---------- Tonspur: riesige Zeilen, Play-Knopf kracht, ein Player, Blatt groß dahinter, Pulsieren ---------- */
  safe(function(){
    var songs = document.querySelectorAll('.song'); if (!songs.length) return;
    var bg = document.createElement('img'); bg.className = 'songbg'; bg.alt = ''; document.body.appendChild(bg);
    var open = null;
    function stop(){ if (!open) return; var sp = open.querySelector('.spot'); sp.classList.remove('on'); setTimeout(function(){ sp.innerHTML = ''; }, 450);
      open.classList.remove('playing'); open.querySelector('.playbig').classList.remove('on'); var w = document.getElementById(open.getAttribute('data-work')); if (w) w.classList.remove('pulse');
      var sec = open.closest('section'); if (sec) sec.classList.remove('playing'); open = null; }
    songs.forEach(function(sg){
      if (MOUSE){ sg.addEventListener('mouseenter', function(){ bg.src = sg.getAttribute('data-img'); bg.classList.add('on'); }); sg.addEventListener('mouseleave', function(){ bg.classList.remove('on'); }); }
      var b = sg.querySelector('button.playbig'); if (!b) return;
      b.addEventListener('click', function(){
        if (open === sg){ softPlay('casing', .5); stop(); return; }
        if (open){ softPlay('casing', .5); stop(); }
        softPlay('boom', .55); open = sg; b.classList.add('on'); sg.classList.add('playing');
        var sp = sg.querySelector('.spot'); var f = document.createElement('iframe'); f.src = b.getAttribute('data-src'); f.title = b.getAttribute('data-title') || 'Spotify'; f.setAttribute('allow','autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'); f.setAttribute('loading','lazy');
        sp.innerHTML = ''; sp.appendChild(f); requestAnimationFrame(function(){ sp.classList.add('on'); });
        var w = document.getElementById(sg.getAttribute('data-work')); if (w) w.classList.add('pulse'); var sec = sg.closest('section'); if (sec) sec.classList.add('playing');
      });
    });
  });

  /* ---------- Stinger je Serie beim Auftakt; Atmo nur auf Knopfdruck ---------- */
  safe(function(){
    var ops = document.querySelectorAll('section.series .opener'); if (!ops.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting && e.intersectionRatio > .5 && !e.target._stung){ e.target._stung = true; if (AC) softPlay(secSound(e.target), .7); } }); }, {threshold:[.5]});
    ops.forEach(function(o){ io.observe(o); });
    var ATMO = { lickitcutit:[180, 'square', .03, 6], clickclickboom:[55, 'sawtooth', .03, .3], suchbilder:[320, 'sine', .02, .2], cowboykaugummi:[0, 'wind', .05, .1], egoshooter:[70, 'sawtooth', .03, .5],
      weitere:[0, 'wind', .03, .05], praxis:[0, 'wind', .03, .08], princeofwales:[0, 'hall', .05, 0], draugr:[0, 'wind', .06, .15], idealcity:[0, 'hall', .05, 0], prozess:[0, 'wind', .03, .05],
      pinakothek2025:[0, 'hall', .04, 0], beckmann2022:[0, 'hall', .05, 0], huelshoff2022:[0, 'wind', .05, .12], streaming:[110, 'square', .02, 8], schule:[0, 'hall', .04, 0], texte:[0, 'wind', .05, .1] };
    var running = null;
    function stopAtmo(){ if (!running) return; try { running.g.gain.setTargetAtTime(0, running.ac.currentTime, .4); running.nodes.forEach(function(n){ try { n.stop(running.ac.currentTime + 1.5); } catch(e){} }); } catch(e){} document.querySelectorAll('.atmo[data-atmo="' + running.btn.getAttribute('data-atmo') + '"]').forEach(function(x){ x.classList.remove('on'); x.textContent = 'Atmo an'; x.setAttribute('aria-pressed','false'); }); running = null; }
    function startAtmo(btn, sec){ var ac = ctx(); if (!ac) return; stopAtmo(); var p = ATMO[sec] || [0, 'wind', .04, .1];
      var g = ac.createGain(); g.gain.setValueAtTime(0, ac.currentTime); g.gain.setTargetAtTime(p[2] * 2, ac.currentTime, 1.2); g.connect(bus(ac, 'atmos')); var nodes = [];
      if (p[1] === 'wind' || p[1] === 'hall'){ var n = ac.createBufferSource(); n.buffer = noiseBuf(ac, 4); n.loop = true; var f = ac.createBiquadFilter(); f.type = p[1] === 'hall' ? 'lowpass' : 'bandpass'; f.frequency.value = p[1] === 'hall' ? 420 : 600; f.Q.value = .6;
        var l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = p[3] || .1; lg.gain.value = p[1] === 'hall' ? 150 : 400; l.connect(lg); lg.connect(f.frequency); n.connect(f); f.connect(g); if (p[1] === 'hall'){ try { f.connect(rev(ac)); } catch(e){} } n.start(); l.start(); nodes.push(n, l); }
      else { var o = ac.createOscillator(); o.type = p[1]; o.frequency.value = p[0]; var o2 = ac.createOscillator(); o2.type = p[1]; o2.frequency.value = p[0] * 1.005; var lf = ac.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 900;
        var l2 = ac.createOscillator(), lg2 = ac.createGain(); l2.frequency.value = p[3] || .3; lg2.gain.value = p[0] * .02; l2.connect(lg2); lg2.connect(o.frequency); o.connect(lf); o2.connect(lf); lf.connect(g); o.start(); o2.start(); l2.start(); nodes.push(o, o2, l2); }
      running = {ac:ac, g:g, nodes:nodes, btn:btn}; document.querySelectorAll('.atmo[data-atmo="' + sec + '"]').forEach(function(x){ x.classList.add('on'); x.textContent = 'Atmo aus'; x.setAttribute('aria-pressed','true'); }); }
    document.querySelectorAll('.atmo').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); var sec = b.getAttribute('data-atmo'); if (running && running.btn.getAttribute('data-atmo') === sec) stopAtmo(); else startAtmo(b, sec); }); });
  });

  /* ---------- Schreibmaschine im Newsletter-Feld, Menü- und Modus-Töne, Wusch bei schneller Maus ---------- */
  document.querySelectorAll('input[type=email], input[type=text], textarea').forEach(function(i){ i.addEventListener('keydown', function(e){ if (e.key.length === 1 || e.key === 'Backspace') softPlay('typewriter', .5); }); });
  (function(){ var last = null, lastW = 0; document.addEventListener('pointermove', function(e){ if (e.pointerType !== 'mouse') return; var now = performance.now(); if (last){ var v = Math.hypot(e.clientX - last.x, e.clientY - last.y) / Math.max(1, now - last.t); if (v > 3.2 && now - lastW > 900){ lastW = now; softPlay('shh', .35); } } last = {x:e.clientX, y:e.clientY, t:now}; }, {passive:true}); })();

  /* ---------- Eigener Zeiger: groß, atmet, neigt sich, Spur, Schlag, Abdruck, Lupe über Bildern, Radiergummi über Fett-Titeln ---------- */
  if (MOUSE) safe(function(){
    var h = document.documentElement; h.classList.add('cur');
    var el = document.createElement('div'); el.className = 'cur-el';
    el.innerHTML = '<img alt=""><svg class="lensc" viewBox="0 0 100 100" aria-hidden="true"><circle cx="40" cy="40" r="26" fill="rgba(255,255,255,.12)" stroke="currentColor" stroke-width="5"/><line x1="59" y1="59" x2="88" y2="88" stroke="currentColor" stroke-width="9" stroke-linecap="round"/></svg><svg class="eras" viewBox="0 0 100 100" aria-hidden="true"><rect x="18" y="34" width="64" height="32" rx="4" fill="currentColor"/><rect x="18" y="34" width="22" height="32" rx="4" fill="#fff" stroke="currentColor" stroke-width="4"/></svg>';
    document.body.appendChild(el); var im = el.querySelector('img');
    var ghosts = []; for (var k = 0; k < 4; k++){ var g = document.createElement('div'); g.className = 'cur-ghost'; g.innerHTML = '<img alt="">'; g.style.opacity = (.3 - k * .06).toFixed(2); document.body.appendChild(g); ghosts.push(g); }
    var cur = {x: -200, y: -200}, hist = [], srcSec = '', lastSrc = '';
    var SECS = ['lickitcutit','clickclickboom','suchbilder','cowboykaugummi','egoshooter','weitere','fruehe','praxis','princeofwales','texte','prozess','draugr','idealcity','auftrag','streamdrawings','pinakothek2025','beckmann2022','huelshoff2022','streaming','schule'];
    var ALIAS = {egoshooter:'clickclickboom', prozess:'comic', fruehe:'weitere', texte:'praxis', schule:'pinakothek2025'};
    function srcFor(target){ var s = target.closest ? target.closest('section[id], main.comicpage') : null; var id = s ? (s.id || 'comic') : ''; if (ALIAS[id]) id = ALIAS[id]; if (SECS.indexOf(id) < 0 && id !== 'comic') id = ''; return '../assets/' + (id ? 'cursors/' + id + '@2x.png' : 'bird.png'); }
    function setSrc(src){ if (src === lastSrc) return; lastSrc = src; im.src = src; ghosts.forEach(function(g){ g.querySelector('img').src = src; }); el.style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#E2231A'; }
    setSrc('../assets/bird.png');
    document.addEventListener('pointermove', function(e){ if (e.pointerType !== 'mouse') return; cur = {x:e.clientX, y:e.clientY, t:performance.now()}; el.classList.add('on');
      var tg = e.target; setSrc(srcFor(tg));
      var overImg = tg.closest && tg.closest('.work img, .powtiles img, .marg img, .bleed img, .powinfo img, .powlead img, .opener img');
      var overFat = tg.closest && tg.closest('.fat');
      var overText = tg.closest && tg.closest('.sertext, .bio, .notes, .legal, .einzel .side, .textblock, .cvl, .marg figcaption, .songmeta');
      el.classList.toggle('lens', !!overImg); el.classList.toggle('eras', !!overFat && !overImg); el.classList.toggle('dim', !!overText && !overImg);
      if (overImg){ overImg.style.transition = 'transform .25s'; } }, {passive:true});
    document.addEventListener('pointerleave', function(){ el.classList.remove('on'); });
    document.addEventListener('pointerdown', function(e){ if (e.pointerType !== 'mouse') return; el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); });
    var vx = 0, prev = null, rot = 0, running = false;
    /* Schleife läuft nur, solange sich die Maus bewegt (schont CPU, Screenshots bleiben möglich) */
    document.addEventListener('pointermove', function(e){ if (e.pointerType === 'mouse' && !running){ running = true; requestAnimationFrame(tick); } }, {passive:true});
    function tick(){ var now = performance.now();
      if (!cur.t || now - cur.t > 1500){ running = false; return; }
      if (prev){ var dx = cur.x - prev.x; vx = vx * .8 + dx * .2; } prev = {x:cur.x, y:cur.y};
      rot = Math.max(-28, Math.min(28, vx * 1.4));
      el.style.transform = 'translate(' + cur.x + 'px,' + cur.y + 'px) rotate(' + rot.toFixed(1) + 'deg)';
      hist.unshift({x:cur.x, y:cur.y}); if (hist.length > 24) hist.pop();
      ghosts.forEach(function(g, i){ var p = hist[Math.min(hist.length - 1, (i + 1) * 5)]; if (p) g.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px) scale(' + (1 - (i + 1) * .12) + ')'; });
      requestAnimationFrame(tick); }
  });
  /* Abdruck beim Klick (Maus) bzw. Tippen (Touch), je Serie ein Motiv, verblasst */
  safe(function(){
    var SH = { clickclickboom:'<svg viewBox="0 0 100 100"><rect x="38" y="10" width="24" height="80" rx="8" fill="currentColor"/><rect x="34" y="78" width="32" height="12" rx="3" fill="currentColor"/></svg>',
      cowboykaugummi:'<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="#f6a4c8"/><circle cx="38" cy="38" r="8" fill="#fff" opacity=".7"/></svg>',
      princeofwales:'<svg viewBox="0 0 100 100"><path d="M50 20 l-22 30 h14 v30 h16 v-30 h14z" fill="#f2b400"/></svg>',
      comic:'<svg viewBox="0 0 100 100"><path d="M20 70 Q40 20 60 55 T90 35" fill="none" stroke="#3F97B8" stroke-width="10" stroke-linecap="round"/></svg>' };
    var INK = '<svg viewBox="0 0 100 100"><path d="M50 8 C62 30 90 40 84 62 C78 86 48 92 30 78 C10 64 18 40 32 30 C40 24 44 18 50 8z" fill="currentColor"/><circle cx="72" cy="26" r="5" fill="currentColor"/><circle cx="22" cy="60" r="4" fill="currentColor"/></svg>';
    function stamp(x, y, tg){ var s = tg.closest ? tg.closest('section[id], main.comicpage') : null; var id = s ? (s.id || 'comic') : ''; if (id === 'egoshooter') id = 'clickclickboom'; if (s && s.classList.contains('comicpage')) id = 'comic';
      var d = document.createElement('div'); d.className = 'imprint'; d.innerHTML = SH[id] || INK; d.style.left = (x + window.scrollX) + 'px'; d.style.top = (y + window.scrollY) + 'px'; d.style.setProperty('--r', ((Math.random() * 60) - 30).toFixed(0) + 'deg');
      document.body.appendChild(d); setTimeout(function(){ d.remove(); }, 3300); }
    document.addEventListener('pointerdown', function(e){ if (e.button !== 0) return; if (e.target.closest && e.target.closest('.lb2, .menu, .modem, iframe, input, textarea, button, .nlpanel')) return; stamp(e.clientX, e.clientY, e.target); }, {passive:true});
  });

  /* ============================================================
     Plotter: Fließtexte als Einlinien-Schrift (Relief SingleLine, isdaT), scrollgekoppelt gezeichnet, auf Canvas
     (schnell auch auf schwachen Rechnern). Realismus (Interview 27.10., 21:00): Tintenpunkte beim Auf- und Absetzen, Duktus,
     blasser bei schnellem Scrollen, Stift gibt nach 600 bis 900 Buchstaben auf (Halt, Motorfahrt, neuer Stift mit anderem Ton),
     Betonungen mit fetterem Farbstift (Wechsel nur hörbar), Stift kratzt selten, alles leicht zufällig. Startseite: JO SEF beim Laden.
     ============================================================ */
  safe(function(){
    var targets = Array.prototype.slice.call(document.querySelectorAll('.sertext > p, .sertext > pre, .hero, .herohand, .bio, .info .contact, .cvl li span, .legal p, .credits p, p.credits, .nf p, .nf > div > p'));
    if (!targets.length || !window.fetch || !window.Path2D) return;
    var F = null, built = [], raf = false, humT = null, hum = null, lastScrollT = performance.now(), lastScrollY = window.scrollY, speed = 0;
    var rnd = Math.random, R = function(a, b){ return a + rnd() * (b - a); };
    var DPR = Math.min(2, window.devicePixelRatio || 1);
    var svgNS = 'http://www.w3.org/2000/svg';
    var meas = document.createElementNS(svgNS, 'svg'); meas.setAttribute('width', 0); meas.setAttribute('height', 0); meas.style.position = 'absolute'; meas.style.left = '-9999px';
    var mpath = document.createElementNS(svgNS, 'path'); meas.appendChild(mpath); document.body.appendChild(meas);
    var GL = {}, GH = {}, FH = null;   /* je Zeichen: Path2D, Länge, Start, Ende (Glyph-Einheiten); GH/FH = Handschrift (Betonungen, nach Dürers Briefen 1506) */
    var HAND = 1.6;   /* Handschrift: x-Höhe der Relief (545) zu Dürers Hand (300), Ober- und Unterlängen ragen in die Nachbarzeilen */
    function mk(d, a){ mpath.setAttribute('d', d); var l = mpath.getTotalLength(), s0 = mpath.getPointAtLength(0), e0 = mpath.getPointAtLength(l); return {p:new Path2D(d), d:d, a:a, l:l, s:[s0.x, s0.y], e:[e0.x, e0.y]}; }
    function glyph(ch, hand){
      if (hand && FH){
        var keys = GH['#' + ch]; if (!keys){ keys = []; for (var k in FH.g){ if (k === ch || k.indexOf(ch + '#') === 0) keys.push(k); } GH['#' + ch] = keys; }
        if (!keys.length) return glyph(ch, false);
        var key = keys[Math.floor(rnd() * keys.length)]; var gh = GH[key]; if (gh) return gh;
        var dh = FH.g[key]; if (!dh.d){ gh = {p:null, a:dh.a, hand:true, en:dh.en, ex:dh.ex}; GH[key] = gh; return gh; }
        gh = mk(dh.d, dh.a); gh.hand = true; gh.en = dh.en; gh.ex = dh.ex; gh.ap = dh.ap; if (dh.d2){ var g2 = mk(dh.d2, dh.a); gh.p2 = g2.p; gh.l2 = g2.l; gh.s2 = g2.s; gh.d2 = dh.d2; }
        GH[key] = gh; return gh; }
      var g = GL[ch]; if (g) return g; var d = F.g[ch] || F.g['?'] || {d:'',a:280}; if (!d.d){ g = {p:null, a:d.a}; GL[ch] = g; return g; }
      g = mk(d.d, d.a); GL[ch] = g; return g; }
    Promise.all([fetch('../assets/relief-lines.json').then(function(r){ return r.json(); }), fetch('../assets/duerer-hand.json').then(function(r){ return r.json(); }).catch(function(){ return null; })])
      .then(function(fs){ F = fs[0]; FH = fs[1]; buildAll(); }).catch(function(){});
    function runsOf(node, st, out){
      Array.prototype.forEach.call(node.childNodes, function(c){
        if (c.nodeType === 3){ if (c.nodeValue) out.push({t:c.nodeValue, s:st}); return; }
        if (c.nodeType !== 1) return;
        var s2 = {acc:st.acc, bold:st.bold, it:st.it, href:st.href, pf:st.pf};
        var tag = c.tagName.toLowerCase(), cl = c.className || '';
        if (tag === 'br'){ out.push({t:'\n', s:st}); return; }
        if (tag === 'sup'){ out.push({sup:c}); return; }
        if (/\bkw\b/.test(cl)) s2.acc = true; if (/\bname\b/.test(cl)) s2.bold = true;
        if (tag === 'i' || tag === 'em' || tag === 'cite') s2.it = true; if (tag === 'b' || tag === 'strong') s2.bold = true;
        if (tag === 'a'){ s2.href = c.getAttribute('href'); s2.acc = true; }
        if (/\bpfahl\b/.test(cl)) s2.pf = true;
        runsOf(c, s2, out); });
      return out; }
    function colors(el){ var cs = getComputedStyle(el); var acc = getComputedStyle(el.closest('.herohand, .comicpage') || document.documentElement).getPropertyValue('--accent').trim() || '#E2231A';
      var dark = document.documentElement.getAttribute('data-mode') === 'dunkel';
      return {ink: cs.color, acc: acc, warm: dark ? '#e3d4c2' : '#2a1c12', cool: dark ? '#c3d3e4' : '#101c2a'}; }
    function build(el){
      var hero = el.classList.contains('hero');
      var cs = getComputedStyle(el), fs = parseFloat(cs.fontSize), lh = hero ? fs * .9 : (parseFloat(cs.lineHeight) || fs * 1.42);
      var W = el.clientWidth; if (!W || W < 40) return;
      var sc = fs / F.upm, b_sc = sc, sw = hero ? Math.max(3, fs * .022) : 1.2;
      var runs = hero ? [] : runsOf(el, {}, []);
      var words = [], cur = null;
      runs.forEach(function(r){
        if (r.sup){ if (!cur){ cur = {items:[], w:0}; words.push(cur); } cur.items.push({sup:r.sup}); return; }
        var txt = r.t.replace(/\s+/g, function(m){ return m.indexOf('\n') >= 0 ? '\n' : ' '; });
        for (var i = 0; i < txt.length; i++){ var ch = txt[i];
          if (ch === ' '){ cur = null; continue; }
          if (ch === '\n'){ words.push({br:true}); cur = null; continue; }
          if (!cur){ cur = {items:[], w:0}; words.push(cur); }
          var hand = !!r.s.acc && !hero && ch !== ' '; var g = glyph(ch, hand); var kk = g.hand ? R(.95, 1.05) : 1; var s1 = (g.hand ? sc * HAND : sc) * kk; var adv = g.a * s1 * (r.s.bold && !g.hand ? 1.04 : 1);
          cur.items.push({ch:ch, g:g, adv:adv, s:r.s, sc:s1, rot:g.hand ? R(-2, 2) : 0}); cur.w += adv; }
      });
      var nGl = words.reduce(function(n, w){ return n + (w.items ? w.items.length : 0); }, 0);
      var scratch = {next:Math.round(R(60, 500)), left:0, used:0, max:Math.floor(nGl * .08)};
      var space = glyph(' ').a * sc;
      var x = 0, lines = 0, asc = F.asc * sc, base = asc + (lh - fs) / 2, lineOff = R(0, 1);
      var items = [], hitems = [], sups = [], overlays = [], hwords = [], count = 0, life = hero ? 1e9 : Math.round(R(600, 900)), pen = {tone:0, fresh:0}, prev = null, prevH = null, cum = 0, hcum = 0;
      var phase = R(0, 6.28);
      function add(it, px, py){
        var g = it.g; if (!g.p) return; var sc = it.sc || b_sc;
        var acc = !!it.s.acc, w = acc ? (g.hand ? (it.s.bold ? 2.0 : 1.8) : (it.s.bold ? 2.6 : 2.2)) : sw; count++;
        var o = R(.85, 1), wm = R(.8, 1.2), gapLen = 0, snd = null;
        if (count > life - 40 && count <= life){ var k = (count - (life - 40)) / 40; o *= 1 - .8 * k; wm *= 1 - .5 * k; }
        if (count === life){ gapLen = 900; snd = 'station'; pen.tone = (pen.tone === 0 ? (rnd() < .5 ? 1 : -1) : -pen.tone); pen.fresh = 6; life += Math.round(R(600, 900)); }
        else if (pen.fresh > 0){ wm *= 1.5; o = 1; pen.fresh--; }
        var scr = false;
        if (!hero && !g.hand){ if (scratch.left > 0){ scr = true; scratch.left--; scratch.used++; } else if (count >= scratch.next && scratch.used < scratch.max){ scratch.left = Math.round(R(2, 8)) - 1; scr = true; scratch.used++; scratch.next = count + Math.round(R(300, 500)); } }
        var skew = (it.s.it && !g.hand ? -9 : 0) + R(-1, 1);
        /* Handschrift (Betonungen): wird ausgelassen und am Ende des Absatzes in Rot nachgetragen; Grundlinie wellt, Buchstaben verbunden */
        var list = g.hand ? hitems : items, pv = g.hand ? prevH : prev, cc = g.hand ? hcum : cum;
        var path = g.p, len = g.l, gs = g.s, ge = g.e;
        if (g.hand){ py += (Math.sin(px / (fs * 2.2) + phase) * 70 + R(-45, 45)) * sc;
          if (pv && !pv.wordEnd && g.ap && pv.exy > 180 && g.p2){ path = g.p2; len = g.l2; gs = g.s2; } }
        var start = [px + gs[0] * sc, py - gs[1] * sc], end = [px + ge[0] * sc, py - ge[1] * sc];
        if (g.hand && pv && !pv.wordEnd){
          var tgt = (path === g.p2) ? [px + g.ap[0] * sc, py - g.ap[1] * sc] : [px + g.en[0] * sc, py - g.en[1] * sc];
          var lx = (tgt[0] - pv.end[0]) / sc, ly = -(tgt[1] - pv.end[1]) / sc, ll = Math.hypot(lx, ly);
          if (ll > 2 && ll < 900){ var ld = 'M0 0L' + lx.toFixed(1) + ' ' + ly.toFixed(1);
            list.push({g:{p:new Path2D(ld), l:ll, d:ld}, x:pv.end[0], y:pv.end[1], sc:sc, skew:0, w:w * .8, o:o * .9, acc:true, hand:true, tone:0, scr:false, dash:null, len:ll, cum:cc, start:pv.end, end:tgt, d1:[0,0,0,0], d2:[0,0,0,0], bleed:null, pf:false, href:null, adv:0, link:true}); cc += ll; }
          if (path === g.p2){ start = tgt; } }
        else { gapLen += (pv ? R(10, 40) : 0) + (pv && pv.wordEnd ? R(20, 120) : 0); }
        if (gapLen){ list.push({gap:true, len:gapLen, snd:snd, at:pv ? pv.end : start, cum:cc}); cc += gapLen; }
        var item = {g:{p:path, l:len, a:g.a, d:(path === g.p2 ? g.d2 : g.d)}, x:px, y:py, sc:sc, skew:skew, rot:it.rot || 0, w:w * wm, o:o, acc:acc, hand:!!g.hand, exy:g.hand ? g.ex[1] : 0, tone:acc ? 0 : pen.tone, scr:scr, dash:null, len:len, cum:cc, start:start, end:end,
          d1:[start[0] + R(-.3, .3), start[1] + R(-.3, .3), w * wm * R(.8, 1.2), R(.7, 1)], d2:[end[0] + R(-.3, .3), end[1] + R(-.3, .3), w * wm * R(.8, 1.2), R(.7, 1)],
          bleed: rnd() < (g.hand ? .05 : .025) ? [start[0] + R(-1, 1), start[1] + R(-1, 1), w * wm * R(1.4, 2), R(.25, .45)] : null, pf: !!it.s.pf, href: it.s.href || null, adv: it.adv};
        if (g.hand){ item.d1 = [start[0], start[1], w * wm * R(.9, 1.3), R(.8, 1)]; }
        if (scr){ var da = [], tot = 0; while (tot < g.l){ var on = R(.3, 1.6) / sc, off = R(.6, 3) / sc; da.push(on, off); tot += on + off; } item.dash = da; item.oScr = R(.6, .9); }
        list.push(item); cc += len;
        if (g.hand){ prevH = item; hcum = cc; } else { prev = item; cum = cc; }
      }
      /* Hero: das Monogramm JK (nach Dürers AD) als Einlinie, groß geplottet */
      if (hero && window.JK_MONO){ var M = window.JK_MONO, msc = (lh * 2) / M.h, mx = 2, my = M.h * msc + 2;
        M.lines.forEach(function(line, li){ var pts = line.map(function(q){ return [q[0], M.h - q[1]]; }); var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1), l = 0;
          for (var i = 1; i < pts.length; i++){ d += 'L' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1); l += Math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]); }
          var st = [mx + pts[0][0] * msc, my - pts[0][1] * msc], en = [mx + pts[pts.length-1][0] * msc, my - pts[pts.length-1][1] * msc];
          if (li){ items.push({gap:true, len:300, at:prev ? prev.end : st, cum:cum}); cum += 300; }
          var it = {g:{p:new Path2D(d), l:l, d:d, a:0}, x:mx, y:my, sc:msc, skew:0, rot:0, w:sw * 1.7, o:1, acc:false, hand:false, tone:0, scr:false, dash:null, len:l, cum:cum, start:st, end:en, d1:[st[0], st[1], sw * .9, .9], d2:[en[0], en[1], sw * .9, .9], bleed:null, pf:false, href:null, adv:0};
          items.push(it); cum += l; prev = it; });
        lines = 1; }
      words.forEach(function(w){
        if (w.br){ x = 0; lines++; lineOff = R(0, 1); return; }
        if (x > 0 && x + w.w > W){ x = 0; lines++; lineOff = R(0, 1); }
        var wx0 = x + lineOff, wy = lines * lh;
        w.items.forEach(function(it){
          if (it.sup){ sups.push({el:it.sup, x:x + lineOff, y:wy}); x += fs * .55; return; }
          add(it, x + lineOff, wy + base); x += it.adv; });
        var fi = w.items.filter(function(i){ return !i.sup; })[0];
        if (fi && (fi.s.href || fi.s.pf)) overlays.push({x:wx0, y:wy, w:x - wx0, h:lh, href:fi.s.href, pf:fi.s.pf});
        if (fi && fi.g && fi.g.hand && !hero) hwords.push({x:wx0, y:wy, w:x - wx0, h:lh, txt:w.items.filter(function(i){ return !i.sup; }).map(function(i){ return i.ch; }).join(''), base:base});
        if (prev) prev.wordEnd = true; if (prevH) prevH.wordEnd = true;
        x += space;
      });
      lines++;
      /* Nachtrag: Federwechsel, dann alle Betonungen in Rot über dem Grau */
      if (hitems.length){ items.push({gap:true, len:900, snd:'feder', at:prev ? prev.end : [0, 0], cum:cum}); cum += 900; var off = cum; hitems.forEach(function(h){ h.cum += off; items.push(h); }); cum += hcum; }
      var H = hero && window.JK_MONO ? lh * 2 + 4 : lines * lh;
      var cv = document.createElement('canvas'); cv.className = 'plot' + (hero ? ' plothero' : ''); cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = 0; cv.height = 0;
      var lv = document.createElement('canvas'); lv.className = 'plot live'; lv.style.width = W + 'px'; lv.style.height = H + 'px'; lv.width = 0; lv.height = 0;
      var keep = document.createElement('span'); keep.className = 'vh plotsrc';
      while (el.firstChild) keep.appendChild(el.firstChild);
      el.appendChild(keep); el.appendChild(cv); el.appendChild(lv); el.classList.add('plotted'); el.style.minHeight = H + 'px';
      sups.forEach(function(s){ s.el.classList.add('plotsup'); s.el.style.left = s.x + 'px'; s.el.style.top = s.y + 'px'; el.appendChild(s.el); });
      /* Links und Felix Pfahl als unsichtbare Flächen über dem Canvas */
      overlays.forEach(function(o){ var a = document.createElement(o.href ? 'a' : 'span'); a.className = 'plotlink' + (o.pf ? ' pfahl2' : ''); if (o.href) a.href = o.href; a.style.left = o.x + 'px'; a.style.top = o.y + 'px'; a.style.width = o.w + 'px'; a.style.height = o.h + 'px'; el.appendChild(a);
        if (o.pf){ a.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse' && window.JK_PFAHL) window.JK_PFAHL.on(e); }); a.addEventListener('pointermove', function(e){ if (e.pointerType === 'mouse' && window.JK_PFAHL) window.JK_PFAHL.move(e); }); a.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse' && window.JK_PFAHL) window.JK_PFAHL.off(); }); a.addEventListener('click', function(e){ if (window.JK_PFAHL){ window.JK_PFAHL.on(e); setTimeout(function(){ window.JK_PFAHL.off(); }, 8000); } }); } });
      hwords.forEach(function(hw){ var a = document.createElement('span'); a.className = 'plothand'; a.style.left = hw.x + 'px'; a.style.top = (hw.y - lh * .55) + 'px'; a.style.width = hw.w + 'px'; a.style.height = (lh * 1.9) + 'px';
        var t = document.createElement('b'); t.className = 'plothand-w'; t.textContent = hw.txt; t.style.top = (lh * .55 + hw.base - fs * .78) + 'px'; a.appendChild(t); el.appendChild(a);
        a.addEventListener('pointerenter', function(e){ if (e.pointerType !== 'mouse') return; a.classList.add('on'); spritePlay('feder', {vol:.9, max:.3, x:e.clientX, force:true}); }); a.addEventListener('pointerleave', function(){ a.classList.remove('on'); }); });
      built.push({el:el, cv:cv, lv:lv, W:W, H:H, sc:sc, items:items, total:cum, hero:hero, done:0, t0:hero ? performance.now() : 0, f:-1, played:{}, col:colors(el), alive:false, dirty:true});
    }
    window.JK_PLOT_ONCE = function(el, ms){ if (!F || !el || el.classList.contains('plotted')) return; try { build(el); } catch(e){ return; } var b = built[built.length - 1]; if (!b || b.el !== el) return; b.hero = true; b.t0 = performance.now(); b.ms = ms || 900; update(); };
    function unbuild(b){ var src = b.el.querySelector('.plotsrc'); b.el.querySelectorAll('.plotsup').forEach(function(s){ s.classList.remove('plotsup'); s.style.left = s.style.top = ''; src.appendChild(s); }); b.el.querySelectorAll('.plotlink,.plothand').forEach(function(a){ a.remove(); }); b.cv.remove(); b.lv.remove(); if (src){ while (src.firstChild) b.el.appendChild(src.firstChild); src.remove(); } b.el.classList.remove('plotted'); b.el.style.minHeight = ''; }
    function buildAll(){ built.forEach(unbuild); built = []; targets.forEach(function(el){ try { build(el); } catch(e){ try { console.warn('plot', e); } catch(_){} } }); update(); }
    function strokeItem(c, b, it, d){ /* einen Glyph (ganz oder teilweise) auf einen Kontext zeichnen */
      var col = b.col, sc = it.sc || b.sc, full = d >= it.len, stroke = it.acc ? col.acc : (it.tone > 0 ? col.warm : (it.tone < 0 ? col.cool : col.ink));
      if (it.o0 === undefined) it.o0 = speed > 2.2 ? R(.45, .65) : 1;
      c.setTransform(DPR * sc, 0, Math.tan(it.skew * Math.PI / 180) * -DPR * sc, -DPR * sc, it.x * DPR, it.y * DPR);
      if (it.rot) c.rotate(-it.rot * Math.PI / 180);
      c.strokeStyle = stroke; c.lineWidth = it.w / sc; c.globalAlpha = it.o * it.o0 * (full && it.scr ? it.oScr : 1); c.lineCap = 'round'; c.lineJoin = 'round';
      if (full && it.scr){ c.setLineDash(it.dash); c.lineDashOffset = 0; } else { c.setLineDash([it.len, it.len + 2]); c.lineDashOffset = full ? 0 : (it.len - d); }
      c.stroke(it.g.p);
      c.setTransform(DPR, 0, 0, DPR, 0, 0); c.setLineDash([]); c.fillStyle = stroke;
      c.globalAlpha = it.d1[3] * it.o0; c.beginPath(); c.arc(it.d1[0], it.d1[1], it.d1[2], 0, 6.283); c.fill();
      if (it.bleed){ c.globalAlpha = it.bleed[3]; c.beginPath(); c.arc(it.bleed[0], it.bleed[1], it.bleed[2], 0, 6.283); c.fill(); }
      if (full){ c.globalAlpha = it.d2[3] * it.o0; c.beginPath(); c.arc(it.d2[0], it.d2[1], it.d2[2], 0, 6.283); c.fill(); }
      c.globalAlpha = 1; }
    function travelTo(c, b, i){ var it = b.items[i], pr = null; for (var k = i - 1; k >= 0; k--){ if (!b.items[k].gap){ pr = b.items[k]; break; } }
      if (!pr) return; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.globalAlpha = .14; c.strokeStyle = b.col.ink; c.lineWidth = .6; c.setLineDash([]); c.beginPath(); c.moveTo(pr.end[0], pr.end[1]); c.lineTo(it.start[0], it.start[1]); c.stroke(); c.globalAlpha = 1; }
    function draw(b){
      /* Grundlage: fertige Glyphen bleiben stehen (nur neue dazu); Live-Lage: der laufende Strich und der Stift */
      var cv = b.cv, lv = b.lv; if (!b.alive){ cv.width = Math.round(b.W * DPR); cv.height = Math.round(b.H * DPR); lv.width = cv.width; lv.height = cv.height; b.alive = true; b.done = 0; }
      var c = cv.getContext('2d'), L = lv.getContext('2d');
      var D = b.f * b.total, items = b.items, n = items.length;
      /* wie viele Einträge sind vollständig? */
      var done = 0; while (done < n && D - items[done].cum >= items[done].len) done++;
      if (done < b.done){ /* rückwärts: nur die betroffenen Glyphen löschen, Nachbarn nachziehen (schnell) */
        if (b.done - done > 400){ c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); b.done = 0; }
        else { c.setTransform(DPR, 0, 0, DPR, 0, 0); for (var k = b.done - 1; k >= done; k--){ var g = items[k]; if (g.gap) continue; c.clearRect(g.x - 4, g.y - b.sc * F.asc - 6, g.adv + 8, b.sc * (F.asc - F.desc) + 12); }
          for (var m = Math.max(0, done - 3); m < done; m++){ if (!items[m].gap){ travelTo(c, b, m); strokeItem(c, b, items[m], items[m].len); } } b.done = done; } }
      for (var i = b.done; i < done; i++){ var it = items[i]; if (it.hand && !it.link && AC && b.fwd && Math.random() < .35) spritePlay('feder', {vol:.5, max:.35, x:it.x}); if (it.gap){ if (it.snd && b.fwd && !b.played[i]){ b.played[i] = true; if (AC) penSound(it.snd); } continue; } travelTo(c, b, i); strokeItem(c, b, it, it.len); }
      b.done = done;
      L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, lv.width, lv.height);
      var penAt = null;
      if (done < n){ var cur = items[done], d = D - cur.cum;
        if (cur.gap){ if (d > 0) penAt = cur.at; if (cur.snd && d > 0 && b.fwd && !b.played[done]){ b.played[done] = true; if (AC) penSound(cur.snd); } }
        else if (d > 0){ travelTo(L, b, done); strokeItem(L, b, cur, d); mpath.setAttribute('d', cur.g.d); var pt = mpath.getPointAtLength(d); penAt = [cur.x + pt.x * (cur.sc || b.sc), cur.y - pt.y * (cur.sc || b.sc)]; } }
      for (var j = done; j < n; j++) if (D - items[j].cum <= 0 && items[j].gap) b.played[j] = false;
      if (penAt){ L.setTransform(DPR, 0, 0, DPR, 0, 0); L.globalAlpha = 1; L.fillStyle = b.col.acc; L.beginPath(); L.arc(penAt[0], penAt[1], b.hero ? 6 : 3, 0, 6.283); L.fill(); }
    }
    function update(){ raf = false; var vh = window.innerHeight, moved = false, now = performance.now();
      var dy = Math.abs(window.scrollY - lastScrollY), dt = Math.max(1, now - lastScrollT); speed = speed * .6 + (dy / dt) * .4; lastScrollY = window.scrollY; lastScrollT = now;
      built.forEach(function(b){ var r = b.el.getBoundingClientRect();
        if (r.bottom < -vh * 2 || r.top > vh * 3){ if (b.alive && !b.hero){ b.cv.width = 0; b.cv.height = 0; b.lv.width = 0; b.lv.height = 0; b.alive = false; b.dirty = true; } return; }   /* weit weg: Speicher frei */
        var f;
        if (b.hero){ f = Math.min(1, (now - b.t0) / (b.ms || 2800)); if (f < 1) moved = true; }
        else { f = Math.min(1, Math.max(0, (vh * .92 - r.top) / (r.height + vh * .3))); }
        if (REDUCED) f = 1;
        if (f !== b.f || b.dirty){ b.fwd = f > b.f; moved = moved || f !== b.f; b.f = f; b.dirty = false; if (r.bottom > -vh && r.top < vh * 2) draw(b); else b.dirty = true; } });
      if (moved && AC){ if (SPR.plotter && SPR.plotter.buf) plotterLoop(true); else { spriteLoad('plotter'); humOn(); } }
      if (built.some(function(b){ return b.hero && b.f < 1; })){ if (!raf){ raf = true; requestAnimationFrame(update); } } }
    function penSound(kind){ var ac = ctx(); if (!ac) return; var t = ac.currentTime + .01; vary(); V.len = 1; V.vol = .8;
      if (kind === 'feder' && SPR.feder && SPR.feder.buf){ spritePlay('feder', {vol:1.1, force:true}); spritePlay('plotter', {vol:.6, max:.25, semi:-5}); return; } if (kind === 'feder') spriteLoad('feder');
      if (kind === 'swap' && SPR.plotter && SPR.plotter.buf){ spritePlay('plotter', {vol:.8, max:.3, force:true}); return; }
      if (kind === 'swap'){ [0, .09].forEach(function(dt){ noise(ac, t + dt, .025, .5, 'lowpass', 900, 1, .025); osc(ac, 'square', 180, t + dt, .03, .25); }); }
      else if (kind === 'feder'){ /* Feder wird aufgenommen und eingetaucht: Klirren, Tropfen, Kratzen */ noise(ac, t, .05, .35, 'highpass', 2600, 1, .05); osc(ac, 'triangle', 1900, t + .06, .05, .12, .002); noise(ac, t + .18, .22, .4, 'bandpass', 3200, 3, .1); }
      else { var n = 9; for (var k = 0; k < n; k++){ osc(ac, 'square', 70 + k * 4, t + k * .035, .02, .14); } noise(ac, t + .34, .04, .5, 'lowpass', 700, 1, .04); osc(ac, 'sine', 60, t + .34, .12, .45, .004); noise(ac, t + .5, .03, .4, 'lowpass', 900, 1, .03); } }
    function humOn(){ var ac = ctx(); if (!ac) return; if (!hum){ var o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 55; var o2 = ac.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 110.5;
        var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 2; var g = ac.createGain(); g.gain.value = 0; o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(OUT(ac));
        var n = ac.createBufferSource(); n.buffer = noiseBuf(ac, 2); n.loop = true; var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 6; var ng = ac.createGain(); ng.gain.value = .25; n.connect(bp); bp.connect(ng); ng.connect(g); o.start(); o2.start(); n.start(); hum = {g:g, ac:ac}; }
      hum.g.gain.setTargetAtTime(.06 * V.vol, hum.ac.currentTime, .05); clearTimeout(humT); humT = setTimeout(function(){ hum.g.gain.setTargetAtTime(0, hum.ac.currentTime, .12); }, 220); }
    window.addEventListener('scroll', function(){ if (!raf){ raf = true; requestAnimationFrame(update); } }, {passive:true});
    var rs = null; window.addEventListener('resize', function(){ clearTimeout(rs); rs = setTimeout(function(){ if (F) buildAll(); }, 250); });
    document.querySelectorAll('.modes button').forEach(function(bt){ bt.addEventListener('click', function(){ setTimeout(function(){ built.forEach(function(b){ b.col = colors(b.el); b.done = 0; if (b.alive){ var c = b.cv.getContext('2d'); c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,b.cv.width,b.cv.height); } b.dirty = true; }); update(); }, 30); }); });
    document.addEventListener('pointerdown', function(){ if (built.some(function(b){ return b.hero && b.f < 1; })) requestAnimationFrame(update); }, {passive:true});
  });
})();
