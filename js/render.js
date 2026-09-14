// === RENDER ===
const FIRE_COLS=[COL.fireRed,COL.fireOrange,COL.fireYellow];
const entBuf=[];
function render(){
const W=VW,H=VH;
X.setTransform(DPR,0,0,DPR,0,0);// base transform: everything below is CSS px
X.fillStyle='#020802';X.fillRect(0,0,W,H);
X.globalAlpha=flickerA;
X.save();X.translate(-cam.x*cam.z,-cam.y*cam.z);X.scale(cam.z,cam.z);
const s0=Math.max(0,Math.floor(cam.x/T)-1),s1=Math.max(0,Math.floor(cam.y/T)-1);
const e0=Math.min(GW,Math.ceil((cam.x+W/cam.z)/T)+1),e1=Math.min(GH,Math.ceil((cam.y+H/cam.z)/T)+1);

// === TERRAIN LAYER ===
// Grass dominates this pass, so it is queued per colour bucket and flushed in
// one run each: ~24 fillStyle changes a frame instead of one per tile, with the
// glyph and shade read from the bake in state.js. The 'x,y' lookup key is built
// once per tile, and skipped entirely while the sets that need it are empty.
setFont("18px 'VT323',monospace");X.textAlign='center';X.textBaseline='middle';
const anyRiver=river.size>0,anyFire=fireTiles.size>0;
let anyBurn=false;for(const _k in burnedTiles){anyBurn=true;break;}
const needKey=anyRiver||anyFire||anyBurn;
for(let i=0;i<GRASS_STEPS;i++)gBuf[i].length=0;
for(let gy=s1;gy<e1;gy++)for(let gx=s0;gx<e0;gx++){
  const sx=gx*T+T/2,sy=gy*T+T/2;
  const k=needKey?gx+','+gy:null;
  const isRiv=anyRiver&&river.has(k);
  if(isRiv){
    const wi=Math.floor(tt*3+gx*0.7+gy*0.5)%4;
    const wCh=SYM.river[wi];
    const wB=Math.sin(tt*2+gx*0.3+gy*0.2)*0.15;
    X.shadowColor=COL.riverBlue;X.shadowBlur=5;
    X.fillStyle=wB>0?COL.riverCyan:COL.riverBlue;
    X.fillText(wCh,sx,sy);X.shadowBlur=0;
  }else if(grid[gy][gx]==='altar'){
    const ad=dist(gx,gy,CX,CY);
    const ai=ad<1.5?2:ad<2.5?1:0;
    const pulse=Math.sin(tt*2+gx+gy)*0.15;
    X.shadowColor=COL.altarBright;X.shadowBlur=3+pulse*4;
    X.fillStyle=COL.altarDim;
    X.fillText(SYM.altar[ai],sx,sy);X.shadowBlur=0;
  }else{
    const isFire=anyFire&&fireTiles.has(k);
    const isBurned=!isFire&&anyBurn&&burnedTiles[k]!==undefined;
    if(isFire){
      // Animated fire
      const fi=Math.floor(tt*6+gx*1.3+gy*0.9)%4;
      const fCh=SYM.fire[fi];
      const fBob=Math.sin(tt*8+gx*2+gy)*2;
      const fc=FIRE_COLS[Math.floor(tt*4+gx+gy)%3];
      X.shadowColor=COL.fireGlow;X.shadowBlur=10+Math.sin(tt*5+gx)*5;
      X.fillStyle=fc;X.fillText(fCh,sx,sy+fBob);X.shadowBlur=0;
    }else if(isBurned){
      // Scorched ground
      const bAlpha=0.3+Math.sin(gx*0.5+gy*0.3)*0.1;
      X.fillStyle=`rgba(48,20,8,${bAlpha})`;X.fillText(SYM.burned,sx,sy);
    }else{
      const i=gy*GW+gx;
      if(gCh[i]!==null)gBuf[gCI[i]].push(i);
    }
  }
}
for(let b=0;b<GRASS_STEPS;b++){
  const buf=gBuf[b];if(!buf.length)continue;
  X.fillStyle=GRASS_COLS[b];
  for(let n=0;n<buf.length;n++){const i=buf[n];X.fillText(gCh[i],(i%GW)*T+T/2,((i/GW)|0)*T+T/2);}
}

// === ALTAR CENTER + SEED ===
const mx=CX*T+T/2,my=CY*T+T/2;
const aGl=6+Math.sin(tt*2)*3;
X.shadowColor=COL.altarGlow;X.shadowBlur=aGl;
X.fillStyle=COL.altarBright;setFont("22px 'VT323',monospace");X.textAlign='center';X.textBaseline='middle';
X.fillText(SYM.altarCenter,mx,my);X.shadowBlur=0;
if(altarSeed){
  const bob=Math.sin(tt*4)*2;
  X.shadowColor=COL.seedGold;X.shadowBlur=10+Math.sin(tt*3)*4;
  X.fillStyle=COL.seedGold;setFont("20px 'VT323',monospace");
  X.fillText(SYM.altarSeed,mx,my-6+bob);X.shadowBlur=0;
  if(sel&&sel.type==='aS')drawHL(mx,my-6+bob);
}

// === GRID OBJECTS ===
setFont("18px 'VT323',monospace");
for(const s of seeds){const sx=s.gx*T+T/2,sy=s.gy*T+T/2,b=Math.sin(tt*4+s.gx)*2;
  X.shadowColor=COL.seedGold;X.shadowBlur=6;X.fillStyle=COL.seedGold;X.fillText(SYM.seed,sx,sy+b);X.shadowBlur=0;}
for(const s of tSP){const sx=s.gx*T+T/2,sy=s.gy*T+T/2,b=Math.sin(tt*3.5+s.gx)*2;
  X.shadowColor=COL.tSeedCyan;X.shadowBlur=6;X.fillStyle=COL.tSeedCyan;X.fillText(SYM.treeSeed,sx,sy+b);X.shadowBlur=0;}

// Reeds
for(const r of reeds){const sx=r.gx*T+T/2,sy=r.gy*T+T/2;const sw=Math.sin(tt*2.5+r.gx*0.3)*1;
  if(r.st==='sprout'){X.fillStyle=COL.reedGreen;X.fillText(SYM.reedSprout,sx+sw,sy);}
  else{X.shadowColor=COL.reedBright;X.shadowBlur=4;X.fillStyle=COL.reedBright;X.fillText(SYM.reed,sx+sw,sy);X.shadowBlur=0;}}

// Flowers
for(const f of flowers){const sx=f.gx*T+T/2,sy=f.gy*T+T/2,b=Math.sin(tt*2+f.gx*0.5)*1;
  X.shadowColor=f.col;X.shadowBlur=6;X.fillStyle=f.col;X.fillText(SYM.flower,sx,sy+b);X.shadowBlur=0;
  if(sel&&sel.type==='flower'&&sel.ref===f)drawHL(sx,sy+b);}

// Bushes
for(const b of bushes){const sx=b.gx*T+T/2,sy=b.gy*T+T/2;
  if(b.st==='sprout'){X.fillStyle=COL.bushDim;setFont("12px 'VT323',monospace");X.fillText(SYM.bushSprout,sx,sy);setFont("18px 'VT323',monospace");}
  else{X.shadowColor=COL.bushBright;X.shadowBlur=4;X.fillStyle=COL.bushBright;setFont("16px 'VT323',monospace");X.fillText(SYM.bush,sx,sy);setFont("18px 'VT323',monospace");X.shadowBlur=0;}}

// Trees
for(const t of trees){const sx=t.gx*T+T/2,sy=t.gy*T+T/2;
  if(t.st==='sprout'){X.fillStyle=COL.treeDim;setFont("22px 'VT323',monospace");X.fillText(SYM.treeSprout,sx,sy);setFont("18px 'VT323',monospace");}
  else{X.shadowColor=COL.treeGlow;X.shadowBlur=8;X.fillStyle=COL.treeBright;setFont("48px 'VT323',monospace");X.fillText(SYM.tree,sx,sy-6);setFont("18px 'VT323',monospace");X.shadowBlur=0;
    if(t.hasSeed){const sb=Math.sin(tt*3+t.gx)*1.5;X.shadowColor=COL.tSeedCyan;X.shadowBlur=6;X.fillStyle=COL.tSeedCyan;setFont("14px 'VT323',monospace");X.fillText('◇',sx+10,sy-14+sb);setFont("18px 'VT323',monospace");X.shadowBlur=0;}}
  if(sel&&sel.type==='tS'&&sel.ref===t)drawHL(sx,sy);
  if(sel&&sel.type==='beaver'&&sel.ref&&sel.ref.chop&&sel.ref.chop.gx===t.gx&&sel.ref.chop.gy===t.gy)drawHL(sx,sy);}
for(const b of bushes){if(sel&&sel.type==='beaver'&&sel.ref&&sel.ref.chop&&sel.ref.chop.gx===b.gx&&sel.ref.chop.gy===b.gy)drawHL(b.gx*T+T/2,b.gy*T+T/2);}

// === ENTITIES ===
// Depth sort reuses one buffer of one wrapper per slot, so a frame of rendering
// no longer allocates six spread arrays plus an object for every entity alive.
let an=0;
function pushEnt(r,sym,col,sz){const e=entBuf[an]||(entBuf[an]={r:null,sym:'',col:'',sz:18});e.r=r;e.sym=sym;e.col=col;e.sz=sz;an++;}
for(const b of rB)pushEnt(b,SYM.redBird,COL.redBird,18);
for(const b of bB)pushEnt(b,SYM.blueBird,COL.blueBird,18);
for(const b of beavers)pushEnt(b,SYM.beaver,COL.beaverAmber,18);
for(const f of frogs)pushEnt(f,SYM.frog,COL.frogGreen,18);
for(const b of bees)pushEnt(b,SYM.bee,COL.beeYellow,18);
for(const d of deers)pushEnt(d,d.isBaby?SYM.deerBaby:SYM.deerAdult,d.isBaby?COL.deerBabyCol:COL.deerAmber,d.isBaby?16:26);
const all=entBuf.slice(0,an).sort((a,b)=>a.r.y-b.r.y);
setFont("18px 'VT323',monospace");
for(const a of all){
  const wobble=a.r.mv?Math.sin(tt*8+a.r.x*0.1)*1.5:Math.sin(tt*2+a.r.x*0.05)*0.5;
  const ch=a.sym;
  X.shadowColor=a.col;X.shadowBlur=6;X.fillStyle=a.col;
  if(a.sz!==18)setFont(fontPx(a.sz));
  X.fillText(ch,a.r.x,a.r.y+wobble);
  if(a.sz!==18)setFont("18px 'VT323',monospace");
  X.shadowBlur=0;
  // Carry indicator
  if(a.r.carry==='seed'){X.shadowColor=COL.seedGold;X.shadowBlur=4;X.fillStyle=COL.seedGold;setFont("10px 'VT323',monospace");X.fillText('°',a.r.x+6,a.r.y-6+wobble);setFont("18px 'VT323',monospace");X.shadowBlur=0;}
  else if(a.r.carry==='treeSeed'){X.shadowColor=COL.tSeedCyan;X.shadowBlur=4;X.fillStyle=COL.tSeedCyan;setFont("10px 'VT323',monospace");X.fillText('◇',a.r.x+6,a.r.y-6+wobble);setFont("18px 'VT323',monospace");X.shadowBlur=0;}
  if(sel&&sel.ref===a.r)drawHL(a.r.x,a.r.y+wobble);
  // When herd selected, highlight all joined deer
  if(sel&&sel.type==='herd'&&deers.includes(a.r)&&a.r.joined){const ha=0.25+Math.sin(tt*4)*0.15;X.fillStyle=`rgba(204,136,64,${ha})`;setFont("12px 'VT323',monospace");X.fillText('·',a.r.x-8,a.r.y+wobble);X.fillText('·',a.r.x+8,a.r.y+wobble);setFont("18px 'VT323',monospace");}
  if(a.r.type==='beaver'&&a.r.chop&&a.r.state==='goT'){drawDL(a.r.x,a.r.y,a.r.chop.gx*T+T/2,a.r.chop.gy*T+T/2);drawHL(a.r.chop.gx*T+T/2,a.r.chop.gy*T+T/2);}
  // Unjoined deer pulse indicator
  if(deers.includes(a.r)&&!a.r.joined&&a.r.state!=='goTo'){const pa=0.3+Math.sin(tt*5)*0.25;X.fillStyle=`rgba(204,136,64,${pa})`;setFont("14px 'VT323',monospace");X.fillText('»',a.r.x-12,a.r.y+wobble);X.fillText('«',a.r.x+12,a.r.y+wobble);setFont("18px 'VT323',monospace");}
}

drawCTA();drawP();drawTapLabel();drawTut();
// Water carry indicator (screen-space)
// Selection / Water HUD indicator
{X.save();X.setTransform(DPR,0,0,DPR,0,0);setFont("28px 'VT323',monospace");X.textAlign='center';X.textBaseline='middle';
let hudText=null,hudCol=null,hudGlow=null;
if(hasWater){hudText='≋ WATER ≋';hudCol='rgba(64,192,255,';hudGlow=COL.waterBlue;}
else if(sel){
  const labels={aS:['✦ SEED ✦','rgba(210,170,60,',COL.seedGold],tS:['◇ TREE SEED ◇','rgba(80,220,210,',COL.tSeedCyan],beaver:['◈ BEAVER ◈','rgba(180,120,50,',COL.beaverAmber],flower:['✿ FLOWER ✿','rgba(255,100,160,',COL.flowerPink],redBird:['♪ RED BIRD ♪','rgba(200,60,40,',COL.redBird],blueBird:['♪ BLUE BIRD ♪','rgba(80,140,220,',COL.blueBird],deer:['Ω DEER Ω','rgba(204,136,64,',COL.deerAmber],herd:['Ω HERD Ω','rgba(204,136,64,',COL.deerAmber]};
  const l=labels[sel.type];if(l){hudText=l[0];hudCol=l[1];hudGlow=l[2];}
}
if(hudText){const ha=0.6+Math.sin(tt*5)*0.3;X.shadowColor=hudGlow;X.shadowBlur=12;X.fillStyle=hudCol+ha+')';X.fillText(hudText,W/2,H-30);X.shadowBlur=0;}
X.restore();resetFontState();}
// Fire HP indicator
if(firePhase==='active'&&!gameOver){X.save();X.setTransform(DPR,0,0,DPR,0,0);const fa=0.7+Math.sin(tt*4)*0.2;X.shadowColor=COL.fireGlow;X.shadowBlur=8;X.fillStyle=`rgba(255,80,32,${fa})`;setFont("22px 'VT323',monospace");X.textAlign='center';X.textBaseline='middle';const hpStr='FIRE '+'▲'.repeat(fireHP)+'·'.repeat(3-fireHP);X.fillText(hpStr,W/2,30);X.shadowBlur=0;X.restore();resetFontState();}
// Warm phosphor overlay
X.fillStyle='rgba(30,50,20,0.02)';X.fillRect(cam.x,cam.y,W/cam.z,H/cam.z);
// Day/night cycle overlay synced with clock
const dayProgress2=(tt%300)/300;
const sunAngle=dayProgress2*Math.PI*2-Math.PI/2;
const brightness=Math.max(0,Math.sin(sunAngle));// 0=night, 1=noon
const dayAlpha=brightness*0.12;
X.fillStyle=`rgba(180,220,160,${dayAlpha})`;X.fillRect(cam.x,cam.y,W/cam.z,H/cam.z);
X.restore();resetFontState();
X.globalAlpha=1;
}

function drawHL(wx,wy){const a=0.5+Math.sin(tt*6)*0.3;X.shadowColor=COL.highlight;X.shadowBlur=8;X.fillStyle=`rgba(80,255,80,${a})`;setFont("18px 'VT323',monospace");X.fillText('[',wx-9,wy);X.fillText(']',wx+9,wy);X.shadowBlur=0;}
function drawDL(x1,y1,x2,y2){const steps=Math.floor(dist(x1,y1,x2,y2)/8);X.fillStyle=`rgba(80,255,80,0.3)`;setFont("8px 'VT323',monospace");for(let i=0;i<steps;i++){const t2=i/steps;const px2=x1+(x2-x1)*t2,py2=y1+(y2-y1)*t2;if(Math.floor(tt*4+i)%2===0)X.fillText('·',px2,py2);}}

