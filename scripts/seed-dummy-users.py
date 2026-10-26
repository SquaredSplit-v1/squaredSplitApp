#!/usr/bin/env python3
"""Seed dummy users + profiles into a Supabase project (dev/staging) and
register their phones as test-OTP numbers (code 123456) so testers can sign
in as any of them. Idempotent — safe to re-run.

Usage: python3 scripts/seed-dummy-users.py <project-ref>
"""
import json
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

REF = sys.argv[1] if len(sys.argv) > 1 else 'bwkgphgnrrwczxkfeanz'
MGMT_TOKEN = subprocess.run(['security', 'find-generic-password', '-s', 'Supabase CLI', '-w'],
                            capture_output=True, text=True).stdout.strip()
BASE = f'https://{REF}.supabase.co'

USERS = [
    # India (+91)
    ('Aarav Sharma', '919000000001'), ('Priya Nair', '919000000002'),
    ('Rohan Mehta', '919000000003'), ('Ananya Iyer', '919000000004'),
    ('Vikram Rao', '919000000005'), ('Sneha Kulkarni', '919000000006'),
    # USA (+1)
    ('Emily Carter', '14155550101'), ('Jake Morrison', '14155550102'),
    ('Sofia Alvarez', '14155550103'), ('Liam Chen', '14155550104'),
    ('Olivia Bennett', '14155550105'), ('Noah Parker', '14155550106'),
    ('Grace Wilson', '14155550107'),
]
TEST_CODE = '123456'


def api_keys():
    out = subprocess.run(['npx', 'supabase', 'projects', 'api-keys', '--project-ref', REF],
                         capture_output=True, text=True).stdout
    for line in out.splitlines():
        if 'service_role' in line:
            return line.split()[-1]
    raise SystemExit('service_role key not found')


SR = api_keys()


def call(method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header('apikey', SR)
    req.add_header('Authorization', 'Bearer ' + SR)
    req.add_header('Content-Type', 'application/json')
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {'raw': raw.decode(errors='replace')}


st, listing = call('GET', '/auth/v1/admin/users?page=1&per_page=1000')
existing = {}
for u in (listing or {}).get('users', []):
    if u.get('phone'):
        existing[u['phone'].lstrip('+')] = u['id']

created = 0
for name, phone in USERS:
    uid = existing.get(phone)
    if not uid:
        st, r = call('POST', '/auth/v1/admin/users', {
            'phone': phone, 'phone_confirm': True,
            'user_metadata': {'full_name': name},
        })
        if st not in (200, 201):
            print(f'  X {name}: {st} {str(r)[:120]}')
            continue
        uid = r['id']
        created += 1
    avatar = f'https://api.dicebear.com/7.x/initials/png?seed={urllib.parse.quote(name)}'
    call('PATCH', f'/rest/v1/profiles?id=eq.{uid}', {
        'full_name': name, 'avatar_url': avatar,
        'has_onboarded': True, 'onboarding_complete': True,
    }, headers={'Prefer': 'return=minimal'})
    print(f'  + {name:16s} +{phone}')

print(f'{created} created, {len(USERS) - created} already existed')

# register as test-OTP numbers (merge with existing list)
req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{REF}/config/auth')
req.add_header('Authorization', 'Bearer ' + MGMT_TOKEN)
cfg = json.load(urllib.request.urlopen(req))
entries = dict(e.split('=') for e in (cfg.get('sms_test_otp') or '').split(',') if '=' in e)
for _, phone in USERS:
    entries[phone] = TEST_CODE
merged = ','.join(f'{p}={c}' for p, c in entries.items())
body = json.dumps({'sms_test_otp': merged,
                   'sms_test_otp_valid_until': cfg.get('sms_test_otp_valid_until') or '2027-12-31T00:00:00+00:00'}).encode()
req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{REF}/config/auth', data=body, method='PATCH')
req.add_header('Authorization', 'Bearer ' + MGMT_TOKEN)
req.add_header('Content-Type', 'application/json')
res = json.load(urllib.request.urlopen(req))
print('test-OTP numbers now:', len((res.get('sms_test_otp') or '').split(',')))
