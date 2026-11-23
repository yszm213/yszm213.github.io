/* Langue, routage par ancres, navigation active, teinte du fond, apparition, compteurs, carte Automo. */
(function(){
  var root=document.documentElement;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----- Langue (mémorisée) ----- */
  function setLang(l){
    root.setAttribute('data-lang', l); root.lang=l;
    document.querySelectorAll('.langs button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.lang===l); });
    try{ localStorage.setItem('lang', l); }catch(e){}
    document.dispatchEvent(new CustomEvent('langchange', {detail:l}));
  }
  var saved=null; try{ saved=localStorage.getItem('lang'); }catch(e){}
  setLang(saved==='en'||saved==='fr' ? saved : 'fr');
  document.querySelectorAll('.langs button').forEach(function(b){ b.addEventListener('click', function(){ setLang(b.dataset.lang); }); });

  /* ----- Vues et rubriques ----- */
  var CASES=['mastation','automo','robotmaze','drzm','regtemp'];
  var views={home:document.getElementById('view-home')};
  CASES.forEach(function(k){ views[k]=document.getElementById('view-'+k); });
  /* Chaque rubrique appartient à un onglet de la nav (4 onglets) */
  var GROUP={top:'', apropos:'apropos', maintenant:'apropos', ecole:'ecole', perso:'ecole', experiences:'experiences', competences:'experiences', contact:'contact'};
  var links=[].slice.call(document.querySelectorAll('.nav-links a, .tabbar a'));
  var secs=[].slice.call(views.home.querySelectorAll('[data-sec]'));

  function setActive(g){ links.forEach(function(a){ var on=a.dataset.go===g; a.classList.toggle('on', on); if(on) a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current'); }); }
  function show(name){ Object.keys(views).forEach(function(k){ views[k].hidden=(k!==name); }); }
  /* Défilement : Lenis (js/fx.js) s'il tourne, sinon natif. Lenis ignore scroll-padding, on passe le décalage de la nav. */
  function scrollToEl(el, smooth){
    var L=window.__lenis;
    if(L){ if(el) L.scrollTo(el, {offset:-parseFloat(getComputedStyle(root).scrollPaddingTop)||0, immediate:!smooth}); else L.scrollTo(0, {immediate:!smooth}); return; }
    if(el) el.scrollIntoView(); else window.scrollTo(0,0);
  }
  function route(target){
    var h=target || location.hash.slice(1), wasHome=!views.home.hidden;
    if(CASES.indexOf(h)>=0){ show(h); scrollToEl(null, false); setActive('ecole'); paint(h); return; }
    show('home'); paint('top');
    var el=h && h!=='top' ? views.home.querySelector('[data-sec="'+h+'"]') : null;
    scrollToEl(el, !!target && wasHome); /* clic sur l'accueil : glisse ; arrivée d'ailleurs : saut direct */
    onScroll();
  }
  document.addEventListener('click', function(e){
    var a=e.target.closest('[data-go]'); if(!a) return;
    var t=a.getAttribute('data-go'); e.preventDefault();
    if(location.hash.slice(1)!==t){ try{ history.pushState(null,'','#'+t); }catch(err){ location.hash=t; return; } }
    route(t);
  });
  window.addEventListener('popstate', function(){ route(); });
  window.addEventListener('hashchange', function(){ route(); });

  function onScroll(){
    if(views.home.hidden) return;
    /* Position à l'écran, pas ordre du DOM : la grille bento remonte certaines tuiles */
    var probe=innerHeight*0.35, cur='top', best=-Infinity;
    secs.forEach(function(s){ var r=s.getBoundingClientRect(); if(r.top<=probe && r.bottom>probe && r.top>best){ best=r.top; cur=s.dataset.sec; } });
    if(best===-Infinity) return; /* entre deux tuiles : on garde l'onglet courant */
    setActive(GROUP[cur]||'');
  }
  window.addEventListener('scroll', onScroll, {passive:true});

  /* ----- Teinte du fond selon la rubrique ----- */
  var HUES={top:['#3B4BFF','#12B5A0','#A23BFF'], apropos:['#4B5BFF','#7A3BFF','#1E8FB5'], maintenant:['#C98A1E','#3B4BFF','#B53B6E'],
    experiences:['#12B5A0','#2B6BFF','#2BB55E'], ecole:['#2B47FF','#12A6B5','#6E3BFF'], perso:['#B53BFF','#FF5E8F','#3B4BFF'],
    competences:['#12B5A0','#5E7BFF','#12D0E6'], contact:['#7A3BFF','#3B4BFF','#12B5A0'], mastation:['#12B5A0','#2B47FF','#5EE6D0'],
    automo:['#FF5E5E','#B53BFF','#FFB45E'], robotmaze:['#393D7E','#2E6BFF','#FFBF00'], drzm:['#D62E3C','#1E3A8A','#3B82F6'], regtemp:['#FF6B3B','#2B47FF','#C98A1E']};
  function paint(k){ var c=HUES[k]; if(!c) return; root.style.setProperty('--c1',c[0]); root.style.setProperty('--c2',c[1]); root.style.setProperty('--c3',c[2]); }

  /* ----- Apparition + compteurs (valeur finale visible sans JS) ----- */
  document.querySelectorAll('[data-dots]').forEach(function(d){
    var n=+d.dataset.dots, h=''; for(var i=0;i<n;i++){ h+='<i style="animation-delay:'+(i*6)+'ms"></i>'; } d.innerHTML=h; });
  /* Temps mesuré à l'horloge (pas au rythme des images) + minuteur de secours : si rAF est gelé ou ralenti
     (onglet en arrière-plan), le chiffre final s'affiche quand même. */
  function countUp(el){ if(reduce || el.dataset.done) return; el.dataset.done=1; var to=+el.dataset.to, t0=performance.now(), end=false;
    var fmt=function(v){ return Math.round(v).toLocaleString(root.lang==='en'?'en-US':'fr-FR'); };
    function finish(){ end=true; el.textContent=fmt(to); }
    function step(){ if(end) return; var p=Math.min(1,(performance.now()-t0)/1400); el.textContent=fmt(to*(1-Math.pow(1-p,3))); if(p<1) requestAnimationFrame(step); else finish(); }
    requestAnimationFrame(step); setTimeout(finish, 1600); }
  var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(!e.isIntersecting) return;
      e.target.classList.add('inview');
      var k=e.target.getAttribute('data-sec'); if(k && !views.home.hidden) paint(k);
      e.target.querySelectorAll('.count').forEach(countUp); }); }, {rootMargin:'-40% 0px -45% 0px'});
  document.querySelectorAll('[data-sec], .case section').forEach(function(el){ io.observe(el); });

  /* ----- Barre de progression ----- */
  var bar=document.querySelector('.progress');
  function prog(){ var h=root.scrollHeight-innerHeight; bar.style.transform='scaleX('+(h>0?scrollY/h:0)+')'; }
  addEventListener('scroll', prog, {passive:true});

  /* ----- Carte Automo : tap ou clic pour retourner ----- */
  document.querySelectorAll('.flip').forEach(function(f){ f.addEventListener('click', function(){ f.classList.toggle('flipped'); }); });

  route(); prog();
})();
