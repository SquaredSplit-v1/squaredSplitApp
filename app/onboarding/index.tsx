import { useAuthStore } from '@/stores/authStore'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  Dimensions,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const floatingImages = [
  require('../../assets/onboarding/1.png'),
  require('../../assets/onboarding/2.png'),
  require('../../assets/onboarding/3.png'),
  require('../../assets/onboarding/4.png'),
  require('../../assets/onboarding/5.png'),
  require('../../assets/onboarding/6.png'),
  require('../../assets/onboarding/7.png'),
  require('../../assets/onboarding/8.png'),
  require('../../assets/onboarding/9.png'),
]

const IMAGE_POSITIONS = [
  { top: 0.12, left: 0.75, size: 72, rotation: '8deg' },
  { top: 0.14, left: 0.05, size: 64, rotation: '-6deg' },
  { top: 0.24, left: 0.35, size: 90, rotation: '3deg' },
  { top: 0.34, left: 0.05, size: 80, rotation: '-4deg' },
  { top: 0.36, left: 0.7, size: 95, rotation: '6deg' },
  { top: 0.46, left: 0.22, size: 65, rotation: '-8deg' },
  { top: 0.45, left: 0.46, size: 60, rotation: '5deg' },
  { top: 0.57, left: 0.62, size: 85, rotation: '-3deg' },
  { top: 0.56, left: 0.05, size: 70, rotation: '7deg' },
]

const slides = [
  {
    title: 'Keep track of balances\nbetween friends',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor',
    bg: 'gradient-images' as const,
  },
  {
    title: 'Split expenses\nwith groups',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor',
    bg: 'photo' as const,
  },
  {
    title: 'Settle debts\nseamlessly',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor',
    bg: 'gradient-plain' as const,
  },
]

const SLIDE_COUNT = slides.length
const SPRING_CONFIG = { damping: 22, stiffness: 160 }

function FloatingImages() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {floatingImages.map((img, index) => {
        const pos = IMAGE_POSITIONS[index]
        return (
          <View
            key={index}
            style={[
              styles.floatingImage,
              {
                top: pos.top * SCREEN_HEIGHT,
                left: pos.left * SCREEN_WIDTH,
                width: pos.size,
                height: pos.size,
                transform: [{ rotate: pos.rotation }],
              },
            ]}
          >
            <Image source={img} style={styles.floatingImg} resizeMode="cover" />
          </View>
        )
      })}
    </View>
  )
}

interface SlideContentProps {
  slide: (typeof slides)[number]
  isActive: boolean
  isLast: boolean
  insets: { top: number; bottom: number }
  onAction: () => void
  activeIndex: number
}

function SlideContent({ slide, isLast, insets, onAction, activeIndex }: SlideContentProps) {
  const isPhoto = slide.bg === 'photo'

  const inner = (
    <>
      {/* Floating images — only on slide 1 */}
      {slide.bg === 'gradient-images' && <FloatingImages />}

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.welcomeLight, isPhoto && styles.textWhite]}>Welcome to</Text>
        <Text style={[styles.welcomeBold, isPhoto && styles.textWhite]}>SquaredSplit</Text>
      </View>

      {/* Bottom section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={[styles.pageTitle, isPhoto && styles.textWhite]}>{slide.title}</Text>
        <Text style={[styles.pageDescription, isPhoto && styles.descriptionWhite]}>
          {slide.description}
        </Text>

        <TouchableOpacity
          style={[styles.actionButton, isPhoto && styles.actionButtonPhoto]}
          onPress={onAction}
          activeOpacity={0.85}
        >
          <Text style={[styles.actionButtonText, isPhoto && styles.actionButtonTextDark]}>
            {isLast ? 'Get Started' : 'Skip tour'}
          </Text>
        </TouchableOpacity>

        {/* Pagination dots */}
        <View style={styles.paginationContainer}>
          {slides.map((_, dotIndex) => (
            <View
              key={dotIndex}
              style={[
                styles.dot,
                activeIndex === dotIndex
                  ? isPhoto
                    ? styles.dotActiveWhite
                    : styles.dotActive
                  : isPhoto
                    ? styles.dotInactiveWhite
                    : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      </View>
    </>
  )

  if (slide.bg === 'gradient-images') {
    return (
      <LinearGradient
        colors={['#F5F3E4', '#D4D2C3', '#8AA3C7']}
        locations={[0.0337, 0.3798, 1]}
        style={styles.slide}
      >
        {inner}
      </LinearGradient>
    )
  }

  if (slide.bg === 'photo') {
    return (
      <ImageBackground
        source={require('../../assets/onboarding/2nd-onboarding-screen.png')}
        style={styles.slide}
        resizeMode="cover"
      >
        {inner}
      </ImageBackground>
    )
  }

  // gradient-plain
  return (
    <LinearGradient colors={['#D4E7FF', '#FFFFFF']} locations={[0.0337, 1]} style={styles.slide}>
      {inner}
    </LinearGradient>
  )
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding)

  const [activeIndex, setActiveIndex] = useState(0)
  const translateX = useSharedValue(0)

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      const base = -activeIndex * SCREEN_WIDTH
      const raw = base + event.translationX
      const maxLeft = -(SLIDE_COUNT - 1) * SCREEN_WIDTH
      // add resistance at boundaries
      if (raw > 0) {
        translateX.value = raw * 0.2
      } else if (raw < maxLeft) {
        translateX.value = maxLeft + (raw - maxLeft) * 0.2
      } else {
        translateX.value = raw
      }
    })
    .onEnd((event) => {
      const threshold = SCREEN_WIDTH * 0.25
      let next = activeIndex
      if (event.translationX < -threshold || event.velocityX < -600) {
        next = Math.min(activeIndex + 1, SLIDE_COUNT - 1)
      } else if (event.translationX > threshold || event.velocityX > 600) {
        next = Math.max(activeIndex - 1, 0)
      }
      translateX.value = withSpring(-next * SCREEN_WIDTH, SPRING_CONFIG)
      runOnJS(setActiveIndex)(next)
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const handleAction = async () => {
    await completeOnboarding()
    router.replace('/onboarding/profile')
  }

  const isLast = activeIndex === SLIDE_COUNT - 1

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.slidesRow, animatedStyle]}>
          {slides.map((slide, index) => (
            <SlideContent
              key={index}
              slide={slide}
              isActive={index === activeIndex}
              isLast={isLast}
              insets={insets}
              onAction={handleAction}
              activeIndex={activeIndex}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  slidesRow: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * SLIDE_COUNT,
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  floatingImage: {
    position: 'absolute',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingImg: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  headerContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  welcomeLight: {
    fontSize: 28,
    fontWeight: '300',
    color: '#000',
    textAlign: 'center',
  },
  welcomeBold: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginTop: -2,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  bottomSection: {
    marginTop: 'auto',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  pageTitle: {
    color: '#000',
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '400',
    lineHeight: 32,
    letterSpacing: -0.52,
    marginBottom: 12,
  },
  pageDescription: {
    color: 'rgba(39, 39, 39, 0.80)',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: -0.32,
    paddingHorizontal: 16,
  },
  descriptionWhite: {
    color: 'rgba(255, 255, 255, 0.80)',
  },
  actionButton: {
    width: Math.min(353, SCREEN_WIDTH - 40),
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  actionButtonPhoto: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  actionButtonTextDark: {
    color: '#141414',
  },
  paginationContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#141414',
  },
  dotInactive: {
    backgroundColor: 'rgba(20, 20, 20, 0.25)',
  },
  dotActiveWhite: {
    backgroundColor: '#FFFFFF',
  },
  dotInactiveWhite: {
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
  },
})
