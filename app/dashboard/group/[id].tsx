import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import AddExpenseModal from '@/components/AddExpenseModal'
import AddExpenseButton from '@/components/dashboard/AddExpenseButton'
import { formatAmount } from '@/lib/currency'
import { getGroupById } from '@/lib/supabase/groups'
import type { Group } from '@/lib/supabase/groups'
import { useAuthStore } from '@/store/authStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { useGroupsStore } from '@/store/groupsStore'

export default function GroupDetailScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const groupId = Array.isArray(id) ? id[0] : id

  const user = useAuthStore(s => s.user)
  const { current: currency } = useCurrencyStore()
  const refreshGroups = useGroupsStore(s => s.refreshGroups)

  const [group, setGroup] = useState<Group | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [addExpenseVisible, setAddExpenseVisible] = useState(false)

  const load = useCallback(async () => {
    if (!groupId) return
    setIsLoading(true)
    const { data } = await getGroupById(groupId)
    setGroup(data)
    setIsLoading(false)
  }, [groupId])

  useEffect(() => {
    void load()
  }, [load])

  const handleExpenseCreated = useCallback(() => {
    void load()
    if (user) void refreshGroups(user.id)
  }, [load, refreshGroups, user])

  if (!groupId) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>Group not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#3273CD" />
          </View>
        ) : !group ? (
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>Group not found</Text>
          </View>
        ) : (
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.groupAvatar}>
                <Text style={styles.groupAvatarText}>
                  {group.emoji ?? group.name[0].toUpperCase()}
                </Text>
              </View>
              <Text style={styles.groupName}>{group.name}</Text>

              {/* Net balance chip */}
              {group.balanceType !== 'settled' && (
                <View
                  style={[
                    styles.balanceChip,
                    group.balanceType === 'owes_you'
                      ? styles.balanceChipGreen
                      : styles.balanceChipOrange,
                  ]}
                >
                  <Text style={styles.balanceChipText}>
                    {group.balanceType === 'owes_you' ? 'You are owed ' : 'You owe '}
                    {formatAmount(group.amount, currency)}
                  </Text>
                </View>
              )}
              {group.balanceType === 'settled' && (
                <View style={[styles.balanceChip, styles.balanceChipSettled]}>
                  <Text style={styles.balanceChipText}>All settled up ✓</Text>
                </View>
              )}

              <View style={styles.divider} />
            </View>

            {/* Members */}
            <Text style={styles.sectionTitle}>Members ({group.members.length})</Text>
            {group.members.length === 0 ? (
              <Text style={styles.emptyList}>No members found.</Text>
            ) : (
              group.members.map(m => (
                <View key={m.userId} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {(m.name ?? 'M')[0].toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.memberName}>{m.name}</Text>
                </View>
              ))
            )}

            {/* Expenses coming soon notice */}
            <View style={styles.comingSoonCard}>
              <Text style={styles.comingSoonTitle}>Group expenses</Text>
              <Text style={styles.comingSoonBody}>
                Per-group expense history and settle-up flows are coming in v0.2.0.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: insets.bottom + 16 }]}>
        <AddExpenseButton onPress={() => setAddExpenseVisible(true)} />
      </View>

      <AddExpenseModal
        visible={addExpenseVisible}
        onClose={() => setAddExpenseVisible(false)}
        onSuccess={handleExpenseCreated}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    color: '#3273CD',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 24,
  },
  header: { alignItems: 'center', marginBottom: 24 },
  groupAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D4E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupAvatarText: { fontSize: 32 },
  groupName: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: '#141414',
    marginBottom: 10,
    textAlign: 'center',
  },
  balanceChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  balanceChipGreen: { backgroundColor: '#E8F8EE' },
  balanceChipOrange: { backgroundColor: '#FEF3E8' },
  balanceChipSettled: { backgroundColor: '#F3F4F5' },
  balanceChipText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#141414' },
  divider: { height: 1, backgroundColor: '#F3F4F5', width: '100%' },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold', color: '#141414' },
  emptyList: { fontSize: 14, color: '#9CA3AF', paddingVertical: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#141414' },
  memberName: { fontSize: 15, fontFamily: 'Nunito_400Regular', color: '#141414', flex: 1 },
  comingSoonCard: {
    marginTop: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#FAFAFC',
  },
  comingSoonTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#141414',
    marginBottom: 6,
  },
  comingSoonBody: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: '#6B6B6B',
    lineHeight: 19,
  },
  fabWrap: { position: 'absolute', right: 20 },
})
