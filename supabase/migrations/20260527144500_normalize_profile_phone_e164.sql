-- Normalize public.profiles.phone to a '+'-prefixed canonical form.
-- Keeps existing digits, strips punctuation, and prefixes '+'.

CREATE OR REPLACE FUNCTION public.normalize_phone_e164_like(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_phone IS NULL THEN NULL
    ELSE
      CASE
        WHEN length(regexp_replace(p_phone, '\D', '', 'g')) < 7 THEN NULL
        ELSE '+' || regexp_replace(p_phone, '\D', '', 'g')
      END
  END;
$$;

-- Backfill/normalize existing profiles.phone safely (avoid unique collisions).
WITH normalized AS (
  SELECT
    p.id,
    public.normalize_phone_e164_like(p.phone) AS normalized_phone
  FROM public.profiles p
  WHERE p.phone IS NOT NULL
),
safe_updates AS (
  SELECT n.id, n.normalized_phone
  FROM normalized n
  WHERE n.normalized_phone IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p2
      WHERE p2.id <> n.id
        AND p2.phone = n.normalized_phone
    )
)
UPDATE public.profiles p
SET
  phone = su.normalized_phone,
  updated_at = now()
FROM safe_updates su
WHERE p.id = su.id
  AND p.phone IS DISTINCT FROM su.normalized_phone;

-- Ensure auth→profile sync stores normalized phone with '+'.
CREATE OR REPLACE FUNCTION public.sync_profile_contact_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    phone = COALESCE(public.normalize_phone_e164_like(NEW.phone), phone),
    email = COALESCE(NEW.email, email),
    updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Ensure signup profile bootstrap stores normalized phone with '+' too.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, email)
  VALUES (
    NEW.id,
    public.normalize_phone_e164_like(NEW.phone),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
