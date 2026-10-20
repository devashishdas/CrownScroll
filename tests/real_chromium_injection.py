"""Optional, offline MV3 installation smoke test on localhost using a temporary
copy of the manifest. The shipped extension's site permissions remain unchanged.
"""
import asyncio
import json
import shutil
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright
from browser_smoke import HTML

ROOT = Path(__file__).resolve().parent.parent

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        page = HTML.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(page)))
        self.end_headers()
        self.wfile.write(page)
    def log_message(self, *args):
        pass

async def run():
    with tempfile.TemporaryDirectory(prefix='chatflow-real-test-') as working:
        test_ext = Path(working, 'extension')
        shutil.copytree(ROOT, test_ext, ignore=shutil.ignore_patterns('__pycache__', '*.png'))
        manifest_path = test_ext / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        manifest['content_scripts'][0]['matches'] = ['http://127.0.0.1/*']
        manifest_path.write_text(json.dumps(manifest))
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            async with async_playwright() as playwright:
                context = await playwright.chromium.launch_persistent_context(
                    str(Path(working, 'profile')), executable_path='/usr/bin/chromium',
                    headless=True, viewport={'width': 1400, 'height': 900},
                    args=['--no-sandbox', '--disable-extensions-except=' + str(test_ext),
                          '--load-extension=' + str(test_ext)],
                )
                try:
                    page = await context.new_page()
                    errors = []
                    page.on('pageerror', lambda e: errors.append(str(e)))
                    await page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='domcontentloaded')
                    host = page.locator('#chatflow-navigator-extension-root')
                    await host.wait_for(timeout=8000)
                    assert await host.is_visible(), 'Real MV3 host not visible'
                    await host.locator('[data-action="bottom"]').click()
                    await page.wait_for_timeout(1100)
                    assert await page.evaluate('''() => {
                        const e = document.querySelector('#chatScroll');
                        return e.scrollHeight-e.clientHeight-e.scrollTop < 5;
                    }'''), 'Jump to bottom failed'
                    assert not errors, f'Browser errors: {errors}'
                    print('PASS: MV3 extension auto-injected and visible in genuine Chromium; buttons work.')
                finally:
                    await context.close()
        finally:
            server.shutdown()
            thread.join(timeout=2)

if __name__ == '__main__':
    asyncio.run(run())
