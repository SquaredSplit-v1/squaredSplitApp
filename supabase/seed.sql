-- Seed: test users for FE dev
-- NOTE: auth.users rows are created by inserting directly into auth.users via SQL Editor.
-- The on_auth_user_created trigger auto-inserts profile rows.
-- This seed updates those auto-created rows with display names and test flags.
-- Safe to run multiple times (idempotent).

-- Test User 1
UPDATE profiles
SET
  full_name = 'Arjun Test',
  email = 'arjun@test.com',
  onboarding_complete = true,
  is_pro = false
WHERE phone = '+919876543210';

-- Test User 2
UPDATE profiles
SET
  full_name = 'Priya Test',
  email = 'priya@test.com',
  onboarding_complete = true,
  is_pro = false
WHERE phone = '+919876543211';

-- Test User 3 (Pro user)
UPDATE profiles
SET
  full_name = 'Rahul Pro',
  email = 'rahul@test.com',
  onboarding_complete = true,
  is_pro = true
WHERE phone = '+919876543212';

-- Verify seed applied correctly
SELECT id, full_name, phone, email, is_pro, onboarding_complete
FROM profiles
WHERE phone IN ('+919876543210', '+919876543211', '+919876543212');
