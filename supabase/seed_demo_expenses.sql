-- Demo expenses for testing Home "Recent activity" + expense detail.
--
-- How to run: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Primary user is fixed below; a second participant is the first other auth.users row.
-- Requires: your UUID exists in auth.users, plus at least one other user.
-- Sign in as the primary user in the app to see these splits (RLS).
--
-- Re-run safe: deletes prior demo rows with the same IDs, then inserts fresh data.

DO $$
DECLARE
  -- Your account (update if you use a different tester).
  u1 uuid := 'ebd993b3-65cd-460a-9f6f-3723d8343058'::uuid;
  u2 uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = u1) THEN
    RAISE EXCEPTION '[DEMO] User % is not in auth.users. Check the UUID.', u1;
  END IF;

  SELECT id INTO u2 FROM auth.users WHERE id <> u1 ORDER BY created_at ASC LIMIT 1;

  IF u2 IS NULL THEN
    RAISE EXCEPTION
      '[DEMO] Need a second user in auth.users (any account other than %). Create another user and run again.', u1;
  END IF;

  DELETE FROM public.expense_participants
  WHERE expense_id IN (
    'd0000001-0000-4000-8000-000000000001'::uuid,
    'd0000002-0000-4000-8000-000000000002'::uuid,
    'd0000003-0000-4000-8000-000000000003'::uuid
  );

  DELETE FROM public.expenses
  WHERE id IN (
    'd0000001-0000-4000-8000-000000000001'::uuid,
    'd0000002-0000-4000-8000-000000000002'::uuid,
    'd0000003-0000-4000-8000-000000000003'::uuid
  );

  -- 1) You (u1) paid — other person (u2) owes you their share
  INSERT INTO public.expenses (
    id,
    amount,
    description,
    paid_by,
    split_type,
    created_by,
    created_at
  )
  VALUES (
    'd0000001-0000-4000-8000-000000000001'::uuid,
    18.57,
    '[DEMO] Taxi',
    u1,
    'equal',
    u1,
    now() - interval '3 days'
  );

  INSERT INTO public.expense_participants (expense_id, user_id, share_amount)
  VALUES
    ('d0000001-0000-4000-8000-000000000001'::uuid, u1, 9.29),
    ('d0000001-0000-4000-8000-000000000001'::uuid, u2, 9.28);

  -- 2) Other person (u2) paid — you (u1) owe your share
  INSERT INTO public.expenses (
    id,
    amount,
    description,
    paid_by,
    split_type,
    created_by,
    created_at
  )
  VALUES (
    'd0000002-0000-4000-8000-000000000002'::uuid,
    2420.00,
    '[DEMO] Group trip',
    u2,
    'equal',
    u2,
    now() - interval '2 days'
  );

  INSERT INTO public.expense_participants (expense_id, user_id, share_amount)
  VALUES
    ('d0000002-0000-4000-8000-000000000002'::uuid, u1, 1210.00),
    ('d0000002-0000-4000-8000-000000000002'::uuid, u2, 1210.00);

  -- 3) You (u1) paid again — mixed list
  INSERT INTO public.expenses (
    id,
    amount,
    description,
    paid_by,
    split_type,
    created_by,
    created_at
  )
  VALUES (
    'd0000003-0000-4000-8000-000000000003'::uuid,
    370.50,
    '[DEMO] Dinner',
    u1,
    'equal',
    u1,
    now() - interval '1 day'
  );

  INSERT INTO public.expense_participants (expense_id, user_id, share_amount)
  VALUES
    ('d0000003-0000-4000-8000-000000000003'::uuid, u1, 185.25),
    ('d0000003-0000-4000-8000-000000000003'::uuid, u2, 185.25);

  RAISE NOTICE '[DEMO] Inserted 3 expenses for you (%) and partner (%). Sign in as the primary user in the app.', u1, u2;
END $$;

-- Quick verify (optional)
SELECT id, amount, description, paid_by, created_at
FROM public.expenses
WHERE description LIKE '[DEMO] %'
ORDER BY created_at DESC;

SELECT ep.expense_id, e.description, ep.user_id, ep.share_amount
FROM public.expense_participants ep
JOIN public.expenses e ON e.id = ep.expense_id
WHERE e.description LIKE '[DEMO] %'
ORDER BY e.created_at DESC, ep.user_id;
