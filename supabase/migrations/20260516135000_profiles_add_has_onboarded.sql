-- profiles.has_onboarded — read/written by the auth store for app gating.
-- Exists on the dev database (added out-of-band) but had no migration, which
-- broke 20260516140000 on fresh environments. Timestamped to run right
-- before that migration.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_onboarded boolean DEFAULT false;
