-- Push dispatch settings live in a table (ALTER DATABASE is not permitted on
-- hosted Supabase). Rows are seeded per environment by scripts/seed-dummy-users.py
-- style tooling / management API after this migration runs.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.notify_push_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT value INTO v_url FROM public.app_settings WHERE key = 'push_dispatch_url';
  SELECT value INTO v_secret FROM public.app_settings WHERE key = 'push_dispatch_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NEW;  -- not configured on this environment
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'type', NEW.type,
        'metadata', NEW.metadata,
        'created_at', NEW.created_at
      ),
      timeout_milliseconds := 8000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'push dispatch failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER activity_feed_push_dispatch
  AFTER INSERT ON public.activity_feed
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_dispatch();
