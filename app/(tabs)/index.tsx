// app/(tabs)/index.tsx
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import AddExpenseModal from '@/components/AddExpenseModal'
import { formatAmount, type Currency } from '@/lib/currency'
import type { ActivityItem as HomeActivityItem } from '@/lib/supabase/home'
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

function ActivityAvatar({ uri, name }: { uri: string | null; name: string }) {
  const initial = (name.trim().slice(0, 1) || '?').toUpperCase()
  if (uri) {
    return <Image source={{ uri }} style={activityStyles.avatar} contentFit="cover" />
  }
  return (
    <View style={[activityStyles.avatar, activityStyles.avatarPlaceholder]}>
      <Text style={activityStyles.avatarInitial}>{initial}</Text>
    </View>
  )
}

function RecentActivityRow({
  item,
  currency,
  onPress,
}: {
  item: HomeActivityItem
  currency: Currency
  onPress: () => void
}) {
  const owesYou = item.direction === 'owes_you'
  const subtitleColor =
    item.subtitleKind === 'overdue'
      ? '#EF4444'
      : item.subtitleKind === 'upcoming'
        ? '#E38F30'
        : '#9CA3AF'
  const amountColor = owesYou ? '#44BB73' : '#E38F30'
  const statusLabel = owesYou ? 'owes you' : 'you owe'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [activityStyles.row, pressed && activityStyles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.otherPartyName}, ${statusLabel} ${item.amount}`}
    >
      <View style={activityStyles.rowLeft}>
        <ActivityAvatar uri={item.otherPartyAvatar} name={item.otherPartyName} />
        <View style={activityStyles.nameBlock}>
          <Text style={activityStyles.nameText}>{item.otherPartyName}</Text>
          <Text style={[activityStyles.subtitleText, { color: subtitleColor }]}>
            {item.subtitle}
          </Text>
        </View>
      </View>
      <View style={activityStyles.rowRight}>
        <Text style={activityStyles.statusLabel}>{statusLabel}</Text>
        <Text style={[activityStyles.amountText, { color: amountColor }]}>
          {formatAmount(item.amount, currency)}
        </Text>
      </View>
    </Pressable>
  )
}

const activityStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 6,
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

  const isEmpty = !isLoading && activity.length === 0 && balance.netBalance === 0

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#141414" />
        }
      >
        {/* Nav bar */}
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
            <TouchableOpacity style={styles.navIcon}>
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
        </View>

        {/* Balance card */}
        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#141414" />
          </View>
        ) : (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Net balance</Text>
            <Text
              style={[
                styles.balanceAmount,
                balance.netBalance > 0 && styles.positive,
                balance.netBalance < 0 && styles.negative,
              ]}
            >
              {formatAmount(Math.abs(balance.netBalance), currency)}
            </Text>
            {balance.netBalance !== 0 && (
              <Text style={styles.balanceSubtext}>
                {balance.netBalance > 0 ? 'You are owed overall' : 'You owe overall'}
              </Text>
            )}
            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>You are owed</Text>
                <Text style={[styles.balanceStatAmount, styles.positive]}>
                  {formatAmount(balance.youAreOwed, currency)}
                </Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>You owe</Text>
                <Text style={[styles.balanceStatAmount, styles.negative]}>
                  {formatAmount(balance.youOwe, currency)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Activity / empty state */}
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
          <View style={styles.activitySection}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <View style={styles.activityList}>
              {activity.map(item => (
                <RecentActivityRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  onPress={() => router.push(`/dashboard/expense/${item.id}`)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => setAddExpenseVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add Expense Modal — SS-021 */}
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
  loadingCard: {
    height: 160,
    backgroundColor: '#F3F4F5',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  balanceCard: { backgroundColor: '#141414', borderRadius: 20, padding: 24, marginTop: 16 },
  balanceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceAmount: { fontSize: 36, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  balanceSubtext: { fontSize: 13, color: '#9CA3AF', marginBottom: 20 },
  positive: { color: '#34D399' },
  negative: { color: '#F87171' },
  balanceRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  balanceStatAmount: { fontSize: 16, fontWeight: '600' },
  balanceDivider: { width: 1, backgroundColor: '#2A2A2A' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#141414', marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
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
  emptyActionText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  activitySection: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#141414', marginBottom: 12 },
  activityList: { gap: 12 },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: { fontSize: 28, color: '#FFFFFF', lineHeight: 32 },
})
