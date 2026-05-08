import React, { useMemo, useState } from 'react'
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useGetFriends } from '@/lib/api/getFriends'

interface Props {
  visible: boolean
  onClose: () => void
  onSelect: (id: string) => void
}

export default function AddFriendModal({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets()
  const { friends, isLoading } = useGetFriends()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const data = useMemo(() => {
    if (!query) return friends
    const q = query.trim().toLowerCase()
    return friends.filter(f => (f.display_name ?? '').toLowerCase().includes(q))
  }, [friends, query])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.root, { paddingTop: insets.top + 16 }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.iconBtn}>
            <Text style={s.back}>‹</Text>
          </TouchableOpacity>
          <Text style={s.title}>Add friend</Text>
          <TouchableOpacity
            onPress={() => {
              if (selectedId) onSelect(selectedId)
            }}
            disabled={!selectedId}
          >
            <Text style={[s.next, !selectedId && { opacity: 0.4 }]}>Next</Text>
          </TouchableOpacity>
        </View>

        <View style={s.searchRow}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Enter name"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <View style={s.separator} />

        <FlatList
          data={data}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable style={s.row} onPress={() => setSelectedId(item.id)}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarPlaceholder]}>
                  <Text style={s.avatarInitial}>{(item.display_name ?? 'F')[0].toUpperCase()}</Text>
                </View>
              )}

              <Text style={s.name}>{item.display_name}</Text>

              <View style={s.radioWrap}>
                <View style={[s.radio, selectedId === item.id && s.radioActive]} />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <View style={{ padding: 20 }}>
              <Text style={{ color: '#9CA3AF' }}>
                {isLoading ? 'Loading...' : 'No friends found'}
              </Text>
            </View>
          )}
        />
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  iconBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  back: { fontSize: 22, color: '#3273CD' },
  title: { fontSize: 16, fontWeight: '600', color: '#141414' },
  next: { color: '#3273CD', fontSize: 16, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  searchIcon: { fontSize: 18, color: '#141414', marginRight: 8 },
  searchInput: { flex: 1, height: 36, fontSize: 16, color: '#141414' },
  separator: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: '#000',
    opacity: 0.08,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: '#D9E897', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#141414', fontWeight: '600' },
  name: { flex: 1, fontSize: 16, color: '#141414' },
  radioWrap: { width: 40, alignItems: 'center' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 0.6, borderColor: '#6B6B6B' },
  radioActive: { backgroundColor: '#3273CD', borderColor: '#3273CD' },
})
