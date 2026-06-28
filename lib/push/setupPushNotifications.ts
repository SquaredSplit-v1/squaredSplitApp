import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { registerPushToken, unregisterPushToken } from '@/lib/api/registerPushToken'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('expenses', {
    name: 'Expenses',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  })
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  if (existingStatus === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync()
  return status as 'granted' | 'denied' | 'undetermined'
}

export async function syncPushTokenWithBackend(): Promise<void> {
  try {
    const granted = await requestNotificationPermission()
    if (!granted) return

    await ensureAndroidChannel()

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined

    const response = await Notifications.getExpoPushTokenAsync({ projectId })
    const token = response.data?.trim()
    if (!token) return

    await registerPushToken(token)
  } catch (e) {
    console.warn('[push] syncPushTokenWithBackend', e)
  }
}

/**
 * Retrieve the current Expo push token (if permission granted) and deregister
 * it from the backend. Called during logout before supabase.auth.signOut().
 */
export async function deregisterPushTokenOnLogout(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') return

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined

    const response = await Notifications.getExpoPushTokenAsync({ projectId })
    const token = response.data?.trim()
    if (!token) return

    await unregisterPushToken(token)
  } catch (e) {
    console.warn('[push] deregisterPushTokenOnLogout', e)
  }
}
