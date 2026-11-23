(function(){
  var N=14, board=document.getElementById('board'); if(!board) return;
  var holes=[[6,2],[7,3],[7,10],[7,11],[1,7],[3,7],[3,6],[11,6],[12,6],[7,7]], walls=[[6,6],[6,7],[7,6],[6,1],[6,3],[2,7],[10,6],[10,7],[6,10],[7,12]],
      sand=[[8,8]], portals=[[3,8],[8,3]];
  function has(list,x,y){ return list.some(function(p){return p[0]===x&&p[1]===y;}); }
  function kind(x,y){ return has(holes,x,y)?'h':has(walls,x,y)?'w':has(sand,x,y)?'q':has(portals,x,y)?'p':''; }
  for(var y=N-1;y>=0;y--) for(var x=0;x<N;x++){ var d=document.createElement('div'); d.className='t '+kind(x,y); board.appendChild(d); }
  var start=[{c:'#E53935',x:1,y:5,d:0},{c:'#2E9E4F',x:5,y:12,d:3},{c:'#2E6BFF',x:12,y:8,d:2},{c:'#FF9800',x:8,y:1,d:1}], bots=[];
  var svg=function(c){ return '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="16" height="14" rx="3" fill="'+c+'"/><rect x="2" y="3" width="18" height="4" rx="2" fill="#222"/><rect x="2" y="17" width="18" height="4" rx="2" fill="#222"/><circle cx="11" cy="12" r="4" fill="rgba(255,255,255,.35)"/><rect x="11" y="10.8" width="12" height="2.4" rx="1" fill="'+c+'"/></svg>'; };
  var stuck=0;
  function place(b){ var cell=(board.clientWidth-12-2*(N-1))/N;
    b.el.style.left=(6+b.x*(cell+2))+'px'; b.el.style.top=(6+(N-1-b.y)*(cell+2))+'px';
    b.el.querySelector('svg').style.transform='rotate('+(-90*b.d)+'deg)'; }
  function reset(){ bots.forEach(function(b){b.el.remove();}); bots=start.map(function(s,i){ var el=document.createElement('div'); el.className='tank'+(i===0?' me':''); el.innerHTML=svg(s.c); board.appendChild(el);
      var b={x:s.x,y:s.y,d:s.d,el:el,alive:true}; return b; }); bots.forEach(place); stuck=0; say('start'); }
  var msgs={start:['Choisissez une carte pour déplacer le robot rouge.','Pick a card to move the red robot.'], wall:['Bloqué par un mur !','Blocked by a wall!'],
    edge:['Bord du plateau : impossible d’avancer.','Edge of the board: can’t go further.'], bot:['Un autre robot bloque le passage.','Another robot is in the way.'],
    hole:['Chute dans un trou… Le robot est éliminé.','Fell into a hole… The robot is out.'], sand:['Sable mouvant : bloqué pendant 2 tours.','Quicksand: stuck for 2 turns.'],
    stuckm:['Toujours coincé dans le sable…','Still stuck in the sand…'], portal:['Téléportation par le portail !','Teleported through the portal!'], ok:['Déplacement effectué.','Moved.'], turn:['Le robot pivote.','The robot turns.'], dead:['Le robot rouge est éliminé. Recommencez !','The red robot is out. Restart!']};
  function say(k){ var en=document.documentElement.getAttribute('data-lang')==='en'; document.getElementById('maze-log').textContent=msgs[k][en?1:0]; }
  var D=[[1,0],[0,1],[-1,0],[0,-1]];
  function step(b,dir){ var nx=b.x+D[dir][0], ny=b.y+D[dir][1];
    if(nx<0||ny<0||nx>=N||ny>=N) return 'edge'; var k=kind(nx,ny); if(k==='w') return 'wall';
    if(bots.some(function(o){return o!==b&&o.alive&&o.x===nx&&o.y===ny;})) return 'bot';
    b.x=nx; b.y=ny;
    if(k==='h'){ b.alive=false; return 'hole'; } if(k==='q'){ stuck=2; return 'sand'; }
    if(k==='p'){ var o=portals.find(function(p){return !(p[0]===nx&&p[1]===ny);}); if(!bots.some(function(r){return r.alive&&r.x===o[0]&&r.y===o[1];})){ b.x=o[0]; b.y=o[1]; } return 'portal'; }
    return 'ok'; }
  function play(card){ var b=bots[0]; if(!b.alive) return say('dead');
    if(stuck>0){ stuck--; return say('stuckm'); }
    if(card==='L'){ b.d=(b.d+1)%4; place(b); return say('turn'); } if(card==='R'){ b.d=(b.d+3)%4; place(b); return say('turn'); } if(card==='U'){ b.d=(b.d+2)%4; place(b); return say('turn'); }
    var n=card==='F1'?1:card==='F2'?2:card==='F3'?3:1, dir=card==='B'?(b.d+2)%4:b.d, r='ok';
    for(var i=0;i<n;i++){ r=step(b,dir); if(r!=='ok') break; }
    place(b); if(!b.alive) setTimeout(function(){ b.el.classList.add('dead'); },350); say(r); }
  document.querySelectorAll('[data-card]').forEach(function(btn){ btn.addEventListener('click', function(){ play(btn.dataset.card); }); });
  document.getElementById('maze-reset').addEventListener('click', reset);
  addEventListener('resize', function(){ bots.forEach(place); });
  new MutationObserver(function(){ if(!document.getElementById('view-robotmaze').hidden){ setTimeout(function(){ bots.forEach(place); },30); } })
    .observe(document.getElementById('view-robotmaze'),{attributes:true, attributeFilter:['hidden']});
  reset();
})();
