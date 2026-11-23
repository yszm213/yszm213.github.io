/* Section Projets : carte des bornes (clusters K-Means réels), légende des 5 zones, mini-partie Robot Maze,
   filtres École / Perso, wagons (bin packing), tuiles cliquables. Sans GSAP : tout reste affiché à l'état final. */
(function(){
  var root=document.documentElement, grid=document.querySelector('.b-proj'); if(!grid) return;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap=window.gsap, ST=window.ScrollTrigger;
  var en=function(){ return root.lang==='en'; };
  /* Joue fn une fois quand el arrive à l'écran (ou tout de suite sans GSAP/ScrollTrigger) */
  function onEnter(el, fn){ if(!gsap || !ST || reduce) return; ST.create({trigger:el, start:'top 85%', once:true, onEnter:fn}); }

  /* ----- Tuiles cliquables : un tap/clic n'importe où ouvre la page projet ----- */
  grid.querySelectorAll('[data-case]').forEach(function(t){ t.setAttribute('data-go', t.dataset.case); });

  /* ----- Filtres ----- */
  var fbtn=[].slice.call(grid.querySelectorAll('.filters button'));
  fbtn.forEach(function(b){ b.addEventListener('click', function(){
    grid.dataset.filter=b.dataset.f;
    fbtn.forEach(function(x){ x.setAttribute('aria-pressed', x===b); });
    if(ST) ST.refresh();
  }); });

  /* ----- Carte de France + clusters ----- */
  var COLORS=['#8FA2FF','#5EE6D0','#C08BFF','#FFC873','#FF8FB1'];
  var ZONES=[['Nord & Île-de-France','North & Paris region'],['Sud-Est','South-East'],['Sud-Ouest','South-West'],['Ouest','West'],['Nord-Est','North-East']];
  /* Contour simplifié de la France métropolitaine (lat, lon), tracé à la main : décor, pas une donnée */
  var FR=[[51.05,2.37],[50.8,3.1],[50.3,4.2],[49.95,4.8],[49.55,5.8],[49.45,6.4],[49.15,6.9],[49.05,8.2],[48.6,7.8],[48.0,7.6],[47.6,7.6],[47.45,7.0],[46.95,6.45],[46.45,6.1],[46.2,6.0],[46.4,6.8],[45.9,7.0],[45.2,7.1],[44.9,6.7],[44.4,6.9],[44.1,7.6],[43.8,7.5],[43.7,7.25],[43.4,6.8],[43.1,6.1],[43.2,5.4],[43.35,4.8],[43.5,4.2],[43.3,3.4],[42.9,3.05],[42.45,3.15],[42.4,2.5],[42.55,1.7],[42.7,0.7],[42.8,-0.3],[43.0,-0.9],[43.25,-1.5],[43.37,-1.78],[43.55,-1.5],[44.3,-1.3],[44.65,-1.25],[45.55,-1.1],[46.0,-1.1],[46.15,-1.2],[46.5,-1.8],[46.9,-2.15],[47.2,-2.2],[47.3,-2.5],[47.5,-2.9],[47.7,-3.4],[47.8,-4.2],[48.0,-4.6],[48.35,-4.8],[48.6,-4.6],[48.75,-3.9],[48.8,-3.1],[48.6,-2.6],[48.65,-2.0],[48.65,-1.5],[48.85,-1.6],[49.2,-1.6],[49.65,-1.9],[49.7,-1.3],[49.4,-1.15],[49.35,-0.4],[49.45,0.1],[49.85,0.6],[50.1,1.5],[50.4,1.6],[50.95,1.85]];
  var CORSE=[[43.0,9.4],[42.7,9.45],[42.4,9.55],[41.9,9.4],[41.4,9.2],[41.6,8.8],[42.0,8.6],[42.4,8.6],[42.6,8.75],[42.8,9.3]];
  var K=Math.cos(46.5*Math.PI/180);
  function px(lat,lon){ return [((lon+5.3)*K*10).toFixed(2), ((51.3-lat)*10).toFixed(2)]; }
  function poly(pts){ return 'M'+pts.map(function(p){ return px(p[0],p[1]).join(' '); }).join('L')+'Z'; }
  var D=window.IRVE_CLUSTERS, svg=grid.querySelector('.fr-map'), zones=grid.querySelector('[data-zones]');
  if(D && svg){
    var NS='http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox','0 0 '+((15*K*10)+1).toFixed(0)+' 102');
    var land=document.createElementNS(NS,'path'); land.setAttribute('class','land'); land.setAttribute('d', poly(FR)+poly(CORSE)); svg.appendChild(land);
    var g=document.createElementNS(NS,'g'); g.setAttribute('class','pts'); svg.appendChild(g);
    var pts=D.points.slice().sort(function(a,b){ return b[3]-a[3]; }); /* gros points dessous */
    pts.forEach(function(p){
      var c=document.createElementNS(NS,'circle'), xy=px(p[0],p[1]);
      c.setAttribute('cx',xy[0]); c.setAttribute('cy',xy[1]); c.setAttribute('r',(0.9+Math.sqrt(p[3])*0.05).toFixed(2));
      c.setAttribute('fill',COLORS[p[2]]); c.setAttribute('data-z',p[2]); g.appendChild(c);
    });
    /* Légende des zones (tuile Q) : survol, focus ou tap = met la zone en avant sur la carte */
    if(zones){
      D.clusters.forEach(function(z){
        var li=document.createElement('li'), b=document.createElement('button');
        b.type='button'; b.dataset.z=z.id; b.style.setProperty('--zc', COLORS[z.id]);
        b.innerHTML='<i></i><span data-l="fr">'+ZONES[z.id][0]+'</span><span data-l="en">'+ZONES[z.id][1]+'</span><b data-n="'+z.n+'"></b>';
        li.appendChild(b); zones.appendChild(li);
      });
      var fmtN=function(){ zones.querySelectorAll('b[data-n]').forEach(function(b){ b.textContent=(+b.dataset.n).toLocaleString(en()?'en-US':'fr-FR'); }); };
      fmtN(); document.addEventListener('langchange', fmtN);
      var pinned=null;
      var hl=function(z){ svg.classList.toggle('hl', z!=null); g.querySelectorAll('circle').forEach(function(c){ c.classList.toggle('on', c.dataset.z===z); });
        zones.querySelectorAll('button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.z===z); }); };
      zones.addEventListener('pointerover', function(e){ var b=e.target.closest('button'); if(b && e.pointerType==='mouse') hl(b.dataset.z); });
      zones.addEventListener('pointerleave', function(){ hl(pinned); });
      zones.addEventListener('focusin', function(e){ var b=e.target.closest('button'); if(b) hl(b.dataset.z); });
      zones.addEventListener('focusout', function(){ hl(pinned); });
      zones.addEventListener('click', function(e){ var b=e.target.closest('button'); if(!b) return; pinned = pinned===b.dataset.z ? null : b.dataset.z; hl(pinned); });
    }
    onEnter(svg, function(){
      gsap.from(land, {opacity:0, duration:1});
      gsap.from(g.querySelectorAll('circle'), {scale:0, opacity:0, duration:.6, ease:'back.out(2)', stagger:{each:.012, from:'random'}});
    });
  }

  /* ----- Petites animations des tuiles chiffres ----- */
  var ten=grid.querySelector('.t-o .ten'); if(ten) onEnter(ten, function(){ gsap.from(ten.children, {scale:0, opacity:0, duration:.5, ease:'back.out(2.5)', stagger:.08}); });
  var ring=grid.querySelector('.ring2 .v'); if(ring) onEnter(ring, function(){ gsap.fromTo(ring, {attr:{'stroke-dashoffset':100}}, {attr:{'stroke-dashoffset':12}, duration:1.6, ease:'power3.out'}); });

  /* ----- Mini-partie Robot Maze (lecture automatique, mêmes plateau et règles que la démo) ----- */
  var mb=grid.querySelector('[data-mini-maze]'), M=window.MAZE;
  if(mb && M){
    var has=function(l,x,y){ return l.some(function(p){ return p[0]===x&&p[1]===y; }); };
    for(var y=M.N-1;y>=0;y--) for(var x=0;x<M.N;x++){ var c=document.createElement('i');
      c.className=has(M.holes,x,y)?'h':has(M.walls,x,y)?'w':has(M.sand,x,y)?'q':has(M.portals,x,y)?'p':''; mb.appendChild(c); }
    var tank=function(col){ return '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="16" height="14" rx="3" fill="'+col+'"/><rect x="2" y="3" width="18" height="4" rx="2" fill="#222"/><rect x="2" y="17" width="18" height="4" rx="2" fill="#222"/><rect x="11" y="10.8" width="12" height="2.4" rx="1" fill="'+col+'"/></svg>'; };
    var bots=M.start.map(function(s,i){ var el=document.createElement('div'); el.className='mb'+(i===0?' me':''); el.innerHTML=tank(s.c); mb.appendChild(el); return {el:el, s:s}; });
    var place=function(el,x,y,d){ el.style.left=(x*100/M.N)+'%'; el.style.top=((M.N-1-y)*100/M.N)+'%'; el.firstChild.style.transform='rotate('+(-90*d)+'deg)'; };
    /* Séquence vérifiée à la main sur le plateau d'origine : F1, F2, L, F2, R puis F3 bloqué par le mur en (6,7) */
    var SEQ=[['F1',2,5,0,'ok'],['F2',4,5,0,'ok'],['L',4,5,1,'turn'],['F2',4,7,1,'ok'],['R',4,7,0,'turn'],['F3',5,7,0,'wall']];
    var MSG={ok:['Déplacement effectué.','Moved.'], turn:['Le robot pivote.','The robot turns.'], wall:['Bloqué par un mur !','Blocked by a wall!'], start:['Le robot rouge joue ses cartes…','The red robot plays its cards…']};
    var hand=grid.querySelector('[data-mini-hand]'), log=grid.querySelector('[data-mini-log]');
    hand.innerHTML=SEQ.map(function(s){ return '<img src="img/maze-'+s[0]+'.webp" alt="" loading="lazy">'; }).join('');
    var say=function(k){ log.textContent=MSG[k][en()?1:0]; }, lastMsg='start';
    document.addEventListener('langchange', function(){ say(lastMsg); });
    var reset=function(){ bots.forEach(function(b){ place(b.el,b.s.x,b.s.y,b.s.d); }); bots[0].el.classList.remove('bump'); hand.querySelectorAll('img').forEach(function(i){ i.className=''; }); say(lastMsg='start'); };
    reset();
    if(!reduce){
      var i=-1, timer=null, vis=false;
      var tick=function(){
        i++;
        if(i>=SEQ.length){ i=-1; reset(); timer=setTimeout(tick, 1400); return; }
        var s=SEQ[i], imgs=hand.querySelectorAll('img');
        imgs.forEach(function(im,j){ im.className=j<i?'used':j===i?'now':''; });
        place(bots[0].el, s[1], s[2], s[3]); say(lastMsg=s[4]);
        if(s[4]==='wall'){ bots[0].el.classList.remove('bump'); void bots[0].el.offsetWidth; bots[0].el.classList.add('bump'); }
        timer=setTimeout(tick, s[4]==='wall' ? 2200 : 1100);
      };
      new IntersectionObserver(function(es){ vis=es[0].isIntersecting; clearTimeout(timer); if(vis) timer=setTimeout(tick, 700); }).observe(mb);
    }
  }

  /* ----- Wagons : rangement « first-fit decreasing » de 9 objets dans 3 wagons de capacité 10 ----- */
  var wg=grid.querySelector('[data-wagons]');
  if(wg){
    var W=[].slice.call(wg.children), fill=[0,0,0], COL=['#8FA2FF','#5EE6D0','#C08BFF','#FFC873','#FF8FB1'], blocks=[];
    [6,5,4,4,3,2,2,1,1].forEach(function(sz,k){
      var w=fill.findIndex(function(f){ return f+sz<=10; });
      var b=document.createElement('i'); b.style.left=(fill[w]*10)+'%'; b.style.width='calc('+(sz*10)+'% - 3px)'; b.style.background=COL[k%5];
      b.textContent=sz; W[w].appendChild(b); fill[w]+=sz; blocks.push(b);
    });
    if(gsap && !reduce){
      var tl=gsap.timeline({paused:true, repeat:-1, repeatDelay:1.8});
      tl.from(blocks, {y:-70, opacity:0, duration:.5, ease:'bounce.out', stagger:.35})
        .to(blocks, {opacity:0, duration:.4, delay:1.8});
      new IntersectionObserver(function(es){ if(es[0].isIntersecting) tl.play(); else tl.pause(); }).observe(wg);
    }
  }
})();
