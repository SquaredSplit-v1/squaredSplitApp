import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
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
import { getNotificationPermissionStatus } from '@/lib/push/setupPushNotifications'
import { useAuthStore } from '@/store/authStore'

type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'checking'

function NotificationsPermissionBanner({ onEnable }: { onEnable: () => void }) {
  return (
    <View style={styles.permissionBanner}>
      <Text style={styles.permissionTitle}>Enable notifications</Text>
      <Text style={styles.permissionBody}>
        Turn on push notifications so you never miss when a friend adds you to an expense.
      </Text>
      <TouchableOpacity style={styles.permissionCta} onPress={onEnable}>
        <Text style={styles.permissionCtaText}>Enable in Settings</Text>
      </TouchableOpacity>
    </View>
  )
}

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
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking')

  // Check push permission status each time this screen is focused
  // (user may have just toggled it in Settings)
  useFocusEffect(
    useCallback(() => {
      getNotificationPermissionStatus()
        .then(status => setPermissionStatus(status))
        .catch(() => setPermissionStatus('undetermined'))
    }, [])
  )

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

  const handleEnableNotifications = useCallback(() => {
    void Linking.openSettings()
  }, [])

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <NotificationHeader />

        {/* Show a non-blocking banner when push permission is denied */}
        {permissionStatus === 'denied' && (
          <NotificationsPermissionBanner onEnable={handleEnableNotifications} />
        )}

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
  permissionBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD54F',
    padding: 16,
  },
  permissionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: '#141414',
    marginBottom: 4,
  },
  permissionBody: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: '#6B6B6B',
    lineHeight: 20,
    marginBottom: 12,
  },
  permissionCta: {
    alignSelf: 'flex-start',
    backgroundColor: '#141414',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  permissionCtaText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
})
