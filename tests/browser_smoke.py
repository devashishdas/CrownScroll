"""Chromium integration smoke tests on a locally generated, non-production mock page."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = """<!doctype html><html><head><style>
* { box-sizing: border-box; } body { margin: 0; font-family: sans-serif; }
#side { position: fixed; left: 0; top: 0; width: 360px; height: 100vh; overflow-y: auto; background: #efefef; }
#side div { height: 80px; }
main { position: fixed; top: 0; left: 380px; right: 0; bottom: 0; background: #f9f5f9; }
#chatScroll { position: absolute; top: 55px; left: 15px; right: 15px; bottom: 95px; overflow-y: auto; }
.message { min-height: 160px; margin: 12px; padding: 24px; background: #fff; }
#composer { position: absolute; bottom: 0; height: 75px; width: 100%; background: #ddd; }
</style></head><body>
<aside id="side"></aside><main><div id="chatScroll"></div><div id="composer">Composer</div></main>
<script>
const side = document.querySelector('#side');
for (let i=0; i<45; i++) { const x=document.createElement('div'); x.textContent='Sidebar '+i; side.append(x); }
const scroll = document.querySelector('#chatScroll');
for (let i=0; i<28; i++) { const x=document.createElement('article'); x.className='message'; x.setAttribute('data-testid','conversation-turn-'+i); x.textContent='Conversation '+i; scroll.append(x); }
window.chrome = {
 runtime: {lastError: null, onMessage: {addListener(handler){ window.__messageHandler = handler; }}},
 storage: {
  local: {get(_defaults,cb){cb({enabled:true,theme:'light',position:'right-middle'})}},
  onChanged: {addListener(handler) {window.__testStorageChanged = handler;}}
 }
};
</script></body></html>"""

async def run():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = await browser.new_page(viewport={"width": 1400, "height": 900})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.set_content(HTML)
        await page.add_script_tag(path=str(ROOT/'scroll-engine.js'))
        await page.add_script_tag(path=str(ROOT/'content.js'))
        host = page.locator('#chatflow-navigator-extension-root')
        await host.wait_for()
        await page.wait_for_timeout(550)
        selected = await page.evaluate('ChatFlowScrollEngine.rankScrollers(document,window)[0].el.id')
        assert selected == 'chatScroll', f'Wrong candidate: {selected}'

        # Popup can confirm that this content script actually reached the page.
        ping = await page.evaluate('''(() => { let response;
          window.__messageHandler({kind:'CHATFLOW_PING'}, {}, value => response = value);
          return response; })()''')
        assert ping['alive'] and ping['mounted'], f'Page handshake failed: {ping}'

        bottom = host.locator('button[data-action="bottom"]')
        await bottom.click()
        await page.wait_for_timeout(1200)
        bottom_ok = await page.evaluate('(() => { const e=document.querySelector("#chatScroll"); return e.scrollHeight-e.clientHeight-e.scrollTop < 5; })()')
        assert bottom_ok, 'Bottom button did not reach end'
        side_scroll = await page.evaluate('document.querySelector("#side").scrollTop')
        assert side_scroll == 0, f'Sidebar was scrolled: {side_scroll}'

        await host.locator('button[data-action="top"]').click()
        await page.wait_for_timeout(1050)
        top_pos = await page.evaluate('document.querySelector("#chatScroll").scrollTop')
        assert top_pos == 0, f'Top button did not reach start: {top_pos}'

        await host.locator('button[data-action="pick"]').click()
        await page.locator('.message').nth(3).click(force=True)
        await page.wait_for_timeout(150)
        assert await host.locator('[data-action="pick"]').get_attribute('class') == 'full picked', 'Manual picker did not activate'

        await host.locator('[data-action="collapse"]').click()
        assert await host.get_attribute('data-collapsed') == 'true', 'Cannot collapse rail'
        await host.locator('[data-action="expand"]').click()
        assert await host.get_attribute('data-collapsed') == 'false', 'Cannot expand rail'

        # A new message arrives after the user clicked bottom: bounded retries follow it.
        await host.locator('button[data-action="bottom"]').click()
        await page.evaluate('''setTimeout(() => {
          const e=document.createElement('article');e.className='message';
          e.setAttribute('data-testid','conversation-turn-99');e.textContent='Late message';
          document.querySelector('#chatScroll').append(e);
        },250)''')
        await page.wait_for_timeout(1200)
        late_bottom = await page.evaluate('(() => { const e=document.querySelector("#chatScroll"); return e.scrollHeight-e.clientHeight-e.scrollTop < 5; })()')
        assert late_bottom, 'Bounded retries did not follow a late incoming message'

        await page.evaluate('window.__testStorageChanged({theme:{newValue:"dark"},position:{newValue:"left-middle"}},"local")')
        await page.wait_for_timeout(100)
        assert await host.get_attribute('data-theme') == 'dark', 'Dark theme change failed'
        assert await host.get_attribute('data-position') == 'left-middle', 'Position change failed'
        await page.evaluate('window.__testStorageChanged({enabled:{newValue:false}},"local")')
        assert await host.count() == 0, 'Disabling extension did not remove rail'
        await page.evaluate('window.__testStorageChanged({enabled:{newValue:true}},"local")')
        await host.wait_for()
        # ChatGPT may replace page DOM: detached floating UI must self-repair.
        await page.evaluate('document.querySelector("#chatflow-navigator-extension-root").remove()')
        await page.wait_for_timeout(2100)
        assert await host.count() == 1, 'Detached UI was not restored'
        assert await host.is_visible(), 'Restored UI not visible'
        await page.evaluate('''(() => {
          let response; window.__messageHandler({kind:'CHATFLOW_SHOW'}, {}, value => response = value);
          window.__showResponse = response;
        })()''')
        assert (await page.evaluate('window.__showResponse'))['mounted'], 'Show command failed'
        assert not errors, f'Browser JS exceptions: {errors}'
        print('PASS: targeting, jump top/bottom, sidebar isolation, picker, minimize/expand, late message, theme/position, disable/re-enable, reattach on DOM replacement, message handshake, no JS errors')
        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
