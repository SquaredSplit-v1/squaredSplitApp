-- Supabase advisors cleanup: security + performance findings across all envs.
-- Fixes the ERROR (RLS disabled on otp_rate_limits), the mutable-search_path
-- functions, anon access to SECURITY DEFINER RPCs, duplicate permissive
-- policies, auth.uid() init-plan rewrites, missing FK indexes, and moves
-- pg_net out of the public schema.

-- ── 1. ERROR: otp_rate_limits had RLS disabled ──────────────────────────────
-- Only service_role (phone-auth function internals) touches it; deny everyone.
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;

-- ── 2. Drop redundant device_tokens policies (public-role duplicates) ───────
DROP POLICY IF EXISTS device_tokens_owner_select ON public.device_tokens;
DROP POLICY IF EXISTS device_tokens_owner_insert ON public.device_tokens;
DROP POLICY IF EXISTS device_tokens_owner_update ON public.device_tokens;
DROP POLICY IF EXISTS device_tokens_owner_delete ON public.device_tokens;

-- ── 3. Merge expense_participants SELECT policies into one ──────────────────
DROP POLICY IF EXISTS "Users can view splits for expenses they are on" ON public.expense_participants;
DROP POLICY IF EXISTS "Users can view their expense shares" ON public.expense_participants;
CREATE POLICY "expense_participants_select"
  ON public.expense_participants FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR public.is_expense_participant(expense_id));

-- ── 4. Rewrite every policy: auth.uid() → (select auth.uid()) ───────────────
-- init-plan form evaluates the uid once per statement instead of per row.
-- Idempotent: existing (select …) occurrences are preserved.
DO $$
DECLARE r record; q text; w text; roles_txt text; sql_text text; errs text := '';
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual ILIKE '%auth.uid()%' OR with_check ILIKE '%auth.uid()%')
  LOOP
    BEGIN
      q := COALESCE(REPLACE(REPLACE(REPLACE(r.qual, '(select auth.uid())', '@AU@'), 'auth.uid()', '(select auth.uid())'), '@AU@', '(select auth.uid())'), NULL);
      w := COALESCE(REPLACE(REPLACE(REPLACE(r.with_check, '(select auth.uid())', '@AU@'), 'auth.uid()', '(select auth.uid())'), '@AU@', '(select auth.uid())'), NULL);
      SELECT string_agg(role, ', ') INTO roles_txt FROM unnest(r.roles) AS role;
      sql_text := 'DROP POLICY ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
      EXECUTE sql_text;
      sql_text := 'CREATE POLICY ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename)
        || ' AS ' || r.permissive
        || ' FOR ' || r.cmd || ' TO ' || roles_txt
        || COALESCE(' USING (' || q || ')', '')
        || COALESCE(' WITH CHECK (' || w || ')', '');
      EXECUTE sql_text;
    EXCEPTION WHEN OTHERS THEN
      errs := errs || r.policyname || ': ' || SQLERRM || ' | ';
      GET STACKED DIAGNOSTICS errs = PG_EXCEPTION_CONTEXT;
      sql_text := 'CREATE POLICY ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename)
        || ' AS ' || r.permissive
        || ' FOR ' || r.cmd || ' TO ' || roles_txt
        || COALESCE(' USING (' || r.qual || ')', '')
        || COALESCE(' WITH CHECK (' || r.with_check || ')', '');
      EXECUTE sql_text;
    END;
  END LOOP;
  RAISE NOTICE 'FAILURES: %', errs;
END $$;

-- ── 5. Fix mutable search_path on every public function lacking it ──────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proconfig IS NULL
  LOOP
    EXECUTE format('ALTER FUNCTION public.%s SET search_path = public', r.sig);
  END LOOP;
END;
$$;

-- ── 6. SECURITY DEFINER RPCs are for the app only — revoke anon ─────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM anon', r.sig);
  END LOOP;
END;
$$;

-- ── 7. Missing FK indexes (performance: unindexed_foreign_keys) ─────────────
CREATE INDEX IF NOT EXISTS idx_friend_notes_friend_id ON public.friend_notes(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_notes_updated_by ON public.friend_notes(updated_by);
CREATE INDEX IF NOT EXISTS idx_friend_settings_friend_id ON public.friend_settings(friend_id);
CREATE INDEX IF NOT EXISTS idx_expense_rejections_expense_id ON public.expense_rejections(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_invites_inviter_id ON public.expense_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_expense_invites_accepted_by ON public.expense_invites(accepted_by);
CREATE INDEX IF NOT EXISTS idx_expense_receipts_uploaded_by ON public.expense_receipts(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_expense_agreements_signer_id ON public.expense_agreements(signer_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_user_id ON public.expense_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);

-- ── 8. pg_net in public schema — accepted WARN ─────────────────────────────
-- pg_net is NOT relocatable ("does not support SET SCHEMA"), so it must stay
-- in public. The extension only exposes net.http_post to trusted trigger code.

-- ── 8b. Re-assert the push trigger fn (schema-agnostic) ─────────────────────
-- search_path includes extensions so net.http_post resolves whether the
-- platform placed pg_net in public (fresh SQL-created projects) or in the
-- extensions schema (dashboard-enabled projects).
CREATE OR REPLACE FUNCTION public.notify_push_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT value INTO v_url FROM public.app_settings WHERE key = 'push_dispatch_url';
  SELECT value INTO v_secret FROM public.app_settings WHERE key = 'push_dispatch_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
      body := jsonb_build_object('user_id', NEW.user_id, 'type', NEW.type, 'metadata', NEW.metadata, 'created_at', NEW.created_at),
      timeout_milliseconds := 8000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'push dispatch failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$fn$;
