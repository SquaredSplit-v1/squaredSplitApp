import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { formatAmount } from '@/lib/currency'
import { blockUser } from '@/lib/supabase/account'
import { getFriendMuted, setFriendMuted } from '@/lib/supabase/friends'
import { useAuthStore } from '@/store/authStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { useFriendsStore } from '@/store/friendsStore'

export default function FriendSettingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const userId = useAuthStore(s => s.user?.id)
  const { current: currency } = useCurrencyStore()
  const { sharedExpenses, fetchSharedExpenses } = useFriendsStore()

  const params = useLocalSearchParams<{ friendId?: string; friendName?: string }>()
  const friendName = Array.isArray(params.friendName) ? params.friendName[0] : params.friendName
  const friendId = Array.isArray(params.friendId) ? params.friendId[0] : params.friendId

  const [muted, setMuted] = useState(false)
  const [settingsUnavailable, setSettingsUnavailable] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  useEffect(() => {
    if (!userId || !friendId) return
    let cancelled = false
    setIsLoadingSettings(true)
    void getFriendMuted(userId, friendId)
      .then(result => {
        if (cancelled) return
        setMuted(result.muted)
        setSettingsUnavailable(Boolean(result.unavailable))
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSettings(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, friendId])

  useEffect(() => {
    if (!userId || !friendId) return
    void fetchSharedExpenses(userId, friendId)
  }, [userId, friendId, fetchSharedExpenses])

  const stats = useMemo(() => {
    const total = sharedExpenses.reduce((sum, e) => sum + e.amount, 0)
    const myShare = sharedExpenses.reduce((sum, e) => sum + e.shareAmount, 0)
    return {
      count: sharedExpenses.length,
      total,
      myShare,
    }
  }, [sharedExpenses])

  const handleToggleMute = useCallback(
    async (value: boolean) => {
      if (!userId || !friendId) return
      setMuted(value)
      const result = await setFriendMuted(userId, friendId, value)
      if (!result.success) {
        setMuted(!value)
        Alert.alert('Could not update setting', result.error ?? 'Please try again.')
      }
    },
    [userId, friendId]
  )

  const handleBlock = useCallback(() => {
    if (!friendId || !friendName) return
    Alert.alert(
      'Block user',
      `${friendName} will not be able to add you to splits or groups, and you cannot add them either.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const result = userId
              ? await blockUser(userId, friendId)
              : { success: false, error: 'Not signed in' }
            if (!result.success) {
              Alert.alert('Could not block', result.error)
              return
            }
            router.back()
          },
        },
      ]
    )
  }, [friendId, friendName, userId, router])

  const handleExport = useCallback(async () => {
    if (!friendName) return
    const lines = sharedExpenses.map(
      e =>
        `${new Date(e.createdAt).toLocaleDateString()} · ${e.description} · ${formatAmount(e.amount, currency)} (your share: ${formatAmount(e.shareAmount, currency)})`
    )
    const summary = [
      `SquaredSplit — shared expenses with ${friendName}`,
      `Total: ${stats.count} expenses · ${formatAmount(stats.total, currency)} · your share ${formatAmount(stats.myShare, currency)}`,
      '',
      ...lines,
    ].join('\n')

    try {
      await Share.share({ message: summary })
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  }, [friendName, sharedExpenses, stats, currency])

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>{'< Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Friend settings</Text>
      {friendName ? <Text style={styles.subtitle}>{friendName}</Text> : null}

      {/* Mute notifications */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Mute notifications</Text>
            <Text style={styles.cardBody}>
              Stop receiving alerts about new expenses with this friend.
            </Text>
          </View>
          {isLoadingSettings ? (
            <ActivityIndicator color="#3273CD" />
          ) : (
            <Switch
              value={muted}
              onValueChange={handleToggleMute}
              disabled={settingsUnavailable}
              trackColor={{ false: '#D1D5DB', true: '#141414' }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Mute notifications for this friend"
            />
          )}
        </View>
        {settingsUnavailable && !isLoadingSettings ? (
          <Text style={styles.unavailable}>Not available on this environment yet.</Text>
        ) : null}
      </View>

      {/* Shared history */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shared history</Text>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.count}</Text>
            <Text style={styles.statLabel}>expenses</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatAmount(stats.total, currency)}</Text>
            <Text style={styles.statLabel}>total value</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatAmount(stats.myShare, currency)}</Text>
            <Text style={styles.statLabel}>your share</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.blockBtn} onPress={handleBlock} activeOpacity={0.85}>
          <Text style={styles.blockBtnText}>Block user</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.85}>
          <Text style={styles.exportBtnText}>Export history</Text>
        </TouchableOpacity>
      </View>

      {friendId ? (
        <Text style={styles.meta} selectable>
          ID: {friendId}
        </Text>
      ) : null}
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
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTextWrap: { flex: 1, minWidth: 0 },
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
  unavailable: {
    marginTop: 8,
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  stat: { flex: 1 },
  statValue: {
    color: '#141414',
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Nunito_500Medium',
    marginTop: 2,
  },
  exportBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  blockBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  blockBtnText: { color: '#EF4444', fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  meta: {
    marginTop: 8,
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
  },
})
