/* Effets : scroll fluide (Lenis), entrées en cascade et parallax (GSAP + ScrollTrigger),
   tilt 3D + spotlight + boutons magnétiques (souris seulement), nom lettre par lettre, onglets « En 30 secondes ».
   Sans GSAP/Lenis (CDN bloqué) ou avec prefers-reduced-motion, le contenu reste affiché tel quel. */
(function(){
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var gsap=window.gsap, ST=window.ScrollTrigger;

  /* ----- « En 30 secondes » : onglets, avance auto calée sur l'animation CSS de la barre ----- */
  document.querySelectorAll('[data-tldr]').forEach(function(box){
    var tabs=[].slice.call(box.querySelectorAll('[role=tab]'));
    function select(i, focus){
      tabs.forEach(function(t,j){ var on=j===i; t.setAttribute('aria-selected', on); t.tabIndex=on?0:-1;
        document.getElementById(t.getAttribute('aria-controls')).classList.toggle('on', on); });
      if(focus) tabs[i].focus();
    }
    tabs.forEach(function(t,i){
      t.addEventListener('click', function(){ select(i); });
      t.addEventListener('keydown', function(e){ var d=e.key==='ArrowDown'||e.key==='ArrowRight'?1:e.key==='ArrowUp'||e.key==='ArrowLeft'?-1:0;
        if(d){ e.preventDefault(); select((i+d+tabs.length)%tabs.length, true); } });
      t.querySelector('.prog').addEventListener('animationend', function(){ select((i+1)%tabs.length); });
    });
    if(reduce) return;
    box.classList.add('auto');
    var hold=function(on){ box.classList.toggle('paused', on); };
    box.addEventListener('pointerenter', function(){ hold(true); });
    box.addEventListener('pointerleave', function(){ hold(false); });
    box.addEventListener('focusin', function(){ hold(true); });
    box.addEventListener('focusout', function(){ hold(false); });
    new IntersectionObserver(function(es){ hold(!es[0].isIntersecting); }).observe(box);
  });

  if(reduce){ document.querySelectorAll('svg.route').forEach(function(s){ s.pauseAnimations && s.pauseAnimations(); }); return; }

  /* ----- Nom découpé en lettres (le h1 garde son aria-label) ----- */
  document.querySelectorAll('h1.split').forEach(function(h){
    h.querySelectorAll('.w').forEach(function(w){
      w.setAttribute('aria-hidden','true'); w.dataset.txt=w.textContent;
      w.innerHTML=w.textContent.split('').map(function(c){ return '<span class="ch">'+c+'</span>'; }).join('');
    });
    h.classList.add('is-split');
  });

  /* ----- Scroll fluide ----- */
  var lenis=null;
  if(window.Lenis){
    lenis=new window.Lenis({lerp:0.1, wheelMultiplier:1});
    window.__lenis=lenis;
    if(gsap){ if(ST) lenis.on('scroll', ST.update); gsap.ticker.add(function(t){ lenis.raf(t*1000); }); gsap.ticker.lagSmoothing(0); }
    else { (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(0); }
  }

  if(!gsap) return;
  if(ST) gsap.registerPlugin(ST);

  /* ----- Intro du hero ----- */
  var hero=document.querySelector('.b-hero');
  if(hero){
    var tiles=hero.querySelectorAll('[data-tile]');
    var tl=gsap.timeline({defaults:{ease:'power3.out'}});
    tl.from(tiles, {opacity:0, y:46, scale:.94, filter:'blur(14px)', duration:1, stagger:{each:.07, from:'start'}, clearProps:'filter'})
      /* Apparition sans masque ni 3D (opacity + translateY + flou) ; à la fin, les lettres redeviennent des mots simples :
         plus aucune transformation sur le nom à l'état final */
      .from(hero.querySelectorAll('h1 .ch'), {opacity:0, y:36, filter:'blur(10px)', duration:.8, stagger:.05, clearProps:'all',
        onComplete:function(){ hero.querySelectorAll('h1 .w').forEach(function(w){ w.textContent=w.dataset.txt; }); hero.querySelector('h1').classList.remove('is-split'); }}, .25)
      .from(hero.querySelectorAll('.t-id .eyebrow, .t-id .lede, .t-id-cta .btn'), {opacity:0, y:18, duration:.7, stagger:.08}, .7)
      .from(hero.querySelectorAll('.months i, .alt-bar i, .gauge i'), {scaleX:0, duration:.6, stagger:.06, ease:'power2.out'}, .8)
      .from(hero.querySelector('.id-top .avatar'), {scale:0, rotation:-40, opacity:0, duration:.9, ease:'back.out(1.8)', clearProps:'transform'}, .55);
  }

  /* ----- Tuiles des autres écrans : cascade au scroll (fade, scale, flou → net) ----- */
  if(ST){
    var rest=[].slice.call(document.querySelectorAll('[data-tile]')).filter(function(t){ return !t.closest('.b-hero'); });
    if(rest.length){
      gsap.set(rest, {opacity:0, y:50, scale:.95, filter:'blur(12px)'});
      ST.batch(rest, {start:'top 88%', once:true, onEnter:function(b){
        gsap.to(b, {opacity:1, y:0, scale:1, filter:'blur(0px)', duration:.9, ease:'power3.out', stagger:.08, clearProps:'filter'}); }});
    }
  }

  if(!fine) return; /* tactile : pas de parallax, de tilt ni de spotlight */

  /* ----- Parallax léger du hero ----- */
  if(ST && hero){
    var sc={trigger:hero.querySelector('.t-id'), start:'top top', end:'bottom top', scrub:true}; /* .b-hero n'a pas de boîte (display:contents) */
    gsap.to(hero.querySelector('[data-parallax]'), {y:-70, ease:'none', scrollTrigger:sc});
    gsap.to(hero.querySelector('.mesh'), {y:120, ease:'none', scrollTrigger:sc});
  }

  /* ----- Tilt 3D + spotlight ----- */
  document.querySelectorAll('[data-tile]').forEach(function(t){
    if(t.classList.contains('t-marquee')) return;
    gsap.set(t, {transformPerspective:1000});
    var rx=gsap.quickTo(t, 'rotationX', {duration:.5, ease:'power3.out'}), ry=gsap.quickTo(t, 'rotationY', {duration:.5, ease:'power3.out'});
    t.addEventListener('pointermove', function(e){
      var r=t.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
      var amp=Math.min(7, 2200/Math.max(r.width, r.height)); /* grandes tuiles : inclinaison plus discrète */
      t.style.setProperty('--mx', (x*100)+'%'); t.style.setProperty('--my', (y*100)+'%');
      rx((.5-y)*amp); ry((x-.5)*amp);
    });
    t.addEventListener('pointerleave', function(){ rx(0); ry(0); });
  });

  /* ----- Boutons magnétiques ----- */
  document.querySelectorAll('[data-magnetic]').forEach(function(b){
    var mx=gsap.quickTo(b, 'x', {duration:.4, ease:'power3.out'}), my=gsap.quickTo(b, 'y', {duration:.4, ease:'power3.out'});
    b.addEventListener('pointermove', function(e){ var r=b.getBoundingClientRect(); mx((e.clientX-r.left-r.width/2)*.35); my((e.clientY-r.top-r.height/2)*.45); });
    b.addEventListener('pointerleave', function(){ gsap.to(b, {x:0, y:0, duration:.8, ease:'elastic.out(1,.4)'}); });
  });
})();
