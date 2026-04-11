// expo-updates requires a dev client rebuild to function.
// Full implementation is preserved below — re-enable after build:dev:ios.
// Tracked as: SS-015

export function useAppUpdates(): void {
  // no-op until dev client includes expo-updates native module
}

/* ── restore after rebuild ────────────────────────────────────────────────────

import * as Updates from 'expo-updates'
import { useEffect } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

export function useAppUpdates(): void {
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates()

  useEffect(() => {
    if (isUpdatePending) Updates.reloadAsync()
  }, [isUpdatePending])

  useEffect(() => {
    if (__DEV__) return

    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        try {
          await Updates.checkForUpdateAsync()
          if (isUpdateAvailable) await Updates.fetchUpdateAsync()
        } catch {
          // Silent fail — never block the user for an update check
        }
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription.remove()
  }, [isUpdateAvailable])
}

──────────────────────────────────────────────────────────────────────────── */
