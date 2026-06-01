-- Ensure contact matching works by keeping profiles.phone populated and normalized.

-- 1) Backfill missing profile phone values from auth.users.
UPDATE public.profiles p
SET
  phone = u.phone,
  updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND p.phone IS NULL
  AND u.phone IS NOT NULL;

-- 2) Keep profiles.phone and profiles.email in sync when auth.users changes.
CREATE OR REPLACE FUNCTION public.sync_profile_contact_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    phone = COALESCE(NEW.phone, phone),
    email = COALESCE(NEW.email, email),
    updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_contact_from_auth_user ON auth.users;

CREATE TRIGGER trg_sync_profile_contact_from_auth_user
AFTER INSERT OR UPDATE OF phone, email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_contact_from_auth_user();

-- 3) Robust match_contacts RPC:
--    - compares by digits-only phone to handle formatting differences
--    - returns the exact input phone format so client-side local-name mapping works
--    - excludes the current authenticated user
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
  WHERE p.id <> auth.uid();
$$;

REVOKE ALL ON FUNCTION public.match_contacts(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_contacts(text[]) TO authenticated;
