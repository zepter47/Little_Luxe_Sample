"""Mocked route, item-gallery and person-label checks. Use cart.browser.py's preview settings."""
import base64
import json
import os
import time
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('ORDER_PREVIEW_URL', 'http://127.0.0.1:4174/Little_Luxe_Sample/')
ITEM = '11111111-1111-4111-8111-111111111111'
STAFF = '22222222-2222-4222-8222-222222222222'
CUSTOMER = '33333333-3333-4333-8333-333333333333'
ORDER = '44444444-4444-4444-8444-444444444444'
OTHER_ITEM = '55555555-5555-4555-8555-555555555555'
products = [dict(item_id=ITEM, item_name='Floral Dress', sale_price=20, image_path='https://images.example.test/dress.png',
                 product_notes='Dress description', item_category_id=None, is_active=True, is_stocked=True),
            dict(item_id=OTHER_ITEM, item_name='Linen Shirt', sale_price=30, image_path='https://images.example.test/shirt.png',
                 product_notes='Shirt description', item_category_id=None, is_active=True, is_stocked=True)]
people = [dict(customer_id=STAFF, first_name=' Jane ', last_name=' Doe ', email='jane@example.test', is_active=True),
          dict(customer_id=CUSTOMER, first_name=None, last_name=None, email='shopper@example.test', is_active=True)]
requests = []
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=')

def encode(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')

def session(role):
    identifier = STAFF if role == 'staff' else CUSTOMER
    user = dict(id=identifier, email='jane@example.test' if role == 'staff' else 'shopper@example.test', aud='authenticated',
                role='authenticated', app_metadata={'provider': 'email'}, user_metadata={}, created_at='2026-01-01T00:00:00Z', is_anonymous=False)
    token = encode({'alg': 'HS256', 'typ': 'JWT'})+'.'+encode({'sub': identifier, 'exp': int(time.time())+3600,
                                                                         'role': 'authenticated', 'user_role': role})+'.test'
    return dict(access_token=token, refresh_token='test-refresh', expires_in=3600, expires_at=int(time.time())+3600, token_type='bearer', user=user)

def api(route):
    url = route.request.url
    headers = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}
    if route.request.method == 'OPTIONS':
        route.fulfill(status=200, headers=headers)
        return
    requests.append(url)
    params = parse_qs(urlparse(url).query)
    if '/auth/v1/user' in url:
        result = session('staff')['user']
    elif '/rest/v1/rpc/get_storefront_items' in url:
        identifier = params.get('item_id', [''])[0].removeprefix('eq.')
        result = next((item for item in products if item['item_id'] == identifier), None) if identifier else products
    elif '/rest/v1/item_images' in url:
        result = [dict(image_id=str(index), item_id=ITEM, storage_path='https://images.example.test/'+name)
                  for index, name in enumerate(['dress-side.png', 'dress-back.png'])] if ITEM in url else []
    elif '/rest/v1/item_category' in url or '/rest/v1/purchase' in url or '/rest/v1/supplier' in url:
        result = []
    elif '/rest/v1/item?' in url:
        result = products
    elif '/rest/v1/customer' in url:
        result = people
    elif '/rest/v1/order_status_history' in url:
        result = [dict(history_id=1, order_id=ORDER, previous_status='received', new_status='delivered', changed_on='2026-10-28T08:00:00Z',
                       reason_code='cash_received', change_source='staff_action', changed_by=STAFF, reason_notes=None)]
    elif '/rest/v1/order_details' in url:
        result = [dict(order_details_id='line', order_id=ORDER, item_id=ITEM, quantity_sold=1, sale_price=20, batch_number=None,
                       expiry_date=None, item=dict(item_name='Floral Dress'))]
    elif '/rest/v1/order?' in url:
        result = [dict(order_id=ORDER, customer_id=CUSTOMER, added_by=STAFF, added_on='2026-10-28T08:00:00Z', order_status='delivered',
                       order_origin='staff', expected_expiry_date='2099-01-01T00:00:00Z')]
    else:
        raise AssertionError(url)
    route.fulfill(status=200, headers=headers, content_type='application/json', body=json.dumps(result))

def new_page(browser, role=None):
    context = browser.new_context()
    if role:
        context.add_init_script('localStorage.setItem("sb-checkout-test-auth-token",'+json.dumps(json.dumps(session(role)))+');')
    page = context.new_page()
    page.route('https://checkout-test.supabase.co/**', api)
    page.route('https://images.example.test/**', lambda route: route.fulfill(status=200, content_type='image/png', body=png))
    page.on('pageerror', lambda error: errors.append(str(error)))
    return context, page

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    errors = []
    public_context, page = new_page(browser)
    page.goto(BASE)
    expect(page.get_by_text('Dress description', exact=True)).to_have_count(0)
    expect(page.get_by_role('button', name='Floral Dress', exact=True)).to_have_count(0)
    expect(page.get_by_role('link', name='View full gallery', exact=True)).to_have_count(0)
    card = page.get_by_role('link', name='View details for Floral Dress', exact=True)
    expect(card).to_have_attribute('href', '/Little_Luxe_Sample/items/'+ITEM)
    card.click()
    expect(page).to_have_url(BASE+'items/'+ITEM)
    expect(page.get_by_role('heading', name='Floral Dress', exact=True)).to_be_visible()
    expect(page.get_by_text('Dress description', exact=True)).to_be_visible()
    page.get_by_role('button', name='Show image 2 of Floral Dress', exact=True).click()
    expect(page.get_by_role('img', name='Floral Dress', exact=True)).to_have_attribute('src', 'https://images.example.test/dress-side.png')
    page.reload()
    expect(page.get_by_role('heading', name='Floral Dress', exact=True)).to_be_visible()
    page.goto(BASE+'items/'+OTHER_ITEM)
    expect(page.get_by_role('heading', name='Linen Shirt', exact=True)).to_be_visible()
    expect(page.get_by_text('Shirt description', exact=True)).to_be_visible()
    expect(page.get_by_text('Dress description', exact=True)).to_have_count(0)
    page.goto(BASE+'items/99999999-9999-4999-8999-999999999999')
    expect(page.get_by_text('This item could not be found.', exact=False)).to_be_visible()
    before = sum('/rest/v1/purchase' in url for url in requests)
    page.goto(BASE+'stock-management/purchases')
    expect(page).to_have_url(BASE+'login')
    assert sum('/rest/v1/purchase' in url for url in requests) == before
    public_context.close()

    context, page = new_page(browser, 'staff')
    page.goto(BASE+'stock-management/purchases')
    expect(page.get_by_role('heading', name='Purchases', exact=True)).to_be_visible()
    page.reload()
    expect(page.get_by_role('heading', name='Purchases', exact=True)).to_be_visible()
    page.get_by_role('link', name='Item returns', exact=True).click()
    expect(page).to_have_url(BASE+'stock-management/returns')
    page.reload()
    expect(page.get_by_text('Returns are not available yet.', exact=True)).to_be_visible()
    page.go_back()
    expect(page).to_have_url(BASE+'stock-management/purchases')
    expect(page.get_by_role('heading', name='Purchases', exact=True)).to_be_visible()
    page.get_by_role('link', name='Orders', exact=True).click()
    expect(page.get_by_role('heading', name='Delivered orders', exact=True)).to_be_visible()
    page.get_by_role('button', name='View order', exact=True).click()
    expect(page.get_by_text('Customer: shopper@example.test', exact=True)).to_be_visible()
    expect(page.get_by_text('Added by: Jane Doe', exact=True)).to_be_visible()
    expect(page.get_by_text(STAFF, exact=False)).to_have_count(0)
    expect(page.get_by_text(CUSTOMER, exact=False)).to_have_count(0)
    page.goto(BASE+'admin/customers')
    page.set_viewport_size({'width': 390, 'height': 844})
    expect(page.get_by_role('heading', name='Jane Doe', exact=True)).to_be_visible()
    expect(page.get_by_role('heading', name='shopper@example.test', exact=True)).to_be_visible()
    context.close()

    context, page = new_page(browser, 'customer')
    page.goto(BASE+'stock-management/returns')
    expect(page).to_have_url(BASE)
    expect(page.get_by_role('heading', name='Item returns', exact=True)).to_have_count(0)
    assert not errors, errors
    browser.close()
    print('PASS: item URLs/gallery/reload/not-found, no inline expansion, stock child links/reload/back, parent auth guards, and name/email labels without person UUIDs.')
