-- Fix phone normalization to strip all non-digits reliably.

CREATE OR REPLACE FUNCTION public.normalize_phone_e164_like(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_phone IS NULL THEN NULL
    ELSE
      CASE
        WHEN length(regexp_replace(p_phone, '[^0-9]', '', 'g')) < 7 THEN NULL
        ELSE '+' || regexp_replace(p_phone, '[^0-9]', '', 'g')
      END
  END;
$$;

UPDATE public.profiles
SET
  phone = public.normalize_phone_e164_like(phone),
  updated_at = now()
WHERE phone IS NOT NULL;
