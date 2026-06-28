import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
import {
  AddExpenseButton,
  BalanceSummary,
  FilterModal,
  GroupsList,
  SquaredUpSection,
  type FilterOption,
  type Group,
} from '@/components/dashboard'
import { useAuthStore } from '@/store/authStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { useGroupsStore } from '@/store/groupsStore'
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

function SearchIcon() {
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

function AddGroupIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6"
        stroke="#141414"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function showComingSoon() {
  Alert.alert('Coming soon', 'Group creation is on the way in the next update. Stay tuned!', [
    { text: 'Got it', style: 'default' },
  ])
}

/**
 * Map Supabase Group → dashboard GroupsList shape.
 */
function mapToDashboardGroup(g: import('@/lib/supabase/groups').Group): Group {
  return {
    id: g.id,
    name: g.name,
    avatar: g.avatarUrl ? { uri: g.avatarUrl } : null,
    emoji: g.emoji ?? undefined,
    balanceType: g.balanceType,
    amount: g.amount,
    members: g.members.map(m => ({
      name: m.name,
      amount: m.amount,
      balanceType: m.balanceType,
    })),
  }
}

export default function GroupsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const { current: currency } = useCurrencyStore()
  const { groups, isLoading, isRefreshing, fetchGroups, refreshGroups } = useGroupsStore()
  const { balance, fetch: fetchHome, refresh: refreshHome } = useHomeStore()

  const [filterVisible, setFilterVisible] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('none')
  const [addExpenseVisible, setAddExpenseVisible] = useState(false)

  useFocusEffect(
    useCallback(() => {
      if (!user) return
      void fetchGroups(user.id)
      void fetchHome(user.id)
    }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  )

  const handleRefresh = useCallback(() => {
    if (!user) return
    void refreshGroups(user.id)
    void refreshHome(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterSelect = (filter: FilterOption) => {
    setSelectedFilter(filter)
    setFilterVisible(false)
  }

  const handleExpenseCreated = useCallback(() => {
    if (!user) return
    void refreshGroups(user.id)
    void refreshHome(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGroupPress = useCallback(
    (group: Group) => {
      router.push({ pathname: '/dashboard/group/[id]', params: { id: group.id } })
    },
    [router]
  )

  const filteredGroups = groups
    .filter(g => {
      if (selectedFilter === 'owes_you') return g.balanceType === 'owes_you'
      if (selectedFilter === 'you_owe') return g.balanceType === 'you_owe'
      if (selectedFilter === 'outstanding') return g.amount > 0
      return true
    })
    .map(mapToDashboardGroup)

  const isEmpty = !isLoading && groups.length === 0

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
            <TouchableOpacity
              style={styles.navIcon}
              onPress={() =>
                router.push({ pathname: '/dashboard/friend', params: { search: '1' } })
              }
              accessibilityLabel="Search groups"
            >
              <SearchIcon />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navIcon}
              onPress={showComingSoon}
              accessibilityLabel="Add group"
            >
              <AddGroupIcon />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance summary */}
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

        {/* Groups list */}
        {isEmpty ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a group to start splitting expenses with multiple friends.
            </Text>
            <TouchableOpacity style={styles.emptyAction} onPress={showComingSoon}>
              <Text style={styles.emptyActionText}>Create a group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <GroupsList groups={filteredGroups} onGroupPress={handleGroupPress} />
            <SquaredUpSection onPress={() => console.log('Show squared-up')} />
          </>
        )}
      </ScrollView>

      <AddExpenseButton onPress={() => setAddExpenseVisible(true)} />

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
  loadingBlock: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: '#141414',
    marginBottom: 8,
  },
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
  emptyActionText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
})
