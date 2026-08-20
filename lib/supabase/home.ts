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

export type ActivityDirection = 'owes_you' | 'you_owe'
export type ActivitySubtitleKind = 'date' | 'overdue' | 'upcoming'

export interface ActivityItem {
  id: string
  description: string
  amount: number
  type: 'expense' | 'payment' | 'settle'
  createdAt: string
  otherPartyId: string
  otherPartyName: string
  otherPartyAvatar: string | null
  direction: ActivityDirection
  subtitleKind: ActivitySubtitleKind
  subtitle: string
}

export interface ExpenseDetailParticipant {
  userId: string
  fullName: string
  avatarUrl: string | null
  shareAmount: number
}

export interface ExpenseDetail {
  id: string
  title: string
  amount: number
  paidBy: string
  createdAt: string
  note: string | null
  dueDate: string | null
  category: string | null
  participants: ExpenseDetailParticipant[]
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function formatActivityDate(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d)
}

function formatActivityDateShortYear(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate()
  const mon = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d)
  const y = d.getFullYear() % 100
  return `${day} ${mon}'${String(y).padStart(2, '0')}`
}

function classifySubtitle(
  createdAt: string,
  dueDate: string | null | undefined
): { kind: ActivitySubtitleKind; text: string } {
  if (dueDate) {
    const due = startOfDay(new Date(dueDate + 'T12:00:00'))
    const today = startOfDay(new Date())
    const daysUntil = (due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)

    if (due < today) {
      return { kind: 'overdue', text: formatActivityDateShortYear(dueDate) }
    }
    if (daysUntil >= 0 && daysUntil <= 7) {
      return { kind: 'upcoming', text: '⚠️ Upcoming due' }
    }
  }
  return { kind: 'date', text: formatActivityDate(createdAt) }
}

export async function fetchBalanceSummary(
  userId: string
): Promise<{ data: BalanceSummary; error?: string }> {
  try {
    const { data: paidData, error: paidError } = await supabase
      .from('expenses')
      .select('amount, id, paid_by')
      .eq('paid_by', userId)

    if (paidError) throw paidError

    const { data: sharesData, error: sharesError } = await supabase
      .from('expense_participants')
      .select('share_amount, expense_id, expenses(paid_by, amount)')
      .eq('user_id', userId)

    if (sharesError) throw sharesError

    let youAreOwed = 0
    let youOwe = 0

    if (paidData && paidData.length > 0) {
      const paidExpenseIds = new Set(paidData.map(e => e.id))
      if (sharesData && sharesData.length > 0) {
        for (const share of sharesData) {
          if (paidExpenseIds.has(share.expense_id)) {
            const expense = share.expenses as { paid_by: string; amount: number } | null
            const yourShare = share.share_amount
            youAreOwed += Math.max(0, (expense?.amount ?? 0) - yourShare)
          }
        }
      } else {
        youAreOwed = paidData.reduce((sum, e) => sum + e.amount, 0)
      }
    }

    if (sharesData && sharesData.length > 0) {
      for (const share of sharesData) {
        const expense = share.expenses as { paid_by: string; amount: number } | null
        if (expense && expense.paid_by !== userId) {
          youOwe += share.share_amount
        }
      }
    }

    const netBalance = youAreOwed - youOwe

    return {
      data: {
        youAreOwed: roundMoney(youAreOwed),
        youOwe: roundMoney(youOwe),
        netBalance: roundMoney(netBalance),
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

type ParticipantRow = { expense_id: string; user_id: string; share_amount: number }

export async function fetchRecentActivity(
  userId: string
): Promise<{ data: ActivityItem[]; error?: string }> {
  try {
    const { data: participantExpenses, error: participantError } = await supabase
      .from('expense_participants')
      .select('expense_id')
      .eq('user_id', userId)

    if (participantError) throw participantError

    const expenseIdsFromParts = [...new Set(participantExpenses?.map(p => p.expense_id) ?? [])]

    // Base columns only — due_date/note/category require migration 20260508120001 on the project DB.
    let query = supabase
      .from('expenses')
      .select('id, amount, description, paid_by, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (expenseIdsFromParts.length > 0) {
      query = query.or(`paid_by.eq.${userId},id.in.(${expenseIdsFromParts.join(',')})`)
    } else {
      query = query.eq('paid_by', userId)
    }

    const { data, error } = await query

    if (error) throw error

    if (!data || data.length === 0) {
      return { data: [] }
    }

    const expenseIds = data.map(e => e.id)

    const { data: partRows, error: partsErr } = await supabase
      .from('expense_participants')
      .select('expense_id, user_id, share_amount')
      .in('expense_id', expenseIds)

    if (partsErr) throw partsErr

    const byExpense = new Map<string, ParticipantRow[]>()
    for (const row of partRows ?? []) {
      const list = byExpense.get(row.expense_id) ?? []
      list.push(row as ParticipantRow)
      byExpense.set(row.expense_id, list)
    }

    const allUserIds = new Set<string>()
    for (const e of data) {
      allUserIds.add(e.paid_by)
    }
    for (const row of partRows ?? []) {
      allUserIds.add(row.user_id)
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', [...allUserIds])

    if (profileError) {
      console.error('[fetchRecentActivity] Error fetching profiles:', profileError)
    }

    const profileMap = new Map(
      profiles?.map(p => [p.id, { name: p.full_name ?? 'Friend', avatar: p.avatar_url }]) ?? []
    )

    const activities: ActivityItem[] = []

    for (const expense of data) {
      const parts = byExpense.get(expense.id) ?? []
      const myPart = parts.find(p => p.user_id === userId)
      const userShare = myPart?.share_amount ?? 0
      const total = Number(expense.amount)
      const paidBy = expense.paid_by
      const others = parts.filter(p => p.user_id !== userId)

      let direction: ActivityDirection
      let displayAmount: number
      let counterpartyId: string

      if (paidBy === userId) {
        direction = 'owes_you'
        displayAmount = roundMoney(Math.max(0, total - userShare))
        const pick = others.reduce<(typeof others)[0] | null>((best, p) => {
          if (!best || Number(p.share_amount) > Number(best.share_amount)) return p
          return best
        }, null)
        if (!pick) {
          console.warn(
            '[fetchRecentActivity] Missing co-participant rows for expense',
            expense.id,
            '— check expense_participants RLS'
          )
          continue
        }
        counterpartyId = pick.user_id
      } else {
        direction = 'you_owe'
        displayAmount = roundMoney(userShare)
        counterpartyId = paidBy
      }

      if (displayAmount <= 0) continue

      const prof = profileMap.get(counterpartyId)
      const sub = classifySubtitle(expense.created_at, undefined)

      activities.push({
        id: expense.id,
        description: expense.description || 'Expense',
        amount: displayAmount,
        type: 'expense',
        createdAt: expense.created_at,
        otherPartyId: counterpartyId,
        otherPartyName: prof?.name ?? 'Friend',
        otherPartyAvatar: prof?.avatar ?? null,
        direction,
        subtitleKind: sub.kind,
        subtitle: sub.text,
      })
    }

    return { data: activities }
  } catch (error) {
    console.error('[fetchRecentActivity]', error)
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getExpense(
  expenseId: string
): Promise<{ data: ExpenseDetail | null; error?: string }> {
  try {
    const { data: expense, error: expErr } = await supabase
      .from('expenses')
      .select('id, amount, description, paid_by, created_at')
      .eq('id', expenseId)
      .single()

    if (expErr) throw expErr
    if (!expense) return { data: null }

    const { data: splits, error: splitErr } = await supabase
      .from('expense_participants')
      .select('user_id, share_amount')
      .eq('expense_id', expenseId)

    if (splitErr) throw splitErr

    const userIds = [...new Set(splits?.map(s => s.user_id) ?? [])]
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds)

    if (profileError) {
      console.error('[getExpense] profiles:', profileError)
    }

    const pmap = new Map(
      profiles?.map(p => [p.id, { name: p.full_name ?? 'Friend', avatar: p.avatar_url }]) ?? []
    )

    const participants: ExpenseDetailParticipant[] = (splits ?? []).map(row => {
      const p = pmap.get(row.user_id)
      return {
        userId: row.user_id,
        fullName: p?.name ?? 'Friend',
        avatarUrl: p?.avatar ?? null,
        shareAmount: roundMoney(Number(row.share_amount)),
      }
    })

    return {
      data: {
        id: expense.id,
        title: expense.description || 'Expense',
        amount: roundMoney(Number(expense.amount)),
        paidBy: expense.paid_by,
        createdAt: expense.created_at,
        note: null,
        dueDate: null,
        category: null,
        participants,
      },
    }
  } catch (error) {
    console.error('[getExpense]', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
