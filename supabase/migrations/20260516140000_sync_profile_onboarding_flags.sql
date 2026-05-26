-- Align has_onboarded with onboarding_complete / saved display name (SS-023)

UPDATE public.profiles
SET has_onboarded = true
WHERE has_onboarded IS DISTINCT FROM true
  AND (
    onboarding_complete = true
    OR (full_name IS NOT NULL AND length(trim(full_name)) >= 2)
  );
