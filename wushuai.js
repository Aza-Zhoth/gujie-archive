(() => {
  'use strict';
  const page = document.querySelector('.feature-page');
  const tools = document.querySelector('.reading-tools');
  const expand = document.querySelector('#expand-sources');
  const font = document.querySelector('#essay-font');
  const sources = [...document.querySelectorAll('.source-more,.source-secondary')];
  tools.hidden = false;
  function updateExpand() {
    const allOpen = sources.length > 0 && sources.every(source => source.open);
    expand.setAttribute('aria-pressed', String(allOpen));
    expand.textContent = allOpen ? '收起全部原文' : '展开全部原文';
  }
  expand.addEventListener('click', () => {
    const open = !sources.every(source => source.open);
    for (const source of sources) source.open = open;
    updateExpand();
  });
  for (const source of sources) source.addEventListener('toggle', updateExpand);
  font.addEventListener('change', () => {
    page.style.setProperty('--essay-size', font.value + 'px');
    try { localStorage.setItem('gujie-essay-size', font.value); } catch {}
  });
  try {
    const saved = localStorage.getItem('gujie-essay-size');
    if (['18','20','22'].includes(saved)) {
      font.value = saved;
      page.style.setProperty('--essay-size', saved + 'px');
    }
  } catch {}
  const nav = [...document.querySelectorAll('.essay-directory nav a')];
  if ('IntersectionObserver' in window) {
    const byHash=new Map(nav.map(link=>[link.hash,link]));
    let activeLink;
    const observer = new IntersectionObserver(entries => {
      let next;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        next=byHash.get('#'+entry.target.id);
      }
      if(next&&next!==activeLink){activeLink?.removeAttribute('aria-current');next.setAttribute('aria-current','location');activeLink=next;}
    }, {rootMargin:'-8% 0px -55% 0px',threshold:0});
    for (const section of document.querySelectorAll('.essay-section')) observer.observe(section);
  }
})();
