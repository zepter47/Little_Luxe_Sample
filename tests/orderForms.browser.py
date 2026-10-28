"""Mocked RHF order-form regressions. Use the build/preview settings in cart.browser.py."""
import os
import base64
import json
import time
from playwright.sync_api import sync_playwright, expect

BASE=os.environ.get('ORDER_PREVIEW_URL','http://127.0.0.1:4174/Little_Luxe_Sample/')
STAFF='22222222-2222-4222-8222-222222222222'
CUSTOMER='44444444-4444-4444-8444-444444444444'
ITEM='11111111-1111-4111-8111-111111111111'
ORDER='33333333-3333-4333-8333-333333333333'
customers=[dict(customer_id=CUSTOMER, first_name='Walk', last_name='In', phone_number='0700000000', email=None, is_active=True)]
orders=[]
events=[]
calls=[]
price=[20]
created=[]
role='staff'
user_id=STAFF

def encode(data):return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip('=')
def session():
    user=dict(id=user_id,aud='authenticated',role='authenticated',email='person@example.test',app_metadata={'provider':'email'},user_metadata={},created_at='2026-01-01T00:00:00Z',is_anonymous=False)
    token=encode({'alg':'HS256','typ':'JWT'})+'.'+encode({'sub':user_id,'exp':int(time.time())+3600,'role':'authenticated','email':user['email'],'user_role':role})+'.test'
    return dict(access_token=token,refresh_token='test-refresh',expires_in=3600,expires_at=int(time.time())+3600,token_type='bearer',user=user)

def api(route):
    path=route.request.url
    headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}
    if route.request.method=='OPTIONS':route.fulfill(status=200,headers=headers);return
    body=route.request.post_data_json if route.request.method=='POST' else None
    if '/auth/v1/user' in path:result=session()['user']
    elif '/auth/v1/token' in path:result=session()
    elif '/rest/v1/rpc/save_customer' in path:
        calls.append(('save_customer',body))
        customers.append(dict(customer_id=CUSTOMER,first_name=body['p_first_name'],last_name=body['p_last_name'],email=body.get('p_email'),phone_number=body.get('p_phone_number'),address=body.get('p_address'),customer_notes=body.get('p_customer_notes'),is_active=True,added_by=STAFF,added_on='2026-10-27T08:00:00Z',updated_by=None,updated_on=None))
        result=CUSTOMER
    elif '/rest/v1/rpc/create_staff_order' in path:
        calls.append(('create_staff_order',body))
        assert body['p_customer_id']==CUSTOMER and 'p_customer_details' not in body
        attempt=len([call for call in calls if call[0]=='create_staff_order'])
        if attempt == 1:
            route.fulfill(status=400,headers=headers,content_type='application/json',body=json.dumps(dict(code='P0001',message='Temporary order error.',details='[]')))
            return
        if attempt == 2:
            price[0]=22
            route.fulfill(status=400,headers=headers,content_type='application/json',body=json.dumps(dict(code='P0001',message='Your order needs attention.',details=json.dumps([dict(item_id=ITEM,code='PRICE_CHANGED',previous_price=20,current_price=22)]))))
            return
        created.extend(body['p_items_json'])
        orders.append(dict(order_id=ORDER,added_by=STAFF,added_on='2026-10-27T08:00:00Z',order_notes='',order_status='received',updated_on=None,updated_by=None,is_active=True,customer_id=CUSTOMER,order_origin='staff',expected_expiry_date='2099-10-27T20:00:00Z',request_id=body['p_request_id']))
        events.append(dict(history_id=1,order_id=ORDER,previous_status=None,new_status='received',changed_by=STAFF,actor_type='staff',change_source='staff_order',reason_code='order_created',reason_notes=None,changed_on='2026-10-27T08:00:00Z'))
        result=ORDER
    elif '/rest/v1/rpc/update_order_status' in path:
        calls.append(('update_order_status',body))
        if body['p_new_status']=='declined':
            route.fulfill(status=400,headers=headers,content_type='application/json',body=json.dumps(dict(code='P0001',message='Status update failed.')))
            return
        old=orders[0]['order_status'];orders[0]['order_status']=body['p_new_status']
        events.append(dict(history_id=2,order_id=ORDER,previous_status=old,new_status=body['p_new_status'],changed_by=STAFF,actor_type='staff',change_source='staff_action',reason_code='cash_received',reason_notes=None,changed_on='2026-10-27T08:01:00Z'))
        result=dict(outcome='updated',order_status=body['p_new_status'])
    elif '/rest/v1/rpc/get_order_timeline' in path:result=[{k:e[k] for k in ('history_id','previous_status','new_status','changed_on')} for e in events]
    elif '/rest/v1/customer' in path:
        result=([dict(customer_id=STAFF,first_name='Jane',last_name='Staff',email='jane@example.test')]+customers) if 'customer_id=in.' in path else customers
    elif '/rest/v1/order_status_history' in path:result=events
    elif '/rest/v1/order_details' in path:result=[dict(order_details_id='55555555-5555-4555-8555-555555555555',order_id=ORDER,item_id=ITEM,quantity_sold=created[0]["quantity"],sale_price=created[0]["sale_price"],batch_number=None,expiry_date=None,item=dict(item_name='Floral Dress'))]
    elif '/rest/v1/order?' in path:
        result=[o for o in orders if (o['order_status'] in ('delivered','declined'))==('delivered' in path)]
    elif '/rest/v1/supplier' in path:result=[]
    elif '/rest/v1/item?' in path:result=[dict(item_id=ITEM,item_name='Floral Dress',sale_price=price[0])]
    else:raise AssertionError('Unexpected API request: '+path)
    route.fulfill(status=200,headers=headers,content_type='application/json',body=json.dumps(result))

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=browser.new_context()
    context.add_init_script('localStorage.setItem("sb-checkout-test-auth-token",'+json.dumps(json.dumps(session()))+');')
    page=context.new_page();page.route('https://checkout-test.supabase.co/**',api)
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE+'dashboard')
    page.get_by_role('button',name='New staff order',exact=True).click()
    page.get_by_role('button',name='Create order',exact=True).click()
    expect(page.get_by_text('Select a customer.',exact=True)).to_be_visible()
    expect(page.get_by_role('button',name='Yes',exact=True)).to_have_count(0)
    assert not calls
    page.get_by_role('combobox',name='Customer',exact=False).click()
    page.get_by_role('option',name='Walk In · 0700000000',exact=True).click()
    page.get_by_role('combobox',name='Item',exact=False).click()
    page.get_by_role('option',name='Floral Dress',exact=True).click()
    quantity=page.get_by_role('spinbutton',name='Quantity',exact=False)
    quantity.fill('0')
    page.get_by_role('button',name='Create order',exact=True).click()
    expect(page.get_by_text('Quantity must be between 1 and 999.',exact=True)).to_be_visible()
    assert not calls
    quantity.fill('1')
    page.get_by_role('button',name='Add item',exact=True).click()
    page.get_by_role('combobox',name='Item',exact=False).nth(1).click()
    page.get_by_role('option',name='Floral Dress',exact=True).click()
    page.get_by_role('spinbutton',name='Quantity',exact=False).nth(1).fill('2')
    page.get_by_role('button',name='Create order',exact=True).click()
    expect(page.get_by_text('Each item may appear only once.',exact=True)).to_be_visible()
    expect(page.get_by_role('button',name='Yes',exact=True)).to_have_count(0)
    assert not calls
    # Removing the first row preserves the second row's values and registration.
    page.get_by_role('button',name='Remove',exact=True).nth(0).click()
    expect(page.get_by_role('spinbutton',name='Quantity',exact=False)).to_have_value('2')
    expect(page.get_by_role('button',name='Remove',exact=True)).to_be_disabled()
    page.get_by_role('spinbutton',name='Quantity',exact=False).fill('1')
    page.get_by_role('textbox',name='Order notes',exact=True).fill('  Draft note  ')
    page.get_by_role('button',name='Create order',exact=True).click()
    page.get_by_role('button',name='No',exact=True).click()
    expect(page.get_by_role('textbox',name='Order notes',exact=True)).to_have_value('  Draft note  ')
    assert not calls
    # An unchanged, confirmed retry must reuse the same server idempotency key.
    page.get_by_role('button',name='Create order',exact=True).click()
    page.get_by_role('button',name='Yes',exact=True).click()
    expect(page.get_by_text('Temporary order error.',exact=True)).to_be_visible()
    expect(page.get_by_role('spinbutton',name='Quantity',exact=False)).to_have_value('1')
    page.get_by_role('button',name='Create order',exact=True).click()
    page.get_by_role('button',name='Yes',exact=True).click()
    expect(page.get_by_text('Your order needs attention.',exact=False)).to_be_visible()
    attempts=[call[1] for call in calls if call[0]=='create_staff_order']
    assert len(attempts)==2 and attempts[0]==attempts[1]
    assert attempts[0]['p_order_notes']=='Draft note'
    page.get_by_role('button',name='Refresh current prices',exact=True).click()
    expect(page.get_by_role('textbox',name='Sale price',exact=True)).to_have_value('22')
    expect(page.get_by_role('spinbutton',name='Quantity',exact=False)).to_have_value('1')
    page.get_by_role('spinbutton',name='Quantity',exact=False).fill('3')
    page.get_by_role('button',name='Create order',exact=True).click()
    page.get_by_role('button',name='Yes',exact=True).click()
    page.get_by_role('button',name='View order',exact=True).click()
    expect(page.get_by_text('Total: 66',exact=True)).to_be_visible()
    attempts=[call[1] for call in calls if call[0]=='create_staff_order']
    assert len(attempts)==3 and attempts[2]['p_request_id']!=attempts[1]['p_request_id']
    assert attempts[2]['p_items_json'][0]['quantity']==3
    # RHF validates the reason before the status mutation and retains it on failure.
    page.get_by_role('button',name='Decline order',exact=True).click()
    reason=page.get_by_role('textbox',name='Reason for decline',exact=False)
    reason.fill('   ')
    page.get_by_role('button',name='Yes',exact=True).click()
    expect(page.get_by_text('Enter a reason for declining this order.',exact=True)).to_be_visible()
    assert not any(call[0]=='update_order_status' for call in calls)
    reason.fill('  Decline reason  ')
    page.get_by_role('button',name='Yes',exact=True).click()
    expect(page.get_by_text('Status update failed.',exact=True)).to_be_visible()
    expect(reason).to_have_value('  Decline reason  ')
    assert calls[-1][1]['p_reason']=='Decline reason'
    count=len(calls)
    page.get_by_role('button',name='No',exact=True).click()
    assert len(calls)==count
    # A new action gets fresh form defaults, rather than the previous decline reason.
    page.get_by_role('button',name='Confirm delivery and cash received',exact=True).click()
    page.get_by_role('button',name='No',exact=True).click()
    assert len(calls)==count
    page.get_by_role('button',name='Confirm delivery and cash received',exact=True).click()
    page.get_by_role('button',name='Yes',exact=True).click()
    expect(page.get_by_text('Order updated.',exact=True)).to_be_visible()
    assert calls[-1][1]['p_reason']=='' and calls[-1][1]['p_new_status']=='delivered'
    assert not errors,errors
    browser.close()
    print('PASS: RHF line validation/removal, No preserves draft, failed-save retention, stable retry IDs, price refresh/new payload ID, decline validation, status retry/cancel, and fresh action defaults.')
