import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useMemo } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import type { Activity } from '@/components/dashboard'
import { ActivityList, AddExpenseButton } from '@/components/dashboard'
import { useAuthStore } from '@/store/authStore'
import { useHomeStore } from '@/store/homeStore'

function BellIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
        stroke="#141414"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

const fallbackAvatar = require('../../assets/dashboard/ak.png')

export default function ActivityScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const userId = useAuthStore(s => s.user?.id)
  const { activity, isLoading, refresh } = useHomeStore()

  useFocusEffect(
    useCallback(() => {
      if (userId) void refresh(userId)
    }, [refresh, userId])
  )

  const activities: Activity[] = useMemo(
    () =>
      activity.map(item => ({
        id: item.id,
        avatar: item.otherPartyAvatar ? { uri: item.otherPartyAvatar } : fallbackAvatar,
        segments: [
          { text: item.otherPartyName, bold: true },
          { text: item.direction === 'owes_you' ? ' owes you ' : ' you owe ' },
          { text: `${item.amount.toFixed(2)}`, bold: true },
          { text: ' for ' },
          { text: item.description, bold: true },
        ],
        timeAgo: item.subtitle,
      })),
    [activity]
  )

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
        {/* Nav bar — no add-friend button on activity */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navIcon} onPress={() => router.push('/notifications')}>
            <BellIcon />
          </TouchableOpacity>
          <View style={styles.navRight}>
            <TouchableOpacity style={styles.navIcon}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  stroke="#141414"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#141414" />
          </View>
        ) : activities.length === 0 ? (
          <View style={styles.loader}>
            <Text style={styles.emptyText}>No recent activity yet.</Text>
          </View>
        ) : (
          <ActivityList activities={activities} />
        )}
      </View>

      <AddExpenseButton onPress={() => router.push('/')} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 20 },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  navIcon: { padding: 8 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: {
    color: '#6B6B6B',
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
  },
})
