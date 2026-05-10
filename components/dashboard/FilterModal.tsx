import React from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

import type { FilterOption } from './types'

interface FilterModalProps {
  visible: boolean
  selectedFilter: FilterOption
  onSelect: (filter: FilterOption) => void
  onClose: () => void
}

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'outstanding', label: 'Friends with outstanding balance' },
  { value: 'owes_you', label: 'Friends who owe you' },
  { value: 'you_owe', label: 'Friends who you owe' },
]

function CheckIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={12} fill="#3273CD" />
      <Path
        d="M7 12.5l3 3 7-7"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default function FilterModal({
  visible,
  selectedFilter,
  onSelect,
  onClose,
}: FilterModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Blurred / dimmed backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Set filter</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.headerText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Options */}
        <View style={styles.optionsList}>
          {FILTER_OPTIONS.map(option => {
            const isSelected = selectedFilter === option.value
            return (
              <TouchableOpacity
                key={option.value}
                style={styles.optionRow}
                onPress={() => onSelect(option.value)}
                activeOpacity={0.6}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                {isSelected && <CheckIcon />}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(200, 200, 210, 0.55)',
  },
  sheet: {
    backgroundColor: '#D4E7FF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 81,
    elevation: 16,
    gap: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    color: '#6B6B6B',
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 16,
  },
  optionsList: {
    gap: 24,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    color: '#141414',
    fontFamily: 'Nunito_400Regular',
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 20,
    flex: 1,
  },
  optionLabelSelected: {
    fontFamily: 'Nunito_600SemiBold',
    fontWeight: '600',
  },
})
