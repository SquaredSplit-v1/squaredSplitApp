import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'

import { deregisterPushTokenOnLogout } from '@/lib/push/setupPushNotifications'
import { supabase } from '@/lib/supabase/client'
import { useAddExpenseStore } from '@/store/addExpenseStore'
import { useContactsStore } from '@/store/contactsStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { useFriendsStore } from '@/store/friendsStore'
import { useGroupsStore } from '@/store/groupsStore'
import { useHomeStore } from '@/store/homeStore'

interface ProfileRow {
  has_onboarded: boolean | null
  onboarding_complete: boolean | null
  full_name: string | null
}

function profileIsOnboarded(row: ProfileRow | null): boolean {
  if (!row) return false
  if (row.has_onboarded === true) return true
  if (row.onboarding_complete === true) return true
  return Boolean(row.full_name?.trim())
}

export interface AuthState {
  session: Session | null
  user: User | null
  hasOnboarded: boolean
  isLoading: boolean

  completeOnboarding: () => Promise<void>
  logout: () => Promise<void>
  initialize: () => () => void
}

async function fetchProfile(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('has_onboarded, onboarding_complete, full_name')
    .eq('id', userId)
    .single()

  if (error) {
    console.warn('[authStore] fetchProfile', error.message)
    return false
  }
  return profileIsOnboarded(data as ProfileRow | null)
}

async function persistOnboardingComplete(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      has_onboarded: true,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) console.warn('[authStore] persistOnboardingComplete', error.message)
}

function resetAllStores() {
  useCurrencyStore.getState().reset()
  useContactsStore.getState().reset()
  useHomeStore.getState().reset()
  useFriendsStore.getState().reset()
  useGroupsStore.getState().reset()
  useAddExpenseStore.getState().reset()
}

export const useAuthStore = create<AuthState>(set => ({
  session: null,
  user: null,
  hasOnboarded: false,
  isLoading: true,

  completeOnboarding: async () => {
    const userId = useAuthStore.getState().user?.id
    if (userId) await persistOnboardingComplete(userId)
    set({ hasOnboarded: true })
  },

  logout: async () => {
    // Deregister push token before invalidating session so the backend
    // still has auth context to identify the token row to delete.
    await deregisterPushTokenOnLogout()
    set({ session: null, user: null, hasOnboarded: false, isLoading: false })
    resetAllStores()
    await supabase.auth.signOut()
  },

  initialize: () => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ session: null, user: null, hasOnboarded: false, isLoading: false })
        resetAllStores()
        return
      }

      set({ session, user: session.user })

      fetchProfile(session.user.id).then(hasOnboarded => {
        set({ hasOnboarded, isLoading: false })
        useCurrencyStore.getState().initialize(session.user.id)
      })
    })

    return () => subscription.unsubscribe()
  },
}))
