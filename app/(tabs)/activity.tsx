import { useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import type { Activity } from '@/components/dashboard'
import { ActivityList, AddExpenseButton } from '@/components/dashboard'

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

const akAvatar = require('../../assets/dashboard/ak.png')
const coconutAvatar = require('../../assets/dashboard/coconut.png')

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    avatar: akAvatar,
    segments: [
      { text: 'Paul', bold: true },
      { text: ' turned ' },
      { text: 'Simplify debts', bold: true },
      { text: ' off in the group ' },
      { text: 'Trip to Japan', bold: true },
    ],
    timeAgo: '5 mins ago',
  },
  {
    id: 'a2',
    avatar: akAvatar,
    segments: [
      { text: 'Paul', bold: true },
      { text: ' turned ' },
      { text: 'Simplify debts', bold: true },
      { text: ' off in the group ' },
      { text: 'Trip to Japan', bold: true },
    ],
    timeAgo: '5 mins ago',
  },
  {
    id: 'a3',
    avatar: coconutAvatar,
    segments: [
      { text: 'Paul', bold: true },
      { text: ' turned ' },
      { text: 'Simplify debts', bold: true },
      { text: ' off in the group ' },
      { text: 'Trip to Japan', bold: true },
    ],
    timeAgo: '5 mins ago',
  },
  {
    id: 'a4',
    avatar: akAvatar,
    segments: [
      { text: 'Paul', bold: true },
      { text: ' turned ' },
      { text: 'Simplify debts', bold: true },
      { text: ' off in the group ' },
      { text: 'Trip to Japan', bold: true },
    ],
    timeAgo: '5 mins ago',
  },
  {
    id: 'a5',
    avatar: coconutAvatar,
    segments: [
      { text: 'Paul', bold: true },
      { text: ' turned ' },
      { text: 'Simplify debts', bold: true },
      { text: ' off in the group ' },
      { text: 'Trip to Japan', bold: true },
    ],
    timeAgo: '5 mins ago',
  },
  {
    id: 'a6',
    avatar: akAvatar,
    segments: [
      { text: 'Paul', bold: true },
      { text: ' turned ' },
      { text: 'Simplify debts', bold: true },
      { text: ' off in the group ' },
      { text: 'Trip to Japan', bold: true },
    ],
    timeAgo: '5 mins ago',
  },
  {
    id: 'a7',
    avatar: coconutAvatar,
    segments: [
      { text: 'Paul', bold: true },
      { text: ' turned ' },
      { text: 'Simplify debts', bold: true },
      { text: ' off in the group ' },
      { text: 'Trip to Japan', bold: true },
    ],
    timeAgo: '5 mins ago',
  },
]

export default function ActivityScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
        {/* Nav bar — no add-friend button on activity */}
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
          </View>
        </View>

        <ActivityList activities={MOCK_ACTIVITIES} />
      </View>

      <AddExpenseButton onPress={() => console.log('Add expense')} />
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
