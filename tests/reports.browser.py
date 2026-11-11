"""Reports: mocked data, responsive layouts, periods, costs, errors and route guards.
Run against the Vite dev server with configured Supabase publishable settings.
"""
import base64
import json
import os
import time
from playwright.sync_api import sync_playwright, expect

HOST = os.environ['VITE_SUPABASE_URL']
KEY = 'sb-' + HOST.split('//')[1].split('.')[0] + '-auth-token'
def encode(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
def session(role):
    user = dict(id='22222222-2222-4222-8222-222222222222', email='staff@example.test', aud='authenticated', role='authenticated', app_metadata={}, user_metadata={}, is_anonymous=False)
    token = encode({'alg': 'HS256'}) + '.' + encode({'sub': user['id'], 'exp': int(time.time())+3600, 'role': 'authenticated', 'user_role': role}) + '.test'
    return dict(access_token=token, refresh_token='test', expires_in=3600, expires_at=int(time.time())+3600, token_type='bearer', user=user)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for width in [390, 1440]:
        context = browser.new_context(viewport={'width': width, 'height': 950})
        context.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session('staff')))+')')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        mode = ['sales']
        def api(route):
            url = route.request.url
            headers = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}
            if route.request.method == 'OPTIONS':
                route.fulfill(status=200, headers=headers)
                return
            if '/auth/v1/user' in url:
                result = session('staff')['user']
            elif 'order_status_history' in url:
                if mode[0] == 'error':
                    route.fulfill(status=403, headers=headers, content_type='application/json', body='{"message":"Denied"}')
                    return
                result = [] if mode[0] == 'empty' else [dict(order_id='sale-12345678', changed_on='2026-11-11T09:00:00Z')]
            elif 'order_details' in url:
                result = [dict(order_details_id='line', quantity_sold=2, sale_price=10000, item={'item_name': 'Linen dress'}, stock_reservation=[] if mode[0] == 'missing' else [dict(quantity_reserved=2, reservation_status='fulfilled', stock={'cost_price': 6000})])]
            elif '/order?' in url:
                result = dict(order_id='sale-12345678', order_origin='staff')
            else:
                result = []
            route.fulfill(status=200, headers=headers, content_type='application/json', body=json.dumps(result))
        page.route(HOST+'/**', api)
        page.goto('http://localhost:5173/reports')
        expect(page.get_by_role('heading', name='Sales reports', exact=True)).to_be_visible()
        expect(page.get_by_text('UGX 8,000', exact=True).first).to_be_visible()
        page.get_by_role('button', name='Sale SALE-123').click()
        expect(page.get_by_text('UGX 6,000', exact=True)).to_be_visible()
        page.get_by_role('button', name='Weekly', exact=True).click()
        expect(page.get_by_text('UGX 8,000', exact=True).first).to_be_visible()
        page.get_by_role('button', name='Monthly', exact=True).click()
        expect(page.get_by_text('UGX 8,000', exact=True).first).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        page.screenshot(path=f'work/reports-{width}.png', full_page=True)
        mode[0] = 'missing'
        page.get_by_role('button', name='Refresh report').click()
        expect(page.get_by_text('Cost is unavailable', exact=False)).to_be_visible()
        mode[0] = 'empty'
        page.get_by_role('button', name='Refresh report').click()
        expect(page.get_by_text('No completed sales in this period')).to_be_visible()
        mode[0] = 'error'
        page.get_by_role('button', name='Refresh report').click()
        expect(page.get_by_text('Unable to load a complete sales report.', exact=False)).to_be_visible(timeout=20000)
        assert not errors, errors
        context.close()
    context = browser.new_context()
    context.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session('customer')))+')')
    page = context.new_page()
    page.route(HOST+'/**', lambda route: route.fulfill(status=200, content_type='application/json', body='[]'))
    page.goto('http://localhost:5173/reports')
    expect(page).to_have_url('http://localhost:5173/')
    expect(page.get_by_role('link', name='Reports', exact=True)).to_have_count(0)
    browser.close()
print('Reports browser checks passed at 390px and 1440px; customer route guard passed.')
