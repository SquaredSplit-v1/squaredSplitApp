import { SplashScreen, Stack } from 'expo-router'
import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAppUpdates } from '@/hooks/useAppUpdates'
import { useGlobalErrorHandler } from '@/hooks/useGlobalErrorHandler'
import { useAuthStore } from '@/store/authStore'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  useAppUpdates()
  useGlobalErrorHandler()

  const { session, hasOnboarded, isLoading, initialize } = useAuthStore()
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    unsubRef.current = initialize()
    return () => unsubRef.current?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync()
    }
  }, [isLoading])

  if (isLoading) return <View style={{ flex: 1, backgroundColor: '#F3F4F5' }} />

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!session && hasOnboarded}>
              <Stack.Screen name="(tabs)" />
            </Stack.Protected>

            <Stack.Protected guard={!!session && !hasOnboarded}>
              <Stack.Screen name="(auth)/setup-profile" />
            </Stack.Protected>

            <Stack.Protected guard={!session}>
              <Stack.Screen name="(auth)/login" />
              <Stack.Screen name="(auth)/verify-otp" />
            </Stack.Protected>
          </Stack>

          <Toast />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  )
}
