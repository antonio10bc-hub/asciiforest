// === IDLE HINTS ===
// While the player is still on the first two tasks and has gone quiet for a
// few seconds, the bottom-left cluster starts talking: the log button breathes
// and a strip next to it cycles one short, state-aware line at a time. Anything
// the player does — a tap, a pan, opening the log — clears it instantly.
//
// This is deliberately separate from updTut(): the tutorial fires once for a
// first-time player and points at the world, these prompts recur for anyone who
// stalls and point at the UI. They never run at the same time.
const HINT_IDLE=4.5;   // seconds of silence before the strip fades in
const HINT_CYCLE=5;    // seconds each line stays up

// The first two tasks are 'plant3' and 'bush10'; once bushes are in, the player
// has the loop and the prompts retire for good.
function inEarlyTasks(){return !tasksDone.has(TASKS[1].id);}

function hintLines(){
  const l=[];
  if(sel&&sel.type==='aS')l.push('now tap bare ground to plant it');
  else if(altarSeed)l.push('tap the ✦ above the altar to take a seed');
  else if(totalSIG()<MAX_SEEDS)l.push('the altar is growing another seed…');
  if(!tasksDone.has(TASKS[0].id)){
    if(totalSP>0)l.push('plant '+(3-totalSP)+' more to stir something awake');
    l.push('tap ▣ LOG to read your task');
  }else{
    l.push('red birds carry seeds — bushes follow');
    l.push('tap ▣ LOG to read your task');
  }
  l.push('drag to look around · scroll to zoom');
  return l;
}

let hintT=0,hintI=0,hintOn=false,hintPulse=false,hintMsg='';
function updHints(dt){
  const strip=EL['hint-strip'],btn=document.getElementById('gallery-btn');
  if(!strip||!btn)return;
  const idle=!gameOver&&!galOpen&&inEarlyTasks()&&idleSince>=HINT_IDLE;
  // The scripted tutorial owns the screen while it is up. Its last step already
  // points at the log button, so there the button still pulses — it just does
  // not get a second line of text saying the same thing.
  const tutOnLog=!!tutPos&&tutPos.type==='screenRight';
  const wantPulse=idle&&(!tutPos||tutOnLog);
  // taskBT gates the completion bubble, which shares this corner.
  const wantStrip=idle&&!tutPos&&taskBT<=0;

  if(wantPulse!==hintPulse){hintPulse=wantPulse;btn.classList.toggle('idle-cta',wantPulse);}
  if(!wantStrip){
    if(hintOn){hintOn=false;strip.classList.remove('show');}
    return;
  }
  if(!hintOn){hintOn=true;hintT=HINT_CYCLE;strip.classList.add('show');}
  hintT+=dt;
  if(hintT>=HINT_CYCLE){
    hintT=0;
    const lines=hintLines(),msg=lines[hintI++%lines.length];
    if(msg!==hintMsg){hintMsg=msg;EL['hint-text'].textContent=msg;}
  }
}
function resetHints(){
  hintT=0;hintI=0;hintOn=false;hintPulse=false;hintMsg='';
  const strip=EL['hint-strip'],btn=document.getElementById('gallery-btn');
  if(strip){strip.classList.remove('show');EL['hint-text'].textContent='';}
  if(btn)btn.classList.remove('idle-cta');
}
