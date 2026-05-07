import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
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

import { REJECTION_OPTIONS, type RejectionReason } from './types'

interface RejectionModalProps {
  visible: boolean
  onClose: () => void
  onSave: (reason: RejectionReason, otherText?: string) => void
}

export default function RejectionModal({ visible, onClose, onSave }: RejectionModalProps) {
  const insets = useSafeAreaInsets()
  const [selectedReason, setSelectedReason] = useState<RejectionReason | null>(null)
  const [otherText, setOtherText] = useState('')

  const handleSave = () => {
    if (!selectedReason) return
    onSave(selectedReason, selectedReason === 'other' ? otherText : undefined)
    // Reset state
    setSelectedReason(null)
    setOtherText('')
  }

  const handleClose = () => {
    setSelectedReason(null)
    setOtherText('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavContainer}
      >
        {/* Backdrop – tap to dismiss */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        {/* Sheet */}
        <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#141414" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reason for rejection</Text>
            <TouchableOpacity onPress={handleSave} hitSlop={8}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsList}>
            {REJECTION_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={styles.optionRow}
                onPress={() => setSelectedReason(option.value)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.radio, selectedReason === option.value && styles.radioSelected]}
                >
                  {selectedReason === option.value && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Other text input – only shown when "Other" is selected */}
          {selectedReason === 'other' && (
            <TextInput
              style={styles.textInput}
              placeholder="Enter your reason..."
              placeholderTextColor="#9CA3AF"
              value={otherText}
              onChangeText={setOtherText}
              multiline
              autoFocus
              returnKeyType="done"
              blurOnSubmit
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  kavContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  modalContainer: {
    backgroundColor: '#EADFEA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 40.8,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: {
    color: '#141414',
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  saveText: {
    color: '#3273CD',
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 16,
    letterSpacing: -0.32,
  },
  optionsList: {
    gap: 18,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#3273CD',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3273CD',
  },
  optionText: {
    color: '#141414',
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  textInput: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: '#141414',
    backgroundColor: '#F9F5F9',
    minHeight: 48,
  },
})
