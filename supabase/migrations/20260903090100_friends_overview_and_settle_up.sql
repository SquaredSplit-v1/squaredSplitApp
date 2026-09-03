-- Friends overview + settle-up RPCs
--
-- get_friends_overview: one row per friend the user has ANY shared expense
-- with (settled or not). Unlike get_friend_balances (which filters to
-- non-zero balances), this also returns squared-up friends so the Home
-- "squared-up" section has real data, plus last-activity and due-date hints.
--
-- settle_up_with_friend: marks every unsettled share between two users as
-- settled (the `is_settled` flag is what calculate_balance /
-- get_friend_balances exclude), and records an activity_feed entry when that
-- table exists so the other user is notified.

CREATE OR REPLACE FUNCTION public.get_friends_overview(
  p_user_id uuid
)
RETURNS TABLE (
  friend_id uuid,
  full_name text,
  avatar_url text,
  net_balance numeric,
  expense_count bigint,
  last_activity_at timestamptz,
  has_overdue boolean,
  next_due_date date
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH edges AS (
    -- Friend owes user: user paid, friend participated, not settled
    SELECT
      ep.user_id AS friend_id,
      ep.share_amount AS delta,
      e.created_at AS activity_at,
      e.due_date
    FROM public.expenses e
    JOIN public.expense_participants ep ON ep.expense_id = e.id
    WHERE e.paid_by = p_user_id
      AND ep.user_id <> p_user_id
      AND COALESCE(ep.is_settled, false) = false

    UNION ALL

    -- User owes friend: friend paid, user participated, not settled
    SELECT
      e.paid_by AS friend_id,
      -1 * ep.share_amount AS delta,
      e.created_at AS activity_at,
      e.due_date
    FROM public.expenses e
    JOIN public.expense_participants ep ON ep.expense_id = e.id
    WHERE ep.user_id = p_user_id
      AND e.paid_by <> p_user_id
      AND COALESCE(ep.is_settled, false) = false

    UNION ALL

    -- Settled history still counts for expense_count / last_activity /
    -- squared-up detection (delta 0). due_date is irrelevant once settled.
    SELECT
      CASE WHEN e.paid_by = p_user_id THEN ep.user_id ELSE e.paid_by END AS friend_id,
      0::numeric AS delta,
      e.created_at AS activity_at,
      NULL::date AS due_date
    FROM public.expenses e
    JOIN public.expense_participants ep ON ep.expense_id = e.id
    WHERE (e.paid_by = p_user_id OR ep.user_id = p_user_id)
      AND e.paid_by <> ep.user_id
      AND COALESCE(ep.is_settled, false) = true
  )
  SELECT
    p.id AS friend_id,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(edges.delta), 0) AS net_balance,
    COUNT(*) AS expense_count,
    MAX(edges.activity_at) AS last_activity_at,
    BOOL_OR(edges.due_date < CURRENT_DATE) AS has_overdue,
    MIN(edges.due_date) FILTER (WHERE edges.due_date >= CURRENT_DATE) AS next_due_date
  FROM edges
  JOIN public.profiles p ON p.id = edges.friend_id
  GROUP BY p.id, p.full_name, p.avatar_url;
END;
$$;

REVOKE ALL ON FUNCTION public.get_friends_overview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_friends_overview(uuid) TO authenticated;

-- ── Settle up ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.settle_up_with_friend(
  p_friend_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_updated bigint;
  v_more bigint;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'SS201: not authenticated';
  END IF;

  IF p_friend_id IS NULL OR p_friend_id = v_user THEN
    RAISE EXCEPTION 'SS202: invalid friend id';
  END IF;

  -- Shares the friend owes the user
  UPDATE public.expense_participants ep
  SET is_settled = true, updated_at = now()
  FROM public.expenses e
  WHERE e.id = ep.expense_id
    AND e.paid_by = v_user
    AND ep.user_id = p_friend_id
    AND COALESCE(ep.is_settled, false) = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Shares the user owes the friend
  UPDATE public.expense_participants ep
  SET is_settled = true, updated_at = now()
  FROM public.expenses e
  WHERE e.id = ep.expense_id
    AND e.paid_by = p_friend_id
    AND ep.user_id = v_user
    AND COALESCE(ep.is_settled, false) = false;

  GET DIAGNOSTICS v_more = ROW_COUNT;
  v_updated := v_updated + v_more;

  -- Notify the friend through the activity feed when the table exists
  IF to_regclass('public.activity_feed') IS NOT NULL THEN
    INSERT INTO public.activity_feed (user_id, type, metadata)
    VALUES (
      p_friend_id,
      'settle_up',
      json_build_object(
        'settled_by', v_user,
        'expenses_settled', v_updated
      )
    );
  END IF;

  RETURN json_build_object('settled_shares', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_up_with_friend(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_up_with_friend(uuid) TO authenticated;
