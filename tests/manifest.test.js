'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

test('Manifest V3 limits content injection to ChatGPT and recovery uses activeTab', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage', 'scripting', 'activeTab']);
  assert.deepEqual(manifest.content_scripts[0].matches.sort(),
    ['https://chat.openai.com/*', 'https://chatgpt.com/*'].sort());
  assert.deepEqual(manifest.content_scripts[0].js, ['scroll-engine.js', 'content.js']);
  assert.equal(manifest.background, undefined);
  assert.equal(manifest.host_permissions, undefined);
});

test('referenced scripts, popup, and icons are packaged', () => {
  const entries = [manifest.action.default_popup, ...manifest.content_scripts[0].js, ...Object.values(manifest.icons)];
  for (const entry of entries) {
    assert.equal(fs.existsSync(path.join(root, entry)), true, `Missing ${entry}`);
  }
});
