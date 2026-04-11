import * as Updates from 'expo-updates'
import { useEffect } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

export function useAppUpdates() {
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates()

  // Apply downloaded update — triggers on next foreground after fetch completes
  useEffect(() => {
    if (isUpdatePending) {
      Updates.reloadAsync()
    }
  }, [isUpdatePending])

  // Check for update every time app comes to foreground
  useEffect(() => {
    if (__DEV__) return

    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        try {
          await Updates.checkForUpdateAsync()
          if (isUpdateAvailable) {
            await Updates.fetchUpdateAsync()
          }
        } catch {
          // Silent fail — never block the user for an update check
        }
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription.remove()
  }, [isUpdateAvailable])
}
