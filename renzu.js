(() => {
  'use strict';
  const chapters=window.RENZU_CHAPTERS;
  const $=selector=>document.querySelector(selector);
  const list=$('#chapter-list'), search=$('#chapter-search'), body=$('#chapter-body');
  let current=-1,size=18,renderedPhrase='';
  try{const saved=Number(localStorage.getItem('gujie-reading-size'));if(saved>=16&&saved<=26)size=saved;}catch{}
  const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  function applySize(){body.style.setProperty('--reading-size',size+'px');$('#font-smaller').disabled=size<=16;$('#font-larger').disabled=size>=26;}
  function renderList(){
    const phrase=search.value.trim();let count=0;const oldScroll=list.scrollTop;list.replaceChildren();
    chapters.forEach((chapter,i)=>{if(phrase&&!chapter.title.includes(phrase)&&!chapter.paragraphs.some(p=>p.includes(phrase)))return;count++;const li=el('li'),button=el('button',chapter.title);button.type='button';button.dataset.chapter=String(i);button.setAttribute('aria-current',String(i===current));button.addEventListener('click',()=>open(i,true));li.append(button);list.append(li);});
    list.scrollTop=oldScroll;$('#chapter-count').textContent=count+' / '+chapters.length+' 章';$('#chapter-empty').hidden=count>0;
  }
  function open(index,scroll=false,update=true){
    const next=Math.max(0,Math.min(chapters.length-1,index)),phrase=search.value.trim(),chapter=chapters[next];
    if(next===current&&phrase===renderedPhrase){if(update&&location.hash!=='#'+chapter.id)history.pushState(null,'','#'+chapter.id);if(scroll){$('#chapter-reader').scrollIntoView({behavior:'auto',block:'start'});$('#chapter-reader').focus({preventScroll:true});}return;}
    current=next;renderedPhrase=phrase;
    $('#chapter-title').textContent=chapter.title;document.title=chapter.title+' · 人祖传';
    $('#reading-status').textContent='第 '+(current+1)+' / '+chapters.length+' 章 · 约 '+Math.max(1,Math.ceil(chapter.paragraphs.join('').length/450))+' 分钟';
    const fragment=document.createDocumentFragment();for(const [i,text] of chapter.paragraphs.entries()){const p=el('p');p.id=chapter.id+'-p-'+(i+1);if(phrase&&text.includes(phrase)){const parts=text.split(phrase);parts.forEach((part,i)=>{if(i)p.append(el('mark',phrase));p.append(document.createTextNode(part));});}else p.textContent=text;fragment.append(p);}body.replaceChildren(fragment);
    for(const button of list.querySelectorAll('[data-chapter]'))button.setAttribute('aria-current',String(Number(button.dataset.chapter)===current));
    $('#chapter-prev').disabled=current===0;$('#chapter-next').disabled=current===chapters.length-1;
    if(update&&location.hash!=='#'+chapter.id)history.pushState(null,'','#'+chapter.id);
    try{localStorage.setItem('gujie-renzu-chapter',chapter.id);}catch{}
    if(scroll)window.ArchiveReading?.remember({href:'renzu.html#'+chapter.id,title:'人祖传',label:chapter.title});
    if(scroll){$('#chapter-reader').scrollIntoView({behavior:'auto',block:'start'});$('#chapter-reader').focus({preventScroll:true});}
  }
  function restore(){const [id,q='']=location.hash.slice(1).split('?'),i=chapters.findIndex(c=>id===c.id);if(i>=0){open(i,false,false);const n=Number(new URLSearchParams(q).get('paragraph'));if(Number.isInteger(n)&&n>0&&n<=chapters[i].paragraphs.length)requestAnimationFrame(()=>document.getElementById(id+'-p-'+n)?.scrollIntoView({block:'start'}));}}
  let progressTimer,positionTouched=false;
  function rememberPosition(){if(!positionTouched||current<0)return;const paragraphs=[...body.children];let low=0,high=paragraphs.length-1,index=0;while(low<=high){const mid=(low+high)>>1;if(paragraphs[mid].getBoundingClientRect().top<=140){index=mid;low=mid+1;}else high=mid-1;}if(paragraphs[index]?.getBoundingClientRect().top<innerHeight)window.ArchiveReading?.remember({href:'renzu.html#'+chapters[current].id+'?paragraph='+(index+1),title:'人祖传',label:chapters[current].title});}
  window.addEventListener('scroll',()=>{positionTouched=true;clearTimeout(progressTimer);progressTimer=setTimeout(rememberPosition,350);},{passive:true});
  window.addEventListener('pagehide',()=>{clearTimeout(progressTimer);rememberPosition();});
  search.addEventListener('input',()=>{renderList();open(current,false,false);});
  $('#chapter-prev').addEventListener('click',()=>{if(current>0)open(current-1,true);});$('#chapter-next').addEventListener('click',()=>{if(current<chapters.length-1)open(current+1,true);});
  for(const [selector,delta]of[['#font-smaller',-1],['#font-larger',1]])$(selector).addEventListener('click',()=>{size=Math.min(26,Math.max(16,size+delta));applySize();try{localStorage.setItem('gujie-reading-size',String(size));}catch{}});
  window.addEventListener('hashchange',restore);window.addEventListener('popstate',restore);
  let saved='';try{saved=localStorage.getItem('gujie-renzu-chapter')||'';}catch{}
  const hashIndex=chapters.findIndex(c=>location.hash.slice(1).split('?')[0]===c.id),savedIndex=chapters.findIndex(c=>c.id===saved);
  applySize();renderList();open(hashIndex>=0?hashIndex:savedIndex>=0?savedIndex:0,false,false);restore();
})();
