import React, { useCallback, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  NotificationHeader,
  NotificationItem,
  RejectionModal,
  SuccessToast,
} from '@/components/notifications'
import type { NotificationRequest, RejectionReason } from '@/components/notifications/types'

// ── Mock data ───────────────────────────────────────────────────────────
const INITIAL_REQUESTS: NotificationRequest[] = [
  {
    id: '1',
    userName: 'Sarah Paul',
    avatar: require('../../assets/dashboard/ak.png'),
    amount: 100,
    type: 'owed',
    groupName: 'Beach House',
    timeAgo: '5 mins ago',
  },
  {
    id: '2',
    userName: 'Seshwath Hegde',
    avatar: require('../../assets/dashboard/ak.png'),
    amount: 560,
    type: 'you_owe',
    groupName: 'Trip to Japan',
    timeAgo: '10 mins ago',
  },
  {
    id: '3',
    userName: 'Sarah Paul',
    avatar: require('../../assets/dashboard/ak.png'),
    amount: 100,
    type: 'owed',
    groupName: 'Beach House',
    timeAgo: '1 hour ago',
  },
  {
    id: '4',
    userName: 'Seshwath Hegde',
    avatar: require('../../assets/dashboard/ak.png'),
    amount: 560,
    type: 'you_owe',
    groupName: 'Trip to Japan',
    timeAgo: '22 Jan',
  },
  {
    id: '5',
    userName: 'Seshwath Hegde',
    avatar: require('../../assets/dashboard/ak.png'),
    amount: 560,
    type: 'you_owe',
    groupName: 'Trip to Japan',
    timeAgo: '22 Jan',
  },
]

// ── Component ───────────────────────────────────────────────────────────
function Notifications() {
  const [requests, setRequests] = useState<NotificationRequest[]>(INITIAL_REQUESTS)
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState<NotificationRequest | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastGroupName, setToastGroupName] = useState('')

  // ── Accept handler ──
  const handleAccept = useCallback((item: NotificationRequest) => {
    // Show success toast
    setToastGroupName(item.groupName)
    setToastVisible(true)

    // Remove item from list
    setRequests(prev => prev.filter(r => r.id !== item.id))
  }, [])

  // ── Reject handler (opens modal) ──
  const handleReject = useCallback((item: NotificationRequest) => {
    setSelectedItem(item)
    setRejectionModalVisible(true)
  }, [])

  // ── Rejection confirmed ──
  const handleRejectionSave = useCallback(
    (_reason: RejectionReason, _otherText?: string) => {
      if (selectedItem) {
        // Remove item from list
        setRequests(prev => prev.filter(r => r.id !== selectedItem.id))
      }
      setRejectionModalVisible(false)
      setSelectedItem(null)
    },
    [selectedItem]
  )

  // ── Toast hide ──
  const handleToastHide = useCallback(() => {
    setToastVisible(false)
  }, [])

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <NotificationHeader />

        {/* List */}
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} onAccept={handleAccept} onReject={handleReject} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Rejection Modal */}
        <RejectionModal
          visible={rejectionModalVisible}
          onClose={() => {
            setRejectionModalVisible(false)
            setSelectedItem(null)
          }}
          onSave={handleRejectionSave}
        />

        {/* Success Toast */}
        <SuccessToast visible={toastVisible} groupName={toastGroupName} onHide={handleToastHide} />
      </View>
    </SafeAreaView>
  )
}

export default Notifications

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
})
