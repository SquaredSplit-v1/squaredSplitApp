/** Account-level data: preferences, blocklist, deactivation, QR profile lookup. */

import { supabase } from '@/lib/supabase/client'

export interface BlockedProfile {
  userId: string
  name: string
  avatarUrl: string | null
  phone: string | null
}

export interface QrProfile {
  userId: string
  name: string
  avatarUrl: string | null
}

// ── Preferences (language / time zone live on profiles) ──────────────────────

export async function updateLanguage(userId: string, language: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ language, updated_at: new Date().toISOString() })
    .eq('id', userId)
  return !error
}

export async function updateTimezone(userId: string, timezone: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ timezone, updated_at: new Date().toISOString() })
    .eq('id', userId)
  return !error
}

// ── Blocklist ────────────────────────────────────────────────────────────────

export async function blockUser(
  blockerId: string,
  blockedUserId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('blocked_users')
    .insert({ blocker_id: blockerId, blocked_id: blockedUserId })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function unblockUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('blocked_users').delete().eq('blocked_id', userId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getBlocklist(): Promise<BlockedProfile[]> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_id, profiles!blocked_users_blocked_id_fkey(full_name, avatar_url, phone)')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.warn('[getBlocklist]', error?.message)
    return []
  }

  return data
    .map(row => {
      const p = (
        row as {
          blocked_id: string
          profiles?: {
            full_name: string | null
            avatar_url: string | null
            phone: string | null
          } | null
        }
      ).profiles
      return {
        userId: (row as { blocked_id: string }).blocked_id,
        name: p?.full_name ?? 'Member',
        avatarUrl: p?.avatar_url ?? null,
        phone: p?.phone ?? null,
      }
    })
    .filter(b => b.userId)
}

export async function isBlockedWith(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocked_id', userId)
    .limit(1)
  return Boolean(data && data.length > 0)
}

// ── Deactivation ─────────────────────────────────────────────────────────────

/**
 * Soft-deactivate the account: hides the profile from matching and pickers.
 * Reactivation is via support (profiles.deactivated_at cleared manually).
 */
export async function deactivateAccount(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ deactivated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── QR lookups ───────────────────────────────────────────────────────────────

/** Parse a scanned string into a profile id (squaredsplit://add?u=<id>). */
export function profileIdFromQr(payload: string): string | null {
  const match = payload.match(/^squaredsplit:\/\/add\?u=([0-9a-fA-F-]{36})$/)
  return match ? match[1] : null
}

export function qrPayloadForProfile(userId: string): string {
  return `squaredsplit://add?u=${userId}`
}

export async function getQrProfile(userId: string): Promise<QrProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, deactivated_at')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data || data.deactivated_at) return null
  return {
    userId: data.id,
    name: data.full_name ?? 'Member',
    avatarUrl: data.avatar_url ?? null,
  }
}
