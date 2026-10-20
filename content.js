/* CrownScroll - floating controls on ChatGPT. Runs in isolated world. */
(() => {
  'use strict';
  if (window.__chatflowNavigatorInitialized) return;
  const ENGINE = globalThis.ChatFlowScrollEngine;
  // Do not lock out recovery if the dependency failed to load on a previous try.
  if (!ENGINE) { console.warn('[CrownScroll] Scroll engine unavailable; retry from the popup.'); return; }
  window.__chatflowNavigatorInitialized = true;
  const SETTINGS = Object.freeze({ enabled: true, theme: 'auto', position: 'right-middle', mode: 'thumbwheel', sensitivity: 'normal' });
  const VALID_THEMES = new Set(['auto', 'light', 'dark']);
  const VALID_POSITIONS = new Set(['right-middle', 'right-lower', 'left-middle']);
  const VALID_MODES = new Set(['classic', 'thumbwheel']);
  const VALID_SENSITIVITIES = new Set(['gentle', 'normal', 'fast']);
  const SPEEDS = Object.freeze({ gentle: 0.5, normal: 1, fast: 2 });
  const LOG = '[CrownScroll]';
  let preferences = { ...SETTINGS };
  let host = null;
  let shadow = null;
  let observer = null;
  let target = null;
  let manual = false;
  let picking = false;
  let route = location.href;
  let refreshing = false;
  let lastRefresh = 0;
  let refreshTimeout = 0;
  let stepTimers = [];
  let toastTimer = 0;
  let ticker = 0;
  let pickKeyListener = null;
  let pickClickListener = null;
  let collapsed = false;
  let dragPointer = null;
  let dragY = 0;

  function warn(message, err) { console.warn(LOG, message, err || ''); }
  function validated(settings) {
    return {
      enabled: settings.enabled !== false,
      theme: VALID_THEMES.has(settings.theme) ? settings.theme : 'auto',
      position: VALID_POSITIONS.has(settings.position) ? settings.position : 'right-middle',
      mode: VALID_MODES.has(settings.mode) ? settings.mode : 'classic',
      sensitivity: VALID_SENSITIVITIES.has(settings.sensitivity) ? settings.sensitivity : 'normal'
    };
  }
  function icon(which) {
    const paths = {
      top: '<path d="M5 5h14M12 19V8m-5 5 5-5 5 5"/>',
      up: '<path d="m6 15 6-6 6 6"/>',
      down: '<path d="m6 9 6 6 6-6"/>',
      bottom: '<path d="M5 19h14M12 5v11m-5-5 5 5 5-5"/>',
      pick: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/><circle cx="12" cy="12" r="3"/>',
      close: '<path d="m8 10 4 4 4-4"/>',
      open: '<path d="m8 14 4-4 4 4"/>'
    };
    return `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[which]}</svg>`;
  }
  const STYLE = `
    :host { all: initial; position: fixed; top: 50%; right: 14px; transform: translateY(-50%);
      z-index: 2147483646; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
      color-scheme: light; --cf-bg: #fffdfa; --cf-fg: #29262d; --cf-muted: #756e79;
      --cf-line: #ded8e1; --cf-hover: #f2ebf4; --cf-active: #62409e;
      --cf-shadow: 0 8px 28px rgba(40, 30, 48, .18); }
    :host([data-position="right-lower"]) { top: auto; bottom: 100px; transform: none; }
    :host([data-position="left-middle"]) { left: 14px; right: auto; }
    :host([data-theme="dark"]) { color-scheme: dark; --cf-bg: #252327; --cf-fg: #f2edf3;
      --cf-muted: #bbb2be; --cf-line: #4b454f; --cf-hover: #3d3545; --cf-active: #d7bcff;
      --cf-shadow: 0 8px 28px rgba(0, 0, 0, .48); }
    *, *::before, *::after { box-sizing: border-box; }
    .rail { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px;
      width: 48px; border: 1px solid var(--cf-line); border-radius: 17px;
      background: var(--cf-bg); color: var(--cf-fg); box-shadow: var(--cf-shadow); }
    button { display: grid; place-items: center; width: 35px; height: 35px; padding: 0;
      background: transparent; border: none; border-radius: 10px; color: var(--cf-fg);
      cursor: pointer; transition: background .14s ease, color .14s ease; }
    button:hover { background: var(--cf-hover); color: var(--cf-active); }
    button:focus-visible { outline: 2px solid var(--cf-active); outline-offset: 1px; }
    button:disabled { opacity: .35; cursor: default; }
    /* Optional vertical knurled thumbwheel. Its ribs rotate in the direction of travel. */
    .roller-frame { display: none; flex-direction: column; align-items: center; padding: 4px 3px 2px;
      border: 1px solid var(--cf-line); border-radius: 12px; background: var(--cf-hover); }
    :host([data-mode="thumbwheel"][data-collapsed="false"]) .roller-frame { display: flex; }
    .roller-well { padding: 5px 4px; border-radius: 10px; background: #0d0e12;
      box-shadow: inset 0 2px 6px #000c, 0 1px 1px #fffa; }
    .roller-wheel { position: relative; display: block; box-sizing: border-box; width: 29px; height: 118px;
      border-radius: 7px; overflow: hidden; touch-action: none; user-select: none; cursor: ns-resize;
      outline-offset: 4px; border: 1px solid #77787e;
      background: linear-gradient(to right, #17191d 0%, #55575d 12%, #a6a8aa 31%, #e0dedd 48%,
        #adafb1 65%, #44474f 88%, #17181c 100%);
      box-shadow: inset 3px 0 5px #08090c88, inset -3px 0 6px #090a0cbb, 0 1px 1px #fff4; }
    .roller-wheel::before { content: ''; position: absolute; inset: 0; pointer-events: none;
      background: repeating-linear-gradient(to bottom,
        #060608b0 0px, #24252aa8 1px, #e2e3e4a8 2px, #b3b4b696 3px, #1a1b21af 5px, #0b0b0fbd 7px);
      background-position: 0 var(--cf-wheel-phase, 0px); background-size: 100% 8px;
      mix-blend-mode: multiply; }
    .roller-wheel::after { content: ''; position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(to right, #090a0ed9, transparent 24%, #ffffff35 49%, transparent 78%, #090a0ed9);
      box-shadow: inset 0 7px 9px #08090cb3, inset 0 -7px 9px #08090cb3; }
    .roller-wheel:hover { border-color: #d9c6f0; }
    .roller-wheel:focus-visible { outline: 2px solid var(--cf-active); }
    .roller-wheel:active { cursor: grabbing; }
    .roller-wheel[aria-disabled="true"] { opacity: .48; cursor: not-allowed; }
    .roller-label { font-size: 9px; letter-spacing: 1px; font-weight: 750; color: var(--cf-muted); margin-top: 6px; }
    .roller-hint { font-size: 8px; font-weight: 600; color: var(--cf-muted); margin-bottom: 3px; }
    .divider { height: 1px; width: 24px; background: var(--cf-line); margin: 2px auto; }
    .meter { color: var(--cf-active); font-weight: 700; font-size: 11px; line-height: 17px;
      letter-spacing: -.25px; font-variant-numeric: tabular-nums; }
    .picked { color: var(--cf-active); background: var(--cf-hover); }
    .compact { display: none; }
    :host([data-collapsed="true"]) .full { display: none; }
    :host([data-collapsed="true"]) .compact { display: grid; }
    .toast { position: absolute; right: 58px; top: 50%; transform: translateY(-50%);
      width: max-content; max-width: min(300px, calc(100vw - 95px)); padding: 9px 12px;
      font-size: 12px; font-weight: 500; line-height: 1.45; border: 1px solid var(--cf-line);
      background: var(--cf-bg); color: var(--cf-fg); box-shadow: var(--cf-shadow);
      border-radius: 10px; pointer-events: none; }
    :host([data-position="left-middle"]) .toast { right: auto; left: 58px; }
    .toast[hidden] { display: none; }
    @media (prefers-reduced-motion: reduce) { button { transition: none; } }
  `;

  function mount() {
    if (host?.isConnected || !document.documentElement) return;
    // ChatGPT may replace parts of the page. Detached UI is remounted cleanly.
    if (host && !host.isConnected) unmount();
    host = document.createElement('div');
    host.id = 'chatflow-navigator-extension-root';
    host.setAttribute('aria-label', 'CrownScroll');
    // Critical geometry is also inline so host-page style changes cannot hide the rail.
    host.style.setProperty('position', 'fixed', 'important');
    host.style.setProperty('z-index', '2147483647', 'important');
    host.style.setProperty('visibility', 'visible', 'important');
    host.style.setProperty('opacity', '1', 'important');
    host.style.setProperty('pointer-events', 'auto', 'important');
    shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    shadow.append(style);
    const rail = document.createElement('div');
    rail.className = 'rail';
    rail.setAttribute('role', 'group');
    rail.setAttribute('aria-label', 'Conversation navigation');
    rail.innerHTML = `
      <button class="full" type="button" data-action="top" aria-label="Jump to beginning" title="Beginning · Alt+Shift+↑">${icon('top')}</button>
      <button class="full" type="button" data-action="up" aria-label="Scroll up one page" title="Up one page">${icon('up')}</button>
      <div class="roller-frame full"><div class="roller-hint">SCROLL</div>
        <div class="roller-well"><div class="roller-wheel" role="spinbutton" tabindex="0"
          aria-label="Vertical thumbwheel for conversation scrolling" aria-valuemin="0"
          aria-valuemax="100" aria-valuenow="0" aria-disabled="false"
          title="Drag up or down, use the mouse wheel, or press arrows when focused"></div></div>
        <div class="roller-label">CROWN</div></div>
      <span class="meter full" id="meter" role="status" aria-live="off">–</span>
      <button class="full" type="button" data-action="down" aria-label="Scroll down one page" title="Down one page">${icon('down')}</button>
      <button class="full" type="button" data-action="bottom" aria-label="Jump to latest message" title="Latest message · Alt+Shift+↓">${icon('bottom')}</button>
      <span class="divider full"></span>
      <button class="full" type="button" data-action="pick" aria-label="Pick scrolling area" title="Choose scroll area manually">${icon('pick')}</button>
      <button class="full" type="button" data-action="collapse" aria-label="Minimize navigation" title="Minimize">${icon('close')}</button>
      <button class="compact" type="button" data-action="expand" aria-label="Expand navigation" title="Expand navigation">${icon('open')}</button>`;
    shadow.append(rail);
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.hidden = true;
    shadow.append(toast);
    rail.addEventListener('click', onButton);
    const roller = rail.querySelector('.roller-wheel');
    roller.addEventListener('wheel', onThumbwheelWheel, { passive: false });
    roller.addEventListener('pointerdown', onThumbwheelPointerDown);
    roller.addEventListener('pointermove', onThumbwheelPointerMove);
    roller.addEventListener('pointerup', onThumbwheelPointerEnd);
    roller.addEventListener('pointercancel', onThumbwheelPointerEnd);
    roller.addEventListener('keydown', onThumbwheelKeydown);
    (document.body || document.documentElement).append(host);
    updateHostSettings();
    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('wheel', cancelJump, { capture: true, passive: true });
    document.addEventListener('touchstart', cancelJump, { capture: true, passive: true });
    document.addEventListener('keydown', onShortcut, true);
    window.addEventListener('resize', requestRefresh, { passive: true });
    window.addEventListener('popstate', onRouteChange);
    observer = new MutationObserver(requestRefresh);
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    ticker = window.setInterval(() => {
      if (!host?.isConnected && preferences.enabled) { mount(); return; }
      onRouteChange(); requestRefresh();
    }, 1600);
    requestRefresh();
  }

  function unmount() {
    cancelJump();
    dragPointer = null;
    finishPicking();
    if (observer) { observer.disconnect(); observer = null; }
    if (ticker) { clearInterval(ticker); ticker = 0; }
    if (refreshTimeout) { clearTimeout(refreshTimeout); refreshTimeout = 0; }
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = 0; }
    document.removeEventListener('scroll', onScroll, true);
    document.removeEventListener('wheel', cancelJump, true);
    document.removeEventListener('touchstart', cancelJump, true);
    document.removeEventListener('keydown', onShortcut, true);
    window.removeEventListener('resize', requestRefresh);
    window.removeEventListener('popstate', onRouteChange);
    if (host) host.remove();
    host = null; shadow = null; target = null; manual = false;
  }

  function hostIsVisible() {
    if (!host?.isConnected) return false;
    const box = host.getBoundingClientRect();
    const style = window.getComputedStyle(host);
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      Number(style.opacity) > 0 && box.width >= 30 && box.height >= 30 &&
      box.right > 0 && box.left < window.innerWidth &&
      box.bottom > 0 && box.top < window.innerHeight;
  }

  function updateHostSettings() {
    if (!host) return;
    host.dataset.position = preferences.position;
    const theme = preferences.theme === 'auto'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : preferences.theme;
    host.dataset.theme = theme;
    host.dataset.collapsed = String(collapsed);
    host.dataset.mode = preferences.mode;
    // Position the actual host, not just its shadow-root styles.
    host.style.setProperty('left', preferences.position === 'left-middle' ? '14px' : 'auto', 'important');
    host.style.setProperty('right', preferences.position === 'left-middle' ? 'auto' : '14px', 'important');
    host.style.setProperty('top', preferences.position === 'right-lower' ? 'auto' : '50%', 'important');
    host.style.setProperty('bottom', preferences.position === 'right-lower' ? '100px' : 'auto', 'important');
    host.style.setProperty('transform', preferences.position === 'right-lower' ? 'none' : 'translateY(-50%)', 'important');
  }

  function onRouteChange() {
    if (location.href === route) return;
    route = location.href;
    target = null;
    manual = false;
    finishPicking();
    cancelJump();
    requestRefresh();
  }

  function chooseTarget() {
    if (manual && target && target.isConnected && ENGINE.canScroll(target, document, window)) return target;
    manual = false;
    const ranking = ENGINE.rankScrollers(document, window);
    target = ranking.length ? ranking[0].el : null;
    return target;
  }

  function requestRefresh() {
    if (!host || refreshing) return;
    const delay = Math.max(0, 350 - (Date.now() - lastRefresh));
    refreshing = true;
    refreshTimeout = window.setTimeout(() => {
      refreshing = false;
      lastRefresh = Date.now();
      onRouteChange();
      if (host) { chooseTarget(); renderState(); }
    }, delay);
  }

  function onScroll() { if (host && !refreshing) requestRefresh(); }
  function renderState() {
    if (!shadow || !host) return;
    const m = shadow.getElementById('meter');
    const state = ENGINE.scrollState(target);
    m.textContent = target ? `${state.percent}%` : '–';
    m.title = target ? `Conversation scroll ${state.percent}%${manual ? ' · manually selected' : ''}` : 'No scrollable conversation found';
    const roller = shadow.querySelector('.roller-wheel');
    if (roller) {
      roller.setAttribute('aria-valuenow', String(state.percent));
      roller.setAttribute('aria-valuetext', `${state.percent} percent through conversation`);
      roller.setAttribute('aria-disabled', String(!target));
      // Visually synchronize with ordinary page-wheel/keyboard scrolling too.
      const phase = ((state.top / 6) % 8 + 8) % 8;
      roller.style.setProperty('--cf-wheel-phase', `${phase.toFixed(2)}px`);
    }
    const pickButton = shadow.querySelector('[data-action="pick"]');
    if (pickButton) pickButton.classList.toggle('picked', manual || picking);
    for (const action of ['top', 'up', 'down', 'bottom']) {
      const btn = shadow.querySelector(`[data-action="${action}"]`);
      if (btn) btn.disabled = !target;
    }
  }

  function showToast(message, ms = 2800) {
    if (!shadow) return;
    const el = shadow.querySelector('.toast');
    el.textContent = message;
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { if (el.isConnected) el.hidden = true; }, ms);
  }

  function cancelJump() {
    for (const t of stepTimers) clearTimeout(t);
    stepTimers = [];
  }

  function performJump(boundary) {
    finishPicking();
    cancelJump();
    const initial = chooseTarget();
    if (!initial) { showToast('No scroll area found. Open a chat, then try again.'); return; }
    // Repeat a finite number of times because ChatGPT can resize/stream after a jump.
    for (const ms of [0, 90, 220, 450, 850]) {
      stepTimers.push(setTimeout(() => {
        const el = manual ? target : chooseTarget();
        if (!el) return;
        const end = Math.max(0, el.scrollHeight - el.clientHeight);
        ENGINE.setScroll(el, boundary === 'bottom' ? end : 0, 'auto');
        renderState();
      }, ms));
    }
    stepTimers.push(setTimeout(() => {
      const el = target;
      if (!el) return;
      const s = ENGINE.scrollState(el);
      if ((boundary === 'bottom' && !s.isBottom) || (boundary === 'top' && s.top > 4)) {
        showToast('Scroll was blocked or content changed. Use the target picker (◎).', 4500);
      }
      renderState();
    }, 1080));
  }

  function performPage(direction) {
    finishPicking();
    cancelJump();
    const el = chooseTarget();
    if (!el) { showToast('No scroll area found.'); return; }
    const amount = Math.max(160, el.clientHeight * 0.78);
    ENGINE.setScroll(el, el.scrollTop + amount * direction, 'smooth');
    requestRefresh();
  }

  function spinBy(delta) {
    finishPicking();
    cancelJump();
    const el = chooseTarget();
    if (!el) { showToast('No conversation scroll area found. Try the target picker.'); return; }
    const multiplier = SPEEDS[preferences.sensitivity] || 1;
    // Relative input, NOT absolute position: this behaves like a rotating wheel.
    ENGINE.setScroll(el, el.scrollTop + delta * multiplier, 'auto');
    renderState();
  }

  function wheelPixelDelta(event) {
    // DOM_DELTA_PIXEL = 0, DOM_DELTA_LINE = 1, DOM_DELTA_PAGE = 2.
    if (event.deltaMode === 1) return event.deltaY * 36;
    if (event.deltaMode === 2) return event.deltaY * Math.max(200, target?.clientHeight || 600);
    return event.deltaY;
  }

  function onThumbwheelWheel(event) {
    event.preventDefault();
    event.stopPropagation();
    if (preferences.mode !== 'thumbwheel') return;
    spinBy(wheelPixelDelta(event));
  }

  function onThumbwheelPointerDown(event) {
    if (preferences.mode !== 'thumbwheel' || event.button !== 0 || !target) return;
    event.preventDefault();
    dragPointer = event.pointerId;
    dragY = event.clientY;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) { /* browser-specific */ }
    event.currentTarget.focus({ preventScroll: true });
  }

  function onThumbwheelPointerMove(event) {
    if (dragPointer !== event.pointerId) return;
    const delta = event.clientY - dragY;
    dragY = event.clientY;
    if (Math.abs(delta) > 0) spinBy(delta * 9);
  }

  function onThumbwheelPointerEnd(event) {
    if (dragPointer !== event.pointerId) return;
    dragPointer = null;
    try { if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId); } catch (_) { /* safe */ }
  }

  function onThumbwheelKeydown(event) {
    let delta = null;
    if (event.key === 'ArrowDown') delta = 90;
    else if (event.key === 'ArrowUp') delta = -90;
    else if (event.key === 'PageDown') delta = 550;
    else if (event.key === 'PageUp') delta = -550;
    else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); event.stopPropagation();
      performJump(event.key === 'Home' ? 'top' : 'bottom');
      return;
    }
    if (delta === null) return;
    event.preventDefault(); event.stopPropagation();
    spinBy(delta);
  }

  function onButton(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'top' || action === 'bottom') performJump(action);
    if (action === 'up' || action === 'down') performPage(action === 'up' ? -1 : 1);
    if (action === 'pick') { if (picking) finishPicking(); else startPicking(); renderState(); }
    if (action === 'collapse' || action === 'expand') {
      collapsed = action === 'collapse';
      updateHostSettings();
    }
  }

  function onShortcut(event) {
    if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;
    if (event.target && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/i.test(event.target.tagName))) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      performJump(event.key === 'ArrowDown' ? 'bottom' : 'top');
    }
  }

  function startPicking() {
    finishPicking();
    picking = true;
    showToast('Click inside the conversation to select its scroll area. Esc cancels.', 15000);
    pickClickListener = function (event) {
      if (host && event.composedPath().includes(host)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const selected = ENGINE.closestScrollable(event.target, document, window);
      if (!selected) { showToast('That location is not scrollable. Try the message area.', 4500); return; }
      target = selected;
      manual = true;
      finishPicking();
      showToast('Scroll area selected.', 1900);
      renderState();
    };
    pickKeyListener = function (event) {
      if (event.key === 'Escape') { event.stopImmediatePropagation(); finishPicking(); showToast('Selection cancelled.', 1200); }
    };
    document.addEventListener('click', pickClickListener, true);
    document.addEventListener('keydown', pickKeyListener, true);
  }

  function finishPicking() {
    if (pickClickListener) document.removeEventListener('click', pickClickListener, true);
    if (pickKeyListener) document.removeEventListener('keydown', pickKeyListener, true);
    pickClickListener = null;
    pickKeyListener = null;
    picking = false;
    if (shadow) renderState();
  }

  function applyPreferences(next) {
    preferences = validated({ ...preferences, ...next });
    dragPointer = null;
    if (!preferences.enabled) { unmount(); return; }
    if (!host?.isConnected) mount();
    updateHostSettings();
  }

  try {
    // The popup can check actual page injection and repair it without a tab reload.
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
      if (!message || typeof message !== 'object') return false;
      if (message.kind === 'CHATFLOW_PING') {
        respond({ alive: true, mounted: hostIsVisible(), enabled: preferences.enabled,
          position: preferences.position, mode: preferences.mode, targetFound: Boolean(target) });
        return false;
      }
      if (message.kind === 'CHATFLOW_SHOW') {
        preferences.enabled = true; collapsed = false;
        if (!host?.isConnected) mount();
        // Restore stacking position after page updates.
        if (host?.isConnected) (document.body || document.documentElement).append(host);
        updateHostSettings(); requestRefresh();
        showToast('Navigator active — use ↑ and ↓ to move through the chat.', 3000);
        respond({ alive: true, mounted: hostIsVisible() });
        return false;
      }
      return false;
    });
    chrome.storage.local.get(SETTINGS, items => {
      if (chrome.runtime.lastError) warn('Settings could not be read; using defaults.', chrome.runtime.lastError.message);
      applyPreferences(chrome.runtime.lastError ? SETTINGS : items);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      const next = {};
      for (const name of Object.keys(SETTINGS)) {
        if (changes[name]) next[name] = changes[name].newValue;
      }
      applyPreferences(next);
    });
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateHostSettings);
    }
  } catch (error) { warn('Unable to initialize.', error); }
})();
