// === FIRE SYSTEM ===
function startFire(){
  // Pick random spot away from altar, not on river
  for(let i=0;i<100;i++){
    const gx=5+Math.floor(Math.random()*(GW-10)),gy=5+Math.floor(Math.random()*(GH-10));
    if(!nearA(gx,gy,AR+2)&&!river.has(`${gx},${gy}`)){
      fireCenter={x:gx,y:gy};fireTiles.add(`${gx},${gy}`);
      // Also add a small initial cluster
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=gx+dx,ny=gy+dy;
        if(nx>=0&&nx<GW&&ny>=0&&ny<GH&&!nearA(nx,ny,AR)&&!river.has(`${nx},${ny}`))fireTiles.add(`${nx},${ny}`);
      }
      firePhase='active';fireHP=3;fireGrowT=0;fireGrowRate=2.5;fireRecurT=0;
      disc_('fire','Wildfire detected — collect water from the river!');
      playS('fire');
      return;
    }
  }
}
const FIRE_DIRS=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
function updFire(dt){
  // Update burned tiles recovery (always runs)
  burnedDecayT+=dt;
  if(burnedDecayT>=0.25){
    const step=burnedDecayT;burnedDecayT=0;
    for(const k in burnedTiles){
      burnedTiles[k]-=step;
      if(burnedTiles[k]<=0){delete burnedTiles[k];const[bx,by]=k.split(',').map(Number);if(grid[by]&&grid[by][bx]==='burned')grid[by][bx]='empty';}
    }
  }
  // Phase waiting: countdown after deer herd complete
  if(firePhase==='waiting'){
    if(cntDeer()>=MAX_DEER){
      fireTimer-=dt;if(fireTimer<=0){startFire();}
    }
    return;
  }
  // Recurring fire: 50% chance every 3 minutes after extinguished
  if(firePhase==='extinguished'){
    fireRecurT+=dt;
    if(fireRecurT>=180){
      fireRecurT=0;
      if(Math.random()<0.5){startFire();}
    }
    return;
  }
  if(firePhase!=='active')return;
  // Grow fire
  fireGrowT+=dt;
  const growInterval=Math.max(0.3,fireGrowRate-tt*0.001);
  if(fireGrowT>=growInterval){
    fireGrowT=0;
    const newTiles=[];
    const tilesArr=Array.from(fireTiles);
    const growCount=Math.max(1,Math.floor(tilesArr.length*0.15));
    for(let i=0;i<growCount;i++){
      const src=tilesArr[Math.floor(Math.random()*tilesArr.length)];
      const[sx,sy]=src.split(',').map(Number);
      const d=FIRE_DIRS[Math.floor(Math.random()*FIRE_DIRS.length)];
      const nx=sx+d[0],ny=sy+d[1];
      const nk=`${nx},${ny}`;
      if(nx>=0&&nx<GW&&ny>=0&&ny<GH&&!nearA(nx,ny,AR)&&!river.has(nk)&&!fireTiles.has(nk)&&burnedTiles[nk]===undefined){
        newTiles.push(nk);
      }
    }
    for(const t of newTiles)fireTiles.add(t);
    fireGrowRate=Math.max(0.4,fireGrowRate-0.03);
  }
  // Check fire game over: 75% of map
  const totalTiles=GW*GH;
  if(fireTiles.size>=totalTiles*0.75){
    triggerGameOver();return;
  }
  burnPlants();
}
// Sweep the plants once and ask the fire set about each, instead of sweeping
// every plant array once per burning tile (that was O(tiles x plants) a frame,
// plus two throwaway arrays per tile from splitting the key back apart).
function burnPlants(){
  if(!fireTiles.size)return;
  for(const arr of[bushes,trees,seeds,tSP,flowers]){
    for(let i=arr.length-1;i>=0;i--){
      const o=arr[i];
      if(fireTiles.has(o.gx+','+o.gy)){arr.splice(i,1);grid[o.gy][o.gx]='empty';}
    }
  }
  for(let i=reeds.length-1;i>=0;i--){const r=reeds[i];if(fireTiles.has(r.gx+','+r.gy))reeds.splice(i,1);}
}
function applyWater(){
  if(firePhase!=='active')return;
  fireHP--;
  hasWater=false;
  // Remove ~1/3 of fire tiles + reduce from edges
  const arr=Array.from(fireTiles);
  const removeCount=Math.max(Math.floor(arr.length*0.4),3);
  // Sort by distance from center to remove outer tiles first
  arr.sort((a,b)=>{const[ax,ay]=a.split(',').map(Number);const[bx,by]=b.split(',').map(Number);return dist(bx,by,fireCenter.x,fireCenter.y)-dist(ax,ay,fireCenter.x,fireCenter.y);});
  for(let i=0;i<Math.min(removeCount,arr.length);i++){
    const k=arr[i];fireTiles.delete(k);
    const[fx,fy]=k.split(',').map(Number);
    burnedTiles[k]=900;// 15 minutes
    if(grid[fy]&&grid[fy][fx]!=='altar')grid[fy][fx]='burned';
    spawnP(fx*T+T/2,fy*T+T/2,'#3088e0','#50c8ff');
  }
  // Reduce growth rate
  fireGrowRate=Math.min(3,fireGrowRate+0.8);
  if(fireHP<=0||fireTiles.size===0){
    // Extinguish remaining
    for(const k of fireTiles){
      const[fx,fy]=k.split(',').map(Number);
      burnedTiles[k]=900;
      if(grid[fy]&&grid[fy][fx]!=='altar')grid[fy][fx]='burned';
    }
    fireTiles.clear();
    firePhase='extinguished';
    fadeFireSound();
    disc_('fireOut','Wildfire extinguished');
    triggerBorderFlash();
  }
}

