-- device_tokens row-level security.
--
-- The client registers/deregisters Expo push tokens directly through
-- PostgREST (lib/api/registerPushToken.ts), so authenticated users need CRUD
-- access to their own rows. The table was originally created outside
-- migrations; create it if missing so fresh projects work too.

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON public.device_tokens(user_id);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'device_tokens' AND policyname = 'device_tokens_owner_select'
  ) THEN
    CREATE POLICY "device_tokens_owner_select" ON public.device_tokens
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'device_tokens' AND policyname = 'device_tokens_owner_insert'
  ) THEN
    CREATE POLICY "device_tokens_owner_insert" ON public.device_tokens
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'device_tokens' AND policyname = 'device_tokens_owner_update'
  ) THEN
    CREATE POLICY "device_tokens_owner_update" ON public.device_tokens
      FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'device_tokens' AND policyname = 'device_tokens_owner_delete'
  ) THEN
    CREATE POLICY "device_tokens_owner_delete" ON public.device_tokens
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END
$$;
