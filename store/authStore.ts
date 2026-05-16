import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'

import { supabase } from '@/lib/supabase/client'
import { useContactsStore } from '@/store/contactsStore'
import { useCurrencyStore } from '@/store/currencyStore'
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
    set({ session: null, user: null, hasOnboarded: false, isLoading: false })
    useCurrencyStore.getState().reset()
    useContactsStore.getState().reset()
    useHomeStore.getState().reset()
    await supabase.auth.signOut()
  },

  initialize: () => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ session: null, user: null, hasOnboarded: false, isLoading: false })
        useCurrencyStore.getState().reset()
        useContactsStore.getState().reset()
        return
      }

      // Set session immediately so UI knows user is authed,
      // then fetch profile in a separate microtask to avoid
      // deadlocking the Supabase auth queue.
      set({ session, user: session.user })

      fetchProfile(session.user.id).then(hasOnboarded => {
        set({ hasOnboarded, isLoading: false })
        useCurrencyStore.getState().initialize(session.user.id)
      })
    })

    return () => subscription.unsubscribe()
  },
}))
