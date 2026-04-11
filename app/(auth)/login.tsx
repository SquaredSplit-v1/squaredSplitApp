import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CountryPickerModal } from '@/components/ui/CountryPickerModal'
import { sendOtp } from '@/lib/auth'
import {
  CountryCode,
  DEFAULT_COUNTRY,
  formatPhoneDisplay,
  isValidPhoneNumber,
  toE164,
} from '@/lib/validation'

import AppIcon from '../../assets/app-icon.svg'
import BlurEllipse from '../../assets/auth/Blur-Ellipse.svg'
import Lightning from '../../assets/auth/lightning.svg'
import Love from '../../assets/auth/love.svg'
import Man from '../../assets/auth/man.svg'
import Woman from '../../assets/auth/woman.svg'

// ─── Constants ────────────────────────────────────────────────────────────────

const MARQUEE_ITEM_WIDTH = 88
const MARQUEE_GAP = 2
const MARQUEE_TOTAL_WIDTH = (MARQUEE_ITEM_WIDTH + MARQUEE_GAP) * 4

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoginGradientBlob() {
  return (
    <View style={styles.gradientBlobContainer}>
      <BlurEllipse width="100%" height="100%" />
    </View>
  )
}

function SmallLogo() {
  return (
    <View style={styles.logoWrapper}>
      <AppIcon width="100%" height="100%" />
    </View>
  )
}

function Marquee() {
  const translateX = useSharedValue(0)

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(-MARQUEE_TOTAL_WIDTH, {
        duration: 8000,
        easing: Easing.linear,
      }),
      -1,
      false
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const items = [Lightning, Woman, Love, Man, Lightning, Woman, Love, Man]

  return (
    <View style={styles.marqueeContainer}>
      <Animated.View style={[styles.marqueeContent, animatedStyle]}>
        {items.map((SvgComponent, index) => (
          <View key={index} style={styles.marqueeItem}>
            <SvgComponent width={88} height={88} />
          </View>
        ))}
      </Animated.View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY)
  const [digits, setDigits] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isValid = isValidPhoneNumber(digits, country)
  const displayValue = formatPhoneDisplay(digits, country)

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, country.maxDigits)
    setDigits(cleaned)
    if (errorMessage) setErrorMessage(null)
  }

  const handleCountryChange = (c: CountryCode) => {
    setCountry(c)
    setDigits('')
    setErrorMessage(null)
  }

  const handleGetStarted = async () => {
    if (!isValid) {
      setErrorMessage(`Enter a valid ${country.name} number`)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const result = await sendOtp(toE164(digits, country))

      if (!result.success) {
        setErrorMessage(result.error ?? 'Failed to send code.')
        return
      }

      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: toE164(digits, country) },
      })
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LoginGradientBlob />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <SmallLogo />
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>Track your expenses and{'\n'}settle up with ease</Text>

        {/* Marquee */}
        <Marquee />

        {/* Input section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Enter your mobile number to continue</Text>

          <View style={styles.inputRow}>
            {/* Country picker */}
            <CountryPickerModal selected={country} onSelect={handleCountryChange} />

            {/* Phone number input */}
            <TextInput
              style={[styles.input, errorMessage ? styles.inputError : null]}
              placeholder={'X'.repeat(country.minDigits)}
              placeholderTextColor="#9CA3AF"
              value={displayValue}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad"
              maxLength={country.maxDigits + 2} // +2 for spaces in display
              returnKeyType="done"
              onSubmitEditing={handleGetStarted}
            />
          </View>

          {/* Inline error toast */}
          {errorMessage ? (
            <View style={styles.errorToast}>
              <Text style={styles.errorText}>⚠ {errorMessage}</Text>
            </View>
          ) : null}
        </View>

        {/* Get Started button — disabled until number is valid */}
        <TouchableOpacity
          style={[styles.button, (!isValid || isLoading) && styles.buttonDisabled]}
          onPress={handleGetStarted}
          disabled={!isValid || isLoading}
          accessibilityLabel="Get Started"
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid || isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Get Started</Text>
          )}
        </TouchableOpacity>

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity accessibilityRole="link">
            <Text style={styles.footerLink}>Privacy policy</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="link">
            <Text style={styles.footerLink}>Terms of service</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F5',
  },
  gradientBlobContainer: {
    position: 'absolute',
    top: -80,
    left: '50%',
    marginLeft: -320,
    width: 680,
    height: 680,
    borderRadius: 500,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  // Logo
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logoWrapper: {
    width: 140,
    height: 100,
  },

  // Tagline
  tagline: {
    fontSize: 24,
    fontWeight: '300',
    color: '#6B6B6B',
    lineHeight: 32,
    letterSpacing: -0.48,
    paddingBottom: 90,
    marginBottom: 48,
  },

  // Marquee
  marqueeContainer: {
    height: 100,
    overflow: 'hidden',
    marginBottom: 56,
    marginHorizontal: -24,
  },
  marqueeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  marqueeItem: {
    width: MARQUEE_ITEM_WIDTH,
    height: MARQUEE_ITEM_WIDTH,
    marginRight: MARQUEE_GAP,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Input
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
    lineHeight: 21,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#141414',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },

  // Error toast
  errorToast: {
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },

  // Button
  button: {
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Footer
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 50,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B6B6B',
    lineHeight: 16.8,
    letterSpacing: -0.28,
  },
})
