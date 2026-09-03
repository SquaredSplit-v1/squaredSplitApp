import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import AddExpenseModal from '@/components/AddExpenseModal'
import AddExpenseButton from '@/components/dashboard/AddExpenseButton'
import FriendExpenseRow, { type FriendExpenseRowData } from '@/components/friend/FriendExpenseRow'
import { formatAmount } from '@/lib/currency'
import { supabase } from '@/lib/supabase/client'
import { getFriendNote, saveFriendNote } from '@/lib/supabase/friends'
import { settleUpWithFriend } from '@/lib/supabase/home'
import { groupByMonth } from '@/lib/utils/groupExpensesByMonth'
import { useAuthStore } from '@/store/authStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { useFriendsStore, type SharedExpense } from '@/store/friendsStore'

import CalendarIcon from '../../assets/calendar.svg'
import LikeIcon from '../../assets/like.svg'
import SettingsIcon from '../../assets/settings.svg'

type Panel = 'square-up' | 'board' | 'charts'

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function mapExpense(exp: SharedExpense, userId: string): FriendExpenseRowData {
  const youPaid = exp.paidBy === userId
  const displayAmount = youPaid
    ? roundMoney(Math.max(0, exp.amount - exp.shareAmount))
    : roundMoney(exp.shareAmount)
  return {
    expenseId: exp.expenseId,
    description: exp.description || 'Expense',
    totalAmount: exp.amount,
    displayAmount,
    createdAt: exp.createdAt,
    youPaid,
    direction: youPaid ? 'owes_you' : 'you_owe',
  }
}

function AvatarBubble({ uri, style }: { uri: string | null; style?: object }) {
  if (uri) {
    return <Image source={{ uri }} style={[styles.avatar, style]} contentFit="cover" />
  }
  return (
    <View style={[styles.avatar, styles.avatarPlaceholder, style]}>
      <Text style={styles.avatarInitial}>?</Text>
    </View>
  )
}

export default function FriendDetailScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const userId = useAuthStore(s => s.user?.id)
  const { current: currency } = useCurrencyStore()
  const { sharedExpenses, isLoadingDetail, fetchSharedExpenses } = useFriendsStore()

  const params = useLocalSearchParams<{
    friendId?: string
    friendName?: string
    friendAvatar?: string
  }>()

  const friendId = Array.isArray(params.friendId) ? params.friendId[0] : params.friendId
  const friendNameParam = Array.isArray(params.friendName)
    ? params.friendName[0]
    : params.friendName
  const friendAvatarParam = Array.isArray(params.friendAvatar)
    ? params.friendAvatar[0]
    : params.friendAvatar

  const [activePanel, setActivePanel] = useState<Panel>('square-up')
  const [addExpenseVisible, setAddExpenseVisible] = useState(false)
  const [myAvatar, setMyAvatar] = useState<string | null>(null)
  const [resolvedName, setResolvedName] = useState(friendNameParam ?? 'Friend')
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(friendAvatarParam ?? null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSettling, setIsSettling] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteLoaded, setNoteLoaded] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)

  useEffect(() => {
    if (!userId || !friendId) return
    void fetchSharedExpenses(userId, friendId)
  }, [userId, friendId, fetchSharedExpenses])

  // Whiteboard note
  useEffect(() => {
    if (!userId || !friendId) return
    let cancelled = false
    void getFriendNote(userId, friendId).then(({ note }) => {
      if (cancelled) return
      setNoteText(note ?? '')
      setNoteLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [userId, friendId])

  useEffect(() => {
    if (!userId) return
    void supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setMyAvatar(data.avatar_url)
      })
  }, [userId])

  useEffect(() => {
    if (friendNameParam && friendAvatarParam !== undefined) {
      setResolvedName(friendNameParam)
      setResolvedAvatar(friendAvatarParam || null)
      return
    }
    if (!friendId) return
    void supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', friendId)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setResolvedName(data.full_name)
        if (data?.avatar_url) setResolvedAvatar(data.avatar_url)
      })
  }, [friendId, friendNameParam, friendAvatarParam])

  const expenseRows = useMemo(() => {
    if (!userId) return []
    return sharedExpenses.map(e => mapExpense(e, userId))
  }, [sharedExpenses, userId])

  const unsettledRows = useMemo(() => sharedExpenses.filter(e => !e.isSettled), [sharedExpenses])

  const netBalance = useMemo(() => {
    if (!userId) return 0
    return roundMoney(
      unsettledRows.reduce(
        (sum, e) =>
          sum + (e.paidBy === userId ? Math.max(0, e.amount - e.shareAmount) : -e.shareAmount),
        0
      )
    )
  }, [unsettledRows, userId])

  const monthGroups = useMemo(() => groupByMonth(expenseRows), [expenseRows])

  const chartData = useMemo(() => {
    const max = Math.max(...expenseRows.map(e => e.displayAmount), 1)
    return expenseRows.map(e => ({
      id: e.expenseId,
      label: e.description,
      amount: e.displayAmount,
      widthPct: `${Math.round((e.displayAmount / max) * 100)}%`,
    }))
  }, [expenseRows])

  const handleRefresh = useCallback(async () => {
    if (!userId || !friendId) return
    setIsRefreshing(true)
    await fetchSharedExpenses(userId, friendId)
    setIsRefreshing(false)
  }, [userId, friendId, fetchSharedExpenses])

  const handleExpenseCreated = useCallback(() => {
    if (userId && friendId) void fetchSharedExpenses(userId, friendId)
  }, [userId, friendId, fetchSharedExpenses])

  const handleSettleUp = useCallback(() => {
    if (!friendId || Math.abs(netBalance) < 0.005 || isSettling) return
    const owesYou = netBalance > 0
    Alert.alert(
      'Square up',
      owesYou
        ? `Mark all outstanding balances with ${resolvedName} as settled? (${formatAmount(netBalance, currency)} they owe you)`
        : `Mark all outstanding balances with ${resolvedName} as settled? (${formatAmount(Math.abs(netBalance), currency)} you owe)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Square up',
          style: 'default',
          onPress: async () => {
            setIsSettling(true)
            const result = await settleUpWithFriend(friendId)
            setIsSettling(false)
            if (!result.success) {
              Alert.alert('Could not square up', result.error ?? 'Please try again.')
              return
            }
            if (userId) await fetchSharedExpenses(userId, friendId)
          },
        },
      ]
    )
  }, [friendId, netBalance, isSettling, resolvedName, currency, userId, fetchSharedExpenses])

  const handleSaveNote = useCallback(async () => {
    if (!friendId || isSavingNote) return
    setIsSavingNote(true)
    const result = await saveFriendNote(friendId, noteText)
    setIsSavingNote(false)
    if (!result.success) {
      Alert.alert('Could not save note', result.error ?? 'Please try again.')
    }
  }, [friendId, noteText, isSavingNote])

  const openSettings = () => {
    if (!friendId) return
    router.push({
      pathname: '/dashboard/friend-settings',
      params: { friendId, friendName: resolvedName },
    })
  }

  if (!friendId) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>Friend not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderSettleUpCard = () => {
    if (Math.abs(netBalance) < 0.005) {
      return (
        <View style={styles.settleCardSettled}>
          <Text style={styles.settleTitleSettled}>All squared up ✓</Text>
          <Text style={styles.settleBody}>
            You and {resolvedName} have no outstanding balances.
          </Text>
        </View>
      )
    }
    const owesYou = netBalance > 0
    return (
      <View style={[styles.settleCard, owesYou ? styles.settleCardGreen : styles.settleCardOrange]}>
        <Text style={styles.settleTitle}>
          {owesYou
            ? `${resolvedName} owes you ${formatAmount(netBalance, currency)}`
            : `You owe ${resolvedName} ${formatAmount(Math.abs(netBalance), currency)}`}
        </Text>
        <Text style={styles.settleBody}>
          {unsettledRows.length} unsettled expense{unsettledRows.length === 1 ? '' : 's'} · tap
          below once you have paid each other back.
        </Text>
        <TouchableOpacity
          style={[styles.settleBtn, isSettling && styles.settleBtnDisabled]}
          onPress={handleSettleUp}
          disabled={isSettling}
          activeOpacity={0.85}
        >
          {isSettling ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.settleBtnText}>Square up</Text>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  const renderSquareUpList = () => (
    <View style={styles.squareUpWrap}>
      {renderSettleUpCard()}
      {isLoadingDetail ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#3273CD" />
        </View>
      ) : expenseRows.length === 0 ? (
        <Text style={styles.emptyList}>No shared expenses yet.</Text>
      ) : (
        monthGroups.map(group => (
          <View key={group.key} style={styles.monthBlock}>
            <Text style={styles.monthTitle}>{group.label}</Text>
            {group.items.map(item => (
              <FriendExpenseRow
                key={item.expenseId}
                item={item}
                currency={currency}
                payerLabel={resolvedName}
                onPress={() => router.push(`/dashboard/expense/${item.expenseId}`)}
              />
            ))}
          </View>
        ))
      )}
    </View>
  )

  const renderWhiteboard = () => (
    <View style={styles.whiteboardCard}>
      <Text style={styles.whiteboardTitle}>Whiteboard</Text>
      <Text style={styles.whiteboardHint}>
        Shared notes between you and {resolvedName} — great for trip plans or reminders.
      </Text>
      <TextInput
        style={styles.whiteboardInput}
        value={noteText}
        onChangeText={setNoteText}
        placeholder={noteLoaded ? 'Start typing…' : 'Loading…'}
        placeholderTextColor="#9CA3AF"
        multiline
        textAlignVertical="top"
        accessibilityLabel="Shared note"
      />
      <TouchableOpacity
        style={[styles.whiteboardSave, isSavingNote && styles.settleBtnDisabled]}
        onPress={handleSaveNote}
        disabled={isSavingNote}
        activeOpacity={0.85}
      >
        {isSavingNote ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.whiteboardSaveText}>Save note</Text>
        )}
      </TouchableOpacity>
    </View>
  )

  const renderCharts = () => {
    if (expenseRows.length === 0) {
      return <Text style={styles.emptyList}>Add expenses to see a breakdown.</Text>
    }
    return (
      <View style={styles.chartsWrap}>
        {chartData.map(row => (
          <View key={row.id} style={styles.chartRow}>
            <Text style={styles.chartLabel} numberOfLines={1}>
              {row.label}
            </Text>
            <View style={styles.chartBarTrack}>
              <View style={[styles.chartBarFill, { width: row.widthPct as `${number}%` }]} />
            </View>
            <Text style={styles.chartAmount}>{formatAmount(row.amount, currency)}</Text>
          </View>
        ))}
      </View>
    )
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#3273CD" />
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openSettings} hitSlop={12} style={styles.settingsBtn}>
            <SettingsIcon width={22} height={22} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View style={styles.profileStack}>
            <View style={[styles.avatarRing, styles.avatarBack]}>
              <AvatarBubble uri={myAvatar} />
            </View>
            <View style={[styles.avatarRing, styles.avatarFront]}>
              <AvatarBubble uri={resolvedAvatar} />
            </View>
          </View>
          <Text style={styles.friendName}>{resolvedName}</Text>
          <View style={styles.divider} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <TouchableOpacity
            style={[styles.chip, activePanel === 'square-up' && styles.chipSelected]}
            onPress={() => setActivePanel('square-up')}
            activeOpacity={0.85}
          >
            <LikeIcon width={12} height={14} />
            <Text style={styles.chipText}>Square up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, activePanel === 'board' && styles.chipSelected]}
            onPress={() => setActivePanel('board')}
            activeOpacity={0.85}
          >
            <CalendarIcon width={15} height={15} />
            <Text style={styles.chipText}>Whiteboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, activePanel === 'charts' && styles.chipSelected]}
            onPress={() => setActivePanel('charts')}
            activeOpacity={0.85}
          >
            <CalendarIcon width={15} height={15} />
            <Text style={styles.chipText}>Charts</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.panel}>
          {activePanel === 'square-up' && renderSquareUpList()}
          {activePanel === 'board' && renderWhiteboard()}
          {activePanel === 'charts' && renderCharts()}
        </View>
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: insets.bottom + 16 }]}>
        <AddExpenseButton onPress={() => setAddExpenseVisible(true)} />
      </View>

      <AddExpenseModal
        visible={addExpenseVisible}
        onClose={() => setAddExpenseVisible(false)}
        onSuccess={handleExpenseCreated}
        presetParticipantIds={friendId ? [friendId] : undefined}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 20 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: {
    color: '#3273CD',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 24,
  },
  settingsBtn: { padding: 4 },
  header: { marginBottom: 8 },
  profileStack: { width: 80, height: 80, marginBottom: 8 },
  avatarRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#D9E897',
  },
  avatarBack: { left: 0, top: 0 },
  avatarFront: { left: 28, top: 28 },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  avatarInitial: {
    color: '#6B6B6B',
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  friendName: {
    color: '#141414',
    fontSize: 32,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 32,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 12,
  },
  chipRow: { gap: 8, paddingVertical: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.6,
    borderColor: '#9CA3AF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
    elevation: 2,
  },
  chipSelected: {
    backgroundColor: '#E1EABB',
    borderColor: '#E1EABB',
  },
  chipText: {
    color: '#141414',
    fontSize: 16,
    fontFamily: 'Nunito_500Medium',
    lineHeight: 16,
  },
  panel: { gap: 32, marginTop: 8 },
  monthBlock: { gap: 12 },
  monthTitle: {
    color: '#141414',
    fontSize: 20,
    fontFamily: 'Nunito_600SemiBold',
    lineHeight: 30,
  },
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },
  emptyList: {
    color: '#6B6B6B',
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
  },
  emptyTitle: {
    color: '#141414',
    fontSize: 22,
    fontFamily: 'Nunito_700Bold',
  },
  placeholderCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#FAFAFC',
  },
  placeholderTitle: {
    color: '#141414',
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 8,
  },
  placeholderBody: {
    color: '#6B6B6B',
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
  },
  squareUpWrap: { gap: 24 },
  settleCard: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  settleCardGreen: { backgroundColor: '#E8F8EE' },
  settleCardOrange: { backgroundColor: '#FEF3E8' },
  settleCardSettled: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#F3F4F5',
    gap: 4,
  },
  settleTitle: {
    color: '#141414',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
  },
  settleTitleSettled: {
    color: '#44BB73',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
  },
  settleBody: {
    color: '#6B6B6B',
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
  settleBtn: {
    marginTop: 4,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settleBtnDisabled: { opacity: 0.6 },
  settleBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  whiteboardCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#FAFAFC',
    gap: 10,
  },
  whiteboardTitle: {
    color: '#141414',
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
  },
  whiteboardHint: {
    color: '#6B6B6B',
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
  whiteboardInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 12,
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#141414',
  },
  whiteboardSave: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
  },
  whiteboardSaveText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  chartsWrap: { gap: 16 },
  chartRow: { gap: 6 },
  chartLabel: {
    color: '#141414',
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
  },
  chartBarTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#44BB73',
  },
  chartAmount: {
    color: '#374151',
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
  },
  fabWrap: {
    position: 'absolute',
    right: 0,
    left: 0,
  },
})
