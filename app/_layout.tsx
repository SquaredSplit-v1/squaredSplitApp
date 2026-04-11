import { SplashScreen, Stack } from 'expo-router'
import { useEffect, useRef } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { useAuthStore } from '@/store/authStore'

// Must be called before any navigator renders
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const { session, hasOnboarded, isLoading, initialize } = useAuthStore()
  const unsubRef = useRef<(() => void) | null>(null)

  // Boot auth listener once
  useEffect(() => {
    unsubRef.current = initialize()
    return () => unsubRef.current?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Hide splash only after auth state is resolved
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync()
    }
  }, [isLoading])

  // Keep splash visible — no screen rendered until state is known
  if (isLoading) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* ── Fully authenticated + onboarded ── */}
          <Stack.Protected guard={!!session && hasOnboarded}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>

          {/* ── Authenticated but profile not set up ── */}
          <Stack.Protected guard={!!session && !hasOnboarded}>
            <Stack.Screen name="(auth)/setup-profile" />
          </Stack.Protected>

          {/* ── Not authenticated ── */}
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/verify-otp" />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
