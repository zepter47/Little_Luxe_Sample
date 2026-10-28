"""Image-picker resume/auth regression checks with no real backend writes.

Build with VITE_SUPABASE_URL=https://checkout-test.supabase.co and
VITE_SUPABASE_PUBLISHABLE_KEY=test-publishable-key, then run preview with
--base /Little_Luxe_Sample/ on port 4174. Override ORDER_PREVIEW_URL if needed.
Requires Python Playwright and /usr/bin/chromium. Visibility is simulated;
this is not a native Android file-picker test.
"""
import base64
import json
import os
import time
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('ORDER_PREVIEW_URL', 'http://127.0.0.1:4174/Little_Luxe_Sample/')
FIRST = '22222222-2222-4222-8222-222222222222'
SECOND = '33333333-3333-4333-8333-333333333333'
ITEM = '11111111-1111-4111-8111-111111111111'
UNIT = '44444444-4444-4444-8444-444444444444'
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=')

def encode(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')

def make_session(identifier=FIRST, role='staff'):
    user = dict(id=identifier, aud='authenticated', role='authenticated', email='staff@example.test',
                app_metadata={'provider':'email'}, user_metadata={}, created_at='2026-01-01T00:00:00Z', is_anonymous=False)
    token = encode({'alg':'HS256','typ':'JWT'})+'.'+encode({'sub':identifier,'exp':int(time.time())+3600,'role':'authenticated','user_role':role})+'.test'
    return dict(access_token=token, refresh_token='test-refresh', expires_in=3600,
                expires_at=int(time.time())+3600, token_type='bearer', user=user)

def resume(page):
    page.evaluate('Object.defineProperty(document,"visibilityState",{configurable:true,get:()=>"hidden"});window.dispatchEvent(new Event("visibilitychange"))')
    page.wait_for_timeout(100)
    page.evaluate('Object.defineProperty(document,"visibilityState",{configurable:true,get:()=>"visible"});window.dispatchEvent(new Event("visibilitychange"))')
    page.wait_for_timeout(500)

def auth_event(page, event, session):
    # Model the SDK's cross-tab notifications, with matching shared storage.
    page.evaluate('''({event,session}) => {
        if(session) localStorage.setItem('sb-checkout-test-auth-token',JSON.stringify(session));
        else localStorage.removeItem('sb-checkout-test-auth-token');
        const channel=new BroadcastChannel('sb-checkout-test-auth-token');
        channel.postMessage({event,session}); channel.close();
    }''', {'event':event,'session':session})

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for width in (390, 1280):
        context = browser.new_context(viewport={'width':width,'height':844})
        session = make_session()
        context.add_init_script('if (!sessionStorage.getItem("auth-test-seeded")) { localStorage.setItem("sb-checkout-test-auth-token",'+json.dumps(json.dumps(session))+'); sessionStorage.setItem("auth-test-seeded","1"); }')
        page = context.new_page()
        errors, writes = [], []
        reject_refresh = False
        page.on('pageerror',lambda error: errors.append(str(error)))
        def api(route):
            url, method = route.request.url, route.request.method
            headers = {'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}
            if method == 'OPTIONS':
                route.fulfill(status=200,headers=headers)
                return
            if '/auth/v1/user' in url:
                data = session['user']
            elif '/rpc/get_admin_items_with_stock' in url:
                data = [dict(item_id=ITEM,item_name='Inventory '+session['user']['id'],sale_price=25,item_category_id=None,uom_id=UNIT,
                             product_notes='',is_active=True,is_stocked=True,quantity_on_hand=1,image_path=None)]
            elif '/rpc/get_storefront_items' in url:
                data = []
            elif '/item_category' in url or '/item_images' in url:
                data = []
            elif '/unit_of_measure' in url:
                data = [dict(uom_id=UNIT,uom_name='Piece',uom_notes='')]
            elif '/auth/v1/token' in url:
                if reject_refresh:
                    route.fulfill(status=400,headers=headers,content_type='application/json',body=json.dumps({'code':'refresh_token_not_found','message':'Refresh token not found'}))
                    return
                data = session
            elif '/auth/v1/logout' in url:
                data = {}
            else:
                writes.append((method,url))
                raise AssertionError('Unexpected API request: '+method+' '+url)
            route.fulfill(status=200,headers=headers,content_type='application/json',body=json.dumps(data))
        page.route('https://checkout-test.supabase.co/**',api)
        page.goto(BASE+'admin')
        for mode in ('add','edit'):
            page.get_by_role('button',name='Add item' if mode=='add' else 'Edit Inventory '+FIRST,exact=True).click()
            name = page.get_by_role('textbox',name='Item name',exact=True)
            name.fill('Unsaved '+mode+' draft')
            for index,filename in enumerate(('profile.png','gallery.png')):
                page.locator('input[type=file]').nth(index).set_input_files({'name':filename,'mimeType':'image/png','buffer':PNG})
            for _ in range(4):
                resume(page)
                expect(name).to_have_value('Unsaved '+mode+' draft')
                expect(page.get_by_label('Loading items',exact=True)).to_have_count(0)
                expect(page.get_by_role('img',name='profile.png',exact=True)).to_be_visible()
                expect(page.get_by_role('img',name='gallery.png',exact=True)).to_be_visible()
            # A refreshed token must retain the same account's form too.
            session = make_session()
            auth_event(page,'TOKEN_REFRESHED',session)
            page.wait_for_timeout(500)
            expect(name).to_have_value('Unsaved '+mode+' draft')
            page.get_by_role('button',name='Cancel',exact=True).click()
        print(f'PASS {width}px: Add/Edit drafts and both image selections survive repeated visibility recovery and token refresh.')

        page.get_by_role('button',name='Add item',exact=True).click()
        page.get_by_role('textbox',name='Item name',exact=True).fill('Account A private draft')
        session = make_session(SECOND)
        auth_event(page,'SIGNED_IN',session)
        expect(page.get_by_role('dialog')).to_have_count(0)
        expect(page.get_by_role('button',name='Edit Inventory '+SECOND,exact=True)).to_be_visible()
        expect(page.get_by_role('button',name='Edit Inventory '+FIRST,exact=True)).to_have_count(0)
        page.get_by_role('button',name='Add item',exact=True).click()
        expect(page.get_by_role('textbox',name='Item name',exact=True)).to_have_value('')

        # Same ID, reduced permissions: claims still refresh and guards redirect.
        session = make_session(SECOND,'customer')
        auth_event(page,'TOKEN_REFRESHED',session)
        expect(page).to_have_url(BASE)
        expect(page.get_by_role('dialog')).to_have_count(0)
        page.goto(BASE+'admin')
        expect(page).to_have_url(BASE)
        print(f'PASS {width}px: account switch clears inventory/draft, and downgraded role cannot access admin.')

        session = make_session(SECOND)
        auth_event(page,'SIGNED_IN',session)
        page.wait_for_timeout(500)
        page.goto(BASE+'admin')
        page.get_by_role('button',name='Add item',exact=True).click()
        auth_event(page,'SIGNED_OUT',None)
        expect(page).to_have_url(BASE+'login')
        expect(page.get_by_role('dialog')).to_have_count(0)
        expect(page.get_by_role('button',name='Add item',exact=True)).to_have_count(0)
        print(f'PASS {width}px: sign-out removes the protected form and redirects to login.')

        session = make_session(SECOND)
        auth_event(page,'SIGNED_IN',session)
        page.wait_for_timeout(500)
        page.goto(BASE+'admin')
        page.get_by_role('button',name='Add item',exact=True).click()
        # Expire the actual stored token and reject its refresh. The SDK must
        # sign out and remove the draft, rather than preserving it as a resume.
        session['expires_at'] = int(time.time())-60
        session['access_token'] = encode({'alg':'HS256','typ':'JWT'})+'.'+encode({'sub':SECOND,'exp':int(time.time())-60,'role':'authenticated','user_role':'staff'})+'.test'
        reject_refresh = True
        page.evaluate('(session) => localStorage.setItem("sb-checkout-test-auth-token",JSON.stringify(session))',session)
        resume(page)
        expect(page).to_have_url(BASE+'login')
        expect(page.get_by_role('dialog')).to_have_count(0)
        assert not writes, writes
        assert not errors, errors
        print(f'PASS {width}px: expired session with rejected refresh redirects to login; no writes or browser errors.')
        context.close()
    browser.close()
