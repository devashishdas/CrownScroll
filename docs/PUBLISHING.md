# Publishing CrownScroll on GitHub and the Chrome Web Store

## A. Create the GitHub repository

1. Log in to GitHub and open `https://github.com/new`.
2. Choose the repository name **CrownScroll**.
3. Choose **Public** if you need the README and Privacy Policy to be readable by Chrome Web Store reviewers.
4. **Do not initialize the new repository with a README, .gitignore or license**; those files are already included here.
5. Upload these repository files (not the outer ZIP) through GitHub's **Add file → Upload files**, or use the Git commands below.

```bash
cd CrownScroll_GitHub_Repository_v1_3
git init
git add .
git commit -m "Initial CrownScroll v1.3 source and documentation"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/CrownScroll.git
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME` with the account that owns the new repository. GitHub requires authentication and permission to push.

## B. Privacy policy URL for Chrome Web Store

After uploading, confirm that this link displays your real public policy:

`https://github.com/YOUR_GITHUB_USERNAME/CrownScroll/blob/main/PRIVACY.md`

The URL above is a **template**, not a live link. Use your own GitHub username and verify the resulting page while signed out. You can use a public GitHub-hosted Markdown page; GitHub Pages is optional.

If the store requests a dedicated website, GitHub Pages can host the policy at a public HTML URL, but requires a Pages configuration and a source page.

## C. Chrome Web Store ZIP

From the repo root, run:

```bash
python3 scripts/build_release.py --output CrownScroll_Chrome_Web_Store_Upload_v1_3.zip
```

Upload that generated ZIP under **Package** in Chrome Web Store developer console. Upload product screenshots separately under **Store listing**.

## D. Chrome Web Store checklist

- Test the installed extension in a live long ChatGPT conversation.
- Provide an honest **single purpose**: conversation scroll navigation.
- Explain `storage`, `scripting`, `activeTab`, and the restricted ChatGPT host matches.
- Select **No remote code** for the audited version.
- Complete data collection disclosures consistent with the source and actual deployed functionality.
- Set developer contact information in the Chrome Web Store console. Do not publish fake contact details.
- Add the verified privacy policy URL.
- Review screenshots, descriptions, and branding for accuracy.
- Select distribution and submit for review; do not claim publication until Google accepts the listing.

## E. Commercial decision

No source-code open-source license is included. If the extension later charges money, establish merchant, tax, refund, and customer support arrangements before enabling payments. The current v1.3 package has **no payment or license-checking mechanism**.

## F. Optional GitHub Pages website

In repository **Settings → Pages**, select **Deploy from a branch**, then branch `main` and folder `/docs`; save. The site is purely static: `docs/index.html`, `docs/privacy.html`, and `docs/site.css`. When deployment finishes, verify a public privacy-policy URL of the form:

`https://YOUR_GITHUB_USERNAME.github.io/CrownScroll/privacy.html`

Replace the username with your own and verify the exact Pages address GitHub gives you. If you select the GitHub Markdown URL instead, GitHub Pages setup is unnecessary.
