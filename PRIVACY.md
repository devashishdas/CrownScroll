# CrownScroll Privacy Policy

**Effective date:** 20 October 2026  
**Applies to:** CrownScroll browser extension, version 1.3.0

CrownScroll is an independent Chrome extension that adds floating navigation controls to ChatGPT conversations. It operates inside the browser on `chatgpt.com` and `chat.openai.com`.

## Information processed on your device

To find the correct scrolling area and display navigation controls, CrownScroll examines **local page structure and scroll state** (for example, page elements, dimensions, and the current scroll position). It does not need to collect, copy, or retain the text of your conversations.

## Settings stored locally

CrownScroll uses Chrome's `storage` permission to save the following preferences on your device: enabled/disabled state, appearance theme, navigation style, toolbar position, and thumbwheel sensitivity. Preferences remain in your browser's local extension storage until you clear that data or uninstall the extension.

## Data collection, sharing, and transmission

In version 1.3.0, CrownScroll has **no developer-operated backend, analytics, advertisements, account system, or payment integration**. The packaged extension does not make remote network requests to transfer page content or settings to the developer. The developer does not receive conversation content, credentials, browsing history, or user preference data through the extension.

ChatGPT itself is a separate service. Your use of ChatGPT and the browser may involve communications with their own providers under their respective policies; CrownScroll does not control those services.

## Permissions

- **`storage`:** remembers interface preferences locally.
- **`scripting`:** lets the popup reinstall the packaged navigation scripts when the toolbar needs recovery.
- **`activeTab`:** lets the popup check and recover the toolbar on your currently selected ChatGPT tab after a user interaction.
- **ChatGPT URL matches:** content scripts are restricted to `https://chatgpt.com/*` and `https://chat.openai.com/*` so that navigation is available where intended.

All executable JavaScript is packaged in the extension; no remotely hosted executable code is used.

## Your choices

You can disable CrownScroll using its popup or remove it in Chrome's extension settings at `chrome://extensions`. Uninstalling or clearing extension data deletes its locally stored settings.

## Changes

Material changes to data practices will be reflected in this policy and, where required, in Chrome Web Store disclosures before an updated version is released.

## Support or privacy questions

Contact the publisher using the **Issues** tab of the official CrownScroll GitHub repository, or the developer contact details displayed on its Chrome Web Store listing. Do not include private ChatGPT conversations, passwords, or other sensitive information in a public issue.

## Independence

CrownScroll is an independent third-party project and is not affiliated with or endorsed by OpenAI.
