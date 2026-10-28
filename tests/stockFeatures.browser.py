"""Feature isolation/browser regressions, using mocked APIs only.

Build/preview with the same test Supabase settings as orders.browser.py.
"""
import base64
import json
import os
import time
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('ORDER_PREVIEW_URL', 'http://127.0.0.1:4174/Little_Luxe_Sample/')
USER = '22222222-2222-4222-8222-222222222222'
ITEM = '11111111-1111-4111-8111-111111111111'
PURCHASE = '33333333-3333-4333-8333-333333333333'
ORDER = '55555555-5555-4555-8555-555555555555'
DETAIL = '66666666-6666-4666-8666-666666666666'

def encode(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')

user = dict(id=USER, aud='authenticated', role='authenticated', email='staff@example.test',
            app_metadata={'provider': 'email'}, user_metadata={}, created_at='2026-01-01T00:00:00Z', is_anonymous=False)
token = encode({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encode({
    'sub': USER, 'exp': int(time.time()) + 3600, 'role': 'authenticated', 'user_role': 'staff',
}) + '.test'
session = dict(access_token=token, refresh_token='test-refresh', expires_in=3600,
               expires_at=int(time.time())+3600, token_type='bearer', user=user)
purchases = []
purchase_lines = []
create_calls = []
requests = []
categories = []
units = []

def api(route):
    url, method = route.request.url, route.request.method
    headers = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}
    if method == 'OPTIONS':
        route.fulfill(status=200, headers=headers)
        return
    requests.append(url)
    body = route.request.post_data_json if method in ('POST', 'PATCH') else None
    if '/auth/v1/user' in url:
        result = user
    elif '/rest/v1/item_category' in url:
        if method == 'POST':
            categories.append(dict(body, item_category_id=DETAIL))
            result = categories[-1]
        else:
            result = categories
    elif '/rest/v1/unit_of_measure' in url:
        if method == 'POST':
            units.append(dict(body, uom_id=DETAIL))
            result = units[-1]
        else:
            result = units
    elif '/rest/v1/rpc/create_purchase' in url:
        create_calls.append(body)
        assert 'p_added_on' not in body and 'added_by' not in body
        if len(create_calls) == 1:
            route.fulfill(status=400, headers=headers, content_type='application/json', body=json.dumps({'message': 'Purchase save failed. Please retry.', 'code': 'P0001'}))
            return
        purchases.append(dict(purchase_id=PURCHASE, invoice_number=body['p_invoice_number'], supplier_id=None,
                              purchase_notes=body['p_purchase_notes'], added_by=USER, added_on='2026-10-28T08:00:00Z',
                              summary=[dict(quantity_bought=line['quantity_bought']) for line in body['p_items_json']]))
        purchase_lines.extend([dict(line, purchase_id=PURCHASE, purchase_details_id=DETAIL) for line in body['p_items_json']])
        result = PURCHASE
    elif '/rest/v1/purchase_details' in url:
        result = purchase_lines
    elif '/rest/v1/purchase?' in url:
        if method == 'PATCH':
            purchases[0].update(body)
            result = dict(purchase_id=PURCHASE)
        else:
            result = purchases
    elif '/rest/v1/item?' in url:
        result = [dict(item_id=ITEM, item_name='Floral Dress', sale_price=20)]
    elif '/rest/v1/supplier' in url:
        result = []
    elif '/rest/v1/order?' in url:
        result = [dict(order_id=ORDER)] if 'select=order_id' in url else []
    else:
        raise AssertionError('Unexpected API request: ' + url)
    route.fulfill(status=200, headers=headers, content_type='application/json', body=json.dumps(result))

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1280, 'height': 900})
    context.add_init_script('localStorage.setItem("sb-checkout-test-auth-token",' + json.dumps(json.dumps(session)) + ');')
    page = context.new_page()
    page.route('https://checkout-test.supabase.co/**', api)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + 'stock-management')
    page.get_by_role('button', name='Purchases', exact=True).click()
    page.get_by_role('button', name='Add purchase', exact=True).click()
    page.get_by_role('button', name='Save purchase', exact=True).click()
    expect(page.get_by_text('Please enter an invoice number.', exact=True)).to_be_visible()
    assert not create_calls
    page.get_by_role('textbox', name='Invoice', exact=False).fill('INV-1')
    page.get_by_role('combobox', name='Item', exact=False).click()
    page.get_by_role('option', name='Floral Dress', exact=True).click()
    page.get_by_role('spinbutton', name='Quantity bought', exact=False).fill('2')
    page.get_by_role('spinbutton', name='Cost price', exact=False).fill('12.50')
    page.get_by_role('textbox', name='Batch number', exact=True).fill('B1')
    page.get_by_role('textbox', name='Notes', exact=True).fill('Purchase draft')
    expect(page.get_by_text('Grand total: 25.00', exact=True)).to_be_visible()
    page.get_by_role('button', name='Save purchase', exact=True).click()
    expect(page.get_by_text('Purchase save failed. Please retry.', exact=True)).to_be_visible()
    expect(page.get_by_role('textbox', name='Invoice', exact=False)).to_have_value('INV-1')
    expect(page.get_by_role('spinbutton', name='Quantity bought', exact=False)).to_have_value('2')
    page.get_by_role('button', name='Save purchase', exact=True).click()
    expect(page.get_by_text('Purchase and all item lines saved successfully.', exact=True)).to_be_visible()
    assert len(create_calls) == 2 and create_calls[0] == create_calls[1]
    assert create_calls[-1]['p_items_json'][0]['quantity_bought'] == 2
    page.get_by_role('button', name='Select', exact=True).click()
    expect(page.get_by_role('gridcell', name='Floral Dress', exact=True)).to_be_visible()
    expect(page.get_by_role('gridcell', name='2', exact=True)).to_be_visible()
    expect(page.get_by_text('Purchase item lines are read-only after creation.', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Edit', exact=True)).to_have_count(0)
    page.get_by_role('button', name='Back to purchases', exact=False).click()
    page.get_by_role('button', name='Edit', exact=True).click()
    page.get_by_role('textbox', name='Invoice', exact=False).fill('INV-EDITED')
    page.get_by_role('button', name='Save', exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(page.get_by_role('gridcell', name='INV-EDITED', exact=True)).to_be_visible()
    # The independently owned compact list keeps the same actions and labels.
    page.set_viewport_size({'width': 390, 'height': 844})
    expect(page.get_by_role('heading', name='INV-EDITED', exact=True)).to_be_visible()
    expect(page.get_by_role('grid')).to_have_count(0)
    page.get_by_role('textbox', name='Search purchases', exact=True).fill('missing')
    expect(page.get_by_text('No matching records.', exact=True)).to_be_visible()
    page.get_by_role('textbox', name='Search purchases', exact=True).fill('')
    request_count = len(requests)
    page.get_by_role('button', name='Item returns', exact=True).click()
    expect(page.get_by_role('heading', name='Item returns', exact=True)).to_be_visible()
    expect(page.get_by_text('Returns are not available yet.', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Add item return', exact=True)).to_be_disabled()
    expect(page.get_by_role('button', name='Edit', exact=True)).to_have_count(0)
    expect(page.get_by_role('button', name='Select', exact=True)).to_have_count(0)
    expect(page.get_by_role('dialog')).to_have_count(0)
    # Wait for any accidentally scheduled data access before checking the UI-only boundary.
    page.wait_for_timeout(300)
    assert len(requests) == request_count, requests[request_count:]
    # Supporting admin features keep their own forms and datasets.
    page.goto(BASE + 'admin/categories')
    page.get_by_role('button', name='Add category', exact=True).click()
    page.get_by_role('textbox', name='Category name', exact=False).fill('Independent category')
    page.get_by_role('button', name='Save', exact=True).click()
    expect(page.get_by_text('category saved successfully.', exact=True)).to_be_visible()
    page.goto(BASE + 'admin/units')
    page.get_by_role('button', name='Add unit of measure', exact=True).click()
    page.get_by_role('textbox', name='Unit name', exact=False).fill('Independent unit')
    page.get_by_role('button', name='Save', exact=True).click()
    expect(page.get_by_text('unit of measure saved successfully.', exact=True)).to_be_visible()
    expect(page.get_by_role('heading', name='Independent unit', exact=True)).to_be_visible()
    expect(page.get_by_text('Independent category', exact=True)).to_have_count(0)
    assert not errors, errors
    browser.close()
    print('PASS: purchase validation, atomic payload, retained draft/retry, header edit, read-only details, responsive search, UI-only returns with no API requests, independent category/unit forms.')
