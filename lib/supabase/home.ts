/**
 * Home screen data queries.
 * Stubbed until SS-019 creates groups/expenses/balances tables.
 * Each function returns the correct shape — swap body for real query.
 */

export interface BalanceSummary {
  youAreOwed: number
  youOwe: number
  netBalance: number // positive = owed, negative = owe
}

export interface ActivityItem {
  id: string
  description: string
  amount: number
  type: 'expense' | 'payment' | 'settle'
  createdAt: string
  otherPartyName: string
  otherPartyAvatar: string | null
}

export async function fetchBalanceSummary(
  _userId: string
): Promise<{ data: BalanceSummary; error?: string }> {
  // SS-019: replace with real RPC call
  // const { data, error } = await supabase.rpc('get_balance_summary', { user_id: _userId })
  return {
    data: { youAreOwed: 0, youOwe: 0, netBalance: 0 },
  }
}

export async function fetchRecentActivity(
  _userId: string
): Promise<{ data: ActivityItem[]; error?: string }> {
  // SS-019: replace with real query on expenses/transactions table
  return { data: [] }
}
