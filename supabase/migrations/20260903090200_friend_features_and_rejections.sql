-- Friend-level features: shared whiteboard notes, per-friend settings and
-- expense rejections from the notifications screen.

-- ── Shared whiteboard note per friendship (visible to both sides) ─────────
CREATE TABLE IF NOT EXISTS public.friend_notes (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);

-- A note is shared between the pair: one row keyed by the lexicographically
-- smaller id so both users read/write the same row.
CREATE OR REPLACE FUNCTION public.friend_notes_pair_key(
  p_a uuid, p_b uuid
) RETURNS uuid[] LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_a::text < p_b::text THEN ARRAY[p_a, p_b] ELSE ARRAY[p_b, p_a] END;
$$;

ALTER TABLE public.friend_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friend_notes' AND policyname = 'friend_notes_pair_all'
  ) THEN
    CREATE POLICY "friend_notes_pair_all" ON public.friend_notes
      FOR ALL USING (
        user_id = auth.uid() OR friend_id = auth.uid()
      ) WITH CHECK (
        user_id = auth.uid() OR friend_id = auth.uid()
      );
  END IF;
END
$$;

-- Upsert helper used by the Whiteboard panel.
CREATE OR REPLACE FUNCTION public.upsert_friend_note(
  p_friend_id uuid,
  p_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key uuid[] := public.friend_notes_pair_key(auth.uid(), p_friend_id);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'SS301: not authenticated';
  END IF;

  INSERT INTO public.friend_notes (user_id, friend_id, note, updated_by, updated_at)
  VALUES (v_key[1], v_key[2], p_note, auth.uid(), now())
  ON CONFLICT (user_id, friend_id)
  DO UPDATE SET note = EXCLUDED.note, updated_by = EXCLUDED.updated_by, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_friend_note(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_friend_note(uuid, text) TO authenticated;

-- ── Per-friend settings (e.g. mute notifications) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.friend_settings (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

ALTER TABLE public.friend_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friend_settings' AND policyname = 'friend_settings_owner_all'
  ) THEN
    CREATE POLICY "friend_settings_owner_all" ON public.friend_settings
      FOR ALL USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

-- ── Expense rejections (notifications screen "Reject" flow) ───────────────
CREATE TABLE IF NOT EXISTS public.expense_rejections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  reason text NOT NULL,
  other_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, expense_id)
);

ALTER TABLE public.expense_rejections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expense_rejections' AND policyname = 'expense_rejections_owner_select'
  ) THEN
    CREATE POLICY "expense_rejections_owner_select" ON public.expense_rejections
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expense_rejections' AND policyname = 'expense_rejections_owner_insert'
  ) THEN
    CREATE POLICY "expense_rejections_owner_insert" ON public.expense_rejections
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

-- Records a rejection and notifies the expense creator through the activity
-- feed (when that table exists). The share itself is left untouched — the
-- creator decides whether to remove the participant from the expense.
CREATE OR REPLACE FUNCTION public.reject_expense(
  p_expense_id uuid,
  p_reason text,
  p_other_text text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_creator uuid;
  v_description text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'SS401: not authenticated';
  END IF;

  SELECT created_by, description INTO v_creator, v_description
  FROM public.expenses
  WHERE id = p_expense_id;

  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'SS402: expense not found';
  END IF;

  INSERT INTO public.expense_rejections (user_id, expense_id, reason, other_text)
  VALUES (v_user, p_expense_id, p_reason, p_other_text)
  ON CONFLICT (user_id, expense_id) DO UPDATE
    SET reason = EXCLUDED.reason, other_text = EXCLUDED.other_text, created_at = now();

  IF to_regclass('public.activity_feed') IS NOT NULL AND v_creator <> v_user THEN
    INSERT INTO public.activity_feed (user_id, type, metadata)
    VALUES (
      v_creator,
      'expense_rejected',
      json_build_object(
        'rejected_by', v_user,
        'expense_id', p_expense_id,
        'description', v_description,
        'reason', p_reason,
        'other_text', p_other_text
      )
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_expense(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_expense(uuid, text, text) TO authenticated;
