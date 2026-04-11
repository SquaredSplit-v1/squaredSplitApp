import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'

import { supabase } from '@/lib/supabase/client'

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

  // Called directly from verifyOtp — bypasses onAuthStateChange listener
  // latency with custom storage adapters
  hydrateSession: async (session, user) => {
    const { data } = await supabase
      .from('profiles')
      .select('has_onboarded')
      .eq('id', user.id)
      .single()

    // Cast because types may not be regenerated after migration
    const profile = data as ProfileRow | null

    set({
      session,
      user,
      hasOnboarded: profile?.has_onboarded ?? false,
      isLoading: false,
    })
  },

  // Called from onboarding/profile.tsx after profile setup completes
  completeOnboarding: () => set({ hasOnboarded: true }),

  logout: async () => {
    set({ session: null, user: null, hasOnboarded: false })
    await supabase.auth.signOut()
  },

  initialize: () => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, hasOnboarded: false, isLoading: false })
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
      } else {
        set({ session: null, user: null, hasOnboarded: false, isLoading: false })
      }
    })

    return () => subscription.unsubscribe()
  },
}))
