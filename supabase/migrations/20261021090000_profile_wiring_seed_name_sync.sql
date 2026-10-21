-- New-account wiring: seed the profile's name from sign-up metadata.
--
-- handle_new_user already creates the profile row (normalized phone + email)
-- for every new auth user. Social sign-ins (Apple/Google) and admin-created
-- users carry the display name in raw_user_meta_data; seed it so the profile
-- is complete from the first second instead of waiting for onboarding.
-- Also keeps email/phone in sync on the rare auth.users UPDATE that changes
-- them (e.g. a user adds an email later from Account).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text := NULLIF(
    trim(COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    )),
    ''
  );
BEGIN
  INSERT INTO public.profiles (id, phone, email, full_name)
  VALUES (
    NEW.id,
    public.normalize_phone_e164_like(NEW.phone),
    NEW.email,
    v_name
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Keep contact identifiers in sync when auth.users changes them.
CREATE OR REPLACE FUNCTION public.handle_user_contact_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET phone = COALESCE(public.normalize_phone_e164_like(NEW.phone), phone),
      email = COALESCE(NEW.email, email),
      updated_at = now()
  WHERE id = NEW.id
    AND (
      COALESCE(public.normalize_phone_e164_like(NEW.phone), '') <> COALESCE(phone, '')
      OR COALESCE(NEW.email, '') <> COALESCE(email, '')
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_contact_updated ON auth.users;
CREATE TRIGGER on_auth_user_contact_updated
  AFTER UPDATE OF phone, email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_contact_update();
