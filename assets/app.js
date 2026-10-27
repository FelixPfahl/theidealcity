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

  /* ---------- Besucherzähler (nur dieser Browser) ---------- */
  try {
    var c = parseInt(localStorage.getItem('jk_visits')||'0',10)+1; localStorage.setItem('jk_visits', String(c));
    var ce = document.querySelector('[data-counter]'); if(ce){ ce.textContent = String(c).padStart(6,'0'); }
  } catch(e){}

  /* ---------- Töne (Web Audio, synthetisch) ---------- */
  var AC = null;
  function ctx(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC && AC.state==='suspended'){ try{AC.resume();}catch(e){} } return AC; }
  /* Variation: jeder Klick bekommt eine zufällige Tonhöhe (±5 Halbtöne), Länge und Lautstärke */
  var V = {cents:0, len:1, vol:1};
  function vary(){ V.cents = (Math.random()*1000-500); V.len = .75+Math.random()*.6; V.vol = .7+Math.random()*.45; }
  function osc(ac, type, f, t, d, vol, env){ d*=V.len; vol*=V.vol; var o=ac.createOscillator(), g=ac.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); o.detune.value=V.cents;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+(env||.01)); g.gain.exponentialRampToValueAtTime(.0005,t+d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+d+.02); return o; }
  function noiseBuf(ac, d){ var n=Math.floor(ac.sampleRate*d), b=ac.createBuffer(1,n,ac.sampleRate), ch=b.getChannelData(0); for(var i=0;i<n;i++){ ch[i]=Math.random()*2-1; } return b; }
  function noise(ac, t, d, vol, type, f, q, decay){ d*=V.len; vol=(vol||.2)*V.vol; if(decay) decay*=V.len; var s=ac.createBufferSource(); s.buffer=noiseBuf(ac,d); var fl=ac.createBiquadFilter(); fl.type=type||'bandpass'; fl.frequency.setValueAtTime(f||1800,t); fl.detune.value=V.cents; fl.Q.value=q||.8;
    var g=ac.createGain(); g.gain.setValueAtTime(vol||.2,t); g.gain.exponentialRampToValueAtTime(.0005,t+(decay||d)); s.connect(fl); fl.connect(g); g.connect(ac.destination); s.start(t); s.stop(t+d); return fl; }
  var REV = null;
  function rev(ac){ if(REV && REV.ctx===ac) return REV.node; var d=2.8, n=Math.floor(ac.sampleRate*d), b=ac.createBuffer(2,n,ac.sampleRate);
    for(var c=0;c<2;c++){ var ch=b.getChannelData(c); for(var i=0;i<n;i++){ ch[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6); } }
    var cv=ac.createConvolver(); cv.buffer=b; var g=ac.createGain(); g.gain.value=.9; cv.connect(g); g.connect(ac.destination); REV={ctx:ac,node:cv}; return cv; }
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
      f.type='bandpass'; f.frequency.setValueAtTime(1500,tt); f.frequency.linearRampToValueAtTime(900,tt+.15); f.Q.value=3; g.gain.setValueAtTime(0,tt); g.gain.linearRampToValueAtTime(.35,tt+.02); g.gain.setValueAtTime(.3,tt+.1); g.gain.linearRampToValueAtTime(0,tt+.16); o.connect(f); f.connect(g); g.connect(ac.destination); o.start(tt); o.stop(tt+.17); } },
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
    pfahl: function(ac,t){
      /* Felix Pfahl: Drone mit Schwebung, Atem, Flüstern, verstimmte Spieluhr, Herzschlag, alles im Hall */
      var wet = rev(ac);
      function to(node, g, t0, d, vol, env){ var gg=ac.createGain(); gg.gain.setValueAtTime(0,t0); gg.gain.linearRampToValueAtTime(vol,t0+(env||.05)); gg.gain.exponentialRampToValueAtTime(.0005,t0+d); node.connect(gg); gg.connect(wet); gg.connect(ac.destination); }
      var lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(140,t); lp.frequency.linearRampToValueAtTime(900,t+1.6); lp.frequency.linearRampToValueAtTime(120,t+3.2); lp.Q.value=6;
      var d1=ac.createOscillator(), d2=ac.createOscillator(), d3=ac.createOscillator(); d1.type='sawtooth'; d2.type='sawtooth'; d3.type='sine';
      d1.frequency.value=55; d2.frequency.value=55.7; d3.frequency.value=27.5; d1.connect(lp); d2.connect(lp); d3.connect(lp);
      to(lp,null,t,3.4,.16,.5); d1.start(t); d2.start(t); d3.start(t); d1.stop(t+3.5); d2.stop(t+3.5); d3.stop(t+3.5);
      /* Atem: langsam an- und abschwellendes Rauschen */
      var br=ac.createBufferSource(); br.buffer=noiseBuf(ac,3); var bf=ac.createBiquadFilter(); bf.type='bandpass'; bf.frequency.setValueAtTime(400,t); bf.frequency.linearRampToValueAtTime(1600,t+1.4); bf.frequency.linearRampToValueAtTime(300,t+2.9); bf.Q.value=1.2; br.connect(bf); to(bf,null,t,3,.07,1.3); br.start(t); br.stop(t+3);
      /* Flüstern: kurze Zischlaute in Sprachrhythmus */
      var n=4+Math.floor(Math.random()*5), tt=t+.3+Math.random()*.6;
      for(var k=0;k<n;k++){ var w=ac.createBufferSource(); w.buffer=noiseBuf(ac,.12); var wf=ac.createBiquadFilter(); wf.type='bandpass'; wf.frequency.value=1800+Math.random()*2500; wf.Q.value=5; w.connect(wf); to(wf,null,tt,.1+Math.random()*.08,.09,.01); w.start(tt); w.stop(tt+.2); tt+=.09+Math.random()*.16; }
      /* Spieluhr, leicht verstimmt, irgendwo weit weg */
      if(Math.random()<.8){ var f=[1760,1976,2093,1568,2349][Math.floor(Math.random()*5)]*(1+(Math.random()-.5)*.03); var mt=t+.8+Math.random()*1.6;
        var m1=ac.createOscillator(), m2=ac.createOscillator(); m1.frequency.value=f; m2.frequency.value=f*2.76; to(m1,null,mt,1.4,.05,.005); to(m2,null,mt,.6,.015,.005); m1.start(mt); m2.start(mt); m1.stop(mt+1.5); m2.stop(mt+.7); }
      /* Herzschlag */
      [0.5,0.84].forEach(function(dt){ var h=ac.createOscillator(); h.frequency.setValueAtTime(52,t+dt); h.frequency.exponentialRampToValueAtTime(30,t+dt+.18); to(h,null,t+dt,.22,.3,.01); h.start(t+dt); h.stop(t+dt+.25); });
      /* Rückwärts-Schwell: Rauschen wird lauter und bricht ab */
      if(Math.random()<.6){ var st=t+1.6; var sw=ac.createBufferSource(); sw.buffer=noiseBuf(ac,1.3); var sf=ac.createBiquadFilter(); sf.type='highpass'; sf.frequency.value=2500; var sg=ac.createGain(); sg.gain.setValueAtTime(.0005,st); sg.gain.exponentialRampToValueAtTime(.12,st+1.25); sg.gain.setValueAtTime(0,st+1.27); sw.connect(sf); sf.connect(sg); sg.connect(wet); sw.start(st); sw.stop(st+1.3); }
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
  document.addEventListener('pointerdown', function(e){ if(e.button!==0) return; if(e.target.closest && e.target.closest('.modem, iframe')) return; clickSound(e.target); }, true);
  /* Spotify erst auf Klick laden (Datenschutz) */
  document.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('.spot button'); if(!b) return; var box = b.parentNode; var f = document.createElement('iframe'); f.src = box.getAttribute('data-src'); f.title = box.getAttribute('data-title')||'Spotify'; f.setAttribute('allow','autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'); f.setAttribute('loading','lazy'); box.innerHTML=''; box.appendChild(f); });

  /* ---------- Click Click Boom ---------- */
  var clicks = 0, boomWords = (T.boom||['CLICK','CLICK','BOOM']);
  function clickBoom(ev, el){
    var w = boomWords[clicks % 3]; clicks++;
    var tag = document.createElement('div'); tag.className='boomtag' + (document.querySelector('main.comicpage') ? ' blue' : ''); tag.textContent=w;
    var x = ev.clientX || (window.innerWidth/2), y = ev.clientY || (window.innerHeight/2);
    tag.style.left=x+'px'; tag.style.top=y+'px'; document.body.appendChild(tag);
    setTimeout(function(){ tag.remove(); }, 800);
    if (w==='BOOM'){ document.body.classList.add('shake'); setTimeout(function(){document.body.classList.remove('shake')},600); }
  }

  /* ---------- Lightbox ---------- */
  var works = Array.prototype.slice.call(document.querySelectorAll('.work a[data-full], .powgrid a[data-full]'));
  if (works.length){
    var lb = document.createElement('div'); lb.className='lb';
    lb.innerHTML = '<button class="x">'+(T.close||'Schließen')+'</button><button class="p">&larr; '+(T.prev||'')+'</button><button class="nx">'+(T.next||'')+' &rarr;</button><img alt=""><div class="cap"></div>';
    document.body.appendChild(lb);
    var img = lb.querySelector('img'), cap = lb.querySelector('.cap'), cur = -1;
    function show(i){ cur=(i+works.length)%works.length; var a=works[cur]; img.src=a.getAttribute('data-full'); img.alt=a.getAttribute('data-alt')||''; var fc=a.parentNode.querySelector('figcaption'); cap.innerHTML=fc? fc.innerHTML : ''; lb.classList.add('on'); document.body.style.overflow='hidden'; }
    function hide(){ lb.classList.remove('on'); document.body.style.overflow=''; }
    works.forEach(function(a,i){ a.addEventListener('click', function(ev){ ev.preventDefault(); clickBoom(ev, a); show(i); }); });
    lb.querySelector('.x').onclick=hide; lb.querySelector('.p').onclick=function(){show(cur-1)}; lb.querySelector('.nx').onclick=function(){show(cur+1)};
    lb.addEventListener('click', function(e){ if(e.target===lb) hide(); });
    img.addEventListener('click', function(e){ clickBoom(e, img); show(cur+1); });
    document.addEventListener('keydown', function(e){ if(!lb.classList.contains('on')) return; if(e.key==='Escape') hide(); if(e.key==='ArrowRight') show(cur+1); if(e.key==='ArrowLeft') show(cur-1); });
    var sx=0; lb.addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true}); lb.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-sx; if(Math.abs(dx)>50) show(cur+(dx<0?1:-1));});
  }

  /* ---------- Felix Pfahl: Gesicht aus dem Holzschnitt, unheimlicher Ton ---------- */
  var pf = document.querySelectorAll('.pfahl');
  if (pf.length){
    var face = document.createElement('img'); face.id='pfahlface'; face.src='../assets/pfahl-face.png'; face.alt=''; document.body.appendChild(face);
    var pfTimer = null;
    function moveFace(e){ face.style.left=e.clientX+'px'; face.style.top=e.clientY+'px'; }
    var pfHide = null;
    var pfGone = null;
    function faceOff(){ /* sehr langsam ausfaden (6 s), der Ton klingt mit Hall aus */
      clearInterval(pfTimer); pfTimer=null; clearTimeout(pfHide);
      if(!face.classList.contains('on') || face.classList.contains('fade')) return;
      face.classList.add('fade'); clearTimeout(pfGone); pfGone=setTimeout(function(){ face.classList.remove('on','fade'); }, 6500); }
    function faceOn(e){ moveFace(e); clearTimeout(pfGone); face.classList.remove('fade'); face.classList.add('on'); play('pfahl'); clearInterval(pfTimer); pfTimer=setInterval(function(){ play('pfahl'); }, 3300); }
    var touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
    pf.forEach(function(s){
      if (touch){
        /* Handy: beim Antippen kurz zeigen, nach 2,5 Sekunden oder beim nächsten Tippen irgendwo wieder weg */
        s.addEventListener('touchstart', function(e){ var t=e.touches[0]; faceOn({clientX:t.clientX, clientY:t.clientY}); clearTimeout(pfHide); pfHide=setTimeout(faceOff, 6000); }, {passive:true});
      } else {
        s.addEventListener('mouseenter', faceOn);
        s.addEventListener('mousemove', moveFace);
        s.addEventListener('mouseleave', faceOff);
      }
    });
    document.addEventListener('touchstart', function(e){ if(face.classList.contains('on') && !(e.target.closest && e.target.closest('.pfahl'))) faceOff(); }, {passive:true});
    document.addEventListener('scroll', function(){ if(touch && face.classList.contains('on')) faceOff(); }, {passive:true});
  }

  /* 56k-Modem: Wählton, DTMF, Klingeln, V.90-Handshake, Rauschen. Etwa 9 Sekunden. */
  function dialup(onDone){
    var ac = ctx(); if(!ac){ onDone(); return; }
    var t0 = ac.currentTime, out = ac.createGain(); out.gain.value = .5; out.connect(ac.destination);
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

  /* ---------- Modem-Overlay beim ersten Klick auf einen Link ---------- */
  var modemDone = false;
  try { modemDone = sessionStorage.getItem('jk_modem') === '1'; } catch(e){}
  if (!modemDone){
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
      try { sessionStorage.setItem('jk_modem','1'); } catch(err){}
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

  /* ---------- Startseite: Bild zum Reiter ---------- */
  var peek = document.querySelector('.peek');
  if (peek){
    document.querySelectorAll('.bigtabs a[data-peek]').forEach(function(a){
      a.addEventListener('mouseenter', function(){ var list = a.getAttribute('data-peek').split(','); peek.src = list[Math.floor(Math.random()*list.length)]; peek.style.transform='rotate('+((Math.random()*6)-3)+'deg)'; });
    });
  }

  /* ---------- Zufällige Neigung der Werke (dezent) ---------- */
  document.querySelectorAll('.work.rot').forEach(function(w,i){ w.style.setProperty('--tilt', (((i*7919)%7)-3)*0.5+'deg'); });
})();
