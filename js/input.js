// === INPUT ===
function s2w(sx,sy){return{x:sx/cam.z+cam.x,y:sy/cam.z+cam.y};}
function playerAction(){lastPA=0;idleSince=0;ctaTarget=null;}
function noteInput(){idleSince=0;}
function handleTap(sx,sy){if(gameOver)return;initAudio();playS('tap');playerAction();const w=s2w(sx,sy),gx=Math.floor(w.x/T),gy=Math.floor(w.y/T);
const HR=T*0.8;// hit radius for proximity checks
if(sel){if(sel.type==='aS'){if(gx>=0&&gx<GW&&gy>=0&&gy<GH&&!isOccNR(gx,gy)&&!nearA(gx,gy,AR-1)){grid[gy][gx]='seed';seeds.push({gx,gy});altarSeed=false;aCD=SCD;totalSP++;sel=null;disc_('seed','First seed planted');return;}sel=null;return;}
if(sel.type==='tS'){if(sel.ref.gx===gx&&sel.ref.gy===gy){sel=null;return;}if(gx>=0&&gx<GW&&gy>=0&&gy<GH&&!isOccNR(gx,gy)&&!nearA(gx,gy,AR-1)){sel.ref.hasSeed=false;grid[gy][gx]='treeSeedPlaced';tSP.push({gx,gy});sel=null;return;}sel=null;return;}
if(sel.type==='beaver'){const c=grid[gy][gx];if(c==='tree'||c==='treeSprout'||c==='bush'||c==='bushSprout'){sel.ref.chop={gx,gy};sel.ref.tX=gx*T+T/2;sel.ref.tY=gy*T+T/2;sel.ref.state='goT';sel=null;return;}sel=null;return;}
if(sel.type==='flower'){if(sel.ref.gx===gx&&sel.ref.gy===gy){sel=null;return;}if(gx>=0&&gx<GW&&gy>=0&&gy<GH&&grid[gy][gx]==='empty'&&!nearA(gx,gy,AR-1)){grid[sel.ref.gy][sel.ref.gx]='empty';sel.ref.gx=gx;sel.ref.gy=gy;grid[gy][gx]='flower';sel=null;chk2x2(gx,gy);return;}sel=null;return;}
if(sel.type==='deer'){for(const d of deers){if(d!==sel.ref&&dist(d.x,d.y,w.x,w.y)<HR){
  if(d.joined){sendDeerToTarget(sel.ref,herdLeader?herdLeader.x:d.x,herdLeader?herdLeader.y:d.y);sel=null;return;}
  if(deerPhase==='initial'&&d.isBaby&&!d.joined){sendDeerToTarget(sel.ref,d.x,d.y);sel=null;return;}
}}sel=null;return;}
if(sel.type==='herd'){for(const d of deers){if(!d.joined&&d.isBaby&&dist(d.x,d.y,w.x,w.y)<HR){sendHerdTo(d.x,d.y);sel=null;return;}}sel=null;return;}
sel=null;return;}
// FIRE: if carrying water and tap fire → apply water
if(hasWater&&firePhase==='active'&&fireTiles.has(`${gx},${gy}`)){
  applyWater();spawnP(gx*T+T/2,gy*T+T/2,'#40c0ff','#80e0ff');return;
}
// FIRE: tap river to pick up water
if(!hasWater&&firePhase==='active'&&river.has(`${gx},${gy}`)){
  hasWater=true;spawnP(gx*T+T/2,gy*T+T/2,'#3088e0','#50c8ff');return;
}
// Altar seed - bigger hitbox
if(altarSeed){const amx=CX*T+T/2,amy=CY*T+T/2;if(Math.abs(w.x-amx)<18&&Math.abs(w.y-(amy-6))<18){sel={type:'aS'};return;}}
// Reed
const reed=reeds.find(r=>r.gx===gx&&r.gy===gy&&r.st==='adult');if(reed){removeReed(gx,gy);return;}
// Flower - also check adjacent cells for bigger hitbox
const fl=flowers.find(f=>dist(f.gx*T+T/2,f.gy*T+T/2,w.x,w.y)<HR);
if(fl){sel={type:'flower',ref:fl};return;}
// Tree with seed - proximity
for(const t of trees){if(t.st==='tree'&&t.hasSeed&&dist(t.gx*T+T/2,t.gy*T+T/2,w.x,w.y)<HR){sel={type:'tS',ref:t};return;}}
// Beaver - proximity
for(const b of beavers){if(dist(b.x,b.y,w.x,w.y)<HR){sel={type:'beaver',ref:b};return;}}
// Birds - proximity
for(const b of[...rB,...bB]){if(dist(b.x,b.y,w.x,w.y)<HR){sel={type:b.type,ref:b};return;}}
// Deer - proximity
for(const d of deers){
  if(dist(d.x,d.y,w.x,w.y)<HR){
    if(!d.joined&&!d.isBaby){sel={type:'deer',ref:d};return;}
    else if(d.joined){sel={type:'herd',ref:d};return;}
    else if(d.isBaby){showTapLabel('Baby Deer',d.x,d.y);return;}
    return;
  }
}
// Frogs - proximity + name
for(const f of frogs){if(dist(f.x,f.y,w.x,w.y)<HR){showTapLabel('Frog',f.x,f.y);return;}}
// Bees - proximity + name
for(const b of bees){if(dist(b.x,b.y,w.x,w.y)<HR){showTapLabel('Bee',b.x,b.y);return;}}
// Tap-to-name for grid elements
if(gx>=0&&gx<GW&&gy>=0&&gy<GH){
  const cell=grid[gy][gx];
  const cx4=gx*T+T/2,cy4=gy*T+T/2;
  const names={seed:'Seed',bushSprout:'Sprout',bush:'Bush',treeSprout:'Sapling',tree:'Tree',treeSeedPlaced:'Tree Seed',flower:'Flower',burned:'Burned Ground',altar:'Altar'};
  // Tree with no seed - still show name
  if(cell==='tree'){const t=trees.find(t2=>t2.gx===gx&&t2.gy===gy);if(t&&t.hasSeed){showTapLabel('Tree (seed)',cx4,cy4);return;}showTapLabel('Tree',cx4,cy4);return;}
  if(names[cell]){showTapLabel(names[cell],cx4,cy4);return;}
  if(river.has(`${gx},${gy}`)){showTapLabel('River',cx4,cy4);return;}
  if(fireTiles.has(`${gx},${gy}`)){showTapLabel('Fire',cx4,cy4);return;}
  // Reed
  const rd2=reeds.find(r=>r.gx===gx&&r.gy===gy);
  if(rd2){showTapLabel('Reed',cx4,cy4);return;}
}
sel=null;}

C.addEventListener('mousedown',(e)=>{if(touchConsumed){touchConsumed=false;return;}if(e.button===0)handleTap(e.clientX,e.clientY);if(e.button===1){e.preventDefault();isPan=true;panS={x:e.clientX,y:e.clientY};camS={x:cam.x,y:cam.y};}});
C.addEventListener('contextmenu',(e)=>e.preventDefault());
C.addEventListener('mousemove',(e)=>{if(isPan){noteInput();cam.x=camS.x-(e.clientX-panS.x)/cam.z;cam.y=camS.y-(e.clientY-panS.y)/cam.z;}});
C.addEventListener('mouseup',(e)=>{if(e.button===1)isPan=false;});
C.addEventListener('wheel',(e)=>{e.preventDefault();noteInput();const zf=e.deltaY<0?1.15:1/1.15,oz=cam.z;cam.z=Math.max(0.5,Math.min(6,cam.z*zf));const wx=e.clientX/oz+cam.x,wy=e.clientY/oz+cam.y;cam.x=wx-e.clientX/cam.z;cam.y=wy-e.clientY/cam.z;},{passive:false});
C.addEventListener('touchstart',(e)=>{if(e.touches.length===2){const t1=e.touches[0],t2=e.touches[1];pinchDist=Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY);camS={x:cam.x,y:cam.y};return;}if(e.touches.length===1){const t=e.touches[0];touchId=t.identifier;touchStart={x:t.clientX,y:t.clientY};touchMoved=false;camS={x:cam.x,y:cam.y};}},{passive:true});
C.addEventListener('touchmove',(e)=>{noteInput();if(e.touches.length===2&&pinchDist!==null){const t1=e.touches[0],t2=e.touches[1];const nd=Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY);const oz=cam.z;cam.z=Math.max(0.5,Math.min(6,oz*(nd/pinchDist)));const mx2=(t1.clientX+t2.clientX)/2,my2=(t1.clientY+t2.clientY)/2;cam.x=mx2/oz+camS.x-mx2/cam.z;cam.y=my2/oz+camS.y-my2/cam.z;pinchDist=nd;return;}if(e.touches.length===1&&touchStart){const t=e.touches[0];const dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;if(Math.abs(dx)>8||Math.abs(dy)>8)touchMoved=true;if(touchMoved){cam.x=camS.x-dx/cam.z;cam.y=camS.y-dy/cam.z;}}},{passive:true});
C.addEventListener('touchend',(e)=>{if(e.touches.length<2)pinchDist=null;if(e.changedTouches.length===1){const t=e.changedTouches[0];if(t.identifier===touchId&&!touchMoved){handleTap(t.clientX,t.clientY);touchConsumed=true;}touchId=null;touchStart=null;touchMoved=false;}},{passive:true});
document.querySelectorAll('.speed-btn').forEach(b=>b.addEventListener('click',()=>setSpeed(parseInt(b.dataset.speed))));

// Keyboard speed: Q=x1, W=x2, E=x5, R=x10
const SPEED_KEYS={q:1,w:2,e:5,r:10};
document.addEventListener('keydown',(e)=>{
  if(e.key.toLowerCase()==='p'){togglePause();return;}
  if(gameOver||gamePaused)return;
  const sp=SPEED_KEYS[e.key.toLowerCase()];
  if(sp!==undefined)setSpeed(sp);
});

