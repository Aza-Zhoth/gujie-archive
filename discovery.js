(() => {
  'use strict';
  const mode=document.body.dataset.discovery, data=mode==='search'?window.ARCHIVE_SEARCH:window.ARCHIVE_SCENES;
  const $=s=>document.querySelector(s), query=$('#discovery-query'), list=$('#discovery-results');
  if(!data){$('#discovery-count').textContent='资料未载入，请刷新页面重试。';return;}
  const names=new Map(data.people.map(p=>[p.id,p.name])), fields={q:query,kind:$('#discovery-kind'),person:$('#discovery-person'),volume:$('#discovery-volume'),original:$('#discovery-original')};
  let page=1,filtered=[],timer;const size=24;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const normalized=s=>s.normalize('NFKC').toLowerCase();
  function folded(text){let value='',offset=0;const positions=[];for(const char of text){const part=normalized(char);for(let i=0;i<part.length;i++)positions.push({start:offset,end:offset+char.length});value+=part;offset+=char.length;}return {value,positions};}
  // This index only loads on the discovery pages, never in the character reader.
  const indexed=data.entries.map(e=>({e,title:normalized(e.title),aliases:(e.aliases||[]).map(normalized),text:normalized([e.text,...(e.parts||[]).map(p=>p.text),...e.people.map(p=>names.get(p)||'')].join(' '))}));
  const kindOptions=fields.kind?[...fields.kind.options].map(o=>{o.value=o.value;return {node:o,label:o.textContent};}):[];
  function tokens(){return normalized(query.value.trim()).split(/\s+/).filter(Boolean);}
  function stateURL(push=false){
    const p=new URLSearchParams();
    for(const [key,node]of Object.entries(fields)){if(!node)continue;const value=node.type==='checkbox'?(node.checked?'1':''):node.value.trim();if(value)p.set(key,value);}
    if(page>1)p.set('page',page);
    const href=location.pathname+(p.size?'?'+p:'');
    if(location.pathname+location.search!==href)history[push?'pushState':'replaceState'](null,'',href);
  }
  function highlighted(parent,text,terms){
    if(!terms.length){parent.textContent=text;return;}
    const {value:low,positions}=folded(text);let pos=0,original=0;
    while(pos<low.length){let start=-1,term='';for(const t of terms){const i=low.indexOf(t,pos);if(i>=0&&(start<0||i<start)){start=i;term=t;}}if(start<0)break;const from=positions[start].start,to=positions[start+term.length-1].end;if(from>=original){parent.append(document.createTextNode(text.slice(original,from)));parent.append(el('mark','',text.slice(from,to)));original=to;}pos=start+term.length;}
    parent.append(document.createTextNode(text.slice(original)));
  }
  function matchedPart(e,terms){return e.parts?.find(p=>terms.length&&terms.every(t=>normalized(p.text).includes(t)))||e.parts?.find(p=>terms.some(t=>normalized(p.text).includes(t)));}
  function snippet(text,terms){const {value,positions}=folded(text);const matches=terms.map(t=>value.indexOf(t)).filter(i=>i>=0);const start=matches.length?Math.max(0,positions[Math.min(...matches)].start-32):0;return (start?'…':'')+text.slice(start,start+150)+(start+150<text.length?'…':'');}
  function render(scroll=false){
    const terms=tokens(), kind=fields.kind?.value,person=fields.person?.value,volume=fields.volume?.value;
    const matches=indexed.filter(({e,title,aliases,text})=>(!person||e.people.includes(person))&&(!volume||(volume==='unknown'?!e.volumes.length:e.volumes.includes(Number(volume))))&&(!fields.original?.checked||e.hasOriginal)&&terms.every(t=>title.includes(t)||aliases.some(a=>a.includes(t))||text.includes(t)));
    filtered=matches.filter(({e})=>!kind||e.kind===kind);
    for(const {node,label}of kindOptions){const n=node.value?matches.filter(({e})=>e.kind===node.value).length:matches.length;node.textContent=label+'（'+n+'）';}
    const rank=({title,aliases})=>!terms.length?0:title===terms.join(' ')?0:aliases.includes(terms.join(' '))?1:terms.every(t=>title.includes(t))?2:3;
    filtered.sort((a,b)=>rank(a)-rank(b));
    const active=mode==='scenes'||terms.length||kind||person;
    if(!active)filtered=[];
    page=Math.min(Math.max(1,page),Math.max(1,Math.ceil(filtered.length/size)));
    const fragment=document.createDocumentFragment();
    for(const {e} of filtered.slice((page-1)*size,page*size)){
      const li=el('li','discovery-result'),meta=el('p','discovery-meta',[e.kind,...e.people.slice(0,3).map(p=>names.get(p)),e.people.length>3?'等'+e.people.length+'人':'',e.source||''].filter(Boolean).join(' · '));li.id='hit-'+e.id;
      const h=el('h2'),a=el('a'),part=matchedPart(e,terms);
      a.href=part?e.href.split('#')[0]+'#'+part.anchor:e.href;highlighted(a,e.title,terms);h.append(a);
      const p=el('p','discovery-excerpt');highlighted(p,snippet(part?.text||e.parts?.[0]?.text||e.text,terms),terms);li.append(meta,h,p);
      if(e.reading){const links=el('nav','discovery-reading-links');links.setAttribute('aria-label','延伸阅读');const more=el('a','',e.reading.label+' →');more.href=e.reading.href;links.append(more);li.append(links);}
      for(const link of li.querySelectorAll('a'))link.addEventListener('click',event=>{
        if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
        const from=new URL(location.href);from.hash='hit-'+encodeURIComponent(e.id);
        window.ArchiveReading?.fromResults({from:from.href,target:link.href,label:mode==='scenes'?'返回名场面':'返回搜索结果',query:query.value.trim()});
      });
      fragment.append(li);
    }
    if(!filtered.length){const li=el('li','discovery-empty');li.append(el('p','',active?'没有找到匹配内容。试试缩短关键词，或清除筛选。':'可以输入“逆流河”“星宿”，也可以搜索你记得的原文。'));fragment.append(li);}
    list.replaceChildren(fragment);
    const total=filtered.length;
    $('#discovery-count').textContent=active?(total?`${total} 项 · 第 ${(page-1)*size+1}—${Math.min(page*size,total)} 项`:'0 项匹配'):'搜索人物、名场面、诗句、蛊虫与杀招、精读和人祖传';
    $('#discovery-pager').hidden=total<=size;$('#discovery-prev').disabled=page<=1;$('#discovery-next').disabled=page*size>=total;$('#discovery-page').textContent=page+' / '+Math.max(1,Math.ceil(total/size));
    stateURL();if(scroll){list.scrollIntoView({block:'start'});list.focus({preventScroll:true});}
  }
  function restore(){
    const p=new URLSearchParams(location.search);
    for(const [key,node]of Object.entries(fields)){if(!node)continue;if(node.type==='checkbox')node.checked=p.get(key)==='1';else if(node.tagName==='SELECT')node.value=[...node.options].some(o=>o.value===p.get(key))?p.get(key):'';else node.value=(p.get(key)||'').slice(0,120);}
    const n=Number(p.get('page'));page=Number.isSafeInteger(n)&&n>0?n:1;render();
    if(location.hash.startsWith('#hit-')){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const target=document.getElementById(id);if(target)requestAnimationFrame(()=>{target.scrollIntoView({block:'start'});target.tabIndex=-1;target.focus({preventScroll:true});});}
  }
  $('#discovery-form').addEventListener('submit',e=>{e.preventDefault();clearTimeout(timer);page=1;render(true);});
  query.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{page=1;render();},160);});
  for(const node of Object.values(fields).filter(n=>n&&n!==query))node.addEventListener('change',()=>{clearTimeout(timer);page=1;render();});
  $('#discovery-reset').addEventListener('click',()=>{clearTimeout(timer);for(const n of Object.values(fields)){if(!n)continue;if(n.type==='checkbox')n.checked=false;else n.value='';}page=1;render();query.focus();});
  for(const [id,delta]of [['prev',-1],['next',1]])$('#discovery-'+id).addEventListener('click',()=>{clearTimeout(timer);page+=delta;render(true);});
  window.addEventListener('popstate',()=>{clearTimeout(timer);restore();});restore();
})();
