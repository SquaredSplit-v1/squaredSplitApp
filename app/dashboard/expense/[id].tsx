import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { fetchExpenseDetail } from '@/lib/api/getExpenseDetail'
import { formatAmount } from '@/lib/currency'
import type { ExpenseDetail } from '@/lib/supabase/home'
import {
  deleteReceipt,
  fetchAgreements,
  fetchReceipts,
  updateExpenseNote,
  type Agreement,
  type Receipt,
} from '@/lib/supabase/receipts'
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
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [noteDraft, setNoteDraft] = useState<string | null>(null)
  const [noteEditing, setNoteEditing] = useState(false)
  const [noteSaving, setNoteSaving] = useState(false)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

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
    setNoteDraft(data?.note ?? null)
    setIsOwner(Boolean(data && userId && data.paidBy === userId))
    setLoading(false)
    const [rs, ags] = await Promise.all([fetchReceipts(expenseId), fetchAgreements(expenseId)])
    setReceipts(rs)
    setAgreements(ags)
  }, [expenseId, userId])

  const saveNote = useCallback(
    async (value: string | null) => {
      if (!expenseId || noteSaving) return
      setNoteSaving(true)
      const result = await updateExpenseNote(expenseId, value)
      setNoteSaving(false)
      if (!result.success) {
        Alert.alert('Could not save note', result.error ?? 'Please try again.')
        return
      }
      setNoteDraft(value)
      setNoteEditing(false)
      setExpense(prev => (prev ? { ...prev, note: value } : prev))
    },
    [expenseId, noteSaving]
  )

  const removeReceipt = useCallback((receipt: Receipt) => {
    Alert.alert('Delete receipt', 'Remove this receipt from the expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteReceipt(receipt)
          if (ok) setReceipts(prev => prev.filter(r => r.id !== receipt.id))
        },
      },
    ])
  }, [])

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

  let dueInfo: { text: string; color: string } | null = null
  if (expense.dueDate) {
    const due = new Date(expense.dueDate + 'T12:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const formatted = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(due)
    if (due < today) {
      dueInfo = { text: `Was due ${formatted} · overdue`, color: '#F06767' }
    } else {
      dueInfo = { text: `Pay back by ${formatted}`, color: '#F09E42' }
    }
  }

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

        {dueInfo ? (
          <View style={styles.dueChip}>
            <Text style={[styles.dueText, { color: dueInfo.color }]}>{dueInfo.text}</Text>
          </View>
        ) : null}

        {/* Note — owner can edit or delete */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Note</Text>
            {isOwner && !noteEditing && (
              <View style={styles.sectionActions}>
                <TouchableOpacity onPress={() => setNoteEditing(true)} hitSlop={8}>
                  <Text style={styles.actionLink}>{noteDraft ? 'Edit' : 'Add'}</Text>
                </TouchableOpacity>
                {noteDraft ? (
                  <TouchableOpacity
                    onPress={() => void saveNote(null)}
                    hitSlop={8}
                    accessibilityLabel="Delete note"
                  >
                    <Text style={styles.actionDanger}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
          {noteEditing ? (
            <View style={styles.noteEditWrap}>
              <TextInput
                style={styles.noteInput}
                value={noteDraft ?? ''}
                onChangeText={setNoteDraft}
                placeholder="Add a note…"
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={500}
                autoFocus
              />
              <View style={styles.noteEditBtns}>
                <TouchableOpacity
                  onPress={() => setNoteEditing(false)}
                  style={styles.noteCancelBtn}
                >
                  <Text style={styles.noteCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void saveNote(noteDraft?.trim() ? noteDraft.trim() : null)}
                  style={styles.noteSaveBtn}
                  disabled={noteSaving}
                >
                  <Text style={styles.noteSaveText}>{noteSaving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : noteDraft ? (
            <Text style={styles.noteBodyText}>{noteDraft}</Text>
          ) : (
            <Text style={styles.emptySectionText}>
              No note{isOwner ? ' — tap Add to write one' : ''}.
            </Text>
          )}
        </View>

        {/* Receipts */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Receipts</Text>
          {receipts.length === 0 ? (
            <Text style={styles.emptySectionText}>
              No receipts — attach one when adding or from the expense later.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.receiptRow}
            >
              {receipts.map(r => (
                <View key={r.id} style={styles.receiptWrap}>
                  <TouchableOpacity onPress={() => setViewerUrl(r.url)} activeOpacity={0.85}>
                    <Image source={{ uri: r.url }} style={styles.receiptThumb} contentFit="cover" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.receiptDelete}
                    onPress={() => removeReceipt(r)}
                    accessibilityLabel="Delete receipt"
                  >
                    <Text style={styles.receiptDeleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Agreement signatures */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Agreement</Text>
          {agreements.length === 0 ? (
            <Text style={styles.emptySectionText}>No signatures on this expense.</Text>
          ) : (
            agreements.map(a => (
              <TouchableOpacity
                key={a.id}
                style={styles.agreementRow}
                onPress={() => setViewerUrl(a.url)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: a.url }} style={styles.signatureThumb} contentFit="contain" />
                <View style={styles.agreementText}>
                  <Text style={styles.agreementName}>{a.signerName ?? 'Signed'}</Text>
                  <Text style={styles.agreementDate}>
                    signed {new Date(a.agreedAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Full-screen image viewer */}
      <Modal visible={viewerUrl !== null} transparent onRequestClose={() => setViewerUrl(null)}>
        <View style={styles.viewerRoot}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerUrl(null)}>
            <Text style={styles.viewerCloseText}>✕</Text>
          </TouchableOpacity>
          {viewerUrl ? (
            <Image
              source={{ uri: viewerUrl }}
              style={styles.viewerImage}
              contentFit="contain"
              transition={150}
            />
          ) : null}
        </View>
      </Modal>
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
  dueChip: {
    marginTop: 20,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F5',
  },
  dueText: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    lineHeight: 18,
  },
  sectionCard: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    backgroundColor: '#FAFAFC',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionActions: { flexDirection: 'row', gap: 16 },
  actionLink: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#3273CD' },
  actionDanger: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#EF4444' },
  noteBodyText: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: '#141414',
    lineHeight: 21,
  },
  emptySectionText: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: '#9CA3AF' },
  noteEditWrap: { gap: 10 },
  noteInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#141414',
    textAlignVertical: 'top',
  },
  noteEditBtns: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  noteCancelBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  noteCancelText: { color: '#6B6B6B', fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  noteSaveBtn: {
    backgroundColor: '#141414',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  noteSaveText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  receiptRow: { gap: 10, paddingTop: 4 },
  receiptWrap: { position: 'relative' },
  receiptThumb: { width: 88, height: 88, borderRadius: 12, backgroundColor: '#E5E7EB' },
  receiptDelete: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptDeleteText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  signatureThumb: {
    width: 96,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  agreementText: { flex: 1, gap: 2 },
  agreementName: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: '#141414' },
  agreementDate: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: '#9CA3AF' },
  viewerRoot: {
    flex: 1,
    backgroundColor: 'rgba(10,10,14,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerClose: { position: 'absolute', top: 54, right: 20, padding: 8, zIndex: 1 },
  viewerCloseText: { color: '#FFFFFF', fontSize: 24 },
  viewerImage: { width: '100%', height: '80%' },
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
