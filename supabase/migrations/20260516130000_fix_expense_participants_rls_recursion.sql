-- Fix infinite recursion (42P17) in expense_participants RLS policies.

CREATE OR REPLACE FUNCTION public.is_expense_participant(p_expense_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.expense_participants ep
    WHERE ep.expense_id = p_expense_id
      AND ep.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_expense_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_expense_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_expense_participant(uuid) TO service_role;

DROP POLICY IF EXISTS "Users can view splits for expenses they are on" ON public.expense_participants;

CREATE POLICY "Users can view splits for expenses they are on"
ON public.expense_participants
FOR SELECT
USING (public.is_expense_participant(expense_id));

DROP POLICY IF EXISTS "Users can view their expenses" ON public.expenses;

CREATE POLICY "Users can view their expenses"
ON public.expenses
FOR SELECT
USING (
  auth.uid() = paid_by
  OR auth.uid() = created_by
  OR public.is_expense_participant(id)
);
