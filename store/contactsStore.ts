import * as Contacts from 'expo-contacts'
import type { ContactsPermissionResponse } from 'expo-contacts'
import { create } from 'zustand'

import { dedupePhones, normalizePhone, type RawContact } from '@/lib/contacts'
import { matchContacts, type MatchedContact } from '@/lib/supabase/contacts'

export type PermissionStatus = 'undetermined' | 'granted' | 'denied' | 'unavailable'

export interface ContactsState {
  permissionStatus: PermissionStatus
  matched: MatchedContact[] // On SquaredSplit
  unmatched: RawContact[] // Invite candidates
  /** Device contacts that had at least one phone (used to show local names in add-friend UI). */
  rawWithPhones: RawContact[]
  isLoading: boolean
  lastSyncedAt: number | null // Unix ms

  loadContacts: () => Promise<void>
  reset: () => void
}

function contactsPermissionGranted(response: ContactsPermissionResponse): boolean {
  if (response.status === 'granted') return true
  // iOS 18+: user may pick a subset; treat as usable for read APIs Expo exposes.
  if (response.accessPrivileges === 'limited' || response.accessPrivileges === 'all') return true
  return false
}

export const useContactsStore = create<ContactsState>(set => ({
  permissionStatus: 'undetermined',
  matched: [],
  unmatched: [],
  rawWithPhones: [],
  isLoading: false,
  lastSyncedAt: null,

  loadContacts: async () => {
    set({ isLoading: true })

    try {
      // Current access (no prompt).
      let perm = await Contacts.getPermissionsAsync()

      // First time / not yet granted → system dialog (requires NSContactsUsageDescription on iOS).
      if (!contactsPermissionGranted(perm)) {
        perm = await Contacts.requestPermissionsAsync()
      }

      if (!contactsPermissionGranted(perm)) {
        set({
          permissionStatus: perm.status === 'denied' ? 'denied' : 'undetermined',
          isLoading: false,
          rawWithPhones: [],
        })
        return
      }

      set({ permissionStatus: 'granted' })

      const { data: contactsList } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      })

      if (!contactsList || contactsList.length === 0) {
        set({
          isLoading: false,
          matched: [],
          unmatched: [],
          rawWithPhones: [],
          lastSyncedAt: Date.now(),
        })
        return
      }

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

      const { data: matchedData, error } = await matchContacts(uniquePhones)

      if (error) {
        set({ isLoading: false })
        return
      }

      const matchedPhoneSet = new Set((matchedData ?? []).map(m => m.phone))
      const unmatched = rawContacts.filter(c => !c.phones.some(p => matchedPhoneSet.has(p)))

      set({
        matched: matchedData ?? [],
        unmatched,
        rawWithPhones: rawContacts,
        isLoading: false,
        lastSyncedAt: Date.now(),
      })
    } catch (e) {
      console.error('[contactsStore] loadContacts', e)
      set({
        permissionStatus: 'unavailable',
        isLoading: false,
        rawWithPhones: [],
      })
    }
  },

  reset: () =>
    set({
      permissionStatus: 'undetermined',
      matched: [],
      unmatched: [],
      rawWithPhones: [],
      isLoading: false,
      lastSyncedAt: null,
    }),
}))
