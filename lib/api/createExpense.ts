// lib/api/createExpense.ts
import { supabase } from '@/lib/supabase'

export interface CreateExpensePayload {
  title: string
  amount: number
  paid_by: string
  participants: string[] // must include paid_by, min 2, max 10
  category?: string
  split_type?: 'equally' | 'exact' | 'percentage'
  note?: string | null
  date?: string // YYYY-MM-DD, defaults to today
  due_date?: string | null
  group_id?: string | null
  exact_amounts?: Record<string, number>
  percentages?: Record<string, number>
}

export interface ExpenseSplit {
  id: string
  user_id: string
  amount: number
  is_settled: boolean
}

export interface CreatedExpense {
  id: string
  title: string
  amount: number
  category: string
  split_type: string
  paid_by: string
  group_id: string | null
  date: string
  due_date: string | null
  note: string | null
  status: string
  created_by: string
  created_at: string
  splits: ExpenseSplit[]
}

export async function createExpense(payload: CreateExpensePayload): Promise<CreatedExpense> {
  const { data, error } = await supabase.functions.invoke('create-expense', {
    body: {
      title: payload.title,
      amount: payload.amount,
      paid_by: payload.paid_by,
      participants: payload.participants,
      category: payload.category ?? 'general',
      split_type: payload.split_type ?? 'equally',
      note: payload.note ?? null,
      date: payload.date ?? new Date().toISOString().split('T')[0],
      due_date: payload.due_date ?? null,
      group_id: payload.group_id ?? null,
      exact_amounts: payload.exact_amounts ?? null,
      percentages: payload.percentages ?? null,
    },
  })

  if (error) throw new Error(error.message ?? 'Failed to create expense')
  if (!data) throw new Error('No data returned from create-expense')
  return data as CreatedExpense
}
