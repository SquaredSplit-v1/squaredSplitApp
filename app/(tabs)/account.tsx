import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

import {
  BlocklistSheet,
  ContactSheet,
  MyCodeSheet,
  OptionPickerSheet,
  PermissionLedgerSheet,
  ProSheet,
  QrScannerSheet,
} from '@/components/account/AccountSheets'
import { hasEmailIdentity, isValidEmail, updateEmailAddress, updatePassword } from '@/lib/auth'
import { LANGUAGES, TIME_ZONES, detectedTimezone, rateAppUrl } from '@/lib/constants'
import { deactivateAccount, updateLanguage, updateTimezone } from '@/lib/supabase/account'
import { deleteAccount, getProfile, saveProfile, uploadAvatar } from '@/lib/supabase/profile'
import { useAuthStore } from '@/store/authStore'
import { useCurrencyStore } from '@/store/currencyStore'

const MAX_NAME_LENGTH = 30
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/initials/png?seed='

export default function AccountScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const { current, supported, setCurrency } = useCurrencyStore()

  const [displayName, setDisplayName] = useState('')
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showCurrencyModal, setShowCurrencyModal] = useState(false)
  const [nameEditing, setNameEditing] = useState(false)

  // Email / password credential editing
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordDraft, setPasswordDraft] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [credentialBusy, setCredentialBusy] = useState(false)

  // v0.3 sheets + preferences
  const [showLedger, setShowLedger] = useState(false)
  const [showBlocklist, setShowBlocklist] = useState(false)
  const [showLanguage, setShowLanguage] = useState(false)
  const [showTimezone, setShowTimezone] = useState(false)
  const [showPro, setShowPro] = useState(false)
  const [showMyCode, setShowMyCode] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [language, setLanguage] = useState('en')
  const [timezone, setTimezone] = useState(detectedTimezone() ?? 'Asia/Kolkata')

  useEffect(() => {
    if (!user?.id) return
    void getProfile(user.id).then(profile => {
      if (!profile) return
      if (profile.full_name) setDisplayName(profile.full_name)
      if (profile.avatar_url) setAvatarUri(profile.avatar_url)
      const lang = (profile as { language?: string | null }).language
      const tz = (profile as { timezone?: string | null }).timezone
      if (lang) setLanguage(lang)
      if (tz) setTimezone(tz)
    })
  }, [user?.id])

  // ── Avatar ───────────────────────────────────────────────────────────────

  const handleAvatarPress = () => {
    Alert.alert('Change Photo', 'Choose how to update your avatar', [
      { text: 'Take Photo', onPress: launchCamera },
      { text: 'Choose from Library', onPress: launchLibrary },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const launchLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      await handleAvatarUpdate(result.assets[0].uri)
    }
  }

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      await handleAvatarUpdate(result.assets[0].uri)
    }
  }

  const handleAvatarUpdate = async (uri: string) => {
    if (!user) return
    setIsSaving(true)
    setAvatarUri(uri)

    const uploadedUrl = await uploadAvatar(user.id, uri)
    if (!uploadedUrl) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: 'Could not update photo.' })
      const profile = await getProfile(user.id)
      setAvatarUri(profile?.avatar_url ?? null)
      setIsSaving(false)
      return
    }

    const { success, error } = await saveProfile(user.id, { avatar_url: uploadedUrl })
    if (!success) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: error })
      const profile = await getProfile(user.id)
      setAvatarUri(profile?.avatar_url ?? null)
    } else {
      setAvatarUri(uploadedUrl)
      Toast.show({ type: 'success', text1: 'Photo updated' })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    setIsSaving(false)
  }

  // ── Name ─────────────────────────────────────────────────────────────────

  const handleNameSave = async () => {
    if (!user || !displayName.trim()) return
    setIsSaving(true)
    const { success, error } = await saveProfile(user.id, { full_name: displayName.trim() })
    if (!success) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: error })
    } else {
      const profile = await getProfile(user.id)
      if (profile?.full_name) setDisplayName(profile.full_name)
      Toast.show({ type: 'success', text1: 'Name updated' })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    setNameEditing(false)
    setIsSaving(false)
  }

  // ── Currency ─────────────────────────────────────────────────────────────

  const handleCurrencySelect = async (code: string) => {
    if (!user) return
    setShowCurrencyModal(false)
    const { error } = await setCurrency(user.id, code)
    if (error) {
      Toast.show({ type: 'error', text1: 'Failed to update currency' })
    } else {
      Toast.show({ type: 'success', text1: `Currency set to ${code}` })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  // ── Email + password credentials ────────────────────────────────────────

  const openEmailModal = () => {
    setEmailDraft(user?.email ?? '')
    setShowEmailModal(true)
  }

  const handleEmailSave = async () => {
    if (!isValidEmail(emailDraft)) {
      Toast.show({ type: 'error', text1: 'Enter a valid email address' })
      return
    }
    if (emailDraft.trim() === (user?.email ?? '')) {
      setShowEmailModal(false)
      return
    }
    setCredentialBusy(true)
    const { success, error } = await updateEmailAddress(emailDraft)
    setCredentialBusy(false)
    if (!success) {
      Toast.show({ type: 'error', text1: 'Could not update email', text2: error })
    } else {
      Toast.show({ type: 'success', text1: 'Email updated' })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowEmailModal(false)
    }
  }

  const openPasswordModal = () => {
    setPasswordDraft('')
    setPasswordConfirm('')
    setShowPasswordModal(true)
  }

  const handlePasswordSave = async () => {
    if (passwordDraft.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' })
      return
    }
    if (passwordDraft !== passwordConfirm) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' })
      return
    }
    setCredentialBusy(true)
    const { success, error } = await updatePassword(passwordDraft)
    setCredentialBusy(false)
    if (!success) {
      Toast.show({ type: 'error', text1: 'Could not update password', text2: error })
    } else {
      Toast.show({ type: 'success', text1: 'Password updated' })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowPasswordModal(false)
    }
  }

  // ── Preferences: language / time zone ────────────────────────────────────

  const handleSelectLanguage = async (code: string) => {
    setLanguage(code)
    if (!user?.id) return
    const ok = await updateLanguage(user.id, code)
    if (!ok) Toast.show({ type: 'error', text1: 'Could not save language' })
  }

  const handleSelectTimezone = async (id: string) => {
    setTimezone(id)
    if (!user?.id) return
    const ok = await updateTimezone(user.id, id)
    if (!ok) Toast.show({ type: 'error', text1: 'Could not save time zone' })
  }

  const handleRateApp = async () => {
    try {
      await Linking.openURL(rateAppUrl())
    } catch {
      Toast.show({ type: 'error', text1: 'Could not open the store' })
    }
  }

  // ── Deactivate account ───────────────────────────────────────────────────

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate your account',
      'Your profile stops appearing in searches, contacts and QR scans. Splits and history are kept. Reactivation is via support (support@squaredsplit.app).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            if (!user) return
            setIsSaving(true)
            const { success, error } = await deactivateAccount(user.id)
            setIsSaving(false)
            if (!success) {
              Toast.show({ type: 'error', text1: 'Could not deactivate', text2: error })
              return
            }
            Toast.show({ type: 'success', text1: 'Account deactivated' })
            await logout()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  // ── Logout ───────────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  // ── Delete account ───────────────────────────────────────────────────────

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return
            setIsSaving(true)
            const { success, error } = await deleteAccount(user.id)
            setIsSaving(false)
            if (!success) {
              Toast.show({
                type: 'error',
                text1: 'Could not delete account',
                text2: error ?? 'Please try again or contact support.',
              })
            } else {
              // Session will be invalidated by the Edge Function;
              // authStore SIGNED_OUT handler handles cleanup and navigation.
              Toast.show({ type: 'success', text1: 'Account deleted' })
            }
          },
        },
      ]
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const avatarSource = avatarUri
    ? { uri: avatarUri }
    : { uri: `${DEFAULT_AVATAR}${encodeURIComponent(displayName || 'U')}` }

  const phone = user?.phone ?? '—'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Avatar ── */}
      <TouchableOpacity
        style={styles.avatarWrapper}
        onPress={handleAvatarPress}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
      >
        {isSaving ? (
          <View style={[styles.avatar, styles.avatarLoading]}>
            <ActivityIndicator color="#6B6B6B" />
          </View>
        ) : (
          <Image source={avatarSource} style={styles.avatar} />
        )}
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarBadgeText}>📷</Text>
        </View>
      </TouchableOpacity>

      {/* ── Name ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Display name</Text>
        {nameEditing ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleNameSave}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleNameSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.fieldRow} onPress={() => setNameEditing(true)}>
            <Text style={styles.fieldValue}>{displayName || '—'}</Text>
            <Text style={styles.editHint}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Phone ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Phone number</Text>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldValue}>{phone}</Text>
        </View>
      </View>

      {/* ── Email ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Email</Text>
        <TouchableOpacity style={styles.fieldRow} onPress={openEmailModal}>
          <Text style={styles.fieldValue}>{user?.email ?? 'Add an email'}</Text>
          <Text style={styles.editHint}>{user?.email ? 'Edit' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Password ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Password</Text>
        <TouchableOpacity style={styles.fieldRow} onPress={openPasswordModal}>
          <Text style={styles.fieldValue}>
            {hasEmailIdentity(user) ? '••••••••' : 'Set a password'}
          </Text>
          <Text style={styles.editHint}>{hasEmailIdentity(user) ? 'Change' : 'Set'}</Text>
        </TouchableOpacity>
        <Text style={styles.fieldHint}>Used to sign in with your email</Text>
      </View>

      {/* ── Currency ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Currency</Text>
        <TouchableOpacity style={styles.fieldRow} onPress={() => setShowCurrencyModal(true)}>
          <Text style={styles.fieldValue}>
            {current.symbol} {current.code} — {current.name}
          </Text>
          <Text style={styles.editHint}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* ── Preferences ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <TouchableOpacity style={styles.fieldRow} onPress={() => setShowLanguage(true)}>
          <Text style={styles.fieldValue}>
            {LANGUAGES.find(l => l.code === language)?.label ?? 'English (default)'}
          </Text>
          <Text style={styles.editHint}>Change</Text>
        </TouchableOpacity>
        <View style={{ height: 8 }} />
        <TouchableOpacity style={styles.fieldRow} onPress={() => setShowTimezone(true)}>
          <Text style={styles.fieldValue}>
            {TIME_ZONES.find(t => t.id === timezone)?.label ?? timezone}
          </Text>
          <Text style={styles.editHint}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* ── Privacy & safety ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Privacy & safety</Text>
        <TouchableOpacity style={styles.fieldRow} onPress={() => setShowLedger(true)}>
          <Text style={styles.fieldValue}>Permission ledger</Text>
          <Text style={styles.editHint}>View</Text>
        </TouchableOpacity>
        <View style={{ height: 8 }} />
        <TouchableOpacity style={styles.fieldRow} onPress={() => setShowBlocklist(true)}>
          <Text style={styles.fieldValue}>Blocked accounts</Text>
          <Text style={styles.editHint}>Manage</Text>
        </TouchableOpacity>
      </View>

      {/* ── SquaredSplit Pro ── */}
      <TouchableOpacity style={styles.proCard} onPress={() => setShowPro(true)}>
        <Text style={styles.proEmoji}>✦</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.proTitle}>Do more with SquaredSplit Pro</Text>
          <Text style={styles.proBody}>Advanced agreements, exports & priority nudges</Text>
        </View>
        <Text style={styles.proChevron}>›</Text>
      </TouchableOpacity>

      {/* ── More ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>More</Text>
        <TouchableOpacity style={styles.fieldRow} onPress={() => setShowScanner(true)}>
          <Text style={styles.fieldValue}>Scan code</Text>
          <Text style={styles.editHint}>Scan</Text>
        </TouchableOpacity>
        <View style={{ height: 8 }} />
        <TouchableOpacity style={styles.fieldRow} onPress={() => setShowMyCode(true)}>
          <Text style={styles.fieldValue}>My code</Text>
          <Text style={styles.editHint}>Share</Text>
        </TouchableOpacity>
        <View style={{ height: 8 }} />
        <TouchableOpacity style={styles.fieldRow} onPress={() => setShowContact(true)}>
          <Text style={styles.fieldValue}>Contact us</Text>
          <Text style={styles.editHint}>Email</Text>
        </TouchableOpacity>
        <View style={{ height: 8 }} />
        <TouchableOpacity style={styles.fieldRow} onPress={handleRateApp}>
          <Text style={styles.fieldValue}>Rate SquaredSplit</Text>
          <Text style={styles.editHint}>★★★</Text>
        </TouchableOpacity>
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      {/* ── Delete account ── */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteText}>Delete account</Text>
      </TouchableOpacity>

      {/* ── Deactivate account ── */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDeactivate}>
        <Text style={styles.deactivateText}>Deactivate account</Text>
      </TouchableOpacity>

      {/* ── v0.3 sheets ── */}
      <PermissionLedgerSheet visible={showLedger} onClose={() => setShowLedger(false)} />
      <BlocklistSheet visible={showBlocklist} onClose={() => setShowBlocklist(false)} />
      <OptionPickerSheet
        visible={showLanguage}
        title="Select language"
        options={LANGUAGES.map(l => ({ id: l.code, label: `${l.native} — ${l.label}` }))}
        selectedId={language}
        onSelect={id => void handleSelectLanguage(id)}
        onClose={() => setShowLanguage(false)}
      />
      <OptionPickerSheet
        visible={showTimezone}
        title="Time zone"
        options={TIME_ZONES}
        selectedId={timezone}
        onSelect={id => void handleSelectTimezone(id)}
        onClose={() => setShowTimezone(false)}
      />
      <ProSheet visible={showPro} onClose={() => setShowPro(false)} />
      <MyCodeSheet visible={showMyCode} onClose={() => setShowMyCode(false)} />
      <QrScannerSheet visible={showScanner} onClose={() => setShowScanner(false)} />
      <ContactSheet visible={showContact} onClose={() => setShowContact(false)} />

      {/* ── Email edit modal ── */}
      <Modal
        visible={showEmailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{user?.email ? 'Change email' : 'Add email'}</Text>
            <TouchableOpacity onPress={() => setShowEmailModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.credentialHint}>
            This email becomes your sign-in identity for email + password login.
          </Text>
          <TextInput
            style={styles.credentialInput}
            value={emailDraft}
            onChangeText={setEmailDraft}
            placeholder="you@example.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            autoFocus
            accessibilityLabel="New email address"
          />
          <TouchableOpacity
            style={[styles.credentialSaveBtn, credentialBusy && styles.credentialSaveDisabled]}
            onPress={handleEmailSave}
            disabled={credentialBusy}
          >
            {credentialBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.credentialSaveText}>Save email</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Password edit modal ── */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {hasEmailIdentity(user) ? 'Change password' : 'Set password'}
            </Text>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.credentialHint}>
            {hasEmailIdentity(user)
              ? 'Pick a new password for email sign-in.'
              : 'Set a password so you can also sign in with your email.'}
          </Text>
          <TextInput
            style={styles.credentialInput}
            value={passwordDraft}
            onChangeText={setPasswordDraft}
            placeholder="New password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            accessibilityLabel="New password"
          />
          <TextInput
            style={[styles.credentialInput, styles.credentialInputSpaced]}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            placeholder="Confirm password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            accessibilityLabel="Confirm new password"
          />
          <TouchableOpacity
            style={[styles.credentialSaveBtn, credentialBusy && styles.credentialSaveDisabled]}
            onPress={handlePasswordSave}
            disabled={credentialBusy}
          >
            {credentialBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.credentialSaveText}>Save password</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Currency picker modal ── */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {supported.map(c => (
              <TouchableOpacity
                key={c.code}
                style={[styles.currencyRow, c.code === current.code && styles.currencyRowActive]}
                onPress={() => handleCurrencySelect(c.code)}
              >
                <Text style={styles.currencySymbol}>{c.symbol}</Text>
                <View style={styles.currencyInfo}>
                  <Text style={styles.currencyCode}>{c.code}</Text>
                  <Text style={styles.currencyName}>{c.name}</Text>
                </View>
                {c.code === current.code && <Text style={styles.currencyCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F5' },
  content: { paddingHorizontal: 24, alignItems: 'center' },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 24,
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E5E7EB',
  },
  avatarLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3F4F5',
  },
  avatarBadgeText: { fontSize: 12 },
  section: { width: '100%', marginBottom: 16 },
  sectionLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fieldValue: { fontSize: 15, color: '#141414', flex: 1 },
  editHint: { fontSize: 13, color: '#3B82F6', fontWeight: '500' },
  fieldHint: { fontSize: 12, color: '#9CA3AF', marginTop: 6, marginLeft: 4 },
  credentialHint: { fontSize: 13, color: '#6B6B6B', marginBottom: 16, lineHeight: 18 },
  credentialInput: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#141414',
    backgroundColor: '#FFFFFF',
  },
  credentialInputSpaced: { marginTop: 10 },
  credentialSaveBtn: {
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  credentialSaveDisabled: { backgroundColor: '#9CA3AF' },
  credentialSaveText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  nameEditRow: { flexDirection: 'row', gap: 8 },
  nameInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#141414',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#141414',
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    height: 48,
    paddingHorizontal: 20,
    backgroundColor: '#141414',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  logoutButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  deleteButton: {
    width: '100%',
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  deleteText: { fontSize: 14, color: '#EF4444' },
  deactivateText: { fontSize: 14, color: '#DE8334' },
  proCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9F0BF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  proEmoji: { fontSize: 24 },
  proTitle: { fontSize: 15, fontWeight: '700', color: '#141414' },
  proBody: { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  proChevron: { fontSize: 22, color: '#141414' },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#141414' },
  modalClose: { fontSize: 18, color: '#6B6B6B', padding: 4 },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F5',
  },
  currencyRowActive: { backgroundColor: '#F9F0BF', borderRadius: 8, paddingHorizontal: 8 },
  currencySymbol: { fontSize: 20, width: 36, textAlign: 'center' },
  currencyInfo: { flex: 1, marginLeft: 8 },
  currencyCode: { fontSize: 15, fontWeight: '600', color: '#141414' },
  currencyName: { fontSize: 12, color: '#6B6B6B' },
  currencyCheck: { fontSize: 16, color: '#141414', fontWeight: '700' },
})
