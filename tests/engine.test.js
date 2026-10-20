'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../scroll-engine.js');

function fakeDoc() {
  const win = { innerWidth: 1400, innerHeight: 900,
    getComputedStyle: el => ({ overflowY: el.overflowY || 'visible', display: 'block', visibility: 'visible' }) };
  const root = { nodeType: 1, scrollHeight: 900, clientHeight: 900, scrollTop: 0,
    isConnected: true, parentElement: null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1400, height: 900, right: 1400, bottom: 900 }),
    contains: el => el === root || !!el.isDescendantOfRoot,
    matches: () => false };
  const doc = { scrollingElement: root, documentElement: root, body: root,
    querySelectorAll: () => [], elementsFromPoint: () => [] };
  const newEl = (id, rect, opts = {}) => ({
    id, nodeType: 1, isConnected: true, scrollHeight: opts.scrollHeight || 1800,
    clientHeight: opts.clientHeight || 650, scrollTop: opts.scrollTop || 0,
    overflowY: opts.overflowY || 'auto', parentElement: opts.parent || root,
    getBoundingClientRect: () => rect,
    contains: other => other === this || other?.parentElement?.id === id,
    matches: selector => (opts.matches || []).some(s => selector.includes(s))
  });
  return { doc, win, root, newEl };
}

test('scrollState clamps and reports accurate percent', () => {
  assert.deepEqual(engine.scrollState({ scrollHeight: 1300, clientHeight: 300, scrollTop: 500 }),
    { top: 500, max: 1000, percent: 50, isBottom: false });
  assert.equal(engine.scrollState({ scrollHeight: 900, clientHeight: 300, scrollTop: 599 }).isBottom, true);
  assert.equal(engine.scrollState(null).percent, 100);
});

test('canScroll rejects nonoverflow, fixed size, and disconnected nodes', () => {
  const { doc, win, newEl } = fakeDoc();
  const rect = { left: 500, right: 1300, top: 50, bottom: 850, width: 800, height: 800 };
  assert.equal(engine.canScroll(newEl('pane', rect), doc, win), true);
  assert.equal(engine.canScroll(newEl('panel', rect, { overflowY: 'hidden' }), doc, win), false);
  const small = newEl('short', rect, { scrollHeight: 680, clientHeight: 650 });
  assert.equal(engine.canScroll(small, doc, win), false);
});

test('rankScrollers prefers message pane over scrolling left sidebar', () => {
  const { doc, win, root, newEl } = fakeDoc();
  root.scrollHeight = 2700;
  const sidebar = newEl('sidebar', { left: 0, right: 350, width: 350, top: 0, bottom: 900, height: 900 });
  const pane = newEl('conversation', { left: 430, right: 1400, width: 970, top: 70, bottom: 820, height: 750 },
    { matches: ['overflow-y-auto'] });
  const msg1 = { nodeType: 1, parentElement: pane };
  const msg2 = { nodeType: 1, parentElement: pane };
  pane.contains = el => el === msg1 || el === msg2;
  root.contains = () => true;
  doc.querySelectorAll = selector => selector.includes('conversation-turn') ? [msg1, msg2] : [sidebar, pane];
  doc.elementsFromPoint = () => [pane];
  const ranked = engine.rankScrollers(doc, win);
  assert.equal(ranked[0].el, pane);
  assert.equal(ranked.some(x => x.el === sidebar), false);
});

test('setScroll clamps destination and catches buggy scrollTo', () => {
  const item = { scrollHeight: 1000, clientHeight: 200, scrollTop: 0,
    scrollTo({ top }) { this.scrollTop = top; } };
  assert.equal(engine.setScroll(item, 2000), true);
  assert.equal(item.scrollTop, 800);
  engine.setScroll(item, -300);
  assert.equal(item.scrollTop, 0);
  const buggy = { scrollHeight: 900, clientHeight: 100, scrollTop: 0,
    scrollTo() { throw new Error('Unsupported smooth scroll'); } };
  assert.equal(engine.setScroll(buggy, 1000), true);
  assert.equal(buggy.scrollTop, 800);
});

test('manual selection finds nearest eligible nested pane', () => {
  const { doc, win, newEl } = fakeDoc();
  const rect = { left: 480, right: 1300, width: 820, top: 100, bottom: 830, height: 730 };
  const pane = newEl('pane', rect);
  const inner = newEl('inner', rect, { parent: pane, scrollHeight: 690, clientHeight: 650 });
  const text = { nodeType: 1, parentElement: inner };
  assert.equal(engine.closestScrollable(text, doc, win), pane);
});
