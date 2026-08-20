import { useLocalSearchParams, useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function FriendSettingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ friendId?: string; friendName?: string }>()
  const friendName = Array.isArray(params.friendName) ? params.friendName[0] : params.friendName
  const friendId = Array.isArray(params.friendId) ? params.friendId[0] : params.friendId

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>{'< Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Friend settings</Text>
      {friendName ? <Text style={styles.subtitle}>{friendName}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coming soon</Text>
        <Text style={styles.cardBody}>
          Mute notifications, remove friend, and export history will live here.
        </Text>
        {friendId ? (
          <Text style={styles.meta} selectable>
            ID: {friendId}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  back: { marginBottom: 20 },
  backText: {
    color: '#3273CD',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 24,
  },
  title: {
    color: '#141414',
    fontSize: 28,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 32,
  },
  subtitle: {
    color: '#6B6B6B',
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    marginTop: 4,
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#FAFAFC',
  },
  cardTitle: {
    color: '#141414',
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 8,
  },
  cardBody: {
    color: '#6B6B6B',
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
  },
  meta: {
    marginTop: 12,
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
  },
})
