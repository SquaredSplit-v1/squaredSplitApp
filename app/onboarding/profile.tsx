import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getProfile, saveProfile, uploadAvatar } from '@/lib/profile'
import { useAuthStore } from '@/store/authStore'

const MAX_NAME_LENGTH = 30
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/initials/png?seed='

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets()
  const user = useAuthStore(s => s.user)
  const completeOnboarding = useAuthStore(s => s.completeOnboarding)

  const [displayName, setDisplayName] = useState('')
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    void getProfile(user.id).then(profile => {
      if (!profile) return
      if (profile.full_name) setDisplayName(profile.full_name)
      if (profile.avatar_url) setAvatarUri(profile.avatar_url)
    })
  }, [user?.id])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleNameChange = (text: string) => {
    setDisplayName(text)
    if (nameError) setNameError(null)
  }

  const handlePickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow access to your photo library to pick an avatar.'
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri)
    }
  }

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access to take a photo.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri)
    }
  }

  const handleAvatarPress = () => {
    Alert.alert('Set Profile Photo', 'Choose how to add your photo', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handlePickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const handleSave = async () => {
    if (!displayName.trim()) {
      setNameError('Please enter your name')
      return
    }
    if (!user) return

    setIsLoading(true)

    try {
      let avatarUrl: string | null = null

      if (avatarUri) {
        avatarUrl = await uploadAvatar(user.id, avatarUri)
        if (!avatarUrl) {
          Alert.alert('Upload failed', 'Could not upload your photo. Saving with default avatar.')
        }
      }

      if (!avatarUrl) {
        avatarUrl = `${DEFAULT_AVATAR}${encodeURIComponent(displayName.trim())}`
      }

      const result = await saveProfile(user.id, {
        full_name: displayName.trim(),
        avatar_url: avatarUrl,
      })

      if (!result.success) {
        Alert.alert('Error', result.error ?? 'Failed to save profile. Please try again.')
        return
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      // completeOnboarding sets hasCompletedOnboarding: true in store + DB
      // RootNavigator will redirect to /(tabs) automatically
      await completeOnboarding()
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = async () => {
    if (!user) return

    setIsLoading(true)

    try {
      const name = displayName.trim() || 'User'
      const avatarUrl = `${DEFAULT_AVATAR}${encodeURIComponent(name)}`
      await saveProfile(user.id, { full_name: name, avatar_url: avatarUrl })
      await completeOnboarding()
    } catch {
      // Even if save fails, complete onboarding so user isn't stuck
      await completeOnboarding()
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const avatarSource = avatarUri
    ? { uri: avatarUri }
    : { uri: `${DEFAULT_AVATAR}${encodeURIComponent(displayName.trim() || 'U')}` }

  const canSave = displayName.trim().length > 0 && !isLoading

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>Tell us a bit about yourself to get started.</Text>

        {/* Avatar picker */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handleAvatarPress}
          accessibilityRole="button"
          accessibilityLabel="Set profile photo"
        >
          <Image source={avatarSource} style={styles.avatar} />
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to add a photo</Text>

        {/* Display name */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Display name</Text>
          <TextInput
            style={[styles.input, nameError ? styles.inputError : null]}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
            value={displayName}
            onChangeText={handleNameChange}
            maxLength={MAX_NAME_LENGTH}
            returnKeyType="done"
            autoCapitalize="words"
            autoCorrect={false}
          />
          <View style={styles.inputFooter}>
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : (
              <Text style={styles.charCount}>
                {displayName.length}/{MAX_NAME_LENGTH}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Save profile"
          accessibilityState={{ disabled: !canSave }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save & Continue</Text>
          )}
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Skip profile setup"
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F5',
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#141414',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B6B6B',
    lineHeight: 24,
    marginBottom: 40,
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E7EB',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3F4F5',
  },
  avatarBadgeText: {
    fontSize: 14,
  },
  avatarHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 40,
  },
  inputSection: {
    width: '100%',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#141414',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  saveButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    width: '100%',
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B6B6B',
  },
})
