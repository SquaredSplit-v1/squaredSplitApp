CREATE OR REPLACE FUNCTION create_expense_equal(
  p_title          text,
  p_amount         numeric,
  p_category       text,
  p_paid_by        uuid,
  p_participants   uuid[],     -- must include paid_by
  p_group_id       uuid,       -- nullable
  p_date           date,
  p_due_date       date,       -- nullable
  p_note           text,       -- nullable
  p_created_by     uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense_id       uuid;
  v_n                int;
  v_amount_cents     bigint;
  v_base_cents       bigint;
  v_remainder_cents  bigint;
  v_participant      uuid;
  v_idx              int  := 0;
  v_split_amount     numeric(12, 2);
  v_result           json;
BEGIN

  -- ── 1. Guards ──────────────────────────────────────────────────────────────
  IF array_length(p_participants, 1) < 2 THEN
    RAISE EXCEPTION 'VALIDATION: at least 2 participants required'
      USING ERRCODE = 'SS001';
  END IF;

  IF array_length(p_participants, 1) > 10 THEN
    RAISE EXCEPTION 'VALIDATION: maximum 10 participants'
      USING ERRCODE = 'SS002';
  END IF;

  IF NOT (p_paid_by = ANY(p_participants)) THEN
    RAISE EXCEPTION 'VALIDATION: paid_by must be included in participants'
      USING ERRCODE = 'SS003';
  END IF;

  -- ── 2. Rounding in integer cents (no float drift) ──────────────────────────
  v_n               := array_length(p_participants, 1);
  v_amount_cents    := ROUND(p_amount * 100)::bigint;
  v_base_cents      := v_amount_cents / v_n;
  v_remainder_cents := v_amount_cents - (v_base_cents * v_n);

  -- ── 3. Insert expense ──────────────────────────────────────────────────────
  INSERT INTO expenses (
    title,    amount,    category,
    paid_by,  group_id,  split_type,
    date,     due_date,  note,
    status,   created_by
  ) VALUES (
    p_title,    p_amount,    p_category,
    p_paid_by,  p_group_id,  'equally',
    p_date,     p_due_date,  p_note,
    'active',   p_created_by
  )
  RETURNING id INTO v_expense_id;

  -- ── 4. Insert one split row per participant ─────────────────────────────────
  FOREACH v_participant IN ARRAY p_participants LOOP
    IF v_idx = 0 THEN
      v_split_amount := (v_base_cents + v_remainder_cents)::numeric / 100;
    ELSE
      v_split_amount := v_base_cents::numeric / 100;
    END IF;

    INSERT INTO expense_splits (expense_id, user_id, amount, is_settled, settled_at)
    VALUES (v_expense_id, v_participant, v_split_amount, false, NULL);

    v_idx := v_idx + 1;
  END LOOP;

  -- ── 5. Belt-and-braces sum check ───────────────────────────────────────────
  PERFORM 1 FROM (
    SELECT SUM(amount) AS t FROM expense_splits WHERE expense_id = v_expense_id
  ) x WHERE ABS(x.t - p_amount) > 0.01;

  IF FOUND THEN
    RAISE EXCEPTION 'INTERNAL: split amounts do not sum to expense total'
      USING ERRCODE = 'SS004';
  END IF;

  -- ── 6. Return full expense + splits ────────────────────────────────────────
  SELECT json_build_object(
    'id',         e.id,
    'title',      e.title,
    'amount',     e.amount,
    'category',   e.category,
    'split_type', e.split_type,
    'paid_by',    e.paid_by,
    'group_id',   e.group_id,
    'date',       e.date,
    'due_date',   e.due_date,
    'note',       e.note,
    'status',     e.status,
    'created_by', e.created_by,
    'created_at', e.created_at,
    'splits', (
      SELECT json_agg(
        json_build_object(
          'id',         es.id,
          'user_id',    es.user_id,
          'amount',     es.amount,
          'is_settled', es.is_settled
        ) ORDER BY es.amount DESC
      )
      FROM expense_splits es WHERE es.expense_id = v_expense_id
    )
  ) INTO v_result FROM expenses e WHERE e.id = v_expense_id;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE ALL    ON FUNCTION create_expense_equal FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_expense_equal TO authenticated;
GRANT EXECUTE ON FUNCTION create_expense_equal TO service_role;