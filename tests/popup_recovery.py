"""Checks popup's actual recovery behavior using mocked browser APIs."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parent.parent

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = await browser.new_page()
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        html=(ROOT/'popup.html').read_text().replace('<script src="popup.js"></script>', '')
        await page.set_content(html)
        await page.evaluate('''() => {
          window.__injectionCount = 0;
          window.chrome = {
            storage: {local: {
              get: async () => ({enabled: true, theme:'auto', position:'right-middle', mode:'thumbwheel', sensitivity:'normal'}),
              set: async () => {}
            }},
            tabs: {
              query: async () => [{id: 17, url:'https://chatgpt.com/g/g-123/c/abc'}],
              sendMessage: async (_id, message) => {
                if (window.__injectionCount === 0) throw Error('Receiving end does not exist');
                return message.kind === 'CHATFLOW_PING' ? {alive:true, mounted:true} : {alive:true, mounted:true};
              }
            },
            scripting: { executeScript: async ({target,files}) => {
              if (target.tabId !== 17 || files[0] !== 'scroll-engine.js') throw Error('Wrong injection');
              window.__injectionCount += 1;
            }}
          };
        }''')
        await page.add_script_tag(path=str(ROOT/'popup.js'))
        await page.wait_for_function("document.querySelector('#connection').dataset.kind === 'good'")
        assert await page.evaluate('window.__injectionCount') == 1, 'Not injected exactly once'
        assert await page.locator('#mode').input_value() == 'thumbwheel'
        assert await page.locator('#sensitivity').input_value() == 'normal'
        await page.screenshot(path=str(ROOT/'tests'/'popup_v1_2_preview.png'))
        assert 'Close this popup' in (await page.locator('#connection').inner_text())
        await page.locator('#repair').click()
        await page.wait_for_timeout(150)
        assert await page.evaluate('window.__injectionCount') == 1, 'Unnecessarily injected twice'
        assert not errors, f'Popup errors: {errors}'
        print('PASS: popup diagnoses missing content script, injects, confirms status, and avoids duplicate injection.')
        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
