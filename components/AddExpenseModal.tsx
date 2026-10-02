// components/AddExpenseModal.tsx
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import React, { useCallback, useEffect, useMemo } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { createExpense } from '@/lib/api/createExpense'
import { labelForMatchedPhone } from '@/lib/contacts'
import { formatAmount } from '@/lib/currency'
import type { MatchedContact } from '@/lib/supabase/contacts'
import { createExpenseWithInvites, type CreatedExpenseWithInvites } from '@/lib/supabase/invites'
import { expenseInviteMessage, inviteLink, whatsappUrl } from '@/lib/whatsapp'
import {
  dueDatePresetToIsoDate,
  useAddExpenseStore,
  type DueDatePreset,
} from '@/store/addExpenseStore'
import { useAuthStore } from '@/store/authStore'
import { useContactsStore } from '@/store/contactsStore'
import { useCurrencyStore } from '@/store/currencyStore'

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  /** When set, the expense is created inside this group. */
  groupId?: string
  groupName?: string
  /** Participant ids to preselect (group members or a single friend). */
  presetParticipantIds?: string[]
}

const CATEGORIES = [
  { id: 'general', label: 'General', emoji: '🧾' },
  { id: 'food', label: 'Food', emoji: '🍽️' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'bills', label: 'Bills', emoji: '💡' },
  { id: 'entertainment', label: 'Fun', emoji: '🎬' },
]

const DUE_PRESETS: { id: DueDatePreset; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: '1w', label: '1 week' },
  { id: '2w', label: '2 weeks' },
  { id: '1m', label: '1 month' },
]

// Equal split helper (integer cents)
function calcEqualSplits(amount: number, ids: string[]): Record<string, number> {
  const n = ids.length
  if (!n) return {}
  const cents = Math.round(amount * 100)
  const base = Math.floor(cents / n)
  const rem = cents - base * n
  const result: Record<string, number> = {}
  ids.forEach((id, i) => {
    result[id] = i === 0 ? (base + rem) / 100 : base / 100
  })
  return result
}

/**
 * After creating an expense with invites, walk the user through opening
 * WhatsApp for each invitee (one at a time — the OS allows one external app
 * open at a time). Each step can be skipped.
 */
async function openWhatsAppInvitesChain(
  items: { name: string | null; phone: string; url: string }[]
): Promise<void> {
  for (const item of items) {
    await new Promise<void>(resolve => {
      Alert.alert('Send WhatsApp invite', `Invite ${item.name || item.phone} on WhatsApp?`, [
        { text: 'Skip', style: 'cancel', onPress: () => resolve() },
        {
          text: 'Send',
          onPress: () => {
            void Linking.openURL(item.url).catch(() => {})
            resolve()
          },
        },
      ])
    })
  }
}

export default function AddExpenseModal({
  visible,
  onClose,
  onSuccess,
  groupId,
  groupName,
  presetParticipantIds,
}: Props) {
  const insets = useSafeAreaInsets()
  const user = useAuthStore(s => s.user)
  const { current: currency } = useCurrencyStore()

  const loadContacts = useContactsStore(s => s.loadContacts)
  const matchedContacts = useContactsStore(s => s.matched)
  const unmatchedContacts = useContactsStore(s => s.unmatched)
  const rawWithPhones = useContactsStore(s => s.rawWithPhones)
  const contactsLoading = useContactsStore(s => s.isLoading)
  const permissionStatus = useContactsStore(s => s.permissionStatus)

  useEffect(() => {
    if (visible) {
      void loadContacts()
    }
  }, [visible, loadContacts])

  const {
    amount,
    title,
    note,
    category,
    dueDatePreset,
    paidBy,
    participants,
    invites,
    splitType,
    exactAmounts,
    percentages,
    isSubmitting,
    setAmount,
    setTitle,
    setNote,
    setCategory,
    setDueDatePreset,
    setPaidBy,
    toggleParticipant,
    setParticipants,
    toggleInvite,
    setSplitType,
    setExactAmount,
    setPercentage,
    setSubmitting,
    reset,
  } = useAddExpenseStore()

  // Preselect participants (a friend or a whole group) each time the modal opens.
  useEffect(() => {
    if (visible && presetParticipantIds && presetParticipantIds.length > 0) {
      setParticipants(presetParticipantIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const myId = user?.id ?? ''

  const friendRows = useMemo(() => {
    const others = matchedContacts.filter(mc => mc.id !== myId)
    return [...others].sort((a, b) =>
      labelForMatchedPhone(a.phone, a.display_name, rawWithPhones).localeCompare(
        labelForMatchedPhone(b.phone, b.display_name, rawWithPhones),
        undefined,
        { sensitivity: 'base' }
      )
    )
  }, [matchedContacts, myId, rawWithPhones])

  const allParticipants = useMemo(
    () => (participants.includes(myId) ? participants : [myId, ...participants]),
    [participants, myId]
  )

  /** Device contacts NOT on SquaredSplit — invite candidates. */
  const unmatchedRows = useMemo(() => {
    return [...unmatchedContacts]
      .map(c => ({ id: c.id, name: c.name, phone: c.phones[0] }))
      .filter(c => Boolean(c.phone))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [unmatchedContacts])

  const invitedPhones = useMemo(() => new Set(invites.map(i => i.phone)), [invites])

  /** Everyone in the split: app users + WhatsApp invitees. */
  const peopleCount = allParticipants.length + invites.length

  const effectivePaidBy = paidBy ?? myId
  const amountFloat = parseFloat(amount) || 0

  const inviteSharePreview = useMemo(() => {
    if (!peopleCount || amountFloat <= 0) return 0
    return Math.floor(Math.round(amountFloat * 100) / peopleCount) / 100
  }, [peopleCount, amountFloat])

  const splitPreview = useMemo<Record<string, number>>(() => {
    if (!allParticipants.length || amountFloat <= 0) return {}

    if (splitType === 'equally') {
      return calcEqualSplits(amountFloat, allParticipants)
    }

    if (splitType === 'exact') {
      const r: Record<string, number> = {}
      allParticipants.forEach(id => {
        r[id] = parseFloat(exactAmounts[id] ?? '0') || 0
      })
      return r
    }

    if (splitType === 'percentage') {
      const r: Record<string, number> = {}
      allParticipants.forEach(id => {
        const pct = parseFloat(percentages[id] ?? '0') || 0
        r[id] = Math.round(((amountFloat * pct) / 100) * 100) / 100
      })
      return r
    }

    return {}
  }, [splitType, allParticipants, amountFloat, exactAmounts, percentages])

  const exactSumOk =
    splitType !== 'exact' ||
    Math.abs(Object.values(splitPreview).reduce((a, b) => a + b, 0) - amountFloat) < 0.02

  const pctSumOk =
    splitType !== 'percentage' ||
    Math.abs(
      allParticipants.reduce((a, id) => a + (parseFloat(percentages[id] ?? '0') || 0), 0) - 100
    ) < 0.5

  /** Invited people join with an equal share, so invites require equal split. */
  const invitesNeedEqual = invites.length > 0 && splitType !== 'equally'

  const canSubmit =
    amountFloat > 0 &&
    title.trim().length > 0 &&
    peopleCount >= 2 &&
    !isSubmitting &&
    !invitesNeedEqual &&
    exactSumOk &&
    pctSumOk

  const nameFor = useCallback(
    (id: string): string => {
      if (id === myId) return 'You'
      const m = matchedContacts.find(mc => mc.id === id)
      return m ? labelForMatchedPhone(m.phone, m.display_name, rawWithPhones) : id.slice(0, 8)
    },
    [myId, matchedContacts, rawWithPhones]
  )

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !user) return
    Keyboard.dismiss()
    setSubmitting(true)
    try {
      let createdWithInvites: CreatedExpenseWithInvites | null = null

      if (invites.length > 0) {
        // Invite flow — equal split across app users + invitees, then send
        // WhatsApp links for each invite.
        createdWithInvites = await createExpenseWithInvites({
          title: title.trim(),
          amount: amountFloat,
          paidBy: effectivePaidBy,
          participants: allParticipants,
          invites,
          groupId: groupId ?? null,
          category,
          note: note.trim() ? note.trim() : null,
          dueDate: dueDatePresetToIsoDate(dueDatePreset),
        })
      } else {
        await createExpense({
          title: title.trim(),
          amount: amountFloat,
          paid_by: effectivePaidBy,
          participants: allParticipants,
          split_type: splitType,
          category,
          note: note.trim() ? note.trim() : null,
          due_date: dueDatePresetToIsoDate(dueDatePreset),
          group_id: groupId ?? null,
          exact_amounts: splitType === 'exact' ? { ...splitPreview } : undefined,
          percentages:
            splitType === 'percentage'
              ? Object.fromEntries(
                  allParticipants.map(id => [id, parseFloat(percentages[id] ?? '0') || 0])
                )
              : undefined,
        })
      }

      reset()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      onSuccess()
      onClose()

      if (createdWithInvites && createdWithInvites.invites.length > 0) {
        const inviterName = user.user_metadata?.full_name?.trim() || 'A friend'
        await openWhatsAppInvitesChain(
          createdWithInvites.invites.map(i => ({
            name: i.name,
            phone: i.phone,
            url: whatsappUrl(
              i.phone,
              expenseInviteMessage({
                inviterName,
                expenseTitle: createdWithInvites.title,
                amountLabel: formatAmount(createdWithInvites.amount, currency),
                shareLabel: formatAmount(i.share_amount, currency),
                link: inviteLink(i.invite_id),
              })
            ),
          }))
        )
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create expense'
      console.error('[SS-021] createExpense', message)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      Alert.alert('Could not create expense', message)
    } finally {
      setSubmitting(false)
    }
  }, [
    canSubmit,
    user,
    invites,
    title,
    note,
    category,
    dueDatePreset,
    groupId,
    amountFloat,
    effectivePaidBy,
    allParticipants,
    splitType,
    splitPreview,
    percentages,
    currency,
    reset,
    onSuccess,
    onClose,
    setSubmitting,
  ])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[s.root, { paddingTop: insets.top + 16 }]}>
            {/* Header */}
            <View style={s.header}>
              <View style={s.headerTitleWrap}>
                <Text style={s.headerTitle}>Add Expense</Text>
                {groupName ? (
                  <View style={s.groupChip}>
                    <Text style={s.groupChipText} numberOfLines={1}>
                      👥 {groupName}
                    </Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <Text style={s.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={s.scroll}
              contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Amount */}
              <View style={s.amountRow}>
                <Text style={s.currencySymbol}>{currency.symbol}</Text>
                <TextInput
                  style={s.amountInput}
                  value={amount}
                  onChangeText={v => {
                    if (/^\d*\.?\d{0,2}$/.test(v)) setAmount(v)
                  }}
                  placeholder="0.00"
                  placeholderTextColor="#C7C7C7"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  accessibilityLabel="Expense amount"
                />
              </View>

              {/* Description */}
              <View style={s.section}>
                <Text style={s.label}>Description</Text>
                <TextInput
                  style={s.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Dinner at Nobu"
                  placeholderTextColor="#C7C7C7"
                  maxLength={100}
                  returnKeyType="done"
                  accessibilityLabel="Expense description"
                />
              </View>

              {/* Category */}
              <View style={s.section}>
                <Text style={s.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.pillRow}>
                    {CATEGORIES.map(c => (
                      <Pressable
                        key={c.id}
                        style={[s.pill, category === c.id && s.pillActive]}
                        onPress={() => setCategory(c.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: category === c.id }}
                      >
                        <Text style={[s.pillText, category === c.id && s.pillTextActive]}>
                          {c.emoji} {c.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Due date */}
              <View style={s.section}>
                <Text style={s.label}>Pay back by</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.pillRow}>
                    {DUE_PRESETS.map(d => (
                      <Pressable
                        key={d.id}
                        style={[s.pill, dueDatePreset === d.id && s.pillActive]}
                        onPress={() => setDueDatePreset(d.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: dueDatePreset === d.id }}
                      >
                        <Text style={[s.pillText, dueDatePreset === d.id && s.pillTextActive]}>
                          {d.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Paid by */}
              <View style={s.section}>
                <Text style={s.label}>Paid by</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.pillRow}>
                    {[myId, ...allParticipants.filter(id => id !== myId)].map(id => (
                      <Pressable
                        key={id}
                        style={[s.pill, effectivePaidBy === id && s.pillActive]}
                        onPress={() => setPaidBy(id)}
                      >
                        <Text style={[s.pillText, effectivePaidBy === id && s.pillTextActive]}>
                          {nameFor(id)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Participants */}
              <View style={s.section}>
                <Text style={s.label}>
                  Participants
                  <Text style={s.labelSub}> · {allParticipants.length} selected</Text>
                </Text>

                {/* You */}
                <View style={[s.contactRow, { opacity: 0.5 }]}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>
                      {(user?.user_metadata?.full_name ?? 'Y')[0].toUpperCase()}
                    </Text>
                  </View>
                  <Text style={s.contactName}>You (always included)</Text>
                  <View style={[s.checkbox, s.checkboxChecked]}>
                    <Text style={s.checkmark}>✓</Text>
                  </View>
                </View>

                {contactsLoading && friendRows.length === 0 ? (
                  <View style={s.contactsLoading}>
                    <ActivityIndicator color="#3273CD" />
                    <Text style={s.contactsLoadingText}>Loading people from your contacts…</Text>
                  </View>
                ) : permissionStatus === 'denied' ? (
                  <View style={s.contactsEmptyBlock}>
                    <Text style={s.noContacts}>
                      Contacts are off. Allow access to pick friends who use SquaredSplit.
                    </Text>
                    <TouchableOpacity
                      onPress={() => void Linking.openSettings()}
                      style={s.openSettingsBtn}
                      activeOpacity={0.85}
                    >
                      <Text style={s.openSettingsText}>Open Settings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => void loadContacts()} activeOpacity={0.85}>
                      <Text style={s.retryContacts}>Try again</Text>
                    </TouchableOpacity>
                  </View>
                ) : permissionStatus === 'unavailable' ? (
                  <Text style={s.noContacts}>
                    Contacts are not available in this build. Use a dev build with expo-contacts
                    enabled.
                  </Text>
                ) : friendRows.length === 0 ? (
                  <View style={s.contactsEmptyBlock}>
                    <Text style={s.noContacts}>
                      No one from your contacts is on SquaredSplit yet. Add friends from the Home
                      screen when they join.
                    </Text>
                    <TouchableOpacity onPress={() => void loadContacts()} activeOpacity={0.85}>
                      <Text style={s.retryContacts}>Refresh contacts</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  friendRows.map((mc: MatchedContact) => {
                    const contactId = mc.id
                    const contactName = labelForMatchedPhone(
                      mc.phone,
                      mc.display_name,
                      rawWithPhones
                    )
                    const selected = allParticipants.includes(contactId)

                    return (
                      <Pressable
                        key={contactId}
                        style={s.contactRow}
                        onPress={() => toggleParticipant(contactId)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                      >
                        {mc.avatar_url ? (
                          <Image
                            source={{ uri: mc.avatar_url }}
                            style={s.avatarImg}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={s.avatar}>
                            <Text style={s.avatarText}>{contactName[0].toUpperCase()}</Text>
                          </View>
                        )}
                        <Text style={s.contactName}>{contactName}</Text>
                        <View style={[s.checkbox, selected && s.checkboxChecked]}>
                          {selected && <Text style={s.checkmark}>✓</Text>}
                        </View>
                      </Pressable>
                    )
                  })
                )}
              </View>

              {/* Invite via WhatsApp — contacts not on SquaredSplit */}
              {unmatchedRows.length > 0 && (
                <View style={s.section}>
                  <Text style={s.label}>
                    Not on SquaredSplit
                    <Text style={s.labelSub}> · invite via WhatsApp</Text>
                  </Text>
                  {unmatchedRows.map(c => {
                    const selected = invitedPhones.has(c.phone)
                    return (
                      <Pressable
                        key={c.id}
                        style={s.contactRow}
                        onPress={() => toggleInvite({ phone: c.phone, name: c.name })}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                      >
                        <View style={[s.avatar, { backgroundColor: '#FEF3E8' }]}>
                          <Text style={s.avatarText}>{c.name[0]?.toUpperCase() ?? '?'}</Text>
                        </View>
                        <View style={s.inviteNameBlock}>
                          <Text style={s.contactName} numberOfLines={1}>
                            {c.name}
                          </Text>
                          <Text style={s.invitePhoneHint}>Invite on WhatsApp</Text>
                        </View>
                        <View style={[s.checkbox, selected && s.checkboxChecked]}>
                          {selected && <Text style={s.checkmark}>✓</Text>}
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              )}

              {/* Split toggle */}
              <View style={s.section}>
                <Text style={s.label}>Split</Text>
                <View style={s.splitToggle}>
                  {(['equally', 'exact', 'percentage'] as const).map(t => (
                    <Pressable
                      key={t}
                      style={[s.splitOption, splitType === t && s.splitOptionActive]}
                      onPress={() => setSplitType(t)}
                    >
                      <Text style={[s.splitOptionText, splitType === t && s.splitOptionTextActive]}>
                        {
                          {
                            equally: 'Equally',
                            exact: `Exact ${currency.symbol}`,
                            percentage: 'By %',
                          }[t]
                        }
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Preview */}
              {peopleCount >= 2 && amountFloat > 0 && (
                <View style={s.section}>
                  <Text style={s.label}>Preview</Text>
                  {allParticipants.map(id => (
                    <View key={id} style={s.previewRow}>
                      <View style={s.previewAvatar}>
                        <Text style={s.previewAvatarText}>{nameFor(id)[0].toUpperCase()}</Text>
                      </View>
                      <Text style={s.previewName}>{nameFor(id)}</Text>

                      {splitType === 'equally' && (
                        <Text style={s.previewAmount}>
                          {formatAmount(splitPreview[id] ?? 0, currency)}
                        </Text>
                      )}

                      {splitType === 'exact' && (
                        <TextInput
                          style={s.splitInput}
                          value={exactAmounts[id] ?? ''}
                          onChangeText={v => {
                            if (/^\d*\.?\d{0,2}$/.test(v)) setExactAmount(id, v)
                          }}
                          placeholder="0.00"
                          placeholderTextColor="#C7C7C7"
                          keyboardType="decimal-pad"
                          accessibilityLabel={`Amount for ${nameFor(id)}`}
                        />
                      )}

                      {splitType === 'percentage' && (
                        <View style={s.pctRow}>
                          <TextInput
                            style={[s.splitInput, { width: 64 }]}
                            value={percentages[id] ?? ''}
                            onChangeText={v => {
                              if (/^\d{0,3}(\.\d{0,1})?$/.test(v)) setPercentage(id, v)
                            }}
                            placeholder="0"
                            placeholderTextColor="#C7C7C7"
                            keyboardType="decimal-pad"
                            accessibilityLabel={`Percentage for ${nameFor(id)}`}
                          />
                          <Text style={s.pctSymbol}>%</Text>
                          <Text style={s.previewAmount}>
                            ≈ {formatAmount(splitPreview[id] ?? 0, currency)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}

                  {invites.map(i => (
                    <View key={i.phone} style={s.previewRow}>
                      <View style={[s.previewAvatar, { backgroundColor: '#FEF3E8' }]}>
                        <Text style={s.previewAvatarText}>
                          {(i.name?.[0] ?? '?').toUpperCase()}
                        </Text>
                      </View>
                      <View style={s.inviteNameBlock}>
                        <Text style={s.previewName} numberOfLines={1}>
                          {i.name || i.phone}
                        </Text>
                        <Text style={s.invitePhoneHint}>will be invited</Text>
                      </View>
                      {splitType === 'equally' && (
                        <Text style={s.previewAmount}>
                          {formatAmount(inviteSharePreview, currency)}
                        </Text>
                      )}
                    </View>
                  ))}

                  {splitType === 'exact' && !exactSumOk && (
                    <Text style={s.validationError}>
                      Total must equal {formatAmount(amountFloat, currency)}
                    </Text>
                  )}
                  {splitType === 'percentage' && !pctSumOk && (
                    <Text style={s.validationError}>Percentages must sum to 100%</Text>
                  )}
                  {invitesNeedEqual && (
                    <Text style={s.validationError}>
                      Invited friends split equally — switch to “Equally”
                    </Text>
                  )}
                </View>
              )}

              {peopleCount < 2 && (
                <Text style={s.hint}>Select a friend or invite a contact to split with</Text>
              )}

              {/* Note */}
              <View style={s.section}>
                <Text style={s.label}>Note (optional)</Text>
                <TextInput
                  style={[s.textInput, s.noteInput]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a note for the group…"
                  placeholderTextColor="#C7C7C7"
                  maxLength={500}
                  multiline
                  accessibilityLabel="Expense note"
                />
              </View>
            </ScrollView>

            {/* Submit */}
            <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.submitBtnText}>
                    {amountFloat > 0
                      ? `Add ${formatAmount(amountFloat, currency)} expense`
                      : 'Add Expense'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#141414' },
  groupChip: {
    backgroundColor: '#F3F4F5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  groupChipText: { fontSize: 12, fontWeight: '600', color: '#6B6B6B' },
  closeBtn: { fontSize: 18, color: '#6B6B6B', padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#141414',
    marginBottom: 28,
    paddingBottom: 8,
  },
  currencySymbol: { fontSize: 32, fontWeight: '300', color: '#141414', marginRight: 4 },
  amountInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: '700',
    color: '#141414',
    padding: 0,
    includeFontPadding: false,
  },
  section: { marginBottom: 24 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6B6B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  labelSub: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
    textTransform: 'none',
    letterSpacing: 0,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#141414',
  },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  pillActive: { borderColor: '#141414', backgroundColor: '#141414' },
  pillText: { fontSize: 13, fontWeight: '500', color: '#6B6B6B' },
  pillTextActive: { color: '#FFFFFF' },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: '#141414' },
  contactName: { flex: 1, fontSize: 15, color: '#141414' },
  inviteNameBlock: { flex: 1, minWidth: 0, gap: 2 },
  invitePhoneHint: { fontSize: 12, color: '#9CA3AF' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#141414', borderColor: '#141414' },
  checkmark: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  contactsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  contactsLoadingText: { fontSize: 14, color: '#6B6B6B', flex: 1 },
  contactsEmptyBlock: { gap: 10, paddingVertical: 8 },
  noContacts: { fontSize: 14, color: '#9CA3AF', lineHeight: 20 },
  openSettingsBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  openSettingsText: { fontSize: 16, fontWeight: '700', color: '#3273CD' },
  retryContacts: { fontSize: 14, fontWeight: '600', color: '#141414', paddingVertical: 4 },
  splitToggle: { flexDirection: 'row', backgroundColor: '#F3F4F5', borderRadius: 10, padding: 3 },
  splitOption: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  splitOptionActive: { backgroundColor: '#141414' },
  splitOptionText: { fontSize: 13, fontWeight: '500', color: '#6B6B6B' },
  splitOptionTextActive: { color: '#FFFFFF' },
  previewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  previewAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewAvatarText: { fontSize: 12, fontWeight: '600', color: '#141414' },
  previewName: { flex: 1, fontSize: 14, color: '#141414' },
  previewAmount: { fontSize: 14, fontWeight: '600', color: '#141414' },
  splitInput: {
    width: 80,
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#141414',
    textAlign: 'right',
  },
  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pctSymbol: { fontSize: 14, color: '#6B6B6B' },
  validationError: { fontSize: 12, color: '#EF4444', marginTop: 6 },
  hint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
  noteInput: { height: 84, textAlignVertical: 'top', paddingTop: 12 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F5',
    backgroundColor: '#FFFFFF',
  },
  submitBtn: {
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#D1D5DB' },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
})
