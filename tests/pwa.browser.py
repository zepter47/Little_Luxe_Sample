"""PWA lifecycle integration test. Build two releases in the supplied directories.
Usage: python tests/pwa.browser.py work/release-a work/release-b
No live API calls: Supabase requests are mocked.
"""
import shutil
import json
import pathlib
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect

release_a, release_b = (pathlib.Path(p).resolve() for p in sys.argv[1:3])
active = [release_a]
class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        relative = path.split('?', 1)[0].removeprefix('/Little_Luxe_Sample/').lstrip('/')
        target = active[0] / relative
        return str(target if target.exists() else active[0] / 'index.html')
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 4185), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = 'http://127.0.0.1:4185/Little_Luxe_Sample/'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=shutil.which("chromium"))
    context = browser.new_context()
    context.route('**/*.supabase.co/**', lambda route: route.fulfill(status=200, content_type='application/json', body='[]'))
    page = context.new_page()
    page.goto(url)
    page.evaluate('navigator.serviceWorker.ready.then(() => new Promise(resolve => navigator.serviceWorker.controller ? resolve() : navigator.serviceWorker.addEventListener("controllerchange", resolve, {once: true})))')
    page.wait_for_timeout(700)
    assert page.locator('meta[name="pwa-test-release"]').count() == 0
    # First install must not reload or report a replacement update.
    expect(page.get_by_role('dialog')).to_have_count(0)
    manifest = page.evaluate('fetch(document.querySelector("link[rel=manifest]").href).then(r=>r.json())')
    assert manifest['display'] == 'standalone'
    cached = page.evaluate('caches.keys().then(async keys => (await Promise.all(keys.map(async key => (await (await caches.open(key)).keys()).map(r=>r.url)))).flat())')
    assert any('/assets/' in item and item.endswith('.js') for item in cached)
    assert not any('supabase.co' in item or 'pwa-version.json' in item or item.endswith('.map') or 'hero' in item for item in cached)
    context.set_offline(True)
    page.reload()
    page.wait_for_load_state('domcontentloaded')
    assert page.title() == 'Little Luxe'
    page.goto(url + 'about')
    expect(page.get_by_text('Hello "/about"!', exact=True)).to_be_visible()
    context.set_offline(False)
    page.goto(url)
    second = context.new_page()
    second.goto(url)
    second.wait_for_function('!!navigator.serviceWorker.controller')
    active[0] = release_b
    page.evaluate('navigator.serviceWorker.getRegistration().then(r => r.update())')
    expect(page.get_by_role('button', name='Update now', exact=True)).to_be_visible(timeout=30000)
    page.get_by_role('button', name='Later', exact=True).click()
    expect(page.get_by_role('button', name='Update available', exact=True)).to_be_visible()
    assert page.locator('meta[name="pwa-test-release"]').count() == 0
    page.get_by_role('button', name='Update available', exact=True).click()
    page.get_by_role('button', name='Update now', exact=True).click()
    for tab in [page, second]:
        tab.wait_for_function('document.querySelector("meta[name=pwa-test-release]")?.content === "B"', timeout=30000)
        expect(tab.get_by_role('button', name='Update now', exact=True)).to_have_count(0)
    # A fresh network policy must be able to block the running release.
    page.route('**/pwa-version.json', lambda route: route.fulfill(status=200, content_type='application/json', body=json.dumps({'minimumSupportedVersion': 2})))
    page.evaluate('document.dispatchEvent(new Event("visibilitychange"))')
    expect(page.get_by_role('heading', name='Update required')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.get_by_role('heading', name='Update required')).to_be_visible()
    expect(page.get_by_role('button', name='Later', exact=True)).to_have_count(0)
    browser.close()
server.shutdown()
print('PASS: first install, manifest, cache exclusions, offline shell/route, deferred update, two-tab activation/reload, mandatory policy')
