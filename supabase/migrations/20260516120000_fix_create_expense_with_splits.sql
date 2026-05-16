-- SS-021: Align create_expense_with_splits with expenses + expense_participants schema

DROP FUNCTION IF EXISTS public.create_expense_with_splits(
  text, numeric, text, uuid, uuid, date, date, text, uuid, jsonb
);

CREATE OR REPLACE FUNCTION public.create_expense_with_splits(
  p_title        text,
  p_amount       numeric,
  p_category     text,
  p_paid_by      uuid,
  p_group_id     uuid,
  p_date         date,
  p_due_date     date,
  p_note         text,
  p_created_by   uuid,
  p_splits       jsonb,
  p_split_type   text DEFAULT 'equal'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense_id uuid;
  v_sum        numeric;
  v_row        jsonb;
  v_result     json;
  v_split      split_type;
BEGIN
  IF jsonb_array_length(p_splits) < 2 THEN
    RAISE EXCEPTION 'SS001: At least 2 participants required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_splits) AS s
    WHERE (s->>'user_id')::uuid = p_paid_by
  ) THEN
    RAISE EXCEPTION 'SS003: paid_by must be included in participants';
  END IF;

  SELECT COALESCE(SUM((s->>'amount')::numeric), 0)
  INTO v_sum
  FROM jsonb_array_elements(p_splits) AS s;

  IF ABS(v_sum - p_amount) > 0.01 THEN
    RAISE EXCEPTION 'SS004: Split amounts do not sum to expense total'
      USING DETAIL = format('sum=%s total=%s', v_sum, p_amount);
  END IF;

  v_split := CASE p_split_type
    WHEN 'equally' THEN 'equal'::split_type
    WHEN 'equal' THEN 'equal'::split_type
    WHEN 'exact' THEN 'exact'::split_type
    WHEN 'percentage' THEN 'percentage'::split_type
    ELSE 'equal'::split_type
  END;

  INSERT INTO public.expenses (
    description,
    amount,
    category,
    paid_by,
    group_id,
    due_date,
    note,
    created_by,
    split_type
  )
  VALUES (
    p_title,
    p_amount,
    COALESCE(p_category, 'general'),
    p_paid_by,
    p_group_id,
    p_due_date,
    p_note,
    p_created_by,
    v_split
  )
  RETURNING id INTO v_expense_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    INSERT INTO public.expense_participants (
      expense_id,
      user_id,
      share_amount,
      is_settled
    )
    VALUES (
      v_expense_id,
      (v_row->>'user_id')::uuid,
      (v_row->>'amount')::numeric,
      false
    );
  END LOOP;

  SELECT json_build_object(
    'id', e.id,
    'title', e.description,
    'amount', e.amount,
    'category', e.category,
    'split_type', e.split_type,
    'paid_by', e.paid_by,
    'group_id', e.group_id,
    'date', COALESCE(p_date, (e.created_at AT TIME ZONE 'UTC')::date),
    'due_date', e.due_date,
    'note', e.note,
    'status', 'active',
    'created_by', e.created_by,
    'created_at', e.created_at,
    'splits', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', ep.id,
          'user_id', ep.user_id,
          'amount', ep.share_amount,
          'is_settled', ep.is_settled
        )
        ORDER BY ep.share_amount DESC
      ), '[]'::json)
      FROM public.expense_participants ep
      WHERE ep.expense_id = v_expense_id
    )
  )
  INTO v_result
  FROM public.expenses e
  WHERE e.id = v_expense_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_expense_with_splits(
  text, numeric, text, uuid, uuid, date, date, text, uuid, jsonb, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_expense_with_splits(
  text, numeric, text, uuid, uuid, date, date, text, uuid, jsonb, text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.create_expense_with_splits(
  text, numeric, text, uuid, uuid, date, date, text, uuid, jsonb, text
) TO authenticated;
