"""Browser-based checks of vertical crown interactions (mock page, not live ChatGPT)."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
from browser_smoke import HTML

ROOT = Path(__file__).resolve().parent.parent

async def run():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 1400, 'height': 900}, device_scale_factor=1)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.set_content(HTML)
        await page.add_script_tag(path=str(ROOT / 'scroll-engine.js'))
        await page.add_script_tag(path=str(ROOT / 'content.js'))
        host = page.locator('#chatflow-navigator-extension-root')
        await host.wait_for()
        roller = host.locator('.roller-wheel')
        await page.wait_for_timeout(550)
        assert await host.get_attribute('data-mode') == 'thumbwheel', 'New install should show wheel mode by default'
        assert await roller.is_visible(), 'The vertical crown is not visible'
        assert await roller.get_attribute('aria-valuemin') == '0'
        assert await roller.get_attribute('aria-valuemax') == '100'
        assert await page.evaluate('document.querySelector("#side").scrollTop') == 0
        await host.locator('[data-action="top"]').click()
        await page.wait_for_timeout(1100)
        # Wheel over the physical roller - not over the browser scrollbar.
        bbox = await roller.bounding_box()
        await page.mouse.move(bbox['x']+bbox['width']/2, bbox['y']+bbox['height']/2)
        await page.mouse.wheel(0, 510)
        await page.wait_for_timeout(200)
        pos1 = await page.evaluate('document.querySelector("#chatScroll").scrollTop')
        assert pos1 >= 450, f'Mouse wheel failed to scroll conversation: {pos1}'
        assert await page.evaluate('document.querySelector("#side").scrollTop') == 0
        assert (await roller.get_attribute('aria-valuenow')) != '0'
        # Click and drag the crown downward: relative scrolling (not scrollbar thumb mapping).
        await page.mouse.move(bbox['x']+bbox['width']/2, bbox['y']+28)
        await page.mouse.down()
        await page.mouse.move(bbox['x']+bbox['width']/2, bbox['y']+79, steps=8)
        await page.mouse.up()
        await page.wait_for_timeout(140)
        pos2 = await page.evaluate('document.querySelector("#chatScroll").scrollTop')
        assert pos2 > pos1+200, f'Dragging thumbwheel failed: {pos1} to {pos2}'
        # Key input only when control is focused (not while writing a message).
        await roller.focus()
        await page.keyboard.press('ArrowUp')
        await page.wait_for_timeout(100)
        pos3 = await page.evaluate('document.querySelector("#chatScroll").scrollTop')
        assert pos3 < pos2, f'Crown keyboard ArrowUp failed: {pos2} to {pos3}'
        # Existing buttons and manual selector remain functional in this mode.
        await host.locator('[data-action="bottom"]').click()
        await page.wait_for_timeout(1100)
        assert await page.evaluate('(() => {const e=document.querySelector("#chatScroll");return e.scrollHeight-e.clientHeight-e.scrollTop < 5;})()')
        await host.locator('[data-action="top"]').click()
        await page.wait_for_timeout(1100)
        # Normal mouse-wheel behavior ON THE CONVERSATION should update crown readout.
        original = await roller.get_attribute('aria-valuenow')
        msg = page.locator('.message').nth(1)
        await msg.hover(force=True)
        await page.mouse.wheel(0, 920)
        await page.wait_for_timeout(550)
        assert int(await roller.get_attribute('aria-valuenow')) > int(original), 'Crown display did not sync to native scrolling'
        assert await page.evaluate('document.querySelector("#side").scrollTop') == 0
        # Speed setting changes distance but does not remove crown theme.
        await host.locator('[data-action="top"]').click()
        await page.wait_for_timeout(1100)
        await page.evaluate('window.__testStorageChanged({sensitivity:{newValue:"gentle"}},"local")')
        await roller.hover()
        await page.mouse.wheel(0, 200)
        await page.wait_for_timeout(160)
        gentle = await page.evaluate('document.querySelector("#chatScroll").scrollTop')
        assert 80 <= gentle <= 130, f'Gentle speed incorrect: {gentle}'
        await page.evaluate('window.__testStorageChanged({sensitivity:{newValue:"fast"}},"local")')
        await host.locator('[data-action="top"]').click()
        await page.wait_for_timeout(1100)
        await roller.hover()
        await page.mouse.wheel(0, 200)
        await page.wait_for_timeout(180)
        fast = await page.evaluate('document.querySelector("#chatScroll").scrollTop')
        assert fast > gentle*3.5, f'Speed setting incorrect: gentle={gentle}, fast={fast}'
        # Classical toolbar remains available.
        await page.evaluate('window.__testStorageChanged({mode:{newValue:"classic"}},"local")')
        await page.wait_for_timeout(120)
        assert not await roller.is_visible(), 'Classical mode should hide the thumbwheel'
        assert await host.locator('button[data-action="down"]').is_visible(), 'Classical buttons disappeared'
        # Restore crown, check minimizing/hiding it and light/dark switching.
        await page.evaluate('window.__testStorageChanged({mode:{newValue:"thumbwheel"},theme:{newValue:"dark"}},"local")')
        await page.wait_for_timeout(120)
        assert await roller.is_visible()
        assert await host.get_attribute('data-theme') == 'dark'
        await host.locator('button[data-action="collapse"]').click()
        assert not await roller.is_visible()
        await host.locator('button[data-action="expand"]').click()
        assert await roller.is_visible()
        assert not errors, f'Browser page errors: {errors}'
        await page.screenshot(path=str(ROOT / 'tests' / 'thumbwheel_preview.png'))
        print('PASS: vertical crown visible, mouse wheel, pointer drag, focused keyboard, native-scroll synchronization, sensitivity, old controls, styles, minimize, isolation, no JS errors')
        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
