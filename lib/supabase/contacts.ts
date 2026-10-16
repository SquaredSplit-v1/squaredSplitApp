import { supabase } from '@/lib/supabase/client'

export interface MatchedContact {
  id: string
  display_name: string
  phone: string
  avatar_url: string | null
}

/**
 * Batch match phone numbers against registered SquaredSplit users.
 * Calls the match_contacts RPC — returns only users who exist in the DB.
 * Max 500 numbers per call to avoid request size limits.
 */
export async function matchContacts(phoneNumbers: string[]): Promise<{
  data: MatchedContact[] | null
  error: string | undefined
}> {
  if (phoneNumbers.length === 0) return { data: [], error: undefined }

  // Chunk into batches of 500
  const BATCH_SIZE = 500
  const results: MatchedContact[] = []

  for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
    const batch = phoneNumbers.slice(i, i + BATCH_SIZE)

    const { data, error } = await supabase.rpc('match_contacts', { phone_numbers: batch })

    if (error) return { data: null, error: error.message }
    if (data) results.push(...(data as MatchedContact[]))
  }

  return { data: results, error: undefined }
}

/**
 * Direct dashboard search by phone number. Finds a registered user even if
 * they are not in the device address book. Returns null when the number
 * belongs to no one (the caller should offer an app invite instead).
 */
export async function searchProfileByPhone(phone: string): Promise<{
  data: MatchedContact | null
  error?: string
}> {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return { data: null }

  const { data, error } = await supabase.rpc('search_profile_by_phone', { p_phone: digits })

  if (error) {
    // SS902 = not a valid phone number; other errors are surfaced.
    if (!error.message.includes('SS902')) {
      console.warn('[searchProfileByPhone]', error.message)
      return { data: null, error: error.message }
    }
    return { data: null }
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    id: string
    full_name?: string
    avatar_url?: string | null
    phone?: string | null
  } | null

  if (!row?.id) return { data: null }
  return {
    data: {
      id: row.id,
      display_name: row.full_name ?? 'SquaredSplit User',
      phone: row.phone ?? phone,
      avatar_url: row.avatar_url ?? null,
    },
  }
}
