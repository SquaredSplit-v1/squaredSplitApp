import { useAuthStore } from '@/stores/authStore'
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  useFonts,
} from '@expo-google-fonts/nunito'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'
import '../global.css'

import { useColorScheme } from '@/hooks/use-color-scheme'

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync()

export const unstable_settings = {
  initialRouteName: '(auth)',
}

/**
 * Inner navigator that reacts to auth state changes and redirects
 * the user to the correct route group.
 */
function RootNavigator() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    // Don't redirect while we're still fetching the session
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboardingGroup = segments[0] === 'onboarding'

    if (!user && !inAuthGroup) {
      // Not signed in (includes landing on /onboarding without a session) → auth
      router.replace('/(auth)/authloading')
    } else if (user && inAuthGroup) {
      // Signed in but still in the auth group → leave
      router.replace(hasCompletedOnboarding ? '/dashboard/dashboard' : '/onboarding')
    } else if (user && inOnboardingGroup && hasCompletedOnboarding) {
      // Already completed onboarding — skip straight to dashboard
      router.replace('/dashboard/dashboard')
    }
  }, [user, isLoading, segments, hasCompletedOnboarding, router])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen
        name="modal"
        options={{ presentation: 'modal', title: 'Modal', headerShown: true }}
      />
    </Stack>
  )
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const initialize = useAuthStore((s) => s.initialize)
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  })

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [])

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootNavigator />
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
