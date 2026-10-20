# Architecture and permissions

## Runtime components

| File | Role |
| --- | --- |
| `manifest.json` | Declares MV3 extension, popup, icons, local permissions, and ChatGPT content-script matches |
| `scroll-engine.js` | Finds likely scroll containers and determines scroll state |
| `content.js` | Creates the floating UI, handles click/drag/wheel/keyboard input and page changes |
| `popup.html`, `popup.js` | Settings UI, current-tab check, toolbar recovery |

Content scripts are loaded on ChatGPT pages at `document_idle`. Recovery can inject the same packaged scripts through `chrome.scripting` from the popup.

## Permissions, scope, and data

- `storage`: local display and behavior preferences.
- `scripting`: reinject existing local scripts when no toolbar is present.
- `activeTab`: temporary access to the selected tab for recovery.
- Content-script matches are limited to ChatGPT hosts; there is **no** general `<all_urls>` or background service worker.
- No remote code, telemetry endpoint, or server required for v1.3.

## Limitations

The DOM of ChatGPT can change without notice. Target selection, floating placement, and recovery may need updates. Browser scroll navigation cannot repair server-side missing content or inaccessible native-app views. A mock-page pass does not imply live-site verification.
