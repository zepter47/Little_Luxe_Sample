"""Mocked browser integration checks.
Build with VITE_SUPABASE_URL=https://checkout-test.supabase.co and
VITE_SUPABASE_PUBLISHABLE_KEY=test-publishable-key, then run preview with --base /Little_Luxe_Sample/ on 4174.
Run with Python + Playwright and Chromium installed. No real service is contacted.
"""
import base64
import json
import time
from playwright.sync_api import sync_playwright, expect

ITEM = '11111111-1111-4111-8111-111111111111'
USER = '22222222-2222-4222-8222-222222222222'
ORDER = '33333333-3333-4333-8333-333333333333'
product = dict(item_id=ITEM, item_name='Floral Dress', sale_price=15.5, cost_price=5,
               image_path=None, product_notes='Soft cotton for little adventures.', item_category_id=None,is_active=True,is_stocked=True)
user = dict(id=USER, aud='authenticated', role='authenticated', email='shopper@example.test',
            app_metadata={'provider': 'email'}, user_metadata={}, created_at='2026-01-01T00:00:00Z', is_anonymous=False)
def encoded(data):
    return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip('=')
token = encoded({'alg':'HS256','typ':'JWT'})+'.'+encoded({'sub':USER,'exp':int(time.time())+3600,'role':'authenticated','email':user['email'],'user_role':'customer'})+'.test'
requests = []
confirmed = []
def api(route):
    path = route.request.url
    headers = {'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}
    if route.request.method == 'OPTIONS':
        route.fulfill(status=200,headers=headers); return
    if '/auth/v1/otp' in path: result = {}
    elif '/auth/v1/token' in path:
        result = dict(access_token=token, refresh_token='test-refresh', token_type='bearer', expires_in=3600, user=user)
    elif '/auth/v1/user' in path: result = user
    elif '/auth/v1/logout' in path: result = {}
    elif '/rest/v1/item_category' in path: result = []
    elif '/rest/v1/item' in path: result = [product]
    elif '/rest/v1/rpc/get_storefront_items' in path: result = [product]
    elif '/rest/v1/rpc/create_online_order' in path:
        body = route.request.post_data_json
        requests.append(body)
        if len(requests) == 1:
            route.fulfill(status=400,headers=headers,content_type='application/json',body=json.dumps(dict(code='P0001',message='Your order needs attention.',details=json.dumps([dict(item_id=ITEM,code='PRICE_CHANGED',previous_price=15.5,current_price=17)]))))
            product['sale_price'] = 17
            return
        confirmed.append(body)
        if len(confirmed) == 1:
            route.abort('failed')
            return
        result = ORDER
    else:
        raise AssertionError('Unexpected API request: '+path)
    route.fulfill(status=200,headers=headers,content_type='application/json',body=json.dumps(result))

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page = browser.new_page()
    page.route('https://checkout-test.supabase.co/**',api)
    errors = []
    page.on('pageerror',lambda error: errors.append(str(error)))
    base_url = 'http://127.0.0.1:4174/Little_Luxe_Sample/'
    page.goto(base_url)
    add = page.get_by_role('button',name='Add Floral Dress to cart',exact=True)
    add.click()
    expect(page.get_by_text('Log in or sign up to add products to your cart.',exact=True)).to_be_visible()
    page.get_by_role('link',name='Log in / Sign up',exact=True).click()
    page.get_by_role('textbox',name='Email address').fill('shopper@example.test')
    page.get_by_role('button',name='Send sign-in link',exact=True).click()
    expect(page.get_by_text('Check your email for a sign-in link.',exact=True)).to_be_visible()
    # Simulate the session restored by a verified magic link, without email.
    page.evaluate('(session) => localStorage.setItem("sb-checkout-test-auth-token", JSON.stringify(session))',
                  dict(access_token=token,refresh_token='test-refresh',expires_in=3600,expires_at=int(time.time())+3600,token_type='bearer',user=user))
    page.goto(base_url)
    page.get_by_role('link',name='Home',exact=True).click()
    page.get_by_role('button',name='View details for Floral Dress',exact=True).click()
    expect(page.get_by_text(product['product_notes'],exact=True)).to_be_visible()
    page.get_by_role('button',name='Add to cart',exact=True).click()
    expect(page.get_by_text('Added to your cart.',exact=True)).to_be_visible()
    page.get_by_role('button',name='Add Floral Dress to cart',exact=True).click()
    expect(page.get_by_text('This item is already in your cart. Change its quantity in the cart.',exact=True)).to_be_visible()
    page.locator('nav a[href$="/cart"]').click()
    expect(page.get_by_text('Estimated total: 15.50',exact=True)).to_be_visible()
    page.get_by_role('button',name='Increase quantity of Floral Dress',exact=True).click()
    expect(page.get_by_text('Estimated total: 31.00',exact=True)).to_be_visible()
    expect(page.locator('nav a[href$="/cart"] .MuiBadge-badge')).to_have_text('1')
    page.reload()
    expect(page.get_by_text('Estimated total: 31.00',exact=True)).to_be_visible()
    page.get_by_role('button',name='Decrease quantity of Floral Dress',exact=True).click()
    expect(page.get_by_text('Estimated total: 15.50',exact=True)).to_be_visible()
    expect(page.get_by_role('button',name='Decrease quantity of Floral Dress',exact=True)).to_be_disabled()
    page.get_by_role('button',name='Checkout',exact=True).click()
    expect(page.get_by_role('dialog')).to_be_visible()
    assert len(requests) == 0, 'Opening the confirmation must not contact the server'
    page.get_by_role('button',name='No',exact=True).click()
    assert len(requests) == 0
    page.get_by_role('button',name='Checkout',exact=True).click()
    page.get_by_role('button',name='Yes',exact=True).click()
    expect(page.get_by_text('Floral Dress: price changed from 15.5 to 17.',exact=True)).to_be_visible()
    expect(page.get_by_text('Estimated total: 15.50',exact=True)).to_be_visible()
    page.get_by_role('button',name='Refresh cart prices',exact=True).click()
    expect(page.get_by_text('Estimated total: 17.00',exact=True)).to_be_visible()
    page.get_by_role('button',name='Checkout',exact=True).click()
    page.get_by_role('button',name='Yes',exact=True).click()
    expect(page.get_by_text('Failed to fetch',exact=False)).to_be_visible()
    expect(page.get_by_text('Estimated total: 17.00',exact=True)).to_be_visible()
    page.get_by_role('button',name='Checkout',exact=True).click()
    page.get_by_role('button',name='Yes',exact=True).click()
    expect(page.get_by_text('Your cart is empty.',exact=True)).to_be_visible()
    expect(page.get_by_text(f'Order {ORDER} received. Stock is reserved pending delivery and cash receipt.',exact=True)).to_be_visible()
    assert len(confirmed) == 2 and confirmed[0]['p_items_json'][0]['sale_price'] == 17
    assert confirmed[0]['p_request_id'] == confirmed[1]['p_request_id']
    assert len(requests) == 3
    expect(page.locator('nav a[href$="/cart"] .MuiBadge-badge')).to_have_class(__import__('re').compile('MuiBadge-invisible'))
    # Both add controls, direct removal and account isolation.
    page.get_by_role('link',name='Home',exact=True).click()
    page.get_by_role('button',name='Add Floral Dress to cart',exact=True).click()
    page.locator('nav a[href$="/cart"]').click()
    expect(page.get_by_text('Floral Dress',exact=True)).to_be_visible()
    page.get_by_role('button',name='Remove',exact=True).click()
    expect(page.get_by_text('Your cart is empty.',exact=True)).to_be_visible()
    page.get_by_role('link',name='Home',exact=True).click()
    page.get_by_role('button',name='Add Floral Dress to cart',exact=True).click()
    page.get_by_role('link',name='Your profile',exact=True).click()
    page.get_by_role('button',name='Log out',exact=True).click()
    expect(page.get_by_role('link',name='Sign in / Sign up',exact=True)).to_be_visible()
    page.locator('nav a[href$="/cart"]').click()
    expect(page.get_by_text('Log in or sign up to add products and view your cart.',exact=True)).to_be_visible()
    # A different signed-in account must not inherit the first user's cart.
    user['id'] = '44444444-4444-4444-8444-444444444444'
    token = encoded({'alg':'HS256','typ':'JWT'})+'.'+encoded({'sub':user['id'],'exp':int(time.time())+3600,'role':'authenticated','email':user['email'],'user_role':'customer'})+'.test'
    page.get_by_role('link',name='Log in / Sign up',exact=True).click()
    page.evaluate('(session) => localStorage.setItem("sb-checkout-test-auth-token", JSON.stringify(session))',
                  dict(access_token=token,refresh_token='test-refresh',expires_in=3600,expires_at=int(time.time())+3600,token_type='bearer',user=user))
    page.goto(base_url)
    page.locator('nav a[href$="/cart"]').click()
    expect(page.get_by_text('Your cart is empty.',exact=True)).to_be_visible()
    assert not errors, errors
    browser.close()
    print('PASS: cart persistence, account isolation, Yes/No confirmation, server discrepancy, price refresh, retry idempotency, success cleanup; no browser errors.')
