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
  function osc(ac, type, f, t, d, vol, env){ var o=ac.createOscillator(), g=ac.createGain(); o.type=type; o.frequency.setValueAtTime(f,t);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+(env||.01)); g.gain.exponentialRampToValueAtTime(.0005,t+d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+d+.02); return o; }
  function noiseBuf(ac, d){ var n=Math.floor(ac.sampleRate*d), b=ac.createBuffer(1,n,ac.sampleRate), ch=b.getChannelData(0); for(var i=0;i<n;i++){ ch[i]=Math.random()*2-1; } return b; }
  function noise(ac, t, d, vol, type, f, q, decay){ var s=ac.createBufferSource(); s.buffer=noiseBuf(ac,d); var fl=ac.createBiquadFilter(); fl.type=type||'bandpass'; fl.frequency.setValueAtTime(f||1800,t); fl.Q.value=q||.8;
    var g=ac.createGain(); g.gain.setValueAtTime(vol||.2,t); g.gain.exponentialRampToValueAtTime(.0005,t+(decay||d)); s.connect(fl); fl.connect(g); g.connect(ac.destination); s.start(t); s.stop(t+d); return fl; }
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
    pfahl: function(ac,t){ var o=osc(ac,'sine',55,t,2.2,.22,.6); o.frequency.linearRampToValueAtTime(48,t+2); noise(ac,t+.3,1.8,.06,'bandpass',300+Math.random()*300,2,1.8); osc(ac,'triangle',(Math.random()<.5?660:990),t+.6,.9,.04,.3); }
  };
  var DEFAULT = ['whistle','squeak','shotgun'];
  function play(name){ var ac=ctx(); if(!ac||!SND[name]) return; SND[name](ac, ac.currentTime+.005); }
  function clickSound(target){
    var el = target && target.closest ? target.closest('[data-sounds]') : null;
    var list = el ? el.getAttribute('data-sounds').split(',') : DEFAULT;
    play(list[Math.floor(Math.random()*list.length)]);
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
    function faceOff(){ face.classList.remove('on'); clearInterval(pfTimer); pfTimer=null; clearTimeout(pfHide); }
    function faceOn(e){ moveFace(e); face.classList.add('on'); play('pfahl'); clearInterval(pfTimer); pfTimer=setInterval(function(){ play('pfahl'); }, 2100); }
    var touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
    pf.forEach(function(s){
      if (touch){
        /* Handy: beim Antippen kurz zeigen, nach 2,5 Sekunden oder beim nächsten Tippen irgendwo wieder weg */
        s.addEventListener('touchstart', function(e){ var t=e.touches[0]; faceOn({clientX:t.clientX, clientY:t.clientY}); clearTimeout(pfHide); pfHide=setTimeout(faceOff, 2500); }, {passive:true});
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
