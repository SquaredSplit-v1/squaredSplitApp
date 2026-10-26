/**
 * Add an expense — full-screen flow (Figma 443-19198…21053).
 *
 * Header (Back / title / Save) → "You and:" participant type-ahead chips →
 * category tile + name → $ tile + amount → "Paid by (x) split (equally)"
 * chips → date pill / camera / note. Receipts attach with a thumbnail +
 * delete-confirm; notes open the Write-note card. Unequal splits expose
 * per-person amounts. Everything funnels into the existing createExpense /
 * createExpenseWithInvites + receipt upload pipeline.
 */
import { Ionicons } from '@expo/vector-icons'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import CameraCaptureModal from '@/components/CameraCaptureModal'
import { createExpense } from '@/lib/api/createExpense'
import { labelForMatchedPhone } from '@/lib/contacts'
import { formatAmount } from '@/lib/currency'
import { searchProfileByPhone } from '@/lib/supabase/contacts'
import type { MatchedContact } from '@/lib/supabase/contacts'
import { createExpenseWithInvites } from '@/lib/supabase/invites'
import { uploadReceipt } from '@/lib/supabase/receipts'
import { useAuthStore } from '@/store/authStore'
import { useContactsStore } from '@/store/contactsStore'
import { useCurrencyStore } from '@/store/currencyStore'

const CATEGORIES = [
  { id: 'general', label: 'General', emoji: '🧾' },
  { id: 'food', label: 'Food', emoji: '🍽️' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'bills', label: 'Bills', emoji: '💡' },
  { id: 'entertainment', label: 'Fun', emoji: '🎬' },
]

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

interface SelectedFriend {
  id?: string
  phone: string
  name: string
  avatarUrl?: string | null
  invite?: boolean
}

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: (expenseId?: string) => void
  groupId?: string
  groupName?: string
  presetParticipantIds?: string[]
}

function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

function fmtIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AddExpenseModal({
  visible,
  onClose,
  onSuccess,
  groupId,
  presetParticipantIds,
}: Props) {
  const insets = useSafeAreaInsets()
  const user = useAuthStore(s => s.user)
  const myAvatar = (user?.user_metadata?.avatar_url as string) ?? null
  const { current: currency } = useCurrencyStore()
  const matchedContacts = useContactsStore(s => s.matched)
  const rawWithPhones = useContactsStore(s => s.rawWithPhones)
  const loadContacts = useContactsStore(s => s.loadContacts)

  const [friends, setFriends] = useState<SelectedFriend[]>([])
  const [andQuery, setAndQuery] = useState('')
  const [phoneLookup, setPhoneLookup] = useState<SelectedFriend | null>(null)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [payer, setPayer] = useState<'me' | string>('me')
  const [payerOpen, setPayerOpen] = useState(false)
  const [splitMode, setSplitMode] = useState<'equally' | 'unequally'>('equally')
  const [unequal, setUnequal] = useState<Record<string, string>>({})
  const [date, setDate] = useState(new Date())
  const [dateOpen, setDateOpen] = useState(false)
  const [wheelOpen, setWheelOpen] = useState(false)
  const [wheelMonth, setWheelMonth] = useState(new Date())
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [note, setNote] = useState('')
  const [noteDeleteAsk, setNoteDeleteAsk] = useState(false)
  const [noteDeletedToast, setNoteDeletedToast] = useState(false)
  const [receipts, setReceipts] = useState<string[]>([])
  const [cameraOpen, setCameraOpen] = useState(false)
  const [receiptDeleteIdx, setReceiptDeleteIdx] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setFriends([])
      setAndQuery('')
      setTitle('')
      setAmount('')
      setCategory(CATEGORIES[0])
      setCategoryOpen(false)
      setPayer('me')
      setPayerOpen(false)
      setSplitMode('equally')
      setUnequal({})
      setDate(new Date())
      setDateOpen(false)
      setWheelOpen(false)
      setNoteOpen(false)
      setNote('')
      setNoteDraft('')
      setReceipts([])
      setError('')
      void loadContacts()
    }
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  // preset participants (group flow) land as chips
  useEffect(() => {
    if (!visible || !presetParticipantIds?.length) return
    const chips: SelectedFriend[] = presetParticipantIds.map(id => {
      const mc = matchedContacts.find(m => m.id === id)
      return {
        id,
        phone: mc?.phone ?? '',
        name: mc?.display_name ?? 'Member',
        avatarUrl: mc?.avatar_url ?? null,
      }
    })
    setFriends(chips)
  }, [visible, presetParticipantIds]) // eslint-disable-line react-hooks/exhaustive-deps

  const digits = andQuery.replace(/\D/g, '')
  const isPhoneQuery = digits.length >= 7 && andQuery.replace(/[\d\s+()-]/g, '').length === 0

  // phone lookup → registered user or invite
  useEffect(() => {
    if (!isPhoneQuery) {
      setPhoneLookup(null)
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      void searchProfileByPhone(andQuery).then(({ data }) => {
        if (cancelled) return
        setPhoneLookup(
          data
            ? {
                id: data.id,
                phone: data.phone,
                name: data.display_name,
                avatarUrl: data.avatar_url,
              }
            : { phone: digits, name: andQuery, invite: true }
        )
      })
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [andQuery, isPhoneQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  const friendOptions: (MatchedContact & { label: string })[] = useMemo(
    () =>
      matchedContacts
        .filter(mc => mc.id !== user?.id)
        .map(mc => ({
          ...mc,
          label: labelForMatchedPhone(mc.phone, mc.display_name, rawWithPhones),
        }))
        .filter(mc => !friends.some(f => f.id === mc.id))
        .filter(mc =>
          andQuery.trim() && !isPhoneQuery
            ? mc.label.toLowerCase().includes(andQuery.trim().toLowerCase())
            : true
        )
        .sort((a, b) => a.label.localeCompare(b.label))
        .slice(0, 6),
    [matchedContacts, rawWithPhones, andQuery, friends, isPhoneQuery, user?.id]
  )

  const addFriend = (f: SelectedFriend) => {
    setFriends(prev => [...prev, f])
    setAndQuery('')
    setPhoneLookup(null)
  }

  const amountNum = Number(amount) || 0
  const allPeople = useMemo(() => {
    const me: SelectedFriend = { id: user?.id, phone: user?.phone ?? '', name: 'You' }
    return [me, ...friends]
  }, [friends, user?.id, user?.phone])

  const unequalSum = useMemo(
    () => Object.values(unequal).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [unequal]
  )

  const canSave =
    !!title.trim() &&
    amountNum > 0 &&
    (groupId ? true : friends.length > 0) &&
    (splitMode === 'equally' || Math.abs(unequalSum - amountNum) < 0.005) &&
    !isSaving

  const handleSave = useCallback(async () => {
    if (!canSave || !user) return
    setIsSaving(true)
    setError('')
    try {
      const participantIds = allPeople.map(p => p.id).filter((id): id is string => !!id)
      const inviteEntries = friends
        .filter(f => f.invite)
        .map(f => ({ phone: f.phone, name: f.name }))
      let expenseId: string | undefined

      if (inviteEntries.length > 0) {
        const res = await createExpenseWithInvites({
          title: title.trim(),
          amount: amountNum,
          paidBy: user.id,
          participants: participantIds,
          invites: inviteEntries,
          groupId: groupId ?? undefined,
          note: note.trim() || undefined,
        })
        expenseId = res.id
      } else {
        const exact =
          splitMode === 'unequally'
            ? Object.fromEntries(Object.entries(unequal).map(([k, v]) => [k, Number(v) || 0]))
            : undefined
        const created = await createExpense({
          title: title.trim(),
          amount: amountNum,
          paid_by: payer === 'me' ? user.id : payer,
          participants: participantIds,
          category: category.id,
          split_type: splitMode === 'unequally' ? 'exact' : 'equally',
          note: note.trim() || null,
          date: fmtIso(date),
          group_id: groupId ?? null,
          exact_amounts: exact,
        })
        expenseId = created.id
      }

      for (const uri of receipts) {
        const r = await uploadReceipt(user.id, expenseId, uri)
        if (!r.success) console.warn('[AddExpense] receipt upload failed:', r.error)
      }

      onSuccess(expenseId)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the expense.')
    } finally {
      setIsSaving(false)
    }
  }, [
    canSave,
    user,
    allPeople,
    friends,
    title,
    amountNum,
    groupId,
    note,
    date,
    splitMode,
    unequal,
    payer,
    category.id,
    receipts,
    onClose,
    onSuccess,
  ])

  // ── calendar model ──────────────────────────────────────────────────────────

  const calendarCells = useMemo(() => {
    const y = wheelMonth.getFullYear()
    const m = wheelMonth.getMonth()
    const startPad = (new Date(y, m, 1).getDay() + 6) % 7 // Monday-first
    const days = new Date(y, m + 1, 0).getDate()
    return [
      ...Array.from({ length: startPad }, () => null as number | null),
      ...Array.from({ length: days }, (_, i) => (i + 1) as number | null),
    ]
  }, [wheelMonth])

  const wheelMonths = useMemo(() => {
    const now = new Date()
    return Array.from(
      { length: 13 },
      (_, i) => new Date(now.getFullYear(), now.getMonth() - 6 + i, 1)
    )
  }, [])

  const renderTypeahead = () => (
    <View style={st.typeaheadCard}>
      {isPhoneQuery && phoneLookup ? (
        <TouchableOpacity
          style={st.optionRow}
          onPress={() => addFriend(phoneLookup)}
          activeOpacity={0.7}
        >
          <View style={st.optionAvatar}>
            <Text style={st.optionAvatarText}>{phoneLookup.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.optionName}>
              {phoneLookup.invite ? 'Not on SquaredSplit — invite' : phoneLookup.name}
            </Text>
            <Text style={st.optionPhone}>{phoneLookup.phone}</Text>
          </View>
          <Ionicons name="add" size={20} color="#3273CD" />
        </TouchableOpacity>
      ) : null}
      {friendOptions.map(mc => (
        <TouchableOpacity
          key={mc.id}
          style={st.optionRow}
          onPress={() =>
            addFriend({
              id: mc.id,
              phone: mc.phone,
              name: mc.display_name,
              avatarUrl: mc.avatar_url,
            })
          }
          activeOpacity={0.7}
        >
          {mc.avatar_url ? (
            <Image source={{ uri: mc.avatar_url }} style={st.optionAvatar} />
          ) : (
            <View style={st.optionAvatar}>
              <Text style={st.optionAvatarText}>{mc.label.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={st.optionName}>{mc.label}</Text>
        </TouchableOpacity>
      ))}
      {friendOptions.length === 0 && !(isPhoneQuery && phoneLookup) ? (
        <Text style={st.typeaheadEmpty}>No matches — enter a number to invite anyone</Text>
      ) : null}
    </View>
  )

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={st.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[st.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={st.headerSide} onPress={onClose} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color="#3273CD" />
            <Text style={st.headerBlue}>Back</Text>
          </TouchableOpacity>
          <Text style={st.headerTitle}>Add an expense</Text>
          <TouchableOpacity
            style={[st.headerSide, { justifyContent: 'flex-end' }]}
            onPress={() => void handleSave()}
            disabled={!canSave}
            hitSlop={12}
          >
            {isSaving ? (
              <ActivityIndicator color="#3273CD" size="small" />
            ) : (
              <Text style={[st.headerBlue, !canSave && st.headerSaveDisabled]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* You and: */}
          <View style={st.andRow}>
            <Text style={st.andLabel}>
              <Text style={st.andBold}>You</Text> and:
            </Text>
            <View style={st.andChipsWrap}>
              {friends.slice(0, 3).map((f, i) => (
                <Pressable
                  key={f.id ?? f.phone}
                  style={st.friendChip}
                  onPress={() => setFriends(prev => prev.filter((_, idx) => idx !== i))}
                >
                  {f.avatarUrl ? (
                    <Image source={{ uri: f.avatarUrl }} style={st.chipAvatar} />
                  ) : (
                    <View style={[st.chipAvatar, st.chipAvatarFallback]}>
                      <Text style={st.chipAvatarText}>{f.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={st.chipName} numberOfLines={1}>
                    {f.name}
                  </Text>
                </Pressable>
              ))}
              {friends.length > 3 ? (
                <View style={st.friendChip}>
                  <Text style={st.chipName}>+{friends.length - 3}</Text>
                </View>
              ) : null}
              <TextInput
                style={st.andInput}
                placeholder="Name or number"
                placeholderTextColor="#B7BCC3"
                value={andQuery}
                onChangeText={setAndQuery}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>
          </View>
          <View style={st.underline} />

          {andQuery.trim() ? renderTypeahead() : null}

          {/* Category + name */}
          <View style={st.fieldRow}>
            <TouchableOpacity
              style={[st.catTile, { backgroundColor: '#F7F0BE' }]}
              onPress={() => setCategoryOpen(o => !o)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Category ${category.label}, change`}
            >
              <Text style={st.catEmoji}>{category.emoji}</Text>
            </TouchableOpacity>
            <View style={st.fieldInputWrap}>
              <TextInput
                style={st.fieldInput}
                placeholder="Expense name"
                placeholderTextColor="#B7BCC3"
                value={title}
                onChangeText={setTitle}
                maxLength={60}
                returnKeyType="next"
              />
              <View style={st.underline} />
            </View>
          </View>
          {categoryOpen ? (
            <View style={st.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[st.catOption, category.id === c.id && st.catOptionActive]}
                  onPress={() => {
                    setCategory(c)
                    setCategoryOpen(false)
                  }}
                >
                  <Text style={st.catEmojiSm}>{c.emoji}</Text>
                  <Text style={st.catOptionLabel}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Amount */}
          <View style={st.fieldRow}>
            <View style={[st.catTile, { backgroundColor: '#D6E7FB' }]}>
              <Text style={st.dollarGlyph}>$</Text>
            </View>
            <View style={st.fieldInputWrap}>
              <TextInput
                style={st.fieldInput}
                placeholder="Expense value"
                placeholderTextColor="#B7BCC3"
                value={amount}
                onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <View style={st.underline} />
            </View>
          </View>

          {/* Paid by / split */}
          <View style={st.paidRow}>
            <Text style={st.paidLabel}>Paid by</Text>
            <TouchableOpacity style={st.pill} onPress={() => setPayerOpen(true)}>
              {myAvatar ? <Image source={{ uri: myAvatar }} style={st.chipAvatar} /> : null}
              <Text style={st.pillText}>
                {payer === 'me' ? 'You' : (friends.find(f => f.id === payer)?.name ?? 'Someone')}
              </Text>
            </TouchableOpacity>
            <Text style={st.paidLabel}>split</Text>
            <TouchableOpacity
              style={st.pill}
              onPress={() => setSplitMode(m => (m === 'equally' ? 'unequally' : 'equally'))}
            >
              <Text style={st.pillText}>{splitMode}</Text>
            </TouchableOpacity>
          </View>

          {splitMode === 'unequally' ? (
            <View style={st.unequalWrap}>
              {allPeople.map(p => {
                const key = p.id ?? p.phone
                return (
                  <View key={key} style={st.unequalRow}>
                    <Text style={st.unequalName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <TextInput
                      style={st.unequalInput}
                      value={unequal[key] ?? ''}
                      onChangeText={v =>
                        setUnequal(prev => ({ ...prev, [key]: v.replace(/[^0-9.]/g, '') }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#B7BCC3"
                    />
                  </View>
                )
              })}
              <Text
                style={[
                  st.unequalSum,
                  Math.abs(unequalSum - amountNum) > 0.005 && st.unequalSumBad,
                ]}
              >
                {formatAmount(unequalSum, currency)} of {formatAmount(amountNum, currency)}
              </Text>
            </View>
          ) : null}

          {/* date / camera / note */}
          <View style={st.utilRow}>
            <TouchableOpacity style={st.datePill} onPress={() => setDateOpen(true)}>
              <Ionicons name="calendar" size={18} color="#141414" />
              <Text style={st.datePillText}>
                {new Date().toDateString() === date.toDateString() ? 'Today' : fmtDate(date)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={st.roundBtn}
              onPress={() => setCameraOpen(true)}
              accessibilityLabel="Add receipt"
            >
              <Ionicons name="camera-outline" size={20} color="#141414" />
            </TouchableOpacity>
            <TouchableOpacity
              style={st.roundBtn}
              onPress={() => {
                setNoteDraft(note)
                setNoteOpen(true)
              }}
              accessibilityLabel="Write note"
            >
              <Ionicons name="pencil" size={20} color="#141414" />
            </TouchableOpacity>
          </View>

          {note.trim() ? (
            <View style={st.noteChip}>
              <Text style={st.noteChipText}>
                <Text style={st.noteChipBold}>Note: </Text>
                {'\u201C'}
                {note}
                {'\u201D'}
              </Text>
              <TouchableOpacity
                style={st.minusBtn}
                onPress={() => setNoteDeleteAsk(true)}
                accessibilityLabel="Delete note"
              >
                <Ionicons name="close" size={14} color="#3273CD" />
              </TouchableOpacity>
            </View>
          ) : null}

          {receipts.length > 0 ? (
            <View style={st.receiptRow}>
              {receipts.map((uri, i) => (
                <View key={i} style={st.receiptWrap}>
                  <Image source={{ uri }} style={st.receiptThumb} />
                  <TouchableOpacity
                    style={st.minusBtn}
                    onPress={() => setReceiptDeleteIdx(i)}
                    accessibilityLabel="Remove receipt"
                  >
                    <Ionicons name="close" size={14} color="#3273CD" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          {!!error ? <Text style={st.errorText}>{error}</Text> : null}
        </ScrollView>

        {/* ── date overlay ── */}
        <Modal
          visible={dateOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDateOpen(false)}
        >
          <Pressable style={st.overlayBackdrop} onPress={() => setDateOpen(false)}>
            <Pressable style={st.card} onPress={() => undefined}>
              <View style={st.cardHeader}>
                <TouchableOpacity onPress={() => setDateOpen(false)}>
                  <Ionicons name="chevron-back" size={22} color="#3273CD" />
                </TouchableOpacity>
                <Text style={st.cardTitle}>Select date</Text>
                <TouchableOpacity onPress={() => setDateOpen(false)}>
                  <Text style={st.cardSave}>Save</Text>
                </TouchableOpacity>
              </View>
              <View style={st.wheelHeader}>
                <TouchableOpacity
                  onPress={() =>
                    setWheelMonth(new Date(wheelMonth.getFullYear(), wheelMonth.getMonth() - 1, 1))
                  }
                >
                  <Ionicons name="chevron-back" size={18} color="#3273CD" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setWheelOpen(w => !w)}>
                  <Text style={st.monthLabel}>
                    {MONTHS[wheelMonth.getMonth()]} {wheelMonth.getFullYear()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setWheelMonth(new Date(wheelMonth.getFullYear(), wheelMonth.getMonth() + 1, 1))
                  }
                >
                  <Ionicons name="chevron-forward" size={18} color="#3273CD" />
                </TouchableOpacity>
              </View>
              {wheelOpen ? (
                <View style={st.wheelWrap}>
                  {wheelMonths.map(d => {
                    const active =
                      d.getMonth() === wheelMonth.getMonth() &&
                      d.getFullYear() === wheelMonth.getFullYear()
                    return (
                      <TouchableOpacity
                        key={d.toISOString()}
                        onPress={() => {
                          setWheelMonth(d)
                          setWheelOpen(false)
                        }}
                      >
                        <Text style={[st.wheelMonth, active && st.wheelMonthActive]}>
                          {MONTHS[d.getMonth()]} {d.getFullYear()}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              ) : (
                <>
                  <View style={st.weekRow}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <Text key={i} style={st.weekDay}>
                        {d}
                      </Text>
                    ))}
                  </View>
                  <View style={st.grid}>
                    {calendarCells.map((day, i) =>
                      day === null ? (
                        <View key={`p${i}`} style={st.dayCell} />
                      ) : (
                        <TouchableOpacity
                          key={i}
                          style={[
                            st.dayCell,
                            date.getDate() === day &&
                              date.getMonth() === wheelMonth.getMonth() &&
                              date.getFullYear() === wheelMonth.getFullYear() &&
                              st.daySelected,
                          ]}
                          onPress={() =>
                            setDate(new Date(wheelMonth.getFullYear(), wheelMonth.getMonth(), day))
                          }
                        >
                          <Text
                            style={[
                              st.dayText,
                              date.getDate() === day &&
                                date.getMonth() === wheelMonth.getMonth() &&
                                date.getFullYear() === wheelMonth.getFullYear() &&
                                st.dayTextSelected,
                            ]}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── write note overlay ── */}
        <Modal
          visible={noteOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setNoteOpen(false)}
        >
          <Pressable style={st.overlayBackdrop} onPress={() => setNoteOpen(false)}>
            <Pressable style={st.card} onPress={() => undefined}>
              <View style={st.cardHeader}>
                <TouchableOpacity onPress={() => setNoteOpen(false)}>
                  <Ionicons name="chevron-back" size={22} color="#3273CD" />
                </TouchableOpacity>
                <Text style={st.cardTitle}>Write note</Text>
                <TouchableOpacity
                  onPress={() => {
                    setNote(noteDraft)
                    setNoteOpen(false)
                  }}
                >
                  <Text style={st.cardSave}>Save</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={st.noteArea}
                value={noteDraft}
                onChangeText={setNoteDraft}
                placeholder="Write a note here"
                placeholderTextColor="#6B6B6B"
                multiline
                autoFocus
                maxLength={200}
              />
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── payer picker ── */}
        <Modal
          visible={payerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPayerOpen(false)}
        >
          <Pressable style={st.overlayBackdrop} onPress={() => setPayerOpen(false)}>
            <Pressable style={st.payerCard} onPress={() => undefined}>
              {allPeople.map(p => (
                <TouchableOpacity
                  key={p.id ?? p.phone}
                  style={st.optionRow}
                  onPress={() => {
                    setPayer(p.id ?? 'me')
                    setPayerOpen(false)
                  }}
                >
                  <Text style={st.optionName}>{p.name}</Text>
                  {payer === (p.id ?? 'me') ? (
                    <Ionicons name="checkmark" size={20} color="#3273CD" />
                  ) : null}
                </TouchableOpacity>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── camera ── */}
        <CameraCaptureModal
          visible={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onCapture={uri => {
            setCameraOpen(false)
            setReceipts(prev => [...prev, uri])
          }}
          hint="Position the receipt in the frame"
        />

        {/* ── receipt delete confirm ── */}
        <Modal
          visible={receiptDeleteIdx !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setReceiptDeleteIdx(null)}
        >
          <View style={st.confirmBackdrop}>
            <View style={st.confirmCard}>
              {receiptDeleteIdx !== null && receipts[receiptDeleteIdx] ? (
                <Image source={{ uri: receipts[receiptDeleteIdx] }} style={st.confirmImage} />
              ) : null}
              <Text style={st.confirmTitle}>Sure want to delete this image?</Text>
              <View style={st.confirmBtnRow}>
                <TouchableOpacity
                  style={[st.confirmBtn, st.confirmBtnYes]}
                  onPress={() => {
                    setReceipts(prev => prev.filter((_, i) => i !== receiptDeleteIdx))
                    setReceiptDeleteIdx(null)
                  }}
                >
                  <Text style={st.confirmBtnTextDark}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.confirmBtn, st.confirmBtnCancel]}
                  onPress={() => setReceiptDeleteIdx(null)}
                >
                  <Text style={st.confirmBtnTextWhite}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── note delete confirm ── */}
        <Modal
          visible={noteDeleteAsk}
          transparent
          animationType="fade"
          onRequestClose={() => setNoteDeleteAsk(false)}
        >
          <View style={st.confirmBackdrop}>
            <View style={st.confirmCard}>
              <Text style={st.confirmTitle}>Sure want to delete this note?</Text>
              {note.trim() ? (
                <View style={st.confirmNote}>
                  <Text style={st.confirmNoteText}>{note}</Text>
                </View>
              ) : null}
              <View style={st.confirmBtnRow}>
                <TouchableOpacity
                  style={[st.confirmBtn, st.confirmBtnYes]}
                  onPress={() => {
                    setNote('')
                    setNoteDraft('')
                    setNoteDeleteAsk(false)
                    setNoteDeletedToast(true)
                  }}
                >
                  <Text style={st.confirmBtnTextDark}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.confirmBtn, st.confirmBtnCancel]}
                  onPress={() => setNoteDeleteAsk(false)}
                >
                  <Text style={st.confirmBtnTextWhite}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── note deleted toast ── */}
        <Modal
          visible={noteDeletedToast}
          transparent
          animationType="fade"
          onRequestClose={() => setNoteDeletedToast(false)}
        >
          <View style={st.confirmBackdrop}>
            <View style={st.confirmCard}>
              <Text style={st.deletedEmoji}>✅</Text>
              <Text style={st.confirmTitle}>Your note is deleted</Text>
              <TouchableOpacity style={st.okayBtn} onPress={() => setNoteDeletedToast(false)}>
                <Text style={st.confirmBtnTextWhite}>Okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerSide: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 64 },
  headerBlue: { color: '#3273CD', fontSize: 18, fontWeight: '700', fontFamily: 'Nunito_700Bold' },
  headerSaveDisabled: { color: '#B7BCC3' },
  headerTitle: { fontSize: 18, fontFamily: 'Nunito_500Medium', color: '#141414' },
  scroll: { paddingHorizontal: 20 },
  andRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 8 },
  andLabel: { fontSize: 20, color: '#141414', fontFamily: 'Nunito_400Regular', lineHeight: 30 },
  andBold: { fontFamily: 'Nunito_700Bold', fontWeight: '700' },
  andChipsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D4D6DA',
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  chipAvatar: { width: 26, height: 26, borderRadius: 13 },
  chipAvatarFallback: {
    backgroundColor: '#D9E897',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipAvatarText: { fontSize: 12, fontWeight: '700', color: '#141414' },
  chipName: { fontSize: 15, fontFamily: 'Nunito_500Medium', color: '#141414', maxWidth: 120 },
  andInput: {
    flex: 1,
    minWidth: 90,
    fontSize: 20,
    fontFamily: 'Nunito_500Medium',
    color: '#141414',
    paddingVertical: 0,
  },
  underline: { height: 1, backgroundColor: '#141414', opacity: 0.7 },
  typeaheadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  optionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D9E897',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionAvatarText: { fontSize: 15, fontWeight: '700', color: '#141414' },
  optionName: { fontSize: 17, fontFamily: 'Nunito_400Regular', color: '#141414', flex: 1 },
  optionPhone: { fontSize: 12, color: '#6B6B6B' },
  typeaheadEmpty: { fontSize: 13, color: '#9CA3AF', paddingVertical: 8 },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 28 },
  catTile: {
    width: 58,
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catEmoji: { fontSize: 30 },
  catEmojiSm: { fontSize: 18 },
  dollarGlyph: { fontSize: 32, fontWeight: '700', color: '#141414' },
  fieldInputWrap: { flex: 1 },
  fieldInput: {
    fontSize: 24,
    fontFamily: 'Nunito_500Medium',
    color: '#141414',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D4D6DA',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  catOptionActive: { backgroundColor: '#F7F0BE', borderColor: '#F7F0BE' },
  catOptionLabel: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#141414' },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28 },
  paidLabel: { fontSize: 19, fontFamily: 'Nunito_400Regular', color: '#141414' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D6E7FB',
    borderRadius: 18,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
  },
  pillText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: '#141414' },
  unequalWrap: { marginTop: 16, gap: 8 },
  unequalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  unequalName: { flex: 1, fontSize: 15, fontFamily: 'Nunito_400Regular', color: '#141414' },
  unequalInput: {
    width: 110,
    height: 44,
    borderWidth: 1,
    borderColor: '#D4D6DA',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#141414',
    backgroundColor: '#FAFAFA',
  },
  unequalSum: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#6B6B6B',
    alignSelf: 'flex-end',
  },
  unequalSumBad: { color: '#EF4444' },
  utilRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28 },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D4D6DA',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
  },
  datePillText: { fontSize: 16, fontFamily: 'Nunito_600SemiBold', color: '#141414' },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D4D6DA',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  noteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F0BE',
    borderRadius: 14,
    padding: 14,
    marginTop: 24,
    gap: 8,
  },
  noteChipText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: '#141414',
    lineHeight: 21,
  },
  noteChipBold: { fontFamily: 'Nunito_700Bold', fontWeight: '700' },
  minusBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D6E7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 24 },
  receiptWrap: { alignItems: 'flex-end' },
  receiptThumb: { width: 110, height: 140, borderRadius: 6, backgroundColor: '#F3F4F5' },
  errorText: { color: '#EF4444', fontSize: 14, marginTop: 16, fontFamily: 'Nunito_400Regular' },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(250,250,250,0.82)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.14,
    shadowRadius: 48,
    elevation: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: { fontSize: 19, fontFamily: 'Nunito_600SemiBold', color: '#141414' },
  cardSave: { fontSize: 18, fontWeight: '700', fontFamily: 'Nunito_700Bold', color: '#3273CD' },
  wheelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  monthLabel: {
    fontSize: 19,
    fontWeight: '700',
    fontFamily: 'Nunito_700Bold',
    color: '#3273CD',
    textDecorationLine: 'underline',
  },
  wheelWrap: { alignItems: 'center', paddingVertical: 8, gap: 10 },
  wheelMonth: { fontSize: 18, fontFamily: 'Nunito_400Regular', color: '#9CA3AF' },
  wheelMonthActive: { color: '#3273CD', fontFamily: 'Nunito_700Bold', fontSize: 21 },
  weekRow: { flexDirection: 'row', marginTop: 6 },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    color: '#3273CD',
    fontSize: 15,
    fontFamily: 'Nunito_600SemiBold',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, height: 44, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 17, fontFamily: 'Nunito_400Regular', color: '#141414' },
  daySelected: { backgroundColor: '#3273CD', borderRadius: 17, width: 34, height: 34 },
  dayTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  noteArea: {
    backgroundColor: '#F7F0BE',
    borderRadius: 12,
    padding: 14,
    minHeight: 110,
    fontSize: 19,
    fontFamily: 'Nunito_400Regular',
    color: '#141414',
    textAlignVertical: 'top',
  },
  payerCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, gap: 4 },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(250,250,250,0.88)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  confirmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.14,
    shadowRadius: 48,
    elevation: 16,
  },
  confirmImage: {
    width: 180,
    height: 220,
    borderRadius: 8,
    marginBottom: 18,
    backgroundColor: '#F3F4F5',
  },
  confirmTitle: {
    fontSize: 21,
    fontFamily: 'Nunito_600SemiBold',
    color: '#141414',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmNote: { backgroundColor: '#F7F0BE', borderRadius: 12, padding: 14, marginBottom: 20 },
  confirmNoteText: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#141414',
    lineHeight: 22,
  },
  confirmBtnRow: { flexDirection: 'row', gap: 16 },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  confirmBtnYes: { backgroundColor: '#D6E7FB' },
  confirmBtnCancel: { backgroundColor: '#3273CD' },
  confirmBtnTextDark: { fontSize: 16, fontFamily: 'Nunito_600SemiBold', color: '#141414' },
  confirmBtnTextWhite: { fontSize: 16, fontFamily: 'Nunito_600SemiBold', color: '#FFFFFF' },
  deletedEmoji: { fontSize: 44, marginBottom: 10 },
  okayBtn: {
    backgroundColor: '#3273CD',
    borderRadius: 22,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
})
