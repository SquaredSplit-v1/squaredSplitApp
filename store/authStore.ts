import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'

import { supabase } from '@/lib/supabase'

const ONBOARDING_COMPLETE_KEY = '@squaredsplit/onboarding_complete'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  hasCompletedOnboarding: boolean
  initialize: () => () => void
  hydrateSession: (session: Session, user: User) => Promise<void>
  completeOnboarding: () => Promise<void>
  signOut: () => Promise<void>
}

async function loadOnboardingFlag(uid: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(`${ONBOARDING_COMPLETE_KEY}:${uid}`)
    return value === 'true'
  } catch {
    return false
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  hasCompletedOnboarding: false,

  initialize: () => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      const onboarded = s?.user ? await loadOnboardingFlag(s.user.id) : false
      set({
        session: s,
        user: s?.user ?? null,
        hasCompletedOnboarding: onboarded,
        isLoading: false,
      })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, s: Session | null) => {
      console.log('🔑 onAuthStateChange:', event, 'user:', s?.user?.id ?? 'null')
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          if (s?.user) {
            set({ isLoading: true })
            const onboarded = await loadOnboardingFlag(s.user.id)
            console.log('🔑 onboarded flag:', onboarded)
            set({
              session: s,
              user: s.user,
              hasCompletedOnboarding: onboarded,
              isLoading: false,
            })
          } else {
            set({ session: null, user: null, isLoading: false })
          }
          break

        case 'SIGNED_OUT':
          set({ session: null, user: null, hasCompletedOnboarding: false, isLoading: false })
          break

        default:
          if (s !== undefined) {
            set({ session: s, user: s?.user ?? null, isLoading: false })
          }
          break
      }
    })

    return () => subscription.unsubscribe()
  },

  // Directly hydrate store after verifyOtp — bypasses onAuthStateChange listener
  hydrateSession: async (session: Session, user: User) => {
    const onboarded = await loadOnboardingFlag(user.id)
    console.log('💉 hydrateSession: user:', user.id, 'onboarded:', onboarded)
    set({ session, user, hasCompletedOnboarding: onboarded, isLoading: false })
  },

  completeOnboarding: async () => {
    const { user } = get()
    if (!user) return
    try {
      await AsyncStorage.setItem(`${ONBOARDING_COMPLETE_KEY}:${user.id}`, 'true')
      set({ hasCompletedOnboarding: true })
    } catch {}
  },

  signOut: async () => {
    await supabase.auth.signOut()
  },
}))
