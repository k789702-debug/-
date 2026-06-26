/* 分子檢驗技術大綱 — 前端渲染
   資料來源：data/tech.json（共編者只需編輯該檔）
   ** 文字 ** → 粗體；applications 中等於臨床卡 name 者連到 ../clinical/index.html?q=name */
(function(){
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  let DATA=null, CLINICAL=new Set();

  // 先抓臨床卡名稱白名單（失敗不影響主流程，只是不連結）
  const xref = fetch('../clinical/data/clinical.json')
    .then(r=>r.ok?r.json():null).then(d=>{ if(d&&Array.isArray(d.clinical)) d.clinical.forEach(c=>CLINICAL.add(c.name)); }).catch(()=>{});

  const boot = fetch('data/tech.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); });
  Promise.all([boot, xref]).then(([d])=>{ DATA=d; render(); })
    .catch(e=>{ $('#cards').innerHTML='<div class="err">無法載入 <b>data/tech.json</b>（'+esc(e.message)+'）。請用本機伺服器（<code>python -m http.server</code>）或 GitHub Pages 網址開啟，勿用 file://。</div>'; });

  function listField(title, arr){
    if(!Array.isArray(arr)||!arr.length) return '';
    return '<div class="field"><div class="k">'+title+'</div><ul>'+arr.map(x=>'<li>'+md(x)+'</li>').join('')+'</ul></div>';
  }
  function strField(title, s){
    if(typeof s!=='string'||!s.trim()) return '';
    return '<div class="field"><div class="k">'+title+'</div><div class="v">'+md(s)+'</div></div>';
  }
  function qcTable(qc){
    if(!Array.isArray(qc)||!qc.length) return '';
    const rows=qc.map(r=>'<tr><td>'+md(r[0])+'</td><td>'+md(r[1])+'</td><td>'+md(r[2])+'</td></tr>').join('');
    return '<div class="field"><div class="k">品管與排錯</div><div class="table-scroll"><table><thead><tr><th>現象</th><th>假陽/假陰·原因</th><th>QC對策</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
  }
  function prosCons(pc){
    if(!pc||(!pc.pros&&!pc.cons)) return '';
    const col=(t,a,cls)=>'<div class="'+cls+'"><b>'+t+'</b><ul>'+((a||[]).map(x=>'<li>'+md(x)+'</li>').join(''))+'</ul></div>';
    return '<div class="field"><div class="k">優缺點</div><div class="pc">'+col('優點',pc.pros,'pros')+col('限制',pc.cons,'cons')+'</div></div>';
  }
  function cmpTable(rows){
    if(!Array.isArray(rows)||rows.length<2) return '';
    const head='<tr>'+rows[0].map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr>';
    const body=rows.slice(1).map(r=>'<tr>'+r.map((c,ci)=>'<td>'+(ci===0?md(c):esc(c))+'</td>').join('')+'</tr>').join('');
    return '<div class="field"><div class="k">技術鑑別</div><div class="table-scroll"><table><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div></div>';
  }
  function appsField(apps){
    if(!Array.isArray(apps)||!apps.length) return '';
    const items=apps.map(a=> CLINICAL.has(a)
      ? '<a class="xref" href="../clinical/index.html?q='+encodeURIComponent(a)+'" title="到臨床應用大綱查 '+esc(a)+'">'+esc(a)+'</a>'
      : esc(a)).join('、');
    return '<div class="field"><div class="k">臨床應用</div><div class="v tags">'+items+'</div></div>';
  }

  // 可及性：把可點的標題列變成可鍵盤操作的 button 語意，並同步 aria-expanded
  function wireToggle(head, container){
    head.setAttribute('role','button');
    head.setAttribute('tabindex','0');
    head.setAttribute('aria-expanded', String(!container.classList.contains('collapsed')));
    const toggle=()=>{ const collapsed=container.classList.toggle('collapsed'); head.setAttribute('aria-expanded', String(!collapsed)); };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
  }

  function techCard(d){
    const card=document.createElement('article');
    card.className='card'; card.id=encodeURIComponent(d.abbr);
    const fields=
      strField('原理', d.principle)+
      listField('操作流程', d.steps)+
      listField('關鍵試劑／參數', d.keypoints)+
      strField('結果判讀', d.interpret)+
      qcTable(d.qc)+
      prosCons(d.pros_cons)+
      cmpTable(d.compare)+
      appsField(d.applications);
    const hot=(d.hot||[]).map(h=>'<li>'+md(h)+'</li>').join('');
    const qa=(d.qa||[]).map(q=>'<tr><td class="yr">'+esc(q[0])+'</td><td>'+esc(q[1])+'</td></tr>').join('');
    card.innerHTML=
      '<div class="card-head"><span class="en">'+esc(d.en)+'</span><span class="abbr">'+esc(d.abbr)+'</span>'+
      '<span class="zh">'+esc(d.zh)+'</span><span class="stars">'+'★'.repeat(d.stars||0)+'</span><span class="arrow">▼</span></div>'+
      '<div class="card-body">'+fields+
      '<div class="hot"><div class="k">⭐ 高頻考點</div><ol>'+hot+'</ol>'+
      '<table class="qa"><tbody>'+qa+'</tbody></table></div></div>';
    wireToggle(card.querySelector('.card-head'), card);
    return card;
  }

  function render(){
    $('#sub').textContent='科目：'+DATA.meta.subject+'｜共 '+DATA.tech.length+' 張技術卡';
    const wrap=$('#cards'); wrap.innerHTML='';
    const h1order=[...new Set(DATA.tech.map(t=>t.h1))];
    h1order.forEach(h1=>{
      const g=document.createElement('section');
      g.className='group'; g.dataset.group=h1;
      const flow=(DATA.flows&&DATA.flows[h1]||[]).map(l=>'<div class="ln">'+md(l)+'</div>').join('');
      g.innerHTML='<div class="group-head"><span class="arrow">▼</span><span>'+esc(h1)+'</span></div>'+
        '<div class="group-body">'+(flow?'<div class="flow"><h3>🧭 流程</h3>'+flow+'</div>':'')+'</div>';
      const body=g.querySelector('.group-body');
      wireToggle(g.querySelector('.group-head'), g);
      const cc=document.createElement('div'); cc.className='cards';
      DATA.tech.filter(t=>t.h1===h1).forEach(t=>cc.appendChild(techCard(t)));
      body.appendChild(cc);
      wrap.appendChild(g);
    });
    $('#search').addEventListener('input',applyFilter);
    $('#expandAll').onclick=()=>document.querySelectorAll('.card,.group').forEach(e=>e.classList.remove('collapsed'));
    $('#collapseAll').onclick=()=>document.querySelectorAll('.card,.group').forEach(e=>e.classList.add('collapsed'));
    const q=new URLSearchParams(location.search).get('q');
    if(q){ $('#search').value=q; }
    applyFilter();
  }

  function applyFilter(){
    const q=$('#search').value.trim().toLowerCase();
    let any=false;
    document.querySelectorAll('.group').forEach(g=>{
      let gHas=false;
      g.querySelectorAll('.card').forEach(card=>{
        const show=!q||card.textContent.toLowerCase().includes(q);
        card.style.display=show?'':'none';
        if(show){gHas=true;any=true;}
      });
      g.style.display=gHas?'':'none';
    });
    $('#nohit').style.display=any||!q?'none':'block';
  }
})();
