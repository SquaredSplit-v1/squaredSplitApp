import { BlurView } from 'expo-blur'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import { labelForMatchedPhone } from '@/lib/contacts'
import { searchProfileByPhone, type MatchedContact } from '@/lib/supabase/contacts'
import { appInviteMessage, whatsappDigits, whatsappUrl } from '@/lib/whatsapp'
import { useAuthStore } from '@/store/authStore'
import { useContactsStore } from '@/store/contactsStore'

const { height: SCREEN_H } = Dimensions.get('window')

interface Props {
  visible: boolean
  onClose: () => void
  onSelect: (id: string) => void
}

function CaretLeftIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.25 7.25L9.75 12l4.5 4.75"
        stroke="#3273CD"
        strokeWidth={1.75}
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
        d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16.5 16.5L21 21"
        stroke="#141414"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function RadioControl({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <View style={styles.radioSelectedWrap}>
        <View style={styles.radioOuterSelected}>
          <View style={styles.radioInnerDot} />
        </View>
      </View>
    )
  }
  return (
    <View style={styles.radioUnselectedWrap}>
      <View style={styles.radioOuterIdle} />
    </View>
  )
}

export default function AddFriendModal({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets()
  const loadContacts = useContactsStore(s => s.loadContacts)
  const matched = useContactsStore(s => s.matched)
  const rawWithPhones = useContactsStore(s => s.rawWithPhones)
  const isLoading = useContactsStore(s => s.isLoading)
  const permissionStatus = useContactsStore(s => s.permissionStatus)

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [phoneResult, setPhoneResult] = useState<MatchedContact | null>(null)
  const [phoneSearching, setPhoneSearching] = useState(false)

  const userId = useAuthStore(s => s.user?.id)

  useEffect(() => {
    if (!visible) {
      setQuery('')
      setSelectedId(null)
      setPhoneResult(null)
      setPhoneSearching(false)
    }
  }, [visible])

  // Direct phone-number search (works even when the person is not in the
  // device address book). Debounced; degrades to an app invite when the
  // number belongs to no one.
  const digits = query.replace(/\D/g, '')
  const phoneMode = digits.length >= 7 && query.replace(/[\d\s+\-()]/g, '').length === 0

  useEffect(() => {
    if (!visible || !phoneMode) {
      setPhoneResult(null)
      setPhoneSearching(false)
      return
    }
    let cancelled = false
    setPhoneSearching(true)
    const timer = setTimeout(() => {
      void searchProfileByPhone(digits).then(({ data }) => {
        if (cancelled) return
        setPhoneResult(data)
        setPhoneSearching(false)
      })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [visible, digits, phoneMode])

  const handleInvite = useCallback(async () => {
    const waDigits = whatsappDigits(query)
    if (!waDigits || !userId) return
    let inviterName = 'A friend'
    try {
      const { getProfile } = await import('@/lib/supabase/profile')
      const profile = await getProfile(userId)
      if (profile?.full_name) inviterName = profile.full_name
    } catch {
      // keep fallback name
    }
    const url = whatsappUrl(waDigits, appInviteMessage(inviterName))
    void Linking.openURL(url)
  }, [query, userId])

  useEffect(() => {
    if (visible) {
      void loadContacts()
    }
  }, [visible, loadContacts])

  const rows = useMemo(() => {
    const sorted = [...matched].sort((a, b) => {
      const na = labelForMatchedPhone(a.phone, a.display_name, rawWithPhones).toLowerCase()
      const nb = labelForMatchedPhone(b.phone, b.display_name, rawWithPhones).toLowerCase()
      return na.localeCompare(nb)
    })
    if (!query.trim()) return sorted
    const q = query.trim().toLowerCase()
    return sorted.filter(m => {
      const label = labelForMatchedPhone(m.phone, m.display_name, rawWithPhones).toLowerCase()
      return label.includes(q)
    })
  }, [matched, query, rawWithPhones])

  const emptyMessage = useMemo(() => {
    if (isLoading) return 'Loading contacts…'
    if (permissionStatus === 'denied') {
      return 'Contacts access is off. Enable it in Settings to find friends from your phone.'
    }
    if (permissionStatus === 'unavailable') {
      return 'Contacts are not available in this build.'
    }
    if (matched.length === 0) {
      return 'No one from your contacts is on SquaredSplit yet.'
    }
    return 'No matches for your search.'
  }, [isLoading, permissionStatus, matched.length])

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        {permissionStatus === 'denied' && (
          <TouchableOpacity
            style={styles.openSettingsBtn}
            onPress={() => void Linking.openSettings()}
            activeOpacity={0.85}
          >
            <Text style={styles.openSettingsText}>Open Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [emptyMessage, permissionStatus]
  )

  const handleNext = useCallback(() => {
    if (selectedId) onSelect(selectedId)
  }, [onSelect, selectedId])

  const renderItem = useCallback(
    ({ item }: { item: MatchedContact }) => {
      const label = labelForMatchedPhone(item.phone, item.display_name, rawWithPhones)
      const selected = selectedId === item.id
      return (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => setSelectedId(item.id)}
        >
          <View style={styles.rowLeft}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{(label[0] || '?').toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.name} numberOfLines={2}>
              {label}
            </Text>
          </View>
          <RadioControl selected={selected} />
        </Pressable>
      )
    },
    [rawWithPhones, selectedId]
  )

  const maxCardH = SCREEN_H - insets.top - insets.bottom - 48

  /** Direct phone-number search result / app-invite fallback (search by number). */
  const phoneSection = useMemo(() => {
    if (!phoneMode) return null
    if (phoneSearching) {
      return (
        <View style={styles.phoneRow}>
          <ActivityIndicator size="small" color="#3273CD" />
          <Text style={styles.phoneHint}>Searching…</Text>
        </View>
      )
    }
    if (phoneResult) {
      const selected = selectedId === phoneResult.id
      return (
        <Pressable
          style={({ pressed }) => [styles.row, styles.phoneRowCard, pressed && styles.rowPressed]}
          onPress={() => setSelectedId(phoneResult.id)}
        >
          <View style={styles.rowLeft}>
            {phoneResult.avatar_url ? (
              <Image source={{ uri: phoneResult.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {(phoneResult.display_name?.[0] || '?').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {phoneResult.display_name}
              </Text>
              <Text style={styles.phoneSubtitle}>On SquaredSplit · {phoneResult.phone}</Text>
            </View>
          </View>
          <RadioControl selected={selected} />
        </Pressable>
      )
    }
    const waDigits = whatsappDigits(query)
    if (!waDigits) return null
    return (
      <View style={styles.phoneRowCard}>
        <Text style={styles.phoneHint}>Not on SquaredSplit yet</Text>
        <TouchableOpacity
          style={styles.inviteBtn}
          onPress={() => void handleInvite()}
          accessibilityRole="button"
          accessibilityLabel="Invite on WhatsApp"
        >
          <Text style={styles.inviteBtnText}>Invite on WhatsApp</Text>
        </TouchableOpacity>
      </View>
    )
  }, [phoneMode, phoneSearching, phoneResult, selectedId, query, handleInvite])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.backdropTint]} />
        )}

        <View
          style={[
            styles.cardWrap,
            {
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={[styles.card, { maxHeight: maxCardH, flex: 1 }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.headerLeft} hitSlop={12}>
                <CaretLeftIcon />
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={1}>
                Add friend
              </Text>
              <TouchableOpacity
                onPress={handleNext}
                disabled={!selectedId}
                style={styles.headerRight}
                hitSlop={12}
              >
                <Text style={[styles.next, !selectedId && styles.nextDisabled]}>Next</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchBlock}>
              <View style={styles.searchRow}>
                <SearchIcon />
                <TextInput
                  style={styles.searchInput}
                  placeholder={phoneMode ? 'Searching by number…' : 'Enter name or phone number'}
                  placeholderTextColor="#9CA3AF"
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.searchUnderline} />
            </View>

            {isLoading && rows.length === 0 && !phoneMode ? (
              <View style={styles.loader}>
                <ActivityIndicator color="#3273CD" />
              </View>
            ) : (
              <FlatList
                data={rows}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={renderItem}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={listEmpty}
                ListHeaderComponent={phoneSection}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdropTint: {
    backgroundColor: 'rgba(15, 15, 20, 0.45)',
  },
  cardWrap: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 51,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    minWidth: 52,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerRight: {
    minWidth: 52,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#141414',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    fontWeight: '600',
    lineHeight: 19.2,
  },
  next: {
    textAlign: 'right',
    color: '#3273CD',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 24,
  },
  nextDisabled: {
    opacity: 0.4,
  },
  searchBlock: {
    gap: 7,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
    color: '#141414',
    paddingVertical: 0,
  },
  searchUnderline: {
    height: 1,
    backgroundColor: '#141414',
    width: '100%',
    opacity: 0.85,
  },
  loader: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 120,
  },
  listContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: '#D9E897',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#141414',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
  },
  name: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 16,
    color: '#141414',
    flexShrink: 1,
  },
  radioUnselectedWrap: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterIdle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6B6B6B',
  },
  radioSelectedWrap: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3273CD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyWrap: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#9CA3AF',
    lineHeight: 20,
    textAlign: 'center',
  },
  openSettingsBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  openSettingsText: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#3273CD',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  phoneRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  phoneSubtitle: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#6B6B6B',
    marginTop: 2,
  },
  phoneHint: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: '#6B6B6B',
  },
  inviteBtn: {
    backgroundColor: '#141414',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inviteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
  },
})
