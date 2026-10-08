import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import AddExpenseModal from '@/components/AddExpenseModal'
import AddExpenseButton from '@/components/dashboard/AddExpenseButton'
import { labelForMatchedPhone } from '@/lib/contacts'
import { formatAmount } from '@/lib/currency'
import {
  addGroupMembers,
  getGroupById,
  removeGroupMember,
  settleUpGroup,
} from '@/lib/supabase/groups'
import type { GroupDetail } from '@/lib/supabase/groups'
import { useAuthStore } from '@/store/authStore'
import { useContactsStore } from '@/store/contactsStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { useGroupsStore } from '@/store/groupsStore'

function formatExpenseDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso))
}

export default function GroupDetailScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const groupId = Array.isArray(id) ? id[0] : id

  const user = useAuthStore(s => s.user)
  const { current: currency } = useCurrencyStore()
  const refreshGroups = useGroupsStore(s => s.refreshGroups)
  const loadContacts = useContactsStore(s => s.loadContacts)
  const matchedContacts = useContactsStore(s => s.matched)
  const rawWithPhones = useContactsStore(s => s.rawWithPhones)

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [addExpenseVisible, setAddExpenseVisible] = useState(false)
  const [isSettling, setIsSettling] = useState(false)
  const [membersEditing, setMembersEditing] = useState(false)
  const [addMemberVisible, setAddMemberVisible] = useState(false)

  useEffect(() => {
    void loadContacts()
  }, [loadContacts])

  const load = useCallback(async () => {
    if (!groupId) return
    setIsLoading(true)
    const { data } = await getGroupById(groupId, user?.id ?? null)
    setGroup(data)
    setIsLoading(false)
  }, [groupId, user?.id])

  useEffect(() => {
    void load()
  }, [load])

  const handleRefresh = useCallback(async () => {
    if (!groupId) return
    setIsRefreshing(true)
    const { data } = await getGroupById(groupId, user?.id ?? null)
    setGroup(data)
    setIsRefreshing(false)
    if (user) void refreshGroups(user.id)
  }, [groupId, user?.id, refreshGroups]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExpenseCreated = useCallback(() => {
    void load()
    if (user) void refreshGroups(user.id)
  }, [load, refreshGroups, user])

  const handleSettleUp = useCallback(() => {
    if (!groupId || !group || group.amount <= 0.005 || isSettling) return
    Alert.alert(
      'Square up group',
      `Mark your shares on all unsettled "${group.name}" expenses as settled? (${formatAmount(group.amount, currency)} ${group.balanceType === 'owes_you' ? 'you are owed' : 'you owe'})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Square up',
          onPress: async () => {
            setIsSettling(true)
            const result = await settleUpGroup(groupId)
            setIsSettling(false)
            if (!result.success) {
              Alert.alert('Could not square up', result.error ?? 'Please try again.')
              return
            }
            await load()
          },
        },
      ]
    )
  }, [groupId, group, isSettling, currency, load])

  const handleRemoveMember = useCallback(
    (userId: string, name: string) => {
      if (!groupId) return
      Alert.alert('Remove member', `Remove ${name} from this group?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeGroupMember(groupId, userId)
            if (!result.success) {
              Alert.alert('Could not remove member', result.error)
              return
            }
            await load()
          },
        },
      ])
    },
    [groupId, load]
  )

  const handleAddMembers = useCallback(
    async (ids: string[]) => {
      if (!groupId || ids.length === 0) return
      const result = await addGroupMembers(groupId, ids)
      if (!result.success) {
        Alert.alert('Could not add members', result.error)
        return
      }
      setAddMemberVisible(false)
      await load()
    },
    [groupId, load]
  )

  /** Contacts on SquaredSplit who aren't already in this group. */
  const addableContacts = useMemo(() => {
    if (!group) return []
    const memberIds = new Set(group.members.map(m => m.userId))
    return matchedContacts
      .filter(mc => !memberIds.has(mc.id) && mc.id !== user?.id)
      .map(mc => ({
        id: mc.id,
        label: labelForMatchedPhone(mc.phone, mc.display_name, rawWithPhones),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [group, matchedContacts, rawWithPhones, user?.id])

  const memberIdsForExpense = group
    ? group.members.map(m => m.userId).filter(id => id !== user?.id)
    : []

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
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#3273CD" />
        }
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

            {/* Square up group */}
            {group.amount > 0.005 ? (
              <TouchableOpacity
                style={[
                  styles.settleCard,
                  group.balanceType === 'owes_you'
                    ? styles.settleCardGreen
                    : styles.settleCardOrange,
                ]}
                onPress={handleSettleUp}
                disabled={isSettling}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.settleTitle}>
                    {group.balanceType === 'owes_you'
                      ? `You are owed ${formatAmount(group.amount, currency)}`
                      : `You owe ${formatAmount(group.amount, currency)}`}
                  </Text>
                  <Text style={styles.settleBody}>
                    Square up to mark your shares on all group expenses as settled.
                  </Text>
                </View>
                <View style={styles.settleBtn}>
                  {isSettling ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.settleBtnText}>Square up</Text>
                  )}
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Members */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Members ({group.members.length})</Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <TouchableOpacity onPress={() => setAddMemberVisible(true)} hitSlop={8}>
                  <Text style={styles.actionLink}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMembersEditing(e => !e)} hitSlop={8}>
                  <Text style={styles.actionLink}>{membersEditing ? 'Done' : 'Edit'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {group.members.length === 0 ? (
              <Text style={styles.emptyList}>No members found.</Text>
            ) : (
              group.members.map(m => {
                const isMe = m.userId === user?.id
                return (
                  <View key={m.userId} style={styles.memberRow}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {(m.name ?? 'M')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{isMe ? 'You' : m.name}</Text>
                      {!isMe && m.amount > 0 && (
                        <Text
                          style={[
                            styles.memberBalance,
                            m.balanceType === 'owes_you'
                              ? styles.memberBalanceGreen
                              : styles.memberBalanceOrange,
                          ]}
                        >
                          {m.balanceType === 'owes_you' ? 'owes you ' : 'you owe '}
                          {formatAmount(m.amount, currency)}
                        </Text>
                      )}
                      {!isMe && m.amount <= 0 && (
                        <Text style={styles.memberBalanceSettled}>settled up</Text>
                      )}
                    </View>
                    {membersEditing && !isMe ? (
                      <TouchableOpacity
                        style={styles.removeMemberBtn}
                        onPress={() => handleRemoveMember(m.userId, m.name)}
                        accessibilityLabel={`Remove ${m.name}`}
                      >
                        <Text style={styles.removeMemberText}>Remove</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )
              })
            )}

            {/* Expenses */}
            <Text style={styles.sectionTitle}>Expenses ({group.expenses.length})</Text>
            {group.expenses.length === 0 ? (
              <View style={styles.comingSoonCard}>
                <Text style={styles.comingSoonTitle}>No group expenses yet</Text>
                <Text style={styles.comingSoonBody}>
                  Tap the + button to add the first expense for this group.
                </Text>
              </View>
            ) : (
              <View style={styles.expenseList}>
                {group.expenses.map(exp => {
                  const paidByMe = exp.paidBy === user?.id
                  return (
                    <TouchableOpacity
                      key={exp.id}
                      style={styles.expenseRow}
                      onPress={() => router.push(`/dashboard/expense/${exp.id}`)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.expenseLeft}>
                        <Text style={styles.expenseTitle} numberOfLines={1}>
                          {exp.description}
                        </Text>
                        <Text style={styles.expenseSubtitle} numberOfLines={1}>
                          {paidByMe ? 'You' : exp.paidByName} paid ·{' '}
                          {formatExpenseDate(exp.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.expenseRight}>
                        <Text style={styles.expenseAmount}>
                          {formatAmount(exp.amount, currency)}
                        </Text>
                        <Text
                          style={[
                            styles.expenseNet,
                            exp.netForMe > 0
                              ? styles.memberBalanceGreen
                              : exp.netForMe < 0
                                ? styles.memberBalanceOrange
                                : styles.memberBalanceSettled,
                          ]}
                        >
                          {exp.netForMe > 0
                            ? `+${formatAmount(exp.netForMe, currency)}`
                            : exp.netForMe < 0
                              ? `-${formatAmount(Math.abs(exp.netForMe), currency)}`
                              : 'settled'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
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
        groupId={group?.id}
        groupName={group?.name}
        presetParticipantIds={memberIdsForExpense}
      />

      {/* Add members from contacts already on SquaredSplit */}
      <AddGroupMembersModal
        visible={addMemberVisible}
        candidates={addableContacts}
        onClose={() => setAddMemberVisible(false)}
        onAdd={handleAddMembers}
      />
    </View>
  )
}

function AddGroupMembersModal({
  visible,
  candidates,
  onClose,
  onAdd,
}: {
  visible: boolean
  candidates: { id: string; label: string }[]
  onClose: () => void
  onAdd: (ids: string[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (!visible) {
      setSelected([])
      setIsAdding(false)
    }
  }, [visible])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { paddingTop: 60, paddingHorizontal: 24, flex: 1 }]}>
        <View style={styles.addMembersHeader}>
          <Text style={styles.addMembersTitle}>Add members</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={{ fontSize: 18, color: '#6B6B6B' }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {candidates.length === 0 ? (
            <Text style={styles.emptyList}>
              No more of your contacts are on SquaredSplit. Invite them from an expense first.
            </Text>
          ) : (
            candidates.map(c => {
              const isSelected = selected.includes(c.id)
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.addMemberRow}
                  onPress={() =>
                    setSelected(prev =>
                      prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
                    )
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{c.label[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <Text style={styles.memberName}>{c.label}</Text>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && { backgroundColor: '#141414', borderColor: '#141414' },
                    ]}
                  >
                    {isSelected && (
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })
          )}
        </ScrollView>
        <TouchableOpacity
          style={[
            styles.addMembersBtn,
            (selected.length === 0 || isAdding) && { backgroundColor: '#D1D5DB' },
          ]}
          disabled={selected.length === 0 || isAdding}
          onPress={async () => {
            setIsAdding(true)
            await onAdd(selected)
            setIsAdding(false)
          }}
        >
          {isAdding ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.addMembersBtnText}>
              Add{' '}
              {selected.length > 0
                ? `${selected.length} member${selected.length > 1 ? 's' : ''}`
                : ''}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
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
    marginTop: 8,
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
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontSize: 15, fontFamily: 'Nunito_400Regular', color: '#141414' },
  memberBalance: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
  },
  memberBalanceGreen: { color: '#44BB73' },
  memberBalanceOrange: { color: '#DE8334' },
  memberBalanceSettled: {
    fontSize: 12,
    fontFamily: 'Nunito_500Medium',
    color: '#9CA3AF',
  },
  expenseList: { gap: 4 },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  expenseLeft: { flex: 1, minWidth: 0, gap: 2 },
  expenseTitle: {
    fontSize: 15,
    fontFamily: 'Nunito_600SemiBold',
    color: '#141414',
  },
  expenseSubtitle: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#9CA3AF',
  },
  expenseRight: { alignItems: 'flex-end', gap: 2, marginLeft: 12 },
  expenseAmount: {
    fontSize: 15,
    fontFamily: 'Nunito_700Bold',
    color: '#141414',
  },
  expenseNet: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  comingSoonCard: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#FAFAFC',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  fabWrap: { position: 'absolute', right: 20 },
  settleCard: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
  },
  settleCardGreen: { backgroundColor: '#E8F8EE' },
  settleCardOrange: { backgroundColor: '#FEF3E8' },
  settleTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#141414' },
  settleBody: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#6B6B6B',
    lineHeight: 17,
    marginTop: 2,
  },
  settleBtn: {
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  settleBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  actionLink: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#3273CD' },
  removeMemberBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  removeMemberText: { color: '#EF4444', fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  addMembersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addMembersTitle: { fontSize: 18, fontWeight: '700', color: '#141414' },
  addMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMembersBtn: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMembersBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Nunito_600SemiBold' },
})
