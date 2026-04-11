import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuthStore } from '@/store/authStore'
import { useCurrencyStore } from '@/store/currencyStore'

export default function AccountScreen() {
  const insets = useSafeAreaInsets()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const { current, setCurrency } = useCurrencyStore()

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Manage your profile and settings</Text>
      </View>

      {/* ── Test 3: currency toggle — remove after SS-015 verified ── */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setCurrency(user!.id, current.code === 'INR' ? 'USD' : 'INR')}
      >
        <Text style={styles.toggleText}>Toggle currency: {current.code}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={logout}>
        <Text style={styles.signOutText}>Sign Out</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    color: '#141414',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#6B6B6B',
  },
  toggleButton: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#141414',
  },
  signOutButton: {
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
