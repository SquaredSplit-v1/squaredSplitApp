/**
 * Home screen data queries.
 * Fetches balance summary and recent activity from expenses table.
 */

import { supabase } from '@/lib/supabase'

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
  userId: string
): Promise<{ data: BalanceSummary; error?: string }> {
  try {
    // Calculate what user paid vs owes
    const { data: paidData, error: paidError } = await supabase
      .from('expenses')
      .select('amount, id, paid_by')
      .eq('paid_by', userId)

    if (paidError) throw paidError

    // Get user's shares from all expenses
    const { data: sharesData, error: sharesError } = await supabase
      .from('expense_participants')
      .select('share_amount, expense_id, expenses(paid_by, amount)')
      .eq('user_id', userId)

    if (sharesError) throw sharesError

    let youAreOwed = 0
    let youOwe = 0

    // Calculate youAreOwed: what others owe you (you paid and they're participants)
    if (paidData && paidData.length > 0) {
      const paidExpenseIds = new Set(paidData.map(e => e.id))
      if (sharesData && sharesData.length > 0) {
        for (const share of sharesData) {
          // If you paid for an expense and have a share, you're owed the difference
          if (paidExpenseIds.has(share.expense_id)) {
            const expense = share.expenses as any
            const yourShare = share.share_amount
            youAreOwed += Math.max(0, expense.amount - yourShare)
          }
        }
      } else {
        // If you paid and no shares, you're owed everything
        youAreOwed = paidData.reduce((sum, e) => sum + e.amount, 0)
      }
    }

    // Calculate youOwe: your shares in expenses you didn't pay for
    if (sharesData && sharesData.length > 0) {
      for (const share of sharesData) {
        const expense = share.expenses as any
        if (expense && expense.paid_by !== userId) {
          youOwe += share.share_amount
        }
      }
    }

    const netBalance = youAreOwed - youOwe

    return {
      data: {
        youAreOwed: Math.round(youAreOwed * 100) / 100,
        youOwe: Math.round(youOwe * 100) / 100,
        netBalance: Math.round(netBalance * 100) / 100,
      },
    }
  } catch (error) {
    console.error('[fetchBalanceSummary]', error)
    return {
      data: { youAreOwed: 0, youOwe: 0, netBalance: 0 },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function fetchRecentActivity(
  userId: string
): Promise<{ data: ActivityItem[]; error?: string }> {
  try {
    // Get recent expenses where user is involved
    const { data, error } = await supabase
      .from('expenses')
      .select(
        `
        id,
        amount,
        description,
        paid_by,
        created_at,
        expense_participants!inner (
          user_id,
          share_amount
        ),
        paid_by_profile:profiles!expenses_paid_by_fkey(full_name)
      `
      )
      .or(
        `(paid_by.eq.${userId},expense_participants.user_id.eq.${userId})`
      )
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    if (!data || data.length === 0) {
      return { data: [] }
    }

    const activities: ActivityItem[] = data.map(expense => {
      const description = expense.description || 'Expense'
      const otherPartyName = (expense.paid_by_profile as any)?.full_name || 'Friend'

      return {
        id: expense.id,
        description,
        amount: expense.amount,
        type: 'expense',
        createdAt: expense.created_at,
        otherPartyName,
        otherPartyAvatar: null,
      }
    })

    return { data: activities }
  } catch (error) {
    console.error('[fetchRecentActivity]', error)
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
