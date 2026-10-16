-- Search users by phone number (dashboard search) + app-invite fallback support.
--
-- Spec: a user searching a phone number in the dashboard finds a registered
-- user directly by that number; if nobody is registered, the number gets an
-- app-download invite (WhatsApp deep link from the client).
--
-- Also patches match_contacts to respect deactivation and blocklist, so all
-- discovery surfaces follow the same privacy rules.

-- ── 1. search_profile_by_phone ───────────────────────────────────────────────
-- Matches digits-only: exact match first, then last-10-digits (local numbers
-- typed without country code, e.g. 98765 43210 → +91 9876543210).

CREATE OR REPLACE FUNCTION public.search_profile_by_phone(p_phone text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text;
  v_last10 text;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'SS901: not authenticated';
  END IF;

  v_digits := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF length(v_digits) < 7 THEN
    RAISE EXCEPTION 'SS902: enter a valid phone number';
  END IF;

  v_last10 := right(v_digits, 10);

  RETURN (
    SELECT json_build_object(
      'id', p.id,
      'full_name', COALESCE(NULLIF(trim(p.full_name), ''),
        split_part(COALESCE(p.email, ''), '@', 1), 'SquaredSplit User'),
      'avatar_url', p.avatar_url,
      'phone', p.phone
    )
    FROM public.profiles p
    WHERE p.id <> v_caller
      AND p.deactivated_at IS NULL
      AND NOT public.has_block_between(v_caller, p.id)
      AND (
        regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') = v_digits
        OR (length(v_digits) >= 10
            AND right(regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g'), 10) = v_last10)
      )
    ORDER BY
      (regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') = v_digits) DESC,
      p.created_at ASC
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.search_profile_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_profile_by_phone(text) TO authenticated;

-- ── 2. match_contacts: exclude deactivated + blocked users ──────────────────
-- Same privacy rules as every other discovery surface.

CREATE OR REPLACE FUNCTION public.match_contacts(phone_numbers text[])
RETURNS TABLE (
  id uuid,
  display_name text,
  phone text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH input_numbers AS (
    SELECT DISTINCT
      raw_phone,
      regexp_replace(raw_phone, '\D', '', 'g') AS digits
    FROM unnest(phone_numbers) AS raw_phone
    WHERE raw_phone IS NOT NULL
      AND length(regexp_replace(raw_phone, '\D', '', 'g')) >= 7
  )
  SELECT DISTINCT
    p.id,
    COALESCE(NULLIF(trim(p.full_name), ''), split_part(COALESCE(p.email, ''), '@', 1), 'SquaredSplit User') AS display_name,
    i.raw_phone AS phone,
    p.avatar_url
  FROM public.profiles p
  JOIN input_numbers i
    ON regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') = i.digits
  WHERE p.id <> auth.uid()
    AND p.deactivated_at IS NULL
    AND NOT public.has_block_between(auth.uid(), p.id);
$$;

REVOKE ALL ON FUNCTION public.match_contacts(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_contacts(text[]) TO authenticated;
