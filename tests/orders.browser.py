"""Mocked order/customer browser checks. Use the build and preview command in cart.browser.py."""
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
customers=[]
orders=[]
events=[]
calls=[]
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
        orders.append(dict(order_id=ORDER,added_by=STAFF,added_on='2026-10-27T08:00:00Z',order_notes='',order_status='received',updated_on=None,updated_by=None,is_active=True,customer_id=CUSTOMER,order_origin='staff',expected_expiry_date='2099-10-27T20:00:00Z',request_id=body['p_request_id']))
        events.append(dict(history_id=1,order_id=ORDER,previous_status=None,new_status='received',changed_by=STAFF,actor_type='staff',change_source='staff_order',reason_code='order_created',reason_notes=None,changed_on='2026-10-27T08:00:00Z'))
        result=ORDER
    elif '/rest/v1/rpc/update_order_status' in path:
        calls.append(('update_order_status',body))
        old=orders[0]['order_status'];orders[0]['order_status']=body['p_new_status']
        events.append(dict(history_id=2,order_id=ORDER,previous_status=old,new_status=body['p_new_status'],changed_by=STAFF,actor_type='staff',change_source='staff_action',reason_code='cash_received',reason_notes=None,changed_on='2026-10-27T08:01:00Z'))
        result=dict(outcome='updated',order_status=body['p_new_status'])
    elif '/rest/v1/rpc/get_order_timeline' in path:result=[{k:e[k] for k in ('history_id','previous_status','new_status','changed_on')} for e in events]
    elif '/rest/v1/customer' in path:
        result=([dict(customer_id=STAFF,first_name='Jane',last_name='Staff',email='jane@example.test')]+customers) if 'customer_id=in.' in path else customers
    elif '/rest/v1/order_status_history' in path:result=events
    elif '/rest/v1/order_details' in path:result=[dict(order_details_id='55555555-5555-4555-8555-555555555555',order_id=ORDER,item_id=ITEM,quantity_sold=1,sale_price=20,batch_number=None,expiry_date=None,item=dict(item_name='Floral Dress'))]
    elif '/rest/v1/order?' in path:
        result=[o for o in orders if (o['order_status'] in ('delivered','declined'))==('delivered' in path)]
    elif '/rest/v1/supplier' in path:result=[]
    elif '/rest/v1/item?' in path:result=[dict(item_id=ITEM,item_name='Floral Dress',sale_price=20)]
    else:raise AssertionError('Unexpected API request: '+path)
    route.fulfill(status=200,headers=headers,content_type='application/json',body=json.dumps(result))

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=browser.new_context()
    context.add_init_script('localStorage.setItem("sb-checkout-test-auth-token",'+json.dumps(json.dumps(session()))+');')
    page=context.new_page();page.route('https://checkout-test.supabase.co/**',api)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'admin/customers')
    page.get_by_role('button',name='Add customer',exact=True).click()
    page.get_by_role('textbox',name='First name',exact=False).fill('Walk')
    page.get_by_role('textbox',name='Last name',exact=False).fill('In')
    page.get_by_role('textbox',name='Phone number',exact=True).fill('0700000000')
    page.get_by_role('button',name='Save',exact=True).click()
    expect(page.get_by_role('button',name='Yes',exact=True)).to_be_visible()
    assert not any(c[0]=='save_customer' for c in calls)
    page.get_by_role('button',name='No',exact=True).click()
    expect(page.get_by_role('textbox',name='First name',exact=False)).to_have_value('Walk')
    assert not any(c[0]=='save_customer' for c in calls)
    page.get_by_role('button',name='Save',exact=True).click()
    page.get_by_role('button',name='Yes',exact=True).click()
    expect(page.get_by_text('customer saved successfully.',exact=True)).to_be_visible()
    page.goto(BASE+'dashboard')
    page.get_by_role('button',name='New staff order',exact=True).click()
    page.get_by_role('combobox',name='Customer',exact=False).click()
    page.get_by_role('option',name='Walk In · 0700000000',exact=True).click()
    page.get_by_role('combobox',name='Item',exact=False).click()
    page.get_by_role('option',name='Floral Dress',exact=True).click()
    expect(page.get_by_role('dialog').locator('.MuiInputLabel-root')).to_have_count(0)
    expect(page.get_by_role('dialog').locator('label',has_text='Quantity')).to_be_visible()
    page.get_by_role('button',name='Create order',exact=True).click()
    assert not any(c[0]=='create_staff_order' for c in calls)
    page.get_by_role('button',name='No',exact=True).click()
    page.get_by_role('button',name='Create order',exact=True).click()
    page.get_by_role('button',name='Yes',exact=True).click()
    page.get_by_role('button',name='View order',exact=True).click()
    expect(page.get_by_text('Customer: Walk In',exact=True)).to_be_visible()
    expect(page.get_by_text('Added by: Jane Staff',exact=True)).to_be_visible()
    expect(page.get_by_role('button',name='Confirm delivery and cash received',exact=True)).to_be_visible()
    expect(page.get_by_role('button',name='Process order',exact=True)).to_have_count(0)
    page.get_by_role('button',name='Confirm delivery and cash received',exact=True).click()
    assert not any(c[0]=='update_order_status' for c in calls)
    page.get_by_role('button',name='No',exact=True).click()
    page.get_by_role('button',name='Confirm delivery and cash received',exact=True).click()
    page.get_by_role('button',name='Yes',exact=True).click()
    expect(page.get_by_text('Order updated.',exact=True)).to_be_visible()
    page.get_by_role('button',name='Close',exact=True).click()
    expect(page.get_by_role('button',name='View order',exact=True)).to_have_count(0)
    page.get_by_role('button',name='Order history',exact=True).click()
    page.get_by_role('button',name='View order',exact=True).click()
    expect(page.get_by_role('button',name='Confirm delivery and cash received',exact=True)).to_have_count(0)
    page.get_by_role('button',name='Close',exact=True).click()
    page.goto(BASE+'stock-management')
    expect(page.get_by_role('heading',name='Delivered orders',exact=True)).to_be_visible()
    expect(page.get_by_role('button',name='View order',exact=True)).to_be_visible()
    # Customer dashboard exposes a read-only projected timeline.
    context.close();role='customer';user_id=CUSTOMER
    orders[0].update(order_origin='online',added_by=CUSTOMER,order_status='received')
    context=browser.new_context()
    context.add_init_script('localStorage.setItem("sb-checkout-test-auth-token",'+json.dumps(json.dumps(session()))+');')
    page=context.new_page();page.route('https://checkout-test.supabase.co/**',api);page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'dashboard')
    page.get_by_role('button',name='View order',exact=True).click()
    expect(page.get_by_role('button',name='Process order',exact=True)).to_have_count(0)
    expect(page.get_by_role('button',name='Decline order',exact=True)).to_have_count(0)
    expect(page.get_by_text('Added by: '+STAFF,exact=True)).to_have_count(0)
    assert not errors,errors
    browser.close()
    print('PASS: customer registration, existing-customer staff order, confirmation dialogs, cash delivery, active/history filters, delivered stock view, read-only customer dashboard.')
