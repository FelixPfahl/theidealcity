/* Werkstatt (Entwurf der neuen Dev Tools), Josef, 19.11.2026. Nichts hier wird gespeichert oder veröffentlicht. */
(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var MAC=/Mac|iPhone|iPad/.test(navigator.platform); $('#kk').textContent=MAC?'⌘ K':'Strg K';
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function clone(o){return JSON.parse(JSON.stringify(o))}

/* ---------- Textsorten, Farben, Bewegung: Grundwerte wie auf der Seite ---------- */
var TS=[['text','Fließtext'],['head','Titel'],['menu','Menü'],['cap','Bildunterschrift'],['spiel','Spiel']];
var TSN={};TS.forEach(function(t){TSN[t[0]]=t[1]});
var FONTS=['Relief','Duerer1525','Duerer','Duerer Sans','DuererHand','Atkinson','Baskervville','Pixelify'];
var ARTS=['Plotter','Feder','Schreibmaschine','Einblenden','keine'];
var DEF={};
function defTS(t,font,sM,sD,lh,tr,an){DEF[t+'.font']=font;DEF[t+'.sM']=sM;DEF[t+'.sD']=sD;DEF[t+'.lh']=lh;DEF[t+'.tr']=tr;DEF[t+'.ws']=0;DEF[t+'.ft']='';DEF[t+'.kp']='';DEF[t+'.an']=an}
defTS('text','Relief',17,20,1.5,0,'Plotter');defTS('head','Duerer1525',44,150,.95,.02,'keine');defTS('menu','Duerer Sans',13,15,1.2,.06,'keine');defTS('cap','Relief',12.5,13.5,1.35,0,'Plotter');defTS('spiel','Pixelify',16,18,1.3,0,'Schreibmaschine');
var CM={hell:[['paper','Papier','#ffffff'],['ink','Schrift','#000000'],['line','Linien','#000000'],['grey','Grau','#6b6b6b'],['hair','Haarlinie','#e5e5e5'],['red','Zinnober','#e2231a'],['green','Grün','#00a651'],['blue','Non-Photo-Blau','#a4dded'],['blue-ink','Blau-Schrift','#3f97b8']],
 dunkel:[['paper','Papier','#000000'],['ink','Schrift','#ffffff'],['line','Linien','#ffffff'],['grey','Grau','#9a9a9a'],['hair','Haarlinie','#2a2a2a']],
 rot:[['paper','Papier','#e2231a'],['ink','Schrift','#000000'],['line','Linien','#000000'],['grey','Grau','#4a0d0a'],['hair','Haarlinie','#b31b14'],['red','Zinnober','#000000'],['blue','Non-Photo-Blau','#e2231a'],['blue-ink','Blau-Schrift','#000000']],
 spiel:[['inka','Inka','#3fb6ff'],['wagner','Wagner','#ff3b3b'],['xae','X Æ A-13','#9aa0a6'],['sigma','Sigma','#22c55e'],['gojira','Gojira','#16a34a'],['fenster','Fenster','#0a0a14'],['stift','Stiftpunkt','#e2231a']]};
var MODEN={hell:'Hell',dunkel:'Dunkel',rot:'Rot',spiel:'Spiel'};
Object.keys(CM).forEach(function(m){CM[m].forEach(function(c){DEF['c.'+m+'.'+c[0]]=c[2]})});
var AN=[ /* Schlüssel, Gruppe, Name, Grundwert, min, max, Schritt, Einheit, Hinweis (Werte und Texte aus cfg.js) */
 ['plot.speed','Plotter','Schreibtempo',1.25,.2,4,.05,'×','Grundtempo aller Stifte.'],['plot.stroke','Plotter','Strichstärke',1.2,.4,3,.05,'px'],['plot.jitter','Plotter','Zittern',1,0,4,.05,'×','Abweichungen von Neigung, Start- und Endpunkt.'],['plot.ink','Plotter','Tintenverlauf',1,0,2,.05,'×','Ausgehen der Tinte vor dem Nachfüllen.'],['plot.scratch','Plotter','Kratzer',.08,0,.4,.01,'','Anteil kratziger, unterbrochener Buchstaben.'],['plot.bleed','Plotter','Kleckse',1,0,5,.1,'×'],['plot.dot','Plotter','Stiftpunkt',3,0,10,.5,'px'],['plot.travel','Plotter','Reisewege',.14,0,.6,.01,'','Deckkraft der Stiftwege zwischen Buchstaben.'],
 ['fx.wood','Holzschnitt','Verzerrung',1,0,4,.05,'×','Holzschnitt-Struktur der Titel.'],['fx.woodgrain','Holzschnitt','Körnung',1,0,2,.05,'×'],['fx.net','Holzschnitt','Konstruktionsnetz',1,0,3,.05,'×','Linien beim Zeigen auf große Titel (Maus auf den Titel im Muster).'],
 ['hand.size','Dürer-Handschrift','Größe',1.6,.8,3,.05,'×'],['hand.wave','Dürer-Handschrift','Welle',35,0,120,1,''],['hand.rand','Dürer-Handschrift','Unruhe',22,0,80,1,''],['hand.tilt','Dürer-Handschrift','Neigung',2,0,12,.5,'°'],['hand.join','Dürer-Handschrift','Verbindungen',1,0,1,1,'','1 = verbunden, 0 = einzeln.'],
 ['fx.parallax','Seite','Parallax',10,0,30,.5,'%'],['fx.modem','Seite','Modem-Intro',1,0,1,1,'','1 = einmal je Besuch, 0 = aus.'],['fx.modemlen','Seite','Modem-Dauer',1,.3,3,.05,'×'],
 ['calm.speed','Ruhige Fassung','Tempo ruhig',3,1,8,.1,'×','Gilt, wenn Besucher*innen „Bewegung reduzieren“ eingestellt haben.']];
var ANI={};AN.forEach(function(a){DEF[a[0]]=a[3];ANI[a[0]]=a});DEF['calm.an']='Einblenden';
DEF.cols=12;DEF.gut=24;DEF.mar=48;
var BASEDEF=clone(DEF);

/* ---------- Zustand ---------- */
var S={face:'gestalt',role:'alina',dev:'desktop',page:'index',tab:{gestalt:'schrift',spiel:'momente'},ts:'text',bts:'text',mode:'hell',v:clone(DEF),undo:[],redo:[],grid:false,insp:false,heat:false,pinMode:false,okl:{},pick:null,picks:[],fonts:[],calm:false,slow:1,
  styles:[{name:'Live (jetzt)',v:clone(DEF)}],
  wishes:[{t:'Ich wünsche mir, dass ich zwei Schriften direkt nebeneinander vergleichen kann.',s:'geb',by:'Alina'},{t:'Stecknadeln auch auf der Handy-Ansicht.',s:'gepr',by:'Alina'},{t:'Gojira soll bei 15 Funden einen eigenen Satz bekommen.',s:'geb',by:'Josef'}],pins:[],published:0};
function label(k){var p=k.split('.');if(p[0]==='c'){var c=(CM[p[1]]||[]).filter(function(x){return x[0]===p.slice(2).join('.')})[0];return 'Farbe '+MODEN[p[1]]+': '+(c?c[1]:p[2])}
  if(ANI[k])return ANI[k][1]+': '+ANI[k][2];if(k==='calm.an')return 'Ruhige Fassung: Art';if(k==='cols')return 'Raster: Spalten';if(k==='gut')return 'Raster: Spaltenabstand';if(k==='mar')return 'Raster: Rand';
  var N={font:'Schrift',sM:'Größe Handy',sD:'Größe Desktop',lh:'Zeilenabstand',tr:'Laufweite',ws:'Wortabstand',ft:'OpenType',kp:'Buchstabenpaare',an:'Animation'};
  if(TSN[p[0]]){if(p[1]==='ax')return TSN[p[0]]+': Achse '+p[2];return TSN[p[0]]+': '+(N[p[1]]||p[1])}return k}
function fmt(k,v){var p=k.split('.');if(v===undefined)v='';if(p[0]==='c')return String(v).toUpperCase();if(p[1]==='tr'||p[1]==='ws')return (+v).toFixed(3)+' em';if(p[1]==='sM'||p[1]==='sD')return (+v)+' px';if(p[1]==='lh')return (+v).toFixed(2);
  if(ANI[k]){var u=ANI[k][7];return (+v)+(u==='×'?' ×':u?' '+u:'')}return v===''?'Standard':String(v)}
function changed(){return Object.keys(S.v).filter(function(k){return String(S.v[k])!==String(DEF[k])})}
function commit(k,old,nw){if(String(old)===String(nw))return;S.undo.push({k:k,o:old,n:nw});S.redo=[];snd('save');upd()}
function change(k,v){var o=S.v[k];S.v[k]=v;commit(k,o,v);apply()}
function undo(){var u=S.undo.pop();if(!u)return;if(u.snap){S.redo.push({snap:clone(S.v),name:u.name});S.v=u.snap}else{S.v[u.k]=u.o;S.redo.push(u)}apply();upd();toast('Rückgängig: '+(u.name||label(u.k)));render()}
function redo(){var u=S.redo.pop();if(!u)return;if(u.snap){S.undo.push({snap:clone(S.v),name:u.name});S.v=u.snap}else{S.v[u.k]=u.n;S.undo.push(u)}apply();upd();toast('Wiederholt: '+(u.name||label(u.k)));render()}
function upd(){var n=changed().length;$('#countTxt').textContent=n?(n+(n===1?' Änderung':' Änderungen')+' · nicht veröffentlicht'):'Alles veröffentlicht';$('#count').classList.toggle('zero',!n);$('#undo').disabled=!S.undo.length;$('#redo').disabled=!S.redo.length}

/* ---------- Bühne ---------- */
function frames(){return $$('#stage iframe')}
function mkFrame(st,kind,lbl,vals,blue){var f=document.createElement('div');f.className='frame'+(kind==='handy'?' phone':'');f.innerHTML='<span class="lbl'+(blue?' b':'')+'">'+esc(lbl)+'</span><iframe title="Seite"></iframe>';st.appendChild(f);
  var ifr=f.querySelector('iframe');ifr._vals=vals||null;ifr.addEventListener('load',function(){hook(ifr);applyOne(ifr)});ifr.src='../../de/'+S.page+'.html?devframe';return ifr}
function buildStage(){var st=$('#stage');st.innerHTML='';S.cmp=null;var list=S.dev==='beide'?['desktop','handy']:[S.dev];list.forEach(function(d){mkFrame(st,d,d==='handy'?'Handy 390 px':'Desktop')})}
function compareVals(a,la,b,lb){var st=$('#stage');st.innerHTML='';mkFrame(st,'desktop',la,a);mkFrame(st,'desktop',lb,b,true);S.cmp=true;toast('Vergleich: links '+la+', rechts '+lb+'. Gerät wählen beendet den Vergleich.')}
function hook(ifr){var d;try{d=ifr.contentDocument}catch(e){return}if(!d)return;
  d.addEventListener('dragenter',function(e){if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types,'Files')>=0)showDrop(true)});
  d.addEventListener('mouseover',function(e){if(!S.insp)return;var o=d.getElementById('ws-hl');if(!o)return;var r=e.target.getBoundingClientRect();Object.assign(o.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'})},true);
  d.addEventListener('click',function(e){if(S.insp){e.preventDefault();e.stopPropagation();inspect(e.target,ifr);return}if(S.pinMode){e.preventDefault();e.stopPropagation();var w=d.scrollingElement;S.pins.push({x:e.clientX+w.scrollLeft,y:e.clientY+w.scrollTop,page:S.page,n:S.pins.length+1});S.pinMode=false;apply();snd('ok');toast('Stecknadel '+S.pins.length+' gesetzt');render()}},true)}
function apply(){frames().forEach(applyOne)}
function featCSS(s){if(!s)return '';return s.split(' ').filter(Boolean).map(function(x){var p=x.split('=');return '"'+p[0]+'" '+p[1]}).join(', ')}
function sizeCSS(m,dk){var lo=Math.min(m,dk),hi=Math.max(m,dk);return 'clamp('+lo+'px, calc('+m+'px + '+(dk-m)+' * ((100vw - 360px) / 1080)), '+hi+'px)'}
var TSEL={text:'body',head:'h1,h2,h3,.hero',menu:'nav.tabs,nav.tabs a,.langs,.subnav',cap:'figcaption,.photocredit,.credits',spiel:'.sbdlg,.sbdlg *'};
var TVAR={text:'--body',head:'--head',menu:'--sans'};
function fontFam(n){var f=S.fonts.filter(function(x){return x.name===n})[0];return f?f.fam:n}
function cssFor(V){var css='';
  S.fonts.forEach(function(f){css+='@font-face{font-family:"'+f.fam+'";src:url('+f.url+')}'});
  var mv={};['hell','dunkel','rot'].forEach(function(m){var s='';CM[m].forEach(function(c){var k='c.'+m+'.'+c[0];if(String(V[k])!==String(BASEDEF[k]))s+='--'+c[0]+':'+V[k]+'!important;'});mv[m]=s});
  if(mv.hell)css+='html:not([data-mode=dunkel]):not([data-mode=rot]){'+mv.hell+'}';if(mv.dunkel)css+='html[data-mode=dunkel]{'+mv.dunkel+'}';if(mv.rot)css+='html[data-mode=rot]{'+mv.rot+'}';
  var root='';
  TS.forEach(function(t){var k=t[0],r='',ch=function(p){return String(V[k+'.'+p])!==String(BASEDEF[k+'.'+p])};
    if(ch('font')){var fam='"'+fontFam(V[k+'.font'])+'", sans-serif';if(TVAR[k])root+=TVAR[k]+':'+fam+'!important;';else r+='font-family:'+fam+'!important;'}
    if(ch('sM')||ch('sD'))r+='font-size:'+sizeCSS(+V[k+'.sM'],+V[k+'.sD'])+'!important;';
    if(ch('lh'))r+='line-height:'+V[k+'.lh']+'!important;';if(ch('tr'))r+='letter-spacing:'+V[k+'.tr']+'em!important;';if(ch('ws'))r+='word-spacing:'+V[k+'.ws']+'em!important;';
    if(ch('ft')&&V[k+'.ft'])r+='font-feature-settings:'+featCSS(V[k+'.ft'])+'!important;';
    var ax=Object.keys(V).filter(function(x){return x.indexOf(k+'.ax.')===0});if(ax.length)r+='font-variation-settings:'+ax.map(function(x){return '"'+x.split('.')[2]+'" '+V[x]}).join(', ')+'!important;';
    if(r)css+=TSEL[k]+'{'+r+'}'});
  if(root)css+=':root{'+root+'}';
  /* Entwurf: Der Plotter zeichnet nur die Relief-Mittellinien. Ist Fließtext oder Bildunterschrift geändert, zeigt die Vorschau den echten Text ohne Plotter (im Umbau zeichnet der Plotter die neue Schrift). */
  if(['text','cap'].some(function(k){return Object.keys(V).some(function(x){return x.indexOf(k+'.')===0&&x!==k+'.an'&&String(V[x])!==String(BASEDEF[x])})}))css+='.plotted .plot{display:none!important}.plotted .plotsrc{position:static!important;opacity:1!important;visibility:visible!important;color:var(--ink)!important;-webkit-text-fill-color:currentColor!important}';
  return css}
function applyOne(ifr){var d;try{d=ifr.contentDocument}catch(e){return}if(!d||!d.head)return;var V=ifr._vals||S.v;
  var s=d.getElementById('ws-style');if(!s){s=d.createElement('style');s.id='ws-style';d.head.appendChild(s)}
  s.textContent=cssFor(V)+'.modem,#modem{display:none!important}'+(S.face==='gestalt'?'.sbdlg,.sbfab,.sbearth,.psst,.sbflash{display:none!important}':'')+
   '#ws-hl{position:fixed;display:none;pointer-events:none;outline:2px solid #0028FF;outline-offset:2px;z-index:2147483000;background:#0028FF14}'+
   '#ws-grid{position:fixed;inset:0;pointer-events:none;z-index:2147482999;display:grid;padding:0 '+S.v.mar+'px;grid-template-columns:repeat('+S.v.cols+',1fr);column-gap:'+S.v.gut+'px}'+
   '#ws-grid i{background:#0028FF12;border-left:1px solid #0028FF40;border-right:1px solid #0028FF40}#ws-grid b{position:absolute;top:6px;left:'+S.v.mar+'px;font:11px/1 monospace;background:#0028FF;color:#fff;padding:2px 5px;border-radius:3px}'+
   '.ws-pin{position:absolute;z-index:2147483001;width:26px;height:26px;margin:-26px 0 0 -13px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0028FF;color:#fff;font:700 12px/26px sans-serif;text-align:center;box-shadow:0 3px 8px #0005}.ws-pin span{display:inline-block;transform:rotate(45deg)}'+
   '.ws-heat{position:absolute;pointer-events:none;z-index:2147482998;border-radius:50%;filter:blur(18px);mix-blend-mode:multiply}';
  if(S.face==='gestalt'&&S.tab.gestalt==='farben'&&S.mode!=='spiel'){if(S.mode==='hell')d.documentElement.removeAttribute('data-mode');else d.documentElement.setAttribute('data-mode',S.mode)}
  if(!d.body)return;
  var hl=d.getElementById('ws-hl');if(!hl){hl=d.createElement('div');hl.id='ws-hl';d.body.appendChild(hl)}if(!S.insp)hl.style.display='none';
  var g=d.getElementById('ws-grid');if(S.grid&&!g){g=d.createElement('div');g.id='ws-grid';d.body.appendChild(g)}if(g){if(!S.grid)g.remove();else g.innerHTML=new Array(+S.v.cols+1).join('<i></i>')+'<b>'+S.v.cols+' Spalten · '+S.v.gut+' px Abstand · '+S.v.mar+' px Rand</b>'}
  $$('.ws-pin',d).forEach(function(p){p.remove()});S.pins.filter(function(p){return p.page===S.page}).forEach(function(p){var e=d.createElement('div');e.className='ws-pin';e.style.left=p.x+'px';e.style.top=p.y+'px';e.innerHTML='<span>'+p.n+'</span>';d.body.appendChild(e)});
  $$('.ws-heat',d).forEach(function(p){p.remove()});if(S.heat){var H=d.documentElement.scrollHeight,W=d.documentElement.clientWidth;[[.3,.12,.9],[.7,.35,.6],[.45,.55,.8],[.2,.8,.4],[.8,.9,.7]].forEach(function(h){var e=d.createElement('div');e.className='ws-heat';var r=140+h[2]*140;Object.assign(e.style,{left:(W*h[0]-r/2)+'px',top:(H*h[1]-r/2)+'px',width:r+'px',height:r+'px',background:'radial-gradient(#ff2a00 0%,#ffcf00 45%,transparent 70%)',opacity:h[2]});d.body.appendChild(e)})}}

/* ---------- Farbe: Kontrast und OKLCH ---------- */
function rgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(function(c){return c+c}).join('');return [0,2,4].map(function(i){return parseInt(h.substr(i,2),16)})}
function toLin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)}
function fromLin(c){return c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055}
function lum(h){var c=rgb(h).map(toLin);return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function wcag(a,b){var l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)}
function apca(t,b){function Y(h){var c=rgb(h).map(function(v){return Math.pow(v/255,2.4)});return .2126729*c[0]+.7151522*c[1]+.072175*c[2]}var yt=Y(t),yb=Y(b),bt=.022;yt=yt>bt?yt:yt+Math.pow(bt-yt,1.414);yb=yb>bt?yb:yb+Math.pow(bt-yb,1.414);var s,o;if(yb>yt){s=(Math.pow(yb,.56)-Math.pow(yt,.57))*1.14;o=s<.1?0:s-.027}else{s=(Math.pow(yb,.65)-Math.pow(yt,.62))*1.14;o=s>-.1?0:s+.027}return Math.round(Math.abs(o*100))}
function amp(t,b,px){var r=wcag(t,b),big=px>=24,c,sym,txt;if(r>=7||(big&&r>=4.5)){c='ok';sym='✓';txt='sehr gut'}else if(r>=4.5||(big&&r>=3)){c='ok';sym='✓';txt='gut lesbar'}else if(r>=3){c='warn';sym='!';txt='nur große Schrift'}else{c='bad';sym='✕';txt='zu schwach'}
  return '<span class="amp '+c+'" title="WCAG 2.2 (Pflicht) und APCA (Zusatz). Nur Warnung, nichts wird gesperrt.">'+sym+' '+txt+' · '+r.toFixed(1)+':1 · Lc '+apca(t,b)+'</span>'}
function hex2oklch(h){var r=rgb(h).map(toLin);var l=Math.cbrt(.4122214708*r[0]+.5363325363*r[1]+.0514459929*r[2]),m=Math.cbrt(.2119034982*r[0]+.6806995451*r[1]+.1073969566*r[2]),s=Math.cbrt(.0883024619*r[0]+.2817188376*r[1]+.6299787005*r[2]);
  var L=.2104542553*l+.7936177850*m-.0040720468*s,a=1.9779984951*l-2.4285922050*m+.4505937099*s,b=.0259040371*l+.7827717662*m-.8086757660*s,C=Math.sqrt(a*a+b*b),H=Math.atan2(b,a)*180/Math.PI;if(H<0)H+=360;return [L,C,H]}
function okRGB(L,C,H){var a=C*Math.cos(H*Math.PI/180),b=C*Math.sin(H*Math.PI/180);var l=L+.3963377774*a+.2158037573*b,m=L-.1055613458*a-.0638541728*b,s=L-.0894841775*a-1.2914855480*b;l=l*l*l;m=m*m*m;s=s*s*s;
  return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.7076147010*s]}
function oklch2hex(L,C,H){var c=C,r;for(var i=0;i<60;i++){r=okRGB(L,c,H);if(r.every(function(v){return v>=-1e-4&&v<=1.0001}))break;c*=.94}
  return '#'+r.map(function(v){var x=Math.round(Math.max(0,Math.min(1,fromLin(Math.max(0,Math.min(1,v)))))*255);return ('0'+x.toString(16)).slice(-2)}).join('')}
function toTarget(hex,bg,target){var o=hex2oklch(hex),up=lum(bg)<.18,lo=up?o[0]:0,hi=up?1:o[0];if(wcag(hex,bg)>=target)return hex;var best=up?'#ffffff':'#000000';
  for(var i=0;i<30;i++){var mid=(lo+hi)/2,h=oklch2hex(mid,o[1],o[2]);if(wcag(h,bg)>=target){best=h;if(up)hi=mid;else lo=mid}else{if(up)lo=mid;else hi=mid}}return best}

/* ---------- Klänge ---------- */
var AC=null;function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}return AC}
function snd(kind){if(S.face!=='spiel'&&kind==='move')return;var a=ac();if(!a)return;var o=a.createOscillator(),g=a.createGain();o.type='sine';var f={move:660,ok:880,save:740,pub:523,key:1200}[kind]||600;o.frequency.setValueAtTime(f,a.currentTime);if(kind==='ok'||kind==='pub')o.frequency.setValueAtTime(f*1.5,a.currentTime+.07);g.gain.setValueAtTime(kind==='key'?.015:.03,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+(kind==='key'?.04:.16));o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.17)}
function playFile(name){try{var x=new Audio('../../assets/snd/'+name+'.mp3');x.volume=.5;x.play()}catch(e){}}

/* ---------- Regler mit Zahl und Pfeiltasten ---------- */
function ctl(host,k,name,min,max,step,unit,hint,onlive){var w=document.createElement('div');w.className='ctl'+(String(S.v[k])!==String(DEF[k])?' chg':'');
  w.innerHTML='<div class="top"><label title="Doppelklick: zurück auf den veröffentlichten Wert">'+esc(name)+'</label><span class="c" style="flex:0 0 auto"><input type="number" step="'+step+'" min="'+min+'" max="'+max+'" value="'+S.v[k]+'"><span class="u">'+(unit||'')+'</span></span></div><div class="c"><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+S.v[k]+'"></div>'+(hint?'<div class="hint">'+hint+'</div>':'');
  var r=w.querySelector('input[type=range]'),n=w.querySelector('input[type=number]'),old;
  function set(v,live){v=+(+v).toFixed(4);if(isNaN(v))return;S.v[k]=v;r.value=v;if(document.activeElement!==n||!live)n.value=v;apply();w.classList.toggle('chg',String(v)!==String(DEF[k]));if(onlive)onlive();if(!live)upd()}
  r.addEventListener('pointerdown',function(){old=S.v[k]});r.addEventListener('input',function(){if(old===undefined)old=S.v[k];set(r.value,true)});r.addEventListener('change',function(){commit(k,old===undefined?S.v[k]:old,S.v[k]);old=undefined});
  n.addEventListener('focus',function(){old=S.v[k]});n.addEventListener('input',function(){if(n.value!=='')set(n.value,true)});n.addEventListener('change',function(){commit(k,old,S.v[k]);old=S.v[k]});
  function key(e){if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key)<0)return;e.preventDefault();var dir=(e.key==='ArrowUp'||e.key==='ArrowRight')?1:-1,m=e.shiftKey?10:e.altKey?.1:1,o=S.v[k];set(+S.v[k]+dir*step*m);commit(k,o,S.v[k])}
  r.addEventListener('keydown',key);n.addEventListener('keydown',key);
  w.querySelector('label').addEventListener('dblclick',function(){var o=S.v[k];set(DEF[k]);commit(k,o,DEF[k]);toast(name+': zurück auf '+fmt(k,DEF[k]))});
  host.appendChild(w);return w}

/* ---------- Reiter ---------- */
var TABS={gestalt:[['schrift','Schrift'],['laden','Schrift laden'],['bewegung','Bewegung'],['farben','Farben'],['stile','Stile'],['raster','Raster'],['insp','Inspektor'],['wunsch','Wünsche'],['pub','Veröffentlichen']],
          spiel:[['momente','Momente'],['dialoge','Dialoge'],['figuren','Figuren'],['klaenge','Klänge'],['bot','Test-Bot'],['baender','Bänder'],['heat','Heatmap'],['pub','Veröffentlichen']]};
function render(){document.body.className=S.face;var tb=$('#tabs');tb.innerHTML='';TABS[S.face].forEach(function(t){var b=document.createElement('button');b.textContent=t[1];b.dataset.t=t[0];if(S.tab[S.face]===t[0])b.classList.add('on');b.onclick=function(){go(t[0])};tb.appendChild(b)});
  $$('#faceSeg button').forEach(function(b){b.classList.toggle('on',b.dataset.f===S.face);b.disabled=(S.role==='alina'&&b.dataset.f==='spiel');b.title=b.disabled?'Nur für Josef':''});
  stopAnim();var fn=VIEW[S.tab[S.face]+'_'+S.face]||VIEW[S.tab[S.face]];var bd=$('#body'),sc=bd.scrollTop,same=bd._t===S.tab[S.face];bd.innerHTML='';fn(bd);bd._t=S.tab[S.face];bd.scrollTop=same?sc:0}
function go(t){S.tab[S.face]=t;snd('move');render();apply()}
var VIEW={};
function tsChips(host,cur,on){var c=document.createElement('div');c.className='chips';TS.forEach(function(t){var b=document.createElement('button');b.textContent=t[1];if(t[0]===cur)b.classList.add('on');
  if(changed().some(function(k){return k.indexOf(t[0]+'.')===0}))b.classList.add('chg');b.onclick=function(){on(t[0])};c.appendChild(b)});host.appendChild(c)}
function pageText(){var o={h:'Bildende Kunst, Comic, Vermittlung',p:'Josef Knoll, geboren 1986 in München, zeichnet seit 2010: Tusche auf Papier, Comics, Vermittlung.'};try{var d=frames()[0].contentDocument;var h=d.querySelector('main h1, h1'),p=d.querySelector('main p');if(h&&h.textContent.trim())o.h=h.textContent.replace(/\s+/g,' ').trim().slice(0,60);if(p&&p.textContent.trim())o.p=p.textContent.replace(/\s+/g,' ').trim().slice(0,240)}catch(e){}return o}
function sampleFor(t){var x=pageText();return {text:x.p,head:x.h,menu:'Bildende Kunst · Comic · Texte · Vermittlung · Info',cap:'Josef Knoll, Ego Shooter, 2019, Tusche auf Papier, 60 × 50 cm',spiel:'Inka: Das Labor ist zu. Wagner hat den Schlüssel versteckt.'}[t]}
function kernHTML(txt,kp){var P={};(kp||'').split(' ').filter(Boolean).forEach(function(x){var a=x.split(':');P[a[0]]=+a[1]});var out='';for(var i=0;i<txt.length;i++){var pr=txt.substr(i,2);out+=(pr.length===2&&P[pr]!==undefined)?'<span style="letter-spacing:'+(P[pr]/1000)+'em">'+esc(txt[i])+'</span>':esc(txt[i])}return out}
function specStyle(t,V){V=V||S.v;var f=fontFam(V[t+'.font']),ax=Object.keys(V).filter(function(x){return x.indexOf(t+'.ax.')===0});
  return 'font-family:"'+f+'",sans-serif;font-size:'+Math.min(+V[t+'.sD'],t==='head'?64:40)+'px;line-height:'+V[t+'.lh']+';letter-spacing:'+V[t+'.tr']+'em;word-spacing:'+V[t+'.ws']+'em;'+(V[t+'.ft']?'font-feature-settings:'+featCSS(V[t+'.ft'])+';':'')+(ax.length?'font-variation-settings:'+ax.map(function(x){return '"'+x.split('.')[2]+'" '+V[x]}).join(', ')+';':'')+(t==='head'||t==='menu'?'text-transform:uppercase;':'')}
function liveSpec(){var t=S.ts,sp=$('#specT');if(!sp)return;sp.setAttribute('style',specStyle(t));sp.innerHTML=kernHTML(sampleFor(t),S.v[t+'.kp']);var a=$('#specAmp');if(a)a.innerHTML=amp(S.v['c.hell.ink'],S.v['c.hell.paper'],S.v[t+'.sM'])+' <span class="note">Handy '+S.v[t+'.sM']+' px · Desktop '+S.v[t+'.sD']+' px</span>';drawCurve()}
function drawCurve(){var c=$('#curve');if(!c)return;var t=S.ts,m=+S.v[t+'.sM'],d=+S.v[t+'.sD'],hi=Math.max(m,d)*1.15,W=400,H=84;function X(w){return 30+(w-320)/(1600-320)*(W-40)}function Y(s){return H-14-(s/hi)*(H-24)}
  var p='M'+X(320)+' '+Y(m)+' L'+X(360)+' '+Y(m)+' L'+X(1440)+' '+Y(d)+' L'+X(1600)+' '+Y(d);var fw=[];frames().forEach(function(f){fw.push(f.clientWidth)});
  c.innerHTML='<line x1="30" y1="'+(H-14)+'" x2="'+W+'" y2="'+(H-14)+'" stroke="#ccc"/><path d="'+p+'" fill="none" stroke="#0028FF" stroke-width="2.5"/>'+
   '<text x="'+X(360)+'" y="'+(H-2)+'" font-size="10" text-anchor="middle" fill="#6b6b6b">360</text><text x="'+X(1440)+'" y="'+(H-2)+'" font-size="10" text-anchor="middle" fill="#6b6b6b">1440 px Fensterbreite</text>'+
   '<text x="'+(X(360)+4)+'" y="'+(Y(m)-6)+'" font-size="11" fill="#0028FF">'+m+'</text><text x="'+(X(1440)-4)+'" y="'+(Y(d)-6)+'" font-size="11" text-anchor="end" fill="#0028FF">'+d+'</text>'+
   fw.map(function(w){var s=w<=360?m:w>=1440?d:m+(d-m)*(w-360)/1080;return '<circle cx="'+X(Math.min(1600,Math.max(320,w)))+'" cy="'+Y(s)+'" r="4.5" fill="#E2231A"><title>Vorschau jetzt: '+w+' px breit, '+s.toFixed(1)+' px</title></circle>'}).join('')}
var FEATS=[['liga','Ligaturen'],['dlig','Zier-Ligaturen'],['kern','Unterschneidung'],['onum','Mediävalziffern'],['lnum','Versalziffern'],['tnum','Tabellenziffern'],['smcp','Kapitälchen'],['salt','Alternativen'],['ss01','Satz 1'],['ss02','Satz 2'],['swsh','Schwünge'],['frac','Brüche']];
function featOn(t,tag){var s=S.v[t+'.ft']||'',m=s.match(new RegExp('(^| )'+tag+'=(\\d)'));if(m)return m[2]==='1';return tag==='liga'||tag==='kern'}
function setFeat(t,tag,on){var parts=(S.v[t+'.ft']||'').split(' ').filter(function(x){return x&&x.split('=')[0]!==tag});var def=(tag==='liga'||tag==='kern');if(on!==def)parts.push(tag+'='+(on?1:0));change(t+'.ft',parts.join(' '))}
var AXN={wght:'Gewicht',wdth:'Breite',opsz:'Optische Größe',slnt:'Neigung',ital:'Kursiv',GRAD:'Grad'};
function axesFor(t){Object.keys(S.v).forEach(function(k){if(k.indexOf(t+'.ax.')===0){delete S.v[k];delete DEF[k]}})}
VIEW.schrift=function(b){var t=S.ts;b.innerHTML='<h2>Schrift</h2><p class="note">Feinarbeit je Textsorte, gilt auf allen Seiten. Pfeiltasten im Feld: fein, mit Shift grob, mit '+(MAC?'⌥':'Alt')+' ganz fein. Doppelklick auf einen Namen setzt zurück.</p>';
  tsChips(b,t,function(x){S.ts=x;render()});
  var all=FONTS.concat(S.fonts.map(function(f){return f.name}));
  b.insertAdjacentHTML('beforeend','<div class="row" style="margin:8px 0"><select class="in" id="fsel" style="flex:1">'+all.map(function(f){return '<option'+(f===S.v[t+'.font']?' selected':'')+'>'+esc(f)+'</option>'}).join('')+'</select><button class="btn ghost" id="fab">Mit jetziger vergleichen</button></div>'+
   '<div class="spec"><div id="specT"></div></div><div style="margin-top:8px" id="specAmp"></div>');
  $('#fsel').onchange=function(){axesFor(t);change(t+'.font',this.value);render()};
  $('#fab').onclick=function(){var a=clone(S.v);a[t+'.font']=DEF[t+'.font'];compareVals(a,'Jetzt: '+DEF[t+'.font'],S.v,'Neu: '+S.v[t+'.font'])};
  var c=document.createElement('div');b.appendChild(c);
  c.insertAdjacentHTML('beforeend','<h3>Größe: Handy und Desktop, fließend dazwischen</h3><svg class="curve" id="curve" viewBox="0 0 400 84"></svg>');
  var big=t==='head'?220:60;ctl(c,t+'.sM','Handy (360 px)',6,big,.5,'px','',liveSpec);ctl(c,t+'.sD','Desktop (1440 px)',6,big,.5,'px','',liveSpec);
  c.insertAdjacentHTML('beforeend','<h3>Abstände</h3>');ctl(c,t+'.lh','Zeilenabstand',.7,2.4,.01,'','',liveSpec);ctl(c,t+'.tr','Laufweite',-.1,.3,.002,'em','',liveSpec);ctl(c,t+'.ws','Wortabstand',-.2,.6,.005,'em','',liveSpec);
  c.insertAdjacentHTML('beforeend','<h3>Achsen</h3>');var f=S.fonts.filter(function(x){return x.name===S.v[t+'.font']})[0];
  if(f&&f.info&&f.info.axes&&f.info.axes.length){f.info.axes.forEach(function(a){var k=t+'.ax.'+a.tag;if(S.v[k]===undefined){S.v[k]=a.def;DEF[k]=a.def}ctl(c,k,(AXN[a.tag]||a.tag)+' ('+a.tag+')',a.min,a.max,(a.max-a.min)>50?1:.1,'','',liveSpec)})}
  else c.insertAdjacentHTML('beforeend','<p class="note">'+(f&&f.info&&f.info.woff2?'Bei woff2 liest der Entwurf die Achsen noch nicht aus (im Umbau ja). Für den Test ttf, otf oder woff nehmen.':'Diese Schrift hat keine variablen Achsen. Variable Schriften zeigen hier ihre Regler (Gewicht, Breite, optische Größe …).')+'</p>');
  c.insertAdjacentHTML('beforeend','<h3>OpenType</h3><div class="tags" id="feats"></div><p class="note" style="font-size:12px">'+(f&&f.info&&f.info.feats&&f.info.feats.length?'Nur Funktionen, die diese Schrift wirklich hat.':'Was die Schrift nicht kann, bleibt ohne Wirkung.')+'</p>');
  var fl=(f&&f.info&&f.info.feats&&f.info.feats.length)?FEATS.filter(function(x){return f.info.feats.indexOf(x[0])>=0}).concat(f.info.feats.filter(function(x){return !FEATS.some(function(y){return y[0]===x})}).map(function(x){return [x,x]})):FEATS;
  fl.forEach(function(x){var on=featOn(t,x[0]);$('#feats').insertAdjacentHTML('beforeend','<label class="'+(on?'on':'')+'" title="'+esc(x[1])+'"><input type="checkbox" data-f="'+x[0]+'"'+(on?' checked':'')+'>'+x[0]+' · '+esc(x[1])+'</label>')});
  $$('#feats input').forEach(function(i){i.onchange=function(){setFeat(t,i.dataset.f,i.checked);render()}});
  c.insertAdjacentHTML('beforeend','<h3>Buchstabenpaare (Unterschneidung)</h3><div class="row"><input type="text" id="kpIn" maxlength="2" placeholder="z. B. Te" style="width:80px"><input type="number" id="kpV" value="-40" step="5" style="width:80px" class="mono"><span class="note">/1000 em</span><button class="btn ghost sm" id="kpAdd">Paar setzen</button></div><div id="kpL"></div><p class="note" style="font-size:12px">Im Entwurf wirken Paare im Muster, im Umbau auf der ganzen Seite.</p>');
  function kpList(){var L=(S.v[t+'.kp']||'').split(' ').filter(Boolean);$('#kpL').innerHTML=L.map(function(x,i){var a=x.split(':');return '<div class="li"><span style="flex:1;font-size:20px;font-family:\''+fontFam(S.v[t+'.font'])+'\'">'+esc(a[0])+'</span><span class="mono">'+a[1]+'</span><button class="btn ghost sm" data-r="'+i+'">entfernen</button></div>'}).join('');
    $$('#kpL [data-r]').forEach(function(x){x.onclick=function(){L.splice(+x.dataset.r,1);change(t+'.kp',L.join(' '));kpList();liveSpec()}})}
  $('#kpAdd').onclick=function(){var p=$('#kpIn').value;if(p.length!==2){toast('Genau zwei Zeichen, z. B. Te');return}var L=(S.v[t+'.kp']||'').split(' ').filter(function(x){return x&&x.split(':')[0]!==p});L.push(p+':'+(+$('#kpV').value||0));change(t+'.kp',L.join(' '));kpList();liveSpec()};kpList();
  c.insertAdjacentHTML('beforeend','<h3>Skala mit Lesbarkeits-Ampel (nur Warnung)</h3><div class="scale" id="scale"></div>');
  var base=+S.v['text.sD'];$('#scale').innerHTML=[['Titel',S.v['head.sD']],['Kapitel',base*1.9],['Zwischen',base*1.3],['Text',base],['Menü',S.v['menu.sD']],['Bildunterschrift',S.v['cap.sD']]].map(function(s){return '<div><span class="mono" style="width:68px">'+(+s[1]).toFixed(0)+' px</span><span class="t" style="font-size:'+Math.min(+s[1],40)+'px">'+s[0]+'</span>'+amp(S.v['c.hell.ink'],S.v['c.hell.paper'],+s[1])+'</div>'}).join('');
  liveSpec()};

/* ---------- Schrift laden: Datei lesen, Steckbrief, Mittellinie ---------- */
function str(dv,o,n){var s='';for(var i=0;i<n;i++)s+=String.fromCharCode(dv.getUint8(o+i));return s}
function inflate(u8){if(!window.DecompressionStream)return Promise.reject();var ds=new DecompressionStream('deflate');return new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer().then(function(b){return new Uint8Array(b)})}
function fontInfo(buf){var dv=new DataView(buf),sig=str(dv,0,4),T={},info={};
  if(sig==='wOF2')return Promise.resolve({woff2:true});
  function tbl(t){var x=T[t];if(!x)return Promise.resolve(null);var u=new Uint8Array(buf,x.o,x.cl);return (x.cl<x.ol?inflate(u):Promise.resolve(u.slice())).then(function(a){return new DataView(a.buffer)}).catch(function(){return null})}
  if(sig==='wOFF'){var n=dv.getUint16(12);for(var i=0;i<n;i++){var o=44+i*20;T[str(dv,o,4)]={o:dv.getUint32(o+4),cl:dv.getUint32(o+8),ol:dv.getUint32(o+12)}}}
  else{var n2=dv.getUint16(4);for(var j=0;j<n2;j++){var o2=12+j*16,l=dv.getUint32(o2+12);T[str(dv,o2,4)]={o:dv.getUint32(o2+8),cl:l,ol:l}}}
  return Promise.all(['name','maxp','fvar','GSUB','GPOS','OS/2','cmap'].map(tbl)).then(function(r){var nm=r[0],mx=r[1],fv=r[2],gs=r[3],gp=r[4],os=r[5],cm=r[6];
    try{if(nm){var cnt=nm.getUint16(2),so=nm.getUint16(4),N={};for(var i=0;i<cnt;i++){var o=6+i*12,pid=nm.getUint16(o),id=nm.getUint16(o+6),len=nm.getUint16(o+8),off=nm.getUint16(o+10),s='';
      if(pid===3||pid===0){for(var k=0;k<len;k+=2)s+=String.fromCharCode(nm.getUint16(so+off+k))}else if(pid===1){for(var k2=0;k2<len;k2++)s+=String.fromCharCode(nm.getUint8(so+off+k2))}else continue;if(!N[id]||pid===3)N[id]=s}info.names=N}}catch(e){}
    try{if(mx)info.glyphs=mx.getUint16(4)}catch(e){}
    try{if(fv){var ao=fv.getUint16(4),ac2=fv.getUint16(8),as=fv.getUint16(10);info.axes=[];for(var a=0;a<ac2;a++){var bb=ao+a*as;info.axes.push({tag:str(fv,bb,4),min:fv.getInt32(bb+4)/65536,def:fv.getInt32(bb+8)/65536,max:fv.getInt32(bb+12)/65536})}}}catch(e){}
    var F={};[gs,gp].forEach(function(g){try{if(!g)return;var fo=g.getUint16(6),fc=g.getUint16(fo);for(var i=0;i<fc;i++)F[str(g,fo+2+i*6,4)]=1}catch(e){}});info.feats=Object.keys(F);
    try{if(os)info.fsType=os.getUint16(8)}catch(e){}
    try{if(cm){var nt=cm.getUint16(2),best=null;for(var i2=0;i2<nt;i2++){var pid2=cm.getUint16(4+i2*8),off2=cm.getUint32(8+i2*8);if(cm.getUint16(off2)===4&&(pid2===3||pid2===0))best=off2}
      if(best!==null){var segX2=cm.getUint16(best+6),ends=best+14,starts=ends+segX2+2,has=function(cp){for(var s=0;s<segX2/2;s++){if(cp<=cm.getUint16(ends+s*2))return cp>=cm.getUint16(starts+s*2)}return false},all=function(str2){return str2.split('').every(function(ch){return has(ch.charCodeAt(0))})};
        info.lang={'Deutsch':all('äöüßÄÖÜ'),'Französisch':all('éèêàçœ'),'Türkisch':all('ğışĞİŞ'),'Polnisch':all('ąćęłńśźż'),'Griechisch':all('αβγ'),'Kyrillisch':all('абв')}}}}catch(e){}
    return info})}
var FSN={0:'frei einbettbar',2:'eingeschränkt (nicht einbetten)',4:'nur Ansicht und Druck',8:'bearbeitbar'};
function addFont(file){var ext=(file.name.split('.').pop()||'').toLowerCase();if(['woff2','woff','ttf','otf'].indexOf(ext)<0){toast('Unbekanntes Format: '+file.name);return}
  file.arrayBuffer().then(function(buf){var nm=file.name.replace(/\.[^.]+$/,''),fam='WS-'+(S.fonts.length+1)+'-'+nm.replace(/[^A-Za-z0-9]/g,''),url=URL.createObjectURL(new Blob([buf]));
    var ff=new FontFace(fam,buf.slice(0));ff.load().then(function(x){document.fonts.add(x)}).catch(function(){toast('Die Datei '+file.name+' lässt sich nicht als Schrift laden.')});
    return fontInfo(buf.slice(0)).catch(function(){return {}}).then(function(info){var disp=(info.names&&(info.names[4]||info.names[1]))||nm;if(S.fonts.some(function(x){return x.name===disp}))disp+=' ('+(S.fonts.length+1)+')';
      var f={name:disp,fam:fam,url:url,size:buf.byteLength,fmt:ext,info:info,lic:false,outline:false};S.fonts.push(f);snd('ok');toast('Schrift geladen: '+disp);S.tab.gestalt='laden';S.face='gestalt';render();apply()})})}
function showDrop(on){$('#drop').style.display=on?'flex':'none'}
window.addEventListener('dragenter',function(e){if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types,'Files')>=0)showDrop(true)});
$('#drop').addEventListener('dragover',function(e){e.preventDefault()});$('#drop').addEventListener('dragleave',function(e){if(e.target.id==='drop')showDrop(false)});
$('#drop').addEventListener('drop',function(e){e.preventDefault();showDrop(false);handleFiles(e.dataTransfer.files)});
function handleFiles(files){[].forEach.call(files,function(f){if(/^image\//.test(f.type))loadImage(f);else if(/\.ase$/i.test(f.name))readASE(f);else addFont(f)})}
$('#fileIn').onchange=function(){handleFiles(this.files);this.value=''};
VIEW.laden=function(b){b.innerHTML='<h2>Schrift laden</h2><p class="note">Schriftdatei einfach irgendwo auf das Fenster ziehen (woff2, woff, ttf, otf, auch mehrere) oder <a href="#" id="pickF">Datei wählen</a>. Neue Schriften bekommen automatisch alle Filter der Seite: Plotter, Holzschnitt, Netz.</p>';
  $('#pickF').onclick=function(e){e.preventDefault();$('#fileIn').click()};
  if(!S.fonts.length){b.insertAdjacentHTML('beforeend','<div class="spec" style="text-align:center;padding:40px 16px;border-style:dashed"><div style="font-size:40px">⇣</div>Noch keine Schrift geladen.<br><span class="note">Zum Testen eine ttf oder otf hineinziehen.</span></div>');return}
  S.fonts.slice().reverse().forEach(function(f){var I=f.info||{},N=I.names||{};var card=document.createElement('div');card.className='fcard';
    card.innerHTML='<div class="row" style="justify-content:space-between"><span class="mono">'+esc(f.fmt.toUpperCase())+' · '+(f.size/1024).toFixed(0)+' KB</span><button class="btn ghost sm" data-cmp>Mit jetziger vergleichen</button></div>'+
     '<div class="nm" style="font-family:\''+f.fam+'\'">'+esc(f.name)+'</div><div style="font-family:\''+f.fam+'\';font-size:20px;line-height:1.35">'+esc(sampleFor('text').slice(0,120))+'</div>'+
     '<div style="font-family:\''+f.fam+'\';font-size:15px;margin-top:6px;color:#444">ABCDEFGHIJKLMNOPQRSTUVWXYZ ÄÖÜ abcdefghijklmnopqrstuvwxyz äöüß 0123456789 &amp;?!»«</div>'+
     '<h3>Steckbrief</h3><div class="kv">'+(I.woff2?'<span>Hinweis</span><span>woff2 ist gepackt; der Steckbrief kommt im Umbau (auf dem Server). Für den Test ttf, otf oder woff nehmen.</span>':
       '<span>Familie</span><span>'+esc(N[1]||'?')+' '+esc(N[2]||'')+'</span><span>Zeichen</span><span>'+(I.glyphs||'?')+' Glyphen</span>'+
       '<span>Sprachen</span><span>'+(I.lang?Object.keys(I.lang).map(function(k){return (I.lang[k]?'✓ ':'✕ ')+k}).join(' · '):'?')+'</span>'+
       '<span>Achsen</span><span>'+(I.axes&&I.axes.length?I.axes.map(function(a){return a.tag+' '+a.min+' bis '+a.max}).join(' · '):'keine (statisch)')+'</span>'+
       '<span>OpenType</span><span class="mono" style="font-size:12px">'+(I.feats&&I.feats.length?esc(I.feats.join(' ')):'keine')+'</span>'+
       '<span>Einbetten</span><span>'+(I.fsType!==undefined?esc(FSN[I.fsType&14]||('Wert '+I.fsType)):'?')+'</span>'+
       '<span>Urheber</span><span>'+esc((N[0]||'?').slice(0,160))+'</span><span>Lizenz</span><span>'+esc((N[13]||'keine Angabe in der Datei').slice(0,220))+(N[14]?'<br><span class="mono" style="font-size:11.5px">'+esc(N[14])+'</span>':'')+'</span>')+'</div>'+
     '<label class="row" style="margin:10px 0"><input type="checkbox" data-lic'+(f.lic?' checked':'')+'> Webnutzung ist laut Lizenz erlaubt (deine Bestätigung)</label>'+
     '<h3>Plotter: Mittellinie</h3><canvas class="skel" width="840" height="150"></canvas><div class="row" style="margin-top:6px"><label class="row"><input type="checkbox" data-out'+(f.outline?' checked':'')+'> Umriss nachfahren statt Mittellinie</label></div>'+
     '<p class="note" style="font-size:12px">Rot: berechnete Linie, die der Stift schreibt. Im Entwurf grob aus Pixeln, im Umbau als saubere Vektorlinie je Buchstabe. Bis dahin zeigt die Vorschau geänderten Fließtext ohne Plotter.</p>'+
     '<h3>Ausprobieren auf der echten Seite</h3><div class="row">'+TS.map(function(t){var on=S.v[t[0]+'.font']===f.name;return '<button class="btn sm '+(on?'pri':'ghost')+'" data-ts="'+t[0]+'">'+(on?'✓ ':'')+t[1]+'</button>'}).join('')+'</div>';
    b.appendChild(card);
    card.querySelector('[data-lic]').onchange=function(){f.lic=this.checked;toast(f.lic?'Bestätigt.':'Bestätigung zurückgenommen.')};
    card.querySelector('[data-out]').onchange=function(){f.outline=this.checked;skel(card.querySelector('canvas'),f)};
    card.querySelector('[data-cmp]').onclick=function(){var bb=clone(S.v);bb['text.font']=f.name;bb['head.font']=f.name;compareVals(clone(S.v),'Jetzt',bb,'Neu: '+f.name)};
    $$('[data-ts]',card).forEach(function(x){x.onclick=function(){var t=x.dataset.ts;axesFor(t);if(S.v[t+'.font']===f.name){change(t+'.font',DEF[t+'.font'])}else{change(t+'.font',f.name);toast(f.name+' als '+TSN[t]+' auf der Seite. Feinarbeit im Reiter Schrift.')}render()}});
    document.fonts.load('40px "'+f.fam+'"').then(function(){skel(card.querySelector('canvas'),f)})})};
function skel(cv,f){var g=cv.getContext('2d'),W=cv.width,H=cv.height,T='Aa Ee Gg Rr 25';g.clearRect(0,0,W,H);g.fillStyle='#000';g.font='96px "'+f.fam+'"';g.textBaseline='alphabetic';g.fillText(T,14,112);
  var im=g.getImageData(0,0,W,H),d=im.data,B=new Uint8Array(W*H);for(var i=0;i<W*H;i++)B[i]=d[i*4+3]>110?1:0;
  g.clearRect(0,0,W,H);g.globalAlpha=.16;g.fillText(T,14,112);g.globalAlpha=1;g.fillStyle='#E2231A';
  if(f.outline){for(var y=1;y<H-1;y++)for(var x=1;x<W-1;x++){var p=y*W+x;if(B[p]&&(!B[p-1]||!B[p+1]||!B[p-W]||!B[p+W]))g.fillRect(x,y,1.6,1.6)}return}
  function N(p){return [B[p-W],B[p-W+1],B[p+1],B[p+W+1],B[p+W],B[p+W-1],B[p-1],B[p-W-1]]}
  var ch=true,it=0;while(ch&&it<40){ch=false;it++;for(var pass=0;pass<2;pass++){var del=[];for(var y2=1;y2<H-1;y2++)for(var x2=1;x2<W-1;x2++){var q=y2*W+x2;if(!B[q])continue;var n=N(q),s=n[0]+n[1]+n[2]+n[3]+n[4]+n[5]+n[6]+n[7];if(s<2||s>6)continue;var tr=0;for(var k=0;k<8;k++)if(!n[k]&&n[(k+1)%8])tr++;if(tr!==1)continue;
    if(pass===0){if(n[0]*n[2]*n[4]||n[2]*n[4]*n[6])continue}else{if(n[0]*n[2]*n[6]||n[0]*n[4]*n[6])continue}del.push(q)}if(del.length){ch=true;del.forEach(function(q){B[q]=0})}}}
  for(var z=0;z<W*H;z++)if(B[z])g.fillRect(z%W-.4,((z/W)|0)-.4,1.9,1.9)}

/* ---------- Bewegung ---------- */
var AT=null,APOS=0,APLAY=false,AN_CH=0;
function stopAnim(){clearInterval(AT);AT=null;APLAY=false}
function artOf(){return S.calm?S.v['calm.an']:S.v[S.bts+'.an']}
VIEW.bewegung=function(b){var t=S.bts,art=artOf();b.innerHTML='<h2>Bewegung</h2><p class="note">Art und Tempo der Animation je Textsorte. Der Musterabsatz zeigt die Wirkung sofort; „Echte Seite neu abspielen“ lädt die Vorschau neu.</p>';
  tsChips(b,t,function(x){S.bts=x;APOS=0;render()});
  b.insertAdjacentHTML('beforeend','<div class="row" style="margin:8px 0"><span class="seg" id="artSeg">'+ARTS.map(function(a){return '<button data-a="'+a+'" class="'+(a===art?'on':'')+'">'+a+'</button>'}).join('')+'</span></div>'+
   '<label class="row" style="margin:4px 0 10px"><input type="checkbox" id="calm"'+(S.calm?' checked':'')+'> Vorschau als ruhige Fassung („Bewegung reduzieren“)</label>'+
   '<div class="anim" id="anim"></div><input type="range" class="tline" id="tline" min="0" max="1000" value="0" title="Zeitleiste: ziehen zum Spulen">'+
   '<div class="row"><button class="btn sm" id="aplay">❚❚ Pause</button><button class="btn ghost sm" id="arep">↺ Wiederholen</button><span class="seg" id="slow">'+[['0.1','10 %'],['0.25','25 %'],['0.5','50 %'],['1','100 %']].map(function(x){return '<button data-s="'+x[0]+'" class="'+(String(S.slow)===x[0]?'on':'')+'">'+x[1]+'</button>'}).join('')+'</span><button class="btn ghost sm" id="areal">Echte Seite neu abspielen</button></div>');
  $$('#artSeg button').forEach(function(x){x.onclick=function(){change(S.calm?'calm.an':t+'.an',x.dataset.a);APOS=0;render()}});
  $('#calm').onchange=function(){S.calm=this.checked;APOS=0;render()};
  $$('#slow button').forEach(function(x){x.onclick=function(){S.slow=+x.dataset.s;$$('#slow button').forEach(function(y){y.classList.toggle('on',y===x)});startAnim();$('#aplay').textContent='❚❚ Pause'}});
  $('#aplay').onclick=function(){if(APLAY){stopAnim();this.textContent='▶ Weiter'}else{startAnim();this.textContent='❚❚ Pause'}};$('#arep').onclick=function(){APOS=0;startAnim();$('#aplay').textContent='❚❚ Pause'};
  $('#tline').oninput=function(){stopAnim();$('#aplay').textContent='▶ Weiter';APOS=Math.round(this.value/1000*AN_CH);drawAnim()};
  $('#areal').onclick=function(){buildStage();toast('Vorschau lädt neu. Im Umbau spielt sie mit deinen Werten.')};
  var groups={};AN.forEach(function(a){(groups[a[1]]=groups[a[1]]||[]).push(a)});
  var only=(art==='Schreibmaschine'||art==='Einblenden');
  var show=S.calm?['Ruhige Fassung']:((art==='keine')?[]:['Plotter']).concat(t==='head'?['Holzschnitt']:[]).concat(t==='text'?['Dürer-Handschrift']:[]).concat(['Seite']);
  show.forEach(function(gname){var h=document.createElement('div');h.innerHTML='<h3>'+gname+(gname==='Plotter'&&only?' (bei '+art+' wirkt nur das Tempo)':'')+'</h3>';b.appendChild(h);
    groups[gname].forEach(function(a){if(gname==='Plotter'&&only&&a[0]!=='plot.speed')return;ctl(h,a[0],a[2],a[4],a[5],a[6],a[7],a[8],function(){if(/^(hand|plot\.scratch|plot\.dot|fx\.)/.test(a[0])&&a[0]!=='fx.net'&&!/^fx\.(wood|woodgrain)$/.test(a[0]))buildAnim();else drawAnim()})})});
  buildAnim();startAnim()};
function rnd(i){var x=Math.sin(i*12.9898+78.233)*43758.5453;return x-Math.floor(x)}
function buildAnim(){var box=$('#anim');if(!box)return;var t=S.bts,V=S.v,art=artOf();box.innerHTML='';
  if(t==='head'){box.insertAdjacentHTML('beforeend','<svg width="0" height="0" style="position:absolute"><filter id="woodF"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="137"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter></svg><div class="wood"><span style="filter:url(#woodF)">'+esc(sampleFor('head'))+'</span><span class="net"></span></div>')}
  var p=document.createElement('div');p.id='atext';var ts=t==='head'?'text':t;p.setAttribute('style',specStyle(ts).replace(/font-size:[^;]+;/,'font-size:'+(t==='spiel'?18:t==='menu'?15:20)+'px;')+'position:relative;'+(t==='spiel'?'background:'+V['c.spiel.fenster']+';color:#fff;padding:10px;border:3px solid '+V['c.spiel.inka']:''));
  var txt=sampleFor(t==='head'?'text':t);
  p.innerHTML=txt.split('').map(function(c,i){return '<span class="ch'+(rnd(i+3)<V['plot.scratch']&&(art==='Plotter'||art==='Feder')?' sc':'')+'">'+esc(c)+'</span>'}).join('')+(t==='text'&&art!=='keine'&&!S.calm?'<span class="ch" data-hand="1" style="font-family:DuererHand;font-size:'+(20*V['hand.size'])+'px;line-height:1.1;margin-top:8px;color:#000;white-space:normal">'+'Josef Knoll, geboren 1986 in München'.split(' ').map(function(w,i){return '<span style="display:inline-block;transform:translateY('+(Math.sin(i*1.3)*V['hand.wave']/10+(rnd(i+20)-.5)*V['hand.rand']/5).toFixed(1)+'px) rotate('+((rnd(i+40)-.5)*2*V['hand.tilt']).toFixed(1)+'deg);margin-right:'+(V['hand.join']?'.12em':'.35em')+'">'+w+'</span>'}).join('')+'</span>':'');
  box.appendChild(p);var pen=document.createElement('div');pen.className='pen';box.appendChild(pen);AN_CH=p.querySelectorAll('.ch').length;APOS=Math.min(APOS,AN_CH);drawAnim()}
function drawAnim(){var box=$('#anim');if(!box)return;var V=S.v,t=S.bts,art=artOf(),chs=$$('#atext .ch'),pen=$('.pen',box),br=box.getBoundingClientRect();
  if(t==='head'){var wf=$('#woodF');if(wf){wf.querySelector('feTurbulence').setAttribute('baseFrequency',(0.02+0.06*V['fx.woodgrain']).toFixed(3));wf.querySelector('feDisplacementMap').setAttribute('scale',V['fx.wood']*3)}var nt=$('.net',box);if(nt)nt.style.setProperty('--nw',V['fx.net']+'px')}
  $$('.blot',box).forEach(function(x){x.remove()});
  chs.forEach(function(c,i){var vis=art==='keine'||i<APOS,o=1,tf='',hand=c.dataset.hand;
    if((art==='Plotter'||art==='Feder')&&!hand){var j=V['plot.jitter']*(art==='Feder'?1.6:1);tf='rotate('+((rnd(i)-.5)*2.4*j).toFixed(2)+'deg) translateY('+((rnd(i+7)-.5)*1.4*j).toFixed(2)+'px)';o=1-V['plot.ink']*.35*((i%37)/37);c.style.webkitTextStroke=Math.max(0,(V['plot.stroke']-1.2)*.5)+'px currentColor'}else c.style.webkitTextStroke='';
    c.style.transition=art==='Einblenden'?'opacity .45s':'none';c.style.opacity=vis?o:0;c.style.transform=tf;c.style.display=hand?'block':'inline-block';
    if(vis&&!hand&&(art==='Plotter'||art==='Feder')&&V['plot.bleed']>0&&rnd(i+11)<.05*V['plot.bleed']&&/\S/.test(c.textContent)){var r=c.getBoundingClientRect(),bl=document.createElement('span');bl.className='blot';var s=1.5+rnd(i+5)*2*Math.min(2,V['plot.bleed']);Object.assign(bl.style,{left:(r.left-br.left-1)+'px',top:(r.top-br.top+r.height*.55)+'px',width:s+'px',height:s+'px',opacity:.8});box.appendChild(bl)}});
  var cur=chs[Math.max(0,Math.min(chs.length-1,APOS-1))];if(pen&&cur&&(art==='Plotter'||art==='Feder')&&APOS>0&&APOS<AN_CH){var rr=cur.getBoundingClientRect(),d=V['plot.dot']*2;Object.assign(pen.style,{display:d?'block':'none',width:d+'px',height:d+'px',left:(rr.right-br.left-d/2)+'px',top:(rr.top-br.top+rr.height*.6-d/2)+'px',background:V['c.spiel.stift']})}else if(pen)pen.style.display='none';
  var tl=$('#tline');if(tl&&AN_CH)tl.value=Math.round(APOS/AN_CH*1000)}
function startAnim(){stopAnim();var art=artOf();if(art==='keine'){APOS=AN_CH;drawAnim();return}if(APOS>=AN_CH)APOS=0;APLAY=true;
  var sp=(S.calm?1/S.v['calm.speed']*2:S.v['plot.speed'])*(S.slow||1),dt=art==='Schreibmaschine'?60:art==='Einblenden'?40:28;
  AT=setInterval(function(){APOS=Math.min(AN_CH,APOS+(art==='Einblenden'?6:1));if(art==='Schreibmaschine')snd('key');drawAnim();if(APOS>=AN_CH){stopAnim();var b=$('#aplay');if(b)b.textContent='▶ Weiter'}},Math.max(8,dt/sp))}

/* ---------- Farben ---------- */
VIEW.farben=function(b){var m=S.mode;b.innerHTML='<h2>Farben</h2><p class="note">Feld antippen öffnet die Farbwahl, im Hex-Feld direkt tippen, „OKLCH“ zeigt Regler mit gleichbleibender Helligkeit, „Ziel“ bringt eine Farbe auf einen Kontrast. Die Ampel warnt nur.</p>'+
   '<div class="row"><span class="seg" id="modeSeg">'+Object.keys(MODEN).map(function(x){return '<button data-m="'+x+'" class="'+(x===m?'on':'')+'">'+MODEN[x]+'</button>'}).join('')+'</span></div>';
  $$('#modeSeg button').forEach(function(x){x.onclick=function(){S.mode=x.dataset.m;render();apply()}});
  var V=S.v,pm=m==='spiel'?'hell':m,P=V['c.'+pm+'.paper'],I=V['c.'+pm+'.ink'];
  if(m!=='spiel')b.insertAdjacentHTML('beforeend','<div class="prev" style="background:'+P+';color:'+I+';border-color:'+V['c.'+m+'.line']+'"><div style="font-family:Duerer1525;font-size:30px;line-height:1;text-transform:uppercase">Bildende Kunst</div><div style="font-family:Relief;font-size:17px;margin:6px 0">Josef Knoll, geboren 1986 in München. <span style="color:'+(V['c.'+m+'.red']||V['c.hell.red'])+'">Serien</span> wie LICK IT CUT IT.</div><div style="font-family:\'Duerer Sans\';font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:'+V['c.'+m+'.grey']+';border-top:1px solid '+V['c.'+m+'.hair']+';padding-top:6px">Tusche auf Papier · 60 × 50 cm</div></div>');
  else b.insertAdjacentHTML('beforeend','<div class="mx" style="--fc:'+V['c.spiel.inka']+';background:'+V['c.spiel.fenster']+';margin:8px 0"><b>INKA</b> Das Labor ist zu. <span style="color:'+V['c.spiel.wagner']+'">Wagner</span> hat den Schlüssel.<span class="tri">▼</span></div>');
  if(S.picks.length)b.insertAdjacentHTML('beforeend','<div class="row" style="margin:6px 0"><span class="note">Farbe zum Übernehmen:</span>'+S.picks.map(function(p,i){return '<button class="pick" data-p="'+i+'" style="cursor:pointer;'+(S.pick===p.hex?'border-color:#0028FF;box-shadow:0 0 0 2px #0028FF':'')+'"><i style="background:'+p.hex+'"></i>'+esc(p.name||p.hex)+'</button>'}).join('')+'</div>');
  $$('[data-p]',b).forEach(function(x){x.onclick=function(){S.pick=S.picks[+x.dataset.p].hex;render()}});
  var eye='EyeDropper' in window;
  CM[m].forEach(function(c){var k='c.'+m+'.'+c[0],v=V[k],isText=(c[0]==='ink'||c[0]==='grey'||c[0]==='red'||c[0]==='blue-ink');
    var row=document.createElement('div');row.className='crow';
    row.innerHTML='<div class="sw" style="background:'+v+'"><input type="color" value="'+v+'" title="'+esc(c[1])+' ändern"></div>'+
     '<div><div class="nmh"><b>'+esc(c[1])+(String(v)!==String(DEF[k])?' <span style="color:var(--blue)">●</span>':'')+'</b><input class="hex" value="'+v.toUpperCase()+'" spellcheck="false"></div><div style="margin-top:4px">'+(c[0]==='paper'?amp(V['c.'+m+'.ink'],v,17)+' <span class="note">Schrift darauf</span>':m==='spiel'?(c[0]==='fenster'?amp('#ffffff',v,18)+' <span class="note">weiße Schrift</span>':amp(v,V['c.spiel.fenster'],18)+' <span class="note">im Fenster</span>'):amp(v,P,isText?17:24)+' <span class="note">auf Papier</span>')+'</div></div>'+
     '<div class="acts"><div class="row" style="gap:4px"><button class="btn ghost sm" data-ok>OKLCH</button><button class="btn ghost sm" data-eye title="'+(eye?'Farbe irgendwo vom Bildschirm nehmen':'Pipette gibt es nur in Chrome und Edge. In Safari: Bildschirmfoto hineinziehen und Messpunkt setzen.')+'"'+(eye?'':' disabled')+'>Pipette</button></div><div class="row" style="gap:4px">'+(S.pick?'<button class="btn ghost sm" data-pk title="Gewählte Farbe übernehmen"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+S.pick+';margin-right:4px"></i>⇠</button>':'')+'<button class="btn ghost sm" data-rs title="Zurück auf veröffentlichten Wert">↺</button></div>'+((c[0]!=='paper'&&m!=='spiel')?'<div class="row" style="gap:4px"><span class="note" style="font-size:11.5px">Ziel</span><button class="btn ghost sm" data-t="3">3:1</button><button class="btn ghost sm" data-t="4.5">4,5:1</button><button class="btn ghost sm" data-t="7">7:1</button></div>':'')+'</div>';
    b.appendChild(row);var ci=row.querySelector('input[type=color]'),hx=row.querySelector('.hex'),old;
    function live(val){S.v[k]=val;row.querySelector('.sw').style.background=val;hx.value=val.toUpperCase();apply()}
    ci.addEventListener('click',function(){old=S.v[k]});ci.addEventListener('input',function(){if(old===undefined)old=S.v[k];live(ci.value)});ci.addEventListener('change',function(){commit(k,old,ci.value);old=undefined;render()});
    hx.addEventListener('change',function(){var x=hx.value.trim();if(!/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(x)){toast('Bitte Hex wie #E2231A');hx.value=S.v[k].toUpperCase();return}if(x[0]!=='#')x='#'+x;if(x.length===4)x='#'+x[1]+x[1]+x[2]+x[2]+x[3]+x[3];change(k,x.toLowerCase());render()});
    row.querySelector('[data-rs]').onclick=function(){change(k,DEF[k]);render()};
    var pk=row.querySelector('[data-pk]');if(pk)pk.onclick=function(){change(k,S.pick);render()};
    row.querySelector('[data-eye]').onclick=function(){if(!eye)return;new EyeDropper().open().then(function(r){var h=r.sRGBHex;if(!/^#/.test(h)){var mm=h.match(/\d+/g);h='#'+mm.slice(0,3).map(function(x){return ('0'+(+x).toString(16)).slice(-2)}).join('')}change(k,h.toLowerCase());render()}).catch(function(){})};
    $$('[data-t]',row).forEach(function(x){x.onclick=function(){var nv=toTarget(S.v[k],P,+x.dataset.t);if(nv===S.v[k])toast(c[1]+' erreicht '+x.dataset.t.replace('.',',')+':1 schon.');else{change(k,nv);toast(c[1]+' auf '+x.dataset.t.replace('.',',')+':1 gebracht (nur die Helligkeit geändert).')}render()}});
    row.querySelector('[data-ok]').onclick=function(){S.okl[k]=!S.okl[k];render()};
    if(S.okl[k]){var o=hex2oklch(v),pnl=document.createElement('div');pnl.className='okl';
      pnl.innerHTML=[['L','Helligkeit',0,1,.005,o[0]],['C','Buntheit',0,.37,.002,o[1]],['H','Farbton',0,360,1,o[2]]].map(function(r){return '<div class="r"><span>'+r[1]+'</span><input type="range" data-c="'+r[0]+'" min="'+r[2]+'" max="'+r[3]+'" step="'+r[4]+'" value="'+r[5]+'"><span class="mono" data-cv="'+r[0]+'">'+(+r[5]).toFixed(r[0]==='H'?0:3)+'</span></div>'}).join('')+'<div class="note mono" style="font-size:11.5px" data-css></div>';
      row.appendChild(pnl);var L=o[0],C=o[1],H=o[2],o2;
      function tracks(){var q=function(f){var s=[];for(var i=0;i<=12;i++)s.push(f(i/12));return 'linear-gradient(90deg,'+s.join(',')+')'};
        pnl.querySelector('[data-c=L]').style.background=q(function(x){return oklch2hex(x,C,H)});pnl.querySelector('[data-c=C]').style.background=q(function(x){return oklch2hex(L,x*.37,H)});pnl.querySelector('[data-c=H]').style.background=q(function(x){return oklch2hex(L,Math.max(C,.04),x*360)});
        pnl.querySelector('[data-css]').textContent='oklch('+(L*100).toFixed(1)+'% '+C.toFixed(3)+' '+H.toFixed(0)+') = '+oklch2hex(L,C,H).toUpperCase()}
      tracks();$$('input[type=range]',pnl).forEach(function(r){r.addEventListener('pointerdown',function(){o2=S.v[k]});r.addEventListener('input',function(){if(o2===undefined)o2=S.v[k];var c2=r.dataset.c,val=+r.value;if(c2==='L')L=val;if(c2==='C')C=val;if(c2==='H')H=val;pnl.querySelector('[data-cv='+c2+']').textContent=val.toFixed(c2==='H'?0:3);live(oklch2hex(L,C,H));tracks()});
        r.addEventListener('change',function(){commit(k,o2,S.v[k]);o2=undefined;render()})})}});
  b.insertAdjacentHTML('beforeend','<h3>Farben aus Bild</h3><p class="note">Bild oder Bildschirmfoto hineinziehen oder <a href="#" id="pickI">wählen</a>. Messpunkte verschieben; der zuletzt berührte Punkt ist die Farbe zum Übernehmen (⇠ bei der Zielfarbe).</p><div class="imgbox" id="imgbox"></div>'+
   '<h3>Austausch mit Adobe</h3><div class="row"><button class="btn ghost" id="aseOut">Palette als .ase speichern</button><button class="btn ghost" id="aseIn">.ase laden</button><button class="btn ghost" id="pngOut">Palette als Bild</button></div>');
  $('#pickI').onclick=function(e){e.preventDefault();$('#fileIn').click()};$('#aseIn').onclick=function(){$('#fileIn').click()};
  $('#aseOut').onclick=function(){var L=[];Object.keys(CM).forEach(function(mm){CM[mm].forEach(function(c){L.push({name:MODEN[mm]+' '+c[1],hex:S.v['c.'+mm+'.'+c[0]]})})});dl(aseBlob(L),'theidealcity-farben.ase');toast('Palette gespeichert: '+L.length+' Farben, ladbar in Illustrator, InDesign, Photoshop.')};
  $('#pngOut').onclick=palPNG;if(S.img)drawImg()};
function dl(blob,name){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){a.remove()},100)}
function aseBlob(list){var parts=[];function u16(v){var b=new Uint8Array(2);new DataView(b.buffer).setUint16(0,v);parts.push(b)}function u32(v){var b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,v);parts.push(b)}function f32(v){var b=new Uint8Array(4);new DataView(b.buffer).setFloat32(0,v);parts.push(b)}
  parts.push(new TextEncoder().encode('ASEF'));u16(1);u16(0);u32(list.length);
  list.forEach(function(c){var n=c.name,nl=n.length+1;u16(1);u32(2+nl*2+4+12+2);u16(nl);for(var i=0;i<n.length;i++)u16(n.charCodeAt(i));u16(0);parts.push(new TextEncoder().encode('RGB '));rgb(c.hex).forEach(function(x){f32(x/255)});u16(2)});
  return new Blob(parts,{type:'application/octet-stream'})}
function readASE(file){file.arrayBuffer().then(function(buf){var dv=new DataView(buf);if(str(dv,0,4)!=='ASEF'){toast('Keine .ase-Datei');return}var n=dv.getUint32(8),o=12,got=[];
  for(var i=0;i<n&&o<buf.byteLength;i++){var type=dv.getUint16(o),len=dv.getUint32(o+2),p=o+6;if(type===1){var nl=dv.getUint16(p),nm='';for(var j=0;j<nl-1;j++)nm+=String.fromCharCode(dv.getUint16(p+2+j*2));var q=p+2+nl*2,model=str(dv,q,4);q+=4;var c=null;
    if(model==='RGB ')c=[dv.getFloat32(q),dv.getFloat32(q+4),dv.getFloat32(q+8)];else if(model==='Gray')c=[dv.getFloat32(q),dv.getFloat32(q),dv.getFloat32(q)];else if(model==='CMYK'){var C=dv.getFloat32(q),M=dv.getFloat32(q+4),Y=dv.getFloat32(q+8),K=dv.getFloat32(q+12);c=[(1-C)*(1-K),(1-M)*(1-K),(1-Y)*(1-K)]}
    if(c)got.push({name:nm,hex:'#'+c.map(function(x){return ('0'+Math.round(Math.max(0,Math.min(1,x))*255).toString(16)).slice(-2)}).join('')})}o=p+len}
  S.picks=got.slice(0,30);S.pick=S.picks[0]&&S.picks[0].hex;S.face='gestalt';S.tab.gestalt='farben';render();toast(got.length+' Farben aus '+file.name+' geladen. Antippen, dann ⇠ bei der Zielfarbe.')})}
function palPNG(){var L=[];Object.keys(CM).forEach(function(mm){CM[mm].forEach(function(c){L.push([MODEN[mm]+' · '+c[1],S.v['c.'+mm+'.'+c[0]]])})});var cv=document.createElement('canvas'),W=1200,R=60;cv.width=W;cv.height=L.length*R+40;var g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,cv.height);
  L.forEach(function(x,i){g.fillStyle=x[1];g.fillRect(20,20+i*R,160,R-8);g.strokeStyle='#0002';g.strokeRect(20.5,20.5+i*R,159,R-9);g.fillStyle='#000';g.font='24px Relief';g.fillText(x[0],200,50+i*R);g.font='18px JBM';g.fillText(x[1].toUpperCase(),860,50+i*R)});cv.toBlob(function(b){dl(b,'theidealcity-farben.png')})}
function loadImage(file){var img=new Image();img.onload=function(){var cv=document.createElement('canvas'),W=420,H=Math.round(img.height/img.width*W);cv.width=W;cv.height=H;cv.getContext('2d').drawImage(img,0,0,W,H);S.img={cv:cv,marks:kmeans(cv,5)};S.picks=S.img.marks.map(function(mk,i){return {name:'Bild '+(i+1),hex:pxHex(mk.x,mk.y)}});S.pick=S.picks[0].hex;S.face='gestalt';S.tab.gestalt='farben';render();toast('Bild geladen. Messpunkte verschieben, dann ⇠ bei der Zielfarbe.')};img.src=URL.createObjectURL(file)}
function kmeans(cv,k){var g=cv.getContext('2d'),d=g.getImageData(0,0,cv.width,cv.height).data,P=[];for(var y=0;y<cv.height;y+=6)for(var x=0;x<cv.width;x+=6){var i=(y*cv.width+x)*4;P.push([d[i],d[i+1],d[i+2],x,y])}
  var C=[];for(var c=0;c<k;c++)C.push(P[Math.floor((c+.5)/k*P.length)].slice(0,3));
  for(var it=0;it<8;it++){var S2=C.map(function(){return [0,0,0,0]});P.forEach(function(p){var bi=0,bd=1e9;C.forEach(function(c,j){var dd=(p[0]-c[0])*(p[0]-c[0])+(p[1]-c[1])*(p[1]-c[1])+(p[2]-c[2])*(p[2]-c[2]);if(dd<bd){bd=dd;bi=j}});var s=S2[bi];s[0]+=p[0];s[1]+=p[1];s[2]+=p[2];s[3]++});C=S2.map(function(s,j){return s[3]?[s[0]/s[3],s[1]/s[3],s[2]/s[3]]:C[j]})}
  return C.map(function(c){var bp=P[0],bd=1e9;P.forEach(function(p){var dd=(p[0]-c[0])*(p[0]-c[0])+(p[1]-c[1])*(p[1]-c[1])+(p[2]-c[2])*(p[2]-c[2]);if(dd<bd){bd=dd;bp=p}});return {x:bp[3]/cv.width,y:bp[4]/cv.height}})}
function pxHex(x,y){var c=S.img.cv,d=c.getContext('2d').getImageData(Math.min(c.width-1,Math.max(0,Math.round(x*c.width))),Math.min(c.height-1,Math.max(0,Math.round(y*c.height))),1,1).data;return '#'+[d[0],d[1],d[2]].map(function(v){return ('0'+v.toString(16)).slice(-2)}).join('')}
function drawImg(){var box=$('#imgbox');if(!box||!S.img)return;box.innerHTML='';var cv=S.img.cv;var show=document.createElement('canvas');show.width=cv.width;show.height=cv.height;show.getContext('2d').drawImage(cv,0,0);box.appendChild(show);
  S.img.marks.forEach(function(m,i){var e=document.createElement('div');e.className='mk'+(S.pick&&S.picks[i]&&S.pick===S.picks[i].hex?' on':'');e.style.left=(m.x*100)+'%';e.style.top=(m.y*100)+'%';e.style.background=pxHex(m.x,m.y);box.appendChild(e);
    var drag=false;e.addEventListener('pointerdown',function(ev){drag=true;e.setPointerCapture(ev.pointerId)});
    e.addEventListener('pointermove',function(ev){if(!drag)return;var r=show.getBoundingClientRect();m.x=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));m.y=Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));e.style.left=(m.x*100)+'%';e.style.top=(m.y*100)+'%';e.style.background=pxHex(m.x,m.y)});
    e.addEventListener('pointerup',function(){drag=false;S.picks=S.img.marks.map(function(mk,j){return {name:'Bild '+(j+1),hex:pxHex(mk.x,mk.y)}});S.pick=S.picks[i].hex;snd('ok');render()})})}

/* ---------- Stile ---------- */
VIEW.stile=function(b){b.innerHTML='<h2>Stile</h2><p class="note">Ganze Stände von Schrift, Farbe und Bewegung unter einem Namen sichern, umschalten und nebeneinander vergleichen.</p><div class="row"><input type="text" id="stN" placeholder="z. B. Alina ruhig" style="flex:1"><button class="btn pri" id="stS">Jetzigen Stand sichern</button></div><div id="stL" style="margin-top:10px"></div>'+
  (S.styles.length>1?'<h3>Vergleichen</h3><div class="row"><select class="in" id="stA" style="flex:1">'+S.styles.map(function(s,i){return '<option value="'+i+'">'+esc(s.name)+'</option>'}).join('')+'</select><span>mit</span><select class="in" id="stB" style="flex:1">'+S.styles.map(function(s,i){return '<option value="'+i+'"'+(i===S.styles.length-1?' selected':'')+'>'+esc(s.name)+'</option>'}).join('')+'</select><button class="btn" id="stC">Nebeneinander</button></div>':'');
  $('#stL').innerHTML=S.styles.map(function(s,i){var n=Object.keys(s.v).filter(function(k){return String(s.v[k])!==String(DEF[k])}).length;return '<div class="li"><div style="flex:1"><b>'+esc(s.name)+'</b><br><span class="note">'+(n?n+' Abweichungen vom Live-Stand':'gleich wie live')+'</span></div><button class="btn ghost sm" data-u="'+i+'">Anwenden</button>'+(i?'<button class="btn ghost sm" data-d="'+i+'">Löschen</button>':'')+'</div>'}).join('');
  $('#stS').onclick=function(){var n=$('#stN').value.trim()||('Stil '+S.styles.length);S.styles.push({name:n,v:clone(S.v)});snd('ok');toast('Gesichert: '+n);render()};
  $$('#stL [data-u]').forEach(function(x){x.onclick=function(){var s=S.styles[+x.dataset.u];S.undo.push({snap:clone(S.v),name:'Stil „'+s.name+'“'});S.redo=[];S.v=clone(s.v);apply();upd();toast('Stil angewendet: '+s.name);render()}});
  $$('#stL [data-d]').forEach(function(x){x.onclick=function(){S.styles.splice(+x.dataset.d,1);render()}});
  var c=$('#stC');if(c)c.onclick=function(){var a=S.styles[+$('#stA').value],bb=S.styles[+$('#stB').value];compareVals(clone(a.v),a.name,clone(bb.v),bb.name)}};

/* ---------- Raster, Inspektor, Wünsche, Veröffentlichen ---------- */
VIEW.raster=function(b){b.innerHTML='<h2>Raster</h2><p class="note">Spalten, Abstände und Ränder als Overlay über der echten Seite.</p><div class="row"><button class="btn '+(S.grid?'pri':'')+'" id="gt">'+(S.grid?'Raster ausblenden':'Raster einblenden')+'</button></div>';
  $('#gt').onclick=function(){S.grid=!S.grid;apply();render()};var c=document.createElement('div');b.appendChild(c);ctl(c,'cols','Spalten',4,16,1);ctl(c,'gut','Spaltenabstand',8,48,1,'px');ctl(c,'mar','Rand',16,120,1,'px')};
VIEW.insp=function(b){b.innerHTML='<h2>Inspektor</h2><p class="note">Einschalten, dann auf ein Element der Seite klicken. Du siehst, welche Werte es steuern, und springst direkt dorthin.</p><div class="row"><button class="btn '+(S.insp?'pri':'')+'" id="it">'+(S.insp?'Inspektor aus':'Inspektor an')+'</button></div><div id="iout" style="margin-top:14px"></div>';
  $('#it').onclick=function(){S.insp=!S.insp;apply();render()};if(S.last)showInsp(S.last)};
function inspect(el,ifr){var cs=ifr.contentWindow.getComputedStyle(el),tg=el.tagName.toLowerCase(),ts=/^h[1-3]$/.test(tg)?'head':el.closest&&el.closest('nav,.subnav,.langs')?'menu':el.closest&&el.closest('figcaption')?'cap':'text';
  S.last={tag:tg,ts:ts,txt:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,70),ff:cs.fontFamily.split(',')[0].replace(/"/g,''),fs:cs.fontSize,lh:cs.lineHeight,ls:cs.letterSpacing,c:cs.color};snd('ok');if(S.tab.gestalt!=='insp'){S.tab.gestalt='insp';render()}else showInsp(S.last)}
function showInsp(x){var o=$('#iout');if(!o)return;o.innerHTML='<div class="spec"><div class="mono" style="color:var(--blue)">&lt;'+x.tag+'&gt; · '+TSN[x.ts]+'</div><div style="margin:4px 0 10px">„'+esc(x.txt)+'“</div><div class="mono">Schrift  '+esc(x.ff)+'<br>Größe   '+x.fs+'<br>Zeile   '+x.lh+'<br>Laufw.  '+x.ls+'<br>Farbe   '+x.c+'</div></div><h3>Wird gesteuert von</h3>'+
  '<div class="li"><div style="flex:1"><b>Schrift: '+TSN[x.ts]+'</b> · Größe, Abstände, Achsen, OpenType</div><button class="btn ghost" data-j="schrift">Hinspringen</button></div><div class="li"><div style="flex:1"><b>Bewegung: '+TSN[x.ts]+'</b></div><button class="btn ghost" data-j="bewegung">Hinspringen</button></div><div class="li"><div style="flex:1"><b>Farbe: Schrift</b></div><button class="btn ghost" data-j="farben">Hinspringen</button></div>';
  $$('[data-j]',o).forEach(function(bt){bt.onclick=function(){S.ts=S.bts=x.ts;go(bt.dataset.j)}})}
VIEW.wunsch=function(b){b.innerHTML='<h2>Ich wünsche mir …</h2><p class="note">Neue Features oder Änderungen anfragen. Josef gibt frei, das Modell baut.</p><textarea id="wt" placeholder="z. B. Ich wünsche mir eine Ansicht, in der ich alle Überschriften auf einmal sehe."></textarea><div class="row" style="margin-top:8px"><button class="btn ghost" id="wp">'+(S.pinMode?'Klicke jetzt auf die Seite …':'Stecknadel setzen')+'</button><button class="btn pri" id="ws">Wunsch senden</button></div><h3>Wunschliste</h3><div id="wl"></div>';
  var N={neu:'● neu',gepr:'◐ geprüft',gepl:'◆ geplant',geb:'✓ gebaut'};$('#wl').innerHTML=S.wishes.map(function(w){return '<div class="li"><div style="flex:1">'+esc(w.t)+(w.pin?' <span class="mono" style="color:var(--blue)">📍'+w.pin+'</span>':'')+'<br><span class="note">'+w.by+'</span></div><span class="st '+w.s+'">'+N[w.s]+'</span></div>'}).join('');
  $('#wp').onclick=function(){S.pinMode=true;toast('Klicke auf die Stelle der Seite, um die es geht.');render()};
  $('#ws').onclick=function(){var t=$('#wt').value.trim();if(!t){toast('Schreib kurz, was du dir wünschst.');return}var pin=S.pins.length?S.pins[S.pins.length-1].n:null;S.wishes.unshift({t:t,s:'neu',by:S.role==='alina'?'Alina':'Josef',pin:pin});snd('ok');toast('Danke! Josef sieht den Wunsch in seiner Liste.');render()}};
VIEW.pub=function(b){var ch=changed();var unl=S.fonts.filter(function(f){return !f.lic&&TS.some(function(t){return S.v[t[0]+'.font']===f.name})});
  b.innerHTML='<h2>Veröffentlichen</h2><p class="note">'+(ch.length?'Diese Änderungen gehen live:':'Keine offenen Änderungen.')+'</p>'+(unl.length?'<div class="lint">Lizenz noch nicht bestätigt: '+unl.map(function(f){return esc(f.name)}).join(', ')+' (Reiter „Schrift laden“).</div>':'')+'<div id="pl"></div>'+
  (ch.length?'<div class="row" style="margin-top:12px"><button class="btn ghost" id="cmp">Vorher und nachher vergleichen</button><button class="btn pri" id="go">Veröffentlichen</button></div>':'')+'<h3>Verlauf (Undo)</h3><div id="hist"></div>';
  $('#pl').innerHTML=ch.map(function(k){return '<div class="li"><span class="st neu">● geändert</span><div style="flex:1"><b>'+esc(label(k))+'</b><br><span class="mono">'+esc(fmt(k,DEF[k]))+' → '+esc(fmt(k,S.v[k]))+'</span></div></div>'}).join('');
  $('#hist').innerHTML=S.undo.length?S.undo.map(function(u,i){return '<div class="li"><span class="mono" style="width:22px">'+(i+1)+'</span><div style="flex:1">'+esc(u.snap?u.name:label(u.k))+(u.snap?'':' <span class="mono">'+esc(fmt(u.k,u.o))+' → '+esc(fmt(u.k,u.n))+'</span>')+'</div><button class="btn ghost sm" data-u="'+i+'">Hierher zurück</button></div>'}).reverse().join(''):'<p class="note">Noch keine Schritte.</p>';
  $$('[data-u]').forEach(function(bt){bt.onclick=function(){var i=+bt.dataset.u;while(S.undo.length>i+1)undo();render()}});
  var c=$('#cmp');if(c)c.onclick=function(){compareVals(clone(DEF),'Vorher (live)',S.v,'Nachher (deine Änderungen)')};var g=$('#go');if(g)g.onclick=publish};
VIEW.pub_spiel=function(b){VIEW.pub(b);b.insertAdjacentHTML('afterbegin','<p class="note">Im Spiel-Gesicht prüft vorher der Dialog-Prüfer alle geänderten Texte (warnt, sperrt nicht).</p>')};
function publish(){snd('pub');playFile('g-stempel');var s=$('#stamp');s.classList.remove('go');void s.offsetWidth;s.classList.add('go');S.published++;
  setTimeout(function(){DEF=clone(S.v);S.undo=[];S.redo=[];S.styles[0].v=clone(S.v);upd();render();toast('Live in etwa 1 bis 3 Minuten. (Im Entwurf nur gespielt.)');if(S.published===1){var k=$('#inka');k.style.display='block';setTimeout(function(){k.style.display='none'},4200)}},700)}

/* ---------- Spiel-Gesicht (Josef, im Stil der Seite) ---------- */
var MOM=[['Intro (Modem, Inka stellt sich vor)','Kapitel 0'],['5 Funde: erstes Werkzeug','Mechanik 1'],['8 Funde: Kombinieren','Mechanik 2'],['12 Funde: Wagners Labor verschlossen','Mechanik 5'],['Labor offen: Sigmas Akte','Szene'],['Fahndung Stufe 3, Kontrolle','Welt'],['8 Ruinen: Gojira gräbt die Seite ein','Ende'],['Urkunde (20 von 20)','Ende'],['New Game Plus 1: Kartograph*in','NG+'],['Geheimes Kapitel Urbino','Geheim']];
VIEW.momente=function(b){b.innerHTML='<h2>Momente</h2><p class="note">Springe direkt in eine Situation. Eigene Schnappschüsse kannst du benennen.</p><input type="search" id="ms" placeholder="Suchen: Labor, Gojira, Fahndung …"><div id="ml" style="margin-top:8px"></div><h3>Eigene Schnappschüsse</h3><div class="li"><div style="flex:1">Kurz vor dem Labor mit Bombe und Schere</div><button class="btn">Laden</button></div><div class="row" style="margin-top:8px"><button class="btn" id="snap">Jetzigen Stand speichern</button></div>';
  function f(){var q=$('#ms').value.toLowerCase();$('#ml').innerHTML=MOM.filter(function(m){return !q||m.join(' ').toLowerCase().indexOf(q)>=0}).map(function(m){var i=MOM.indexOf(m);return '<div class="li"><div style="flex:1">'+m[0]+'<br><span class="note">'+m[1]+'</span></div><button class="btn" data-m="'+i+'">Springen</button></div>'}).join('');$$('[data-m]').forEach(function(bt){bt.onclick=function(){snd('ok');toast('Gesprungen: '+MOM[+bt.dataset.m][0]+'. Dev-Spielstand gesetzt.')}})}
  $('#ms').oninput=f;f();$('#snap').onclick=function(){snd('ok');toast('Schnappschuss gespeichert.')}};
var DLG=[{id:'gast-polizei-egoshooter',page:'kunst',lines:[['polizei','Hallo, liebe*r Kund*in! Hier spricht deine Nil-Polizei. Du betrachtest Bilder mit Fadenkreuz.'],['wagner','Das ist eine Zeichnung, Wachtmeister. Tusche auf Papier, 60 mal 50 Zentimeter.'],['inka','Die haben einen Algorithmus für Fadenkreuze. Er schlägt auch bei Kirchenfenstern an.']]},
  {id:'inka-hinweis-labor',page:'index',lines:[['inka','Das Labor ist zu. Wagner hat den Schlüssel nicht verloren, sondern versteckt, und das bis heute.'],['wagner','Hast du schon im Inventar nachgesehen?']]},
  {id:'gojira-15',page:'comic',lines:[['gojira','. . .  . .'],['inka','Gojira sagt, 15 ist eine gute Zahl, und er hat Hunger.']]}];
function COL(w){return S.v['c.spiel.'+w]||{polizei:'#a3a3a3'}[w]||'#4a52a0'}
function lint(who,t){var L=[];t.split('[/]').forEach(function(s){if(s.trim().length>120)L.push(['Fenster zu lang: '+s.trim().length+' Zeichen (höchstens 3 Zeilen à 40).','Mit [/] teilen'])});
  if(/,\s+und\b/.test(t))L.push(['Komma vor „und“.','Komma entfernen',function(x){return x.replace(/,\s+und\b/g,' und')}]);
  if(/nicht\b[^.]*,\s*sondern/i.test(t))L.push(['Muster „nicht X, sondern Y“.','Umformulieren']);
  if(/bis heute/i.test(t))L.push(['„bis heute“ ist nicht erlaubt.','„bis heute“ streichen',function(x){return x.replace(/,?\s*und das bis heute/i,'').replace(/\s*bis heute/i,'')}]);
  if(who==='wagner'&&/\b(du|dich|dir|dein)\b/i.test(t))L.push(['Wagner siezt.','„du“ → „Sie“',function(x){return x.replace(/\bHast du\b/,'Haben Sie').replace(/\bdu\b/g,'Sie')}]);
  if(who==='gojira'&&/[a-zA-Z]/.test(t))L.push(['Gojira spricht nur in Punkten.']);return L}
VIEW.dialoge=function(b){var mode=S.dmode||'liste';b.innerHTML='<h2>Dialoge</h2><div class="row"><span class="seg"><button data-v="liste" class="'+(mode==='liste'?'on':'')+'">Liste</button><button data-v="graph" class="'+(mode==='graph'?'on':'')+'">Graph</button></span></div><div id="dv" style="margin-top:12px"></div>';
  $$('[data-v]',b).forEach(function(x){x.onclick=function(){S.dmode=x.dataset.v;render()}});var v=$('#dv');
  if(mode==='graph'){var pages=['index','kunst','comic'];var svg='<svg viewBox="0 0 400 300" width="100%" style="background:#fff;border:2px solid #000">';pages.forEach(function(p,i){svg+='<rect x="12" y="'+(30+i*90)+'" width="110" height="34" fill="#fff" stroke="#000" stroke-width="1.5"/><text x="22" y="'+(52+i*90)+'" fill="#000" font-size="13" font-family="Duerer Sans" letter-spacing="1">'+p.toUpperCase()+'</text>'});
    DLG.forEach(function(d,i){var pi=pages.indexOf(d.page),y=30+i*90,bad=d.lines.some(function(l){return lint(l[0],l[1]).length});svg+='<path d="M122 '+(47+pi*90)+' C 170 '+(47+pi*90)+', 170 '+(y+17)+', 210 '+(y+17)+'" stroke="#000" fill="none" stroke-width="1.2"/><rect x="210" y="'+y+'" width="178" height="34" fill="#fff" stroke="'+(bad?'#E2231A':'#000')+'" stroke-width="'+(bad?2.5:1.5)+'"/><text x="220" y="'+(y+22)+'" fill="#000" font-size="12" font-family="Relief">'+d.id+'</text>'});
    svg+='<text x="210" y="290" fill="#6b6b6b" font-size="11" font-family="Relief">Roter Rahmen = Prüfer hat etwas gefunden</text></svg>';v.innerHTML=svg+'<p class="note">Im Umbau: alle 623 Dialoge, Zoom, Klick öffnet den Editor, ▶ spielt ab.</p>';return}
  v.innerHTML=DLG.map(function(d,i){var n=d.lines.reduce(function(a,l){return a+lint(l[0],l[1]).length},0);return '<div class="li"><div style="flex:1"><span class="mono">'+d.id+'</span><br><span class="note">Seite '+d.page+' · '+d.lines.length+' Zeilen</span></div>'+(n?'<span class="st gepr">! '+n+'</span>':'<span class="st geb">✓</span>')+'<button class="btn" data-d="'+i+'">Öffnen</button></div>'}).join('')+'<div id="ed"></div>';
  $$('[data-d]').forEach(function(bt){bt.onclick=function(){editDlg(+bt.dataset.d)}});if(S.ed!=null)editDlg(S.ed)};
function editDlg(i){S.ed=i;var d=DLG[i],ed=$('#ed');if(!ed)return;ed.innerHTML='<h3>'+d.id+'</h3>'+d.lines.map(function(l,j){var L=lint(l[0],l[1]);return '<div style="margin-bottom:12px"><div class="row"><span style="font-family:\'Duerer Sans\';letter-spacing:.08em;color:'+COL(l[0])+'">'+l[0].toUpperCase()+'</span><button class="btn sm" data-p="'+j+'">▶</button></div><textarea data-l="'+j+'">'+esc(l[1])+'</textarea>'+L.map(function(x,k){return '<div class="lint">'+x[0]+(x[2]?'<button class="btn sm" data-fx="'+j+'.'+k+'">'+x[1]+'</button>':(x[1]?' <span class="note">('+x[1]+')</span>':''))+'</div>'}).join('')+'</div>'}).join('')+'<h3>Live-Box</h3><div class="mx" id="box" style="background:'+S.v['c.spiel.fenster']+'"><span id="bt"></span><span class="tri">▼</span></div>';
  $$('[data-l]',ed).forEach(function(t){t.oninput=function(){d.lines[+t.dataset.l][1]=t.value};t.onchange=function(){editDlg(i)}});
  $$('[data-p]',ed).forEach(function(bt){bt.onclick=function(){type(d.lines[+bt.dataset.p])}});
  $$('[data-fx]',ed).forEach(function(bt){bt.onclick=function(){var a=bt.dataset.fx.split('.'),l=d.lines[+a[0]],L=lint(l[0],l[1]);l[1]=L[+a[1]][2](l[1]);snd('ok');toast('Vorschlag übernommen.');editDlg(i)}});type(d.lines[0])}
var TY=null;function type(l){var box=$('#box'),t=$('#bt');if(!box)return;box.style.setProperty('--fc',COL(l[0]));clearInterval(TY);var s=l[1].split('[/]')[0].trim(),n=0;t.innerHTML='<b>'+l[0].toUpperCase()+'</b> ';TY=setInterval(function(){n++;t.innerHTML='<b>'+l[0].toUpperCase()+'</b> '+esc(s.slice(0,n));if(n%2&&/\S/.test(s[n-1]||''))blip(l[0]);if(n>=s.length)clearInterval(TY)},85)}
function blip(w){var a=ac();if(!a)return;var o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.value={inka:880,wagner:330,polizei:520,gojira:180}[w]||660;g.gain.setValueAtTime(.025,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.05);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.06)}
VIEW.figuren=function(b){b.innerHTML='<h2>Figuren</h2><p class="note">Karte antippen: Farbe, Stimme, Tempo, Porträts, Stimmungen.</p>';[['inka','Inka Schalter','du · öffnet das Spiel'],['wagner','Wagner Rohrschach','siezt · Labor'],['xae','X Æ A-13','du · schnelles Scrollen'],['sigma','Sigma','du · Rätsel, Akte'],['gojira','Gojira','nur Punkte · gräbt ein']].forEach(function(f){b.insertAdjacentHTML('beforeend','<div class="card"><span class="bar" style="background:'+COL(f[0])+'"></span><img src="../../assets/game/char-'+f[0]+'-neutral.png" alt=""><div><div class="nm">'+f[1]+'</div><div class="note">'+f[2]+'</div></div></div>')});$$('.card',b).forEach(function(c){c.onclick=function(){snd('ok');toast('Im Umbau: Figurenkarte mit allen Einstellungen.')}})};
var SND=['feder','plotter','zirkel','papier','g-fund','g-kraehe','g-stempel','g-inka','g-wagner','g-sigma','g-xae','g-gojira'];
VIEW.klaenge=function(b){b.innerHTML='<h2>Klänge</h2><p class="note">Antippen spielt ab. Roter Rahmen = ausgewählt.</p><div class="tiles">'+SND.map(function(n,i){return '<div class="tile'+(i===4?' on':'')+'" data-s="'+n+'"><canvas width="200" height="46"></canvas><div class="nm">'+n.replace('g-','')+'</div></div>'}).join('')+'</div>';
  $$('.tile',b).forEach(function(t){wave(t.querySelector('canvas'),t.dataset.s);t.onclick=function(){$$('.tile',b).forEach(function(x){x.classList.remove('on')});t.classList.add('on');playFile(t.dataset.s)}})};
function wave(cv,name){var a=ac(),g=cv.getContext('2d');g.fillStyle='#000';fetch('../../assets/snd/'+name+'.mp3').then(function(r){return r.arrayBuffer()}).then(function(buf){return a?a.decodeAudioData(buf):Promise.reject()}).then(function(ab){var d=ab.getChannelData(0),step=Math.floor(d.length/200);g.clearRect(0,0,200,46);g.fillStyle='#000';for(var x=0;x<200;x++){var m=0;for(var j=0;j<step;j+=8)m=Math.max(m,Math.abs(d[x*step+j]||0));var h=Math.max(1,m*44);g.fillRect(x,23-h/2,1,h)}}).catch(function(){for(var x=0;x<200;x+=3){var h=6+Math.abs(Math.sin(x/9+name.length))*30;g.fillRect(x,23-h/2,2,h)}})}
VIEW.bot=function(b){b.innerHTML='<h2>Test-Bot</h2><p class="note">Spielt viele Partien mit verschiedenen Auslosungen und meldet Probleme.</p><div class="row"><button class="btn pri" id="run">100 Partien spielen</button></div><div class="prog" style="margin-top:12px"><i id="pg"></i></div><div id="br" style="margin-top:12px"></div>';
  $('#run').onclick=function(){var p=0,pg=$('#pg');$('#br').innerHTML='';var t=setInterval(function(){p+=4;pg.style.width=p+'%';if(p>=100){clearInterval(t);snd('ok');$('#br').innerHTML='<div class="li"><span class="st gepr">! 2</span><div style="flex:1"><b>Unlösbare Auslosung</b><br><span class="note">Seed 4471: Krokodil liegt unter dem Newsletter-Knopf (Handy).</span></div></div><div class="li"><span class="st gepr">! 7</span><div style="flex:1"><b>Nie gezeigte Dialoge</b><br><span class="note">z. B. gojira-15: Bedingung „15 Funde“ wird übersprungen, wenn zwei Dinge gleichzeitig gefunden werden.</span></div></div><div class="li"><span class="st geb">✓</span><div style="flex:1"><b>Balance</b><br><span class="note">Ø 41 min bis zur Urkunde · Ø 2,3 Hinweise · ungefragte Fenster alle 2:10 min.</span></div></div><p class="note">Beispielergebnis im Entwurf.</p>'}},60)}};
VIEW.baender=function(b){b.innerHTML='<h2>Bänder</h2><p class="note">Aufgenommene Dev-Partien. Ziehen spult vor und zurück.</p><div class="li"><div style="flex:1"><b>Band 3</b> · 19.11. 16:40 · 12 min</div><span class="st neu">● neu</span></div><div class="tl" id="tl"></div><div class="mx" style="min-height:60px"><span id="tlt"></span></div><div class="row" style="margin-top:8px"><button class="btn pri" id="rec">● Aufnahme starten</button></div>';
  var ev=[[.08,COL('inka'),'Inka: Intro'],[.21,'#000','Fund 1: Sonne'],[.34,COL('wagner'),'Wagner: Labor-Hinweis'],[.47,'#000','Fund 5: Werkzeug'],[.6,'#a3a3a3','Polizei: Kontrolle'],[.73,'#000','Fund 8: Kombinieren'],[.9,COL('gojira'),'Gojira gräbt ein']],tl=$('#tl');
  ev.forEach(function(e){tl.insertAdjacentHTML('beforeend','<i style="left:'+(e[0]*100)+'%;background:'+e[1]+'"></i>')});tl.insertAdjacentHTML('beforeend','<span class="ph" id="ph"></span>');
  function at(x){var r=tl.getBoundingClientRect(),p=Math.max(0,Math.min(1,(x-r.left)/r.width));$('#ph').style.left=(p*100)+'%';var last=ev.filter(function(e){return e[0]<=p}).pop();$('#tlt').textContent=(Math.round(p*12))+' min · '+(last?last[2]:'Start')}
  var dn=false;tl.onpointerdown=function(e){dn=true;at(e.clientX)};window.onpointermove=function(e){if(dn)at(e.clientX)};window.onpointerup=function(){dn=false};at(tl.getBoundingClientRect().left+20);
  $('#rec').onclick=function(){snd('ok');toast('● Aufnahme läuft (Dev-Spielstand).')}};
VIEW.heat=function(b){b.innerHTML='<h2>Heatmap</h2><p class="note">Aus der anonymen Telemetrie. Im Entwurf mit Beispieldaten.</p><div class="row"><button class="btn '+(S.heat?'pri':'')+'" id="ht">'+(S.heat?'Heatmap aus':'Heatmap auf der Seite zeigen')+'</button></div><h3>Fundquote je Ding</h3>'+[['Sonne',94],['Burger',88],['Krokodil',41],['Schere',33],['Spiegel',12]].map(function(x){return '<div class="li"><div style="flex:1">'+x[0]+'</div><div style="width:150px" class="prog"><i style="width:'+x[1]+'%"></i></div><span class="mono" style="width:44px;text-align:right">'+x[1]+' %</span></div>'}).join('')+'<h3>Hier hören Leute auf</h3><p class="note">Startseite nach dem ersten Absatz (31 %) · Kunst bei Ego Shooter (18 %).</p>';$('#ht').onclick=function(){S.heat=!S.heat;apply();render()}};

/* ---------- Befehlspalette ---------- */
function CMDS(){var c=[];Object.keys(TABS).forEach(function(f){TABS[f].forEach(function(t){if(S.role==='alina'&&f==='spiel')return;c.push([(f==='spiel'?'Spiel: ':'Gestaltung: ')+t[1],'Bereich',function(){S.face=f;go(t[0])}])})});
  TS.forEach(function(t){c.push(['Schrift: '+t[1],'Feinarbeit',function(){S.face='gestalt';S.ts=t[0];go('schrift')}]);c.push(['Bewegung: '+t[1],'Animation',function(){S.face='gestalt';S.bts=t[0];APOS=0;go('bewegung')}])});
  ['Laufweite','Zeilenabstand','Wortabstand','OpenType','Buchstabenpaare','Achsen'].forEach(function(x){c.push([x,'Schrift',function(){S.face='gestalt';go('schrift')}])});
  Object.keys(CM).forEach(function(m){CM[m].forEach(function(cc){c.push(['Farbe '+cc[1]+' ('+MODEN[m]+')','Farben',function(){S.face='gestalt';S.mode=m;S.okl['c.'+m+'.'+cc[0]]=true;go('farben')}])})});
  AN.forEach(function(a){c.push([a[1]+': '+a[2],'Bewegung',function(){S.face='gestalt';go('bewegung')}])});
  c.push(['Schrift laden …','Datei',function(){$('#fileIn').click()}],['Farben aus Bild …','Datei',function(){$('#fileIn').click()}],['Palette als .ase speichern','Farben',function(){S.face='gestalt';go('farben');setTimeout(function(){$('#aseOut').click()},50)}],['Stil sichern','Stile',function(){S.face='gestalt';go('stile')}],
    ['Raster ein/aus','Gestaltung',function(){S.grid=!S.grid;apply();render()}],['Inspektor ein/aus','Gestaltung',function(){S.insp=!S.insp;S.face='gestalt';go('insp')}],['Rückgängig',MAC?'⌘ Z':'Strg Z',undo],['Wiederholen',MAC?'⌘ ⇧ Z':'Strg ⇧ Z',redo],['Handy und Desktop nebeneinander','Ansicht',function(){setDev('beide')}],['Vorher und nachher vergleichen','Veröffentlichen',function(){compareVals(clone(DEF),'Vorher (live)',S.v,'Nachher')}],['Ich wünsche mir …','Wünsche',function(){S.face='gestalt';go('wunsch')}],['Tour noch einmal zeigen','Hilfe',tour]);
  if(S.role!=='alina')c.push(['Inka rufen','Spiel',function(){toast('Inka kommt.')}],['Zu 12 Funden springen','Moment',function(){S.face='spiel';go('momente')}],['Test-Bot starten','Spiel',function(){S.face='spiel';go('bot')}]);
  ['index','kunst','comic','texte','info'].forEach(function(p){c.push(['Seite öffnen: '+p,'Seite',function(){$('#pageSel').value=p;S.page=p;buildStage()}])});return c}
var PI=0;function pal(open){var P=$('#pal');if(!open){P.style.display='none';return}P.style.display='flex';$('#palIn').value='';PI=0;fill();$('#palIn').focus()}
function fill(){var q=$('#palIn').value.toLowerCase(),L=CMDS().filter(function(c){return !q||c[0].toLowerCase().indexOf(q)>=0||c[1].toLowerCase().indexOf(q)>=0}).slice(0,14);$('#palList').innerHTML=L.map(function(c,i){return '<li class="'+(i===PI?'on':'')+'" data-i="'+i+'"><span>'+esc(c[0])+'</span><small>'+esc(c[1])+'</small></li>'}).join('');$$('#palList li').forEach(function(li){li.onclick=function(){pal(false);L[+li.dataset.i][2]()}});$('#palList').L=L}
$('#palIn').addEventListener('input',function(){PI=0;fill()});
$('#palIn').addEventListener('keydown',function(e){var L=$('#palList').L||[];if(e.key==='ArrowDown'){PI=Math.min(PI+1,L.length-1);fill();e.preventDefault()}else if(e.key==='ArrowUp'){PI=Math.max(PI-1,0);fill();e.preventDefault()}else if(e.key==='Enter'&&L[PI]){pal(false);L[PI][2]()}else if(e.key==='Escape')pal(false)});
$('#pal').addEventListener('click',function(e){if(e.target.id==='pal')pal(false)});
document.addEventListener('keydown',function(e){var m=MAC?e.metaKey:e.ctrlKey,ae=document.activeElement.tagName;if(m&&e.key.toLowerCase()==='k'){e.preventDefault();pal(true)}else if(m&&e.key.toLowerCase()==='z'&&!/INPUT|TEXTAREA/.test(ae)){e.preventDefault();e.shiftKey?redo():undo()}
  else if(e.key==='Escape')showDrop(false)});

/* ---------- Tour ---------- */
var TOUR=[['#dock','Willkommen in der Werkstatt, Alina. Hier ist dein Arbeitsplatz für Schrift, Farben und Bewegung. Die Seite links ist die echte Website.'],['#tabs','Oben die Aufgaben. Alles wirkt sofort auf der Seite, aber nur bei dir, bis du veröffentlichst.'],['#count','Hier siehst du, wie viele Änderungen noch nicht veröffentlicht sind. ↶ und ↷ (oder '+(MAC?'⌘':'Strg')+' Z) nehmen jeden Schritt zurück.'],['#stage','Neue Schriften oder Bilder einfach irgendwo auf das Fenster ziehen.'],['#palBtn','Mit '+(MAC?'⌘':'Strg')+' K findest du jede Funktion. Unter „Wünsche“ kannst du dir neue Features wünschen. Viel Spaß!']];
function tour(){var i=0,T=$('#tour'),R=$('#ring');function show(){if(i>=TOUR.length){T.style.display=R.style.display='none';ls('ws_tour','1');return}var el=$(TOUR[i][0]).getBoundingClientRect();Object.assign(R.style,{display:'block',left:(el.left-4)+'px',top:(el.top-4)+'px',width:(el.width+8)+'px',height:(el.height+8)+'px'});
  T.style.display='block';T.innerHTML='<div class="n">'+(i+1)+' / '+TOUR.length+'</div><div>'+TOUR[i][1]+'</div><div class="row"><button class="sk">Überspringen</button><button class="nx">'+(i===TOUR.length-1?'Los geht’s':'Weiter')+'</button></div>';
  var tx=Math.min(window.innerWidth-340,Math.max(12,el.left-340)),ty=Math.min(window.innerHeight-180,Math.max(70,el.top+(el.height>300?40:el.height+12)));if(el.left<400)tx=Math.min(window.innerWidth-340,el.left+20);Object.assign(T.style,{left:tx+'px',top:ty+'px'});
  $('.nx',T).onclick=function(){i++;show()};$('.sk',T).onclick=function(){i=TOUR.length;show()}}show()}

/* ---------- Kopfleiste ---------- */
function setDev(d){S.dev=d;$$('#devSeg button').forEach(function(b){b.classList.toggle('on',b.dataset.d===d)});buildStage()}
$$('#devSeg button').forEach(function(b){b.onclick=function(){setDev(b.dataset.d)}});
$$('#faceSeg button').forEach(function(b){b.onclick=function(){if(b.disabled)return;S.face=b.dataset.f;snd('move');render();apply()}});
$('#pageSel').onchange=function(){S.page=this.value;S.last=null;buildStage()};
$('#undo').onclick=undo;$('#redo').onclick=redo;$('#palBtn').onclick=function(){pal(true)};$('#count').onclick=function(){go('pub')};
$('#roleBtn').onclick=function(){S.role=S.role==='alina'?'josef':'alina';this.textContent=S.role==='alina'?'Alina · Gestaltung':'Josef · alles';S.face=S.role==='alina'?'gestalt':'spiel';toast(S.role==='alina'?'Ansicht wie für Alina: nur Gestaltung.':'Ansicht wie für Josef: Spiel-Gesicht im Stil der Seite.');render();apply()};
function toast(t){var o=$('#toast');o.textContent=t;o.style.display='block';clearTimeout(o._t);o._t=setTimeout(function(){o.style.display='none'},3000)}
window.WS={S:S,handleFiles:handleFiles};
buildStage();render();upd();if(!ls('ws_tour'))setTimeout(tour,1200);
})();
