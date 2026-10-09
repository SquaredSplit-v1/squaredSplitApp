/**
 * Friend-level features: shared whiteboard notes (friend_notes) and
 * per-friend notification settings (friend_settings).
 */

import { supabase } from '@/lib/supabase/client'

function pairFilter(a: string, b: string): string {
  return `and(user_id.eq.${a},friend_id.eq.${b}),and(user_id.eq.${b},friend_id.eq.${a})`
}

export async function getFriendNote(
  userId: string,
  friendId: string
): Promise<{ note: string | null; updatedAt: string | null }> {
  const { data, error } = await supabase
    .from('friend_notes')
    .select('note, updated_at')
    .or(pairFilter(userId, friendId))
    .limit(1)
    .maybeSingle()

  if (error) {
    // Table not deployed yet — treat as "no note".
    return { note: null, updatedAt: null }
  }
  return {
    note: data?.note && data.note.trim() ? data.note : null,
    updatedAt: data?.updated_at ?? null,
  }
}

export async function saveFriendNote(
  friendId: string,
  note: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('upsert_friend_note', {
    p_friend_id: friendId,
    p_note: note,
  })

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function getFriendMuted(
  userId: string,
  friendId: string
): Promise<{ muted: boolean; unavailable?: boolean }> {
  const { data, error } = await supabase
    .from('friend_settings')
    .select('muted')
    .eq('user_id', userId)
    .eq('friend_id', friendId)
    .maybeSingle()

  if (error) {
    return { muted: false, unavailable: true }
  }
  return { muted: data?.muted ?? false }
}

export async function setFriendMuted(
  userId: string,
  friendId: string,
  muted: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('friend_settings').upsert({
    user_id: userId,
    friend_id: friendId,
    muted,
    updated_at: new Date().toISOString(),
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}
