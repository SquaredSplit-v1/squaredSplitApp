import { getExpense, type ExpenseDetail } from '@/lib/supabase/home'

/**
 * API wrapper to fetch a single expense detail
 * Called from the expense detail page
 */
export async function fetchExpenseDetail(
  expenseId: string
): Promise<{ data: ExpenseDetail | null; error?: string }> {
  console.log('[fetchExpenseDetail] Loading expense:', expenseId)
  const result = await getExpense(expenseId)
  console.log('[fetchExpenseDetail] Result:', result)
  return result
}
