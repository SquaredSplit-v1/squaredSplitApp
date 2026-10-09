import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { supabase } from '@/lib/supabase/client'
import { formatTimeAgo } from '@/lib/utils/formatTimeAgo'
import { useAuthStore } from '@/store/authStore'

interface Reminder {
  id: number
  message: string
  createdAt: string
}

function SparkleGlyph() {
  return <Text style={styles.headerEmoji}>✦</Text>
}

export default function AiSpaceScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const userId = useAuthStore(s => s.user?.id)

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!userId) {
      setReminders([])
      setIsLoading(false)
      return
    }
    // activity_feed is not yet in generated Database types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('activity_feed')
      .select('id, metadata, created_at')
      .eq('user_id', userId)
      .eq('type', 'ai_reminder')
      .eq('seen', false)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      console.warn('[ai] reminders', error.message)
      setReminders([])
    } else {
      setReminders(
        (data ?? []).map(
          (row: { id: number; metadata: { message?: string }; created_at: string }) => ({
            id: row.id,
            message: typeof row.metadata?.message === 'string' ? row.metadata.message : '',
            createdAt: row.created_at,
          })
        )
      )
    }
    setIsLoading(false)
  }, [userId])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await load()
    setIsRefreshing(false)
  }, [load])

  const dismiss = useCallback(
    async (id: number) => {
      setReminders(prev => prev.filter(r => r.id !== id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('mark_activity_feed_seen', {
        p_user_id: userId,
        p_activity_ids: [id],
      })
    },
    [userId]
  )

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <SparkleGlyph />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Squarer</Text>
          <Text style={styles.subtitle}>Your settle-up assistant</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#3273CD" />
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#3273CD"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={styles.emptyTitle}>All squared up!</Text>
              <Text style={styles.emptyBody}>
                No reminders right now. When a balance lingers or a pay-back date passes, a friendly
                nudge will show up here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardMessage}>{item.message}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardTime}>{formatTimeAgo(item.createdAt)}</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <TouchableOpacity onPress={() => router.push('/(tabs)')} hitSlop={8}>
                    <Text style={styles.cardAction}>Settle up</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => void dismiss(item.id)} hitSlop={8}>
                    <Text style={styles.cardDismiss}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerEmoji: { fontSize: 28 },
  title: { fontSize: 24, fontFamily: 'Nunito_700Bold', color: '#141414' },
  subtitle: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: '#6B6B6B', marginTop: 2 },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontFamily: 'Nunito_700Bold', color: '#141414', marginBottom: 8 },
  emptyBody: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 21,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFC',
    padding: 16,
    marginBottom: 12,
  },
  cardMessage: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: '#141414',
    lineHeight: 21,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cardTime: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: '#9CA3AF' },
  cardAction: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#3273CD' },
  cardDismiss: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#9CA3AF' },
})
