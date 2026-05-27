import { useEffect, useRef } from 'react'

import {
  requestNotificationPermission,
  syncPushTokenWithBackend,
} from '@/lib/push/setupPushNotifications'

export function usePushNotifications(userId: string | undefined) {
  const syncedForUserRef = useRef<string | null>(null)
  const promptedRef = useRef(false)

  useEffect(() => {
    if (promptedRef.current) return
    promptedRef.current = true
    void requestNotificationPermission().catch(() => {})
  }, [])

  useEffect(() => {
    if (!userId) {
      syncedForUserRef.current = null
      return
    }
    if (syncedForUserRef.current === userId) return
    syncedForUserRef.current = userId
    void syncPushTokenWithBackend()
  }, [userId])
}
