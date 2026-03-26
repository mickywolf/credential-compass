// ── STATE ───────────────────────────────────────────
let qa={q1:'',q2:[],q3:'',q4:'',q5:[]},qStep=1,qDone=false;
let fS='',fC='',fCost='',f5w=false,fCCL=false,fNoReq=false,fTop=false,vMode='skim';
let expanded=new Set(),shortlist=new Set(),compare=new Set();

// ── INIT ────────────────────────────────────────────
function init(){
  loadStore();
  const clusters=[...new Set(DATA.map(d=>pC(d.cluster)).filter(Boolean))].sort();
  const sel=document.getElementById('clFil');
  clusters.forEach(c=>{sel.innerHTML+=`<option value="${c}">${c}</option>`});
  document.getElementById('srchIn').addEventListener('input',e=>{fS=e.target.value.toLowerCase();render()});
  document.getElementById('clFil').addEventListener('change',e=>{fC=e.target.value;render()});
  document.getElementById('costFil').addEventListener('change',e=>{fCost=e.target.value;render()});
  updateBadge();
  const p=new URLSearchParams(location.search);
  if(p.get('sl')){try{JSON.parse(atob(p.get('sl'))).forEach(id=>shortlist.add(id));saveStore();updateBadge();showV('sl');return}catch(e){}}
  const saved=localStorage.getItem('cc_quiz');
  if(saved){try{qa=JSON.parse(saved);qDone=true;showV('exp');render();return}catch(e){}}
  updateQ();
}

// ── VIEWS ───────────────────────────────────────────
function showV(v){
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('on'));
  document.getElementById('v'+v).classList.add('on');
  document.querySelectorAll('.nav-link').forEach(b=>b.classList.remove('on'));
  const nb=document.getElementById('nav-'+(v==='quiz'?'exp':v));
  if(nb)nb.classList.add('on');
  if(v==='exp')render();
  if(v==='sl')renderSL();
  window.scrollTo({top:0,behavior:'smooth'});
}

function scrollToQuiz(){
  document.getElementById('quizAnchor').scrollIntoView({behavior:'smooth'});
}

// ── QUIZ ────────────────────────────────────────────
function selO(el,k){
  el.closest('.q-opts').querySelectorAll('.q-opt').forEach(o=>o.classList.remove('sel'));
  el.classList.add('sel');qa[k]=el.dataset.v;
  document.getElementById('qNext').disabled=false;
}
function selM(el,k,max){
  const already=el.classList.contains('sel');
  if(already){el.classList.remove('sel');qa[k]=(qa[k]||[]).filter(v=>v!==el.dataset.v)}
  else{
    const cur=el.closest('.q-opts').querySelectorAll('.q-opt.sel');
    if(max&&cur.length>=max)return;
    el.classList.add('sel');
    if(!Array.isArray(qa[k]))qa[k]=[];
    qa[k].push(el.dataset.v);
  }
}
function updateQ(){
  document.querySelectorAll('.quiz-step').forEach(s=>s.classList.remove('on'));
  const s=document.getElementById('qs'+qStep);if(s)s.classList.add('on');
  document.getElementById('qBar').style.width=((qStep-1)/5*100)+'%';
  document.getElementById('qBack').style.visibility=qStep>1?'visible':'hidden';
  const single=['q1','q3','q4'].includes('q'+qStep);
  document.getElementById('qNext').disabled=single&&!qa['q'+qStep];
}
function qNext(){if(qStep<5){qStep++;updateQ()}else finQ()}
function qPrev(){if(qStep>1){qStep--;updateQ()}}
function qSkip(){if(qStep<5){qStep++;updateQ()}else finQ()}
function finQ(){
  qDone=true;localStorage.setItem('cc_quiz',JSON.stringify(qa));
  document.getElementById('qBar').style.width='100%';
  showV('exp');render();
}
function retake(){
  qa={q1:'',q2:[],q3:'',q4:'',q5:[]};qStep=1;qDone=false;
  localStorage.removeItem('cc_quiz');
  document.querySelectorAll('.q-opt').forEach(o=>o.classList.remove('sel'));
  updateQ();
  showV('quiz');
}

// ── SCORE ───────────────────────────────────────────
function score(d){
  if(!qDone)return null;
  let s=0,a=qa;
  if(a.q2&&a.q2.length)a.q2.forEach(c=>{if(d.cluster&&d.cluster.includes(c))s+=3});
  if(a.q3==='summer'&&d.under5weeks==='Yes')s+=3;
  else if(a.q3==='semester'||a.q3==='yearlong')s+=1;
  const c=costN(d.cost);
  if(a.q4==='free'&&(!c||c<=50))s+=2;
  else if(a.q4==='low'&&c&&c<=150)s+=2;
  else if(a.q4==='mid'&&c&&c<=400)s+=1;
  if(a.q5&&a.q5.includes('ccl')&&d.cclModule==='Yes')s+=4;
  if(a.q5&&a.q5.includes('fast')&&d.under5weeks==='Yes')s+=3;
  if(a.q5&&a.q5.includes('careers')&&d.careerPaths)s+=2;
  if(a.q5&&a.q5.includes('expert')&&d.cclExpert)s+=3;
  return s;
}
function sLbl(s){
  if(s===null)return null;
  if(s>=12)return{label:'Excellent match',tCls:'t-fit-o',pCls:'fhi',stars:'★★★★★'};
  if(s>=8) return{label:'Strong match',  tCls:'t-fit-o',pCls:'fhi',stars:'★★★★'};
  if(s>=5) return{label:'Good match',    tCls:'t-fit-p',pCls:'fmd',stars:'★★★'};
  if(s>=2) return{label:'Possible match',tCls:'t-gray', pCls:'flo',stars:'★★'};
  if(s>=1) return{label:'Weak match',    tCls:'t-gray', pCls:'flo',stars:'★'};
  return null;
}

// ── STATUS META ─────────────────────────────────────
// The colored dot in Peruse view — color and tooltip explain the credential's highlight feature
function stMeta(d){
  if(d.cclModule==='Yes')return{color:'var(--o)',  tip:'CCL Playbook Module available',icon:'🧭'};
  if(d.cclExpert)        return{color:'var(--p)',  tip:'CCL Playbook Expert: '+d.cclExpert,icon:'👤'};
  if(d.under5weeks==='Yes')return{color:'var(--b-dark)',tip:'Completable in under 5 weeks',icon:'⚡'};
  return{color:'var(--ink-4)',tip:'MSDE Approved credential',icon:''};
}

// ── FILTER ──────────────────────────────────────────
function getItems(){
  let items=DATA.map(d=>({...d,_s:score(d)}));
  if(fS)items=items.filter(d=>
    (d.name||'').toLowerCase().includes(fS)||
    (d.issuer||'').toLowerCase().includes(fS)||
    (d.cluster||'').toLowerCase().includes(fS)||
    (d.code||'').toLowerCase().includes(fS)||
    (d.oneLiner||'').toLowerCase().includes(fS)||
    (d.careerPaths||'').toLowerCase().includes(fS)
  );
  if(fC)items=items.filter(d=>d.cluster&&d.cluster.includes(fC));
  if(f5w)items=items.filter(d=>d.under5weeks==='Yes');
  if(fCCL)items=items.filter(d=>d.cclModule==='Yes');
  if(fCost){
    items=items.filter(d=>{
      const c=costN(d.cost);
      if(fCost==='free')return !c||c<=50;
      if(fCost==='low')return c!==null&&c<=150;
      if(fCost==='mid')return c!==null&&c<=400;
      return true;
    });
  }
  if(fNoReq)items=items.filter(d=>!d.prereqs);
  if(fTop&&qDone)items=items.filter(d=>(d._s||0)>=8);
  if(qDone)items.sort((a,b)=>(b._s||0)-(a._s||0)||(a.name||'').localeCompare(b.name||''));
  else items.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  return items;
}

// ── RENDER ──────────────────────────────────────────
function render(){
  const items=getItems();
  document.getElementById('exCount').textContent=items.length;
  document.getElementById('rInfo').textContent=`${items.length} credential${items.length!==1?'s':''}`;

  const pe=document.getElementById('qPills');pe.innerHTML='';
  if(qDone){
    const a=qa;
    if(a.q2&&a.q2.length)a.q2.forEach(c=>pe.innerHTML+=`<span class="qpill p-o">${clE(c)} ${c}<button class="qpill-x" onclick="rmF('q2','${c}')">×</button></span>`);
    if(a.q3&&a.q3!=='any')pe.innerHTML+=`<span class="qpill p-b">🕐 ${{summer:'Summer≤5wk',semester:'Semester',yearlong:'Year-long'}[a.q3]}<button class="qpill-x" onclick="rmF('q3')">×</button></span>`;
    if(a.q4&&a.q4!=='any')pe.innerHTML+=`<span class="qpill p-p">💰 ${{free:'Free',low:'&lt;$150',mid:'$150–$400'}[a.q4]}<button class="qpill-x" onclick="rmF('q4')">×</button></span>`;
    const q5L={ccl:'🧭 CCL Module',fast:'⚡ Quick cert',careers:'📈 Career paths',expert:'🏢 Expert org'};
    if(a.q5&&a.q5.length)a.q5.forEach(p=>pe.innerHTML+=`<span class="qpill p-o">${q5L[p]||p}<button class="qpill-x" onclick="rmF('q5','${p}')">×</button></span>`);
    const excellent=items.filter(d=>(d._s||0)>=12).length;
    const strong=items.filter(d=>(d._s||0)>=8).length;
    const topBtn=document.getElementById('pTop');
    if(topBtn)topBtn.style.display='';
    document.getElementById('fitTxt').textContent=
      excellent>0?`${excellent} excellent + ${strong-excellent} strong matches ranked first`:
      strong>0?`${strong} strong matches ranked first`:'Sorted by fit score';
  }else{
    document.getElementById('fitTxt').textContent='Complete the quiz for personalized ranking';
    const topBtn=document.getElementById('pTop');
    if(topBtn){topBtn.style.display='none';fTop=false;topBtn.classList.remove('on');}
  }

  const body=document.getElementById('expBody');
  body.className='exp-body mode-'+vMode;
  if(!items.length){body.innerHTML='<div style="padding:60px;text-align:center;color:var(--ink-2)">No credentials found. Try adjusting your search or filters.</div>';return}

  const groups={},order=[];
  items.forEach(d=>{const pc=pC(d.cluster)||'Other';if(!groups[pc]){groups[pc]=[];order.push(pc)}groups[pc].push(d)});

  // Cluster icon colors cycle through orange, purple, blue
  const palettes=[
    ['var(--o-tint)','var(--o)'],['var(--p-tint)','var(--p-dark)'],['var(--b-tint)','var(--b-dark)'],
    ['#fff4e6','#7a4000'],['#f8eef9','#8a2e8e'],['#eef3fe','#3d72d4'],
    ['#fff8f0','#b85e00'],['#f5eeff','#6b21a8'],['#e8f4fd','#1e6fa8'],
    ['#fef3e2','#9a4e00'],['#fdf0ff','#7b1fa2'],['#e0f0ff','#1565c0'],
  ];

  const legend=vMode==='peruse'?`<div class="peruse-legend">Dot key: <span class="pl-dot" style="background:var(--o)"></span>CCL Playbook Module &nbsp;·&nbsp; <span class="pl-dot" style="background:var(--p)"></span>CCL Expert Org &nbsp;·&nbsp; <span class="pl-dot" style="background:var(--b-dark)"></span>Under 5 wks &nbsp;·&nbsp; <span class="pl-dot" style="background:var(--ink-4)"></span>Standard</div>`:'';

  let ci=0,html=legend;
  order.forEach(cluster=>{
    const[bg,fg]=palettes[ci++%palettes.length];
    html+=`<div class="cl-sec"><div class="cl-head"><div class="cl-icon" style="background:${bg};color:${fg}">${clE(cluster)}</div><span class="cl-name">${cluster}</span><span class="cl-cnt">${groups[cluster].length}</span></div><div class="clist">${groups[cluster].map((d,i)=>card(d,i)).join('')}</div></div>`;
  });
  body.innerHTML=html;

  body.querySelectorAll('.crow').forEach(el=>{
    el.addEventListener('click',e=>{
      if(e.target.closest('a')||e.target.closest('button'))return;
      const id=el.dataset.id;
      if(expanded.has(id)){expanded.delete(id);el.classList.remove('open')}
      else{expanded.add(id);el.classList.add('open')}
    });
  });
  expanded.forEach(id=>{const el=body.querySelector(`[data-id="${CSS.escape(id)}"]`);if(el)el.classList.add('open')});
}

function card(d,idx){
  const s=d._s,sl=sLbl(s),sm=stMeta(d),cost=fmtC(d.cost),inSL=shortlist.has(d.code),inCmp=compare.has(d.code);

  const pv=`<div class="pv">
    <span class="ci">${idx+1}</span>
    <span class="spip" style="background:${sm.color}" title="${sm.tip}" aria-label="${sm.tip}"></span>
    <span class="cn">${e(d.name)}</span>
    <span class="ciss">${e(d.issuer||'')}</span>
    <span class="ccst">${cost}</span>
    ${sl?`<span class="fpill ${sl.pCls}">${sl.stars} ${sl.label}</span>`:''}
    <button class="inline-sl ${inSL?'in':''}" title="${inSL?'Remove from shortlist':'Add to shortlist'}" onclick="togSL('${e(d.code)}',this)">${inSL?'♥':'♡'}</button>
    <span class="chev">›</span>
  </div>`;

  const sv=`<div class="sv">
    <div class="sm">
      <div class="sn">${e(d.name)}</div>
      <div class="sby">${e(d.issuer||'')} · ${e(d.code)}</div>
      ${d.oneLiner?`<div class="s1l">${e(d.oneLiner)}</div>`:''}
      <div class="stags">
        ${d.under5weeks==='Yes'?'<span class="tag t-o">⚡ Under 5 wks</span>':''}
        ${d.cclModule==='Yes'?'<span class="tag t-ccl">🧭 CCL Playbook Module</span>':''}
        ${d.cclExpert?`<span class="tag t-p">👤 ${e(d.cclExpert)}</span>`:''}
        ${sl?`<span class="tag ${sl.tCls}">${sl.stars} ${sl.label}</span>`:''}
        ${d.prereqs?'<span class="tag t-pre">Prereqs req.</span>':''}
      </div>
    </div>
    <div class="sr">
      <div class="scst">${cost}</div>
      <div class="shrs">${e(d.hours||'—')}</div>
      <button class="inline-sl ${inSL?'in':''}" title="${inSL?'Remove from shortlist':'Add to shortlist'}" onclick="togSL('${e(d.code)}',this)">${inSL?'♥':'♡'}</button>
      <span class="chev" style="font-size:13px">›</span>
    </div>
  </div>`;

  const dv=`<div class="dv">
    <div class="dm">
      <div class="dn">${e(d.name)}</div>
      <div class="dc">${e(d.code)}</div>
      ${d.oneLiner?`<div class="d1l">${e(d.oneLiner)}</div>`:''}
      <div class="dt">
        ${d.under5weeks==='Yes'?'<span class="tag t-o">⚡ Under 5 wks</span>':''}
        ${d.cclModule==='Yes'?'<span class="tag t-ccl">🧭 CCL</span>':''}
        ${sl?`<span class="tag ${sl.tCls}">${sl.stars} ${sl.label}</span>`:''}
      </div>
    </div>
    <div class="da">
      <div class="dab"><span class="dal">Cost</span><span class="dav dacst">${cost}</span></div>
      <div class="dab"><span class="dal">Training</span><span class="dav">${e(d.hours||'Not listed')}</span></div>
      <div class="dab"><span class="dal">Cluster</span><span class="dav">${e(pC(d.cluster)||'—')}</span></div>
      <button class="inline-sl ${inSL?'in':''}" title="${inSL?'Remove from shortlist':'Add to shortlist'}" style="align-self:flex-end" onclick="togSL('${e(d.code)}',this)">${inSL?'♥':'♡'}</button>
      <span class="chev" style="align-self:flex-end;font-size:13px">›</span>
    </div>
  </div>`;

  // Detail — CCL callout in orange, desc in white, career paths in purple, fit in blue
  const cclBox=d.cclModule==='Yes'?`<div class="box-o">
    <div class="box-title bt-o">🧭 CCL Playbook Module${d.cclExpert?' — '+e(d.cclExpert):''}</div>
    <div class="box-body">A training module for this credential has been built through the CCL Playbook network.${d.cclModuleLink?` <a href="${d.cclModuleLink}" target="_blank" rel="noopener" style="color:#7a4000;font-weight:600">View the module →</a>`:' Contact your CCL Playbook coordinator for access.'}</div>
  </div>`:'';

  const det=`<div class="cdet">
    ${cclBox}
    <div class="det-g">
      <div class="db"><span class="dl">Name</span><span class="dv2">${e(d.name)}</span></div>
      <div class="db"><span class="dl">Code</span><span class="dv2">${e(d.code)}</span></div>
      <div class="db"><span class="dl">Issuer</span><span class="dv2">${e(d.issuer||'—')}</span></div>
      <div class="db"><span class="dl">Career Cluster</span><span class="dv2">${e(d.cluster||'—')}</span></div>
      <div class="db"><span class="dl">Exam Cost</span><span class="dv2">${e(d.cost||'Not listed')}</span></div>
      <div class="db"><span class="dl">Training Length</span><span class="dv2">${e(d.hours||'Not listed')}</span></div>
      ${d.prereqs?`<div class="db"><span class="dl">Prerequisites</span><span class="dv2">${e(d.prereqs)}</span></div>`:''}
      <div class="db"><span class="dl">Under 5 Weeks?</span><span class="dv2">${d.under5weeks==='Yes'?'⚡ Yes':'No — longer training needed'}</span></div>
      ${d.cclExpert?`<div class="db"><span class="dl">CCL Playbook Expert</span><span class="dv2">${e(d.cclExpert)}</span></div>`:''}
    </div>
    ${d.oneLiner?`<div class="box-white"><div class="box-title bt-gray">In One Line</div><div class="box-body it">${e(d.oneLiner)}</div></div>`:''}
    ${d.detailedDesc?`<div class="box-white"><div class="box-title bt-gray">Full Description</div><div class="box-body">${e(d.detailedDesc)}</div></div>`:''}
    ${d.careerPaths?`<div class="box-p"><div class="box-title bt-p">Relevant Career Paths</div><div class="box-body">${e(d.careerPaths)}</div></div>`:''}
    ${d.goodFitFor?`<div class="box-b"><div class="box-title bt-b">Good Fit For These OST Programs</div><div class="box-body">${e(d.goodFitFor)}</div></div>`:''}
    <div class="det-acts">
      ${d.link?`<a href="${d.link}" target="_blank" rel="noopener" class="btn-p2">↗ Official Page</a>`:''}
      ${d.accommodations?`<a href="${d.accommodations}" target="_blank" rel="noopener" class="btn-s2">♿ Accommodations</a>`:''}
      <button class="sl-tog ${inSL?'in':''}" onclick="togSL('${e(d.code)}',this)">${inSL?'♥ In Shortlist':'♡ Add to Shortlist'}</button>
      <button class="cmp-tog ${inCmp?'in':''}" onclick="togCmp('${e(d.code)}',this)">${inCmp?'✓ Comparing':'+ Compare'}</button>
    </div>
  </div>`;

  return `<div class="crow" data-id="${e(d.code)}">${pv}${sv}${dv}${det}</div>`;
}

// ── SHORTLIST ───────────────────────────────────────
function togSL(code,btn){
  if(shortlist.has(code)){shortlist.delete(code);if(btn){btn.textContent='♡ Add to Shortlist';btn.classList.remove('in')}}
  else{shortlist.add(code);if(btn){btn.textContent='♥ In Shortlist';btn.classList.add('in')}toast('Added to shortlist')}
  updateBadge();saveStore();
}
function updateBadge(){document.getElementById('slBadge').textContent=shortlist.size}

function renderSL(){
  const el=document.getElementById('slCards'),acts=document.getElementById('slActs');
  if(!shortlist.size){el.innerHTML=`<div class="sl-empty"><h3>Your shortlist is empty</h3><p>Browse credentials, expand any card, and click "Add to Shortlist" to save them here.</p><button class="sl-empty-btn" onclick="showV('exp')">← Browse Credentials</button></div>`;acts.style.display='none';return}
  acts.style.display='flex';
  const items=DATA.filter(d=>shortlist.has(d.code));
  const now=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const printHdr=`<div class="print-hdr">
    <div class="print-hdr-left">
      <div class="print-hdr-title">Credential Compass — My Shortlist</div>
      <div class="print-hdr-sub">Career-Connected Learning Playbook · Dent Education &amp; MOST Network · Maryland MSDE</div>
    </div>
    <div class="print-hdr-right">Generated ${now}<br>${items.length} credential${items.length!==1?'s':''} saved</div>
  </div>`;
  const printFtr=`<div class="print-ftr">
    Created by <strong>Dent Education</strong> and <strong>MOST Network</strong> · Companion to the <strong>Career-Connected Learning Playbook</strong><br>
    credential-compass.denteducation.org · Maryland MSDE Approved IRC List · denteducation.org
  </div>`;
  el.innerHTML=printHdr+items.map(d=>{
    const sm=stMeta(d),cost=fmtC(d.cost);
    return`<div class="sl-card">
      <div class="sl-card-top"><div>
        <div class="sl-cn">${e(d.name)}</div>
        <div class="sl-cby">${e(d.issuer||'')} · ${e(d.code)}</div>
        <div class="sl-ctags">
          ${d.under5weeks==='Yes'?'<span class="tag t-o">⚡ Under 5 wks</span>':''}
          ${d.cclModule==='Yes'?'<span class="tag t-ccl">🧭 CCL Module</span>':''}
          ${d.cclExpert?`<span class="tag t-p">👤 ${e(d.cclExpert)}</span>`:''}
        </div>
      </div><div class="sl-cr"><div class="sl-cst">${cost}</div><div class="sl-hrs">${e(d.hours||'—')}</div></div></div>
      <div class="sl-cbody">
        ${d.oneLiner?`<p style="font-size:13px;font-style:italic;color:var(--ink-2);margin-bottom:12px;line-height:1.5">${e(d.oneLiner)}</p>`:''}
        <div class="sl-g">
          <div class="sl-b"><span class="sl-l">Career Cluster</span><span class="sl-v">${e(d.cluster||'—')}</span></div>
          <div class="sl-b"><span class="sl-l">Training Time</span><span class="sl-v">${e(d.hours||'Not listed')}</span></div>
          ${d.careerPaths?`<div class="sl-b" style="grid-column:1/-1"><span class="sl-l">Career Paths</span><span class="sl-v">${e(d.careerPaths)}</span></div>`:''}
          ${d.goodFitFor?`<div class="sl-b" style="grid-column:1/-1"><span class="sl-l">Good Fit For</span><span class="sl-v">${e(d.goodFitFor)}</span></div>`:''}
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${d.link?`<a href="${d.link}" target="_blank" rel="noopener" class="btn-p2" style="font-size:12px;padding:8px 14px">↗ Official Page</a>`:''}
          <button class="sl-rm" onclick="rmSL('${e(d.code)}')">Remove</button>
        </div>
      </div>
    </div>`;
  }).join('')+printFtr;
}
function rmSL(code){shortlist.delete(code);updateBadge();saveStore();renderSL()}

// ── COMPARE ─────────────────────────────────────────
function togCmp(code,btn){
  if(compare.has(code)){compare.delete(code);if(btn){btn.textContent='+ Compare';btn.classList.remove('in')}}
  else{
    if(compare.size>=3){toast('Compare up to 3 credentials');return}
    compare.add(code);if(btn){btn.textContent='✓ Comparing';btn.classList.add('in')}
  }
  updateCmpBanner();
}
function updateCmpBanner(){
  const banner=document.getElementById('cmpBanner');
  const items=document.getElementById('cmpItems');
  if(!compare.size){banner.classList.remove('show');return}
  banner.classList.add('show');
  items.innerHTML=[...compare].map(code=>{
    const d=DATA.find(x=>x.code===code);
    return`<span class="cmp-item">${e(d?d.name.substring(0,32)+(d.name.length>32?'…':''):code)}<button class="cmp-item-x" onclick="togCmp('${e(code)}')">×</button></span>`;
  }).join('');
}
function clearCmp(){compare.forEach(code=>{const el=document.querySelector(`[data-id="${CSS.escape(code)}"]`);if(el){const btns=el.querySelectorAll('.cmp-tog');btns.forEach(b=>{b.textContent='+ Compare';b.classList.remove('in')})}});compare.clear();updateCmpBanner()}
function openCmp(){
  const items=DATA.filter(d=>compare.has(d.code));if(!items.length)return;
  const rows=[
    ['Issuer',d=>e(d.issuer||'—')],['Career Cluster',d=>e(pC(d.cluster)||'—')],
    ['Exam Cost',d=>e(fmtC(d.cost))],['Training Length',d=>e(d.hours||'Not listed')],
    ['Under 5 Weeks?',d=>d.under5weeks==='Yes'?'⚡ Yes':'No'],
    ['CCL Playbook Module',d=>d.cclModule==='Yes'?(d.cclModuleLink?`🧭 Yes — <a href="${d.cclModuleLink}" target="_blank" rel="noopener">View module →</a>`:'🧭 Yes'):'—'],
    ['CCL Playbook Expert',d=>e(d.cclExpert||'—')],
    ['Prerequisites',d=>e(d.prereqs||'None listed')],
    ['Career Paths',d=>e(d.careerPaths||'—')],
    ['Good Fit For',d=>e(d.goodFitFor||'—')],
  ];
  let table=`<table><thead><tr><th></th>${items.map(d=>`<th>${e(d.name)}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(([lbl,fn])=>{table+=`<tr><td>${lbl}</td>${items.map(fn).map(v=>`<td>${v}</td>`).join('')}</tr>`});
  table+='</tbody></table>';
  document.getElementById('cmpTable').innerHTML=table;
  document.getElementById('cmpModal').classList.add('show');
}
function closeCmp(){document.getElementById('cmpModal').classList.remove('show')}
document.addEventListener('click',e=>{if(e.target===document.getElementById('cmpModal'))closeCmp()});

// ── EXPORT ──────────────────────────────────────────
function copyLink(){
  if(!shortlist.size){toast('Add credentials first');return}
  const enc=btoa(JSON.stringify([...shortlist]));
  const url=location.origin+location.pathname+'?sl='+enc;
  navigator.clipboard.writeText(url).then(()=>toast('Share link copied!')).catch(()=>prompt('Copy this link:',url));
}
function emailSL(){
  if(!shortlist.size){toast('Add credentials first');return}
  const items=DATA.filter(d=>shortlist.has(d.code));
  const subj=encodeURIComponent('My Credential Compass Shortlist — CCL Playbook');
  let body='Credential Compass Shortlist\nCareer-Connected Learning Playbook · Maryland MSDE\nDeveloped by Dent Education\n\n';
  items.forEach((d,i)=>{
    body+=`${i+1}. ${d.name}\n   Issuer: ${d.issuer||'—'}\n   Cost: ${d.cost||'Not listed'}\n   Training: ${d.hours||'Not listed'}\n   Cluster: ${d.cluster||'—'}\n`;
    if(d.oneLiner)body+=`   Summary: ${d.oneLiner}\n`;
    if(d.link)body+=`   Info: ${d.link}\n`;
    body+='\n';
  });
  body+='---\nCredential Compass · Career-Connected Learning Playbook\nDent Education · MOST Network · CareerBound · Annie E. Casey Foundation\ndenteducation.org';
  location.href=`mailto:?subject=${subj}&body=${encodeURIComponent(body)}`;
}

// ── UI ───────────────────────────────────────────────
function setMode(m){vMode=m;document.querySelectorAll('.mtab').forEach(t=>t.classList.remove('on'));document.getElementById('mt-'+m).classList.add('on');render()}
function tog(k){
  if(k==='5w'){f5w=!f5w;document.getElementById('p5w').classList.toggle('on',f5w)}
  else if(k==='ccl'){fCCL=!fCCL;document.getElementById('pCCL').classList.toggle('on',fCCL)}
  else if(k==='noreq'){fNoReq=!fNoReq;document.getElementById('pNoReq').classList.toggle('on',fNoReq)}
  else if(k==='top'){fTop=!fTop;document.getElementById('pTop').classList.toggle('on',fTop)}
  render();
}
function rmF(k,v){
  if(Array.isArray(qa[k]))qa[k]=qa[k].filter(x=>x!==v);else qa[k]='any';
  localStorage.setItem('cc_quiz',JSON.stringify(qa));render();
}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function saveStore(){try{localStorage.setItem('cc_sl',JSON.stringify([...shortlist]))}catch(x){}}
function loadStore(){try{const s=localStorage.getItem('cc_sl');if(s)JSON.parse(s).forEach(id=>shortlist.add(id))}catch(x){}}

// ── HELPERS ──────────────────────────────────────────
function pC(c){if(!c)return'';return c.split(',')[0].trim()}
function costN(cost){if(!cost)return null;const m=cost.match(/\d[\d,]*/);return m?parseInt(m[0].replace(/,/g,'')):null}
function fmtC(cost){
  if(!cost)return'—';
  if(/free|no fee|\$0/i.test(cost))return'Free';
  const m=cost.match(/\$[\d,]+/g);
  if(!m)return cost.substring(0,26);
  return m.length===1?m[0]:m[0]+'+';
}
function clE(c){
  const m={'Digital':'💻','Manufacturing':'⚙️','Construction':'🏗️','Health':'🏥','Supply':'🚚','Transportation':'✈️','Arts':'🎨','Entertainment':'🎬','Hospitality':'🏨','Management':'🚀','Entrepreneurship':'🚀','Agriculture':'🌱','Safety':'🛡️','Public Service':'🛡️','Marketing':'📣','Education':'🎓','Energy':'⚡'};
  for(const[k,em]of Object.entries(m)){if(c&&c.includes(k))return em}return'📋';
}
function e(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

init();
