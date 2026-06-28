import { create } from 'zustand'

import type { Group } from '@/lib/supabase/groups'
import { getGroups } from '@/lib/supabase/groups'

interface GroupsState {
  groups: Group[]
  isLoading: boolean
  isRefreshing: boolean
  lastFetchedAt: number | null
  fetchGroups: (userId: string) => Promise<void>
  refreshGroups: (userId: string) => Promise<void>
  reset: () => void
}

export const useGroupsStore = create<GroupsState>(set => ({
  groups: [],
  isLoading: false,
  isRefreshing: false,
  lastFetchedAt: null,

  fetchGroups: async (userId: string) => {
    set({ isLoading: true })
    const { data } = await getGroups(userId)
    set({ groups: data, isLoading: false, lastFetchedAt: Date.now() })
  },

  refreshGroups: async (userId: string) => {
    set({ isRefreshing: true })
    const { data } = await getGroups(userId)
    set({ groups: data, isRefreshing: false, lastFetchedAt: Date.now() })
  },

  reset: () =>
    set({
      groups: [],
      isLoading: false,
      isRefreshing: false,
      lastFetchedAt: null,
    }),
}))
