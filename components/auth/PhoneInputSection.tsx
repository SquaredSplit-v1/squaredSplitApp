import React from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

interface PhoneInputSectionProps {
  phoneNumber: string
  onChangePhone: (text: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export function PhoneInputSection({
  phoneNumber,
  onChangePhone,
  onSubmit,
  isLoading,
}: PhoneInputSectionProps) {
  return (
    <>
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Enter your mobile number to continue</Text>
        <TextInput
          style={styles.input}
          placeholder="+1 XXX XXX XXXX"
          placeholderTextColor="#9CA3AF"
          value={phoneNumber}
          onChangeText={onChangePhone}
          keyboardType="number-pad"
          maxLength={20}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Get Started</Text>
        )}
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
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
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#141414',
    backgroundColor: '#FFFFFF',
  },
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
})
