import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { useContactsStore } from '@/store/contactsStore'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Loads contacts on mount and refreshes when app comes to foreground,
 * but only if more than REFRESH_INTERVAL_MS have passed since last sync.
 *
 * Call once at the screen level where contacts are needed (e.g. home/groups).
 */
export function useContacts() {
  const {
    loadContacts,
    isLoading,
    matched,
    unmatched,
    rawWithPhones,
    permissionStatus,
    lastSyncedAt,
  } = useContactsStore()
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    // Initial load
    loadContacts()

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        const now = Date.now()
        const stale = !lastSyncedAt || now - lastSyncedAt > REFRESH_INTERVAL_MS
        if (stale) loadContacts()
      }
      appState.current = nextState
    })

    return () => subscription.remove()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { isLoading, matched, unmatched, rawWithPhones, permissionStatus }
}
