import type { NotificationRequest } from '@/components/notifications/types'
import { supabase } from '@/lib/supabase'
import { formatTimeAgo } from '@/lib/utils/formatTimeAgo'

export interface ActivityFeedRow {
  id: number
  type: string
  metadata: Record<string, unknown>
  seen: boolean
  created_at: string
}

export async function fetchIncomingExpenseNotifications(
  userId: string
): Promise<NotificationRequest[]> {
  // activity_feed not yet in generated Database types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from('activity_feed')
    .select('id, type, metadata, seen, created_at')
    .eq('user_id', userId)
    .eq('type', 'expense_participant_added')
    .eq('seen', false)
    .order('created_at', { ascending: false })

  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('activity_feed') && msg.includes('does not exist')) {
      return []
    }
    throw new Error(msg)
  }

  const feedRows = (rows ?? []) as ActivityFeedRow[]
  if (feedRows.length === 0) return []

  const creatorIds = [
    ...new Set(
      feedRows.map(r => r.metadata?.created_by).filter((id): id is string => typeof id === 'string')
    ),
  ]

  const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>()

  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', creatorIds)

    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url })
    }
  }

  return feedRows.map(row => mapRowToNotification(row, userId, profileMap))
}

function mapRowToNotification(
  row: ActivityFeedRow,
  currentUserId: string,
  profiles: Map<string, { full_name: string | null; avatar_url: string | null }>
): NotificationRequest {
  const meta = row.metadata
  const createdBy = typeof meta.created_by === 'string' ? meta.created_by : ''
  const paidBy = typeof meta.paid_by === 'string' ? meta.paid_by : ''
  const expenseId = typeof meta.expense_id === 'string' ? meta.expense_id : ''
  const amount =
    typeof meta.share_amount === 'number'
      ? meta.share_amount
      : Number(meta.share_amount ?? meta.amount ?? 0)

  const profile = profiles.get(createdBy)
  const description =
    typeof meta.description === 'string' && meta.description.trim()
      ? meta.description.trim()
      : 'Expense'

  const groupName =
    typeof meta.group_name === 'string' && meta.group_name.trim()
      ? meta.group_name.trim()
      : typeof meta.category === 'string' && meta.category.trim()
        ? meta.category
        : 'Personal'

  return {
    id: String(row.id),
    activityId: row.id,
    expenseId,
    userName: profile?.full_name?.trim() || 'Someone',
    avatarUrl: profile?.avatar_url ?? null,
    amount: Number.isFinite(amount) ? amount : 0,
    type: paidBy === currentUserId ? 'owed' : 'you_owe',
    groupName,
    description,
    timeAgo: formatTimeAgo(row.created_at),
  }
}

export async function dismissIncomingNotification(
  userId: string,
  activityId: number
): Promise<void> {
  // mark_activity_feed_seen is present in DB but not yet in generated types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('mark_activity_feed_seen', {
    p_user_id: userId,
    p_activity_ids: [activityId],
  })

  if (error) throw new Error(error.message)
}
