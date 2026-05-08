import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'

import { supabase } from '@/lib/supabase/client'
import { useContactsStore } from '@/store/contactsStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { useHomeStore } from '@/store/homeStore'

interface ProfileRow {
  has_onboarded: boolean
}

export interface AuthState {
  session: Session | null
  user: User | null
  hasOnboarded: boolean
  isLoading: boolean

  completeOnboarding: () => void
  logout: () => Promise<void>
  initialize: () => () => void
}

async function fetchProfile(userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('has_onboarded').eq('id', userId).single()
  return (data as ProfileRow | null)?.has_onboarded ?? false
}

export const useAuthStore = create<AuthState>(set => ({
  session: null,
  user: null,
  hasOnboarded: false,
  isLoading: true,

  completeOnboarding: () => set({ hasOnboarded: true }),

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
