import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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

import LazyGoogleButton from '@/components/auth/LazyGoogleButton'
import { AppleButton, OrContinueWithDivider } from '@/components/auth/SocialButtons'
import { sendOtp } from '@/lib/auth'
import { canUseGoogle, signInWithApple, useAppleAvailability } from '@/lib/socialAuth'

import AppIcon from '../../assets/app-icon.svg'
import Lightning from '../../assets/auth/lightning.svg'
import Love from '../../assets/auth/love.svg'
import Man from '../../assets/auth/man.svg'
import Woman from '../../assets/auth/woman.svg'

// ─── Constants ────────────────────────────────────────────────────────────────

const MARQUEE_ITEM_WIDTH = 88
const MARQUEE_GAP = 16
const MARQUEE_TOTAL_WIDTH = (MARQUEE_ITEM_WIDTH + MARQUEE_GAP) * 4

/** ISO 3166-1 alpha-2 → regional indicator emoji (e.g. IN → 🇮🇳). */
function countryCodeToEmoji(iso: string): string {
  const code = iso.trim().toUpperCase()
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return '🌍'
  const OFFSET = 0x1f1e6 - 65
  return String.fromCodePoint(code.charCodeAt(0) + OFFSET, code.charCodeAt(1) + OFFSET)
}

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', name: 'India' },
  { code: '+1', country: 'US', name: 'United States' },
  { code: '+1', country: 'CA', name: 'Canada' },
  { code: '+44', country: 'GB', name: 'United Kingdom' },
  { code: '+61', country: 'AU', name: 'Australia' },
  { code: '+65', country: 'SG', name: 'Singapore' },
  { code: '+971', country: 'AE', name: 'UAE' },
  { code: '+60', country: 'MY', name: 'Malaysia' },
  { code: '+49', country: 'DE', name: 'Germany' },
  { code: '+33', country: 'FR', name: 'France' },
  { code: '+81', country: 'JP', name: 'Japan' },
  { code: '+82', country: 'KR', name: 'South Korea' },
  { code: '+55', country: 'BR', name: 'Brazil' },
  { code: '+52', country: 'MX', name: 'Mexico' },
  { code: '+27', country: 'ZA', name: 'South Africa' },
  { code: '+234', country: 'NG', name: 'Nigeria' },
  { code: '+254', country: 'KE', name: 'Kenya' },
  { code: '+92', country: 'PK', name: 'Pakistan' },
  { code: '+880', country: 'BD', name: 'Bangladesh' },
  { code: '+94', country: 'LK', name: 'Sri Lanka' },
  { code: '+977', country: 'NP', name: 'Nepal' },
  { code: '+31', country: 'NL', name: 'Netherlands' },
  { code: '+46', country: 'SE', name: 'Sweden' },
  { code: '+47', country: 'NO', name: 'Norway' },
  { code: '+45', country: 'DK', name: 'Denmark' },
  { code: '+41', country: 'CH', name: 'Switzerland' },
  { code: '+34', country: 'ES', name: 'Spain' },
  { code: '+39', country: 'IT', name: 'Italy' },
  { code: '+7', country: 'RU', name: 'Russia' },
  { code: '+86', country: 'CN', name: 'China' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Figma: pale-yellow glow at the top → soft blue mid → neutral gray base. */
function LoginGradientBackground() {
  return (
    <LinearGradient
      colors={['#F4F5D4', '#EEF1E6', '#E2EAF4', '#F3F4F5']}
      locations={[0, 0.3, 0.52, 0.8]}
      style={StyleSheet.absoluteFill}
    />
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
      withTiming(-MARQUEE_TOTAL_WIDTH, { duration: 11000, easing: Easing.linear }),
      -1,
      false
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

// ─── Country Picker Modal ─────────────────────────────────────────────────────

interface CountryPickerModalProps {
  visible: boolean
  selected: (typeof COUNTRY_CODES)[number]
  onSelect: (item: (typeof COUNTRY_CODES)[number]) => void
  onClose: () => void
}

function CountryPickerModal({ visible, selected, onSelect, onClose }: CountryPickerModalProps) {
  const insets = useSafeAreaInsets()
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      COUNTRY_CODES.filter(
        c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.includes(search) ||
          c.country.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Country</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color="#141414" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search country or code"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item, index) => `${item.country}-${index}`}
          ListEmptyComponent={
            <Text style={styles.countryListEmpty}>No countries match your search.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.countryRow,
                selected.country === item.country && styles.countryRowSelected,
              ]}
              onPress={() => {
                onSelect(item)
                onClose()
              }}
            >
              <Text style={styles.countryName}>{item.name}</Text>
              <Text style={styles.countryCode}>{item.code}</Text>
            </TouchableOpacity>
          )}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      </View>
    </Modal>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0])
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [socialError, setSocialError] = useState('')
  const [isAppleBusy, setIsAppleBusy] = useState(false)

  const appleAvailable = useAppleAvailability()

  // Google sign-in button mounts lazily (see LazyGoogleButton) — no native
  // module import at boot.
  const googleEnabled = canUseGoogle()

  const handleAppleSignIn = async () => {
    setSocialError('')
    setIsAppleBusy(true)
    await signInWithApple(outcome => {
      if (!outcome.success && outcome.error) setSocialError(outcome.error)
    })
    setIsAppleBusy(false)
  }

  const handlePhoneChange = (text: string) => {
    if (errorMessage) setErrorMessage('')
    setPhoneNumber(text.replace(/\D/g, ''))
  }

  const handleGetStarted = async () => {
    if (phoneNumber.length < 7) {
      setErrorMessage('Please enter a valid phone number.')
      return
    }

    const fullPhone = `${selectedCountry.code}${phoneNumber}`
    setIsLoading(true)
    setErrorMessage('')

    try {
      const result = await sendOtp(fullPhone)

      if (!result.success) {
        setErrorMessage(result.error ?? 'Failed to send code.')
        return
      }

      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: fullPhone },
      })
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isValid = phoneNumber.length >= 7

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <LoginGradientBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <SmallLogo />
        </View>

        <Text style={styles.tagline}>Track your expenses and{'\n'}settle up with ease</Text>

        <Marquee />

        {/* Phone input with country picker */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Enter your mobile number to continue</Text>
          <View style={[styles.phoneField, !!errorMessage && styles.phoneFieldError]}>
            <TouchableOpacity
              style={styles.countryPrefix}
              onPress={() => setShowPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`Country code ${selectedCountry.code}, change`}
              hitSlop={8}
            >
              <Text style={styles.countryFlag}>{countryCodeToEmoji(selectedCountry.country)}</Text>
              <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
              <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
            </TouchableOpacity>

            <TextInput
              style={styles.phoneInput}
              placeholder="Mobile number"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad"
              maxLength={15}
              returnKeyType="done"
              accessibilityLabel="Phone number"
            />
          </View>

          {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.button, (!isValid || isLoading) && styles.buttonDisabled]}
          onPress={handleGetStarted}
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Get Started</Text>
          )}
        </TouchableOpacity>

        {(googleEnabled || appleAvailable) && (
          <>
            <OrContinueWithDivider />
            <View style={styles.socialRow}>
              {googleEnabled && (
                <LazyGoogleButton
                  onOutcome={outcome => {
                    if (!outcome.success && outcome.error) setSocialError(outcome.error)
                  }}
                />
              )}
              {appleAvailable && <AppleButton onPress={handleAppleSignIn} busy={isAppleBusy} />}
            </View>
            {!!socialError && <Text style={styles.socialErrorText}>{socialError}</Text>}
          </>
        )}

        <View style={styles.footerLinks}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Privacy policy (coming soon)"
            hitSlop={8}
          >
            <Text style={styles.footerLinkMuted}>Privacy policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Terms of service (coming soon)"
            hitSlop={8}
          >
            <Text style={styles.footerLinkMuted}>Terms of service</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CountryPickerModal
        visible={showPicker}
        selected={selectedCountry}
        onSelect={setSelectedCountry}
        onClose={() => setShowPicker(false)}
      />
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logoWrapper: {
    width: 280,
    height: 200,
  },
  tagline: {
    fontSize: 26,
    fontWeight: '300',
    fontFamily: 'Nunito_300Light',
    color: '#6B6B6B',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 56,
  },
  marqueeContainer: {
    height: 100,
    overflow: 'hidden',
    marginBottom: 48,
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
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#8E8E93',
    lineHeight: 22,
    marginBottom: 10,
  },
  countryFlag: {
    fontSize: 20,
    lineHeight: 24,
  },
  countryCodeText: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Nunito_600SemiBold',
    color: '#141414',
  },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1,
    borderColor: '#D4D6DA',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingLeft: 14,
    paddingRight: 12,
  },
  phoneFieldError: { borderColor: '#EF4444' },
  countryPrefix: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    height: 56,
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Nunito_600SemiBold',
    color: '#141414',
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 6,
  },
  button: {
    height: 48,
    backgroundColor: '#141414',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialErrorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: -16,
    marginBottom: 16,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 40,
  },
  footerLinkMuted: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Nunito_400Regular',
    color: '#6B6B6B',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#141414',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F5',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#141414',
  },
  countryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F5',
  },
  countryRowSelected: {
    backgroundColor: '#F9F0BF',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  countryName: {
    fontSize: 16,
    color: '#141414',
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B6B6B',
  },
  countryListEmpty: {
    paddingVertical: 24,
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
  },
})
