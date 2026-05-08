import type { MatchedContact } from '@/lib/supabase/contacts'
import { useContactsStore } from '@/store/contactsStore'

/**
 * Simple wrapper to return matched contacts (SquaredSplit users) from the contacts store.
 * This avoids adding backend work right now — friends are derived from your phone contacts
 * that matched registered users.
 */
export async function getFriends(): Promise<MatchedContact[]> {
  const store = useContactsStore.getState()
  if (store.lastSyncedAt === null) {
    // load if not yet loaded
    await store.loadContacts()
  }
  return store.matched
}

/** Hook version */
export function useGetFriends(): { friends: MatchedContact[]; isLoading: boolean } {
  const { matched, isLoading } = useContactsStore()
  return { friends: matched as MatchedContact[], isLoading }
}
