// === GALLERY ===
function openGal(){galOpen=true;idleSince=0;badgeSeenCount=tasksDone.size;document.getElementById('gallery-modal').classList.add('open');document.getElementById('gallery-badge').classList.remove('show');renderPage();}
function closeGal(){galOpen=false;document.getElementById('gallery-modal').classList.remove('open');}
document.getElementById('gallery-btn').addEventListener('click',()=>{initAudio();openGal();});
document.getElementById('gallery-backdrop').addEventListener('click',closeGal);
document.getElementById('gallery-close').addEventListener('click',closeGal);
document.querySelectorAll('.gallery-tab').forEach(t=>{t.addEventListener('click',()=>{galPage=t.dataset.page;document.querySelectorAll('.gallery-tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');renderPage();});});

function progBar(cur,max){if(!max||max<=0)return'[░░░░░░░░░░]';const w=10,f=Math.max(0,Math.min(w,Math.round(cur/max*w))),e=w-f;return'['+('█'.repeat(f))+('░'.repeat(e))+']';}

function renderPage(){const cont=document.getElementById('gallery-content');
if(galPage==='tasks'){const pending=TASKS.filter(t=>!tasksDone.has(t.id)),done=TASKS.filter(t=>tasksDone.has(t.id));let h='';if(pending.length>0){const cur=pending[0];h+=`<div class="task-item" style="color:#50ff50;text-shadow:0 0 6px #30ff50"><span class="task-check">> </span><span class="task-text">${cur.text}</span></div>`;}if(done.length>0)h+=`<div style="font-size:12px;color:#1a5a1a;margin:8px 0 4px;letter-spacing:1px;">── COMPLETED ──</div>`;for(const t of done)h+=`<div class="task-item done"><span class="task-check">[✓]</span><span class="task-text">${t.text}</span></div>`;cont.innerHTML=h;return;}
const entries=GAL[galPage]||[];let h='<div id="gallery-grid">';
for(const e of entries){const u=!!disc[e.key],prog=e.prog;
h+=`<div class="gallery-cell ${u?'':'locked'}"><div class="glyph" style="color:${u?e.col:'#0a3a0a'}">${u?e.sym:'?'}</div><div class="gallery-name">${u?e.name:'???'}</div>`;
if(u&&prog){const cur=prog.current(),mx=prog.max;h+=`<div class="gallery-counter">${cur}/${mx}</div><div class="prog-bar">${progBar(cur,mx)}</div>`;}h+=`</div>`;}
for(let i=entries.length;i<15;i++)h+=`<div class="gallery-cell locked"><div class="glyph" style="color:#0a3a0a">?</div><div class="gallery-name">???</div></div>`;
h+='</div>';cont.innerHTML=h;}

