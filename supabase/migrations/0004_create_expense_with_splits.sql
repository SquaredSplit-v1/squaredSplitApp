-- 0004_create_expense_with_splits.sql

create or replace function public.create_expense_with_splits(
  p_title        text,
  p_amount       numeric,
  p_category     text,
  p_paid_by      uuid,
  p_group_id     uuid,
  p_date         date,
  p_due_date     date,
  p_note         text,
  p_created_by   uuid,
  p_splits       jsonb  -- [{ "user_id": uuid, "amount": numeric, "percentage": numeric|null }]
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense public.expenses;
  v_sum     numeric;
  v_row     jsonb;
begin
  -- 1) Validate sum of split amounts = total amount (SS-019/SS-021)
  select coalesce(sum((s->>'amount')::numeric), 0)
  into v_sum
  from jsonb_array_elements(p_splits) as s;

  if v_sum <> p_amount then
    -- SS004 is already defined in DB_ERRORS mapping in the Edge Function
    raise exception 'SS004: Split amounts do not sum to expense total'
      using detail = format('sum=%s total=%s', v_sum, p_amount);
  end if;

  -- 2) Insert expense
  insert into public.expenses(
    description,
    amount,
    category,
    paid_by,
    group_id,
    date,
    due_date,
    note,
    created_by
  )
  values (
    p_title,
    p_amount,
    p_category,
    p_paid_by,
    p_group_id,
    p_date,
    p_due_date,
    p_note,
    p_created_by
  )
  returning * into v_expense;

  -- 3) Insert splits
  for v_row in
    select * from jsonb_array_elements(p_splits)
  loop
    insert into public.expensesplits(
      expense_id,
      user_id,
      amount,
      percentage,
      shares,
      is_settled
    )
    values (
      v_expense.id,
      (v_row->>'user_id')::uuid,
      (v_row->>'amount')::numeric,
      nullif(v_row->>'percentage', 'null')::numeric,
      null,
      false
    );
  end loop;

  return v_expense;
end;
$$;