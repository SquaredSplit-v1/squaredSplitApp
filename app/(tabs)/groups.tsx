import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import type { FilterOption, Group } from '@/components/dashboard'
import {
  AddExpenseButton,
  BalanceSummary,
  FilterModal,
  GroupsList,
  SquaredUpSection,
} from '@/components/dashboard'

function BellIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
        stroke="#141414"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

const coconutAvatar = require('../../assets/dashboard/coconut.png')

const MOCK_GROUPS: Group[] = [
  {
    id: 'g1',
    name: 'Goa 2026',
    avatar: coconutAvatar,
    emoji: '🌴',
    balanceType: 'owes_you',
    amount: 10.0,
  },
  {
    id: 'g2',
    name: 'Beach House',
    avatar: coconutAvatar,
    balanceType: 'you_owe',
    amount: 350.0,
  },
  {
    id: 'g3',
    name: 'Trip to Japan',
    avatar: coconutAvatar,
    balanceType: 'you_owe',
    amount: 1485.0,
    members: [
      { name: 'AJ', amount: 1485.0, balanceType: 'owes_you' },
      { name: 'Deep.R', amount: 1485.0, balanceType: 'owes_you' },
      { name: 'AJ', amount: 1485.0, balanceType: 'owes_you' },
    ],
  },
]

export default function GroupsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [filterVisible, setFilterVisible] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('none')

  const handleFilterSelect = (filter: FilterOption) => {
    setSelectedFilter(filter)
    setFilterVisible(false)
  }

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navIcon} onPress={() => router.push('/notifications')}>
            <BellIcon />
          </TouchableOpacity>
          <View style={styles.navRight}>
            <TouchableOpacity style={styles.navIcon}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  stroke="#141414"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navIcon}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6"
                  stroke="#141414"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>

        <BalanceSummary
          balanceToSquare={20.0}
          youAreOwed={2575.0}
          youOwe={2575.0}
          onFilterPress={() => setFilterVisible(true)}
        />

        <GroupsList groups={MOCK_GROUPS} />

        <SquaredUpSection onPress={() => console.log('Show squared-up')} />
      </View>

      <AddExpenseButton onPress={() => console.log('Add expense')} />

      <FilterModal
        visible={filterVisible}
        selectedFilter={selectedFilter}
        onSelect={handleFilterSelect}
        onClose={() => setFilterVisible(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 20 },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  navIcon: { padding: 8 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
})
