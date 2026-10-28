"""Run against npm run dev; all Supabase requests are mocked."""
import base64
import json
import os
import shutil
import time
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=shutil.which("chromium"), args=["--no-sandbox"])
    page = browser.new_page()
    calls = []
    expired = True
    user = {"id": "11111111-1111-4111-8111-111111111111", "email": "person@example.com", "aud": "authenticated", "role": "authenticated", "app_metadata": {}, "user_metadata": {}}
    def part(value):
        return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
    token = part({"alg": "HS256", "typ": "JWT"}) + '.' + part({**user, "sub": user['id'], "exp": int(time.time()) + 3600, "iat": int(time.time()), "user_role": "customer"}) + '.c2lnbmF0dXJl'
    def respond(route):
        request = route.request
        calls.append((request.url, request.post_data_json))
        if request.url.endswith('/otp'):
            route.fulfill(status=200, json={})
        elif '/verify' in request.url:
            if expired:
                route.fulfill(status=403, headers={"x-supabase-api-version": "2024-01-01"}, json={"code": "otp_expired", "error_code": "otp_expired", "message": "Token has expired or is invalid"})
            else:
                route.fulfill(status=200, json={"access_token": token, "refresh_token": "refresh", "expires_in": 3600, "token_type": "bearer", "user": user})
        elif '/user' in request.url:
            route.fulfill(status=200, json=user)
        elif '/.well-known/' in request.url:
            route.fulfill(status=200, json={"keys": []})
        else:
            route.fulfill(status=200, json=[])
    page.route('https://*.supabase.co/**', respond)
    base_url = os.environ.get('BASE_URL', 'http://127.0.0.1:5173').rstrip('/')
    page.goto(base_url + '/login')
    send = page.get_by_role('button', name='Send sign-in code', exact=True)
    send.click()
    expect(page.get_by_text('Enter your email address.', exact=True)).to_be_visible()
    email = page.get_by_label('Email address')
    email.fill('invalid')
    send.click()
    expect(page.get_by_text('Enter a valid email address.', exact=True)).to_be_visible()
    assert not calls
    email.fill(' person@example.com ')
    send.click()
    code = page.get_by_label('Sign-in code')
    expect(code).to_be_visible()
    assert calls[-1][1]['email'] == 'person@example.com'
    verify = page.get_by_role('button', name='Verify code and sign in')
    verify.click()
    expect(page.get_by_text('Enter the code from your email.', exact=True)).to_be_visible()
    for invalid in ['12345', '12a456']:
        code.fill(invalid)
        verify.click()
        expect(page.get_by_text('Enter a six-digit code using numbers only.', exact=True)).to_be_visible()
    assert len(calls) == 1
    code.fill('012345')
    verify.click()
    expect(page.get_by_text('This code is invalid or has expired. Try again or request a new code.', exact=True)).to_be_visible()
    assert calls[-1][1]['token'] == '012345'
    page.get_by_role('button', name='Change email or request a new code').click()
    expect(email).to_have_value('person@example.com')
    email.fill('other@example.com')
    send.click()
    expect(page.get_by_text('The code was sent to other@example.com.', exact=True)).to_be_visible()
    expect(code).to_have_value('')
    expired = False
    code.fill('654321')
    verify.click()
    
    try:
        page.wait_for_url('**/profile', timeout=10000)
    except Exception:
        print(page.locator('body').inner_text())
        print(calls)
        raise
    assert any('/verify' in url and data['email'] == 'other@example.com' for url, data in calls)
    page.context.clear_cookies()
    page.evaluate('localStorage.clear()')
    page.goto(base_url + '/auth/callback#access_token=old-link&refresh_token=old')
    page.wait_for_url('**/login')
    expect(send).to_be_visible()
    browser.close()
    print('PASS: email/code validation, expired code, email change, session redirect, retired callback')
