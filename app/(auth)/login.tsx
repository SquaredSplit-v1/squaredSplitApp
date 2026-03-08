import { LoginGradientBlob, Marquee, PhoneInputSection, SmallLogo } from '@/components/auth'
import { sendOtp } from '@/lib/auth'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '')

    let formatted = ''
    if (cleaned.length > 0) {
      formatted = '+' + cleaned.substring(0, Math.min(3, cleaned.length))
    }
    if (cleaned.length > 3) {
      formatted += ' ' + cleaned.substring(3, 6)
    }
    if (cleaned.length > 6) {
      formatted += ' ' + cleaned.substring(6, 9)
    }
    if (cleaned.length > 9) {
      formatted += ' ' + cleaned.substring(9, 15)
    }

    return formatted
  }

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(formatPhoneNumber(text))
  }

  const handleGetStarted = async () => {
    const formattedPhone = phoneNumber.replace(/\s/g, '')

    if (formattedPhone.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number')
      return
    }

    setIsLoading(true)

    try {
      const result = await sendOtp(formattedPhone)

      if (!result.success) {
        const msg = result.retryAfter
          ? `Too many attempts. Try again in ${result.retryAfter}s.`
          : (result.error ?? 'Failed to send code.')
        Alert.alert('Error', msg)
        return
      }

      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: formattedPhone },
      })
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Blurred gradient blob */}
      <LoginGradientBlob />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 100, paddingBottom: insets.bottom + 20 },
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

        {/* Phone input + Get Started button */}
        <PhoneInputSection
          phoneNumber={phoneNumber}
          onChangePhone={handlePhoneChange}
          onSubmit={handleGetStarted}
          isLoading={isLoading}
        />

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Privacy policy</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Terms of service</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

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
  tagline: {
    fontSize: 24,
    fontWeight: '300',
    color: '#6B6B6B',
    lineHeight: 32,
    letterSpacing: -0.48,
    paddingBottom: 90,
    marginBottom: 48,
  },
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
