import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { fetchExpenseDetail } from '@/lib/api/getExpenseDetail'
import { formatAmount } from '@/lib/currency'
import type { ExpenseDetail } from '@/lib/supabase/home'
import { useAuthStore } from '@/store/authStore'
import { useCurrencyStore } from '@/store/currencyStore'

import TrainIcon from '../../../assets/expense-screen/train.svg'

function CategoryIcon({ category }: { category: string | null }) {
  const lower = (category ?? '').toLowerCase()
  const isTransport =
    lower.includes('transport') ||
    lower.includes('taxi') ||
    lower.includes('uber') ||
    lower.includes('train') ||
    lower.includes('travel')
  if (isTransport) {
    return (
      <View style={styles.categoryIconWrap}>
        <TrainIcon width={22} height={24} />
      </View>
    )
  }
  return (
    <View style={styles.categoryIconWrap}>
      <Text style={styles.categoryFallback}>$</Text>
    </View>
  )
}

function PaidAvatar({ uri }: { uri: string | null }) {
  if (uri) {
    return <Image source={{ uri }} style={styles.paidAvatar} contentFit="cover" />
  }
  return (
    <View style={[styles.paidAvatar, styles.avatarPlaceholder]}>
      <Text style={styles.avatarInitial}>?</Text>
    </View>
  )
}

export default function ExpenseDetailScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ id?: string }>()
  const expenseId = Array.isArray(params.id) ? params.id[0] : params.id
  const userId = useAuthStore(s => s.user?.id)
  const { current: currency } = useCurrencyStore()

  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!expenseId) {
      setExpense(null)
      setLoading(false)
      setError('Missing expense')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchExpenseDetail(expenseId)
    if (err) setError(err)
    setExpense(data)
    setLoading(false)
  }, [expenseId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#141414" />
      </View>
    )
  }

  if (!userId) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#141414" />
      </View>
    )
  }

  if (!expense || error) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <Text style={styles.emptyTitle}>{error ?? 'Expense not found'}</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.back()}>
          <Text style={styles.actionButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const payerParticipant = expense.participants.find(p => p.userId === expense.paidBy)
  const payerName = payerParticipant?.fullName ?? 'Friend'
  const payerAvatar = payerParticipant?.avatarUrl ?? null
  const youPaid = expense.paidBy === userId

  const yourShare = expense.participants.find(p => p.userId === userId)?.shareAmount ?? 0
  const others = expense.participants.filter(p => p.userId !== userId)

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense detail</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <CategoryIcon category={expense.category} />
            <Text style={styles.expenseTitle}>{expense.title}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.paidBlock}>
          <View style={styles.paidRow}>
            <PaidAvatar uri={payerAvatar} />
            <Text style={styles.paidLine}>
              {youPaid ? (
                <>
                  <Text style={styles.paidPrefix}>You paid </Text>
                  <Text style={styles.paidAmountBold}>
                    {formatAmount(expense.amount, currency)}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.paidPrefix}>{payerName} paid </Text>
                  <Text style={styles.paidAmountBold}>
                    {formatAmount(expense.amount, currency)}
                  </Text>
                </>
              )}
            </Text>
          </View>

          <View style={styles.bulletBlock}>
            {youPaid ? (
              <>
                <Text style={styles.bulletLine}>
                  <Text style={styles.bulletDot}>• </Text>
                  <Text style={styles.bulletGray}>You owe </Text>
                  <Text style={styles.bulletGreen}>{formatAmount(yourShare, currency)}</Text>
                </Text>
                {others.map(p => (
                  <Text key={p.userId} style={styles.bulletLine}>
                    <Text style={styles.bulletDot}>• </Text>
                    <Text style={styles.bulletGray}>{p.fullName} owes you </Text>
                    <Text style={styles.bulletOrange}>{formatAmount(p.shareAmount, currency)}</Text>
                  </Text>
                ))}
              </>
            ) : (
              <Text style={styles.bulletLine}>
                <Text style={styles.bulletDot}>• </Text>
                <Text style={styles.bulletGray}>You owe </Text>
                <Text style={styles.bulletGreen}>{formatAmount(yourShare, currency)}</Text>
              </Text>
            )}
          </View>
        </View>

        {expense.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              <Text style={styles.noteLabelBold}>Note:</Text>
              <Text style={styles.noteBody}> {expense.note}</Text>
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 72,
  },
  backChevron: {
    color: '#3273CD',
    fontSize: 22,
    fontWeight: '700',
    marginTop: -2,
    fontFamily: 'Nunito_700Bold',
  },
  backText: {
    color: '#3273CD',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 24,
  },
  headerTitle: {
    color: '#141414',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    lineHeight: 19.2,
  },
  headerSpacer: {
    width: 72,
  },
  titleBlock: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F9F0BF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  categoryFallback: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: '#141414',
  },
  expenseTitle: {
    flex: 1,
    color: '#141414',
    fontFamily: 'Nunito_700Bold',
    fontSize: 32,
    lineHeight: 48,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  paidBlock: {
    gap: 12,
  },
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paidAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: 'Nunito_700Bold',
    color: '#6B6B6B',
  },
  paidLine: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  paidPrefix: {
    color: '#141414',
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
    lineHeight: 18,
  },
  paidAmountBold: {
    color: '#141414',
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 18,
  },
  bulletBlock: {
    gap: 8,
    paddingLeft: 4,
  },
  bulletLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  bulletDot: {
    color: '#6B6B6B',
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 14,
  },
  bulletGray: {
    color: '#6B6B6B',
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 14,
  },
  bulletGreen: {
    color: '#44BB73',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 14,
  },
  bulletOrange: {
    color: '#E38F30',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 14,
  },
  noteBox: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#F9F0BF',
    borderRadius: 8,
  },
  noteText: {
    color: '#141414',
    fontSize: 16,
    lineHeight: 19.2,
  },
  noteLabelBold: {
    fontFamily: 'Nunito_700Bold',
  },
  noteBody: {
    fontFamily: 'Nunito_400Regular',
  },
  emptyTitle: {
    color: '#141414',
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
  },
})
