import { create } from 'zustand'

import type { ActivityItem, BalanceSummary } from '@/lib/supabase/home'
import { fetchBalanceSummary, fetchRecentActivity } from '@/lib/supabase/home'

interface HomeState {
  balance: BalanceSummary
  activity: ActivityItem[]
  isLoading: boolean
  isRefreshing: boolean
  lastFetchedAt: number | null

  fetch: (userId: string) => Promise<void>
  refresh: (userId: string) => Promise<void>
  reset: () => void
}

const DEFAULT_BALANCE: BalanceSummary = {
  youAreOwed: 0,
  youOwe: 0,
  netBalance: 0,
}

export const useHomeStore = create<HomeState>(set => ({
  balance: DEFAULT_BALANCE,
  activity: [],
  isLoading: false,
  isRefreshing: false,
  lastFetchedAt: null,

  fetch: async (userId: string) => {
    set({ isLoading: true })

    const [balanceResult, activityResult] = await Promise.all([
      fetchBalanceSummary(userId),
      fetchRecentActivity(userId),
    ])

    set({
      balance: balanceResult.data ?? DEFAULT_BALANCE,
      activity: activityResult.data ?? [],
      isLoading: false,
      lastFetchedAt: Date.now(),
    })
  },

  refresh: async (userId: string) => {
    set({ isRefreshing: true })

    const [balanceResult, activityResult] = await Promise.all([
      fetchBalanceSummary(userId),
      fetchRecentActivity(userId),
    ])

    set({
      balance: balanceResult.data ?? DEFAULT_BALANCE,
      activity: activityResult.data ?? [],
      isRefreshing: false,
      lastFetchedAt: Date.now(),
    })
  },

  reset: () =>
    set({
      balance: DEFAULT_BALANCE,
      activity: [],
      isLoading: false,
      isRefreshing: false,
      lastFetchedAt: null,
    }),
}))
