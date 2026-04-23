import { create } from 'zustand'

import { dedupePhones, normalizePhone } from '@/lib/contacts'
import { matchContacts, type MatchedContact } from '@/lib/supabase/contacts'

export type PermissionStatus = 'undetermined' | 'granted' | 'denied' | 'unavailable'

export interface RawContact {
  id: string
  name: string
  phones: string[]
}

export interface ContactsState {
  permissionStatus: PermissionStatus
  matched: MatchedContact[] // On SquaredSplit
  unmatched: RawContact[] // Invite candidates
  isLoading: boolean
  lastSyncedAt: number | null // Unix ms

  loadContacts: () => Promise<void>
  reset: () => void
}

// Lazy-load expo-contacts — not in current dev client binary
const getExpoContacts = () => {
  try {
    return require('expo-contacts') as typeof import('expo-contacts')
  } catch {
    return null
  }
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  permissionStatus: 'undetermined',
  matched: [],
  unmatched: [],
  isLoading: false,
  lastSyncedAt: null,

  loadContacts: async () => {
    const Contacts = getExpoContacts()

    if (!Contacts) {
      set({ permissionStatus: 'unavailable' })
      return
    }

    set({ isLoading: true })

    // ── 1. Request permission ──────────────────────────────────────────────
    const { status } = await Contacts.requestPermissionsAsync()

    if (status !== 'granted') {
      set({
        permissionStatus: status === 'denied' ? 'denied' : 'undetermined',
        isLoading: false,
      })
      return
    }

    set({ permissionStatus: 'granted' })

    // ── 2. Read contacts ───────────────────────────────────────────────────
    const { data: contactsList } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    })

    if (!contactsList || contactsList.length === 0) {
      set({ isLoading: false, matched: [], unmatched: [], lastSyncedAt: Date.now() })
      return
    }

    // ── 3. Normalize + dedupe phone numbers ────────────────────────────────
    const rawContacts: RawContact[] = []
    const allPhones: string[] = []

    for (const contact of contactsList) {
      if (!contact.name) continue

      const phones: string[] = []
      for (const phone of contact.phoneNumbers ?? []) {
        const normalized = normalizePhone(phone.number ?? '')
        if (normalized) {
          phones.push(normalized)
          allPhones.push(normalized)
        }
      }

      if (phones.length > 0) {
        rawContacts.push({
          id: contact.id ?? String(Math.random()),
          name: contact.name,
          phones,
        })
      }
    }

    const uniquePhones = dedupePhones(allPhones)

    // ── 4. Batch match against DB ──────────────────────────────────────────
    const { data: matchedData, error } = await matchContacts(uniquePhones)

    if (error) {
      set({ isLoading: false })
      return
    }

    const matchedPhoneSet = new Set((matchedData ?? []).map(m => m.phone))

    // ── 5. Split into matched + unmatched ──────────────────────────────────
    const unmatched = rawContacts.filter(c => !c.phones.some(p => matchedPhoneSet.has(p)))

    set({
      matched: matchedData ?? [],
      unmatched,
      isLoading: false,
      lastSyncedAt: Date.now(),
    })
  },

  reset: () =>
    set({
      permissionStatus: 'undetermined',
      matched: [],
      unmatched: [],
      isLoading: false,
      lastSyncedAt: null,
    }),
}))
