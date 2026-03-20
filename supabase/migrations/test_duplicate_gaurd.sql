-- Run the same insert again with the same phone
-- Should NOT throw — ON CONFLICT DO NOTHING handles it
INSERT INTO auth.users (
  id, instance_id, phone, phone_confirmed_at, role, aud,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  '+919876543299',   -- same phone — will hit UNIQUE constraint on profiles.phone
  now(), 'authenticated', 'authenticated', now(), now(),
  '', '', '',
  '{"provider": "phone", "providers": ["phone"]}',
  '{}', false
);
