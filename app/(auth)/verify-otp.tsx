import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { resendOtp as resendOtpApi, verifyOtp as verifyOtpApi } from '@/lib/auth'

const OTP_LENGTH = 6

/** Spaces after country code for easier reading (best-effort). */
function formatPhoneForDisplay(raw: string): string {
  const t = raw.trim()
  if (!t.startsWith('+')) return t
  const m = t.match(/^(\+\d{1,4})(\d[\d\s]*)$/)
  if (!m) return t
  const body = m[2].replace(/\D/g, '')
  if (body.length <= 4) return `${m[1]} ${body}`
  const spaced = body.replace(/(\d{3})(?=\d)/g, '$1 ')
  return `${m[1]} ${spaced}`.trim()
}

export default function VerifyOTPScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { phone: phoneParam } = useLocalSearchParams<{ phone?: string | string[] }>()
  const phone = Array.isArray(phoneParam) ? phoneParam[0] : phoneParam

  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''))
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [otpError, setOtpError] = useState<string | null>(null)
  const inputRefs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(t => t - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handleVerifyWithOtp = async (otpCode: string) => {
    if (otpCode.length !== OTP_LENGTH) return
    if (!phone) {
      Alert.alert('Error', 'Phone number not found. Please go back and try again.')
      return
    }

    setIsLoading(true)
    setOtpError(null)

    try {
      const result = await verifyOtpApi(phone, otpCode)

      if (!result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        setOtpError(result.error ?? 'Incorrect code. Please try again or resend a new one.')
        setOtp(new Array(OTP_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
        return
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      // ✅ setSession triggers onAuthStateChange → fetchProfile → store update
      // Stack.Protected in _layout.tsx navigates automatically — no router.replace needed
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = () => handleVerifyWithOtp(otp.join(''))

  const handleOtpChange = (value: string, index: number) => {
    if (otpError) setOtpError(null)
    if (value && !/^\d+$/.test(value)) return

    const newOtp = [...otp]

    if (value.length > 1) {
      const digits = value.slice(0, OTP_LENGTH).split('')
      digits.forEach((digit, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = digit
      })
      setOtp(newOtp)
      inputRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]?.focus()
      if (newOtp.filter(d => d !== '').length === OTP_LENGTH) {
        handleVerifyWithOtp(newOtp.join(''))
      }
      return
    }

    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
    if (value && index === OTP_LENGTH - 1) handleVerifyWithOtp(newOtp.join(''))
  }

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0 || !phone) return
    setIsLoading(true)
    setOtpError(null)
    setOtp(new Array(OTP_LENGTH).fill(''))
    try {
      const result = await resendOtpApi(phone)
      if (!result.success) {
        Alert.alert('Error', result.error ?? 'Failed to resend code.')
        return
      }
      setResendTimer(60)
      inputRefs.current[0]?.focus()
      Alert.alert('Code sent', 'A new verification code has been sent.')
    } catch {
      Alert.alert('Error', 'Failed to resend code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isOtpComplete = otp.join('').length === OTP_LENGTH

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Please enter the verification code sent to your mobile number
        </Text>
        <Text style={styles.phoneDisplay} accessibilityLiveRegion="polite">
          {phone ? formatPhoneForDisplay(phone) : '—'}
        </Text>
        {!phone ? (
          <Text style={styles.missingPhoneHint}>
            Missing phone number. Go back and enter your number again.
          </Text>
        ) : null}

        <Text style={styles.otpLabel}>Verification code</Text>
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => {
                inputRefs.current[index] = ref
              }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
                otpError ? styles.otpInputError : null,
              ]}
              value={digit}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!isLoading}
              textContentType={index === 0 ? 'oneTimeCode' : undefined}
              autoComplete={index === 0 ? 'sms-otp' : 'off'}
              importantForAutofill={
                Platform.OS === 'android' ? (index === 0 ? 'yes' : 'no') : undefined
              }
              accessibilityLabel={`OTP digit ${index + 1} of ${OTP_LENGTH}`}
            />
          ))}
        </View>

        {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}

        <TouchableOpacity
          style={styles.sendAgainButton}
          onPress={handleResendOtp}
          disabled={resendTimer > 0 || isLoading || !phone}
          accessibilityRole="button"
          accessibilityState={{ disabled: resendTimer > 0 || isLoading || !phone }}
        >
          <Ionicons
            name="refresh-circle"
            size={22}
            color={resendTimer > 0 || !phone ? '#9CA3AF' : '#3273CD'}
          />
          <Text style={[styles.sendAgainText, resendTimer > 0 && styles.sendAgainTextDisabled]}>
            {resendTimer > 0 ? `Send again in ${resendTimer}s` : 'Send again'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.verifyButton,
            (!isOtpComplete || isLoading || !phone) && styles.verifyButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={!isOtpComplete || isLoading || !phone}
          accessibilityRole="button"
          accessibilityLabel="Verify code"
          accessibilityState={{ disabled: !isOtpComplete || isLoading || !phone }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F5' },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  backButton: { marginBottom: 32 },
  backButtonText: { fontSize: 16, color: '#6B6B6B' },
  title: { fontSize: 22, fontWeight: '500', color: '#141414', lineHeight: 30, marginBottom: 8 },
  phoneDisplay: { fontSize: 16, fontWeight: '600', color: '#141414', marginBottom: 24 },
  missingPhoneHint: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 24,
    lineHeight: 20,
  },
  otpLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 10 },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 6,
  },
  otpInput: {
    flex: 1,
    minWidth: 40,
    maxWidth: 56,
    height: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#141414',
  },
  otpInputFilled: {
    borderColor: '#F9F0BF',
    backgroundColor: '#F9F0BF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 0,
  },
  otpInputError: { borderColor: '#EF4444' },
  errorText: { fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: 12 },
  sendAgainButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  sendAgainText: { fontSize: 14, fontWeight: '500', color: '#3273CD' },
  sendAgainTextDisabled: { color: '#9CA3AF' },
  verifyButton: {
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonDisabled: { backgroundColor: '#9CA3AF' },
  verifyButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
})
