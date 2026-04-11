import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'

import { supabase } from '@/lib/supabase/client'
import { useCurrencyStore } from '@/store/currencyStore'

interface ProfileRow {
  has_onboarded: boolean
}

export interface AuthState {
  session: Session | null
  user: User | null
  hasOnboarded: boolean
  isLoading: boolean

  setHasOnboarded: (val: boolean) => void
  hydrateSession: (session: Session, user: User) => Promise<void>
  completeOnboarding: () => void
  logout: () => Promise<void>
  initialize: () => () => void
}

export const useAuthStore = create<AuthState>(set => ({
  session: null,
  user: null,
  hasOnboarded: false,
  isLoading: true,

  setHasOnboarded: val => set({ hasOnboarded: val }),

  hydrateSession: async (session, user) => {
    const { data } = await supabase
      .from('profiles')
      .select('has_onboarded')
      .eq('id', user.id)
      .single()

    const profile = data as ProfileRow | null

    set({
      session,
      user,
      hasOnboarded: profile?.has_onboarded ?? false,
      isLoading: false,
    })

    // Load currency preference after session hydration
    useCurrencyStore.getState().initialize(user.id)
  },

  completeOnboarding: () => set({ hasOnboarded: true }),

  logout: async () => {
    set({ session: null, user: null, hasOnboarded: false })
    useCurrencyStore.getState().reset()
    await supabase.auth.signOut()
  },

  initialize: () => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, hasOnboarded: false, isLoading: false })
        useCurrencyStore.getState().reset()
        return
      }

      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('has_onboarded')
          .eq('id', session.user.id)
          .single()

        const profile = data as ProfileRow | null

        set({
          session,
          user: session.user,
          hasOnboarded: profile?.has_onboarded ?? false,
          isLoading: false,
        })

        // Load currency preference after auth state resolves
        useCurrencyStore.getState().initialize(session.user.id)
      } else {
        set({ session: null, user: null, hasOnboarded: false, isLoading: false })
      }
    })

    return () => subscription.unsubscribe()
  },
}))
