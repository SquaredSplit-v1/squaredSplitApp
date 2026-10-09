/**
 * Bottom-sheet components for the Account tab: Permission Ledger, Blocklist,
 * Language / Time zone pickers, SquaredSplit Pro, My QR code, QR scanner,
 * Contact us. All are presentation + light data, sharing one style block.
 */
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Contacts from 'expo-contacts'
import * as ImagePicker from 'expo-image-picker'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SUPPORT_EMAIL } from '@/lib/constants'
import {
  getBlocklist,
  getQrProfile,
  profileIdFromQr,
  qrPayloadForProfile,
  unblockUser,
  type BlockedProfile,
} from '@/lib/supabase/account'
import { useAuthStore } from '@/store/authStore'
import { usePendingSplitStore } from '@/store/pendingSplitStore'

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/initials/png?seed='

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={s.sheetHeader}>
      <Text style={s.sheetTitle}>{title}</Text>
      <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
        <Text style={s.sheetClose}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Permission Ledger ────────────────────────────────────────────────────────

interface PermissionRow {
  key: string
  label: string
  why: string
  status: 'granted' | 'denied' | 'undetermined'
}

export function PermissionLedgerSheet({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const [rows, setRows] = useState<PermissionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    const [contacts, camera, library, notifications] = await Promise.all([
      Contacts.getPermissionsAsync(),
      ImagePicker.getCameraPermissionsAsync(),
      ImagePicker.getMediaLibraryPermissionsAsync(),
      Notifications.getPermissionsAsync(),
    ])
    const map = (p: { granted: boolean; canAskAgain: boolean }): PermissionRow['status'] =>
      p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied'
    setRows([
      {
        key: 'contacts',
        label: 'Contacts',
        why: 'Find friends already on SquaredSplit',
        status: map(contacts),
      },
      {
        key: 'camera',
        label: 'Camera',
        why: 'Capture receipts and scan QR codes',
        status: map(camera),
      },
      {
        key: 'photos',
        label: 'Photo library',
        why: 'Attach receipts and choose a profile photo',
        status: map(library),
      },
      {
        key: 'notifications',
        label: 'Notifications',
        why: 'Expense requests and settle-up nudges',
        status: map(
          notifications.granted
            ? { granted: true, canAskAgain: true }
            : { granted: false, canAskAgain: notifications.canAskAgain }
        ),
      },
    ])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (visible) void load()
  }, [visible, load])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.sheetBody, { paddingTop: insets.top + 16 }]}>
        <SheetHeader title="Permission ledger" onClose={onClose} />
        <Text style={s.sheetIntro}>
          Everything SquaredSplit can access on your device, and why. Change any of it in system
          settings at any time.
        </Text>
        {isLoading ? (
          <ActivityIndicator color="#6B6B6B" style={{ marginTop: 24 }} />
        ) : (
          rows.map(r => (
            <View key={r.key} style={s.permRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.permLabel}>{r.label}</Text>
                <Text style={s.permWhy}>{r.why}</Text>
              </View>
              <View style={[s.permChip, r.status === 'granted' ? s.permChipGreen : s.permChipGray]}>
                <Text style={s.permChipText}>
                  {r.status === 'granted' ? 'Granted' : r.status === 'denied' ? 'Off' : 'Not asked'}
                </Text>
              </View>
            </View>
          ))
        )}
        <TouchableOpacity style={s.sheetPrimaryBtn} onPress={() => void Linking.openSettings()}>
          <Text style={s.sheetPrimaryBtnText}>Open system settings</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

// ── Blocklist ────────────────────────────────────────────────────────────────

export function BlocklistSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const [blocked, setBlocked] = useState<BlockedProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    setBlocked(await getBlocklist())
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (visible) void load()
  }, [visible, load])

  const handleUnblock = (userId: string, name: string) => {
    Alert.alert('Unblock', `Allow ${name} to split with you again?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          await unblockUser(userId)
          await load()
        },
      },
    ])
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.sheetBody, { paddingTop: insets.top + 16 }]}>
        <SheetHeader title="Blocked accounts" onClose={onClose} />
        <Text style={s.sheetIntro}>
          Blocked accounts cannot be added to your splits or groups. They also cannot add you to
          theirs.
        </Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {isLoading ? (
            <ActivityIndicator color="#6B6B6B" style={{ marginTop: 24 }} />
          ) : blocked.length === 0 ? (
            <Text style={s.emptyText}>No blocked accounts.</Text>
          ) : (
            blocked.map(b => (
              <View key={b.userId} style={s.permRow}>
                <Image
                  source={{ uri: b.avatarUrl ?? `${DEFAULT_AVATAR}${encodeURIComponent(b.name)}` }}
                  style={s.miniAvatar}
                />
                <Text style={s.permLabel}>{b.name}</Text>
                <TouchableOpacity
                  style={s.unblockBtn}
                  onPress={() => handleUnblock(b.userId, b.name)}
                >
                  <Text style={s.unblockText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Generic list picker (language / time zone) ───────────────────────────────

export function OptionPickerSheet({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean
  title: string
  options: { id: string; label: string }[]
  selectedId: string | null
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.sheetBody, { paddingTop: insets.top + 16 }]}>
        <SheetHeader title={title} onClose={onClose} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {options.map(o => (
            <TouchableOpacity
              key={o.id}
              style={[s.optionRow, o.id === selectedId && s.optionRowActive]}
              onPress={() => {
                onSelect(o.id)
                onClose()
              }}
            >
              <Text style={s.optionLabel}>{o.label}</Text>
              {o.id === selectedId && <Text style={s.optionCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── SquaredSplit Pro ─────────────────────────────────────────────────────────

export function ProSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.sheetBody, { paddingTop: insets.top + 16 }]}>
        <SheetHeader title="SquaredSplit Pro" onClose={onClose} />
        <View style={s.proCard}>
          <Text style={s.proEmoji}>✦</Text>
          <Text style={s.proTitle}>Do more with SquaredSplit Pro</Text>
          <View style={{ gap: 10, alignSelf: 'stretch' }}>
            {[
              'Unlimited groups & splits',
              'Advanced agreement templates',
              'Exportable settle-up reports',
              'Priority AI settle-up nudges',
            ].map(f => (
              <Text key={f} style={s.proFeature}>
                ✓ {f}
              </Text>
            ))}
          </View>
          <Text style={s.proComingSoon}>Subscriptions open at public launch</Text>
        </View>
      </View>
    </Modal>
  )
}

// ── My QR code ───────────────────────────────────────────────────────────────

export function MyCodeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const user = useAuthStore(s => s.user)
  const [name, setName] = useState('')

  useEffect(() => {
    if (!visible || !user?.id) return
    void (async () => {
      const { supabase } = await import('@/lib/supabase/client')
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      setName((data as { full_name?: string | null })?.full_name ?? 'SquaredSplit user')
    })()
  }, [visible, user?.id])

  if (!user?.id) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.sheetBody, { paddingTop: insets.top + 16, alignItems: 'center' }]}>
        <SheetHeader title="My code" onClose={onClose} />
        <Text style={s.sheetIntro}>
          Friends scan this with their camera to start splitting with you instantly.
        </Text>
        <View style={s.qrCard}>
          <QRCode
            value={qrPayloadForProfile(user.id)}
            size={220}
            color="#141414"
            backgroundColor="#FFFFFF"
          />
          <Text style={s.qrName}>{name}</Text>
        </View>
      </View>
    </Modal>
  )
}

// ── QR scanner ───────────────────────────────────────────────────────────────

export function QrScannerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const [scannedId, setScannedId] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ name: string; avatarUrl: string | null } | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const setPendingSplit = usePendingSplitStore(s => s.set)

  useEffect(() => {
    if (visible) {
      setScannedId(null)
      setProfile(null)
      setNotFound(false)
    }
  }, [visible])

  const handleScan = useCallback(
    async (data: string) => {
      const id = profileIdFromQr(data)
      if (!id || scannedId) return
      setScannedId(id)
      setLookingUp(true)
      const p = await getQrProfile(id)
      setLookingUp(false)
      if (!p) {
        setNotFound(true)
        return
      }
      setProfile({ name: p.name, avatarUrl: p.avatarUrl })
    },
    [scannedId]
  )

  const startSplit = () => {
    if (!scannedId || !profile) return
    setPendingSplit(scannedId, profile.name)
    onClose()
    router.navigate('/')
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.scannerBody}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => void handleScan(data)}
          />
        ) : null}

        <View style={[s.scannerTop, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close scanner">
            <Text style={s.scannerClose}>✕</Text>
          </TouchableOpacity>
          <Text style={s.scannerTitle}>Scan a SquaredSplit code</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={s.scannerFrameWrap}>
          {!permission?.granted ? (
            <View style={s.scannerPermission}>
              <Text style={s.scannerPermissionText}>Camera access needed to scan codes</Text>
              <TouchableOpacity style={s.sheetPrimaryBtn} onPress={() => void requestPermission()}>
                <Text style={s.sheetPrimaryBtnText}>Allow camera</Text>
              </TouchableOpacity>
            </View>
          ) : scannedId ? (
            <View style={s.scanResult}>
              {lookingUp ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : notFound ? (
                <>
                  <Text style={s.scanName}>Not a SquaredSplit code</Text>
                  <TouchableOpacity
                    style={s.scanAgainBtn}
                    onPress={() => {
                      setScannedId(null)
                      setNotFound(false)
                    }}
                  >
                    <Text style={s.scanAgainText}>Scan again</Text>
                  </TouchableOpacity>
                </>
              ) : profile ? (
                <>
                  <Image
                    source={{
                      uri:
                        profile.avatarUrl ?? `${DEFAULT_AVATAR}${encodeURIComponent(profile.name)}`,
                    }}
                    style={s.scanAvatar}
                  />
                  <Text style={s.scanName}>{profile.name}</Text>
                  <TouchableOpacity style={s.scanCta} onPress={startSplit}>
                    <Text style={s.scanCtaText}>Split an expense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ marginTop: 10 }}
                    onPress={() => {
                      setScannedId(null)
                      setProfile(null)
                    }}
                  >
                    <Text style={s.scanAgainText}>Scan another code</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          ) : (
            <View style={s.scannerFrame} />
          )}
        </View>
      </View>
    </Modal>
  )
}

// ── Contact us ───────────────────────────────────────────────────────────────

export function ContactSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const [message, setMessage] = useState('')

  const send = async () => {
    const subject = encodeURIComponent('SquaredSplit support')
    const body = encodeURIComponent(message)
    await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.sheetBody, { paddingTop: insets.top + 16 }]}>
        <SheetHeader title="Contact us" onClose={onClose} />
        <Text style={s.sheetIntro}>
          Questions, bugs or feedback — we usually reply within a day.
        </Text>
        <TextInput
          style={s.contactInput}
          value={message}
          onChangeText={setMessage}
          placeholder="How can we help?"
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          accessibilityLabel="Support message"
        />
        <TouchableOpacity style={s.sheetPrimaryBtn} onPress={() => void send()}>
          <Text style={s.sheetPrimaryBtnText}>Email us</Text>
        </TouchableOpacity>
        <Text style={s.contactMeta}>{SUPPORT_EMAIL}</Text>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  sheetBody: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#141414' },
  sheetClose: { fontSize: 18, color: '#6B6B6B', padding: 4 },
  sheetIntro: { fontSize: 13, color: '#6B6B6B', lineHeight: 19, marginBottom: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', paddingVertical: 16, textAlign: 'center' },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F5',
  },
  permLabel: { fontSize: 15, color: '#141414', fontWeight: '500', flex: 1 },
  permWhy: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  permChip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  permChipGreen: { backgroundColor: '#E8F8EE' },
  permChipGray: { backgroundColor: '#F3F4F5' },
  permChipText: { fontSize: 12, fontWeight: '600', color: '#141414' },
  sheetPrimaryBtn: {
    backgroundColor: '#141414',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  sheetPrimaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  miniAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB' },
  unblockBtn: {
    borderWidth: 1,
    borderColor: '#141414',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unblockText: { fontSize: 12, fontWeight: '600', color: '#141414' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  optionRowActive: { backgroundColor: '#F9F0BF' },
  optionLabel: { fontSize: 15, color: '#141414' },
  optionCheck: { fontSize: 16, fontWeight: '700', color: '#141414' },
  proCard: {
    borderRadius: 20,
    backgroundColor: '#F9F0BF',
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  proEmoji: { fontSize: 40 },
  proTitle: { fontSize: 18, fontWeight: '700', color: '#141414', textAlign: 'center' },
  proFeature: { fontSize: 14, color: '#141414', alignSelf: 'flex-start' },
  proComingSoon: { fontSize: 12, color: '#6B6B6B', marginTop: 4 },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  qrName: { fontSize: 16, fontWeight: '600', color: '#141414' },
  scannerBody: { flex: 1, backgroundColor: '#000000' },
  scannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  scannerTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFFCC' },
  scannerClose: { fontSize: 22, color: '#FFFFFF' },
  scannerFrameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scannerFrame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: '#FFFFFFAA',
    borderRadius: 24,
  },
  scannerPermission: { alignItems: 'center', gap: 16, padding: 32 },
  scannerPermissionText: { color: '#FFFFFFCC', fontSize: 14, textAlign: 'center' },
  scanResult: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: '#000000AA',
    borderRadius: 20,
  },
  scanAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E5E7EB' },
  scanName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  scanCta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  scanCtaText: { color: '#141414', fontSize: 15, fontWeight: '600' },
  scanAgainBtn: { marginTop: 6 },
  scanAgainText: { color: '#FFFFFFCC', fontSize: 14 },
  contactInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#141414',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  contactMeta: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
})
