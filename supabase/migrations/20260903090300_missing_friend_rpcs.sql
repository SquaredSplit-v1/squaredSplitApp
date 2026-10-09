-- Repo definitions for RPCs that were created directly on the live project
-- and were therefore missing from migrations (fresh environments returned
-- "function not found" for the Friends screen).
--
-- Both are wrapped in existence guards: if the project already has its own
-- version (with a possibly different return shape), it is left untouched.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_friend_balances'
  ) THEN
    CREATE FUNCTION public.get_friend_balances(p_user_id uuid)
    RETURNS TABLE (
      friend_id uuid,
      full_name text,
      avatar_url text,
      net_balance numeric
    )
    LANGUAGE plpgsql
    STABLE
    AS $fn$
    BEGIN
      RETURN QUERY
      SELECT
        counterparty_id AS friend_id,
        p.full_name,
        p.avatar_url,
        SUM(amount) AS net_balance
      FROM (
        SELECT
          ep.user_id AS counterparty_id,
          ep.share_amount AS amount
        FROM public.expenses e
        JOIN public.expense_participants ep ON ep.expense_id = e.id
        WHERE e.paid_by = p_user_id
          AND ep.user_id <> p_user_id
          AND COALESCE(ep.is_settled, false) = false

        UNION ALL

        SELECT
          e.paid_by AS counterparty_id,
          -1 * ep.share_amount AS amount
        FROM public.expenses e
        JOIN public.expense_participants ep ON ep.expense_id = e.id
        WHERE ep.user_id = p_user_id
          AND e.paid_by <> p_user_id
          AND COALESCE(ep.is_settled, false) = false
      ) balances
      JOIN public.profiles p ON p.id = counterparty_id
      GROUP BY counterparty_id, p.full_name, p.avatar_url
      HAVING SUM(amount) <> 0;
    END;
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_shared_expenses'
  ) THEN
    CREATE FUNCTION public.get_shared_expenses(
      p_user_id uuid,
      p_friend_id uuid
    )
    RETURNS TABLE (
      expense_id uuid,
      description text,
      amount numeric,
      paid_by uuid,
      share_amount numeric,
      is_settled boolean,
      created_at timestamptz
    )
    LANGUAGE plpgsql
    STABLE
    AS $fn$
    BEGIN
      RETURN QUERY
      SELECT
        e.id AS expense_id,
        e.description,
        e.amount,
        e.paid_by,
        ep.share_amount,
        COALESCE(ep.is_settled, false) AS is_settled,
        e.created_at
      FROM public.expenses e
      JOIN public.expense_participants ep ON ep.expense_id = e.id
      WHERE (e.paid_by = p_user_id AND ep.user_id = p_friend_id)
         OR (e.paid_by = p_friend_id AND ep.user_id = p_user_id)
      ORDER BY e.created_at DESC;
    END;
    $fn$;
  END IF;
END
$$;

-- Fresh projects also need these grants; existing ones already have them.
GRANT EXECUTE ON FUNCTION public.get_friend_balances(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_expenses(uuid, uuid) TO authenticated;
