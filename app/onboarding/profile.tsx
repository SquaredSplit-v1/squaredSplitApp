import { useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
    >
      <Text style={styles.title}>Set up your profile</Text>
      <Text style={styles.subtitle}>Tell us a bit about yourself to get started.</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace('/dashboard/dashboard')}
      >
        <Text style={styles.buttonText}>Continue to Dashboard</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F5',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#141414',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B6B6B',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
