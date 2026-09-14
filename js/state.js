const C=document.getElementById('game'),X=C.getContext('2d');
// Assigning ctx.font re-parses the shorthand, and the draw loops flip between
// sizes hundreds of times a frame. setFont() skips the no-op writes; ctx.restore()
// rolls the real font back, so every restore must clear the shadow copy.
let _font='';
const _fontCache={};
function fontPx(sz){return _fontCache[sz]||(_fontCache[sz]=sz+"px 'VT323',monospace");}
function setFont(f){if(f!==_font){_font=f;X.font=f;}}
function resetFontState(){_font='';}
const T=20,GW=60,GH=60,MW=GW*T,MH=GH*T,CX=30,CY=30;
const AR=5,SCD=3000,MRB=2,MBB=3,MT=100,MTS=2,MAX_SEEDS=3,MAX_BV=3,MAX_FROGS=5,MAX_REEDS=20,MAX_FLOWERS=30,MAX_BEES=6,MAX_DEER=10;
let DPR=1,VW=0,VH=0;// device pixel ratio and viewport size in CSS px
// The nominal x1 runs a touch quicker than real time; the speed buttons are
// multipliers on top of it, so x1 stays the labelled baseline.
const BASE_SPEED=1.25;
let spdMult=1;// which of SPEED_STEPS the player picked
let gS=BASE_SPEED,cam={x:0,y:0,z:2.5},isPan=false,panS={x:0,y:0},camS={x:0,y:0};
let grid=[],seeds=[],bushes=[],trees=[],tSP=[],rB=[],bB=[],beavers=[];
let river=new Set(),riverDone=false,riverDoneT=0,reeds=[],frogs=[];
let flowers=[],bees=[];
let deers=[],deerPhase='waiting',deerSpawnT=10,deerNextT=0,herdLeader=null;
let altarSeed=false,aCD=0,sel=null,particles=[];
let disc={},discQ=[],discT=0,aT=0,tt=0;
let gamePaused=false,prevSpeed=BASE_SPEED,gameOver=false,dayCount=0,hasLostOnce=false;
// Tutorial bubbles (show once)
let tutStep=0,tutPos=null;
// Tap-to-name tooltip
let tapLabel=null;// {text,wx,wy,timer}
let rPaths=[],rI=[],rGT=0;
let galPage='tasks',galOpen=false,totalSP=0;
let ctaTarget=null,ctaTimer=0,lastPA=0;const CTA_IDLE=5;
// lastPA is also reset when a CTA fires, so idle hints need their own clock:
// this one only goes back to zero on a real gesture from the player.
let idleSince=0;
let touchId=null,touchStart=null,touchMoved=false,pinchDist=null,touchConsumed=false;
let reedST=0,reedSD=false,taskBT=0,flowerST=3+Math.random()*7;
let flickerT=0,flickerA=1;
// === FIRE SYSTEM ===
let fireTiles=new Set(),firePhase='waiting',fireTimer=30,fireHP=3,fireGrowT=0,fireGrowRate=2.5,fireCenter={x:0,y:0};
let fireRecurT=0;// cooldown for recurring fires
let burnedTiles={};// key:'x,y' → timer remaining
let burnedDecayT=0;// batches the burned-ground countdown
let hasWater=false;

// === AUDIO SYSTEM ===
const SND={
  bgm:new Audio('Sounds/bgmusic.wav'),
  fire:new Audio('Sounds/firesound.wav'),
  mission:new Audio('Sounds/missioncompletedsound.wav'),
  tap:new Audio('Sounds/tapsound.wav'),
};
let volMusic=0.25,volSFX=0.5,audioStarted=false,fireAudio=null;

// === PREFERENCES ===
// Saved settings, namespaced and versioned so a later shape change can be told
// apart from this one. Every access is guarded: localStorage throws outright in
// private windows and when site data is blocked, and the value that comes back
// was last written by a machine we do not control, so it is validated rather
// than trusted. Failing to load or save must never stop the game starting.
const PREFS_KEY='spiritgrove.prefs.v1';
function num01(v,fallback){const n=typeof v==='number'?v:NaN;return Number.isFinite(n)?Math.min(1,Math.max(0,n)):fallback;}
function loadPrefs(){
  let raw=null;
  try{raw=localStorage.getItem(PREFS_KEY);}catch(e){return;}// storage blocked
  if(!raw)return;
  let p;try{p=JSON.parse(raw);}catch(e){return;}// corrupted entry: fall back to defaults
  if(!p||typeof p!=='object')return;
  volMusic=num01(p.volMusic,volMusic);
  volSFX=num01(p.volSFX,volSFX);
}
function savePrefs(){
  try{localStorage.setItem(PREFS_KEY,JSON.stringify({volMusic,volSFX}));}catch(e){}// quota or blocked
}
loadPrefs();

SND.bgm.loop=true;SND.bgm.volume=volMusic*0.5;
function initAudio(){if(audioStarted)return;audioStarted=true;SND.bgm.play().catch(()=>{});}
function playS(name){if(!audioStarted)return;const s=SND[name];if(!s)return;const c=s.cloneNode();c.volume=name==='fire'?volSFX*0.5:volSFX;c.play().catch(()=>{});if(name==='fire')fireAudio=c;return c;}
function fadeFireSound(){if(!fireAudio)return;const a=fireAudio;const fade=setInterval(()=>{if(a.volume>0.02){a.volume=Math.max(0,a.volume-0.05);}else{a.pause();clearInterval(fade);}},50);fireAudio=null;}
function updVol(){SND.bgm.volume=volMusic*0.5;}
const FC=['#ff4060','#ff8830','#ff30c0','#f0e030','#30e8ff','#c060ff','#ff6030','#30ffa0'];
// Symbol & color definitions
// VT323 only covers ASCII + Latin-1 — everything outside that (card suits, block
// elements, Greek, dingbats) silently falls back to a system font, which is why
// the old glyphs never matched the terminal text and, worse, measured a
// different advance width. Every glyph below is inside the font, so the world
// and the UI now render in one typeface at one cell width, which is what lets
// the multi-line sprites in SPR line up at all.
const SYM={
  grass:['.','.',',',',','\'','`',' ',' ',' '],
  altar:[':','#','@'],
  altarCenter:'\u00d8',
  altarSeed:'*',
  seed:'\u00b0',
  treeSeed:'\u00f0',
  river:['--','==','--','__'],// two glyphs fill the tile; see the '~' note above
  reedSprout:'\u00a6',
  reed:'!',
  fire:['\u00c5','^','\u00c2','*'],
  burned:'%',
  waterDrop:'=',
  particle:'\u00b7',
};

// Multi-glyph sprites. One character can only ever be a symbol for a tree; a
// small stack of them can actually look like one. Lines are drawn centred on the
// entity's anchor, top to bottom, `lh` apart; `sway` marks foliage that drifts
// with the wind. Everything an entity needs to draw itself lives here, so
// retuning the look never means touching render().
const SPR={
  tree:      {l:[' ,\u00f8, ','(\u00f8\u00f8\u00f8)','  ||  '],sz:[13,13,9],lh:9,dy:-4,sway:2},
  treeSprout:{l:['Y','|'],sz:[14,8],lh:8,dy:-2,sway:1},
  bush:      {l:['\u00f8\u00d8\u00f8'],sz:16,sway:1},
  bushSprout:{l:['\\|/'],sz:12,sway:1},
  flower:    {l:['\u00a4','|'],sz:[15,9],lh:8,dy:-3,sway:1},
  reed:      {l:['!'],sz:20,sway:2},
  reedSprout:{l:['\u00a6'],sz:16,sway:2},
  deer:      {l:['\u00a5','m'],sz:17,lh:13,dy:-4},
  fawn:      {l:['\u00b0','n'],sz:13,lh:9,dy:-2},
  beaver:    {l:['(oo)='],sz:13},
  frog:      {l:['\u00b0\u00b0','(_)'],sz:13,lh:9,dy:-2},
  // Two-frame wing beats, picked by the flap clock in render().
  bird:      {l:['\\v/'],alt:['_v_'],sz:15},
  bee:       {l:['}\u00f8{'],alt:['\u00bbo\u00ab'],sz:14},
  altar:     {l:['\u00d8','==='],sz:17,lh:12,dy:-3},
};
const COL={
  bgDark:'#020802',
  grassDim:'#0a3a0a',
  grassMid:'#1a5a1a',
  grassBright:'#30aa30',
  altarDim:'#303050',
  altarMid:'#5050a0',
  altarBright:'#8888ff',
  altarGlow:'#aaaaff',
  seedGold:'#ffdd30',
  seedGlow:'#ffaa00',
  tSeedCyan:'#30ddff',
  bushDim:'#208020',
  bushBright:'#40e040',
  treeDim:'#0a5020',
  treeBright:'#18803a',
  treeGlow:'#10602a',
  riverBlue:'#3088e0',
  riverCyan:'#50c8ff',
  riverDim:'#204880',
  reedGreen:'#40a040',
  reedBright:'#60e060',
  redBird:'#ff3030',
  blueBird:'#3080ff',
  beaverAmber:'#e0a020',
  frogGreen:'#30ff30',
  flowerPink:'#ff5088',
  beeYellow:'#ffe030',
  deerAmber:'#cc8840',
  deerBabyCol:'#eebb70',
  fireRed:'#ff2010',
  fireOrange:'#ff8020',
  fireYellow:'#ffcc10',
  fireGlow:'#ff4020',
  burnedDark:'#1a0a04',
  burnedMid:'#302010',
  waterBlue:'#40c0ff',
  highlight:'#50ff50',
  white:'#e0ffe0',
  dim:'#0a2a0a',
};

// Gallery icons: the signature line of each world sprite, so the log shows the
// same creature the player just met rather than an unrelated symbol.
const GAL={plants:[
{key:'seed',name:'SEED',sym:SYM.seed,col:COL.seedGold,prog:null},
{key:'bushSprout',name:'SPROUT',sym:'\\|/',col:COL.bushDim,prog:null},
{key:'bush',name:'BUSH',sym:SPR.bush.l[0],col:COL.bushBright,prog:{current:()=>cntB(),max:3}},
{key:'treeSeed',name:'TREE SEED',sym:SYM.treeSeed,col:COL.tSeedCyan,prog:null},
{key:'treeSprout',name:'SAPLING',sym:'Y',col:COL.treeDim,prog:null},
{key:'tree',name:'TREE',sym:SPR.tree.l[1],col:COL.treeBright,prog:{current:()=>cntT(),max:6}},
{key:'river',name:'RIVER',sym:'===',col:COL.riverCyan,prog:null},
{key:'reed',name:'REED',sym:SYM.reed,col:COL.reedBright,prog:null},
{key:'flower',name:'FLOWER',sym:SPR.flower.l[0],col:COL.flowerPink,prog:{current:()=>flowers.length,max:MAX_FLOWERS}},
],animals:[
{key:'redBird',name:'RED BIRD',sym:SPR.bird.l[0],col:COL.redBird,prog:{current:()=>rB.length,max:MRB}},
{key:'blueBird',name:'BLUE BIRD',sym:SPR.bird.l[0],col:COL.blueBird,prog:{current:()=>bB.length,max:MBB}},
{key:'beaver',name:'BEAVER',sym:SPR.beaver.l[0],col:COL.beaverAmber,prog:{current:()=>beavers.length,max:MAX_BV}},
{key:'frog',name:'FROG',sym:SPR.frog.l[0],col:COL.frogGreen,prog:{current:()=>frogs.length,max:MAX_FROGS}},
{key:'bee',name:'BEE',sym:SPR.bee.l[0],col:COL.beeYellow,prog:{current:()=>bees.length,max:MAX_BEES}},
{key:'deer',name:'DEER',sym:SPR.deer.l[0],col:COL.deerAmber,prog:{current:()=>cntDeer(),max:MAX_DEER}},
]};
const TASKS=[
{id:'plant3',text:'Plant 3 seeds in the ground',check:()=>totalSP>=3},
{id:'bush10',text:'Grow 3 bushes',check:()=>cntB()>=3},
{id:'tree1',text:'Grow your first tree',check:()=>cntT()>=1},
{id:'tree20',text:'Fill the forest with 6 trees',check:()=>cntT()>=6},
{id:'chop1',text:'Transform the landscape',check:()=>disc['river']===true},
{id:'reed1',text:'Clear the aquatic vegetation',check:()=>disc['reedCleared']===true},
{id:'frog1',text:'Find a hidden creature',check:()=>disc['frog']===true},
{id:'flower1',text:'Discover something that blooms',check:()=>disc['flower']===true},
{id:'bee1',text:'Attract a pollinator',check:()=>disc['bee']===true},
{id:'deer1',text:'Gather the herd',check:()=>cntDeer()>=MAX_DEER},
{id:'fire1',text:'Extinguish the wildfire',check:()=>disc['fireOut']===true},
];
let tasksDone=new Set();
for(let y=0;y<GH;y++){grid[y]=[];for(let x=0;x<GW;x++)grid[y][x]='empty';}
for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.abs(dx)+Math.abs(dy)<=3)grid[CY+dy][CX+dx]='altar';
// The canvas backing store follows the display density (capped at 2x so a 3x
// phone does not pay for 9x the pixels); every drawing coordinate in the game
// stays in CSS pixels because render() installs DPR as the base transform.
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  VW=innerWidth;VH=innerHeight;
  C.width=Math.round(VW*DPR);C.height=Math.round(VH*DPR);
  C.style.width=VW+'px';C.style.height=VH+'px';
  resetFontState();
}
addEventListener('resize',resize);resize();

// Noise
const gV=[],gD=[];
for(let y=0;y<GH;y++){gV[y]=[];gD[y]=[];for(let x=0;x<GW;x++){gV[y][x]=Math.random();gD[y][x]=Math.random();}}


// Grass is derived from gV/gD, which never change — bake the glyph and a
// quantised colour bucket once so render() only does array reads, and so the
// terrain pass can set fillStyle GRASS_STEPS times instead of once per tile.
const GRASS_STEPS=24,GRASS_COLS=[],gCh=new Array(GW*GH),gCI=new Uint8Array(GW*GH),gBuf=[];
for(let i=0;i<GRASS_STEPS;i++){GRASS_COLS.push(`rgba(48,170,48,${(0.2+i*(0.2/(GRASS_STEPS-1))).toFixed(4)})`);gBuf.push([]);}
for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
  const i=y*GW+x,v=gV[y][x],d=gD[y][x],ch=SYM.grass[Math.floor(v*SYM.grass.length)];
  gCh[i]=ch===' '?null:ch;
  gCI[i]=Math.min(GRASS_STEPS-1,Math.round((v*0.15+d*0.05)/0.2*(GRASS_STEPS-1)));
}

// Cached DOM handles — these nodes are read or written every frame.
const EL={};
for(const id of['discovery-banner','task-bubble','day-counter','clock-canvas','gallery-badge','settings-badge','border-flash','pause-btn','gallery-modal','gallery-content','debug-panel','settings-panel','hint-strip','hint-text','gallery-btn','settings-btn','debug-btn','gameover-overlay'])EL[id]=document.getElementById(id);
const clockCtx=EL['clock-canvas']?EL['clock-canvas'].getContext('2d'):null;
