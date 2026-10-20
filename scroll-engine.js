/* CrownScroll: DOM scroll-container discovery. No network access. */
(function (root, make) {
  const api = make();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChatFlowScrollEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MESSAGE_SELECTOR = '[data-testid^="conversation-turn"], [data-message-author-role]';
  const CANDIDATE_SELECTOR = 'main, [role="main"], [class*="overflow-y-auto"], [class*="overflow-auto"], [data-testid*="conversation"]';

  function getRoot(doc) {
    return doc.scrollingElement || doc.documentElement;
  }

  function rectFor(el, doc, win) {
    if (el === getRoot(doc) || el === doc.body) {
      return { left: 0, top: 0, right: win.innerWidth, bottom: win.innerHeight,
        width: win.innerWidth, height: win.innerHeight };
    }
    return el.getBoundingClientRect();
  }

  function canScroll(el, doc, win) {
    if (!el || typeof el.scrollHeight !== 'number') return false;
    if (el.scrollHeight - el.clientHeight < 48) return false;
    if (el === getRoot(doc)) return true;
    if (!el.isConnected) return false;
    try {
      const style = win.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return /^(auto|scroll|overlay)$/.test(style.overflowY);
    } catch (_) { return false; }
  }

  function visibleEnough(el, doc, win) {
    const r = rectFor(el, doc, win);
    return r.height > 110 && r.width > 230 && r.right > win.innerWidth * 0.46 &&
      r.left < win.innerWidth * 0.86 && r.bottom > 90 && r.top < win.innerHeight - 90;
  }

  function addAncestors(set, element, doc) {
    let el = element;
    let depth = 0;
    while (el && depth < 28) {
      if (el.nodeType === 1) set.add(el);
      if (el === doc.documentElement) break;
      el = el.parentElement;
      depth += 1;
    }
  }

  function collectCandidates(doc, win) {
    const set = new Set([getRoot(doc)]);
    const markers = doc.querySelectorAll(MESSAGE_SELECTOR);
    if (markers.length) {
      addAncestors(set, markers[0], doc);
      addAncestors(set, markers[markers.length - 1], doc);
    }
    const semantic = doc.querySelectorAll(CANDIDATE_SELECTOR);
    for (let i = 0; i < Math.min(semantic.length, 220); i += 1) {
      addAncestors(set, semantic[i], doc);
    }
    if (typeof doc.elementsFromPoint === 'function') {
      const x = Math.round(win.innerWidth * 0.67);
      for (const p of [0.24, 0.5, 0.74]) {
        const list = doc.elementsFromPoint(x, Math.round(win.innerHeight * p));
        for (const el of list.slice(0, 10)) addAncestors(set, el, doc);
      }
    }
    return { elements: Array.from(set), markers };
  }

  function scoreCandidate(el, doc, win, markers) {
    if (!canScroll(el, doc, win) || !visibleEnough(el, doc, win)) return -Infinity;
    const r = rectFor(el, doc, win);
    const isRoot = el === getRoot(doc);
    const range = Math.max(0, el.scrollHeight - el.clientHeight);
    let score = Math.min(22, Math.log2(1 + range) * 2.0);
    score += Math.min(18, (Math.min(r.height, win.innerHeight) / win.innerHeight) * 18);
    if (r.left >= win.innerWidth * 0.2) score += 12;
    if (r.left >= win.innerWidth * 0.36) score += 6;
    if (r.right >= win.innerWidth * 0.75) score += 8;
    if (markers.length) {
      if (el.contains(markers[0])) score += 60;
      if (el.contains(markers[markers.length - 1])) score += 65;
    }
    try {
      if (el.matches('main, [role="main"]')) score += 7;
      if (el.matches('[class*="overflow-y-auto"], [class*="overflow-auto"]')) score += 15;
    } catch (_) { /* Unusual mock or detached node */ }
    if (isRoot) score -= 19; // Prefer actual message pane over whole document.
    return score;
  }

  function rankScrollers(doc, win) {
    const { elements, markers } = collectCandidates(doc, win);
    return elements.map(el => ({ el, score: scoreCandidate(el, doc, win, markers) }))
      .filter(item => Number.isFinite(item.score))
      .sort((a, b) => b.score - a.score);
  }

  function closestScrollable(element, doc, win) {
    let el = element;
    while (el && el.nodeType === 1) {
      if (canScroll(el, doc, win) && visibleEnough(el, doc, win)) return el;
      el = el.parentElement;
    }
    const top = getRoot(doc);
    return canScroll(top, doc, win) ? top : null;
  }

  function scrollState(el) {
    if (!el) return { top: 0, max: 0, percent: 100, isBottom: true };
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    const top = Math.max(0, Math.min(max, el.scrollTop || 0));
    const percent = max ? Math.round(top / max * 100) : 100;
    return { top, max, percent, isBottom: max - top <= 4 };
  }

  function setScroll(el, destination, behavior = 'auto') {
    if (!el) return false;
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    const top = Math.max(0, Math.min(max, destination));
    try {
      if (typeof el.scrollTo === 'function') el.scrollTo({ top, behavior });
      else el.scrollTop = top;
      return true;
    } catch (_) {
      try { el.scrollTop = top; return true; } catch (_) { return false; }
    }
  }

  return { getRoot, canScroll, visibleEnough, rankScrollers, closestScrollable,
    scrollState, setScroll, scoreCandidate };
});
