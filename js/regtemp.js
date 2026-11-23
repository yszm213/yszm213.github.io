(function(){
  /* Reg Temp : simulateur thermique + régulations, mêmes constantes que le code C */
  var CTH=73746.9, RGF=0.00686, PMAX=3200, DT=10, KR=CTH*RGF/DT, KP=1.1, KI=0.2, KD=0.15;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fr(){ return document.documentElement.getAttribute('data-lang')!=='en'; }
  function fmt(v,d){ var s=v.toFixed(d===undefined?1:d); return fr()? s.replace('.',',') : s; }
  function simStep(ti, te, p){ return (te + RGF*PMAX*(p/100) + ti*KR)/(KR+1); }
  function Thermo(box, opts){
    var cv=box.querySelector('canvas'), ctx=cv.getContext('2d'), N=opts.big?420:300, st, W=0, H=0, running=false, visible=false, acc=0, last=0;
    var c=19, te=10;
    function reset(){ st={tp:15, tt:15, ep:0, I:0, first:true, k:0, hist:[]}; }
    function step(){
      var pt = st.tt < c ? 50 : 0;
      var e=c-st.tp, Ii, D;
      if(st.first){ Ii=0; D=0; } else { Ii=st.I+((e+st.ep)/2)*DT; D=(e-st.ep)/DT; }
      var pp=KP*e+KI*Ii+KD*D; pp=Math.max(0,Math.min(100,pp)); st.ep=e; st.I=Ii; st.first=false;
      st.tp=simStep(st.tp, te, pp); st.tt=simStep(st.tt, te, pt); st.k++;
      st.hist.push({tp:st.tp, tt:st.tt, pp:pp, pt:pt, c:c, te:te}); if(st.hist.length>N) st.hist.shift();
      if(opts.mini && st.k>N) reset();
    }
    function size(){ var r=cv.getBoundingClientRect(), dpr=Math.min(2,devicePixelRatio||1); W=r.width; H=r.height; cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
    function draw(){
      if(!W) size(); ctx.clearRect(0,0,W,H);
      var hs=st.hist, lo=Infinity, hi=-Infinity;
      hs.forEach(function(h){ lo=Math.min(lo,h.tp,h.tt,h.c,h.te); hi=Math.max(hi,h.tp,h.tt,h.c,h.te); });
      if(!hs.length){ lo=Math.min(te,15,c); hi=Math.max(c,15,te); }
      lo=Math.floor(lo-1); hi=Math.ceil(hi+1);
      var padL=34, padB=opts.big?30:8, ph=opts.big?44:22, gh=H-padB-ph-8;
      function X(i){ return padL+(W-padL-6)*i/(N-1); } function Y(v){ return 6+gh*(1-(v-lo)/(hi-lo)); }
      ctx.font='10px "JetBrains Mono", monospace'; ctx.fillStyle='rgba(196,201,218,.75)'; ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1;
      var stepv=(hi-lo)>12?4:2; for(var v=Math.ceil(lo/stepv)*stepv; v<=hi; v+=stepv){ var y=Y(v); ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-6,y); ctx.stroke(); ctx.fillText(v+'°',2,y+3); }
      if(opts.big){ ctx.fillText(fr()?'puissance':'power',2,H-padB-ph/2+3); for(var m=0;m<=N*DT/60;m+=(W<640?20:10)){ var x=X(m*60/DT); ctx.fillText(m+' min', Math.min(x-12, W-40), H-10); } }
      var base=H-padB; ctx.fillStyle='rgba(94,230,208,.28)';
      hs.forEach(function(h,i){ var bh=ph*h.pp/100; ctx.fillRect(X(i), base-bh, Math.max(1,(W-padL)/N), bh); });
      function line(key,col,w,dash){ ctx.beginPath(); ctx.setLineDash(dash||[]); ctx.strokeStyle=col; ctx.lineWidth=w; hs.forEach(function(h,i){ var y=Y(h[key]); if(i) ctx.lineTo(X(i),y); else ctx.moveTo(X(i),y); }); ctx.stroke(); ctx.setLineDash([]); }
      line('te','rgba(143,162,255,.8)',1.5); line('c','rgba(255,255,255,.85)',1.5,[5,4]); line('tt','#FFB45E',2.2); line('tp','#5EE6D0',2.6);
      if(hs.length){ var h=hs[hs.length-1], i=hs.length-1; [['tp','#5EE6D0'],['tt','#FFB45E']].forEach(function(a){ ctx.fillStyle=a[1]; ctx.beginPath(); ctx.arc(X(i),Y(h[a[0]]),4,0,6.3); ctx.fill(); }); }
      if(opts.onDraw) opts.onDraw(st);
    }
    function loop(t){ if(!running) return; if(!last) last=t; acc+=Math.min(100,t-last)*(opts.big?0.06:0.05); last=t;
      while(acc>=1){ step(); acc-=1; } draw(); requestAnimationFrame(loop); }
    function play(){ if(running||!visible) return; running=true; last=0; requestAnimationFrame(loop); }
    function stop(){ running=false; }
    reset();
    if(reduce){ for(var i=0;i<N;i++) step(); }
    new IntersectionObserver(function(es){ es.forEach(function(e){ visible=e.isIntersecting; if(visible){ size(); if(reduce) draw(); else play(); } else stop(); }); }).observe(box);
    addEventListener('resize', function(){ size(); draw(); });
    return { set:function(k,v){ if(k==='c') c=v; else te=v; if(reduce){ for(var i=0;i<N;i++) step(); draw(); } },
             reset:function(){ reset(); if(reduce){ for(var i=0;i<N;i++) step(); } draw(); } };
  }
  var mini=document.querySelector('[data-thermo="mini"]'); if(mini) Thermo(mini,{mini:true});
  var big=document.querySelector('[data-thermo="big"]');
  if(big){
    var sec=big.closest('section'), q=function(s){ return sec.querySelector(s); };
    var T=Thermo(big,{big:true, onDraw:function(st){ var h=st.hist[st.hist.length-1]||{pp:0,pt:0};
      q('[data-out="tp"]').textContent=fmt(st.tp)+' °C'; q('[data-out="tt"]').textContent=fmt(st.tt)+' °C';
      q('[data-out="pp"]').textContent=(fr()?'chauffage ':'heating ')+Math.round(h.pp)+' %'; q('[data-out="pt"]').textContent=(fr()?'chauffage ':'heating ')+Math.round(h.pt)+' %';
      q('[data-out="time"]').textContent=Math.round(st.k*DT/60)+' min'; }});
    sec.querySelectorAll('[data-in]').forEach(function(inp){ inp.addEventListener('input', function(){ var v=+inp.value; T.set(inp.dataset.in, v); q('[data-out="'+inp.dataset.in+'"]').textContent=fmt(v)+' °C'; }); });
    q('[data-act="reset"]').addEventListener('click', function(){ T.reset(); });
  }
  /* Trame USB */
  var fb=document.querySelector('[data-frame]');
  if(fb){
    var fsec=fb.closest('section'), fq=function(s){ return fsec.querySelector(s); };
    var labels=[['0x0','ext','11–8'],['0x1','ext','7–4'],['0x2','ext','3–0'],['0x8','int','11–8'],['0x9','int','7–4'],['0xA','int','3–0']];
    function sot(t){ return Math.max(0,Math.min(4095,Math.round((t+39.64)/0.04))); }
    function hex(n,w){ return n.toString(16).toUpperCase().padStart(w,'0'); }
    function bin(n){ return n.toString(2).padStart(4,'0'); }
    function render(){
      var te=+fq('[data-fin="ext"]').value, ti=+fq('[data-fin="int"]').value, pw=+fq('[data-fin="pow"]').value;
      var se=sot(te), si=sot(ti), nib=function(s,k){ return (s>>(8-4*k))&15; };
      var bytes=[0,1,2].map(function(k){ return (k<<4)|nib(se,k); }).concat([0,1,2].map(function(k){ return ((8+k)<<4)|nib(si,k); }));
      fb.innerHTML=bytes.map(function(b,i){ var l=labels[i];
        return '<div class="f-byte" data-i="'+i+'"><div class="hx">0x'+hex(b,2)+'</div><div class="nb"><i>'+bin(b>>4)+'</i><i>'+bin(b&15)+'</i></div><small>'+(l[1]==='ext'?(fr()?'ext.':'out'):(fr()?'int.':'in'))+' · bits '+l[2]+'</small></div>'; }).join('');
      ['ext','int'].forEach(function(s){ var v=s==='ext'?se:si; fq('[data-bits="'+s+'"]').innerHTML=[0,1,2].map(function(k){ return '<i data-k="'+k+'">'+bin(nib(v,k))+'</i>'; }).join(''); });
      fq('[data-out="fe"]').textContent='0x'+hex(se,3)+' = '+se+' → '+fmt(-39.64+0.04*se,2)+' °C';
      fq('[data-out="fi"]').textContent='0x'+hex(si,3)+' = '+si+' → '+fmt(-39.64+0.04*si,2)+' °C';
      var cb=Math.floor(pw*127/100); fq('[data-out="fc"]').textContent='0x'+hex(cb,2)+'  ('+cb+')';
      fq('[data-out="fes"]').textContent=fmt(te)+' °C'; fq('[data-out="fis"]').textContent=fmt(ti)+' °C'; fq('[data-out="fps"]').textContent=pw+' %';
    }
    function hl(i){ fsec.querySelectorAll('.f-bits i').forEach(function(x){ x.classList.remove('on'); }); fb.querySelectorAll('.f-byte').forEach(function(x){ x.classList.toggle('on', +x.dataset.i===i); });
      if(i<0) return; var s=i<3?'ext':'int', k=i%3; fq('[data-bits="'+s+'"] [data-k="'+k+'"]').classList.add('on'); }
    fb.addEventListener('pointerover', function(e){ var b=e.target.closest('.f-byte'); if(b) hl(+b.dataset.i); });
    fb.addEventListener('pointerleave', function(){ hl(-1); });
    fb.addEventListener('click', function(e){ var b=e.target.closest('.f-byte'); if(b) hl(+b.dataset.i); });
    fsec.querySelectorAll('[data-fin]').forEach(function(i){ i.addEventListener('input', render); });
    document.querySelectorAll('.langs button').forEach(function(b){ b.addEventListener('click', function(){ setTimeout(render,0); }); });
    render();
  }
})();
