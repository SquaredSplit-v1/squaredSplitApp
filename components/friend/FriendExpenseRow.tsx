import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { formatAmount, type Currency } from '@/lib/currency'
import { formatExpenseDate } from '@/lib/utils/groupExpensesByMonth'

import TrainIcon from '../../assets/expense-screen/train.svg'

export interface FriendExpenseRowData {
  expenseId: string
  description: string
  totalAmount: number
  displayAmount: number
  createdAt: string
  youPaid: boolean
  direction: 'owes_you' | 'you_owe'
}

interface Props {
  item: FriendExpenseRowData
  currency: Currency
  payerLabel: string
  onPress: () => void
}

export default function FriendExpenseRow({ item, currency, payerLabel, onPress }: Props) {
  const owesYou = item.direction === 'owes_you'
  const amountColor = owesYou ? '#44BB73' : '#DE8334'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <TrainIcon width={22} height={24} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.paidLine}>
            {item.youPaid
              ? `You paid ${formatAmount(item.totalAmount, currency)}`
              : `${payerLabel} paid ${formatAmount(item.totalAmount, currency)}`}
          </Text>
          <Text style={styles.meta}>{formatExpenseDate(item.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.status}>{owesYou ? 'owes you' : 'you owe'}</Text>
        <Text style={[styles.amount, { color: amountColor }]}>
          {formatAmount(item.displayAmount, currency)}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  pressed: { opacity: 0.75 },
  left: { flexDirection: 'row', flex: 1, gap: 12, minWidth: 0 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F9F0BF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1, gap: 4 },
  title: {
    color: '#141414',
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 16,
  },
  paidLine: {
    color: '#6B6B6B',
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 14,
  },
  meta: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Nunito_500Medium',
    lineHeight: 18,
  },
  right: { alignItems: 'flex-end', gap: 4, marginLeft: 8 },
  status: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 24,
  },
})
