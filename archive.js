(() => {
  'use strict';
  const records = window.ARCHIVE_DATA;
  const byId = new Map(records.map(p => [p.id, p]));
  const $ = selector => document.querySelector(selector);
  const list = $('#character-list'), search = $('#search'), group = $('#group');
  const reader = $('#reader');
  const tabs = [...document.querySelectorAll('[data-tab]')];
  let current = '', activeTab = 'scenes', poem = 0, filtered = records;
  const renderedPanels = new Set();
  let favorites = new Set();
  try { const saved = JSON.parse(localStorage.getItem('gujie-favorites') || '[]'); if (Array.isArray(saved)) favorites = new Set(saved.filter(id => byId.has(id))); } catch {}
  const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const btn = (text, label, action) => { const node = el('button', '', text); node.type = 'button'; if (label) node.setAttribute('aria-label', label); node.addEventListener('click', action); return node; };
  const searchable = new Map();
  function searchText(p) {
    if(!searchable.has(p.id)) searchable.set(p.id,[p.name,p.tagline,p.group,p.role,p.summary,...p.life,...p.moves.flat(),...p.scenes.flatMap(([title,text,source,passage])=>[title,text,source,...(passage?.paragraphs||[])]),...p.poems.map(q=>q.text)].join(' ').toLowerCase());
    return searchable.get(p.id);
  }
  for (const name of [...new Set(records.map(p=>p.group))]) group.add(new Option(name,name));
  group.add(new Option('我的收藏','favorites'));
  function renderList() {
    const phrase = search.value.trim().toLowerCase();
    filtered = records.filter(p => (!phrase || searchText(p).includes(phrase)) && (!group.value || (group.value === 'favorites' ? favorites.has(p.id) : p.group === group.value)));
    const oldScroll = list.scrollTop;
    const fragment = document.createDocumentFragment();
    for (const p of filtered) {
      const li = el('li');
      const button = btn('', '阅读'+p.name+'的档案', () => open(p.id, true));
      button.dataset.person = p.id;
      button.setAttribute('aria-current', String(p.id === current));
      button.classList.toggle('saved', favorites.has(p.id));
      button.append(el('span','person-name',p.name), el('span','person-group',p.group), el('span','person-tagline',p.tagline));
      li.append(button); fragment.append(li);
    }
    list.replaceChildren(fragment);
    list.scrollTop = oldScroll;
    $('#result-count').textContent = filtered.length + ' / ' + records.length + ' 位';
    $('#empty-results').hidden = filtered.length > 0;
    updatePager();
  }
  function updatePager() {
    const i = filtered.findIndex(p=>p.id===current);
    $('#previous-person').disabled = i <= 0;
    $('#next-person').disabled = i < 0 || i >= filtered.length - 1;
    if(i>0) $('#previous-person').setAttribute('aria-label','上一位：'+filtered[i-1].name);
    if(i>=0 && i<filtered.length-1) $('#next-person').setAttribute('aria-label','下一位：'+filtered[i+1].name);
  }
  function saveUrl(push=false) {
    const params = new URLSearchParams();
    if(activeTab!=='scenes') params.set('tab',activeTab);
    if(activeTab==='poems') params.set('poem',String(poem+1));
    const next = '#'+current+(params.size?'?'+params:'');
    if(location.hash !== next) history[push?'pushState':'replaceState'](null,'',next);
  }
  function updateBookmark() {
    const saved = favorites.has(current);
    $('#bookmark').setAttribute('aria-pressed',String(saved));
    $('#bookmark').textContent = saved ? '已收藏' : '收藏';
    $('#bookmark').setAttribute('aria-label',(saved?'取消收藏':'收藏')+byId.get(current).name);
  }
  function renderPoem() {
    const panel = $('#panel-poems'), poems = byId.get(current).poems;
    panel.replaceChildren();
    if(!poems.length) { panel.append(el('p','empty-poem','暂无收录诗句。')); return; }
    poem = Math.min(Math.max(0, poem), poems.length-1);
    const q = poems[poem], heading = el('div','quote-header'), nav = el('nav','poem-pager');
    nav.setAttribute('aria-label','诗句与语录翻页');
    const previous = btn('←','上一首诗句或语录',()=>turnPoem(-1)), next = btn('→','下一首诗句或语录',()=>turnPoem(1));
    previous.disabled = next.disabled = poems.length < 2;
    const count = el('span','',`${poem+1} / ${poems.length}`);
    count.setAttribute('aria-live','polite');
    nav.append(previous,count,next); heading.append(el('span','quote-kind',q.kind+(q.title?' · '+q.title:'')),nav);
    panel.append(heading,el('blockquote','poem-text'+(q.text.length>220?' prose':''),q.text),el('p','poem-source',q.source.replace(/^书中\s*·?\s*/,'')));
  }
  function turnPoem(delta) {
    const poems = byId.get(current).poems;
    if(poems.length<2) return;
    poem = (poem+delta+poems.length)%poems.length;
    // Keep the active arrow in the DOM so repeated clicks and keyboard focus remain stable.
    const q = poems[poem];
    $('#panel-poems .poem-text').textContent = q.text;
    $('#panel-poems .poem-text').classList.toggle('prose',q.text.length>220);
    $('#panel-poems .poem-source').textContent = q.source.replace(/^书中\s*·?\s*/,'');
    $('#panel-poems .quote-kind').textContent = q.kind+(q.title?' · '+q.title:'');
    $('#panel-poems .poem-pager span').textContent = `${poem+1} / ${poems.length}`;
    saveUrl();
  }
  function setTab(name, update=true) {
    activeTab = tabs.some(t=>t.dataset.tab===name) ? name : 'scenes';
    ensurePanel(activeTab);
    for(const tab of tabs) {
      const selected = tab.dataset.tab===activeTab;
      tab.setAttribute('aria-selected',String(selected)); tab.tabIndex=selected?0:-1;
      $('#'+tab.getAttribute('aria-controls')).hidden = !selected;
    }
    if(update) saveUrl();
  }
  function ensurePanel(name) {
    if(renderedPanels.has(name)) return;
    const p=byId.get(current);
    if(name==='scenes') {
      const fragment=document.createDocumentFragment();
      for(const scene of p.scenes)fragment.append(renderScene(scene));
      $('#panel-scenes').replaceChildren(fragment);
    } else if(name==='life') {
      const life=$('#panel-life');life.replaceChildren(el('h3','','经历脉络'));
      const timeline=el('ol','life-list');for(const text of p.life)timeline.append(el('li','',text));life.append(timeline);
      if(p.moves.length){life.append(el('h3','','经典杀招与能力'));const moves=el('ul','move-list');for(const [name,kind,text] of p.moves){const li=el('li');li.append(el('strong','',name),el('small','',kind),el('p','',text));moves.append(li);}life.append(moves);}
    } else renderPoem();
    renderedPanels.add(name);
  }
  function renderScene([title,text,source,passage]) {
    const article=el('article','scene');
    article.append(el('h3','',title),el('p',passage?'scene-context':'',text));
    if(passage?.paragraphs?.length){
      const quotation=el('blockquote','scene-passage');
      quotation.setAttribute('aria-label','原文片段');
      const previewCount=Math.min(passage.paragraphs.length,Math.max(1,passage.previewCount||passage.paragraphs.length));
      for(const paragraph of passage.paragraphs.slice(0,previewCount))quotation.append(el('p','',paragraph));
      if(previewCount<passage.paragraphs.length){
        const more=el('details','scene-more'),summary=el('summary');
        summary.append(el('span','expand-label','继续阅读原文'),el('span','collapse-label','收起后文'));
        more.append(summary);
        const continuation=el('div','scene-continuation');
        for(const paragraph of passage.paragraphs.slice(previewCount))continuation.append(el('p','',paragraph));
        more.append(continuation);quotation.append(more);
      }
      article.append(quotation);
    }
    if(source)article.append(el('small','scene-source',source));
    return article;
  }
  function open(id, scroll=false, tab='scenes', poemIndex=0, update=true) {
    const p = byId.get(id) || records[0];
    const requestedTab=tabs.some(t=>t.dataset.tab===tab)?tab:'scenes';
    const requestedPoem=Math.min(Math.max(0,poemIndex),Math.max(0,p.poems.length-1));
    if(p.id===current) {
      if(poem!==requestedPoem){poem=requestedPoem;renderedPanels.delete('poems');}
      if(activeTab!==requestedTab||!renderedPanels.has(requestedTab))setTab(requestedTab,false);
      if(update)saveUrl(true);
      if(scroll){reader.scrollIntoView({behavior:'auto',block:'start'});reader.focus({preventScroll:true});}
      return;
    }
    current=p.id;poem=requestedPoem;renderedPanels.clear();
    for(const name of ['scenes','life','poems'])$('#panel-'+name).replaceChildren();
    reader.style.setProperty('--start',p.colors[0]); reader.style.setProperty('--end',p.colors[1]);
    $('#record-name').textContent=p.name; $('#record-tagline').textContent=p.tagline;
    $('#record-group').textContent=p.group; $('#record-role').textContent=p.role;
    $('#record-summary').textContent=p.summary;
    const feature=$('#record-feature'),featureLink=$('#record-feature-link');
    feature.hidden=!p.feature;
    if(p.feature){featureLink.href=p.feature.href;featureLink.textContent=p.feature.label;}else{featureLink.removeAttribute('href');featureLink.textContent='';}
    const readings=$('#record-reading-links');readings.replaceChildren();
    const readingLinks=p.readingLinks||[];readings.hidden=!readingLinks.length;
    let readingTarget=readings;
    if(readingLinks.length>1){const group=el('details');group.append(el('summary','',`按卷阅读人物分析（${readingLinks.length}）`));readingTarget=el('div','record-reading-list');group.append(readingTarget);readings.append(group);}
    for(const item of readingLinks){const link=el('a','',item.label);link.href=item.href;readingTarget.append(link);}
    document.title=p.name+' · 蛊界档案馆';
    setTab(requestedTab,false);updateBookmark();
    list.querySelector('[aria-current="true"]')?.setAttribute('aria-current','false');
    list.querySelector(`[data-person="${current}"]`)?.setAttribute('aria-current','true');
    updatePager();if(update)saveUrl(true);
    if(scroll){reader.scrollIntoView({behavior:'auto',block:'start'});reader.focus({preventScroll:true});}
  }
  function restore() {
    const [id,query='']=location.hash.slice(1).split('?');
    if(!byId.has(id))return false;
    const params=new URLSearchParams(query), requested=Number(params.get('poem'));
    const index=Number.isInteger(requested)&&requested>0?requested-1:0;
    const tab=params.get('tab')||(params.has('poem')?'poems':'scenes');
    open(id,false,tab,index,false);
    return true;
  }
  search.addEventListener('input',renderList);group.addEventListener('change',renderList);
  $('#reset-search').addEventListener('click',()=>{search.value='';group.value='';renderList();search.focus();});
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>setTab(tab.dataset.tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();tabs[next].focus();setTab(tabs[next].dataset.tab);}});});
  $('#bookmark').addEventListener('click',()=>{if(favorites.has(current))favorites.delete(current);else favorites.add(current);try{localStorage.setItem('gujie-favorites',JSON.stringify([...favorites]));}catch{}updateBookmark();renderList();});
  for(const [selector,delta]of[['#previous-person',-1],['#next-person',1]])$(selector).addEventListener('click',()=>{const i=filtered.findIndex(p=>p.id===current);const next=filtered[i+delta];if(i>=0&&next)open(next.id,true);});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!document.activeElement.isContentEditable){event.preventDefault();search.focus();}});
  window.addEventListener('hashchange',restore);window.addEventListener('popstate',restore);
  renderList();if(!restore())open('fangyuan',false,'scenes',0,false);
})();
