-- Migration 005: Balance Calculation Query

CREATE OR REPLACE FUNCTION calculate_balance(current_user_id UUID)
RETURNS TABLE (
  friend_id UUID,
  net_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    counterparty_id AS friend_id,
    SUM(amount) AS net_amount
  FROM (
    -- 1. I paid, friend owes me (Positive)
    SELECT 
      ep.user_id AS counterparty_id,
      ep.share_amount AS amount
    FROM expenses e
    JOIN expense_participants ep ON e.id = ep.expense_id
    WHERE e.paid_by = current_user_id
      AND ep.user_id != current_user_id
      AND ep.is_settled = false

    UNION ALL

    -- 2. Friend paid, I owe friend (Negative)
    SELECT 
      e.paid_by AS counterparty_id,
      -1 * ep.share_amount AS amount
    FROM expenses e
    JOIN expense_participants ep ON e.id = ep.expense_id
    WHERE ep.user_id = current_user_id
      AND e.paid_by != current_user_id
      AND ep.is_settled = false

  ) AS balances
  GROUP BY counterparty_id
  HAVING SUM(amount) != 0;
END;
$$ LANGUAGE plpgsql STABLE;
