// components/CreateGroupModal.tsx
import * as Haptics from 'expo-haptics'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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

import { labelForMatchedPhone } from '@/lib/contacts'
import type { MatchedContact } from '@/lib/supabase/contacts'
import { createGroup } from '@/lib/supabase/groups'
import { useContactsStore } from '@/store/contactsStore'

const EMOJIS = ['👥', '🏠', '🍜', '🎯', '🏖️', '🎉', '🚗', '⚽', '🎬', '🛒', '✈️', '🎓']

interface Props {
  visible: boolean
  onClose: () => void
  onCreated: (groupId: string) => void
}

export default function CreateGroupModal({ visible, onClose, onCreated }: Props) {
  const insets = useSafeAreaInsets()

  const loadContacts = useContactsStore(s => s.loadContacts)
  const matched = useContactsStore(s => s.matched)
  const rawWithPhones = useContactsStore(s => s.rawWithPhones)
  const contactsLoading = useContactsStore(s => s.isLoading)

  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState<string>('👥')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (visible) void loadContacts()
  }, [visible, loadContacts])

  useEffect(() => {
    if (!visible) {
      setName('')
      setEmoji('👥')
      setSelectedIds([])
      setIsSubmitting(false)
    }
  }, [visible])

  const rows = useMemo(() => {
    return [...matched].sort((a, b) =>
      labelForMatchedPhone(a.phone, a.display_name, rawWithPhones)
        .toLowerCase()
        .localeCompare(labelForMatchedPhone(b.phone, b.display_name, rawWithPhones).toLowerCase())
    )
  }, [matched, rawWithPhones])

  const canSubmit = name.trim().length > 0 && selectedIds.length >= 1 && !isSubmitting

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      const { data, error } = await createGroup(name.trim(), selectedIds, emoji)
      if (error || !data) {
        Alert.alert('Could not create group', error ?? 'Please try again.')
        return
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      onCreated(data.id)
      onClose()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Please try again.'
      Alert.alert('Could not create group', message)
    } finally {
      setIsSubmitting(false)
    }
  }, [canSubmit, name, selectedIds, emoji, onCreated, onClose])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[s.root, { paddingTop: insets.top + 16 }]}>
          <View style={s.header}>
            <Text style={s.headerTitle}>Create group</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={s.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.section}>
              <Text style={s.label}>Group name</Text>
              <TextInput
                style={s.textInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Goa trip"
                placeholderTextColor="#C7C7C7"
                maxLength={60}
                returnKeyType="done"
                accessibilityLabel="Group name"
              />
            </View>

            <View style={s.section}>
              <Text style={s.label}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.emojiRow}>
                  {EMOJIS.map(e => (
                    <Pressable
                      key={e}
                      style={[s.emojiOption, emoji === e && s.emojiOptionActive]}
                      onPress={() => setEmoji(e)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: emoji === e }}
                    >
                      <Text style={s.emojiText}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={s.section}>
              <Text style={s.label}>
                Members
                <Text style={s.labelSub}> · {selectedIds.length} selected</Text>
              </Text>

              {contactsLoading && rows.length === 0 ? (
                <View style={s.contactsLoading}>
                  <ActivityIndicator color="#3273CD" />
                  <Text style={s.contactsLoadingText}>Loading people from your contacts…</Text>
                </View>
              ) : rows.length === 0 ? (
                <Text style={s.noContacts}>
                  No one from your contacts is on SquaredSplit yet. Invite friends to create a
                  group.
                </Text>
              ) : (
                rows.map((mc: MatchedContact) => {
                  const label = labelForMatchedPhone(mc.phone, mc.display_name, rawWithPhones)
                  const selected = selectedIds.includes(mc.id)
                  return (
                    <Pressable
                      key={mc.id}
                      style={s.contactRow}
                      onPress={() => toggle(mc.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      <View style={[s.checkbox, selected && s.checkboxChecked]}>
                        {selected && <Text style={s.checkmark}>✓</Text>}
                      </View>
                      <Text style={s.contactName}>{label}</Text>
                    </Pressable>
                  )
                })
              )}
            </View>

            {selectedIds.length < 1 && (
              <Text style={s.hint}>Select at least 1 member for the group</Text>
            )}
          </ScrollView>

          <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.submitBtnText}>Create group</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#141414' },
  closeBtn: { fontSize: 18, color: '#6B6B6B', padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16 },
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
  emojiRow: { flexDirection: 'row', gap: 8 },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiOptionActive: { borderColor: '#141414', backgroundColor: '#F3F4F5' },
  emojiText: { fontSize: 22 },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
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
  contactName: { flex: 1, fontSize: 15, color: '#141414' },
  contactsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  contactsLoadingText: { fontSize: 14, color: '#6B6B6B', flex: 1 },
  noContacts: { fontSize: 14, color: '#9CA3AF', lineHeight: 20 },
  hint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
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
