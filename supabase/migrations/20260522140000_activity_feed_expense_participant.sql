-- In-app notifications: activity_feed rows when a user is added to an expense
-- Requires public.activity_feed (SS-027 migration 20260415101500_activity_feed.sql)

DO $$
BEGIN
  IF to_regclass('public.activity_feed') IS NULL THEN
    RAISE NOTICE 'activity_feed table missing — skip expense_participant_added feed trigger';
    RETURN;
  END IF;

  ALTER TABLE public.activity_feed
    DROP CONSTRAINT IF EXISTS activity_feed_type_check;

  ALTER TABLE public.activity_feed
    ADD CONSTRAINT activity_feed_type_check CHECK (
      type IN (
        'expense_created',
        'expense_deleted',
        'settlement_created',
        'expense_participant_added'
      )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.activity_feed_on_expense_participant_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense record;
  v_metadata jsonb;
BEGIN
  SELECT e.id, e.description, e.amount, e.paid_by, e.group_id, e.created_by, e.category
  INTO v_expense
  FROM public.expenses e
  WHERE e.id = NEW.expense_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id = v_expense.created_by THEN
    RETURN NEW;
  END IF;

  v_metadata := jsonb_build_object(
    'expense_id', NEW.expense_id,
    'participant_id', NEW.id,
    'created_by', v_expense.created_by,
    'paid_by', v_expense.paid_by,
    'description', v_expense.description,
    'amount', v_expense.amount,
    'share_amount', NEW.share_amount,
    'group_id', v_expense.group_id,
    'category', v_expense.category
  );

  INSERT INTO public.activity_feed (user_id, type, metadata)
  VALUES (NEW.user_id, 'expense_participant_added', v_metadata);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'activity_feed expense_participant insert failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.activity_feed') IS NULL THEN
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS trg_activity_feed_expense_participant_insert ON public.expense_participants;

  CREATE TRIGGER trg_activity_feed_expense_participant_insert
    AFTER INSERT ON public.expense_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.activity_feed_on_expense_participant_insert();
END;
$$;
