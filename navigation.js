(() => {
  'use strict';
  if (!/^https?:$/.test(location.protocol)) return;
  // GitHub Pages uses literal HTML files, including under repository subpaths.
  const cleanRoutes = false;
  const siteBase = new URL('./', document.currentScript.src).pathname;
  const connection = navigator.connection;
  const conserveData = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
  const prefetched = new Set();
  const limit = 8;
  function readingURL(anchor) {
    if (!anchor || anchor.hasAttribute('download') || anchor.relList.contains('external')) return null;
    if (anchor.target && anchor.target !== '_self') return null;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin) return null;
    if (!url.pathname.startsWith(siteBase)) return null;
    const sitePath = '/' + url.pathname.slice(siteBase.length);
    if (!/^\/(?:index\.html|(?:search|scenes|techniques|reverse-flow-event|three-kings-event)(?:\.html)?|story(?:-map)?(?:\.html)?|columns(?:\.html|\/)?|columns\/(?:index\.html|(?:wushuai|xingxiu|honglian|fengjiuge|taozhu|longgong|wuji|wuyong|taibai)(?:\.html)?)|wushuai(?:\.html)?|renzu(?:\.html)?|stories\/[a-z-]+(?:\.html)?|volumes\/volume-[1-6](?:\.html)?)?$/.test(sitePath)) return null;
    if (cleanRoutes) {
      if (url.pathname === '/columns.html' || url.pathname === '/columns') url.pathname = '/columns/';
      else if (url.pathname.endsWith('/index.html')) url.pathname = url.pathname.slice(0, -10);
      else if (url.pathname.endsWith('.html')) url.pathname = url.pathname.slice(0, -5);
    }
    return url;
  }
  function normalize(anchor) {
    const url = readingURL(anchor);
    if (url && anchor.href !== url.href) anchor.href = url.href;
    return url;
  }
  function prefetch(anchor) {
    const url = normalize(anchor);
    if (!url || url.search || conserveData || prefetched.size >= limit || document.visibilityState === 'hidden') return;
    url.hash = '';
    if (url.href === location.href.split('#')[0] || prefetched.has(url.href)) return;
    const hint = document.createElement('link');
    if (!hint.relList.supports?.('prefetch')) return;
    prefetched.add(url.href);
    hint.rel = 'prefetch';
    hint.href = url.href;
    document.head.append(hint);
  }
  const anchorFor = event => event.target.closest?.('a[href]');
  for (const anchor of document.querySelectorAll('a[href]')) normalize(anchor);
  // Delegation covers the links rendered later by the character reader as well.
  document.addEventListener('click', event => normalize(anchorFor(event)), {capture:true});
  document.addEventListener('focusin', event => prefetch(anchorFor(event)));
  document.addEventListener('pointerdown', event => {
    if (event.button === 0) prefetch(anchorFor(event));
  }, {passive:true});
  let hoverTimer, hovered;
  document.addEventListener('pointerover', event => {
    const anchor = anchorFor(event);
    if (anchor === hovered) return;
    clearTimeout(hoverTimer);
    hovered = anchor;
    if (anchor) hoverTimer = setTimeout(() => prefetch(anchor), 80);
  }, {passive:true});
  document.addEventListener('pointerout', event => {
    if (hovered && !hovered.contains(event.relatedTarget)) {
      clearTimeout(hoverTimer);
      hovered = null;
    }
  }, {passive:true});
  function warmLikelyDestinations() {
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 180));
    idle(() => {
      for (const selector of ['.story-pager a:last-child','.back-link','.column-reading-link','.volume-reading-link','.site-header nav a']) {
        prefetch(document.querySelector(selector));
        if (prefetched.size >= 3) break;
      }
    }, {timeout:1200});
  }
  if (!conserveData) {
    if (document.readyState === 'complete') warmLikelyDestinations();
    else window.addEventListener('load', warmLikelyDestinations, {once:true});
  }
})();
