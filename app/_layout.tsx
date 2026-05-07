import { ExpenseProvider } from '@/lib/store/expense-store'

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

import { AuthProvider, useAuth } from '@/contexts/AuthContext'
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
  const { user, isLoading, hasCompletedOnboarding } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    // Don't redirect while we're still fetching the session
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!user && !inAuthGroup) {
      // Not signed in → go to auth loading / login
      router.replace('/(auth)/authloading')
    } else if (user && inAuthGroup) {
      // Signed in but still on an auth screen → go to dashboard
      // (skip if we're on onboarding and haven't finished it yet)
      const onOnboarding = (segments as string[])[1] === 'onboarding'
      if (!onOnboarding || hasCompletedOnboarding) {
        router.replace('/dashboard/dashboard')
      }
    }
  }, [user, isLoading, segments, hasCompletedOnboarding, router])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
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
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <AuthProvider>
      <ExpenseProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </ExpenseProvider>
    </AuthProvider>
  )
}
