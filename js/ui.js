// === GALLERY ===
function openGal(){galOpen=true;idleSince=0;badgeSeenCount=tasksDone.size;EL['gallery-modal'].classList.add('open');EL['gallery-badge'].classList.remove('show');renderPage();}
function closeGal(){galOpen=false;EL['gallery-modal'].classList.remove('open');}
EL['gallery-btn'].addEventListener('click',()=>{initAudio();openGal();});
document.getElementById('gallery-backdrop').addEventListener('click',closeGal);
document.getElementById('gallery-close').addEventListener('click',closeGal);
document.querySelectorAll('.gallery-tab').forEach(t=>{t.addEventListener('click',()=>{galPage=t.dataset.page;document.querySelectorAll('.gallery-tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');renderPage();});});

function progBar(cur,max){if(!max||max<=0)return'[░░░░░░░░░░]';const w=10,f=Math.max(0,Math.min(w,Math.round(cur/max*w))),e=w-f;return'['+('█'.repeat(f))+('░'.repeat(e))+']';}

function renderPage(){const cont=EL['gallery-content'];
if(galPage==='tasks'){const pending=TASKS.filter(t=>!tasksDone.has(t.id)),done=TASKS.filter(t=>tasksDone.has(t.id));let h='';h+=`<div class="gal-count">${done.length} / ${TASKS.length} COMPLETE</div>`;
if(pending.length>0){const cur=pending[0];h+=`<div class="task-item current"><span class="task-check">&gt;</span><span class="task-text">${cur.text}</span></div>`;}
else h+=`<div class="task-item current"><span class="task-check">&gt;</span><span class="task-text">The grove is whole. Tend it.</span></div>`;if(done.length>0)h+=`<div class="task-sep">── COMPLETED ──</div>`;for(const t of done)h+=`<div class="task-item done"><span class="task-check">[✓]</span><span class="task-text">${t.text}</span></div>`;cont.innerHTML=h;return;}
const entries=GAL[galPage]||[];let found=0;for(const e of entries)if(disc[e.key])found++;
let h=`<div class="gal-count">${found} / ${entries.length} RECORDED</div><div id="gallery-grid">`;
for(const e of entries){const u=!!disc[e.key],prog=e.prog;
h+=`<div class="gallery-cell ${u?'':'locked'}"><div class="glyph" style="color:${u?e.col:'#0a3a0a'}">${u?e.sym:'?'}</div><div class="gallery-name">${u?e.name:'???'}</div>`;
if(u&&prog){const cur=prog.current(),mx=prog.max;h+=`<div class="gallery-counter">${cur}/${mx}</div><div class="prog-bar">${progBar(cur,mx)}</div>`;}h+=`</div>`;}
h+='</div>';cont.innerHTML=h;}


// === SETTINGS PANEL ===
let stgOpen=false;
EL['settings-btn'].addEventListener('click',()=>{
  stgOpen=!stgOpen;EL['settings-panel'].classList.toggle('open',stgOpen);
  if(stgOpen)EL['settings-badge'].classList.remove('show');
});
// The sliders read their starting position from the globals rather than from the
// markup, so a default can be changed in one place without the two drifting.
function bindVol(id,get,set){
  const el=document.getElementById(id),out=document.getElementById(id+'-val');
  const show=v=>{if(out)out.textContent=Math.round(v*100);};
  el.value=Math.round(get()*100);show(get());
  el.addEventListener('input',e=>{set(e.target.value/100);show(get());});
}
bindVol('vol-music',()=>volMusic,v=>{volMusic=v;updVol();});
bindVol('vol-sfx',()=>volSFX,v=>{volSFX=v;});

EL['pause-btn'].addEventListener('click',()=>{initAudio();togglePause();});
document.getElementById('go-restart').addEventListener('click',restartGame);

// role="button" nodes are divs, so they need Enter/Space wired up by hand.
document.querySelectorAll('[role=button]').forEach(el=>el.addEventListener('keydown',e=>{
  if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}
}));
// Esc closes whatever is open, innermost first.
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(galOpen){closeGal();return;}
  if(stgOpen){stgOpen=false;EL['settings-panel'].classList.remove('open');}
});
