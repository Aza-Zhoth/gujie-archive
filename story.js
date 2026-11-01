(() => {
  'use strict';
  const tools = document.querySelector('.story-tools');
  if (!tools) return;
  const directory = document.querySelector('.story-directory');
  if (directory && matchMedia('(max-width:720px)').matches) directory.open=false;
  tools.hidden = false;
  const font = document.querySelector('#story-font');
  const applySize = value => document.body.style.setProperty('--story-size', value+'px');
  try {
    const saved = localStorage.getItem('gujie-story-size');
    if (['18','20','22'].includes(saved)) { font.value=saved; applySize(saved); }
  } catch {}
  font.addEventListener('change',()=>{
    applySize(font.value);
    try { localStorage.setItem('gujie-story-size',font.value); } catch {}
  });
  const expand = document.querySelector('#expand-sources');
  const sources = [...document.querySelectorAll('.source-more')];
  if (expand && sources.length) {
    const update = () => {
      const open = sources.every(el=>el.open);
      expand.setAttribute('aria-pressed',String(open));
      expand.textContent = open?'收起全部原文':'展开全部原文';
    };
    expand.addEventListener('click',()=>{
      const open=!sources.every(el=>el.open);
      for(const el of sources) el.open=open;
      update();
    });
    for(const el of sources) el.addEventListener('toggle',update);
  } else if (expand) expand.hidden=true;
  const links = [...document.querySelectorAll('.story-directory nav a')];
  if ('IntersectionObserver' in window) {
    const byHash=new Map(links.map(link=>[link.hash,link]));
    let activeLink;
    const observer=new IntersectionObserver(entries=>{
      let next;
      for(const entry of entries)if(entry.isIntersecting)next=byHash.get('#'+entry.target.id);
      if(next&&next!==activeLink){
        activeLink?.removeAttribute('aria-current');
        next.setAttribute('aria-current','location');
        activeLink=next;
      }
    },{rootMargin:'-5% 0px -65% 0px',threshold:0});
    document.querySelectorAll('.story-section').forEach(el=>observer.observe(el));
  }
})();
