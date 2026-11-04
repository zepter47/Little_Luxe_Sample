"""Draft recovery against real browser IndexedDB; all remote APIs are mocked.

Build/preview with the settings in cart.browser.py, then run this file.
"""
import base64
import json
import os
import time
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('ORDER_PREVIEW_URL', 'http://127.0.0.1:4174/Little_Luxe_Sample/')
USER = '22222222-2222-4222-8222-222222222222'
OTHER = '77777777-7777-4777-8777-777777777777'
ITEM = '11111111-1111-4111-8111-111111111111'
CUSTOMER = '44444444-4444-4444-8444-444444444444'
UNIT = '55555555-5555-4555-8555-555555555555'
current_user = USER
calls = []
profile_fails = True
order_fails = True


def encode(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')


def session():
    user = dict(id=current_user, aud='authenticated', role='authenticated', email='staff@example.test',
                app_metadata={'provider': 'email'}, user_metadata={}, created_at='2026-01-01T00:00:00Z', is_anonymous=False)
    token = encode({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encode({
        'sub': current_user, 'exp': int(time.time()) + 3600, 'role': 'authenticated', 'user_role': 'staff'}) + '.test'
    return dict(access_token=token, refresh_token='test-refresh', expires_in=3600,
                expires_at=int(time.time()) + 3600, token_type='bearer', user=user)


def api(route):
    global profile_fails, order_fails
    request = route.request
    path = urlparse(request.url).path
    query = parse_qs(urlparse(request.url).query)
    headers = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
               'access-control-allow-methods': '*'}
    if request.method == 'OPTIONS':
        route.fulfill(status=200, headers=headers)
        return
    if path.startswith('/storage/v1/'):
        if request.method == 'POST' and profile_fails:
            profile_fails = False
            route.fulfill(status=400, headers=headers, content_type='application/json',
                          body=json.dumps({'message': 'Mock upload failed', 'error': 'Upload failed', 'statusCode': '400'}))
            return
        result = {'path': path.split('/Fashion/')[-1]}
    elif path == '/auth/v1/user':
        result = session()['user']
    elif path == '/auth/v1/token':
        result = session()
    elif path == '/rest/v1/rpc/get_admin_items_with_stock':
        result = []
    elif path == '/rest/v1/rpc/save_item':
        body = request.post_data_json
        calls.append(('item', body))
        result = ITEM
    elif path == '/rest/v1/rpc/create_purchase':
        calls.append(('purchase', request.post_data_json))
        result = ITEM
    elif path == '/rest/v1/rpc/create_staff_order':
        calls.append(('order', request.post_data_json))
        if order_fails:
            order_fails = False
            route.fulfill(status=400, headers=headers, content_type='application/json',
                          body=json.dumps({'code': 'P0001', 'message': 'Mock order failure', 'details': '[]'}))
            return
        result = ITEM
    elif path == '/rest/v1/item':
        result = {'image_path': None} if query.get('select') == ['image_path'] else [dict(
            item_id=ITEM, item_name='Floral Dress', sale_price=20)]
        if request.method == 'PATCH':
            result = {'item_id': ITEM}
    elif path == '/rest/v1/unit_of_measure':
        result = [dict(uom_id=UNIT, uom_name='Piece')]
    elif path == '/rest/v1/customer':
        result = [dict(customer_id=CUSTOMER, first_name='Walk', last_name='In', email='customer@example.test',
                       phone_number='0700000000', is_active=True)]
    elif path in ['/rest/v1/purchase', '/rest/v1/order', '/rest/v1/supplier',
                  '/rest/v1/item_category', '/rest/v1/item_images']:
        result = []
    else:
        raise AssertionError('Unexpected API: ' + request.url)
    route.fulfill(status=200, headers=headers, content_type='application/json', body=json.dumps(result))


READ = """async ([store, user]) => {
  const db = await new Promise((resolve, reject) => {
    const open = indexedDB.open('ProductsDatabase');
    open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).get(user);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}"""


def read(page, store, user=USER):
    return page.evaluate(READ, [store, user])


def wait_value(page, store, expression, user=USER):
    predicate = 'async ([read, store, user]) => { const draft = await (0,eval)(read)([store,user]); return !!(' + expression + '); }'
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if page.evaluate(predicate, [READ, store, user]):
            return
        page.wait_for_timeout(40)
    raise AssertionError(f'Draft condition did not become true: {store}: {expression}')


def open_purchase(page):
    page.goto(BASE + 'stock-management/purchases')
    page.get_by_role('button', name='Add purchase', exact=True).click()
    expect(page.get_by_role('textbox', name='Invoice', exact=False)).to_be_enabled()


def open_item(page):
    page.goto(BASE + 'admin')
    page.get_by_role('button', name='Add item', exact=True).click()
    expect(page.get_by_role('textbox', name='Item name', exact=True)).to_be_enabled()


def approve(page, label):
    page.get_by_role('button', name=label, exact=True).click()
    page.get_by_role('button', name='Yes', exact=True).click()


def discard(page):
    page.once('dialog', lambda dialog: dialog.accept())
    page.get_by_role('button', name='Discard draft', exact=True).click()
    expect(page.get_by_role('button', name='Discard draft', exact=True)).to_have_count(0)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context()
    context.route('https://checkout-test.supabase.co/**', api)
    context.add_init_script('if (!localStorage.getItem("sb-checkout-test-auth-token")) localStorage.setItem("sb-checkout-test-auth-token",' + json.dumps(json.dumps(session())) + ');')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    # A real Dexie v3 -> v4 upgrade must preserve cart/checkout records.
    page.route('**/draft-test-seed', lambda route: route.fulfill(content_type='text/html', body='<html>Seed</html>'))
    page.goto(BASE + 'draft-test-seed')
    page.evaluate("""async user => {
      const db = await new Promise((resolve, reject) => {
        const open = indexedDB.open('ProductsDatabase', 30);
        open.onupgradeneeded = () => {
          open.result.createObjectStore('productsStore', {keyPath: 'id', autoIncrement: true});
          const cart = open.result.createObjectStore('cartItems', {keyPath: ['userId','itemId']});
          cart.createIndex('userId', 'userId');
          open.result.createObjectStore('checkoutAttempts', {keyPath: 'userId'});
        };
        open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['cartItems','checkoutAttempts'], 'readwrite');
        tx.objectStore('cartItems').put({userId: user, itemId: 'cart-sentinel', quantity: 2});
        tx.objectStore('checkoutAttempts').put({userId: user, requestId: 'checkout-sentinel'});
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
      db.close();
    }""", USER)

    open_purchase(page)
    assert read(page, 'checkoutAttempts')['requestId'] == 'checkout-sentinel'
    invoice = page.get_by_role('textbox', name='Invoice', exact=False)
    invoice.fill('RECOVER-1')
    # Filling without blurring does not write on every keystroke.
    assert not read(page, 'purchaseDraft') or read(page, 'purchaseDraft')['values']['invoice_number'] != 'RECOVER-1'
    wait_value(page, 'purchaseDraft', "draft?.values.invoice_number === 'RECOVER-1'")
    # Failed storage writes must be visible; closing waits for a real commit.
    page.evaluate("""() => {
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(...args) {
        if (this.name === 'purchaseDraft') throw new DOMException('Mock quota', 'QuotaExceededError');
        return original.apply(this, args);
      };
      window.restoreDraftPut = () => {IDBObjectStore.prototype.put = original;};
    }""")
    invoice.fill('RETRY-STORAGE')
    expect(page.get_by_text('Could not save your draft on this device.', exact=False)).to_be_visible()
    page.get_by_role('button', name='Close and keep draft', exact=True).click()
    expect(invoice).to_be_visible()
    assert read(page, 'purchaseDraft')['values']['invoice_number'] == 'RECOVER-1'
    page.evaluate('window.restoreDraftPut()')
    page.get_by_role('button', name='Retry draft save', exact=True).click()
    wait_value(page, 'purchaseDraft', "draft?.values.invoice_number === 'RETRY-STORAGE'")
    invoice.fill('RECOVER-1')
    page.get_by_role('button', name='Add item line', exact=True).click()
    page.get_by_role('textbox', name='Batch number', exact=True).nth(0).fill('KEEP')
    page.get_by_role('textbox', name='Batch number', exact=True).nth(1).fill('DELETE')
    page.get_by_role('button', name='Remove item 2', exact=True).click()
    wait_value(page, 'purchaseDraft', "draft?.values.lines.length === 1 && draft.values.lines[0].batch_number === 'KEEP'")
    stable_id = read(page, 'purchaseDraft')['values']['lines'][0]['lineId']
    page.get_by_role('button', name='Close and keep draft', exact=True).click()
    page.get_by_role('button', name='Add purchase', exact=True).click()
    expect(invoice).to_have_value('RECOVER-1')
    assert read(page, 'purchaseDraft')['values']['lines'][0]['lineId'] == stable_id
    page.get_by_role('textbox', name='Notes', exact=True).fill('survives navigation')
    page.locator('a').filter(has_text='Admin').first.evaluate('(link) => link.click()')
    expect(page.get_by_role('button', name='Add item', exact=True)).to_be_visible()
    open_purchase(page)
    expect(page.get_by_role('textbox', name='Notes', exact=True)).to_have_value('survives navigation')

    # The same browser switches account: neither restoration nor writes mix users.
    current_user = OTHER
    page.evaluate('(session) => localStorage.setItem("sb-checkout-test-auth-token", JSON.stringify(session))', session())
    open_purchase(page)
    expect(invoice).to_have_value('')
    invoice.fill('OTHER-USER')
    page.get_by_role('button', name='Close and keep draft', exact=True).click()
    assert read(page, 'purchaseDraft', OTHER)['values']['invoice_number'] == 'OTHER-USER'
    assert read(page, 'purchaseDraft', USER)['values']['invoice_number'] == 'RECOVER-1'
    current_user = USER
    page.evaluate('(session) => localStorage.setItem("sb-checkout-test-auth-token", JSON.stringify(session))', session())
    open_purchase(page)
    expect(invoice).to_have_value('RECOVER-1')
    discard(page)
    page.wait_for_timeout(650)
    assert read(page, 'purchaseDraft') is None
    open_purchase(page)
    expect(invoice).to_have_value('')
    invoice.fill('SUCCESS')
    page.get_by_role('combobox', name='Item', exact=False).click()
    page.get_by_role('option', name='Floral Dress', exact=True).click()
    page.get_by_role('spinbutton', name='Cost price', exact=False).fill('12')
    approve(page, 'Save purchase')
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.wait_for_timeout(650)
    assert read(page, 'purchaseDraft') is None

    # File objects and incomplete numbers survive reload. Retain created item ID
    # after an image failure, so the next confirmed save updates the same item.
    open_item(page)
    page.get_by_role('textbox', name='Item name', exact=True).fill('Recoverable item')
    page.get_by_role('spinbutton', name='Sale price', exact=True).fill('')
    png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7ioAAAAASUVORK5CYII=')
    page.locator('input[type=file]').nth(0).set_input_files({'name': 'profile.png', 'mimeType': 'image/png', 'buffer': png})
    page.locator('input[type=file]').nth(1).set_input_files({'name': 'gallery.png', 'mimeType': 'image/png', 'buffer': png})
    page.get_by_role('button', name='Close and keep draft', exact=True).click()
    open_item(page)
    expect(page.get_by_role('spinbutton', name='Sale price', exact=True)).to_have_value('')
    expect(page.get_by_role('img', name='profile.png', exact=True)).to_be_visible()
    expect(page.get_by_role('img', name='gallery.png', exact=True)).to_be_visible()
    assert page.evaluate('async read => Number.isNaN((await (0,eval)(read)(["itemsDraft", "' + USER + '"])).values.sale_price)', READ)
    page.get_by_role('spinbutton', name='Sale price', exact=True).fill('25')
    page.get_by_role('combobox', name='Unit of measure', exact=False).click()
    page.get_by_role('option', name='Piece', exact=True).click()
    approve(page, 'Save item')
    expect(page.get_by_text('The item exists; retry saving to finish.', exact=False)).to_be_visible()
    wait_value(page, 'itemsDraft', 'draft?.extra.savedId === "' + ITEM + '"')
    page.get_by_role('button', name='Close and keep draft', exact=True).click()
    open_item(page)
    approve(page, 'Save item')
    expect(page.get_by_role('dialog')).to_have_count(0)
    item_calls = [body for kind, body in calls if kind == 'item']
    assert len(item_calls) == 2 and item_calls[0].get('p_item_id') is None and item_calls[1]['p_item_id'] == ITEM
    page.wait_for_timeout(650)
    assert read(page, 'itemsDraft') is None

    # Retry identity survives full navigation/reload and stays out of line JSON.
    page.goto(BASE + 'dashboard')
    page.get_by_role('button', name='New staff order', exact=True).click()
    page.get_by_role('combobox', name='Customer', exact=False).click()
    page.get_by_role('option', name='Walk In', exact=False).click()
    page.get_by_role('combobox', name='Item', exact=False).click()
    page.get_by_role('option', name='Floral Dress', exact=True).click()
    page.get_by_role('spinbutton', name='Quantity', exact=False).fill('4')
    page.get_by_role('textbox', name='Order notes', exact=True).fill('Staff recovery')
    page.get_by_role('button', name='Add item', exact=True).click()
    page.get_by_role('button', name='Remove', exact=True).nth(1).click()
    wait_value(page, 'staffOrderDraft', 'draft?.values.items.length === 1')
    staff_line_id = read(page, 'staffOrderDraft')['values']['items'][0]['lineId']
    approve(page, 'Create order')
    expect(page.get_by_text('Mock order failure', exact=False)).to_be_visible()
    identity = read(page, 'staffOrderDraft')['extra']['id']
    page.get_by_role('button', name='Close and keep draft', exact=True).click()
    page.reload()
    page.get_by_role('button', name='New staff order', exact=True).click()
    expect(page.get_by_role('textbox', name='Order notes', exact=True)).to_have_value('Staff recovery')
    expect(page.get_by_role('spinbutton', name='Quantity', exact=False)).to_have_value('4')
    assert read(page, 'staffOrderDraft')['values']['items'][0]['lineId'] == staff_line_id
    page.evaluate("""() => {
      const original = IDBObjectStore.prototype.delete;
      IDBObjectStore.prototype.delete = function(...args) {
        if (this.name === 'staffOrderDraft') throw new DOMException('Mock cleanup error', 'UnknownError');
        return original.apply(this, args);
      };
      window.restoreDraftDelete = () => {IDBObjectStore.prototype.delete = original;};
    }""")
    approve(page, 'Create order')
    expect(page.get_by_text('Saved successfully, but local draft cleanup failed.', exact=False)).to_be_visible()
    assert read(page, 'staffOrderDraft')['status'] == 'completed'
    expect(page.get_by_role('button', name='Create order', exact=True)).to_be_disabled()
    page.evaluate('window.restoreDraftDelete()')
    page.get_by_role('button', name='Retry draft cleanup', exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    order_calls = [body for kind, body in calls if kind == 'order']
    assert len(order_calls) == 2 and order_calls[0]['p_request_id'] == identity == order_calls[1]['p_request_id']
    assert set(order_calls[1]['p_items_json'][0]) == {'item_id', 'quantity', 'sale_price'}
    page.wait_for_timeout(650)
    assert read(page, 'staffOrderDraft') is None
    # An incompatible persisted format blocks editing rather than replacing it
    # with empty defaults; explicit discard remains available.
    page.evaluate("""async user => {
      const db = await new Promise(resolve => {
        const open = indexedDB.open('ProductsDatabase'); open.onsuccess = () => resolve(open.result);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('purchaseDraft', 'readwrite');
        tx.objectStore('purchaseDraft').put({userId: user, formatVersion: 99, values: {important: 'retain'}});
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
      db.close();
    }""", USER)
    page.goto(BASE + 'stock-management/purchases')
    page.get_by_role('button', name='Add purchase', exact=True).click()
    expect(page.get_by_text('Could not restore this draft.', exact=False)).to_be_visible()
    expect(page.get_by_role('textbox', name='Invoice', exact=False)).to_be_disabled()
    assert read(page, 'purchaseDraft')['formatVersion'] == 99
    discard(page)
    assert read(page, 'purchaseDraft') is None
    assert not errors, errors
    browser.close()
    print('PASS: v3 upgrade, debounce, nested edits/removal, stable IDs, close/navigation recovery, account isolation, discard/success cleanup, File/NaN recovery, partial item uploads, staff retry identity after reload, storage failure/retry, completed-marker cleanup, and incompatible-draft protection.')
