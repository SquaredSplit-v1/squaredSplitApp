import { create } from 'zustand'

import type { Currency } from '@/lib/currency'
import {
  fetchSupportedCurrencies,
  fetchUserCurrency,
  updateCurrencyPreference,
} from '@/lib/supabase/currencies'

const INR_FALLBACK: Currency = {
  code: 'INR',
  name: 'Indian Rupee',
  symbol: '₹',
  locale: 'en-IN',
  decimal_digits: 2,
}

interface CurrencyState {
  current: Currency
  supported: Currency[]
  isLoading: boolean

  // Load supported list + user preference — call once after login
  initialize: (userId: string) => Promise<void>

  // Update user preference in DB + store
  setCurrency: (userId: string, code: string) => Promise<{ error: string | undefined }>

  // Reset to INR on logout
  reset: () => void
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  current: INR_FALLBACK,
  supported: [INR_FALLBACK],
  isLoading: false,

  initialize: async (userId: string) => {
    set({ isLoading: true })

    const [currenciesResult, userCurrencyResult] = await Promise.all([
      fetchSupportedCurrencies(),
      fetchUserCurrency(userId),
    ])

    const supported = currenciesResult.data ?? [INR_FALLBACK]
    const userCode = userCurrencyResult.code ?? 'INR'
    const current = supported.find(c => c.code === userCode) ?? INR_FALLBACK

    set({ supported, current, isLoading: false })
  },

  setCurrency: async (userId: string, code: string) => {
    const { supported } = get()
    const next = supported.find(c => c.code === code)

    if (!next) return { error: `Currency ${code} not supported` }

    // Optimistic update — feels instant
    set({ current: next })

    const { error } = await updateCurrencyPreference(userId, code)

    if (error) {
      // Roll back on failure
      set({ current: get().current })
      return { error }
    }

    return { error: undefined }
  },

  reset: () => set({ current: INR_FALLBACK, supported: [INR_FALLBACK] }),
}))
