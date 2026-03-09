import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import LottieView from 'lottie-react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'

SplashScreen.preventAutoHideAsync()

const splashAnimation = require('../../assets/animations/splash.json')

export default function AuthLoadingScreen() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const lottieRef = useRef<LottieView>(null)
  const [lottieReady, setLottieReady] = useState(false)
  const [animationDone, setAnimationDone] = useState(false)

  const onLottieLayout = useCallback(async () => {
    if (!lottieReady) {
      setLottieReady(true)
      await SplashScreen.hideAsync()
    }
  }, [lottieReady])

  // Navigate when both animation and auth are ready
  useEffect(() => {
    if (!animationDone || isLoading) return
    if (user) {
      router.replace('/dashboard/dashboard')
    } else {
      router.replace('/(auth)/login')
    }
  }, [animationDone, isLoading, user, router])

  // Animation values
  const blobTranslateY = useSharedValue(0)
  const slashProgress = useSharedValue(0)
  const contentOpacity = useSharedValue(1)

  const onAnimationFinish = useCallback((isCancelled: boolean) => {
    if (!isCancelled) setAnimationDone(true)
  }, [])

  return (
    <View style={styles.container}>
      <LottieView
        ref={lottieRef}
        source={splashAnimation}
        autoPlay
        loop={false}
        onLayout={onLottieLayout}
        onAnimationFinish={onAnimationFinish}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
})
