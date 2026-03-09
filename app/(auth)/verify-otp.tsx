import { resendOtp as resendOtpApi, verifyOtp as verifyOtpApi } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const ONBOARDING_COMPLETE_KEY = '@squaredsplit/onboarding_complete'

const OTP_LENGTH = 6

export default function VerifyOTPScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { phone } = useLocalSearchParams<{ phone: string }>()

  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''))
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [otpError, setOtpError] = useState<string | null>(null)
  const inputRefs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    // Countdown timer for resend
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handleOtpChange = (value: string, index: number) => {
    // Clear error when user starts editing
    if (otpError) setOtpError(null)
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return

    const newOtp = [...otp]

    // Handle paste
    if (value.length > 1) {
      const digits = value.slice(0, OTP_LENGTH).split('')
      digits.forEach((digit, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = digit
        }
      })
      setOtp(newOtp)
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    newOtp[index] = value
    setOtp(newOtp)

    // Move to next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const verifyOtp = async () => {
    const otpCode = otp.join('')
    if (otpCode.length !== OTP_LENGTH) {
      setOtpError('Please enter the complete verification code')
      return
    }

    if (!phone) {
      Alert.alert('Error', 'Phone number not found. Please go back and try again.')
      return
    }

    setIsLoading(true)
    setOtpError(null)

    try {
      const result = await verifyOtpApi(phone, otpCode)

      if (!result.success) {
        // Wrong / expired OTP — surface inline so the user can resend
        setOtpError(result.error ?? 'Incorrect code. Please try again or resend a new one.')
        // Clear the entered digits and refocus first cell
        setOtp(new Array(OTP_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
        return
      }

      // Session is hydrated by supabase.auth.verifyOtp automatically.
      // Check per-user onboarding flag from AsyncStorage.
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? ''
      const onboardingValue = await AsyncStorage.getItem(`${ONBOARDING_COMPLETE_KEY}:${userId}`)
      const hasCompletedOnboarding = onboardingValue === 'true'

      if (hasCompletedOnboarding) {
        router.replace('/(tabs)')
      } else {
        router.replace('/onboarding')
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
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

  const formatPhoneDisplay = (phoneNumber: string) => {
    // Format phone for display
    return phoneNumber || ''
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>
          Please enter the verification code sent to your mobile number
        </Text>
        <Text style={styles.phoneDisplay}>{formatPhoneDisplay(phone || '')}</Text>

        {/* OTP Input */}
        <Text style={styles.otpLabel}>Verification code</Text>
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref
              }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
                otpError ? styles.otpInputError : null,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Inline error */}
        {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}

        {/* Send again */}
        <TouchableOpacity
          style={styles.sendAgainButton}
          onPress={handleResendOtp}
          disabled={resendTimer > 0 || isLoading}
        >
          <Ionicons
            name="refresh-circle"
            size={22}
            color={resendTimer > 0 ? '#9CA3AF' : '#3B82F6'}
          />
          <Text style={[styles.sendAgainText, resendTimer > 0 && styles.sendAgainTextDisabled]}>
            {resendTimer > 0 ? `Send again in ${resendTimer}s` : 'Send again'}
          </Text>
        </TouchableOpacity>

        {/* Save changes Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            otp.join('').length !== OTP_LENGTH && styles.verifyButtonDisabled,
          ]}
          onPress={verifyOtp}
          disabled={isLoading || otp.join('').length !== OTP_LENGTH}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 32,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6B6B6B',
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    color: '#141414',
    lineHeight: 30,
    marginBottom: 8,
  },
  phoneDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F97316',
    marginBottom: 32,
  },
  otpLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  otpInput: {
    flex: 1,
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
  otpInputFocused: {
    borderColor: '#141414',
  },
  otpInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  sendAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  sendAgainText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  sendAgainTextDisabled: {
    color: '#9CA3AF',
  },
  verifyButton: {
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
