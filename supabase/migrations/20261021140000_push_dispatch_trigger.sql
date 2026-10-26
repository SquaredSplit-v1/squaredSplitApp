-- Push dispatch: every activity_feed insert is forwarded to the push-dispatch
-- edge function (pg_net, async) which sends Expo pushes to the recipient's
-- registered devices. Failures never block the feed write.

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
  v_url := current_setting('app.settings.push_dispatch_url', true);
  v_secret := current_setting('app.settings.push_dispatch_secret', true);
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

DROP TRIGGER IF EXISTS activity_feed_push_dispatch ON public.activity_feed;
CREATE TRIGGER activity_feed_push_dispatch
  AFTER INSERT ON public.activity_feed
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_dispatch();
