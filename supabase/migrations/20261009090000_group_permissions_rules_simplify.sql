-- Group permissions & roles, group rules (admin/member views), debt simplification.
--
-- Idempotent: safe on environments where groups/group_members already exist.

-- ── 1. Groups: settings columns ──────────────────────────────────────────────

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS member_can_edit_settings boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS member_can_add_members boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS member_can_send_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS admin_approval_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS simplify_debts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rules_text text;

-- ── 2. group_members: role + membership status ───────────────────────────────

ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  ALTER TABLE public.group_members
    ADD CONSTRAINT group_members_role_check CHECK (role IN ('admin', 'member'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.group_members
    ADD CONSTRAINT group_members_status_check CHECK (status IN ('active', 'pending'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Backfill admins ───────────────────────────────────────────────────────
-- Pre-roles groups have no creator record; approximate with the earliest-joined
-- member (create_group inserts the caller first, so this is usually right).
-- New groups set it explicitly (see create_group below).

UPDATE public.groups g
SET created_by = m.user_id
FROM (
  SELECT gm.group_id,
         gm.user_id,
         ROW_NUMBER() OVER (
           PARTITION BY gm.group_id
           ORDER BY gm.created_at ASC, gm.user_id ASC
         ) AS rn
  FROM public.group_members gm
) m
WHERE m.rn = 1
  AND m.group_id = g.id
  AND g.created_by IS NULL;

UPDATE public.group_members gm
SET role = 'admin'
FROM public.groups g
WHERE g.id = gm.group_id
  AND gm.user_id = g.created_by
  AND gm.role = 'member';

-- Pending members must not see group internals until approved. is_group_member
-- backs every group policy, so filtering here covers expenses/members too.
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'active'
  )
$$;

REVOKE ALL ON FUNCTION public.is_group_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'active'
      AND gm.role = 'admin'
  )
$$;

REVOKE ALL ON FUNCTION public.is_group_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid) TO authenticated;

-- The app keeps adding feed types; this CHECK has been rewritten in three
-- migrations already. Drop it — valid types are enforced by the writers.
ALTER TABLE public.activity_feed DROP CONSTRAINT IF EXISTS activity_feed_type_check;

-- ── 4. create_group: creator becomes admin ───────────────────────────────────

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

-- ── 5. update_group_settings (permissions, rules, simplify) ──────────────────
-- Admins can change everything; regular members only when the group allows
-- member edits, and never the rules or the approval requirement.

CREATE OR REPLACE FUNCTION public.update_group_settings(
  p_group_id uuid,
  p_member_can_edit_settings boolean DEFAULT NULL,
  p_member_can_add_members boolean DEFAULT NULL,
  p_member_can_send_messages boolean DEFAULT NULL,
  p_admin_approval_required boolean DEFAULT NULL,
  p_simplify_debts boolean DEFAULT NULL,
  p_rules_text text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_can_edit boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'SS801: not authenticated';
  END IF;

  IF NOT public.is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'SS802: you are not a member of this group';
  END IF;

  IF NOT public.is_group_admin(p_group_id) THEN
    SELECT member_can_edit_settings INTO v_member_can_edit
    FROM public.groups WHERE id = p_group_id;

    IF v_member_can_edit IS NOT TRUE
       OR p_rules_text IS NOT NULL
       OR p_admin_approval_required IS NOT NULL THEN
      RAISE EXCEPTION 'SS803: only admins can change these settings';
    END IF;
  END IF;

  UPDATE public.groups
  SET member_can_edit_settings = COALESCE(p_member_can_edit_settings, member_can_edit_settings),
      member_can_add_members = COALESCE(p_member_can_add_members, member_can_add_members),
      member_can_send_messages = COALESCE(p_member_can_send_messages, member_can_send_messages),
      admin_approval_required = COALESCE(p_admin_approval_required, admin_approval_required),
      simplify_debts = COALESCE(p_simplify_debts, simplify_debts),
      rules_text = COALESCE(p_rules_text, rules_text)
  WHERE id = p_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_group_settings(uuid, boolean, boolean, boolean, boolean, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_group_settings(uuid, boolean, boolean, boolean, boolean, boolean, text) TO authenticated;

-- ── 6. add_group_members: permission + approval flow ────────────────────────
-- Members can add only when allowed; with approval required, non-admin
-- additions land as pending and admins get an activity notification.
-- (The return type changes from void to json, hence DROP first.)

DROP FUNCTION IF EXISTS public.add_group_members(uuid, uuid[]);

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

-- ── 7. Approve / decline pending members (admin only) ───────────────────────

CREATE OR REPLACE FUNCTION public.approve_group_member(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_name text;
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'SS805: only admins can approve members';
  END IF;

  UPDATE public.group_members
  SET status = 'active'
  WHERE group_id = p_group_id
    AND user_id = p_user_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SS806: no pending request from this member';
  END IF;

  SELECT name INTO v_group_name FROM public.groups WHERE id = p_group_id;

  INSERT INTO public.activity_feed (user_id, type, metadata)
  VALUES (
    p_user_id,
    'group_member_approved',
    jsonb_build_object('group_id', p_group_id, 'group_name', v_group_name)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_group_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_group_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.decline_group_member(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'SS805: only admins can manage member requests';
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id
    AND user_id = p_user_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SS806: no pending request from this member';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decline_group_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_group_member(uuid, uuid) TO authenticated;

-- ── 8. remove_group_member: admin or self ────────────────────────────────────

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
  IF NOT (public.is_group_admin(p_group_id) OR p_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'SS701: only admins can remove other members';
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

-- ── 9. promote_group_admin (admin only) ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.promote_group_admin(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'SS807: only admins can promote members';
  END IF;

  UPDATE public.group_members
  SET role = 'admin'
  WHERE group_id = p_group_id
    AND user_id = p_user_id
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SS808: member not found in this group';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_group_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_group_admin(uuid, uuid) TO authenticated;

-- ── 10. Simplified debt settlement plan ──────────────────────────────────────
-- Net position per active member (paid − owed, matching the app's client-side
-- math: positive = is owed money). Greedy min-transfer match: the largest
-- debtor pays the largest creditor until everyone is squared. With
-- simplify_debts ON the app shows this plan instead of raw member balances.

CREATE OR REPLACE FUNCTION public.get_group_settlement_plan(
  p_group_id uuid
)
RETURNS TABLE (from_user uuid, from_name text, to_user uuid, to_name text, amount numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_ids uuid[] := ARRAY[]::uuid[];
  v_nets numeric[] := ARRAY[]::numeric[];
  v_names jsonb;
  v_i integer;
  v_j integer;
  v_pay numeric;
BEGIN
  IF NOT public.is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'SS809: you are not a member of this group';
  END IF;

  -- nets sorted DESC: creditors at the front, debtors at the back
  SELECT COALESCE(array_agg(user_id ORDER BY net DESC), ARRAY[]::uuid[]),
         COALESCE(array_agg(net ORDER BY net DESC), ARRAY[]::numeric[])
  INTO v_user_ids, v_nets
  FROM (
    SELECT gm.user_id,
           round(
             COALESCE((SELECT SUM(e.amount)
                       FROM public.expenses e
                       WHERE e.group_id = p_group_id
                         AND e.paid_by = gm.user_id), 0)
             - COALESCE((SELECT SUM(ep.share_amount)
                         FROM public.expense_participants ep
                         JOIN public.expenses e ON e.id = ep.expense_id
                         WHERE e.group_id = p_group_id
                           AND ep.user_id = gm.user_id), 0),
             2
           ) AS net
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.status = 'active'
  ) n
  WHERE ABS(n.net) > 0.005;

  IF array_length(v_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(jsonb_object_agg(id::text, COALESCE(full_name, 'Member')), '{}'::jsonb)
  INTO v_names
  FROM public.profiles
  WHERE id = ANY(v_user_ids);

  v_i := 1;
  v_j := array_length(v_user_ids, 1);

  WHILE v_i < v_j LOOP
    EXIT WHEN v_nets[v_i] <= 0.005;   -- no creditors left
    EXIT WHEN v_nets[v_j] >= -0.005;  -- no debtors left

    v_pay := LEAST(v_nets[v_i], -v_nets[v_j]);

    from_user := v_user_ids[v_j];
    from_name := COALESCE(v_names ->> (v_user_ids[v_j]::text), 'Member');
    to_user := v_user_ids[v_i];
    to_name := COALESCE(v_names ->> (v_user_ids[v_i]::text), 'Member');
    amount := round(v_pay, 2);
    RETURN NEXT;

    v_nets[v_i] := v_nets[v_i] - v_pay;
    v_nets[v_j] := v_nets[v_j] + v_pay;
    IF v_nets[v_i] <= 0.005 THEN v_i := v_i + 1; END IF;
    IF v_nets[v_j] >= -0.005 THEN v_j := v_j - 1; END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_group_settlement_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_settlement_plan(uuid) TO authenticated;

-- ── 11. Optional params for create_expense_with_invites ─────────────────────
-- Declaring DEFAULTs (all trailing, as Postgres requires) makes the generated
-- TS types mark them optional so the client can omit group/date/note.
-- Body unchanged from 20260905100000_expense_invites.

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
