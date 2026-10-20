'use strict';

const defaults = { enabled: true, theme: 'auto', position: 'right-middle', mode: 'thumbwheel', sensitivity: 'normal' };
const controls = Object.fromEntries(Object.keys(defaults).map(key => [key, document.getElementById(key)]));
const message = document.getElementById('message');
const statusIndicator = document.getElementById('connection');
const repairButton = document.getElementById('repair');
const isChatGPT = url => /^https:\/\/(chatgpt\.com|chat\.openai\.com)(\/|$)/i.test(url || '');
let busy = false;

function status(text, kind = 'info') {
  statusIndicator.textContent = text;
  statusIndicator.dataset.kind = kind;
}
function note(text) { message.textContent = text; }
async function currentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs[0] || null;
}
async function ping(tabId) {
  try { return await chrome.tabs.sendMessage(tabId, { kind: 'CHATFLOW_PING' }); }
  catch (_) { return null; }
}
async function show(tabId) {
  try { return await chrome.tabs.sendMessage(tabId, { kind: 'CHATFLOW_SHOW' }); }
  catch (_) { return null; }
}

async function recover({ automatic = false } = {}) {
  if (busy) return;
  busy = true;
  repairButton.disabled = true;
  try {
    const tab = await currentTab();
    if (!tab || !isChatGPT(tab.url)) {
      status('Open a chatgpt.com tab, then click this extension.', 'warning');
      return;
    }
    if (!controls.enabled.checked) {
      status('Toolbar is switched off.', 'warning');
      return;
    }
    status('Checking ChatGPT page…');
    let response = await ping(tab.id);
    if (!response?.alive) {
      status('Installing floating controls in this tab…');
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scroll-engine.js', 'content.js']
      });
    }
    // SHOW also recovers from host removal and expands previously collapsed UI.
    response = await show(tab.id);
    if (response?.mounted) {
      status('Toolbar is visible on this ChatGPT tab. Close this popup.', 'good');
      repairButton.textContent = 'Show toolbar again';
      if (!automatic) note('Scroll controls have been restored.');
    } else {
      status('Page did not confirm the toolbar. Refresh the ChatGPT tab.', 'warning');
    }
  } catch (error) {
    status('Unable to attach: ' + (error?.message || String(error)), 'error');
    note('Try refreshing ChatGPT with Ctrl + R, then click Show toolbar again.');
  } finally {
    busy = false;
    repairButton.disabled = false;
  }
}

(async () => {
  try {
    const settings = await chrome.storage.local.get(defaults);
    for (const [key, input] of Object.entries(controls)) {
      if (key === 'enabled') input.checked = settings[key] !== false;
      else input.value = settings[key] || defaults[key];
    }
    await recover({ automatic: true });
  } catch (error) {
    status('Settings unavailable: ' + (error?.message || error), 'error');
  }
})();

for (const [key, input] of Object.entries(controls)) {
  input.addEventListener('change', async () => {
    const value = key === 'enabled' ? input.checked : input.value;
    try {
      await chrome.storage.local.set({ [key]: value });
      note('Setting saved.');
      if (key === 'enabled' && !value) {
        status('Toolbar is switched off.', 'warning');
      } else if (key === 'enabled' && value) {
        await recover();
      }
    } catch (error) {
      note('Could not save setting: ' + (error?.message || error));
    }
  });
}
repairButton.addEventListener('click', () => recover());
