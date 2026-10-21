import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import Wordmark from '../assets/app-icon.svg'

/**
 * Brand splash shown on every app open, between the native splash and the
 * first screen. Mirrors the two Figma frames: the "Squared Sp/it" wordmark
 * floats up while the pale-yellow glow spreads down the screen, then the
 * whole layer fades into the app.
 */

// Figma: glow confined to the top third → spreading past the wordmark.
const PHASE_ONE = ['#F4F5D4', '#F8F9E6', '#FFFFFF', '#FFFFFF'] as const
const PHASE_TWO = ['#F4F5D4', '#F6F7DC', '#FBFBEE', '#FFFFFF'] as const

const RISE_MS = 900
const HOLD_MS = 450
const FADE_MS = 350

export default function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const logoY = useSharedValue(28)
  const glow = useSharedValue(0)
  const layerOpacity = useSharedValue(1)

  useEffect(() => {
    const curve = Easing.bezier(0.22, 1, 0.36, 1)
    logoY.value = withTiming(-36, { duration: RISE_MS, easing: curve })
    glow.value = withTiming(1, { duration: RISE_MS, easing: Easing.out(Easing.quad) })
    layerOpacity.value = withSequence(
      withDelay(
        RISE_MS + HOLD_MS,
        withTiming(0, { duration: FADE_MS }, finished => {
          if (finished) runOnJS(onFinish)()
        })
      )
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoY.value }],
  }))
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }))
  const layerStyle = useAnimatedStyle(() => ({ opacity: layerOpacity.value }))

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer, layerStyle]} pointerEvents="none">
      <LinearGradient
        colors={[...PHASE_ONE]}
        locations={[0, 0.2, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
        <LinearGradient
          colors={[...PHASE_TWO]}
          locations={[0, 0.3, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Wordmark width={246} height={176} />
        </Animated.View>
      </View>

      <Text style={styles.footer}>©SquaredSplit2026</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  layer: { zIndex: 1000, elevation: 1000, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: {
    position: 'absolute',
    bottom: 64,
    alignSelf: 'center',
    fontSize: 15,
    color: '#6B6B6B',
    fontFamily: 'Nunito_400Regular',
  },
})
