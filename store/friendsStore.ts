import { create } from 'zustand'

import { supabase } from '@/lib/supabase/client'

export interface Friend {
  friendId: string
  fullName: string
  avatarUrl: string | null
  netBalance: number
}

export interface SharedExpense {
  expenseId: string
  description: string
  amount: number
  paidBy: string
  shareAmount: number
  isSettled: boolean
  createdAt: string
}

interface FriendsState {
  friends: Friend[]
  sharedExpenses: SharedExpense[]
  isLoading: boolean
  isLoadingDetail: boolean
  fetchFriends: (userId: string) => Promise<void>
  fetchSharedExpenses: (userId: string, friendId: string) => Promise<void>
  reset: () => void
}

type FriendRow = {
  friend_id: string
  full_name: string | null
  avatar_url: string | null
  net_balance: number
}

type SharedExpenseRow = {
  expense_id: string
  description: string
  amount: number
  paid_by: string
  share_amount: number
  is_settled: boolean
  created_at: string
}

export const useFriendsStore = create<FriendsState>(set => ({
  friends: [],
  sharedExpenses: [],
  isLoading: false,
  isLoadingDetail: false,

  fetchFriends: async userId => {
    set({ isLoading: true })

    try {
      const { data, error } = await supabase.rpc('get_friend_balances', {
        p_user_id: userId,
      })

      if (error) {
        console.error('get_friend_balances error:', error)
        set({ friends: [] })
        return
      }

      const rows = (data ?? []) as FriendRow[]
      set({
        friends: rows.map(row => ({
          friendId: row.friend_id,
          fullName: row.full_name ?? 'Unknown',
          avatarUrl: row.avatar_url ?? null,
          netBalance: Number(row.net_balance ?? 0),
        })),
      })
    } catch (error) {
      console.error('fetchFriends error:', error)
      set({ friends: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchSharedExpenses: async (userId, friendId) => {
    set({ isLoadingDetail: true })

    try {
      const { data, error } = await supabase.rpc('get_shared_expenses', {
        p_user_id: userId,
        p_friend_id: friendId,
      })

      if (error) {
        console.error('get_shared_expenses error:', error)
        set({ sharedExpenses: [] })
        return
      }

      const rows = (data ?? []) as SharedExpenseRow[]
      set({
        sharedExpenses: rows.map(row => ({
          expenseId: row.expense_id,
          description: row.description,
          amount: Number(row.amount ?? 0),
          paidBy: row.paid_by,
          shareAmount: Number(row.share_amount ?? 0),
          isSettled: row.is_settled ?? false,
          createdAt: row.created_at,
        })),
      })
    } catch (error) {
      console.error('fetchSharedExpenses error:', error)
      set({ sharedExpenses: [] })
    } finally {
      set({ isLoadingDetail: false })
    }
  },

  reset: () =>
    set({
      friends: [],
      sharedExpenses: [],
      isLoading: false,
      isLoadingDetail: false,
    }),
}))
