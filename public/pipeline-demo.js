/**
 * pipeline-demo.js  –  Live Demo CI/CD Pipeline Animation Engine
 * Pure SVG + CSS animations. No external dependencies.
 * Exposes: window.PipelineDemo.open(runData)  /  .close()
 */
(() => {
  /* ── Node definitions ─────────────────────────────────────────────── */
  const NODES = [
    { id:'developer', label:'Developer',       icon:'👨‍💻', sub:'git push',          x:30,  y:248, w:128, h:64 },
    { id:'github',    label:'GitHub Repo',     icon:'🐙', sub:'Source Control',    x:210, y:248, w:128, h:64 },
    { id:'actions',   label:'GitHub Actions',  icon:'⚡', sub:'CI Orchestrator',   x:390, y:248, w:138, h:64 },
    { id:'lint',      label:'Lint',            icon:'🔍', sub:'ESLint Check',      x:586, y:120, w:108, h:58 },
    { id:'test',      label:'Test',            icon:'🧪', sub:'Jest + Supertest',  x:586, y:218, w:108, h:58 },
    { id:'build',     label:'Build',           icon:'🏗️', sub:'npm run build',     x:586, y:316, w:108, h:58 },
    { id:'docker',    label:'Docker Build',    icon:'🐳', sub:'Image Compile',     x:756, y:248, w:130, h:64 },
    { id:'dockerhub', label:'Docker Hub',      icon:'📦', sub:'Registry Push',     x:940, y:248, w:130, h:64 },
    { id:'render',    label:'Render Deploy',   icon:'🚀', sub:'Rolling Release',   x:1124,y:248, w:130, h:64 },
    { id:'live',      label:'Live App',        icon:'🌐', sub:'Production Ready',  x:1308,y:248, w:138, h:64 },
  ];

  const EDGES = [
    { id:'e1',  from:'developer', to:'github'    },
    { id:'e2',  from:'github',    to:'actions'   },
    { id:'e3',  from:'actions',   to:'lint'      },
    { id:'e4',  from:'actions',   to:'test'      },
    { id:'e5',  from:'actions',   to:'build'     },
    { id:'e6',  from:'lint',      to:'docker'    },
    { id:'e7',  from:'test',      to:'docker'    },
    { id:'e8',  from:'build',     to:'docker'    },
    { id:'e9',  from:'docker',    to:'dockerhub' },
    { id:'e10', from:'dockerhub', to:'render'    },
    { id:'e11', from:'render',    to:'live'       },
  ];

  // Each step: which nodes go to "running", which edges animate
  const SEQUENCE = [
    { activate:['developer'],             edges:[],              dur:1100 },
    { activate:['github'],                edges:['e1'],          dur:1100 },
    { activate:['actions'],               edges:['e2'],          dur:900  },
    { activate:['lint','test','build'],   edges:['e3','e4','e5'],dur:1700 },
    { activate:['docker'],                edges:['e6','e7','e8'],dur:1400 },
    { activate:['dockerhub'],             edges:['e9'],          dur:1100 },
    { activate:['render'],                edges:['e10'],         dur:1300 },
    { activate:['live'],                  edges:['e11'],         dur:1100 },
  ];

  /* ── State ────────────────────────────────────────────────────────── */
  let nodeStates={}, edgeStates={};
  let currentStep=0, paused=false;
  let stepTimer=null, loopTimer=null;
  let latestRun=null;
  let modal=null, svgEl=null, infoPanel=null;

  /* ── Helpers ──────────────────────────────────────────────────────── */
  const getNode = id => NODES.find(n=>n.id===id);

  function port(node, side){
    const cx=node.x+node.w/2, cy=node.y+node.h/2;
    if(side==='right') return {x:node.x+node.w, y:cy};
    if(side==='left')  return {x:node.x,         y:cy};
    if(side==='top')   return {x:cx,              y:node.y};
    return {x:cx, y:node.y+node.h};
  }

  function edgePath(e){
    const f=getNode(e.from), t=getNode(e.to);
    const fanOut=['e3','e4','e5'].includes(e.id);
    const fanIn =['e6','e7','e8'].includes(e.id);
    const s=port(f,'right'), d=port(t,'left');
    const m = fanOut ? 0.4 : fanIn ? 0.6 : 0.5;
    const cx1=s.x+(d.x-s.x)*m, cx2=d.x-(d.x-s.x)*m;
    return `M${s.x},${s.y} C${cx1},${s.y} ${cx2},${d.y} ${d.x},${d.y}`;
  }

  /* ── SVG build ────────────────────────────────────────────────────── */
  function buildSVG(){
    const W=1500, H=430;
    svgEl.setAttribute('viewBox',`0 0 ${W} ${H}`);
    svgEl.setAttribute('width','100%');
    svgEl.setAttribute('height','100%');
    svgEl.innerHTML=`
      <defs>
        <marker id="arr"  markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3z" fill="#334155"/></marker>
        <marker id="arra" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3z" fill="#818cf8"/></marker>
        <marker id="arrs" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3z" fill="#34d399"/></marker>
        <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#080e1a"/>
          <stop offset="100%" stop-color="#0d1526"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg-grad)" rx="14"/>
      ${grid(W,H)}
      <g id="elayer"></g>
      <g id="nlayer"></g>`;
    renderEdges(); renderNodes();
  }

  function grid(w,h){
    let s='';
    for(let x=30;x<w;x+=32) for(let y=30;y<h;y+=32)
      s+=`<circle cx="${x}" cy="${y}" r="1" fill="#0f172a"/>`;
    return s;
  }

  function renderEdges(){
    const el=svgEl.querySelector('#elayer');
    el.innerHTML='';
    EDGES.forEach(e=>{
      const st=edgeStates[e.id]||'idle';
      const active=st==='active', success=st==='success';
      const stroke = success?'#34d399': active?'#818cf8':'#1e293b';
      const marker = success?'arrs'  : active?'arra'   :'arr';
      const sw     = (active||success)?2.5:1.2;
      const p=document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('id',`ep-${e.id}`);
      p.setAttribute('d', edgePath(e));
      p.setAttribute('fill','none');
      p.setAttribute('stroke', stroke);
      p.setAttribute('stroke-width', sw);
      p.setAttribute('stroke-linecap','round');
      p.setAttribute('marker-end',`url(#${marker})`);
      if(active){
        p.setAttribute('stroke-dasharray','7 4');
        p.style.animation='eDash .6s linear infinite';
        p.style.filter=`drop-shadow(0 0 4px rgba(129,140,248,.7))`;
      } else if(success){
        p.style.filter=`drop-shadow(0 0 3px rgba(52,211,153,.5))`;
      }
      el.appendChild(p);
    });
  }

  const STATE_COLORS={
    waiting:{ border:'#1e293b', bg:'#070d18', lbl:'#475569', sub:'#334155', glow:'none' },
    running:{ border:'#6366f1', bg:'#13104a', lbl:'#c7d2fe', sub:'#818cf8', glow:'drop-shadow(0 0 10px rgba(99,102,241,.9))' },
    success:{ border:'#10b981', bg:'#011c14', lbl:'#6ee7b7', sub:'#34d399', glow:'drop-shadow(0 0 8px rgba(16,185,129,.7))' },
    failure:{ border:'#f43f5e', bg:'#1a000d', lbl:'#fda4af', sub:'#fb7185', glow:'drop-shadow(0 0 8px rgba(244,63,94,.7))' },
  };

  function renderNodes(){
    const nl=svgEl.querySelector('#nlayer');
    nl.innerHTML='';
    NODES.forEach(n=>{
      const st=nodeStates[n.id]||'waiting';
      const c=STATE_COLORS[st];
      const g=document.createElementNS('http://www.w3.org/2000/svg','g');
      g.setAttribute('id',`np-${n.id}`);

      // glow ring
      if(st!=='waiting'){
        const ring=document.createElementNS('http://www.w3.org/2000/svg','rect');
        ring.setAttribute('x',n.x-4); ring.setAttribute('y',n.y-4);
        ring.setAttribute('width',n.w+8); ring.setAttribute('height',n.h+8);
        ring.setAttribute('rx','14'); ring.setAttribute('fill','none');
        ring.setAttribute('stroke',c.border); ring.setAttribute('stroke-width','1');
        ring.setAttribute('opacity','.25');
        g.appendChild(ring);
      }

      // main card
      const r=document.createElementNS('http://www.w3.org/2000/svg','rect');
      r.setAttribute('x',n.x); r.setAttribute('y',n.y);
      r.setAttribute('width',n.w); r.setAttribute('height',n.h);
      r.setAttribute('rx','10'); r.setAttribute('fill',c.bg);
      r.setAttribute('stroke',c.border); r.setAttribute('stroke-width',st==='waiting'?'1':'1.5');
      if(st!=='waiting') r.style.filter=c.glow;
      if(st==='running') r.setAttribute('class','ndPulse');
      g.appendChild(r);

      // icon
      const ic=document.createElementNS('http://www.w3.org/2000/svg','text');
      ic.setAttribute('x',n.x+14); ic.setAttribute('y',n.y+n.h/2+1);
      ic.setAttribute('dominant-baseline','middle'); ic.setAttribute('font-size','16');
      ic.textContent=n.icon;
      g.appendChild(ic);

      // label
      const lb=document.createElementNS('http://www.w3.org/2000/svg','text');
      lb.setAttribute('x',n.x+36); lb.setAttribute('y',n.y+20);
      lb.setAttribute('fill',st==='waiting'?'#94a3b8':c.lbl);
      lb.setAttribute('font-size','11'); lb.setAttribute('font-weight','600');
      lb.setAttribute('font-family','Inter,sans-serif');
      lb.textContent=n.label;
      g.appendChild(lb);

      // sublabel
      const sl=document.createElementNS('http://www.w3.org/2000/svg','text');
      sl.setAttribute('x',n.x+36); sl.setAttribute('y',n.y+36);
      sl.setAttribute('fill',c.sub); sl.setAttribute('font-size','8.5');
      sl.setAttribute('font-family','JetBrains Mono,monospace');
      sl.textContent=n.sub;
      g.appendChild(sl);

      // state badge
      if(st!=='waiting'){
        const badge={'running':'●','success':'✓','failure':'✕'}[st];
        const bel=document.createElementNS('http://www.w3.org/2000/svg','text');
        bel.setAttribute('x',n.x+n.w-13); bel.setAttribute('y',n.y+13);
        bel.setAttribute('fill',c.sub); bel.setAttribute('font-size','11');
        bel.setAttribute('font-family','Inter,sans-serif'); bel.setAttribute('font-weight','bold');
        bel.textContent=badge;
        if(st==='running') bel.setAttribute('class','bdPulse');
        g.appendChild(bel);
      }

      nl.appendChild(g);
    });
  }

  /* ── Info panel ───────────────────────────────────────────────────── */
  function updatePanel(step){
    if(!infoPanel) return;
    const r=latestRun;
    const stage=SEQUENCE[step]?.activate.join(' + ')||'Complete';
    const pct=Math.round(((step+1)/SEQUENCE.length)*100);
    infoPanel.innerHTML=`
      <div style="font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:#475569;font-weight:700;margin-bottom:10px;">📡 Live Run Telemetry</div>
      ${r?`
        <div class="ir"><span class="il">Run</span><span class="iv">#${r.run_number}</span></div>
        <div class="ir"><span class="il">Branch</span><span class="iv" style="background:rgba(99,102,241,.15);color:#a5b4fc;padding:1px 6px;border-radius:4px;font-size:10px">${r.head_branch}</span></div>
        <div class="ir"><span class="il">Trigger</span><span class="iv">${(r.event||'').replace('_',' ')}</span></div>
        <div class="ir"><span class="il">Commit</span><span class="iv" style="font-family:'JetBrains Mono',monospace;color:#818cf8">${(r.head_sha||'').substring(0,7)||'—'}</span></div>
        <div class="ir"><span class="il">Result</span><span class="iv" style="color:${r.conclusion==='success'?'#34d399':r.conclusion==='failure'?'#fb7185':'#818cf8'}">${r.conclusion||r.status||'—'}</span></div>
      `:`<div style="color:#334155;font-size:10px;margin-bottom:10px;">No live data available</div>`}
      <div style="border-top:1px solid #1e293b;margin:10px 0"></div>
      <div class="ir"><span class="il">Stage</span><span class="iv" style="color:#818cf8">${stage}</span></div>
      <div style="margin-top:8px">
        <div style="display:flex;justify-content:space-between;font-size:9px;color:#334155;margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em">
          <span>Progress</span><span>${pct}%</span>
        </div>
        <div style="background:#080e1a;border-radius:4px;height:5px;overflow:hidden">
          <div style="background:linear-gradient(90deg,#6366f1,#818cf8);height:100%;width:${pct}%;border-radius:4px;transition:width .5s ease"></div>
        </div>
      </div>`;
  }

  /* ── Animation step ───────────────────────────────────────────────── */
  function advanceStep(){
    if(paused) return;
    const step=SEQUENCE[currentStep];
    if(!step) return;

    // Finish previous
    if(currentStep>0){
      SEQUENCE[currentStep-1].activate.forEach(id=>{ nodeStates[id]='success'; });
      SEQUENCE[currentStep-1].edges.forEach(id=>{ edgeStates[id]='success'; });
    }

    // Start current
    step.activate.forEach(id=>{ nodeStates[id]='running'; });
    step.edges.forEach(id=>{ edgeStates[id]='active'; });

    renderEdges(); renderNodes(); updatePanel(currentStep);
    currentStep++;

    if(currentStep<SEQUENCE.length){
      stepTimer=setTimeout(advanceStep, step.dur);
    } else {
      stepTimer=setTimeout(()=>{
        SEQUENCE[currentStep-1].activate.forEach(id=>{ nodeStates[id]='success'; });
        SEQUENCE[currentStep-1].edges.forEach(id=>{ edgeStates[id]='success'; });
        renderEdges(); renderNodes(); updatePanel(currentStep-1);
        loopTimer=setTimeout(()=>{ if(!paused) restart(); }, 2800);
      }, step.dur);
    }
  }

  function restart(){
    clearTimeout(stepTimer); clearTimeout(loopTimer);
    currentStep=0; nodeStates={}; edgeStates={};
    renderEdges(); renderNodes(); updatePanel(0);
    advanceStep();
  }

  function stop(){
    clearTimeout(stepTimer); clearTimeout(loopTimer);
    stepTimer=null; loopTimer=null; paused=true;
  }

  /* ── Modal construction ───────────────────────────────────────────── */
  function buildModal(){
    modal=document.createElement('div');
    modal.id='pdm-root';
    modal.innerHTML=`
      <div id="pdm-bg"></div>
      <div id="pdm-box">
        <div id="pdm-hdr">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:8px;padding:5px 12px;font-size:13px;font-weight:700;letter-spacing:.05em;color:#fff">∞ LIVE DEMO</span>
            <span style="color:#64748b;font-size:12px;font-weight:500">CI/CD Pipeline Execution — Animated</span>
          </div>
          <div id="pdm-ctrl">
            <button id="pdm-pause"   class="pb ps">⏸ Pause</button>
            <button id="pdm-restart" class="pb ps">🔁 Restart</button>
            <button id="pdm-end"     class="pb pd">✕ End Demo</button>
          </div>
        </div>
        <div id="pdm-stage">
          <svg id="pdm-svg" xmlns="http://www.w3.org/2000/svg"></svg>
          <div id="pdm-panel"></div>
        </div>
        <div id="pdm-leg">
          <span class="li"><span class="ld ld-w"></span>Waiting</span>
          <span class="li"><span class="ld ld-r"></span>Running</span>
          <span class="li"><span class="ld ld-s"></span>Success</span>
          <span class="li"><span class="ld ld-f"></span>Failure</span>
          <span style="flex:1"></span>
          <span style="color:#334155;font-size:10px">Auto-loops · Telemetry from GitHub Actions API</span>
        </div>
      </div>`;
    document.body.appendChild(modal);

    svgEl     = modal.querySelector('#pdm-svg');
    infoPanel = modal.querySelector('#pdm-panel');

    modal.querySelector('#pdm-pause').addEventListener('click',()=>{
      if(paused){
        paused=false;
        modal.querySelector('#pdm-pause').innerHTML='⏸ Pause';
        advanceStep();
      } else {
        paused=true;
        clearTimeout(stepTimer); clearTimeout(loopTimer);
        modal.querySelector('#pdm-pause').innerHTML='▶ Resume';
      }
    });
    modal.querySelector('#pdm-restart').addEventListener('click',()=>{
      paused=false;
      modal.querySelector('#pdm-pause').innerHTML='⏸ Pause';
      restart();
    });
    modal.querySelector('#pdm-end').addEventListener('click', closeDemo);
    modal.querySelector('#pdm-bg').addEventListener('click',  closeDemo);

    injectStyles();
  }

  function closeDemo(){
    stop();
    if(modal){ modal.remove(); modal=null; svgEl=null; infoPanel=null; }
    document.body.style.overflow='';
  }

  /* ── CSS ──────────────────────────────────────────────────────────── */
  function injectStyles(){
    if(document.getElementById('pdm-css')) return;
    const s=document.createElement('style');
    s.id='pdm-css';
    s.textContent=`
@keyframes eDash  { to{stroke-dashoffset:-22} }
@keyframes ndPulse{ 0%,100%{opacity:1}50%{opacity:.55} }
@keyframes bdPulse{ 0%,100%{transform:scale(1)}50%{transform:scale(1.35)} }
@keyframes pdmIn  { from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)} }

.ndPulse{animation:ndPulse 1s ease-in-out infinite}
.bdPulse{animation:bdPulse .8s ease-in-out infinite;transform-origin:center}

#pdm-root{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center}
#pdm-bg  {position:absolute;inset:0;background:rgba(2,6,23,.93);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
#pdm-box {
  position:relative;z-index:1;
  width:95vw;max-width:1580px;max-height:93vh;
  background:#080e1a;
  border:1px solid #1e293b;border-radius:20px;
  box-shadow:0 0 0 1px rgba(99,102,241,.18),0 40px 80px rgba(0,0,0,.75),0 0 100px rgba(99,102,241,.06);
  display:flex;flex-direction:column;overflow:hidden;
  animation:pdmIn .3s cubic-bezier(.16,1,.3,1);
}
#pdm-hdr{
  display:flex;align-items:center;justify-content:space-between;
  padding:13px 20px;border-bottom:1px solid #0f172a;
  background:rgba(8,14,26,.85);flex-shrink:0;
}
#pdm-ctrl{display:flex;gap:8px;align-items:center}
.pb{
  border:none;cursor:pointer;font-size:12px;font-weight:600;
  font-family:'Inter',sans-serif;padding:6px 14px;border-radius:8px;
  transition:all .15s ease;letter-spacing:.03em;
}
.ps{background:rgba(99,102,241,.1);color:#a5b4fc;border:1px solid rgba(99,102,241,.22)}
.ps:hover{background:rgba(99,102,241,.2);color:#c7d2fe}
.pd{background:rgba(244,63,94,.1);color:#fda4af;border:1px solid rgba(244,63,94,.22)}
.pd:hover{background:rgba(244,63,94,.2);color:#fecdd3}
#pdm-stage{
  position:relative;flex:1;min-height:0;
  padding:12px 16px;display:flex;align-items:center;justify-content:center;overflow:hidden;
}
#pdm-svg{width:100%;height:100%;object-fit:contain;max-height:420px}
#pdm-panel{
  position:absolute;top:14px;right:18px;width:205px;
  background:rgba(8,14,26,.97);border:1px solid #1e293b;border-radius:12px;
  padding:14px;font-family:'Inter',sans-serif;font-size:11px;color:#64748b;
  box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 0 1px rgba(99,102,241,.08);
  backdrop-filter:blur(8px);
}
.ir{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;gap:6px}
.il{color:#334155;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;font-weight:600;flex-shrink:0}
.iv{color:#94a3b8;font-size:11px;text-align:right;word-break:break-all}
#pdm-leg{
  display:flex;align-items:center;gap:18px;padding:9px 20px;
  border-top:1px solid #0f172a;background:rgba(8,14,26,.7);
  flex-shrink:0;font-size:11px;color:#475569;
}
.li{display:flex;align-items:center;gap:6px;font-weight:500}
.ld{width:10px;height:10px;border-radius:50%;display:inline-block}
.ld-w{background:#1e293b}
.ld-r{background:#6366f1;box-shadow:0 0 6px rgba(99,102,241,.9)}
.ld-s{background:#10b981;box-shadow:0 0 6px rgba(16,185,129,.8)}
.ld-f{background:#f43f5e;box-shadow:0 0 6px rgba(244,63,94,.8)}
    `;
    document.head.appendChild(s);
  }

  /* ── Public API ───────────────────────────────────────────────────── */
  window.PipelineDemo={
    open(runData){
      if(document.getElementById('pdm-root')) return;
      latestRun   = runData||null;
      paused      = false;
      currentStep = 0;
      nodeStates  = {};
      edgeStates  = {};
      document.body.style.overflow='hidden';
      buildModal();
      buildSVG();
      updatePanel(0);
      setTimeout(()=>advanceStep(), 350);
    },
    close: closeDemo,
  };
})();
