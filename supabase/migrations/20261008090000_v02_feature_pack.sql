-- v0.2 feature pack: group management, group settle-up, receipts, agreements
-- (signatures), expense approvals, and owner edits (notes).
--
-- All objects are idempotent so the migration is safe on any branch.

-- ── 1. Group member management ────────────────────────────────────────────
-- add_group_members already exists (20260903090000). Add the inverse:
CREATE OR REPLACE FUNCTION public.remove_group_member(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric := 0;
BEGIN
  IF NOT public.is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'SS701: you are not a member of this group';
  END IF;

  -- Block removing members who still owe or are owed within the group.
  SELECT COALESCE(SUM(
    CASE WHEN e.paid_by = ep.user_id THEN e.amount - ep.share_amount
         ELSE -ep.share_amount END
  ), 0) INTO v_balance
  FROM public.expense_participants ep
  JOIN public.expenses e ON e.id = ep.expense_id
  WHERE e.group_id = p_group_id
    AND ep.user_id = p_user_id
    AND COALESCE(ep.is_settled, false) = false;

  IF v_balance IS NULL OR ABS(v_balance) > 0.005 THEN
    RAISE EXCEPTION 'SS702: member still has an outstanding balance in this group';
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_group_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_group_member(uuid, uuid) TO authenticated;

-- ── 2. Group square-up ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.settle_up_group(
  p_group_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_updated bigint;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'SS711: not authenticated';
  END IF;

  IF NOT public.is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'SS712: you are not a member of this group';
  END IF;

  -- Settle this user's unsettled shares on every expense in the group.
  UPDATE public.expense_participants ep
  SET is_settled = true, updated_at = now()
  FROM public.expenses e
  WHERE e.id = ep.expense_id
    AND e.group_id = p_group_id
    AND ep.user_id = v_user
    AND COALESCE(ep.is_settled, false) = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Tell the other members through the activity feed when it exists.
  IF to_regclass('public.activity_feed') IS NOT NULL THEN
    INSERT INTO public.activity_feed (user_id, type, metadata)
    SELECT gm.user_id, 'group_settled', json_build_object(
             'settled_by', v_user,
             'group_id', p_group_id,
             'shares_settled', v_updated)
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id <> v_user;
  END IF;

  RETURN json_build_object('settled_shares', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_up_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_up_group(uuid) TO authenticated;

-- ── 3. Owner edits on expenses (note / due date / category) ───────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expenses'
      AND policyname = 'expenses_owner_update'
  ) THEN
    CREATE POLICY "expenses_owner_update" ON public.expenses
      FOR UPDATE USING (
        auth.uid() = paid_by OR auth.uid() = created_by
      ) WITH CHECK (
        auth.uid() = paid_by OR auth.uid() = created_by
      );
  END IF;
END
$$;

-- ── 4. Receipts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expense_receipts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_receipts_expense_id ON public.expense_receipts(expense_id);

ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expense_receipts'
      AND policyname = 'expense_receipts_participant_all'
  ) THEN
    -- Participants of an expense can view; uploaders manage their own rows.
    CREATE POLICY "expense_receipts_participant_all" ON public.expense_receipts
      FOR ALL USING (
        uploaded_by = auth.uid()
        OR public.is_expense_participant(expense_id)
      ) WITH CHECK (
        uploaded_by = auth.uid()
      );
  END IF;
END
$$;

-- Receipt images live in the same "avatars" conventions but a dedicated
-- bucket, created like the avatars bucket migration (idempotent).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipts', 'receipts', true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'receipts_public_read'
  ) THEN
    CREATE POLICY "receipts_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'receipts');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'receipts_insert_own'
  ) THEN
    CREATE POLICY "receipts_insert_own" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'receipts_delete_own'
  ) THEN
    CREATE POLICY "receipts_delete_own" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END
$$;

-- ── 5. Agreements (signatures) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expense_agreements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  signer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signer_name text,
  storage_path text NOT NULL,
  agreed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expense_id, signer_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_agreements_expense_id ON public.expense_agreements(expense_id);

ALTER TABLE public.expense_agreements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expense_agreements'
      AND policyname = 'expense_agreements_participant_all'
  ) THEN
    CREATE POLICY "expense_agreements_participant_all" ON public.expense_agreements
      FOR ALL USING (
        signer_id = auth.uid()
        OR public.is_expense_participant(expense_id)
      ) WITH CHECK (
        signer_id = auth.uid()
      );
  END IF;
END
$$;

-- Signatures are stored in the receipts bucket under an agreements/ prefix.

-- ── 6. Expense approvals ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expense_approvals (
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (expense_id, user_id)
);

ALTER TABLE public.expense_approvals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expense_approvals'
      AND policyname = 'expense_approvals_participant_select'
  ) THEN
    CREATE POLICY "expense_approvals_participant_select" ON public.expense_approvals
      FOR SELECT USING (public.is_expense_participant(expense_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expense_approvals'
      AND policyname = 'expense_approvals_own_insert'
  ) THEN
    CREATE POLICY "expense_approvals_own_insert" ON public.expense_approvals
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.approve_expense(
  p_expense_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_creator uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'SS721: not authenticated';
  END IF;

  SELECT created_by INTO v_creator FROM public.expenses WHERE id = p_expense_id;
  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'SS722: expense not found';
  END IF;

  INSERT INTO public.expense_approvals (expense_id, user_id)
  VALUES (p_expense_id, v_user)
  ON CONFLICT (expense_id, user_id) DO NOTHING;

  IF to_regclass('public.activity_feed') IS NOT NULL AND v_creator <> v_user THEN
    INSERT INTO public.activity_feed (user_id, type, metadata)
    VALUES (
      v_creator,
      'expense_approved',
      json_build_object('approved_by', v_user, 'expense_id', p_expense_id)
    );
  END IF;

  RETURN json_build_object('approved', true);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_expense(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_expense(uuid) TO authenticated;

-- ── 7. AI reminders (data side) ───────────────────────────────────────────
-- Reminders are activity_feed rows of type 'ai_reminder' written by the
-- `reminders` Edge Function (scheduled daily). Nothing to create here beyond
-- an index that keeps the per-user feed query fast.
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_type_created
  ON public.activity_feed(user_id, type, created_at DESC);
