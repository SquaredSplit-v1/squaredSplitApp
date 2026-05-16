import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { deleteAccount, getProfile, saveProfile, uploadAvatar } from '@/lib/supabase/profile'
import { useAuthStore } from '@/store/authStore'
import { useCurrencyStore } from '@/store/currencyStore'

// Lazy-load — expo-image-picker needs dev client rebuild (SS-015 rebuild)
const getImagePicker = () => {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    return require('expo-image-picker') as typeof import('expo-image-picker')
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch {
    return null
  }
}

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

  useEffect(() => {
    if (!user?.id) return
    void getProfile(user.id).then(profile => {
      if (!profile) return
      if (profile.full_name) setDisplayName(profile.full_name)
      if (profile.avatar_url) setAvatarUri(profile.avatar_url)
    })
  }, [user?.id])

  // ── Avatar ───────────────────────────────────────────────────────────────

  const handleAvatarPress = () => {
    const ImagePicker = getImagePicker()
    if (!ImagePicker) {
      Alert.alert('Unavailable', 'Photo picker requires a dev client rebuild.')
      return
    }

    Alert.alert('Change Photo', 'Choose how to update your avatar', [
      { text: 'Take Photo', onPress: () => launchCamera(ImagePicker) },
      { text: 'Choose from Library', onPress: () => launchLibrary(ImagePicker) },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const launchLibrary = async (ImagePicker: typeof import('expo-image-picker')) => {
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

  const launchCamera = async (ImagePicker: typeof import('expo-image-picker')) => {
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
    setAvatarUri(uri) // optimistic

    const uploadedUrl = await uploadAvatar(user.id, uri)
    if (!uploadedUrl) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: 'Could not update photo.' })
      const profile = await getProfile(user.id)
      setAvatarUri(profile?.avatar_url ?? null) // rollback
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
            const { success, error } = await deleteAccount(user.id)
            if (!success) {
              Toast.show({ type: 'info', text1: 'Not available yet', text2: error })
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

      {/* ── Logout ── */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      {/* ── Delete account ── */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteText}>Delete account</Text>
      </TouchableOpacity>

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
