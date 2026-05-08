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
    if (!isLoading) SplashScreen.hideAsync()
  }, [isLoading])

  // Hold render until auth state is resolved — prevents
  // Stack.Protected from flashing the wrong screen on boot
  if (isLoading) return <View style={{ flex: 1, backgroundColor: '#F3F4F5' }} />

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Authenticated + onboarded → home */}
            <Stack.Protected guard={!!session && hasOnboarded}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="dashboard" />
            </Stack.Protected>

            {/* Authenticated + not onboarded → setup profile */}
            <Stack.Protected guard={!!session && !hasOnboarded}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>

            {/* Not authenticated → auth screens */}
            <Stack.Protected guard={!session}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
          <Toast />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  )
}
