-- Migration 002: device_tokens
CREATE TABLE device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text CHECK (platform IN ('ios', 'android')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

-- RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- User can only read their own tokens
CREATE POLICY "device_tokens_select_own"
  ON device_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User can insert their own tokens
CREATE POLICY "device_tokens_insert_own"
  ON device_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User can delete their own tokens (logout)
CREATE POLICY "device_tokens_delete_own"
  ON device_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
