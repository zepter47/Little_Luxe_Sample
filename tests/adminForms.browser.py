"""Mocked add/edit approval checks for every administrative form.

Use the build and preview settings documented in cart.browser.py.
"""
import base64
import json
import os
import time
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('ORDER_PREVIEW_URL', 'http://127.0.0.1:4174/Little_Luxe_Sample/')
USER = '22222222-2222-4222-8222-222222222222'
ITEM = '11111111-1111-4111-8111-111111111111'
CATEGORY = '33333333-3333-4333-8333-333333333333'
UNIT = '44444444-4444-4444-8444-444444444444'
CUSTOMER = '55555555-5555-4555-8555-555555555555'
SUPPLIER_CATEGORY = '66666666-6666-4666-8666-666666666666'
tables = {'item_category': [], 'unit_of_measure': [], 'customer': [], 'supplier_category': [], 'supplier': []}
identities = {'item_category': ('item_category_id', CATEGORY), 'unit_of_measure': ('uom_id', UNIT),
              'supplier_category': ('supplier_category_id', SUPPLIER_CATEGORY), 'supplier': ('supplier_id', ITEM)}
items = []
writes = []
fail_next = False

def encode(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')

user = dict(id=USER, aud='authenticated', role='authenticated', email='staff@example.test', app_metadata={'provider': 'email'},
            user_metadata={}, created_at='2026-01-01T00:00:00Z', is_anonymous=False)
token = encode({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encode({'sub': USER, 'exp': int(time.time())+3600,
                                                                          'role': 'authenticated', 'user_role': 'staff'}) + '.test'
session = dict(access_token=token, refresh_token='test-refresh', expires_in=3600,
               expires_at=int(time.time())+3600, token_type='bearer', user=user)

def api(route):
    global fail_next
    url, method = route.request.url, route.request.method
    headers = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}
    if method == 'OPTIONS':
        route.fulfill(status=200, headers=headers)
        return
    body = route.request.post_data_json if method in ('POST', 'PATCH') else None
    if '/auth/v1/user' in url:
        result = user
    elif '/rest/v1/rpc/get_admin_items_with_stock' in url:
        result = items
    elif '/rest/v1/rpc/save_item' in url:
        writes.append(('save_item', body))
        item = dict(item_id=body.get('p_item_id') or ITEM, item_name=body['p_item_name'], sale_price=body['p_sale_price'],
                    item_category_id=body['p_category_id'], uom_id=body['p_uom_id'], product_notes=body['p_product_notes'],
                    is_active=body['p_is_active'], image_path=None, is_stocked=False, quantity_on_hand=0)
        items[:] = [item]
        result = ITEM
    elif '/rest/v1/rpc/save_customer' in url:
        writes.append(('save_customer', body))
        if fail_next:
            fail_next = False
            route.fulfill(status=400, headers=headers, content_type='application/json', body=json.dumps({'code': 'P0001', 'message': 'Customer save failed. Try again.'}))
            return
        customer = {key.removeprefix('p_'): value for key, value in body.items()}
        customer['customer_id'] = body.get('p_customer_id') or CUSTOMER
        tables['customer'][:] = [customer]
        result = customer['customer_id']
    elif '/rest/v1/item_images' in url:
        result = []
    elif '/rest/v1/' in url:
        table = url.split('/rest/v1/')[1].split('?')[0]
        assert table in tables, url
        if method in ('POST', 'PATCH'):
            writes.append((table, body))
            id_key, identifier = identities[table]
            if method == 'POST':
                record = dict(body)
                record[id_key] = body.get(id_key) or identifier
                tables[table].append(record)
            else:
                tables[table][0].update(body)
                record = tables[table][0]
            result = record
        else:
            result = tables[table]
    else:
        raise AssertionError(url)
    route.fulfill(status=200, headers=headers, content_type='application/json', body=json.dumps(result))

def approve(page, save_name='Save'):
    """No preserves the form and makes no write; a second Save + Yes writes once."""
    count = len(writes)
    page.get_by_role('button', name=save_name, exact=True).click()
    expect(page.get_by_role('button', name='Yes', exact=True)).to_be_visible()
    assert len(writes) == count
    page.get_by_role('button', name='No', exact=True).click()
    assert len(writes) == count
    expect(page.get_by_role('button', name=save_name, exact=True)).to_be_visible()
    page.get_by_role('button', name=save_name, exact=True).click()
    page.get_by_role('button', name='Yes', exact=True).click()

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 390, 'height': 844})
    context.add_init_script('localStorage.setItem("sb-checkout-test-auth-token",' + json.dumps(json.dumps(session)) + ');')
    page = context.new_page()
    page.route('https://checkout-test.supabase.co/**', api)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    for route, singular, label, table in [('categories', 'category', 'Category name', 'item_category'),
                                           ('units', 'unit of measure', 'Unit name', 'unit_of_measure')]:
        page.goto(BASE + 'admin/' + route)
        page.get_by_role('button', name='Add ' + singular, exact=True).click()
        count = len(writes)
        page.get_by_role('button', name='Save', exact=True).click()
        expect(page.get_by_text('Please enter ' + label.lower() + '.', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Yes', exact=True)).to_have_count(0)
        assert len(writes) == count
        page.get_by_role('textbox', name=label, exact=False).fill('  Original  ')
        approve(page)
        expect(page.get_by_role('dialog')).to_have_count(0)
        assert len(writes) == count + 1
        assert 'Original' in tables[table][0].values()
        page.get_by_role('button', name='Edit Original', exact=True).click()
        expect(page.get_by_role('textbox', name=label, exact=False)).to_have_value('Original')
        page.get_by_role('textbox', name=label, exact=False).fill('Edited')
        approve(page)
        expect(page.get_by_role('dialog')).to_have_count(0)
        assert len(writes) == count + 2
        assert 'Edited' in tables[table][0].values()

    page.goto(BASE + 'admin/customers')
    page.get_by_role('button', name='Add customer', exact=True).click()
    page.get_by_role('textbox', name='First name', exact=False).fill('Walk')
    page.get_by_role('textbox', name='Last name', exact=False).fill('In')
    page.get_by_role('textbox', name='Email', exact=True).fill('invalid-email')
    page.get_by_role('button', name='Save', exact=True).click()
    expect(page.get_by_text('Enter a valid email address.', exact=True)).to_be_visible()
    page.get_by_role('textbox', name='Email', exact=True).fill('person@example.test')
    fail_next = True
    approve(page)
    expect(page.get_by_text('Customer save failed. Try again.', exact=True)).to_be_visible()
    expect(page.get_by_role('textbox', name='First name', exact=False)).to_have_value('Walk')
    approve(page)
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.get_by_role('button', name='Edit Walk In', exact=True).click()
    page.get_by_role('checkbox', name='Active', exact=True).uncheck()
    approve(page)
    expect(page.get_by_role('dialog')).to_have_count(0)
    assert tables['customer'][0]['is_active'] is False

    page.goto(BASE + 'admin/suppliers')
    page.get_by_role('button', name='Add supplier category', exact=True).click()
    page.get_by_role('textbox', name='Category name', exact=False).fill('Wholesale')
    approve(page)
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.get_by_role('button', name='Edit Wholesale', exact=True).click()
    page.get_by_role('textbox', name='Category name', exact=False).fill('Wholesale updated')
    approve(page)
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.get_by_role('button', name='Add supplier', exact=True).click()
    page.get_by_role('textbox', name='Supplier name', exact=False).fill('Supplier A')
    page.get_by_role('combobox', name='Supplier category', exact=False).click()
    page.get_by_role('option', name='Wholesale updated', exact=True).click()
    approve(page)
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.get_by_role('button', name='Edit Supplier A', exact=True).click()
    page.get_by_role('textbox', name='Supplier name', exact=False).fill('Supplier B')
    approve(page)
    expect(page.get_by_role('dialog')).to_have_count(0)

    page.goto(BASE + 'admin')
    page.get_by_role('button', name='Add item', exact=True).click()
    page.get_by_role('textbox', name='Item name', exact=True).fill('Item A')
    page.get_by_role('spinbutton', name='Sale price', exact=True).fill('25')
    page.get_by_role('combobox', name='Unit of measure', exact=False).click()
    page.get_by_role('option', name='Edited', exact=True).click()
    approve(page, 'Save item')
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.get_by_role('button', name='Edit Item A', exact=True).click()
    page.get_by_role('textbox', name='Item name', exact=True).fill('Item B')
    approve(page, 'Save item')
    expect(page.get_by_role('dialog')).to_have_count(0)
    assert items[0]['item_name'] == 'Item B'
    assert not errors, errors
    browser.close()
    print('PASS: all admin add/edit forms require Yes, No makes no write, invalid forms never confirm, failed saves retain drafts, and typed defaults survive edits.')
