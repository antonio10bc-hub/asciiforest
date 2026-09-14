const goFireChars=['▲','♦','▴','*','▲','♦','▴'];
const goFireColors=['#ff2010','#ff8020','#ffcc10','#ff6020','#ff4010'];
function updGOFlames(){
  if(!gameOver)return;
  const now=performance.now()/1000;
  const els=[document.getElementById('go-flames-top'),document.getElementById('go-flames-bot')];
  for(const el of els){
    if(!el)continue;
    let h='';
    for(let i=0;i<7;i++){
      const ci=Math.floor(now*6+i*1.3)%goFireChars.length;
      const co=Math.floor(now*4+i*0.9)%goFireColors.length;
      const bob=Math.sin(now*8+i*1.7)*2;
      h+=`<span style="color:${goFireColors[co]};text-shadow:0 0 10px ${goFireColors[co]};position:relative;top:${bob}px">${goFireChars[ci]}</span> `;
    }
    el.innerHTML=h;
  }
}

let lastT=performance.now();
function loop(now){const dt=Math.min((now-lastT)/1000,0.1);lastT=now;update(dt);render();updGOFlames();
  // Idle prompts run on wall-clock time so they neither freeze on pause nor
  // race ahead at x10.
  idleSince+=dt;updHints(dt);
  requestAnimationFrame(loop);}
cam.x=CX*T-VW/(2*cam.z);cam.y=CY*T-VH/(2*cam.z);
requestAnimationFrame(loop);
