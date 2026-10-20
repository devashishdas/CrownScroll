# Chrome Web Store privacy form — v1.3 descriptions

These are drafting aids, not automatic answers. Compare against the actual version you submit.

**Single purpose:**
CrownScroll provides floating navigation controls for long ChatGPT conversations. It adds a vertical thumbwheel, classic navigation buttons, keyboard controls, and manual selection of the conversation scroll area.

**Storage permission:**
Stores user preferences locally in Chrome, including enabled state, theme, navigation style, toolbar location and thumbwheel sensitivity. Conversation text is not stored.

**Scripting permission:**
Allows recovery of the floating toolbar by injecting the JavaScript files bundled with CrownScroll into the current ChatGPT tab when the controls are missing.

**activeTab permission:**
Supports current-tab checks and recovery initiated from the extension popup on ChatGPT pages. It does not request broad browsing access.

**Host access:**
Content scripts run on `chatgpt.com` and `chat.openai.com` to identify scrollable conversation containers and add floating controls. Page structure is processed locally; the extension does not transmit ChatGPT content.

**Remote code:** No — executable JavaScript is packaged locally with the extension.

**Data usage:** The extension locally examines page structure to locate the conversation area. Review the Chrome Web Store categories and disclose any accessed website content conservatively, following current policy guidance.

**Privacy policy:** Use the publicly available `PRIVACY.md` URL after publishing the GitHub repo, not a local file path.
