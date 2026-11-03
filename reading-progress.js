(() => {
  'use strict';
  const base=new URL('./',document.currentScript.src),key='gujie-reading-v1';
  const safe=href=>{
    try{const u=new URL(href,base);if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return null;
      const p=u.pathname.slice(base.pathname.length);
      if(!/^(?:index(?:\.html)?|renzu(?:\.html)?|(?:stories|volumes|columns)\/[a-z0-9-]+(?:\.html)?)$/.test(p))return null;
      return p+u.hash;
    }catch{return null;}
  };
  let recent=[];
  try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))recent=saved.filter(r=>r&&typeof r.title==='string'&&typeof r.label==='string'&&safe(r.href)&&r.title.length<180&&r.label.length<200).slice(0,12);}catch{}
  function remember(item){
    const href=safe(item.href);if(!href)return;
    const row={href,title:String(item.title).slice(0,170),label:String(item.label||'').slice(0,190)};
    recent=[row,...recent.filter(r=>r.href.split('#')[0]!==href.split('#')[0])].slice(0,12);
    try{localStorage.setItem(key,JSON.stringify(recent));}catch{}
  }
  const resultKey='gujie-result-return-v1';
  function internal(href){try{const u=new URL(href,base);if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return null;return u;}catch{return null;}}
  function identity(href){const u=internal(href);if(!u)return '';const p=u.pathname.slice(base.pathname.length).replace(/\.html$/,'').replace(/^index$/,'');return p+u.hash.split('?')[0];}
  function fromResults(item){
    const from=internal(item.from),target=internal(item.target);
    if(!from||!target||!/^\/(?:search|scenes)(?:\.html)?$/.test('/'+from.pathname.slice(base.pathname.length)))return;
    try{sessionStorage.setItem(resultKey,JSON.stringify({from:from.href,target:target.href,label:item.label==='返回名场面'?'返回名场面':'返回搜索结果',query:String(item.query||'').slice(0,40)}));}catch{}
  }
  window.ArchiveReading={remember,fromResults};
  try{
    const back=JSON.parse(sessionStorage.getItem(resultKey)||'null'),from=back&&internal(back.from);
    if(from&&/^\/(?:search|scenes)(?:\.html)?$/.test('/'+from.pathname.slice(base.pathname.length))&&identity(back.target)===identity(location.href)){
      const host=document.querySelector('#reader,#chapter-reader,.story-body,#catalogue-detail');
      if(host){const nav=document.createElement('nav');nav.className='result-return';nav.setAttribute('aria-label','返回查找结果');const a=document.createElement('a');a.href=from.href;a.textContent=back.label==='返回名场面'?'← 返回名场面':'← 返回搜索结果';nav.append(a);if(typeof back.query==='string'&&back.query){const note=document.createElement('span');note.textContent='“'+back.query.slice(0,40)+'”';nav.append(note);}host.prepend(nav);if(host.id==='catalogue-detail'){new MutationObserver(()=>{if(!host.querySelector(':scope > .result-return'))host.prepend(nav);}).observe(host,{childList:true});}}
    }
  }catch{}
  const local=location.pathname.slice(base.pathname.length)||'index.html';
  const isHome=/^(?:index(?:\.html)?)?$/.test(local);
  const saved=isHome?recent[0]:recent.find(r=>r.href.split('#')[0]===local);
  if(saved){
    const host=isHome?document.querySelector('.archive-cover'):document.querySelector('.story-heading,.reading-cover');
    if(host){
      const box=document.createElement('aside');box.className='reading-resume';box.setAttribute('aria-label','继续阅读');
      const copy=document.createElement('div'),label=document.createElement('p'),a=document.createElement('a');
      label.textContent='继续阅读';a.href=new URL(saved.href,base).href;a.textContent=saved.title+(saved.label?' · '+saved.label:'');copy.append(label,a);
      const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','移除这条阅读记录');close.addEventListener('click',()=>{recent=recent.filter(r=>r.href!==saved.href);try{localStorage.setItem(key,JSON.stringify(recent));}catch{}box.remove();});box.append(copy,close);host.after(box);
    }
  }
  // Stable paragraph anchors are generated from the existing article; do no work on other pages.
  const sections=[...document.querySelectorAll('.story-section[id]')];
  let touched=false,pending;
  function savePosition(){
    if(!touched||!sections.length)return;
    let low=0,high=sections.length-1,index=0;
    while(low<=high){const mid=(low+high)>>1;if(sections[mid].getBoundingClientRect().top<=140){index=mid;low=mid+1;}else high=mid-1;}
    const section=sections[index];
    if(section.getBoundingClientRect().top>140)return;
    // Folded paragraphs have a zero rectangle and must not enter position ordering.
    const visible=[...section.querySelectorAll('p[id]')].filter(p=>p.getClientRects().length);
    let point=section;
    for(const p of visible){if(p.getBoundingClientRect().top<=140)point=p;else break;}
    remember({href:local+'#'+point.id,title:document.querySelector('h1')?.textContent||document.title,label:section?.querySelector('h2')?.textContent||''});
  }
  if(sections.length){
    const originalLinks=[...document.querySelectorAll('.story-directory nav a')];
    let mobileDirectory;
    if(originalLinks.length){
      mobileDirectory=document.createElement('details');mobileDirectory.className='mobile-reading-directory';
      const summary=document.createElement('summary');summary.textContent='目录';mobileDirectory.append(summary);
      const nav=document.createElement('nav');nav.setAttribute('aria-label','随身阅读目录');
      for(const original of originalLinks){const a=document.createElement('a');a.href=original.getAttribute('href');a.textContent=original.textContent;nav.append(a);}
      mobileDirectory.append(nav);document.body.append(mobileDirectory);document.body.classList.add('has-mobile-directory');
      nav.addEventListener('click',event=>{const a=event.target.closest('a');if(a){mobileDirectory.open=false;let id;try{id=decodeURIComponent(a.hash.slice(1));}catch{return;}const target=document.getElementById(id);if(target){target.tabIndex=-1;requestAnimationFrame(()=>target.focus({preventScroll:true}));}}});
      document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mobileDirectory.open){mobileDirectory.open=false;summary.focus();}});
      document.addEventListener('click',event=>{if(mobileDirectory.open&&!mobileDirectory.contains(event.target))mobileDirectory.open=false;});
    }
    window.addEventListener('scroll',()=>{touched=true;clearTimeout(pending);pending=setTimeout(savePosition,350);},{passive:true});
    window.addEventListener('pagehide',()=>{clearTimeout(pending);savePosition();});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')savePosition();});
    // A direct search hit inside folded original text must be visible, too.
    let highlighted;
    function reveal(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const target=document.getElementById(id);if(!target)return;highlighted?.classList.remove('reading-target');target.classList.add('reading-target');highlighted=target;let parent=target.parentElement,opened=false;while(parent){if(parent.tagName==='DETAILS'&&!parent.open){parent.open=true;opened=true;}parent=parent.parentElement;}const section=target.closest('.story-section');if(section){remember({href:local+'#'+target.id,title:document.querySelector('h1')?.textContent||document.title,label:section.querySelector('h2')?.textContent||''});for(const a of mobileDirectory?.querySelectorAll('nav a')||[]){if(a.hash==='#'+section.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}}if(opened)requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));}
    reveal();window.addEventListener('hashchange',reveal);
  }
})();
