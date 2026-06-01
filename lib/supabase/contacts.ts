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
