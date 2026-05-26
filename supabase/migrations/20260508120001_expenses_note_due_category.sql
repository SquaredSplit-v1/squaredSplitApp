-- Optional columns used by create-expense Edge Function / RPC
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS category text;
