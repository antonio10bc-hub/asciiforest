// === DEBUG PANEL ===
let dbgOpen=false;
document.getElementById('debug-btn').addEventListener('click',()=>{dbgOpen=!dbgOpen;const p=document.getElementById('debug-panel');p.classList.toggle('open',dbgOpen);if(dbgOpen)renderDbg();});
// Settings panel
let stgOpen=false;
document.getElementById('settings-btn').addEventListener('click',()=>{stgOpen=!stgOpen;document.getElementById('settings-panel').classList.toggle('open',stgOpen);if(stgOpen)document.getElementById('settings-badge').classList.remove('show');});
document.getElementById('vol-music').addEventListener('input',(e)=>{volMusic=e.target.value/100;updVol();});
document.getElementById('vol-sfx').addEventListener('input',(e)=>{volSFX=e.target.value/100;});
document.getElementById('pause-btn').addEventListener('click',()=>{initAudio();togglePause();});
document.getElementById('go-restart').addEventListener('click',restartGame);
function renderDbg(){
  const p=document.getElementById('debug-panel');
  const curSpd=gS;
  p.innerHTML=`<div class="dbg-title">┌─ DEBUG CONSOLE ─┐</div>
<div style="margin-bottom:8px;display:flex;gap:4px;">
<button class="dbg-speed-btn ${curSpd===1?'active':''}" data-speed="1">[Q:x1]</button>
<button class="dbg-speed-btn ${curSpd===2?'active':''}" data-speed="2">[W:x2]</button>
<button class="dbg-speed-btn ${curSpd===5?'active':''}" data-speed="5">[E:x5]</button>
<button class="dbg-speed-btn ${curSpd===10?'active':''}" data-speed="10">[R:x10]</button>
</div>
<button class="dbg-btn" data-dbg="seeds">> Plant 3 seeds</button>
<button class="dbg-btn" data-dbg="bushes">> Grow 3 bushes</button>
<button class="dbg-btn" data-dbg="trees">> Grow 6 trees</button>
<button class="dbg-btn" data-dbg="river">> Trigger river</button>
<button class="dbg-btn" data-dbg="reeds">> Spawn reeds</button>
<button class="dbg-btn" data-dbg="frogs">> Spawn frogs</button>
<button class="dbg-btn" data-dbg="flowers">> Spawn flowers</button>
<button class="dbg-btn" data-dbg="bees">> Spawn bees</button>
<button class="dbg-btn" data-dbg="birds">> Spawn all birds</button>
<button class="dbg-btn" data-dbg="beavers">> Spawn beavers</button>
<button class="dbg-btn" data-dbg="deers">> Spawn deer herd</button>
<button class="dbg-btn" data-dbg="fire">> Start fire</button>
<button class="dbg-btn" data-dbg="all">>> UNLOCK ALL <<<</button>
<button class="dbg-btn" data-dbg="lose">>> LOSE GAME <<<</button>`;
  p.querySelectorAll('.dbg-btn').forEach(b=>b.addEventListener('click',()=>runDbg(b.dataset.dbg)));
  p.querySelectorAll('.dbg-speed-btn').forEach(b=>b.addEventListener('click',()=>{gS=parseInt(b.dataset.speed);prevSpeed=gS;p.querySelectorAll('.dbg-speed-btn').forEach(x=>x.classList.toggle('active',parseInt(x.dataset.speed)===gS));document.querySelectorAll('#speed-control .speed-btn').forEach(x=>x.classList.toggle('active',parseInt(x.dataset.speed)===gS));}));
}
function dbgSpot(){for(let i=0;i<200;i++){const a=Math.random()*Math.PI*2,d=AR+3+Math.random()*20;const gx=Math.floor(CX+Math.cos(a)*d),gy=Math.floor(CY+Math.sin(a)*d);if(gx>=1&&gx<GW-1&&gy>=1&&gy<GH-1&&!isOccNR(gx,gy)&&!nearA(gx,gy,AR))return{x:gx,y:gy};}return null;}
function runDbg(cmd){
  if(cmd==='seeds'||cmd==='all'){
    for(let i=0;i<3;i++){const s=dbgSpot();if(s){grid[s.y][s.x]='seed';seeds.push({gx:s.x,gy:s.y});totalSP++;}}
    disc_('seed','[DBG] Seeds');
  }
  if(cmd==='bushes'||cmd==='all'){
    for(let i=0;i<4;i++){const s=dbgSpot();if(s){grid[s.y][s.x]='bush';bushes.push({gx:s.x,gy:s.y,st:'bush',timer:0});}}
    disc_('bush','[DBG] Bushes');disc_('bushSprout','[DBG]');
  }
  if(cmd==='trees'||cmd==='all'){
    for(let i=0;i<8;i++){const s=dbgSpot();if(s){grid[s.y][s.x]='tree';trees.push({gx:s.x,gy:s.y,st:'tree',timer:0,seedT:15+Math.random()*20,hasSeed:false});}}
    disc_('tree','[DBG] Trees');disc_('treeSprout','[DBG]');disc_('treeSeed','[DBG]');
  }
  if(cmd==='river'||cmd==='all'){
    if(!disc['river']){const t=trees.length>0?trees[0]:null;const sx=t?t.gx:CX+8,sy=t?t.gy:CY+8;disc_('river','[DBG] River');genRiver(sx,sy);riverDone=true;riverDoneT=0;reedSD=true;reedST=1;}
  }
  if(cmd==='reeds'||cmd==='all'){
    if(river.size>0){spawnReedB();spawnReedB();spawnReedB();for(const r of reeds)r.st='adult';disc_('reed','[DBG] Reeds');disc['reedCleared']=true;}
  }
  if(cmd==='frogs'||cmd==='all'){
    const rArr=Array.from(river);while(frogs.length<MAX_FROGS){const k=rArr.length>0?rArr[Math.floor(Math.random()*rArr.length)]:`${CX+5},${CY+5}`;const[fx,fy]=k.split(',').map(Number);frogs.push(mkA('frog',fx,fy));}
    disc_('frog','[DBG] Frogs');
  }
  if(cmd==='flowers'||cmd==='all'){
    for(let i=0;i<8;i++){const s=dbgSpot();if(s){grid[s.y][s.x]='flower';flowers.push({gx:s.x,gy:s.y,col:FC[Math.floor(Math.random()*FC.length)]});}}
    disc_('flower','[DBG] Flowers');
  }
  if(cmd==='bees'||cmd==='all'){
    while(bees.length<MAX_BEES){const s=dbgSpot();if(s){const bee=mkA('bee',s.x,s.y);bees.push(bee);}else break;}
    disc_('bee','[DBG] Bees');
  }
  if(cmd==='birds'||cmd==='all'){
    while(rB.length<MRB){const a=Math.random()*Math.PI*2,d=15+Math.random()*10;rB.push(mkA('redBird',CX+Math.cos(a)*d,CY+Math.sin(a)*d));}
    disc_('redBird','[DBG] Red bird');
    while(bB.length<MBB){const a=Math.random()*Math.PI*2,d=15+Math.random()*10;const b=mkA('blueBird',CX+Math.cos(a)*d,CY+Math.sin(a)*d);if(bB.length===0){b.isFirst=true;b.hPF=true;}bB.push(b);}
    disc_('blueBird','[DBG] Blue bird');
  }
  if(cmd==='beavers'||cmd==='all'){
    while(beavers.length<MAX_BV){const a=Math.random()*Math.PI*2,d=10+Math.random()*8;beavers.push(mkA('beaver',CX+Math.cos(a)*d,CY+Math.sin(a)*d));}
    disc_('beaver','[DBG] Beavers');
  }
  if(cmd==='deers'||cmd==='all'){
    if(deerPhase==='waiting'){deerPhase='initial';spawnInitialDeer();}
    // Join all existing
    for(const d of deers)d.joined=true;
    deerPhase='herd';
    // Fill to MAX_DEER
    while(deers.length<MAX_DEER){spawnNewDeer();deers[deers.length-1].joined=true;}
    disc_('deer','[DBG] Full herd');
  }
  if(cmd==='fire'){
    if(firePhase!=='active'){startFire();}
  }
  if(cmd==='all'){
    // Force-complete all tasks
    firePhase='extinguished';
    for(const t of TASKS)tasksDone.add(t.id);
    // Ensure all discoveries
    ['seed','bushSprout','bush','treeSeed','treeSprout','tree','river','reed','flower','redBird','blueBird','beaver','frog','bee','deer','reedCleared','fire','fireOut'].forEach(k=>disc[k]=true);
  }
  if(cmd==='lose'){triggerGameOver();return;}
  updTasks();
}

