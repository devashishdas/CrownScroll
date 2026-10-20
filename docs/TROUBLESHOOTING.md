# Troubleshooting

### The popup says enabled, but the floating toolbar is missing

1. Open a page at `https://chatgpt.com` and refresh (`Ctrl+R`).
2. Open CrownScroll's popup and click **Show toolbar on this tab**.
3. Close the popup and check the edge of the chat conversation.
4. Confirm you have not installed an older duplicate extension.
5. Inspect Chrome's extension error messages under `chrome://extensions` if recovery fails.

### The sidebar scrolls instead of the conversation

Use the floating panel's **target picker**, then click inside the intended conversation scroll area. Repeat after a major ChatGPT layout update if necessary.

### Arrow keys move the text cursor instead of the page

When typing in ChatGPT's composer, arrow keys retain text-editing behavior. Focus the wheel itself to use the wheel's arrow-key controls.

### Wheel motion feels too fast or slow

Open the popup and change **Wheel sensitivity**. On-screen wheel rotation is relative; it is not a position slider.

### Does it work with the ChatGPT Windows desktop application?

No. This release is a Chrome/Chromium extension for ChatGPT webpages only.
