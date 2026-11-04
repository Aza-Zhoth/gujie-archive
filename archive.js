(() => {
  'use strict';
  const records = window.ARCHIVE_DATA;
  const byId = new Map(records.map(p => [p.id, p]));
  const $ = selector => document.querySelector(selector);
  const list = $('#character-list'), search = $('#search'), group = $('#group');
  const reader = $('#reader');
  const archiveTitle = document.title;
  const tabs = [...document.querySelectorAll('[data-tab]')];
  let current = '', activeTab = 'scenes', poem = 0, sceneIndex = -1, filtered = records;
  const renderedPanels = new Set();
  const techniqueLinks=window.PROFILE_TECHNIQUES||{};
  let favorites = new Set();
  try { const saved = JSON.parse(localStorage.getItem('gujie-favorites') || '[]'); if (Array.isArray(saved)) favorites = new Set(saved.filter(id => byId.has(id))); } catch {}
  const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const btn = (text, label, action) => { const node = el('button', '', text); node.type = 'button'; if (label) node.setAttribute('aria-label', label); node.addEventListener('click', action); return node; };
  const searchable = new Map();
  function searchText(p) {
    if(!searchable.has(p.id)) searchable.set(p.id,[p.name,p.tagline,p.group,p.role,p.summary,p.personality||'',...p.life,...p.moves.flat(),...(techniqueLinks[p.id]||[]).flatMap(t=>[t.name,t.path,t.description]),...p.scenes.flatMap(([title,text,source,passage])=>[title,text,source,...(passage?.paragraphs||[])]),...p.poems.map(q=>q.text)].join(' ').toLowerCase());
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
    if(activeTab==='scenes'&&sceneIndex>=0)params.set('scene',String(sceneIndex+1));
    const next = '#'+current+(params.size?'?'+params:'');
    if(location.hash !== next) history[push?'pushState':'replaceState'](null,'',next);
    document.title=byId.get(current).name+' · 蛊界档案馆';
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
    rememberReading();
  }
  function setTab(name, update=true) {
    activeTab = tabs.some(t=>t.dataset.tab===name) ? name : 'scenes';
    ensurePanel(activeTab);
    for(const tab of tabs) {
      const selected = tab.dataset.tab===activeTab;
      tab.setAttribute('aria-selected',String(selected)); tab.tabIndex=selected?0:-1;
      $('#'+tab.getAttribute('aria-controls')).hidden = !selected;
    }
    if(update){sceneIndex=-1;saveUrl();rememberReading();}
  }
  function ensurePanel(name) {
    if(renderedPanels.has(name)) return;
    const p=byId.get(current);
    if(name==='scenes') {
      const fragment=document.createDocumentFragment();
      for(const [i,scene] of p.scenes.entries()){
        const article=renderScene(scene);
        article.id='scene-'+p.id+'-'+(i+1);
        const reading=window.SCENE_READINGS?.[article.id];
        if(reading){
          const link=el('a','scene-reading-link',reading.label+' →');
          link.href=reading.href;
          article.append(link);
        }
        fragment.append(article);
      }
      $('#panel-scenes').replaceChildren(fragment);
    } else if(name==='life') {
      const life=$('#panel-life');life.replaceChildren();
      if(p.personality)life.append(el('h3','','个性与选择'),el('p','personality-copy',p.personality));
      life.append(el('h3','','经历脉络'));
      const timeline=el('ol','life-list');for(const text of p.life)timeline.append(el('li','',text));life.append(timeline);
      const related=techniqueLinks[p.id]||[];
      const simpleName=s=>s.replace(/（.*?）/g,'').replace(/仙蛊$/,'蛊');
      const linked=new Set();
      if(p.moves.length){life.append(el('h3','','经典杀招与能力'));const moves=el('ul','move-list');for(const [name,kind,text] of p.moves){const li=el('li'),strong=el('strong');const found=related.find(t=>simpleName(t.name)===simpleName(name));if(found){const a=el('a','',name);a.href='techniques.html#entry='+found.id;strong.append(a);linked.add(found.id);}else strong.textContent=name;li.append(strong,el('small','',kind),el('p','',text));moves.append(li);}life.append(moves);}
      if(related.length){
        life.append(el('h3','additional-techniques-heading','关联蛊虫、杀招与秘境'));
        const all=el('a','all-techniques-link','在大全中查看关联条目（'+related.length+'）');all.href='techniques.html#person='+p.id;life.append(all);
        for(const kind of ['蛊虫','杀招','蛊屋','蛊阵与战阵','天地秘境']){
          const rows=related.filter(t=>t.kind===kind&&!linked.has(t.id));if(!rows.length)continue;
          const group=el('details','profile-technique-group');group.open=rows.length<=4;group.append(el('summary','',kind+' · '+rows.length+'条'));
          const ul=el('ul','move-list');for(const t of rows){const li=el('li'),a=el('a','',t.name);a.href='techniques.html#entry='+t.id;const strong=el('strong');strong.append(a);li.append(strong,el('small','',[t.kind,t.path].filter(Boolean).join(' · ')));if(t.description)li.append(el('p','',t.description));else if(t.source)li.append(el('p','technique-source-link',t.source));ul.append(li);}group.append(ul);life.append(group);
        }
      }
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
      if(update)sceneIndex=-1;
      if(poem!==requestedPoem){poem=requestedPoem;renderedPanels.delete('poems');}
      if(activeTab!==requestedTab||!renderedPanels.has(requestedTab))setTab(requestedTab,false);
      if(update)saveUrl(true);
      if(scroll){reader.scrollIntoView({behavior:'auto',block:'start'});reader.focus({preventScroll:true});rememberReading();}
      return;
    }
    current=p.id;poem=requestedPoem;sceneIndex=-1;renderedPanels.clear();
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
    setTab(requestedTab,false);updateBookmark();
    list.querySelector('[aria-current="true"]')?.setAttribute('aria-current','false');
    list.querySelector(`[data-person="${current}"]`)?.setAttribute('aria-current','true');
    updatePager();if(update)saveUrl(true);
    if(scroll){reader.scrollIntoView({behavior:'auto',block:'start'});reader.focus({preventScroll:true});}
    if(scroll)rememberReading();
  }
  function rememberReading(){
    const p=byId.get(current);if(!p)return;
    const params=new URLSearchParams();let label='名场面';
    if(activeTab==='life'){params.set('tab','life');label='经历与能力';}
    if(activeTab==='poems'){params.set('tab','poems');params.set('poem',poem+1);label=p.poems[poem]?.title||'诗句与语录';}
    if(activeTab==='scenes'&&sceneIndex>=0){params.set('scene',sceneIndex+1);label=p.scenes[sceneIndex][0];}
    window.ArchiveReading?.remember({href:'index.html#'+current+(params.size?'?'+params:''),title:p.name,label});
  }
  function restore() {
    const [id,query='']=location.hash.slice(1).split('?');
    if(!byId.has(id)){document.title=archiveTitle;return false;}
    document.title=byId.get(id).name+' · 蛊界档案馆';
    const params=new URLSearchParams(query), requested=Number(params.get('poem'));
    const index=Number.isInteger(requested)&&requested>0?requested-1:0;
    const tab=params.get('tab')||(params.has('poem')?'poems':'scenes');
    open(id,false,tab,index,false);
    const scene=Number(params.get('scene'));
    if(activeTab==='scenes'&&Number.isInteger(scene)&&scene>0&&scene<=byId.get(id).scenes.length){
      sceneIndex=scene-1;const target=document.getElementById('scene-'+id+'-'+scene);target.tabIndex=-1;
      requestAnimationFrame(()=>{target.scrollIntoView({block:'start'});target.focus({preventScroll:true});});
    }else{sceneIndex=-1;requestAnimationFrame(()=>{reader.scrollIntoView({block:'start'});reader.focus({preventScroll:true});});}
    rememberReading();
    return true;
  }
  search.addEventListener('input',renderList);group.addEventListener('change',renderList);
  $('#reset-search').addEventListener('click',()=>{search.value='';group.value='';renderList();search.focus();});
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>setTab(tab.dataset.tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();tabs[next].focus();setTab(tabs[next].dataset.tab);}});});
  $('#bookmark').addEventListener('click',()=>{if(favorites.has(current))favorites.delete(current);else favorites.add(current);try{localStorage.setItem('gujie-favorites',JSON.stringify([...favorites]));}catch{}updateBookmark();renderList();});
  for(const [selector,delta]of[['#previous-person',-1],['#next-person',1]])$(selector).addEventListener('click',()=>{const i=filtered.findIndex(p=>p.id===current);const next=filtered[i+delta];if(i>=0&&next)open(next.id,true);});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!document.activeElement.isContentEditable){event.preventDefault();search.focus();}});
  window.addEventListener('hashchange',restore);window.addEventListener('popstate',restore);
  $('#panel-scenes').addEventListener('click',event=>{const scene=event.target.closest('.scene');if(!scene)return;sceneIndex=[...$('#panel-scenes').children].indexOf(scene);saveUrl();rememberReading();});
  let progressTimer,positionTouched=false;
  function rememberPosition(){
    if(!positionTouched||!current||reader.getBoundingClientRect().top>innerHeight||reader.getBoundingClientRect().bottom<0)return;
    if(activeTab==='scenes'){const scenes=[...$('#panel-scenes').children];let index=-1;for(let i=0;i<scenes.length;i++){if(scenes[i].getBoundingClientRect().top<=150)index=i;else break;}sceneIndex=index;}
    rememberReading();
  }
  window.addEventListener('scroll',()=>{positionTouched=true;clearTimeout(progressTimer);progressTimer=setTimeout(rememberPosition,350);},{passive:true});
  window.addEventListener('pagehide',()=>{clearTimeout(progressTimer);rememberPosition();});
  renderList();if(!restore())open('fangyuan',false,'scenes',0,false);
})();
