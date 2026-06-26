/* 分子檢驗臨床應用大綱 — 前端渲染
   資料來源：data/clinical.json（共編者只需編輯該檔）
   ** 文字 ** → 粗體；method 中能對應技術卡(abbr/en/zh)者連到 ../tech/index.html?q=abbr */
(function(){
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  let DATA=null, TECH=new Map(); // key: abbr/en/zh → abbr

  const xref = fetch('../tech/data/tech.json')
    .then(r=>r.ok?r.json():null).then(d=>{ if(d&&Array.isArray(d.tech)) d.tech.forEach(t=>{ [t.abbr,t.en,t.zh].forEach(k=>{ if(k) TECH.set(k,t.abbr); }); }); }).catch(()=>{});

  const boot = fetch('data/clinical.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); });
  Promise.all([boot, xref]).then(([d])=>{ DATA=d; render(); })
    .catch(e=>{ $('#cards').innerHTML='<div class="err">無法載入 <b>data/clinical.json</b>（'+esc(e.message)+'）。請用本機伺服器（<code>python -m http.server</code>）或 GitHub Pages 網址開啟，勿用 file://。</div>'; });

  function strField(title, s){
    if(typeof s!=='string'||!s.trim()) return '';
    return '<div class="field"><div class="k">'+title+'</div><div class="v">'+md(s)+'</div></div>';
  }
  function methodField(methods){
    if(!Array.isArray(methods)||!methods.length) return '';
    const items=methods.map(m=> TECH.has(m)
      ? '<a class="xref" href="../tech/index.html?q='+encodeURIComponent(TECH.get(m))+'" title="到技術大綱查 '+esc(m)+'">'+esc(m)+'</a>'
      : esc(m)).join('、');
    return '<div class="field"><div class="k">常用技術</div><div class="v tags">'+items+'</div></div>';
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
  // 全部展開/收合後同步所有標題列的 aria-expanded（不依賴 enhance.js）
  function syncAllAria(){
    document.querySelectorAll('.card,.group').forEach(e=>{
      const h=e.querySelector('.card-head,.group-head');
      if(h) h.setAttribute('aria-expanded', String(!e.classList.contains('collapsed')));
    });
  }

  function clinicalCard(d){
    const card=document.createElement('article');
    card.className='card'; card.id=encodeURIComponent(d.name);
    const fields=
      strField('檢測標的', d.target)+
      methodField(d.method)+
      strField('臨床意義', d.clinical)+
      strField('結果判讀', d.interpret)+
      strField('常見陷阱／鑑別', d.pitfall);
    const hot=(d.hot||[]).map(h=>'<li>'+md(h)+'</li>').join('');
    const qa=(d.qa||[]).map(q=>'<tr><td class="yr">'+esc(q[0])+'</td><td>'+esc(q[1])+'</td></tr>').join('');
    card.innerHTML=
      '<div class="card-head"><span class="abbr">'+esc(d.name)+'</span><span class="en">'+esc(d.en)+'</span>'+
      '<span class="zh">'+esc(d.zh)+'</span><span class="stars">'+'★'.repeat(d.stars||0)+'</span><span class="arrow">▼</span></div>'+
      '<div class="card-body">'+fields+
      '<div class="hot"><div class="k">⭐ 高頻考點</div><ol>'+hot+'</ol>'+
      '<table class="qa"><tbody>'+qa+'</tbody></table></div></div>';
    wireToggle(card.querySelector('.card-head'), card);
    return card;
  }

  function render(){
    $('#sub').textContent='科目：'+DATA.meta.subject+'｜共 '+DATA.clinical.length+' 張臨床卡';
    const wrap=$('#cards'); wrap.innerHTML='';
    // 群組顯示順序依 meta.groups（官方大綱章節序）；不在清單者退回出現序附於後
    const seen=[...new Set(DATA.clinical.map(c=>c.h1))];
    const groups=(DATA.meta&&DATA.meta.groups)||[];
    const h1order=[...groups.filter(g=>seen.includes(g)), ...seen.filter(g=>!groups.includes(g))];
    h1order.forEach(h1=>{
      const g=document.createElement('section');
      g.className='group'; g.dataset.group=h1;
      const flow=(DATA.flows&&DATA.flows[h1]||[]).map(l=>'<div class="ln">'+md(l)+'</div>').join('');
      g.innerHTML='<div class="group-head"><span class="arrow">▼</span><span>'+esc(h1)+'</span></div>'+
        '<div class="group-body">'+(flow?'<div class="flow"><h3>🧭 流程</h3>'+flow+'</div>':'')+'</div>';
      const body=g.querySelector('.group-body');
      wireToggle(g.querySelector('.group-head'), g);
      const cc=document.createElement('div'); cc.className='cards';
      DATA.clinical.filter(c=>c.h1===h1).forEach(c=>cc.appendChild(clinicalCard(c)));
      body.appendChild(cc);
      wrap.appendChild(g);
    });
    $('#search').addEventListener('input',applyFilter);
    $('#expandAll').onclick=()=>{document.querySelectorAll('.card,.group').forEach(e=>e.classList.remove('collapsed'));syncAllAria();};
    $('#collapseAll').onclick=()=>{document.querySelectorAll('.card,.group').forEach(e=>e.classList.add('collapsed'));syncAllAria();};
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
