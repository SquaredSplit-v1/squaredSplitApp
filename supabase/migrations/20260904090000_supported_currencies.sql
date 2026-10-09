-- supported_currencies — powers the account currency picker. Existed on the
-- dev database (created out-of-band) but had no migration, so fresh
-- environments fell back to an INR-only list.

CREATE TABLE IF NOT EXISTS public.supported_currencies (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  locale text NOT NULL DEFAULT 'en-US',
  decimal_digits integer NOT NULL DEFAULT 2 CHECK (decimal_digits >= 0)
);

ALTER TABLE public.supported_currencies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supported_currencies'
      AND policyname = 'supported_currencies_read'
  ) THEN
    CREATE POLICY "supported_currencies_read" ON public.supported_currencies
      FOR SELECT TO authenticated USING (true);
  END IF;
END
$$;

INSERT INTO public.supported_currencies (code, name, symbol, locale, decimal_digits) VALUES
  ('AED', 'UAE Dirham', 'د.إ', 'ar-AE', 2),
  ('AUD', 'Australian Dollar', 'A$', 'en-AU', 2),
  ('CAD', 'Canadian Dollar', 'CA$', 'en-CA', 2),
  ('EUR', 'Euro', '€', 'de-DE', 2),
  ('GBP', 'British Pound', '£', 'en-GB', 2),
  ('INR', 'Indian Rupee', '₹', 'en-IN', 2),
  ('JPY', 'Japanese Yen', '¥', 'ja-JP', 0),
  ('MYR', 'Malaysian Ringgit', 'RM', 'ms-MY', 2),
  ('SGD', 'Singapore Dollar', 'S$', 'en-SG', 2),
  ('USD', 'US Dollar', '$', 'en-US', 2)
ON CONFLICT (code) DO NOTHING;
