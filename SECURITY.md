# Security policy

## Supported version

Only the current v1.3.0 source is included in this repository. Security fixes are not guaranteed for earlier releases.

## Report a vulnerability

Please use GitHub's **private vulnerability reporting** feature if the repository has it enabled. Otherwise contact the publisher through the private contact information on the Chrome Web Store developer listing. **Do not post an exploit, access token, personal conversation, or secret to a public issue.**

A useful report includes the affected version, browser version, reproduction steps, observed behavior, and potential impact. Remove sensitive information from attachments.

## Trust boundary

CrownScroll is a content script running on ChatGPT pages. Treat website DOM content as untrusted, avoid remote code or unnecessary permissions, and review changes to page permissions before distributing updates.
