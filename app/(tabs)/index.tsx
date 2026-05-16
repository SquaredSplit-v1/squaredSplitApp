// app/(tabs)/index.tsx
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
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
import AddFriendModal from '@/components/AddFriendModal'
import type { FilterOption } from '@/components/dashboard'
import {
  AddExpenseButton,
  BalanceSummary,
  FilterModal,
  SquaredUpSection,
} from '@/components/dashboard'
import { formatAmount, type Currency } from '@/lib/currency'
import type { ActivityDirection, ActivityItem, ActivitySubtitleKind } from '@/lib/supabase/home'
import { useAuthStore } from '@/store/authStore'
import { useCurrencyStore } from '@/store/currencyStore'
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

function SearchGlyph() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16.5 16.5L21 21"
        stroke="#141414"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function formatShortActivityDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso))
}

interface AggregatedFriend {
  expenseId: string
  otherPartyName: string
  otherPartyAvatar: string | null
  direction: ActivityDirection
  amount: number
  subtitleKind: ActivitySubtitleKind
  subtitle: string
  latestCreatedAt: string
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function aggregateByFriend(activity: ActivityItem[]): AggregatedFriend[] {
  const groups = new Map<string, ActivityItem[]>()
  for (const item of activity) {
    const key = `${item.otherPartyName}\0${item.direction}`
    const list = groups.get(key) ?? []
    list.push(item)
    groups.set(key, list)
  }

  const out: AggregatedFriend[] = []
  for (const items of groups.values()) {
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const amount = roundMoney(items.reduce((s, i) => s + i.amount, 0))
    const overdue = items.find(i => i.subtitleKind === 'overdue')
    const upcoming = items.find(i => i.subtitleKind === 'upcoming')
    const primary = items[0]

    let subtitleKind: ActivitySubtitleKind
    let subtitle: string
    if (overdue) {
      subtitleKind = 'overdue'
      subtitle = overdue.subtitle
    } else if (upcoming) {
      subtitleKind = 'upcoming'
      subtitle = 'Upcoming due'
    } else {
      subtitleKind = 'date'
      subtitle = formatShortActivityDate(primary.createdAt)
    }

    out.push({
      expenseId: primary.id,
      otherPartyName: primary.otherPartyName,
      otherPartyAvatar: primary.otherPartyAvatar,
      direction: primary.direction,
      amount,
      subtitleKind,
      subtitle,
      latestCreatedAt: primary.createdAt,
    })
  }

  out.sort((a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime())
  return out
}

function subtitleDisplay(f: AggregatedFriend): { text: string; color: string } {
  if (f.subtitleKind === 'overdue') {
    if (f.direction === 'you_owe') {
      return { text: 'Alert!', color: '#F06767' }
    }
    return { text: f.subtitle, color: '#F06767' }
  }
  if (f.subtitleKind === 'upcoming') {
    return { text: 'Upcoming due', color: '#F09E42' }
  }
  return { text: f.subtitle, color: '#9CA3AF' }
}

function FriendBalanceRow({
  friend,
  currency,
  onPress,
}: {
  friend: AggregatedFriend
  currency: Currency
  onPress: () => void
}) {
  const owesYou = friend.direction === 'owes_you'
  const { text: subText, color: subColor } = subtitleDisplay(friend)
  const amountColor = owesYou ? '#44BB73' : '#DE8334'
  const statusLabel = owesYou ? 'owes you' : 'you owe'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [friendStyles.row, pressed && friendStyles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${friend.otherPartyName}, ${statusLabel} ${friend.amount}`}
    >
      <View style={friendStyles.rowLeft}>
        {friend.otherPartyAvatar ? (
          <Image
            source={{ uri: friend.otherPartyAvatar }}
            style={friendStyles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={[friendStyles.avatar, friendStyles.avatarPlaceholder]}>
            <Text style={friendStyles.avatarInitial}>
              {(friend.otherPartyName.trim().slice(0, 1) || '?').toUpperCase()}
            </Text>
          </View>
        )}
        <View style={friendStyles.nameBlock}>
          <Text style={friendStyles.nameText} numberOfLines={2}>
            {friend.otherPartyName}
          </Text>
          <Text style={[friendStyles.subtitleText, { color: subColor }]}>{subText}</Text>
        </View>
      </View>
      <View style={friendStyles.rowRight}>
        <Text style={friendStyles.statusLabel}>{statusLabel}</Text>
        <Text style={[friendStyles.amountText, { color: amountColor }]}>
          {formatAmount(friend.amount, currency)}
        </Text>
      </View>
    </Pressable>
  )
}

const friendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowPressed: { opacity: 0.7 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#141414',
  },
  nameBlock: { flexDirection: 'column', justifyContent: 'center', gap: 4, flex: 1, minWidth: 0 },
  nameText: {
    color: '#141414',
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
  subtitleText: {
    fontSize: 12,
    fontFamily: 'Nunito_500Medium',
    lineHeight: 18,
  },
  rowRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 4,
    marginLeft: 8,
  },
  statusLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
  amountText: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 24,
  },
})

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const { current: currency } = useCurrencyStore()
  const { balance, activity, isLoading, isRefreshing, fetch, refresh, reset } = useHomeStore()

  const [addExpenseVisible, setAddExpenseVisible] = useState(false)
  const [addFriendVisible, setAddFriendVisible] = useState(false)
  const [filterVisible, setFilterVisible] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('none')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [squaredUpExpanded, setSquaredUpExpanded] = useState(false)

  useEffect(() => {
    if (user) fetch(user.id)
    return () => reset()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = useCallback(() => {
    if (user) refresh(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExpenseCreated = useCallback(() => {
    if (user) refresh(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const aggregated = useMemo(() => aggregateByFriend(activity), [activity])

  const filteredFriends = useMemo(() => {
    let list = aggregated
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(f => f.otherPartyName.toLowerCase().includes(q))
    }
    if (selectedFilter === 'owes_you') {
      list = list.filter(f => f.direction === 'owes_you')
    } else if (selectedFilter === 'you_owe') {
      list = list.filter(f => f.direction === 'you_owe')
    } else if (selectedFilter === 'outstanding') {
      list = list.filter(f => f.amount > 0)
    }
    return list
  }, [aggregated, searchQuery, selectedFilter])

  const isEmpty = !isLoading && activity.length === 0 && balance.netBalance === 0

  const handleFilterSelect = useCallback((filter: FilterOption) => {
    setSelectedFilter(filter)
    setFilterVisible(false)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
  }, [])

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#141414" />
        }
      >
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navIcon} onPress={() => router.push('/notifications')}>
            <BellIcon />
          </TouchableOpacity>
          {!searchOpen ? (
            <View style={styles.navRight}>
              <TouchableOpacity
                style={styles.navIcon}
                onPress={() => setSearchOpen(true)}
                accessibilityLabel="Search friends"
              >
                <SearchGlyph />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navIcon}
                onPress={() => setAddFriendVisible(true)}
                accessibilityLabel="Add friend"
              >
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6"
                    stroke="#141414"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={closeSearch} hitSlop={12} style={styles.cancelSearch}>
              <Text style={styles.cancelSearchText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {searchOpen && (
          <View style={styles.searchBlock}>
            <View style={styles.searchRow}>
              <SearchGlyph />
              <TextInput
                style={styles.searchInput}
                placeholder="Enter name"
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
          <View style={styles.loadingBlock}>
            <ActivityIndicator color="#141414" />
          </View>
        ) : (
          <BalanceSummary
            balanceToSquare={Math.abs(balance.netBalance)}
            youAreOwed={balance.youAreOwed}
            youOwe={balance.youOwe}
            onFilterPress={() => setFilterVisible(true)}
            currency={currency}
          />
        )}

        {isEmpty ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤝</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first expense to start splitting with friends
            </Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => setAddExpenseVisible(true)}>
              <Text style={styles.emptyActionText}>Add an expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.friendsSection}>
            {!isLoading && filteredFriends.length === 0 ? (
              <Text style={styles.noMatches}>
                {searchQuery.trim()
                  ? 'No friends match your search'
                  : 'No friends match this filter'}
              </Text>
            ) : (
              <View style={styles.friendsList}>
                {filteredFriends.map(f => (
                  <FriendBalanceRow
                    key={`${f.otherPartyName}-${f.direction}`}
                    friend={f}
                    currency={currency}
                    onPress={() => router.push(`/dashboard/expense/${f.expenseId}`)}
                  />
                ))}
              </View>
            )}

            <SquaredUpSection
              expanded={squaredUpExpanded}
              onPress={() => setSquaredUpExpanded(e => !e)}
            />
            {squaredUpExpanded && (
              <Text style={styles.squaredUpHint}>
                Squared-up balances will appear here once that data is connected.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {!isEmpty && <AddExpenseButton onPress={() => setAddExpenseVisible(true)} />}

      <FilterModal
        visible={filterVisible}
        selectedFilter={selectedFilter}
        onSelect={handleFilterSelect}
        onClose={() => setFilterVisible(false)}
      />

      <AddExpenseModal
        visible={addExpenseVisible}
        onClose={() => setAddExpenseVisible(false)}
        onSuccess={handleExpenseCreated}
      />

      <AddFriendModal
        visible={addFriendVisible}
        onClose={() => setAddFriendVisible(false)}
        onSelect={_id => {
          setAddFriendVisible(false)
          if (user) refresh(user.id)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
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
  loadingBlock: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontFamily: 'Nunito_700Bold', color: '#141414', marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyAction: {
    height: 48,
    paddingHorizontal: 32,
    backgroundColor: '#141414',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyActionText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: '#FFFFFF' },
  friendsSection: { marginTop: 8, gap: 8 },
  friendsList: { gap: 8 },
  noMatches: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#9CA3AF',
    paddingVertical: 16,
  },
  squaredUpHint: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 8,
  },
})
