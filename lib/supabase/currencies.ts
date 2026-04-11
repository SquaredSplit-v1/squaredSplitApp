import type { Currency } from '@/lib/currency'
import { supabase } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function fetchSupportedCurrencies(): Promise<{
  data: Currency[] | null
  error: string | undefined
}> {
  const { data, error } = await db
    .from('supported_currencies')
    .select('code, name, symbol, locale, decimal_digits')
    .order('code')

  if (error) return { data: null, error: error.message }
  return { data: data as Currency[], error: undefined }
}

export async function updateCurrencyPreference(
  userId: string,
  currencyCode: string
): Promise<{ error: string | undefined }> {
  const { error } = await db.from('profiles').update({ currency: currencyCode }).eq('id', userId)

  return { error: error?.message }
}

export async function fetchUserCurrency(
  userId: string
): Promise<{ code: string | null; error: string | undefined }> {
  const { data, error } = await db.from('profiles').select('currency').eq('id', userId).single()

  if (error) return { code: null, error: error.message }
  return { code: data?.currency ?? 'INR', error: undefined }
}
