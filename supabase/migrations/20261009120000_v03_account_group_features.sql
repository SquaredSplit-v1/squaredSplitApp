-- v0.3 account & group features:
--   exit/delete group, blocked users, account deactivation.

-- ── 1. Exit group ────────────────────────────────────────────────────────────
-- Leaves the group; blocked while the caller has an outstanding balance.
-- Last member out deletes the group; a sole admin leaving promotes the
-- earliest remaining active member.

CREATE OR REPLACE FUNCTION public.exit_group(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric := 0;
  v_remaining_active integer;
  v_other_admins integer;
  v_next_admin uuid;
BEGIN
  IF NOT public.is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'SS811: you are not a member of this group';
  END IF;

  SELECT COALESCE(SUM(
    CASE WHEN e.paid_by = ep.user_id THEN e.amount - ep.share_amount
         ELSE -ep.share_amount END
  ), 0) INTO v_balance
  FROM public.expense_participants ep
  JOIN public.expenses e ON e.id = ep.expense_id
  WHERE e.group_id = p_group_id
    AND ep.user_id = auth.uid()
    AND COALESCE(ep.is_settled, false) = false;

  IF ABS(v_balance) > 0.005 THEN
    RAISE EXCEPTION 'SS812: settle your balance before leaving this group';
  END IF;

  SELECT COUNT(*) INTO v_other_admins
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id
    AND gm.user_id <> auth.uid()
    AND gm.status = 'active'
    AND gm.role = 'admin';

  IF v_other_admins = 0 THEN
    SELECT gm.user_id INTO v_next_admin
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id <> auth.uid()
      AND gm.status = 'active'
    ORDER BY gm.created_at ASC, gm.user_id ASC
    LIMIT 1;

    IF v_next_admin IS NOT NULL THEN
      UPDATE public.group_members
      SET role = 'admin'
      WHERE group_id = p_group_id AND user_id = v_next_admin;
    END IF;
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = auth.uid();

  SELECT COUNT(*) INTO v_remaining_active
  FROM public.group_members
  WHERE group_id = p_group_id AND status = 'active';

  IF v_remaining_active = 0 THEN
    DELETE FROM public.group_members WHERE group_id = p_group_id;
    DELETE FROM public.groups WHERE id = p_group_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.exit_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exit_group(uuid) TO authenticated;

-- ── 2. Delete group (admin only, everyone settled) ──────────────────────────

CREATE OR REPLACE FUNCTION public.delete_group(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worst_balance numeric := 0;
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'SS813: only admins can delete this group';
  END IF;

  -- No member may owe or be owed anything inside the group. The grand total
  -- always nets to zero, so check each member's unsettled net individually.
  SELECT COALESCE(MAX(ABS(net)), 0) INTO v_worst_balance
  FROM (
    SELECT SUM(
      CASE WHEN e.paid_by = ep.user_id THEN e.amount - ep.share_amount
           ELSE -ep.share_amount END
    ) AS net
    FROM public.expense_participants ep
    JOIN public.expenses e ON e.id = ep.expense_id
    WHERE e.group_id = p_group_id
      AND COALESCE(ep.is_settled, false) = false
    GROUP BY ep.user_id
  ) n;

  IF v_worst_balance > 0.005 THEN
    RAISE EXCEPTION 'SS814: all balances must be settled before deleting this group';
  END IF;

  DELETE FROM public.group_members WHERE group_id = p_group_id;
  DELETE FROM public.groups WHERE id = p_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_group(uuid) TO authenticated;

-- ── 3. Blocked users ────────────────────────────────────────────────────────
-- Blocks are one-directional and enforced wherever two users can be put in
-- the same split or group (expense creation + group adds).

CREATE TABLE IF NOT EXISTS public.blocked_users (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocked_users_not_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users(blocked_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_users_select_own" ON public.blocked_users;
DROP POLICY IF EXISTS "blocked_users_insert_own" ON public.blocked_users;
DROP POLICY IF EXISTS "blocked_users_delete_own" ON public.blocked_users;

CREATE POLICY "blocked_users_select_own" ON public.blocked_users
  FOR SELECT USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

CREATE POLICY "blocked_users_insert_own" ON public.blocked_users
  FOR INSERT WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocked_users_delete_own" ON public.blocked_users
  FOR DELETE USING (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_block_between(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users b
    WHERE (b.blocker_id = p_a AND b.blocked_id = p_b)
       OR (b.blocker_id = p_b AND b.blocked_id = p_a)
  )
$$;

REVOKE ALL ON FUNCTION public.has_block_between(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_block_between(uuid, uuid) TO authenticated;

-- create_expense_with_invites: refuse splits involving blocked users.
CREATE OR REPLACE FUNCTION public.create_expense_with_invites(
  p_title        text,
  p_amount       numeric,
  p_category     text DEFAULT 'general',
  p_paid_by      uuid DEFAULT NULL,
  p_group_id     uuid DEFAULT NULL,
  p_due_date     date DEFAULT NULL,
  p_note         text DEFAULT NULL,
  p_participants jsonb DEFAULT '[]'::jsonb,
  p_invites      jsonb DEFAULT '[]'::jsonb
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
  v_blocked uuid;
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

  -- Blocklist: no expense can include someone who blocked you or whom you
  -- blocked (either direction).
  SELECT u INTO v_blocked
  FROM unnest(v_participant_ids) AS u
  WHERE u <> v_user AND public.has_block_between(v_user, u)
  LIMIT 1;

  IF v_blocked IS NOT NULL THEN
    RAISE EXCEPTION 'SS821: you cannot split with this person';
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

-- add_group_members: skip anyone in a block relationship with the adder.
CREATE OR REPLACE FUNCTION public.add_group_members(
  p_group_id uuid,
  p_member_ids uuid[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_can_add boolean;
  v_needs_approval boolean;
  v_group_name text;
  v_requester_name text;
  v_pending_count integer := 0;
  v_admin RECORD;
BEGIN
  IF NOT public.is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'SS104: you are not a member of this group';
  END IF;

  v_is_admin := public.is_group_admin(p_group_id);

  SELECT name, member_can_add_members, admin_approval_required
    INTO v_group_name, v_can_add, v_needs_approval
  FROM public.groups WHERE id = p_group_id;

  IF NOT v_is_admin AND v_can_add IS NOT TRUE THEN
    RAISE EXCEPTION 'SS804: only admins can add members to this group';
  END IF;

  SELECT full_name INTO v_requester_name
  FROM public.profiles WHERE id = auth.uid();

  WITH added AS (
    INSERT INTO public.group_members (group_id, user_id, role, status)
    SELECT p_group_id,
           m,
           'member',
           CASE WHEN v_needs_approval AND NOT v_is_admin THEN 'pending' ELSE 'active' END
    FROM unnest(p_member_ids) AS m
    WHERE m <> auth.uid()
      AND NOT public.has_block_between(auth.uid(), m)
    ON CONFLICT DO NOTHING
    RETURNING status
  )
  SELECT COUNT(*) INTO v_pending_count FROM added WHERE status = 'pending';

  IF v_pending_count > 0 THEN
    FOR v_admin IN
      SELECT gm.user_id
      FROM public.group_members gm
      WHERE gm.group_id = p_group_id
        AND gm.status = 'active'
        AND gm.role = 'admin'
        AND gm.user_id <> auth.uid()
    LOOP
      INSERT INTO public.activity_feed (user_id, type, metadata)
      VALUES (
        v_admin.user_id,
        'group_join_request',
        jsonb_build_object(
          'group_id', p_group_id,
          'group_name', v_group_name,
          'requester_id', auth.uid(),
          'requester_name', COALESCE(v_requester_name, 'Someone'),
          'pending_count', v_pending_count
        )
      );
    END LOOP;
  END IF;

  RETURN json_build_object('pending', v_pending_count);
END;
$$;

REVOKE ALL ON FUNCTION public.add_group_members(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_group_members(uuid, uuid[]) TO authenticated;

-- ── 4. Account deactivation ─────────────────────────────────────────────────
-- Soft state: the user disappears from contact matching and co-participant
-- pickers until support restores the account (profiles.deactivated_at NULL).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_deactivated
  ON public.profiles (deactivated_at) WHERE deactivated_at IS NOT NULL;

-- ── 5. create_group skips blocked members ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_group(
  p_name text,
  p_emoji text DEFAULT NULL,
  p_member_ids uuid[] DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'SS101: not authenticated';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'SS102: group name is required';
  END IF;

  IF array_length(p_member_ids, 1) IS NULL OR array_length(p_member_ids, 1) < 1 THEN
    RAISE EXCEPTION 'SS103: at least 1 other member is required';
  END IF;

  INSERT INTO public.groups (name, emoji, created_by)
  VALUES (btrim(p_name), p_emoji, v_caller)
  RETURNING id INTO v_group_id;

  INSERT INTO public.group_members (group_id, user_id, role, status)
  VALUES (v_group_id, v_caller, 'admin', 'active');

  INSERT INTO public.group_members (group_id, user_id, role, status)
  SELECT v_group_id, m, 'member', 'active' FROM unnest(p_member_ids) AS m
  WHERE m <> v_caller
    AND NOT public.has_block_between(v_caller, m)
  ON CONFLICT DO NOTHING;

  RETURN json_build_object(
    'id', g.id,
    'name', g.name,
    'emoji', g.emoji,
    'created_at', g.created_at
  )
  FROM public.groups g
  WHERE g.id = v_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group(text, text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group(text, text, uuid[]) TO authenticated;
