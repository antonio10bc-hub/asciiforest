// === DAY COUNTER & PAUSE & GAME OVER ===
let badgeSeenCount=0;// tracks how many tasks were done when gallery last opened
// The clock hand and the day label change far slower than the frame rate, so
// each of these only touches the DOM when its value actually moves.
let lastDayShown=-1,lastClockStep=-1,lastBadge=null;
function updDay(){
  dayCount=Math.floor(tt/300)+1;
  if(dayCount!==lastDayShown){lastDayShown=dayCount;EL['day-counter'].textContent='DAY '+dayCount;}
  // Day/night: synced so day 1 starts at sunrise. 0=sunrise, 0.5=sunset, 1=next sunrise
  const dayProgress=(tt%300)/300;
  // Draw clock widget (52x56) — only once per visible step of the sun
  const step=Math.floor(dayProgress*600);
  if(clockCtx&&step!==lastClockStep){
    lastClockStep=step;
    const cx2=clockCtx;
    const cw=52,ch=56;
    const cc=EL['clock-canvas'];
    if(cc.width!==Math.round(cw*DPR)){// first draw, or the window moved to another display
      cc.width=Math.round(cw*DPR);cc.height=Math.round(ch*DPR);
      cc.style.width=cw+'px';cc.style.height=ch+'px';
    }
    cx2.setTransform(DPR,0,0,DPR,0,0);
    cx2.clearRect(0,0,cw,ch);
    cx2.fillStyle='rgba(0,4,0,0.5)';cx2.fillRect(0,0,cw,ch);
    cx2.strokeStyle='rgba(255,255,255,0.45)';cx2.lineWidth=1;cx2.strokeRect(0,0,cw,ch);
    // Horizon line
    cx2.strokeStyle='rgba(255,255,255,0.3)';cx2.beginPath();cx2.moveTo(2,ch/2);cx2.lineTo(cw-2,ch/2);cx2.stroke();
    // Angle: 0=sunrise(right), rotates clockwise. dayProgress 0=sunrise
    const angle=dayProgress*Math.PI*2-Math.PI/2;
    const sunX=cw/2+Math.cos(angle)*17;
    const sunY=ch/2-Math.sin(angle)*20;
    const moonX=cw/2+Math.cos(angle+Math.PI)*17;
    const moonY=ch/2-Math.sin(angle+Math.PI)*20;
    // Sun (big)
    cx2.font="24px 'VT323',monospace";cx2.textAlign='center';cx2.textBaseline='middle';
    cx2.shadowColor='#ffcc30';cx2.shadowBlur=sunY<ch/2?8:0;
    cx2.fillStyle=sunY<ch/2?'#ffdd40':'rgba(255,200,48,0.2)';
    cx2.fillText('\u2600',sunX,sunY);
    // Moon (big)
    cx2.shadowColor='#c0c8e0';cx2.shadowBlur=moonY<ch/2?6:0;
    cx2.fillStyle=moonY<ch/2?'#d0d8f0':'rgba(192,200,224,0.2)';
    cx2.fillText('\u263d',moonX,moonY);
    cx2.shadowBlur=0;
  }
  // Notification badge: show only when new tasks completed since last gallery visit
  const want=tasksDone.size>badgeSeenCount&&!galOpen;
  if(want!==lastBadge){lastBadge=want;if(EL['gallery-badge'])EL['gallery-badge'].classList.toggle('show',want);}
}
// One way in and out of the speed state. Every control — settings, debug panel,
// keyboard — goes through setSpeed() so the active markers can never drift apart,
// and so pausing is the only thing that ever writes gS directly.
function setSpeed(mult){
  spdMult=mult;prevSpeed=mult*BASE_SPEED;
  if(!gamePaused&&!gameOver)gS=prevSpeed;
  syncSpeedUI();
}
function syncSpeedUI(){
  document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.speed)===spdMult));
}
function togglePause(){
  if(gameOver)return;
  gamePaused=!gamePaused;
  if(gamePaused){prevSpeed=gS;gS=0;}
  else gS=prevSpeed||BASE_SPEED;
  const b=EL['pause-btn'];
  b.textContent=gamePaused?'▶':'||';
  b.classList.toggle('paused',gamePaused);
  b.setAttribute('aria-label',gamePaused?'Resume':'Pause');
}
function triggerGameOver(){
  gameOver=true;gS=0;hasLostOnce=true;resetHints();
  fadeFireSound();
  // Fade out music
  const bFade=setInterval(()=>{if(SND.bgm.volume>0.02){SND.bgm.volume=Math.max(0,SND.bgm.volume-0.03);}else{SND.bgm.pause();clearInterval(bFade);}},60);
  // Remove all animals
  rB.length=0;bB.length=0;beavers.length=0;frogs.length=0;bees.length=0;deers.length=0;
  // Show overlay
  document.querySelector('#gameover-overlay .go-days').textContent='DAY '+dayCount;
  EL['gameover-overlay'].classList.add('show');
}
function restartGame(){
  // Reset all state
  gameOver=false;gamePaused=false;spdMult=1;gS=BASE_SPEED;prevSpeed=BASE_SPEED;tt=0;dayCount=0;aT=0;
  grid=[];seeds=[];bushes=[];trees=[];tSP=[];rB=[];bB=[];beavers=[];
  river=new Set();riverDone=false;riverDoneT=0;reeds=[];frogs=[];
  flowers=[];bees=[];deers=[];deerPhase='waiting';deerSpawnT=10;deerNextT=0;herdLeader=null;
  altarSeed=false;aCD=0;sel=null;particles=[];
  disc={};discQ=[];discT=0;
  rPaths=[];rI=[];rGT=0;
  galPage='tasks';galOpen=false;totalSP=0;
  ctaTarget=null;ctaTimer=0;lastPA=0;
  reedST=0;reedSD=false;taskBT=0;flowerST=3+Math.random()*7;
  flickerT=0;flickerA=1;touchId=null;touchStart=null;touchMoved=false;pinchDist=null;touchConsumed=false;
  fireTiles=new Set();firePhase='waiting';fireTimer=30;fireHP=3;fireGrowT=0;fireGrowRate=2.5;fireCenter={x:0,y:0};
  fireRecurT=0;burnedTiles={};burnedDecayT=0;hasWater=false;
  tutStep=0;tutPos=null;tapLabel=null;
  tasksDone=new Set();
  badgeSeenCount=0;idleSince=0;resetHints();lastDayShown=-1;lastClockStep=-1;lastBadge=null;
  // Rebuild grid
  for(let y=0;y<GH;y++){grid[y]=[];for(let x=0;x<GW;x++)grid[y][x]='empty';}
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.abs(dx)+Math.abs(dy)<=3)grid[CY+dy][CX+dx]='altar';
  // Reset UI
  EL['gameover-overlay'].classList.remove('show');
  EL['pause-btn'].textContent='||';EL['pause-btn'].classList.remove('paused');EL['pause-btn'].setAttribute('aria-label','Pause');
  EL['day-counter'].textContent='DAY 1';
  EL['gallery-badge'].classList.remove('show');
  closeGal();
  // Restart music
  SND.bgm.volume=volMusic*0.5;
  SND.bgm.currentTime=0;
  if(audioStarted)SND.bgm.play().catch(()=>{});
  cam.x=CX*T-VW/(2*cam.z);cam.y=CY*T-VH/(2*cam.z);
  // Show speed controls in settings after first death (the buttons themselves are
  // wired once at load, in input.js).
  if(hasLostOnce){
    document.getElementById('stg-speed').style.display='block';
    EL['settings-badge'].classList.add('show');
  }
  syncSpeedUI();
}

// === TUTORIAL BUBBLES ===
function updTut(dt){
  if(hasLostOnce){tutPos=null;return;}
  // Advance the step first...
  if(tutStep===0&&sel&&sel.type==='aS')tutStep=1;
  if(tutStep===1&&totalSP>=1&&!sel)tutStep=2;
  if(tutStep===2&&galOpen)tutStep=3;
  // ...then derive the bubble from the step we ended up in. Nothing matching
  // means no bubble, which is what keeps it from sticking around.
  tutPos=null;
  if(tutStep===0&&altarSeed&&totalSP===0&&!sel){
    // Step 0: "Take a seed"
    tutPos={text:'Take a seed',wx:CX*T+T/2,wy:CY*T-14,type:'world'};
  }else if(tutStep===1&&sel&&sel.type==='aS'){
    // Step 1: "Plant the seed" — same spot the idle CTA points at
    const p=ctaPlantSpot();
    tutPos={text:'Plant the seed',wx:p.x,wy:p.y-10,type:'world'};
  }else if(tutStep===2&&totalSP>=1&&!sel&&!galOpen){
    // Step 2: "Check your current task"
    tutPos={text:'Check your current task',type:'screenRight'};
  }
}
function drawTut(){
  if(!tutPos)return;
  const alpha=1;
  if(tutPos.type==='world'){
    const wx=tutPos.wx,wy=tutPos.wy;
    setFont("13px 'VT323',monospace");X.textAlign='center';X.textBaseline='bottom';
    const tm=X.measureText(tutPos.text);
    const bw=tm.width+16,bh=22;
    const bx=wx-bw/2,by=wy-bh;
    X.fillStyle=`rgba(20,20,20,0.85)`;X.fillRect(bx,by,bw,bh);
    X.strokeStyle=`rgba(255,255,255,0.5)`;X.lineWidth=1;X.strokeRect(bx,by,bw,bh);
    // Triangle pointer down
    X.fillStyle=`rgba(20,20,20,0.85)`;
    X.beginPath();X.moveTo(wx-5,by+bh);X.lineTo(wx+5,by+bh);X.lineTo(wx,by+bh+6);X.closePath();X.fill();
    X.strokeStyle=`rgba(255,255,255,0.5)`;X.beginPath();X.moveTo(wx-5,by+bh);X.lineTo(wx,by+bh+6);X.lineTo(wx+5,by+bh);X.stroke();
    X.fillStyle=`rgba(255,255,255,${alpha})`;X.shadowColor=`rgba(255,255,255,0.3)`;X.shadowBlur=4;
    X.fillText(tutPos.text,wx,wy-4);X.shadowBlur=0;
  } else if(tutPos.type==='screenRight'){
    // Draw to the RIGHT of gallery button (bottom:10,left:10,88x76) → left edge at 108px
    X.save();X.setTransform(DPR,0,0,DPR,0,0);
    setFont("14px 'VT323',monospace");X.textAlign='left';X.textBaseline='middle';
    const tm=X.measureText(tutPos.text);
    const bw=tm.width+16,bh=26;
    const bx=108,by=VH-48-bh/2;// vertically center with gallery btn
    X.fillStyle=`rgba(20,20,20,0.85)`;X.fillRect(bx,by,bw,bh);
    X.strokeStyle=`rgba(255,255,255,0.5)`;X.lineWidth=1;X.strokeRect(bx,by,bw,bh);
    // Triangle pointing LEFT toward button
    X.fillStyle=`rgba(20,20,20,0.85)`;
    X.beginPath();X.moveTo(bx,by+bh/2-5);X.lineTo(bx,by+bh/2+5);X.lineTo(bx-6,by+bh/2);X.closePath();X.fill();
    X.strokeStyle=`rgba(255,255,255,0.5)`;X.beginPath();X.moveTo(bx,by+bh/2-5);X.lineTo(bx-6,by+bh/2);X.lineTo(bx,by+bh/2+5);X.stroke();
    X.fillStyle=`rgba(255,255,255,${alpha})`;X.shadowColor='rgba(255,255,255,0.3)';X.shadowBlur=4;
    X.fillText(tutPos.text,bx+8,by+bh/2);X.shadowBlur=0;
    X.restore();resetFontState();
  }
}

// === TAP LABEL (name tooltip) ===
function showTapLabel(text,wx,wy){tapLabel={text,wx,wy,timer:2};}
function updTapLabel(dt){if(tapLabel){tapLabel.timer-=dt;if(tapLabel.timer<=0)tapLabel=null;}}
function drawTapLabel(){
  if(!tapLabel)return;
  const alpha=Math.min(1,tapLabel.timer/0.3);
  setFont("11px 'VT323',monospace");X.textAlign='center';X.textBaseline='bottom';
  X.fillStyle=`rgba(255,255,255,${0.9*alpha})`;X.shadowColor=`rgba(255,255,255,${0.25*alpha})`;X.shadowBlur=3;
  X.fillText(tapLabel.text,tapLabel.wx,tapLabel.wy-8);X.shadowBlur=0;
}

// === FLICKER ===
// Mirrors the prefers-reduced-motion block in the stylesheet: the flicker is
// drawn in canvas, so CSS cannot switch it off.
const reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function updFlicker(dt){if(reduceMotion){flickerA=1;return;}flickerT-=dt;if(flickerT<=0){flickerT=3+Math.random()*12;flickerA=0.85+Math.random()*0.1;setTimeout(()=>{flickerA=1;},40+Math.random()*80);}}

function update(dt){if(gameOver)return;const s=dt*gS;tt+=s;updDay();updAltar(s);updBushes(s);updTrees(s);updRiver(s);updReeds(s);updFlowers(s);updFire(s);updP(s);updateCTA(s);updTB(s);updFlicker(s);updDeer(s);updTut(s);updTapLabel(s);for(const b of rB)updRBi(b,s);for(const b of bB)updBBi(b,s);for(const b of beavers)updBVi(b,s);for(const f of frogs)updFrg(f,s);for(const b of bees)updBeeI(b,s);chkSpawn();updD(s);aT+=s;updTasks();}

