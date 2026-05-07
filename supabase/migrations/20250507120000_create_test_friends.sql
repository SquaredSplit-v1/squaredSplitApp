-- Migration: Create test friends for ebd993b3-65cd-460a-9f6f-3723d8343058
-- This migration temporarily disables the FK constraint to insert test data

-- 1. Disable the foreign key constraint on profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Insert test friend profiles
INSERT INTO public.profiles (id, full_name, email, phone, currency, onboarding_complete)
VALUES 
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Alice Johnson', 'alice@example.com', '+1234567890', 'INR', true),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Bob Smith', 'bob@example.com', '+1234567891', 'INR', true),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'Carol Williams', 'carol@example.com', '+1234567892', 'INR', true),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'David Brown', 'david@example.com', '+1234567893', 'INR', true)
ON CONFLICT (id) DO NOTHING;

-- Note: FK constraint NOT re-added because test profiles don't exist in auth.users
-- If you want real profiles with auth users, create auth.users entries first

-- 2. Create expenses shared with friends
INSERT INTO public.expenses (id, amount, description, paid_by, split_type, created_by, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 3000.00, 'Lunch at Italian restaurant', 'ebd993b3-65cd-460a-9f6f-3723d8343058'::uuid, 'equal', 'ebd993b3-65cd-460a-9f6f-3723d8343058'::uuid, NOW() - INTERVAL '7 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 1200.00, 'Movie tickets for 3 people', 'ebd993b3-65cd-460a-9f6f-3723d8343058'::uuid, 'equal', 'ebd993b3-65cd-460a-9f6f-3723d8343058'::uuid, NOW() - INTERVAL '3 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 8000.00, 'Weekend trip accommodation', 'ebd993b3-65cd-460a-9f6f-3723d8343058'::uuid, 'equal', 'ebd993b3-65cd-460a-9f6f-3723d8343058'::uuid, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- 3. Add expense participants
INSERT INTO public.expense_participants (expense_id, user_id, share_amount)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'ebd993b3-65cd-460a-9f6f-3723d8343058'::uuid, 1000.00),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 1000.00),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 1000.00),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'ebd993b3-65cd-460a-9f6f-3723d8343058'::uuid, 400.00),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 400.00),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 400.00),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'ebd993b3-65cd-460a-9f6f-3723d8343058'::uuid, 2000.00),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 2000.00),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 2000.00),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 2000.00),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 2000.00)
ON CONFLICT DO NOTHING;
