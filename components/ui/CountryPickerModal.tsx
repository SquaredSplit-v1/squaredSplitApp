import React, { useState } from 'react'
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { COUNTRIES, CountryCode } from '@/lib/validation'

interface Props {
  selected: CountryCode
  onSelect: (country: CountryCode) => void
}

export function CountryPickerModal({ selected, onSelect }: Props) {
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState('')
  const insets = useSafeAreaInsets()

  const filtered = COUNTRIES.filter(
    c => c.name.toLowerCase().includes(query.toLowerCase()) || c.dial.includes(query)
  )

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
        accessibilityLabel="Select country code"
        accessibilityRole="button"
      >
        <Text style={styles.flag}>{selected.flag}</Text>
        <Text style={styles.dial}>{selected.dial}</Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVisible(false)}
      >
        <View style={[styles.sheet, { paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 12 }]}>
          {/* Handle bar */}
          <View style={styles.handle} />

          <Text style={styles.sheetTitle}>Select Country</Text>

          {/* Search */}
          <TextInput
            style={styles.search}
            placeholder="Search country or code..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoFocus
            clearButtonMode="while-editing"
          />

          <FlatList
            data={filtered}
            keyExtractor={item => item.iso}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, item.iso === selected.iso && styles.rowSelected]}
                onPress={() => {
                  onSelect(item)
                  setQuery('')
                  setVisible(false)
                }}
              >
                <Text style={styles.rowFlag}>{item.flag}</Text>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowDial}>{item.dial}</Text>
                {item.iso === selected.iso && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          />
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    gap: 4,
    marginRight: 8,
  },
  flag: { fontSize: 20 },
  dial: { fontSize: 15, fontWeight: '500', color: '#141414' },
  chevron: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#141414',
    textAlign: 'center',
    marginBottom: 16,
  },
  search: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#141414',
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  rowSelected: { backgroundColor: '#F9FAFB', borderRadius: 8 },
  rowFlag: { fontSize: 24, width: 32 },
  rowName: { flex: 1, fontSize: 15, color: '#141414' },
  rowDial: { fontSize: 15, color: '#6B6B6B', fontWeight: '500' },
  checkmark: { fontSize: 16, color: '#141414', fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#F3F4F5' },
})
