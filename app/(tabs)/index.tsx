import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import { createExpense } from '@/lib/api/createExpense'
import { formatAmount } from '@/lib/currency'
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const { current: currency } = useCurrencyStore()
  const { balance, activity, isLoading, isRefreshing, fetch, refresh, reset } = useHomeStore()
  const [addExpenseVisible, setAddExpenseVisible] = useState(false)
  const [creatingExpense, setCreatingExpense] = useState(false)

  useEffect(() => {
    if (user) fetch(user.id)
    return () => reset()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = useCallback(() => {
    if (user) refresh(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTestExpense = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in first')
      return
    }

    setCreatingExpense(true)
    try {
      console.log('[SS-020] handleTestExpense user', user.id)
      const expense = await createExpense({
        amount: 100,
        description: 'Test pizza from SS-020 ✅',
        participants: [user.id], // Use current user as sole participant for test
      })
      console.log('[SS-020] created expense', expense)
      Alert.alert('Success', `Created expense: ${expense.id.slice(0, 8)}...`)
      setAddExpenseVisible(false)
    } catch (error: unknown) {
      console.error('[SS-020] createExpense error', error)
      const message = error instanceof Error ? error.message : 'Failed to create expense'
      Alert.alert('Error', message)
    } finally {
      setCreatingExpense(false)
    }
  }

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
        {/* ── Nav bar ── */}
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

        {/* ── Balance card ── */}
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

        {/* ── Activity or empty state ── */}
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
            {activity.map(item => (
              <View key={item.id} style={styles.activityItem}>
                <Text style={styles.activityDescription}>{item.description}</Text>
                <Text style={styles.activityAmount}>{formatAmount(item.amount, currency)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => setAddExpenseVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ── Add Expense modal ── */}
      <Modal
        visible={addExpenseVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddExpenseVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top + 24 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TouchableOpacity onPress={() => setAddExpenseVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <TouchableOpacity
              style={[styles.testButton, creatingExpense && styles.testButtonDisabled]}
              onPress={handleTestExpense}
              disabled={creatingExpense}
            >
              <Text style={styles.testButtonText}>
                {creatingExpense ? 'Creating...' : '🧪 TEST CREATE EXPENSE (₹100)'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalStubSub}>Creates real DB expense (SS-020 complete)</Text>
          </View>
        </View>
      </Modal>
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
  balanceCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    padding: 24,
    marginTop: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#141414',
    marginBottom: 8,
  },
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
  emptyActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activitySection: { marginTop: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#141414',
    marginBottom: 12,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F5',
  },
  activityDescription: { fontSize: 14, color: '#141414' },
  activityAmount: { fontSize: 14, fontWeight: '600', color: '#141414' },
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#141414' },
  modalClose: { fontSize: 18, color: '#6B6B6B', padding: 4 },
  modalBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  testButton: {
    height: 48,
    paddingHorizontal: 32,
    backgroundColor: '#141414',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  testButtonDisabled: {
    backgroundColor: '#6B6B6B',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalStubSub: {
    fontSize: 14,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 21,
  },
})
