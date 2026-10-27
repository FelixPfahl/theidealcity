/* Josef Knoll, Portfolio: Spielereien. Kein Framework, keine Audiodateien (alles Web Audio). */
(function(){
  var T = window.JK_STRINGS || {};
  var lang = document.documentElement.lang || 'de';

  /* ---------- Sichtbar werden ---------- */
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} }); }, {rootMargin:'0px 0px -5% 0px'});
    document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
  } else { document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('in'); }); }

  /* ---------- Titel wechselt ---------- */
  var titles = [document.title, 'JO', 'SEF', document.title];
  var ti = 0; setInterval(function(){ if(document.hidden){ ti=(ti+1)%titles.length; document.title = titles[ti]; } else { document.title = titles[0]; } }, 1500);

  /* ---------- Regler-Werte (Josef, 27.10.): jede*r stellt selbst ein. Gespeichert wird nur, wenn jemand den Regler bewegt
     (localStorage jk_fx, vom Nutzer ausdrücklich gewünscht, § 25 Abs. 2 Nr. 2 TDDDG). Sonst speichert die Seite nichts. ---------- */
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var FX_DEFAULT = {ton:3, vol:80, anim:25, bild:65, farbe:50, still:REDUCED, modem:true};
  var FX = {}; for (var k0 in FX_DEFAULT) FX[k0] = FX_DEFAULT[k0];
  try { var saved = JSON.parse(localStorage.getItem('jk_fx') || 'null'); if (saved) for (var k1 in saved) if (k1 in FX) FX[k1] = saved[k1]; } catch(e){}
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
  function play(name){ var ac=ctx(); if(!ac||!SND[name]) return; if(name!=='pfahl') vary(); else { V.cents=0; V.len=1; V.vol=1; } SND[name](ac, ac.currentTime+.005); }
  function clickSound(target){
    var el = target && target.closest ? target.closest('[data-sounds]') : null;
    var list = el ? el.getAttribute('data-sounds').split(',') : DEFAULT;
    var name = list[Math.floor(Math.random()*list.length)];
    if (list.length > 1 && name === lastName) name = list[(list.indexOf(name)+1) % list.length];   /* nie zweimal hintereinander derselbe */
    lastName = name; play(name);
  }
  /* Zufall je Klick (Josef, 27.10.): Ton nach FX.ton (Standard alle 2 bis 5 Klicks, nie zweimal direkt hintereinander),
     sonst Animation mit FX.anim Prozent, Rest nichts. Bilder, die sich öffnen, haben ihren eigenen Knaller (workPop). */
  var untilSound = nextGap();
  var WORKSEL = '.work a[data-full], .powgrid a[data-full], .powtiles a[data-full], .powinfo a[data-full], .powlead a[data-full]';
  document.addEventListener('pointerdown', function(e){ if(e.button!==0) return; if(e.target.closest && e.target.closest('.modem, iframe, .pfahl, .lb, .fxpanel, .fxknob, .nlform')) return;
    var isWork = e.target.closest && e.target.closest(WORKSEL);
    if (--untilSound <= 0){ untilSound = nextGap(); clickSound(e.target); return; }
    if (!isWork && !FX.still && Math.random()*100 < FX.anim) randomAnim(e); }, true);
  /* Schnelles Mehrfachklicken (wegen der Klänge) markiert keinen Text außerhalb von Fließtext */
  document.addEventListener('mousedown', function(e){ if(e.detail>1 && !(e.target.closest && e.target.closest('p, li, pre, blockquote, input, textarea, .sertext, .notes'))) e.preventDefault(); });
  /* Handy: Audio beim ersten Antippen freischalten (iOS) */
  ['touchend','click'].forEach(function(ev){ document.addEventListener(ev, function(){ ctx(); }, {passive:true}); });
  var ANIMS = [function(e){ textPop(e, e.target); }];
  function randomAnim(e){ try{ ANIMS[Math.floor(Math.random()*ANIMS.length)](e); }catch(err){} }
  /* Spotify erst auf Klick laden (Datenschutz) */
  document.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('.spot button'); if(!b) return; var box = b.parentNode; var f = document.createElement('iframe'); f.src = box.getAttribute('data-src'); f.title = box.getAttribute('data-title')||'Spotify'; f.setAttribute('allow','autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'); f.setAttribute('loading','lazy'); box.innerHTML=''; box.appendChild(f); });

  /* ---------- Schrift-Knaller in Dürer-Schrift, frei nach Erik Carter (Design Harder): gestreckt, gestaucht, gespiegelt, Kontur, Echo;
     dazu Comicsprache (Explosionsstern, Rasterpunkte, Speedlines), Fehldruck, fliegende, fallende und wellende Buchstaben, Schnitt, Zoom, Druckwelle.
     Farben: Zinnoberrot und Non-Photo-Blau (Mischung über den Regler), selten Schwarz (Josef, 27.10.) ---------- */
  var BOOMS = ['BOOM','KA-BOOM','KRAWUMM','BAMM','PENG','RUMMS','PAFF','BUMM','BLAM','PUFF','ZISCH','WUMMS','KABUMM','KNALL','KRACH','KLICK'];
  var WORDS = {
    lickitcutit:['LICK','CUT','SNIP','SCHNITT','LICK IT','CUT IT','RITSCH','SCHNIPP'],
    clickclickboom:['CLICK','KLICK','BOOM','PENG','KA-BOOM','KLICK KLICK','BOOM?','PFFT','RATTATA','BAMM','PUFF','KRAWUMM','ZONK','KLICK?','DUD','BOOM!!!'],
    suchbilder:['AHA!','WO?','DA!','GEFUNDEN','HM?','HIER!','NEIN','DOCH'], cowboykaugummi:['PLOPP','YEEHAW','BLUBB','KAU KAU','SPUCK','BLOPP','HUI'],
    egoshooter:['PEW','PEW PEW','RELOAD','GAME OVER','1UP','LEVEL UP','HEADSHOT','RESPAWN'], weitere:['RATSCH','KRITZEL','RADIER','SPITZ','SCHRAFF','WISCH'],
    praxis:['PUNKT','LINIE','FLUCHT','PUNKT.','RASTER','LOT','MASS'], draugr:['GRAAH','HEL','KNACK','UUUH','WALHALL','RAAH'],
    idealcity:['TUUT','PLATSCH','WUSCH','AHOI','BLUBB'], prozess:['SKIZZE','TUSCHE','RADIER','FERTIG?','NOCHMAL','LAYOUT'],
    pinakothek2025:['PSST','SCHAU','AH','OH','HUCH','WOW'], beckmann2022:['TJA','TJA.','HM','AHOI','TJA?','ABFAHRT'],
    huelshoff2022:['KNARZ','UHU','PSST','HUI','KNISTER'], streaming:['LIVE','PING','HI CHAT','GG','POG'], schule:['RUHE!','PAUSE','HA!','NOCHMAL','GONG'],
    princeofwales:['QUAK','QUAK QUAK','PRINCE','QUAAAK','PLATSCH'], texte:['TAPP','TAPP TAPP','WEITER','PUH','SCHRITT'],
    _:['CLICK','BOOM','ZACK','BÄM','WUMM','HUI','PENG','KNALL','KRACH','ZONK','PFFT','RUMMS','HOPPLA','UFF','TADA']
  };
  var STYLES = ['tall','wide','mirror','outline','echo','stack','skew','giant','block','turn','squash','tilt',
                'burst','dots','lines','misreg','vertical','zoom','scatter','rain','wave','split','ring'];
  var RED = '#E2231A', NPB = '#A4DDED';
  var lastW = '', lastSt = '';
  function pickOne(a, not){ var v = a[Math.floor(Math.random()*a.length)]; if (a.length > 1 && v === not) v = a[(a.indexOf(v)+1) % a.length]; return v; }
  function secOf(el){ var s = el && el.closest ? el.closest('section.series, .powlead, main') : null; if(s && s.id) return s.id; if(document.querySelector('main.comicpage')) return 'draugr'; return '_'; }
  function colours(){ /* [Hauptfarbe, Gegenfarbe, Schrift auf Fläche] */
    var r = Math.random(); if (r < .08) return ['#000', RED, '#fff'];
    return (Math.random()*100 < FX.farbe) ? [NPB, RED, '#000'] : [RED, NPB, '#fff'];
  }
  function textPop(ev, el, word, boomy){
    if (FX.still) return;
    var list = WORDS[secOf(el)] || WORDS._;
    if (boomy) list = list.concat(BOOMS);
    var w = word || pickOne(list, lastW); lastW = w;
    var st = pickOne(STYLES, lastSt); lastSt = st;
    var c = colours();
    var tag = document.createElement('div'); tag.className = 'tp tp-'+st; tag.setAttribute('aria-hidden','true');
    tag.style.setProperty('--c1', c[0]); tag.style.setProperty('--c2', c[1]); tag.style.setProperty('--bt', c[2]);
    var life = 1650;
    function span(txt){ var s = document.createElement('span'); s.textContent = txt; tag.appendChild(s); return s; }
    if (st==='stack'){ for (var i=0;i<4;i++) span(w); }
    else if (st==='split'){ span(w); span(w); }
    else if (st==='scatter' || st==='rain' || st==='wave'){
      w.split('').forEach(function(ch, k){ var s = span(ch===' ' ? ' ' : ch);
        if (st==='scatter'){ var a = Math.random()*Math.PI*2, d = 1.4 + Math.random()*2.6;
          s.style.setProperty('--dx', (Math.cos(a)*d).toFixed(2)+'em'); s.style.setProperty('--dy', (Math.sin(a)*d).toFixed(2)+'em'); s.style.setProperty('--rr', ((Math.random()*2-1)*540).toFixed(0)+'deg'); }
        else s.style.animationDelay = (k*(st==='rain' ? .07 : .1)).toFixed(2)+'s'; });
      if (st==='rain'){ life = 1900 + w.length*70; tag.style.animationDuration = (life/1000)+'s'; }
      if (st==='wave') life = 2050;
    }
    else if (st==='ring'){ life = 1300; }
    else tag.textContent = w;
    var x = (ev && ev.clientX) || (window.innerWidth/2), y = (ev && ev.clientY) || (window.innerHeight/2);
    /* manchmal größer (Josef, 27.10.): meist etwas größer als früher, jedes vierte Mal groß, selten riesig in der Bildmitte */
    var kr = Math.random(), k = kr < .08 ? 2.6 : (kr < .3 ? 1.7 : 1);
    if (st==='giant' || st==='zoom'){ k = 1; }
    if (st==='giant' || st==='zoom' || k > 2){ x = window.innerWidth/2; y = window.innerHeight/2; }
    if (st!=='ring') tag.style.setProperty('--k', k);
    tag.style.left = x+'px'; tag.style.top = y+'px'; tag.style.setProperty('--r', ((Math.random()*28)-14).toFixed(1)+'deg');
    document.body.appendChild(tag); setTimeout(function(){ tag.remove(); }, life);
    if (st!=='ring' && (k > 1.5 || /BOOM|KNALL|PENG|GAME OVER|KRAWUMM|KABUMM|BAMM|RUMMS|KRACH/.test(w)) && Math.random() < .6){ var sh = document.querySelector('main') || document.body; sh.classList.add('shake'); setTimeout(function(){ sh.classList.remove('shake'); }, 950); }
  }
  /* Knaller beim Öffnen eines Bildes: mit FX.bild Prozent, sonst gar nichts; Wörter aus dem Abschnitt plus Comic-Knallwörter */
  function workPop(ev, el){ if (Math.random()*100 >= FX.bild) return; textPop(ev, el, null, true); }

  /* sanftes Ein- und Ausblenden der Großansicht */
  function lbOpen(el){ el.classList.add('on'); document.body.style.overflow='hidden'; requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.classList.add('show'); }); }); }
  function lbClose(el, done){ el.classList.remove('show'); setTimeout(function(){ el.classList.remove('on'); document.body.style.overflow=''; if(done) done(); }, 300); }
  /* ---------- Lightbox: nur das angeklickte Bild, kein Karussell (Josef, 27.10.) ---------- */
  var works = Array.prototype.slice.call(document.querySelectorAll('.work a[data-full], .powgrid a[data-full], .powtiles a[data-full], .powinfo a[data-full], .powlead a[data-full]'));
  if (works.length){
    var lb = document.createElement('div'); lb.className='lb';
    lb.innerHTML = '<button class="x" aria-label="'+(T.close||'Schließen')+'" title="'+(T.close||'Schließen')+'">&times;</button><img alt=""><div class="cap"></div>';
    document.body.appendChild(lb);
    var img = lb.querySelector('img'), cap = lb.querySelector('.cap');
    function show(a){ img.src=a.getAttribute('data-full'); img.alt=a.getAttribute('data-alt')||''; var fc=a.parentNode.querySelector('figcaption'); cap.innerHTML=fc? fc.innerHTML : ''; lbOpen(lb); }
    function hide(){ lbClose(lb, function(){ img.removeAttribute('src'); }); }
    works.forEach(function(a){ a.addEventListener('click', function(ev){ ev.preventDefault(); workPop(ev, a); show(a); }); });
    lb.querySelector('.x').onclick=hide;
    lb.addEventListener('click', function(e){ if(e.target===lb || e.target===img) hide(); });
    document.addEventListener('keydown', function(e){ if(lb.classList.contains('on') && e.key==='Escape') hide(); });
  }

  /* ---------- Felix Pfahl: Gesicht aus dem Holzschnitt, unheimlicher Ton ---------- */
  var pf = document.querySelectorAll('.pfahl');
  if (pf.length){
    var face = document.createElement('img'); face.id='pfahlface'; face.src='../assets/pfahl-face.png'; face.alt=''; document.body.appendChild(face);
    var pfTimer = null;
    function moveFace(e){ face.style.left=e.clientX+'px'; face.style.top=e.clientY+'px'; }
    var pfHide = null;
    var touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
    var pfGone = null;
    function faceOff(){ /* sehr langsam ausfaden (6 s), der Ton klingt mit Hall aus */
      clearInterval(pfTimer); pfTimer=null; clearTimeout(pfHide);
      if(!face.classList.contains('on') || face.classList.contains('fade')) return;
      face.classList.add('fade'); clearTimeout(pfGone); pfGone=setTimeout(function(){ face.classList.remove('on','fade'); }, touch ? 9500 : 6500); }
    function faceOn(e){ moveFace(e); clearTimeout(pfGone); face.classList.remove('fade'); face.classList.add('on'); play('pfahl'); clearInterval(pfTimer); pfTimer=setInterval(function(){ play('pfahl'); }, 3300); }
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
    var t = t0 + .1;
    tone(350, t, .9, .18); tone(440, t, .9, .18); t += 1.0;
    var dtmf = [[697,1209],[770,1336],[852,1477],[697,1336],[941,1336],[770,1209],[852,1336]];
    dtmf.forEach(function(p){ tone(p[0], t, .12, .22); tone(p[1], t, .12, .22); t += .19; });
    t += .3; tone(425, t, .8, .15); t += 1.3;
    tone(2100, t, .9, .22); t += 1.0;
    tone(1800, t, .35, .2); tone(2250, t+.35, .35, .2); t += .75;
    for (var k=0;k<6;k++){ tone(1200+Math.random()*900, t, .08, .18, 'square'); t += .1; }
    nz(t, 1.2, .25, 2200); tone(1650, t, .6, .12); t += 1.25;
    nz(t, 1.4, .3, 1200); t += 1.45;
    tone(1000, t, .18, .25, 'square'); tone(1500, t+.2, .18, .25, 'square'); t += .5;
    var total = (t - t0) * 1000;
    setTimeout(onDone, total);
    return total;
  }

  /* ---------- Modem-Overlay beim ersten Klick auf einen Link ----------
     Ohne Speicher (cookiefrei): nur wer von außen kommt (Verweis von einer anderen Seite oder direkt), bekommt das Intro.
     Über den Regler abschaltbar. */
  var fromInside = false;
  try { fromInside = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch(e){}
  if (!fromInside && FX.modem){
    var ov = document.createElement('div'); ov.className='modem';
    ov.innerHTML = '<div class="box"><pre></pre><div class="bar"><i></i></div><button type="button">'+(T.skip||'Überspringen')+'</button>'+(T.modem_hint?'<small>'+T.modem_hint+'</small>':'')+'</div>';
    document.body.appendChild(ov);
    var pre = ov.querySelector('pre'), bar = ov.querySelector('.bar i'), skipBtn = ov.querySelector('button');
    var lines = ['ATZ','OK','ATDT 0049 89 56000','',(T.connecting||'CONNECTING')+' ...','CARRIER 56000','PROTOCOL: LAP-M','COMPRESSION: V.42BIS','',(T.connected||'CONNECT 56000')];
    var armed = true;
    document.addEventListener('click', function(e){
      if (!armed) return;
      var a = e.target.closest && e.target.closest('a[href]'); if(!a) return;
      var href = a.getAttribute('href'); if(!href || href.charAt(0)==='#' || a.target==='_blank' || /^(mailto|tel):/.test(href)) return;
      if (a.closest('.work') || a.closest('.powgrid')) return;
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

  /* ---------- Referenzbilder: groß ansehen, einzeln (kein Karussell) ---------- */
  var refs = document.querySelectorAll('a.reflink');
  if (refs.length){
    var rb = document.createElement('div'); rb.className='lb lbref';
    rb.innerHTML = '<button class="x" aria-label="'+(T.close||'Schließen')+'" title="'+(T.close||'Schließen')+'">&times;</button><img alt=""><div class="cap"></div>';
    document.body.appendChild(rb);
    var rimg = rb.querySelector('img'), rcap = rb.querySelector('.cap');
    function rhide(){ lbClose(rb, function(){ rimg.removeAttribute('src'); }); }
    refs.forEach(function(a){ a.addEventListener('click', function(ev){ ev.preventDefault(); var im=a.querySelector('img'); rimg.src=a.getAttribute('href'); rimg.alt=im?im.alt:''; var fc=a.parentNode.querySelector('figcaption'); rcap.innerHTML=fc?fc.innerHTML:''; lbOpen(rb); }); });
    rb.querySelector('.x').onclick=rhide; rb.addEventListener('click', function(e){ if(e.target===rb || e.target===rimg) rhide(); });
    document.addEventListener('keydown', function(e){ if(rb.classList.contains('on') && e.key==='Escape') rhide(); });
  }

  /* ---------- Startseite: Bild zum Reiter ---------- */
  var peek = document.querySelector('.peek');
  if (peek){
    document.querySelectorAll('.bigtabs a[data-peek]').forEach(function(a){
      a.addEventListener('mouseenter', function(){ var list = a.getAttribute('data-peek').split(','); peek.src = list[Math.floor(Math.random()*list.length)]; peek.style.transform='rotate('+((Math.random()*6)-3)+'deg)'; });
    });
  }

  /* ---------- Zufällige Neigung der Werke (dezent) ---------- */
  document.querySelectorAll('.work.rot').forEach(function(w,i){ w.style.setProperty('--tilt', (((i*7919)%7)-3)*0.5+'deg'); });

  /* ---------- Regler (Josef, 27.10.): Besucher*innen stellen Töne, Lautstärke, Animationen, Farben und Modem-Intro selbst ein ---------- */
  (function(){
    var TON_TXT = ['aus','selten','manchmal','normal','oft','immer'];
    var ROWS = [
      {k:'ton',  label:'Töne',        min:0, max:5,   step:1, txt:function(v){ return TON_TXT[v]; }},
      {k:'vol',  label:'Lautstärke',  min:0, max:100, step:5, txt:function(v){ return v+' %'; }},
      {k:'anim', label:'Animationen', min:0, max:100, step:5, txt:function(v){ return v+' %'; }},
      {k:'bild', label:'Bild-Knaller',min:0, max:100, step:5, txt:function(v){ return v+' %'; }},
      {k:'farbe',label:'Farbe',       min:0, max:100, step:5, cls:'mix', txt:function(v){ return v<=10 ? 'Rot' : (v>=90 ? 'Blau' : (v==50 ? 'halb, halb' : (v<50 ? 'mehr Rot' : 'mehr Blau'))); }}
    ];
    var ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 3v18M12 3v18M19 3v18"/><rect x="2.5" y="13" width="5" height="3.2" fill="currentColor"/><rect x="9.5" y="6" width="5" height="3.2" fill="currentColor"/><rect x="16.5" y="15.5" width="5" height="3.2" fill="currentColor"/></svg>';
    var knob = document.createElement('button'); knob.type='button'; knob.className='fxknob'; knob.setAttribute('aria-label','Regler: Töne und Animationen einstellen'); knob.setAttribute('aria-expanded','false'); knob.title='Regler'; knob.innerHTML=ICON;
    var panel = document.createElement('div'); panel.className='fxpanel'; panel.id='fxpanel'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Regler'); knob.setAttribute('aria-controls','fxpanel');
    var h = '<button type="button" class="x" aria-label="Schließen" title="Schließen">&times;</button><h2>Regler</h2>';
    ROWS.forEach(function(r){ h += '<label class="fxrow"><span class="l">'+r.label+'</span><span class="v" data-v="'+r.k+'"></span><input type="range" min="'+r.min+'" max="'+r.max+'" step="'+r.step+'" data-k="'+r.k+'"'+(r.cls?' class="'+r.cls+'"':'')+'></label>'; });
    h += '<label class="fxcheck"><input type="checkbox" data-k="still"> Bewegung aus</label>';
    h += '<label class="fxcheck"><input type="checkbox" data-k="modem"> Modem-Intro</label>';
    h += '<div class="fxbtns"><button type="button" data-a="test">Ausprobieren</button><button type="button" data-a="reset">Zurücksetzen</button></div>';
    h += '<p class="fxnote">Bleibt nur in diesem Browser gespeichert, und nur, wenn du etwas verstellst.</p>';
    panel.innerHTML = h;
    document.body.appendChild(panel); document.body.appendChild(knob);
    function show(){ ROWS.forEach(function(r){ var i = panel.querySelector('input[data-k="'+r.k+'"]'); i.value = FX[r.k]; panel.querySelector('[data-v="'+r.k+'"]').textContent = r.txt(+FX[r.k]); });
      panel.querySelector('input[data-k="still"]').checked = !!FX.still; panel.querySelector('input[data-k="modem"]').checked = !!FX.modem; }
    function save(){ try { localStorage.setItem('jk_fx', JSON.stringify(FX)); } catch(e){} }
    function apply(k){ if (k==='vol' && MASTER) MASTER.node.gain.value = FX.vol/100; if (k==='ton') untilSound = nextGap(); }
    function open(){ show(); panel.classList.add('on'); knob.setAttribute('aria-expanded','true'); }
    function close(){ panel.classList.remove('on'); knob.setAttribute('aria-expanded','false'); }
    knob.addEventListener('click', function(){ panel.classList.contains('on') ? close() : open(); });
    panel.querySelector('.x').addEventListener('click', close);
    document.addEventListener('keydown', function(e){ if (e.key==='Escape' && panel.classList.contains('on')){ close(); knob.focus(); } });
    document.addEventListener('pointerdown', function(e){ if (panel.classList.contains('on') && !(e.target.closest && e.target.closest('.fxpanel, .fxknob'))) close(); });
    panel.addEventListener('input', function(e){ var i = e.target, k = i.getAttribute('data-k'); if (!k) return;
      FX[k] = i.type==='checkbox' ? i.checked : +i.value; apply(k); save();
      var r = ROWS.filter(function(x){ return x.k===k; })[0]; if (r) panel.querySelector('[data-v="'+k+'"]').textContent = r.txt(FX[k]); });
    panel.addEventListener('change', function(e){ var k = e.target.getAttribute('data-k'); if (k==='vol' || k==='ton'){ if (FX.ton > 0) clickSound(knob); } });
    panel.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return;
      if (b.getAttribute('data-a')==='test'){ var rc = b.getBoundingClientRect(); var ev = {clientX: rc.left + rc.width/2, clientY: rc.top - 60};
        if (FX.ton > 0) clickSound(document.querySelector('main') || knob); textPop(ev, document.querySelector('main')); }
      else { try { localStorage.removeItem('jk_fx'); } catch(err){} for (var k in FX_DEFAULT) FX[k] = FX_DEFAULT[k]; apply('vol'); apply('ton'); show(); } });
  })();

  /* ---------- Newsletter (Brevo): ohne Anbieter-Skript, Anmeldung im Hintergrund; ohne JavaScript öffnet sich Brevo im neuen Tab ---------- */
  document.querySelectorAll('form[data-nl]').forEach(function(f){
    f.addEventListener('submit', function(e){
      if (!window.fetch || !window.FormData) return;
      e.preventDefault();
      var btn = f.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
      fetch(f.action, {method:'POST', body:new FormData(f), mode:'no-cors'}).then(function(){
        f.querySelector('.nlrow').hidden = true; var ok = f.querySelector('.nlok'); if (ok) ok.hidden = false;
      }).catch(function(){ if (btn) btn.disabled = false; f.submit(); });
    });
  });
})();
