import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  NotificationHeader,
  NotificationItem,
  RejectionModal,
  SuccessToast,
} from '@/components/notifications'
import type { NotificationRequest, RejectionReason } from '@/components/notifications/types'
import {
  dismissIncomingNotification,
  fetchIncomingExpenseNotifications,
} from '@/lib/api/incomingNotifications'
import { useAuthStore } from '@/store/authStore'

function Notifications() {
  const router = useRouter()
  const userId = useAuthStore(s => s.user?.id)

  const [requests, setRequests] = useState<NotificationRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState<NotificationRequest | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastGroupName, setToastGroupName] = useState('')

  const loadRequests = useCallback(async () => {
    if (!userId) {
      setRequests([])
      setIsLoading(false)
      return
    }

    setLoadError(null)
    try {
      const items = await fetchIncomingExpenseNotifications(userId)
      setRequests(items)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load notifications')
      setRequests([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true)
      void loadRequests()
    }, [loadRequests])
  )

  const removeAndDismiss = useCallback(
    async (item: NotificationRequest) => {
      setRequests(prev => prev.filter(r => r.id !== item.id))
      if (userId) {
        try {
          await dismissIncomingNotification(userId, item.activityId)
        } catch (e) {
          console.warn('[notifications] dismiss', e)
        }
      }
    },
    [userId]
  )

  const handleAccept = useCallback(
    async (item: NotificationRequest) => {
      setToastGroupName(item.groupName)
      setToastVisible(true)
      await removeAndDismiss(item)
      if (item.expenseId) {
        router.push(`/dashboard/expense/${item.expenseId}`)
      }
    },
    [removeAndDismiss, router]
  )

  const handleReject = useCallback((item: NotificationRequest) => {
    setSelectedItem(item)
    setRejectionModalVisible(true)
  }, [])

  const handleRejectionSave = useCallback(
    async (_reason: RejectionReason, _otherText?: string) => {
      if (selectedItem) {
        await removeAndDismiss(selectedItem)
      }
      setRejectionModalVisible(false)
      setSelectedItem(null)
    },
    [selectedItem, removeAndDismiss]
  )

  const handleToastHide = useCallback(() => {
    setToastVisible(false)
  }, [])

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <NotificationHeader />

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3273CD" />
          </View>
        ) : loadError ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>{loadError}</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>No incoming requests</Text>
            <Text style={styles.emptyText}>
              When someone adds you to an expense, it will show up here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <NotificationItem item={item} onAccept={handleAccept} onReject={handleReject} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <RejectionModal
          visible={rejectionModalVisible}
          onClose={() => {
            setRejectionModalVisible(false)
            setSelectedItem(null)
          }}
          onSave={handleRejectionSave}
        />

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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#141414',
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#6B6B6B',
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
})
