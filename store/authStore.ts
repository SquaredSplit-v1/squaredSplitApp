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

async function fetchOnboardingStatus(userId: string): Promise<boolean> {
  console.log('[authStore] fetchOnboardingStatus start:', userId)
  const { data, error } = await supabase
    .from('profiles')
    .select('has_onboarded')
    .eq('id', userId)
    .single()
  console.log('[authStore] fetchOnboardingStatus done:', { data, error: error?.message })
  return (data as ProfileRow | null)?.has_onboarded ?? false
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  hasOnboarded: false,
  isLoading: true,

  setHasOnboarded: val => set({ hasOnboarded: val }),

  hydrateSession: async (session, user) => {
    console.log('[authStore] hydrateSession:', user.id)
    const hasOnboarded = await fetchOnboardingStatus(user.id)
    set({ session, user, hasOnboarded, isLoading: false })
  },

  completeOnboarding: () => set({ hasOnboarded: true }),

  logout: async () => {
    set({ session: null, user: null, hasOnboarded: false })
    await supabase.auth.signOut()
  },

  initialize: () => {
    console.log('[authStore] initialize called')

    // ── 1. Eager session read ─────────────────────────────────────────────────
    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        console.log('[authStore] getSession resolved:', {
          userId: session?.user?.id ?? 'null',
          error: error?.message ?? 'none',
          alreadyResolved: !get().isLoading,
        })

        if (!get().isLoading) {
          console.log('[authStore] getSession: listener already handled, skipping')
          return
        }

        if (session) {
          const hasOnboarded = await fetchOnboardingStatus(session.user.id)
          console.log('[authStore] getSession: setting session + hasOnboarded:', hasOnboarded)
          set({ session, user: session.user, hasOnboarded, isLoading: false })
        } else {
          console.log('[authStore] getSession: no session, setting isLoading false')
          set({ isLoading: false })
        }
      })
      .catch(e => {
        console.error('[authStore] getSession threw:', e)
        set({ isLoading: false })
      })

    // ── 2. Timeout safety net ─────────────────────────────────────────────────
    const timeout = setTimeout(() => {
      if (get().isLoading) {
        console.warn('[authStore] ⚠️ 5s timeout hit — forcing isLoading false')
        set({ isLoading: false })
      }
    }, 5000)

    // ── 3. Live state changes ─────────────────────────────────────────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[authStore] onAuthStateChange event:', event)
      clearTimeout(timeout)

      if (event === 'INITIAL_SESSION') {
        console.log('[authStore] INITIAL_SESSION — handled by getSession, skipping')
        return
      }

      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, hasOnboarded: false, isLoading: false })
        return
      }

      if (session) {
        const hasOnboarded = await fetchOnboardingStatus(session.user.id)
        set({ session, user: session.user, hasOnboarded, isLoading: false })
      } else {
        set({ session: null, user: null, hasOnboarded: false, isLoading: false })
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  },
}))
