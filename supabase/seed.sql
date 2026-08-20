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

-- Dummy Expenses (SS-021: Test data for expense feature)
-- Note: These use hardcoded UUIDs for the test users. In production, get actual user IDs.
-- For seed data, we'll use placeholder UUIDs that can be updated after user creation.

-- Get user IDs for test accounts
WITH user_ids AS (
  SELECT
    (SELECT id FROM auth.users WHERE email = 'arjun@test.com' LIMIT 1) as arjun_id,
    (SELECT id FROM auth.users WHERE email = 'priya@test.com' LIMIT 1) as priya_id,
    (SELECT id FROM auth.users WHERE email = 'rahul@test.com' LIMIT 1) as rahul_id
)

-- Expense 1: Dinner split equally between Arjun and Priya (Arjun paid)
INSERT INTO expenses (id, amount, description, paid_by, split_type, created_by, created_at)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  2500.00,
  'Dinner at Nobu',
  arjun_id,
  'equal',
  arjun_id,
  now() - interval '2 days'
FROM user_ids
WHERE arjun_id IS NOT NULL AND priya_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add participants for Expense 1
INSERT INTO expense_participants (expense_id, user_id, share_amount)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  id,
  1250.00
FROM auth.users
WHERE email IN ('arjun@test.com', 'priya@test.com')
ON CONFLICT DO NOTHING;

-- Expense 2: Movie tickets (Priya paid for 3 people)
INSERT INTO expenses (id, amount, description, paid_by, split_type, created_by, created_at)
SELECT
  '22222222-2222-2222-2222-222222222222'::uuid,
  900.00,
  'Movie tickets',
  priya_id,
  'equal',
  priya_id,
  now() - interval '1 day'
FROM user_ids
WHERE priya_id IS NOT NULL AND arjun_id IS NOT NULL AND rahul_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add participants for Expense 2
INSERT INTO expense_participants (expense_id, user_id, share_amount)
SELECT
  '22222222-2222-2222-2222-222222222222'::uuid,
  id,
  300.00
FROM auth.users
WHERE email IN ('arjun@test.com', 'priya@test.com', 'rahul@test.com')
ON CONFLICT DO NOTHING;

-- Expense 3: Groceries (Rahul paid)
INSERT INTO expenses (id, amount, description, paid_by, split_type, created_by, created_at)
SELECT
  '33333333-3333-3333-3333-333333333333'::uuid,
  3600.00,
  'Weekly groceries',
  rahul_id,
  'exact',
  rahul_id,
  now() - interval '5 hours'
FROM user_ids
WHERE rahul_id IS NOT NULL AND arjun_id IS NOT NULL AND priya_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add participants for Expense 3 with exact amounts
INSERT INTO expense_participants (expense_id, user_id, share_amount)
VALUES
  ('33333333-3333-3333-3333-333333333333'::uuid, (SELECT id FROM auth.users WHERE email = 'rahul@test.com' LIMIT 1), 1800.00),
  ('33333333-3333-3333-3333-333333333333'::uuid, (SELECT id FROM auth.users WHERE email = 'arjun@test.com' LIMIT 1), 1200.00),
  ('33333333-3333-3333-3333-333333333333'::uuid, (SELECT id FROM auth.users WHERE email = 'priya@test.com' LIMIT 1), 600.00)
ON CONFLICT DO NOTHING;

-- Verify seed data
SELECT 'Expenses created:' as status;
SELECT id, amount, description, paid_by, split_type, created_at FROM expenses LIMIT 10;
SELECT 'Participants:' as status;
SELECT expense_id, user_id, share_amount FROM expense_participants LIMIT 10;
