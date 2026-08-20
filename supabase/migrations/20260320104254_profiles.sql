-- Migration 001: profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text UNIQUE,
  avatar_url text,
  timezone text DEFAULT 'Asia/Kolkata',
  currency text DEFAULT 'INR',
  language text DEFAULT 'en',
  is_pro boolean DEFAULT false,
  onboarding_complete boolean DEFAULT false,
  squared_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read any profile (needed for search)
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- User can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User can only insert their own profile
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
