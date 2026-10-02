-- Expense invites: let users add people who are NOT on SquaredSplit yet to an
-- expense. The inviter picks a device contact, we store a pending invite keyed
-- by the invitee's E.164 phone, the inviter sends a WhatsApp deep link, and the
-- invitee joins by signing in with that number and opening the link.
--
-- Split model: invites only support EQUAL splits. Every participant (present
-- or invited) gets amount / total_people at creation time, with the cent
-- remainder on the payer — mirroring the client's calcEqualSplits.

CREATE TABLE IF NOT EXISTS public.expense_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_phone text NOT NULL,
  invitee_name text,
  share_amount numeric(12,2) NOT NULL CHECK (share_amount >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expense_id, invitee_phone)
);

CREATE INDEX IF NOT EXISTS idx_expense_invites_expense_id ON public.expense_invites(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_invites_phone ON public.expense_invites(invitee_phone);

ALTER TABLE public.expense_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Inviter sees and manages invites they created.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expense_invites'
      AND policyname = 'expense_invites_inviter_all'
  ) THEN
    CREATE POLICY "expense_invites_inviter_all" ON public.expense_invites
      FOR ALL USING (inviter_id = auth.uid())
      WITH CHECK (inviter_id = auth.uid());
  END IF;

  -- Invitees can see invites addressed to their own phone number (via the
  -- SECURITY DEFINER helpers below; this row-level view is a convenience).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expense_invites'
      AND policyname = 'expense_invites_invitee_select'
  ) THEN
    CREATE POLICY "expense_invites_invitee_select" ON public.expense_invites
      FOR SELECT USING (
        invitee_phone = COALESCE(
          public.normalize_phone_e164_like(
            (SELECT phone FROM public.profiles WHERE id = auth.uid())
          ),
          '\x00nomatch'
        )
      );
  END IF;
END
$$;

-- ── Create expense with invites ───────────────────────────────────────────
-- p_participants: jsonb array of profile ids (must include the payer).
-- p_invites:      jsonb array of { "phone": "...", "name": "..."|null }.
-- Everyone (participants + invitees) splits equally; cent remainder goes to
-- the payer. Returns the created expense plus the invite ids so the client
-- can build WhatsApp links.
CREATE OR REPLACE FUNCTION public.create_expense_with_invites(
  p_title        text,
  p_amount       numeric,
  p_category     text,
  p_paid_by      uuid,
  p_group_id     uuid,
  p_due_date     date,
  p_note         text,
  p_participants jsonb,
  p_invites      jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_expense_id uuid;
  v_participant_ids uuid[];
  v_invite_rows jsonb;
  v_people int;
  v_amount_cents bigint;
  v_base_cents bigint;
  v_remainder_cents bigint;
  v_row jsonb;
  v_uid uuid;
  v_idx int := 0;
  v_share numeric;
  v_invite_id uuid;
  v_invites_out jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'SS501: not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'SS502: amount must be positive';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'SS503: title is required';
  END IF;

  -- Normalize participant ids, dedupe, ensure payer present.
  SELECT COALESCE(array_agg(DISTINCT (p->>'id')::uuid), '{}')
    INTO v_participant_ids
    FROM jsonb_array_elements(COALESCE(p_participants, '[]'::jsonb)) AS p;

  IF NOT (p_paid_by = ANY(v_participant_ids)) THEN
    v_participant_ids := array_append(v_participant_ids, p_paid_by);
  END IF;

  -- Normalize invite rows (phone required).
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'phone', public.normalize_phone_e164_like(i->>'phone'),
           'name', NULLIF(btrim(COALESCE(i->>'name', '')), '')
         )), '[]'::jsonb)
    INTO v_invite_rows
    FROM jsonb_array_elements(COALESCE(p_invites, '[]'::jsonb)) AS i
    WHERE public.normalize_phone_e164_like(i->>'phone') IS NOT NULL;

  -- Remove invites that duplicate an existing participant's phone.
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    INTO v_invite_rows
    FROM jsonb_array_elements(v_invite_rows) AS elem
    WHERE (elem->>'phone') NOT IN (
      SELECT public.normalize_phone_e164_like(phone)
      FROM public.profiles
      WHERE id = ANY(v_participant_ids) AND phone IS NOT NULL
    );

  v_people := array_length(v_participant_ids, 1)
            + jsonb_array_length(v_invite_rows);

  IF v_people < 2 THEN
    RAISE EXCEPTION 'SS504: at least 2 people (participants + invites) are required';
  END IF;

  IF v_people > 20 THEN
    RAISE EXCEPTION 'SS505: maximum 20 people per expense';
  END IF;

  -- Equal split in integer cents; the payer absorbs the rounding remainder.
  v_amount_cents    := ROUND(p_amount * 100)::bigint;
  v_base_cents      := v_amount_cents / v_people;
  v_remainder_cents := v_amount_cents - (v_base_cents * v_people);

  INSERT INTO public.expenses (
    description, amount, category, paid_by, group_id, due_date, note,
    created_by, split_type
  ) VALUES (
    p_title, p_amount, COALESCE(p_category, 'general'), p_paid_by, p_group_id,
    p_due_date, p_note, v_user, 'equal'
  ) RETURNING id INTO v_expense_id;

  FOREACH v_uid IN ARRAY v_participant_ids LOOP
    v_share := CASE WHEN v_idx = 0
      THEN (v_base_cents + v_remainder_cents)::numeric / 100
      ELSE v_base_cents::numeric / 100
    END;

    INSERT INTO public.expense_participants (expense_id, user_id, share_amount, is_settled)
    VALUES (v_expense_id, v_uid, v_share, false);

    v_idx := v_idx + 1;
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(v_invite_rows) LOOP
    v_share := v_base_cents::numeric / 100;

    INSERT INTO public.expense_invites (
      expense_id, inviter_id, invitee_phone, invitee_name, share_amount, status
    ) VALUES (
      v_expense_id, v_user, v_row->>'phone', v_row->>'name', v_share, 'pending'
    ) RETURNING id INTO v_invite_id;

    v_invites_out := v_invites_out || jsonb_build_object(
      'invite_id', v_invite_id,
      'phone', v_row->>'phone',
      'name', v_row->>'name',
      'share_amount', v_share
    );
  END LOOP;

  RETURN json_build_object(
    'id', v_expense_id,
    'title', p_title,
    'amount', p_amount,
    'paid_by', p_paid_by,
    'group_id', p_group_id,
    'people_count', v_people,
    'invites', v_invites_out
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_expense_with_invites(text, numeric, text, uuid, uuid, date, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_expense_with_invites(text, numeric, text, uuid, uuid, date, text, jsonb, jsonb) TO authenticated;

-- ── Invite summary (anon-safe, for the link landing page / pre-login) ─────
CREATE OR REPLACE FUNCTION public.get_expense_invite(
  p_invite_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  SELECT
    i.id,
    i.status,
    i.invitee_phone,
    i.invitee_name,
    i.share_amount,
    e.description AS title,
    e.amount,
    p.full_name AS inviter_name
  INTO v_row
  FROM public.expense_invites i
  JOIN public.expenses e ON e.id = i.expense_id
  JOIN public.profiles p ON p.id = i.inviter_id
  WHERE i.id = p_invite_id;

  IF v_row.id IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  RETURN json_build_object(
    'found', true,
    'id', v_row.id,
    'status', v_row.status,
    'invitee_phone_masked', regexp_replace(v_row.invitee_phone, '^(....).*?(....)$', '\1•••••\2'),
    'invitee_name', v_row.invitee_name,
    'share_amount', v_row.share_amount,
    'expense_title', v_row.title,
    'expense_amount', v_row.amount,
    'inviter_name', v_row.inviter_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_expense_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_expense_invite(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_expense_invite(uuid) TO authenticated;

-- ── Accept invite ─────────────────────────────────────────────────────────
-- The signed-in caller joins the expense IF their profile phone matches the
-- invite's invitee_phone. Idempotent: an already-accepted invite returns the
-- expense id again instead of erroring.
CREATE OR REPLACE FUNCTION public.accept_expense_invite(
  p_invite_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_invite record;
  v_my_phone text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'SS601: not authenticated';
  END IF;

  SELECT phone INTO v_my_phone
  FROM public.profiles WHERE id = v_user;

  IF v_my_phone IS NULL THEN
    RAISE EXCEPTION 'SS602: your profile has no phone number';
  END IF;

  SELECT * INTO v_invite
  FROM public.expense_invites
  WHERE id = p_invite_id;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'SS603: invite not found';
  END IF;

  IF public.normalize_phone_e164_like(v_my_phone)
     <> public.normalize_phone_e164_like(v_invite.invitee_phone) THEN
    RAISE EXCEPTION 'SS604: this invite was sent to a different phone number';
  END IF;

  IF v_invite.status = 'accepted' THEN
    RETURN json_build_object('expense_id', v_invite.expense_id, 'already', true);
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'SS605: invite is no longer active';
  END IF;

  INSERT INTO public.expense_participants (expense_id, user_id, share_amount, is_settled)
  VALUES (v_invite.expense_id, v_user, v_invite.share_amount, false)
  ON CONFLICT (expense_id, user_id) DO NOTHING;

  UPDATE public.expense_invites
  SET status = 'accepted', accepted_by = v_user, accepted_at = now()
  WHERE id = p_invite_id;

  -- Tell the inviter (when the activity feed table exists).
  IF to_regclass('public.activity_feed') IS NOT NULL THEN
    INSERT INTO public.activity_feed (user_id, type, metadata)
    VALUES (
      v_invite.inviter_id,
      'expense_invite_accepted',
      json_build_object(
        'accepted_by', v_user,
        'expense_id', v_invite.expense_id,
        'invite_id', p_invite_id
      )
    );
  END IF;

  RETURN json_build_object('expense_id', v_invite.expense_id, 'already', false);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_expense_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_expense_invite(uuid) TO authenticated;
