-- Allow any participant on an expense to read all split rows for that expense
-- (needed for home activity, balances, and expense detail UI).
CREATE POLICY "Users can view splits for expenses they are on"
ON public.expense_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.expense_participants ep_self
    WHERE ep_self.expense_id = expense_participants.expense_id
      AND ep_self.user_id = auth.uid()
  )
);
