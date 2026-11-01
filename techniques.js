(() => {
  'use strict';
  const data=window.TECHNIQUES_DATA,$=s=>document.querySelector(s);
  if(!data){$('#catalogue-detail').textContent='条目未载入，请刷新页面重试。';return;}
  const entries=data.entries,byId=new Map(entries.map(e=>[e.id,e])),people=new Map(data.people.map(p=>[p.id,p.name]));
  const mobileQuery=matchMedia('(max-width:720px)');
  const resizeFilters=()=>{$('#catalogue-filters').open=!mobileQuery.matches;};resizeFilters();mobileQuery.addEventListener('change',resizeFilters);
  const controls={q:$('#catalogue-search'),path:$('#catalogue-path'),rank:$('#catalogue-rank'),person:$('#catalogue-person'),sort:$('#catalogue-sort')};
  const list=$('#catalogue-list'),detail=$('#catalogue-detail');let kind='',page=0,current='',filtered=entries;const size=35;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const button=(text,action,label)=>{const b=el('button','',text);b.type='button';if(label)b.setAttribute('aria-label',label);b.addEventListener('click',action);return b;};
  const fullText=new Map(entries.map(e=>[e.id,[e.name,...e.aliases,e.path,e.description,e.summaryQuote||'',...e.people.map(id=>people.get(id)),...e.references.flatMap(r=>r.paragraphs)].join(' ').toLowerCase()]));
  const number=n=>n.toLocaleString('zh-CN');
  for(const p of [...new Set(entries.map(e=>e.path).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN')))controls.path.add(new Option(p,p));
  controls.path.add(new Option('摘录未明示流派','unknown'));
  for(const n of '一二三四五六七八九十')if(entries.some(e=>e.ranks.includes(n+'转')))controls.rank.add(new Option(n+'转',n+'转'));
  controls.rank.add(new Option('未确认品阶','unknown'));
  for(const p of data.people.filter(p=>entries.some(e=>e.people.includes(p.id))))controls.person.add(new Option(p.name,p.id));
  const categories=[['','全部'],...Object.entries(data.categories)];
  for(const [id,name] of categories){const b=button(name,()=>{kind=id;page=0;filter();save();});b.dataset.kind=id;b.append(el('span','',number(id?entries.filter(e=>e.kind===id).length:entries.length)));$('#catalogue-categories').append(b);}
  function save(push=false){const params=new URLSearchParams();for(const [key,c] of Object.entries(controls))if(c.value&&(key!=='sort'||c.value!=='featured'))params.set(key,c.value);if(kind)params.set('kind',kind);if(page)params.set('page',String(page+1));if(current)params.set('entry',current);const url='#'+params.toString();if(location.hash!==url)history[push?'pushState':'replaceState'](null,'',url);}
  function filter(){
    const terms=controls.q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    filtered=entries.filter(e=>(!kind||e.kind===kind)&&(!controls.path.value||(controls.path.value==='unknown'?!e.path:e.path===controls.path.value))&&(!controls.rank.value||(controls.rank.value==='unknown'?!e.ranks.length:e.ranks.includes(controls.rank.value)))&&(!controls.person.value||e.people.includes(controls.person.value))&&terms.every(term=>fullText.get(e.id).includes(term)));
    if(terms.length&&controls.sort.value==='featured'){
      const phrase=controls.q.value.trim().toLowerCase();
      const relevance=e=>(e.name.toLowerCase()===phrase?1000:0)+terms.reduce((score,term)=>score+(e.name.toLowerCase().includes(term)?80:e.aliases.some(a=>a.toLowerCase().includes(term))?60:e.description.includes(term)?20:0),0);
      filtered.sort((a,b)=>relevance(b)-relevance(a));
    }
    if(controls.sort.value==='name')filtered.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN')||a.kind.localeCompare(b.kind));
    if(controls.sort.value==='appearance')filtered.sort((a,b)=>a.firstOrder-b.firstOrder);
    if(controls.sort.value==='chapters')filtered.sort((a,b)=>b.chapters-a.chapters);
    page=Math.max(0,Math.min(page,Math.ceil(filtered.length/size)-1));renderList();
    for(const b of $('#catalogue-categories').children)b.setAttribute('aria-pressed',String(b.dataset.kind===kind));
    if(filtered.length&&!filtered.some(e=>e.id===current))open(filtered[0].id,false,false);
    if(!filtered.length){const h=el('h2','','暂无匹配条目');h.id='technique-name';detail.replaceChildren(h,el('p','technique-missing','试试放宽品阶、流派或人物条件。'));current='';}
  }
  function renderList(){
    const fragment=document.createDocumentFragment();for(const e of filtered.slice(page*size,(page+1)*size)){
      const li=el('li'),b=button('',()=>open(e.id,true,true),'阅读'+e.name+'的'+data.categories[e.kind]+'条目');b.dataset.entry=e.id;b.setAttribute('aria-current',String(current===e.id));
      const head=el('span','technique-row-heading');head.append(el('strong','',e.name),el('small','',data.categories[e.kind]));
      b.append(head,el('span','technique-row-meta',[e.path,e.ranks.join(' / '),number(e.chapters)+'章有记载'].filter(Boolean).join(' · ')));
      if(e.description||e.summaryQuote)b.append(el('p','technique-row-copy',e.description||'“'+e.summaryQuote+'”'));li.append(b);fragment.append(li);
    }list.replaceChildren(fragment);$('#catalogue-count').textContent=number(filtered.length)+' / '+number(entries.length)+'条';$('#catalogue-empty').hidden=!!filtered.length;
    $('#catalogue-page').textContent=filtered.length?`${page*size+1}–${Math.min((page+1)*size,filtered.length)}`:'0';$('#catalogue-previous').disabled=page===0;$('#catalogue-next').disabled=(page+1)*size>=filtered.length;
  }
  function open(id,scroll=false,push=false){const e=byId.get(id);if(!e)return;current=id;detail.replaceChildren();
    const back=button('← 返回检索结果',()=>{const heading=$('#catalogue-title');heading.tabIndex=-1;heading.scrollIntoView({behavior:'auto',block:'start'});heading.focus({preventScroll:true});});back.className='technique-back';detail.append(back);
    detail.append(el('p','technique-meta',[data.categories[e.kind],e.path,e.ranks.length?'品阶记载：'+e.ranks.join('、'):'',number(e.chapters)+'章出现'].filter(Boolean).join(' · ')),el('h2','',e.name));
    detail.querySelector('h2').id='technique-name';detail.setAttribute('aria-labelledby','technique-name');
    if(e.description)detail.append(el('p','technique-description',e.description));
    if(e.aliases.length)detail.append(el('p','technique-aliases','原文其他写法：'+e.aliases.join('、')));
    if(e.rankEvidence?.length){const ranks=el('details','technique-rank-evidence');ranks.append(el('summary','','品阶记载依据'));for(const r of e.rankEvidence){const section=el('section','technique-reference');section.append(el('p','',r.rank+' · 第'+'一二三四五六'[r.volume-1]+'卷 · '+r.chapter),el('blockquote','',r.paragraph));ranks.append(section);}detail.append(ranks);}
    if(e.people.length){detail.append(el('h3','','关联人物'));const links=el('nav','technique-person-links');links.setAttribute('aria-label','相关人物档案');for(const id of e.people){const a=el('a','',people.get(id));a.href='index.html#'+id+'?tab=life';links.append(a);}detail.append(links);}
    detail.append(el('h3','','原著摘录'));
    e.references.forEach((r,index)=>{const wrap=el(index?'details':'section','technique-reference'),label=`第${'一二三四五六'[r.volume-1]}卷 · ${r.chapter}`;wrap.append(el(index?'summary':'p','',label));const quote=el('blockquote');quote.setAttribute('aria-label',e.name+'原文片段');for(const p of r.paragraphs)quote.append(el('p','',p));wrap.append(quote);detail.append(wrap);});
    const context=e.references.flatMap(r=>r.paragraphs).join('');const related=entries.filter(x=>x.id!==e.id&&x.name.length>2&&context.includes(x.name)).slice(0,9);
    if(related.length){detail.append(el('h3','','同段出现'));const nav=el('nav','technique-related-links');for(const r of related){const a=el('a','',r.name+' · '+data.categories[r.kind]);const params=new URLSearchParams({entry:r.id});a.href='#'+params;a.addEventListener('click',event=>{event.preventDefault();clear(false);current=r.id;filter();open(r.id,true,true);});nav.append(a);}detail.append(nav);}
    const i=filtered.findIndex(x=>x.id===id),pager=el('nav','technique-detail-pager');pager.setAttribute('aria-label','切换条目');const prev=button(i>0?'← '+filtered[i-1].name:'← 上一条',()=>open(filtered[i-1].id,true,true));prev.disabled=i<=0;const next=button(i>=0&&i<filtered.length-1?filtered[i+1].name+' →':'下一条 →',()=>open(filtered[i+1].id,true,true));next.disabled=i<0||i>=filtered.length-1;pager.append(prev,next);detail.append(pager);
    for(const b of list.querySelectorAll('[data-entry]'))b.setAttribute('aria-current',String(b.dataset.entry===id));document.title=e.name+' · 蛊虫与杀招大全';save(push);
    if(scroll){detail.scrollIntoView({behavior:'auto',block:'start'});detail.focus({preventScroll:true});}
  }
  function clear(update=true){for(const [key,c] of Object.entries(controls))c.value=key==='sort'?'featured':'';kind='';page=0;if(update){filter();save();controls.q.focus();}}
  function restore(){const params=new URLSearchParams(location.hash.slice(1));for(const [key,c] of Object.entries(controls))c.value=params.get(key)||(key==='sort'?'featured':'');kind=data.categories[params.get('kind')]?params.get('kind'):'';page=Math.max(0,(Number(params.get('page'))||1)-1);current=byId.has(params.get('entry'))?params.get('entry'):'';filter();if(current)open(current);}
  let searchTimer;controls.q.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=0;filter();save();},100);});for(const [key,c] of Object.entries(controls))if(key!=='q')c.addEventListener('change',()=>{page=0;filter();save();});
  const restoreRoute=()=>{if(!['#top','#catalogue-search'].includes(location.hash))restore();};
  $('#catalogue-reset').addEventListener('click',()=>clear());$('#catalogue-previous').addEventListener('click',()=>{page--;renderList();list.scrollTop=0;save();});$('#catalogue-next').addEventListener('click',()=>{page++;renderList();list.scrollTop=0;save();});window.addEventListener('hashchange',restoreRoute);window.addEventListener('popstate',restoreRoute);restore();
})();
