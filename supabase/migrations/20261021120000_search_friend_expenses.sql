-- Expense-level search for the dashboard search bar (Figma 246-61195):
-- typing a friend's name lists each shared expense as a row (avatar, time,
-- net amount for the caller), tapping one opens the expense detail.

CREATE OR REPLACE FUNCTION public.search_friend_expenses(p_query text)
RETURNS TABLE (
  expense_id uuid,
  friend_id uuid,
  friend_name text,
  friend_avatar text,
  expense_title text,
  category text,
  expense_created_at timestamptz,
  paid_by_me boolean,
  net_for_me numeric,
  is_settled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    f.id,
    COALESCE(NULLIF(trim(f.full_name), ''), 'SquaredSplit User'),
    f.avatar_url,
    e.description,
    e.category,
    e.created_at,
    e.paid_by = auth.uid(),
    round(
      CASE WHEN e.paid_by = auth.uid()
           THEN e.amount - my.share_amount
           ELSE -my.share_amount END,
      2
    ),
    COALESCE(my.is_settled, false)
  FROM public.expenses e
  JOIN public.expense_participants my
    ON my.expense_id = e.id AND my.user_id = auth.uid()
  JOIN public.expense_participants fp
    ON fp.expense_id = e.id AND fp.user_id <> auth.uid()
  JOIN public.profiles f
    ON f.id = fp.user_id
  WHERE NULLIF(btrim(p_query), '') IS NOT NULL
    AND f.full_name ILIKE '%' || btrim(p_query) || '%'
    AND f.deactivated_at IS NULL
    AND NOT public.has_block_between(auth.uid(), f.id)
  ORDER BY e.created_at DESC
  LIMIT 30;
$$;

REVOKE ALL ON FUNCTION public.search_friend_expenses(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_friend_expenses(text) TO authenticated;
