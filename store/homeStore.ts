import { create } from 'zustand'

import type { ActivityItem, BalanceSummary, FriendOverview } from '@/lib/supabase/home'
import { fetchBalanceSummary, fetchFriendsOverview, fetchRecentActivity } from '@/lib/supabase/home'

interface HomeState {
  balance: BalanceSummary
  activity: ActivityItem[]
  friends: FriendOverview[]
  /** True when the overview RPC is unavailable and `friends` is derived from
   * the 20 most recent expenses instead (pre-deployment fallback). */
  friendsIsFallback: boolean
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

/**
 * Client-side fallback mirroring the get_friends_overview RPC: per-friend net
 * balances aggregated from recent activity. Only used when the RPC is not
 * deployed on the target Supabase project yet.
 */
function deriveFriendsFromActivity(activity: ActivityItem[]): FriendOverview[] {
  const byFriend = new Map<string, FriendOverview & { subtitleSeeds: ActivityItem[] }>()

  for (const item of activity) {
    const existing = byFriend.get(item.otherPartyId)
    if (existing) {
      existing.netBalance =
        Math.round(
          (existing.netBalance + (item.direction === 'owes_you' ? item.amount : -item.amount)) * 100
        ) / 100
      existing.expenseCount += 1
      existing.hasOverdue = existing.hasOverdue || item.subtitleKind === 'overdue'
      if (
        !existing.lastActivityAt ||
        new Date(item.createdAt) > new Date(existing.lastActivityAt)
      ) {
        existing.lastActivityAt = item.createdAt
      }
    } else {
      byFriend.set(item.otherPartyId, {
        friendId: item.otherPartyId,
        fullName: item.otherPartyName,
        avatarUrl: item.otherPartyAvatar,
        netBalance:
          Math.round((item.direction === 'owes_you' ? item.amount : -item.amount) * 100) / 100,
        expenseCount: 1,
        lastActivityAt: item.createdAt,
        hasOverdue: item.subtitleKind === 'overdue',
        nextDueDate: null,
        subtitleSeeds: [],
      })
    }
  }

  const list = [...byFriend.values()].sort((a, b) => {
    const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
    const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
    return bTime - aTime
  })

  return list.map(({ subtitleSeeds: _seed, ...rest }) => rest)
}

export const useHomeStore = create<HomeState>(set => ({
  balance: DEFAULT_BALANCE,
  activity: [],
  friends: [],
  friendsIsFallback: false,
  isLoading: false,
  isRefreshing: false,
  lastFetchedAt: null,

  fetch: async (userId: string) => {
    set({ isLoading: true })

    const [balanceResult, activityResult, overviewResult] = await Promise.all([
      fetchBalanceSummary(userId),
      fetchRecentActivity(userId),
      fetchFriendsOverview(userId),
    ])

    const activity = activityResult.data ?? []
    const overview = overviewResult.data

    set({
      balance: balanceResult.data ?? DEFAULT_BALANCE,
      activity,
      friends: overview ?? deriveFriendsFromActivity(activity),
      friendsIsFallback: overview === null,
      isLoading: false,
      lastFetchedAt: Date.now(),
    })
  },

  refresh: async (userId: string) => {
    set({ isRefreshing: true })

    const [balanceResult, activityResult, overviewResult] = await Promise.all([
      fetchBalanceSummary(userId),
      fetchRecentActivity(userId),
      fetchFriendsOverview(userId),
    ])

    const activity = activityResult.data ?? []
    const overview = overviewResult.data

    set({
      balance: balanceResult.data ?? DEFAULT_BALANCE,
      activity,
      friends: overview ?? deriveFriendsFromActivity(activity),
      friendsIsFallback: overview === null,
      isRefreshing: false,
      lastFetchedAt: Date.now(),
    })
  },

  reset: () =>
    set({
      balance: DEFAULT_BALANCE,
      activity: [],
      friends: [],
      friendsIsFallback: false,
      isLoading: false,
      isRefreshing: false,
      lastFetchedAt: null,
    }),
}))
