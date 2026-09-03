import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import AddExpenseModal from '@/components/AddExpenseModal'
import type { Activity } from '@/components/dashboard'
import { ActivityList, AddExpenseButton } from '@/components/dashboard'
import { useAuthStore } from '@/store/authStore'
import { useHomeStore } from '@/store/homeStore'

const DEFAULT_AVATAR_BASE = 'https://api.dicebear.com/7.x/initials/png?seed='

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

function SearchGlyph() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
        stroke="#141414"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const userId = useAuthStore(s => s.user?.id)
  const { activity, isLoading, isRefreshing, refresh } = useHomeStore()

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [addExpenseVisible, setAddExpenseVisible] = useState(false)

  useFocusEffect(
    useCallback(() => {
      if (userId) void refresh(userId)
    }, [refresh, userId])
  )

  const handleExpenseCreated = useCallback(() => {
    if (userId) void refresh(userId)
  }, [userId, refresh])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
  }, [])

  const allActivities: Activity[] = useMemo(
    () =>
      activity.map(item => ({
        id: item.id,
        // Use the user's avatar if available, otherwise fall back to a
        // DiceBear initials avatar (consistent with account.tsx)
        avatar: item.otherPartyAvatar
          ? { uri: item.otherPartyAvatar }
          : { uri: `${DEFAULT_AVATAR_BASE}${encodeURIComponent(item.otherPartyName || 'U')}` },
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

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return allActivities
    return allActivities.filter(a => a.segments.some(s => s.text.toLowerCase().includes(q)))
  }, [allActivities, searchQuery])

  const handleRefresh = useCallback(() => {
    Keyboard.dismiss()
    if (userId) void refresh(userId)
  }, [userId, refresh])

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
        {/* Nav bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.navIcon}
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Notifications"
          >
            <BellIcon />
          </TouchableOpacity>
          <View style={styles.navRight}>
            {!searchOpen ? (
              <TouchableOpacity
                style={styles.navIcon}
                onPress={() => setSearchOpen(true)}
                accessibilityLabel="Search activity"
              >
                <SearchGlyph />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={closeSearch} hitSlop={12} style={styles.cancelSearch}>
                <Text style={styles.cancelSearchText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Inline search input */}
        {searchOpen && (
          <View style={styles.searchBlock}>
            <View style={styles.searchRow}>
              <SearchGlyph />
              <TextInput
                style={styles.searchInput}
                placeholder="Search activity"
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>
            <View style={styles.searchUnderline} />
          </View>
        )}

        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#141414" />
          </View>
        ) : filteredActivities.length === 0 ? (
          <View style={styles.loader}>
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No activity matches your search.' : 'No recent activity yet.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#141414"
              />
            }
          >
            <ActivityList activities={filteredActivities} />
          </ScrollView>
        )}
      </View>

      <AddExpenseButton onPress={() => setAddExpenseVisible(true)} />

      <AddExpenseModal
        visible={addExpenseVisible}
        onClose={() => setAddExpenseVisible(false)}
        onSuccess={handleExpenseCreated}
      />
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
  cancelSearch: { paddingVertical: 8, paddingHorizontal: 4 },
  cancelSearchText: {
    color: '#6B6B6B',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    lineHeight: 16,
  },
  searchBlock: { marginTop: 4, marginBottom: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
    color: '#141414',
    paddingVertical: 0,
  },
  searchUnderline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#141414',
    width: '100%',
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  emptyText: {
    color: '#6B6B6B',
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
  },
})
