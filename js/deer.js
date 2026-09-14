// === DEER / HERD SYSTEM ===
function mkDeer(isBaby,wx,wy){return{x:wx,y:wy,tX:wx,tY:wy,isBaby,state:'idle',mv:false,fR:true,speed:isBaby?18:28,idleT:1+Math.random()*3,stT:2,joined:false,wanderCX:wx,wanderCY:wy};}
function updDeer(dt){
  // Phase: waiting for 3 bees
  if(deerPhase==='waiting'){if(bees.length>=MAX_BEES){deerSpawnT-=dt;if(deerSpawnT<=0){deerPhase='initial';spawnInitialDeer();}}}
  // Phase: growing herd - spawn new deer 1 by 1
  if(deerPhase==='herd'){
    if(cntDeer()<MAX_DEER){deerNextT-=dt;if(deerNextT<=0){deerNextT=12+Math.random()*13;spawnNewDeer();}}
  }
  // Update each deer
  for(const d of deers){
    if(d.state==='goTo'){
      if(deerMvTo(d,d.tX,d.tY,dt)){
        // Check if reached target
        if(!d.joined){
          d.joined=true;spawnP(d.x,d.y,'#cc8840','#eebb70');
          // Check if initial pair reunited
          if(deerPhase==='initial'){
            const allInit=deers.filter(d2=>!d2.joined);
            if(allInit.length===0){deerPhase='herd';deerNextT=12+Math.random()*10;disc_('deer','Herd formed');}
            else{// Baby also joins
              for(const d2 of allInit){d2.joined=true;spawnP(d2.x,d2.y,'#cc8840','#eebb70');}
              deerPhase='herd';deerNextT=12+Math.random()*10;disc_('deer','Herd formed');
            }
          }
        }
        d.state='idle';d.idleT=1+Math.random()*2;
      }
    }else if(d.state==='wander'){
      if(deerMvTo(d,d.tX,d.tY,dt)||d.stT<=0){d.state='idle';d.idleT=1+Math.random()*3;}else{d.stT-=dt;}
    }else if(d.state==='idle'){
      d.mv=false;d.idleT-=dt;
      if(d.idleT<=0){
        if(d.joined&&d!==herdLeader&&herdLeader){
          // Follow herd: pick spot near leader
          const lx=herdLeader.x,ly=herdLeader.y;
          const ang=Math.random()*Math.PI*2,r2=15+Math.random()*25;
          d.tX=Math.max(T,Math.min(MW-T,lx+Math.cos(ang)*r2));
          d.tY=Math.max(T,Math.min(MH-T,ly+Math.sin(ang)*r2));
          d.state='wander';d.stT=3+Math.random()*3;
        }else if(!d.joined){
          // Wander small area near spawn
          const ang=Math.random()*Math.PI*2,r2=10+Math.random()*20;
          d.tX=Math.max(T,Math.min(MW-T,d.wanderCX+Math.cos(ang)*r2));
          d.tY=Math.max(T,Math.min(MH-T,d.wanderCY+Math.sin(ang)*r2));
          d.state='wander';d.stT=2+Math.random()*3;
        }else{
          // Is leader: wander broadly
          const ang=Math.random()*Math.PI*2,r2=30+Math.random()*50;
          d.tX=Math.max(T*3,Math.min(MW-T*3,d.x+Math.cos(ang)*r2));
          d.tY=Math.max(T*3,Math.min(MH-T*3,d.y+Math.sin(ang)*r2));
          d.state='wander';d.stT=4+Math.random()*5;
        }
        d.idleT=2+Math.random()*4;
      }
    }
  }
  // Proximity: unjoined deer auto-join when herd leader is close
  if(deerPhase==='herd'&&herdLeader){
    for(const d of deers){if(!d.joined){const dd=Math.sqrt((d.x-herdLeader.x)**2+(d.y-herdLeader.y)**2);if(dd<40){d.joined=true;spawnP(d.x,d.y,'#cc8840','#eebb70');}}}
  }
}
function deerMvTo(d,tx,ty,dt){const dx=tx-d.x,dy=ty-d.y,dd=Math.sqrt(dx*dx+dy*dy);if(dd<4){d.mv=false;return true;}const s=d.speed*dt;let nx=d.x+(dx/dd)*Math.min(s,dd),ny=d.y+(dy/dd)*Math.min(s,dd);const ngx=Math.floor(nx/T),ngy=Math.floor(ny/T);if(isFB(ngx,ngy)){const pX=-dy/dd,pY=dx/dd;nx=d.x+pX*s*(Math.random()>0.5?2:-2);ny=d.y+pY*s*(Math.random()>0.5?2:-2);const g2=Math.floor(nx/T),g3=Math.floor(ny/T);if(isFB(g2,g3)){d.state='idle';d.idleT=0.5;d.mv=false;return false;}}d.x=Math.max(T,Math.min(MW-T,nx));d.y=Math.max(T,Math.min(MH-T,ny));d.mv=true;if(dx>0)d.fR=true;else if(dx<0)d.fR=false;return false;}
function spawnInitialDeer(){
  // Baby at one corner, adult at opposite
  const corners=[[3,3],[GW-4,3],[3,GH-4],[GW-4,GH-4]];
  const ci=Math.floor(Math.random()*4);
  const opp=(ci+2)%4;
  const bc=corners[ci],ac=corners[opp];
  const baby=mkDeer(true,bc[0]*T+T/2,bc[1]*T+T/2);
  const adult=mkDeer(false,ac[0]*T+T/2,ac[1]*T+T/2);
  herdLeader=adult;
  deers.push(adult,baby);
  disc_('deer','Deer detected at the borders');
}
function spawnNewDeer(){
  if(deers.length>=MAX_DEER)return;
  const isBaby=Math.random()<0.4;
  // Spawn at random edge
  const side=Math.floor(Math.random()*4);
  let sx,sy;
  if(side===0){sx=3+Math.random()*(GW-6);sy=2;}
  else if(side===1){sx=3+Math.random()*(GW-6);sy=GH-3;}
  else if(side===2){sx=2;sy=3+Math.random()*(GH-6);}
  else{sx=GW-3;sy=3+Math.random()*(GH-6);}
  const d=mkDeer(isBaby,sx*T+T/2,sy*T+T/2);
  deers.push(d);
  spawnP(d.x,d.y,'#cc8840','#eebb70');
}
function sendDeerToTarget(deer,tx,ty){deer.tX=tx;deer.tY=ty;deer.state='goTo';}
function sendHerdTo(tx,ty){
  // Move leader to target, others will follow via idle behavior
  if(herdLeader){herdLeader.tX=tx;herdLeader.tY=ty;herdLeader.state='goTo';
    // Also nudge joined deer to move that way
    for(const d of deers){if(d.joined&&d!==herdLeader){const ang=Math.random()*Math.PI*2,r2=15+Math.random()*25;d.tX=Math.max(T,Math.min(MW-T,tx+Math.cos(ang)*r2));d.tY=Math.max(T,Math.min(MH-T,ty+Math.sin(ang)*r2));d.state='goTo';}}}
}

