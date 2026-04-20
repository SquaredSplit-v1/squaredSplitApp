-- supabase/migrations/019_create_expenses_schema.sql
-- SS-019: expenses & expense_participants schema

-- 1. Split type enum
CREATE TYPE split_type AS ENUM ('equal', 'exact', 'percentage');

-- 2. Expenses table
CREATE TABLE expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  paid_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid,
  split_type split_type DEFAULT 'equal',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Expense participants junction
CREATE TABLE expense_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_amount numeric(12,2) NOT NULL CHECK (share_amount >= 0),
  is_settled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(expense_id, user_id)
);

-- 4. Indexes
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX idx_exp_participants_user_id ON expense_participants(user_id);
CREATE INDEX idx_exp_participants_expense_id ON expense_participants(expense_id);
CREATE INDEX idx_exp_participants_settled ON expense_participants(is_settled);

-- 5. Timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Apply triggers
CREATE TRIGGER update_expenses_updated_at 
  BEFORE UPDATE ON expenses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exp_participants_updated_at 
  BEFORE UPDATE ON expense_participants 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their expenses" ON expenses
  FOR SELECT USING (
    auth.uid() = paid_by 
    OR auth.uid() = created_by 
    OR auth.uid() IN (
      SELECT user_id FROM expense_participants WHERE expense_id = id
    )
  );

CREATE POLICY "Users can view their expense shares" ON expense_participants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can create their expense shares" ON expense_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);