import { useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'

import { useAuthStore } from '@/store/authStore'

import AppIcon from '../../assets/app-icon.svg'

SplashScreen.preventAutoHideAsync()

export default function AuthLoadingScreen() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const isLoading = useAuthStore(s => s.isLoading)
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.88)).current

  // Fade + scale in the logo, then hide native splash
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      SplashScreen.hideAsync().catch(() => {})
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate once auth resolves
  useEffect(() => {
    if (isLoading) return
    const timeout = setTimeout(() => {
      router.replace(user ? '/(tabs)' : '/(auth)/login')
    }, 300) // brief pause so the animation is visible
    return () => clearTimeout(timeout)
  }, [isLoading, user, router])

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logo, { opacity, transform: [{ scale }] }]}>
        <AppIcon width={160} height={120} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
